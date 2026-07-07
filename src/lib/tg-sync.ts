export type BlogLocale = "en" | "id";

import { readFile, readdir, writeFile } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { parseFilename } from "../content/blog-utils";

export const TELEGRAM_MAX_MESSAGE_LENGTH = 4096;
export const TELEGRAM_MAX_CAPTION_LENGTH = 1024;

const TELEGRAM_PHOTO_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
] as const;

export function isTelegramPhotoCover(coverImage?: string): boolean {
  if (!coverImage) return false;
  const normalized = coverImage.toLowerCase().split("?")[0];
  return TELEGRAM_PHOTO_EXTENSIONS.some((extension) =>
    normalized.endsWith(extension),
  );
}

export function isRemoteCoverImage(coverImage: string): boolean {
  return (
    coverImage.startsWith("http://") || coverImage.startsWith("https://")
  );
}

export function resolveCoverImagePath(
  coverImage: string,
  publicDir = "public",
): string {
  const relativePath = coverImage.startsWith("/")
    ? coverImage.slice(1)
    : coverImage;
  return join(process.cwd(), publicDir, relativePath);
}

export function resolveCoverImageUrl(
  coverImage: string,
  siteUrl: string,
): string {
  if (isRemoteCoverImage(coverImage)) {
    return coverImage;
  }

  const base = siteUrl.replace(/\/$/, "");
  return coverImage.startsWith("/")
    ? `${base}${coverImage}`
    : `${base}/${coverImage}`;
}

export type TelegramCoverStatus =
  | { kind: "send-local"; path: string }
  | { kind: "send-remote"; url: string }
  | { kind: "skip-svg"; coverImage: string }
  | { kind: "none" };

export function getTelegramCoverStatus(
  coverImage: string | undefined,
  publicDir = "public",
): TelegramCoverStatus {
  if (!coverImage) {
    return { kind: "none" };
  }

  if (!isTelegramPhotoCover(coverImage)) {
    return { kind: "skip-svg", coverImage };
  }

  if (isRemoteCoverImage(coverImage)) {
    return { kind: "send-remote", url: coverImage };
  }

  return {
    kind: "send-local",
    path: resolveCoverImagePath(coverImage, publicDir),
  };
}

export type TelegramCoverPayload =
  | { kind: "local"; path: string }
  | { kind: "remote"; url: string };

export function buildPhotoCaption(title: string): string {
  const caption = `<b>${escapeHtml(title)}</b>`;
  if (caption.length <= TELEGRAM_MAX_CAPTION_LENGTH) {
    return caption;
  }

  return caption.slice(0, TELEGRAM_MAX_CAPTION_LENGTH);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function buildPostUrl(
  siteUrl: string,
  locale: BlogLocale,
  slug: string,
): string {
  const base = siteUrl.replace(/\/$/, "");
  return `${base}/${locale}/blog/${slug}`;
}

export function extractPostBody(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?([\s\S]*)$/);
  return match?.[1]?.trim() ?? "";
}

export function markdownToTelegramHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push(inlineMarkdownToHtml(paragraph.join(" ")));
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();

    if (line.trim() === "") {
      flushParagraph();
      continue;
    }

    const headingMatch = line.match(/^#{2,3}\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      blocks.push(`<b>${inlineMarkdownToHtml(headingMatch[1])}</b>`);
      continue;
    }

    const imageMatch = line.match(/^!\[([^\]]*)\]\([^)]+\)\s*$/);
    if (imageMatch) {
      flushParagraph();
      const alt = imageMatch[1].trim();
      if (alt) {
        blocks.push(`(${escapeHtml(alt)})`);
      }
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      blocks.push(inlineMarkdownToHtml(line));
      continue;
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      blocks.push(`• ${inlineMarkdownToHtml(bulletMatch[1])}`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks.join("\n\n");
}

function inlineMarkdownToHtml(text: string): string {
  let result = "";
  let index = 0;

  while (index < text.length) {
    const linkStart = text.indexOf("[", index);
    if (linkStart === -1) {
      result += escapeHtml(text.slice(index));
      break;
    }

    result += escapeHtml(text.slice(index, linkStart));

    const labelEnd = text.indexOf("]", linkStart + 1);
    const urlStart = labelEnd !== -1 ? text.indexOf("(", labelEnd + 1) : -1;
    const urlEnd = urlStart !== -1 ? text.indexOf(")", urlStart + 1) : -1;

    if (labelEnd === -1 || urlStart !== labelEnd + 1 || urlEnd === -1) {
      result += escapeHtml(text[linkStart]);
      index = linkStart + 1;
      continue;
    }

    const label = text.slice(linkStart + 1, labelEnd);
    const url = text.slice(urlStart + 1, urlEnd);
    const escapedUrl = escapeHtml(url);
    result += `<a href="${escapedUrl}">${escapeHtml(label)}</a>`;
    index = urlEnd + 1;
  }

  return result.replace(/\*\*(.+?)\*\*/g, (_match, bold: string) => {
    return `<b>${escapeHtml(bold)}</b>`;
  });
}

export function buildBlogArticleLink(postUrl: string, title: string): string {
  const escapedUrl = escapeHtml(postUrl);
  return `<b><a href="${escapedUrl}">${escapeHtml(title)}</a></b>`;
}

export type TelegramChunksResult = {
  chunks: string[];
  truncated: boolean;
};

export function buildTelegramChunks(
  title: string,
  bodyHtml: string,
  postUrl: string,
  maxLength = TELEGRAM_MAX_MESSAGE_LENGTH,
): TelegramChunksResult {
  const header = buildBlogArticleLink(postUrl, title);
  const body = bodyHtml.trim();
  const prefix = body ? `${header}\n\n` : header;

  if (!body) {
    return { chunks: [prefix.trimEnd()], truncated: false };
  }

  const fullText = `${prefix}${body}`;
  if (fullText.length <= maxLength) {
    return { chunks: [fullText], truncated: false };
  }

  const ellipsis = "…";
  const maxBodyLength = maxLength - prefix.length - ellipsis.length;
  const truncatedBody =
    maxBodyLength > 0
      ? `${body.slice(0, maxBodyLength)}${ellipsis}`
      : ellipsis;

  return {
    chunks: [`${prefix}${truncatedBody}`],
    truncated: true,
  };
}

export function buildTelegramDeepLink(
  channelId: string,
  messageId: number,
): string {
  const trimmed = channelId.trim();
  if (trimmed.startsWith("@")) {
    return `https://t.me/${trimmed.slice(1)}/${messageId}`;
  }

  const numeric = Number(trimmed);
  if (!Number.isNaN(numeric) && numeric < 0) {
    const internalId = String(Math.abs(numeric)).replace(/^100/, "");
    return `https://t.me/c/${internalId}/${messageId}`;
  }

  return `https://t.me/${trimmed}/${messageId}`;
}

export type PostFrontmatter = {
  title: string;
  description?: string;
  draft: boolean;
  publishDate: Date;
  coverImage?: string;
};

export type TelegramFrontmatter = {
  telegramUrl?: string;
  telegramMessageIds: number[];
};

export function parsePostFrontmatter(content: string): PostFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    throw new Error("Post file is missing YAML frontmatter.");
  }

  const frontmatter = match[1];
  const title = readFrontmatterField(frontmatter, "title");
  const description = readFrontmatterField(frontmatter, "description");
  const draftRaw = readFrontmatterField(frontmatter, "draft");
  const publishDateRaw = readFrontmatterField(frontmatter, "publishDate");
  const coverImage = readFrontmatterField(frontmatter, "coverImage");

  if (!title) {
    throw new Error('Frontmatter field "title" is required.');
  }

  const publishDate = publishDateRaw ? new Date(publishDateRaw) : new Date(0);
  if (Number.isNaN(publishDate.getTime())) {
    throw new Error('Frontmatter field "publishDate" is invalid.');
  }

  return {
    title,
    description,
    draft: draftRaw?.toLowerCase() === "true",
    publishDate,
    coverImage,
  };
}

export function parseTelegramFields(content: string): TelegramFrontmatter {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return { telegramMessageIds: [] };
  }

  const frontmatter = match[1];
  const telegramUrl = readFrontmatterField(frontmatter, "telegramUrl");
  const idsRaw = readFrontmatterField(frontmatter, "telegramMessageIds");

  let telegramMessageIds: number[] = [];
  if (idsRaw) {
    try {
      const parsed = JSON.parse(idsRaw.replace(/'/g, '"')) as unknown;
      if (Array.isArray(parsed)) {
        telegramMessageIds = parsed.filter(
          (value): value is number =>
            typeof value === "number" && Number.isInteger(value) && value > 0,
        );
      }
    } catch {
      telegramMessageIds = [];
    }
  }

  if (telegramMessageIds.length === 0 && telegramUrl) {
    const messageId = parseMessageIdFromTelegramUrl(telegramUrl);
    if (messageId) {
      telegramMessageIds = [messageId];
    }
  }

  return { telegramUrl, telegramMessageIds };
}

export function parseMessageIdFromTelegramUrl(url: string): number | undefined {
  const match = url.trim().match(/\/(\d+)$/);
  if (!match) return undefined;
  const messageId = Number(match[1]);
  return Number.isInteger(messageId) && messageId > 0 ? messageId : undefined;
}

export function upsertFrontmatterFields(
  content: string,
  fields: { telegramUrl: string; telegramMessageIds: number[] },
): string {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n[\s\S]*)$/);
  if (!match) {
    throw new Error("Post file is missing YAML frontmatter.");
  }

  let frontmatter = match[1];
  const body = match[2];

  frontmatter = upsertYamlField(
    frontmatter,
    "telegramUrl",
    JSON.stringify(fields.telegramUrl),
  );
  frontmatter = upsertYamlField(
    frontmatter,
    "telegramMessageIds",
    JSON.stringify(fields.telegramMessageIds),
  );

  return `---\n${frontmatter}\n---${body}`;
}

function upsertYamlField(
  frontmatter: string,
  field: string,
  serializedValue: string,
): string {
  const regex = new RegExp(`^${field}:.*$`, "m");
  const line = `${field}: ${serializedValue}`;

  if (regex.test(frontmatter)) {
    return frontmatter.replace(regex, line);
  }

  return `${frontmatter.trimEnd()}\n${line}`;
}

function readFrontmatterField(
  frontmatter: string,
  field: string,
): string | undefined {
  const regex = new RegExp(`^${field}:\\s*(.+)$`, "m");
  const match = frontmatter.match(regex);
  if (!match) return undefined;

  let value = match[1].trim();
  const commentIndex = value.indexOf(" #");
  if (commentIndex !== -1) {
    value = value.slice(0, commentIndex).trim();
  }

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return JSON.parse(value.replace(/^'/g, '"').replace(/'$/g, '"')) as string;
  }

  if (value.startsWith("[") && value.endsWith("]")) {
    return value;
  }

  return value;
}

type TelegramApiResult = {
  ok: boolean;
  description?: string;
  result?: {
    message_id?: number;
    id?: number;
  };
};

export type TelegramSendResult = {
  ok: boolean;
  messageId?: number;
  description?: string;
};

const STALE_TELEGRAM_MESSAGE_PATTERNS = [
  "message to edit not found",
  "message can't be edited",
  "message to delete not found",
  "message identifier is not specified",
  "message_id_invalid",
] as const;

export function isStaleTelegramMessageError(description?: string): boolean {
  if (!description) return false;
  const normalized = description.toLowerCase();
  return STALE_TELEGRAM_MESSAGE_PATTERNS.some((pattern) =>
    normalized.includes(pattern),
  );
}

async function callTelegramApi(
  token: string,
  method: string,
  params: Record<string, string>,
): Promise<TelegramApiResult> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const body = new URLSearchParams(params);
  const response = await fetch(url, { method: "POST", body });
  return (await response.json()) as TelegramApiResult;
}

async function callTelegramApiMultipart(
  token: string,
  method: string,
  fields: Record<string, string>,
  files: { field: string; buffer: Buffer; filename: string }[],
): Promise<TelegramApiResult> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  for (const file of files) {
    const blob = new Blob([new Uint8Array(file.buffer)]);
    formData.append(file.field, blob, file.filename);
  }

  const response = await fetch(url, { method: "POST", body: formData });
  return (await response.json()) as TelegramApiResult;
}

export async function sendTelegramPhoto(
  token: string,
  channelId: string,
  photoUrl: string,
  caption: string,
): Promise<TelegramSendResult> {
  const result = await callTelegramApi(token, "sendPhoto", {
    chat_id: channelId,
    photo: photoUrl,
    caption,
    parse_mode: "HTML",
  });

  return {
    ok: result.ok,
    messageId: result.result?.message_id,
    description: result.description,
  };
}

export async function editTelegramPhoto(
  token: string,
  channelId: string,
  messageId: number,
  photoUrl: string,
  caption: string,
): Promise<TelegramSendResult> {
  const result = await callTelegramApi(token, "editMessageMedia", {
    chat_id: channelId,
    message_id: String(messageId),
    media: JSON.stringify({
      type: "photo",
      media: photoUrl,
    }),
    caption,
    parse_mode: "HTML",
  });

  return {
    ok: result.ok,
    messageId: result.result?.message_id ?? messageId,
    description: result.description,
  };
}

export async function sendTelegramPhotoFile(
  token: string,
  channelId: string,
  filePath: string,
  caption: string,
): Promise<TelegramSendResult> {
  const buffer = await readFile(filePath);
  const result = await callTelegramApiMultipart(
    token,
    "sendPhoto",
    {
      chat_id: channelId,
      caption,
      parse_mode: "HTML",
    },
    [{ field: "photo", buffer, filename: basename(filePath) }],
  );

  return {
    ok: result.ok,
    messageId: result.result?.message_id,
    description: result.description,
  };
}

export async function editTelegramPhotoFile(
  token: string,
  channelId: string,
  messageId: number,
  filePath: string,
  caption: string,
): Promise<TelegramSendResult> {
  const buffer = await readFile(filePath);
  const result = await callTelegramApiMultipart(
    token,
    "editMessageMedia",
    {
      chat_id: channelId,
      message_id: String(messageId),
      media: JSON.stringify({
        type: "photo",
        media: "attach://photo",
      }),
      caption,
      parse_mode: "HTML",
    },
    [{ field: "photo", buffer, filename: basename(filePath) }],
  );

  return {
    ok: result.ok,
    messageId: result.result?.message_id ?? messageId,
    description: result.description,
  };
}

export async function sendTelegramMessage(
  token: string,
  channelId: string,
  text: string,
): Promise<TelegramSendResult> {
  const result = await callTelegramApi(token, "sendMessage", {
    chat_id: channelId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: "false",
  });

  return {
    ok: result.ok,
    messageId: result.result?.message_id,
    description: result.description,
  };
}

export async function editTelegramMessage(
  token: string,
  channelId: string,
  messageId: number,
  text: string,
): Promise<TelegramSendResult> {
  const result = await callTelegramApi(token, "editMessageText", {
    chat_id: channelId,
    message_id: String(messageId),
    text,
    parse_mode: "HTML",
    disable_web_page_preview: "false",
  });

  return {
    ok: result.ok,
    messageId: result.result?.message_id ?? messageId,
    description: result.description,
  };
}

export async function deleteTelegramMessage(
  token: string,
  channelId: string,
  messageId: number,
): Promise<TelegramSendResult> {
  const result = await callTelegramApi(token, "deleteMessage", {
    chat_id: channelId,
    message_id: String(messageId),
  });

  return {
    ok: result.ok,
    messageId,
    description: result.description,
  };
}

export async function syncTelegramChunks(
  token: string,
  channelId: string,
  chunks: string[],
  existingMessageIds: number[],
): Promise<number[]> {
  const messageIds: number[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index];
    const existingId = existingMessageIds[index];

    if (existingId) {
      const result = await editTelegramMessage(
        token,
        channelId,
        existingId,
        chunk,
      );
      if (result.ok) {
        messageIds.push(existingId);
        continue;
      }
      if (!isStaleTelegramMessageError(result.description)) {
        throw new Error(result.description ?? "Telegram editMessageText failed.");
      }
    }

    const result = await sendTelegramMessage(token, channelId, chunk);
    if (!result.ok || !result.messageId) {
      throw new Error(result.description ?? "Telegram sendMessage failed.");
    }
    messageIds.push(result.messageId);
  }

  for (
    let index = chunks.length;
    index < existingMessageIds.length;
    index += 1
  ) {
    const result = await deleteTelegramMessage(
      token,
      channelId,
      existingMessageIds[index],
    );
    if (!result.ok && !isStaleTelegramMessageError(result.description)) {
      throw new Error(result.description ?? "Telegram deleteMessage failed.");
    }
  }

  return messageIds;
}

export async function syncTelegramPost(
  token: string,
  channelId: string,
  options: {
    textChunks: string[];
    existingMessageIds: number[];
  },
): Promise<number[]> {
  const { textChunks, existingMessageIds } = options;
  const primaryExistingId = existingMessageIds.at(-1);
  const textExistingIds = primaryExistingId ? [primaryExistingId] : [];

  const messageIds = await syncTelegramChunks(
    token,
    channelId,
    textChunks,
    textExistingIds,
  );

  const keptId = messageIds[0];
  for (const oldId of existingMessageIds) {
    if (oldId === keptId) continue;

    const result = await deleteTelegramMessage(token, channelId, oldId);
    if (!result.ok && !isStaleTelegramMessageError(result.description)) {
      throw new Error(result.description ?? "Telegram deleteMessage failed.");
    }
  }

  return messageIds;
}

export type PostFileEntry = {
  path: string;
  slug: string;
  publishDate: Date;
};

async function walkContentFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkContentFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

export async function listPostFiles(
  contentDir: string,
  locale: BlogLocale,
): Promise<PostFileEntry[]> {
  const files = await walkContentFiles(contentDir);
  const entries: PostFileEntry[] = [];

  for (const file of files) {
    const parsed = parseFilename(relative(contentDir, file));
    if (!parsed || parsed.lang !== locale) continue;

    const content = await readFile(file, "utf8");
    const frontmatter = parsePostFrontmatter(content);
    if (frontmatter.draft) continue;

    entries.push({
      path: file,
      slug: parsed.slug,
      publishDate: frontmatter.publishDate,
    });
  }

  return entries.sort(
    (left, right) => left.publishDate.getTime() - right.publishDate.getTime(),
  );
}

export async function findPostFile(
  contentDir: string,
  slug: string,
  locale: BlogLocale,
): Promise<PostFileEntry> {
  const files = await walkContentFiles(contentDir);

  for (const file of files) {
    const parsed = parseFilename(relative(contentDir, file));
    if (parsed?.slug === slug && parsed.lang === locale) {
      const content = await readFile(file, "utf8");
      const frontmatter = parsePostFrontmatter(content);
      return {
        path: file,
        slug,
        publishDate: frontmatter.publishDate,
      };
    }
  }

  throw new Error(
    `No ${locale} post found for slug "${slug}" under ${contentDir}.`,
  );
}

export type SyncPostResult = {
  telegramUrl: string;
  action: "posted" | "updated" | "dry-run";
  chunkCount: number;
  coverStatus: TelegramCoverStatus;
  truncated: boolean;
};

export async function syncPostToTelegram(options: {
  postPath: string;
  slug: string;
  locale: BlogLocale;
  siteUrl: string;
  token?: string;
  channelId?: string;
  dryRun: boolean;
}): Promise<SyncPostResult> {
  const content = await readFile(options.postPath, "utf8");
  const frontmatter = parsePostFrontmatter(content);
  const telegramFields = parseTelegramFields(content);

  if (frontmatter.draft) {
    throw new Error(
      `Post "${options.slug}" (${options.locale}) is marked draft: true.`,
    );
  }

  const postUrl = buildPostUrl(options.siteUrl, options.locale, options.slug);
  const bodyMarkdown = extractPostBody(content);
  const bodyHtml = markdownToTelegramHtml(bodyMarkdown);
  const { chunks, truncated } = buildTelegramChunks(
    frontmatter.title,
    bodyHtml,
    postUrl,
  );
  const channelId = options.channelId?.trim() ?? "@ojekku_channel";

  if (options.dryRun) {
    const previewId = telegramFields.telegramMessageIds.at(-1) ?? 0;
    return {
      telegramUrl:
        previewId > 0 ? buildTelegramDeepLink(channelId, previewId) : "",
      action: "dry-run",
      chunkCount: chunks.length,
      coverStatus: { kind: "none" },
      truncated,
    };
  }

  if (truncated) {
    console.warn(
      `Telegram post truncated for "${options.slug}" (${options.locale}): body exceeds ${TELEGRAM_MAX_MESSAGE_LENGTH} characters.`,
    );
  }

  const token = options.token?.trim();
  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is not set. Add it to .env.");
  }

  if (!options.channelId?.trim()) {
    throw new Error(
      "TELEGRAM_CHANNEL_ID is not set. Use @ojekku_channel or a numeric id.",
    );
  }

  const previousMessageIds = telegramFields.telegramMessageIds;
  const messageIds = await syncTelegramPost(
    token,
    options.channelId.trim(),
    {
      textChunks: chunks,
      existingMessageIds: previousMessageIds,
    },
  );

  const telegramUrl = buildTelegramDeepLink(options.channelId.trim(), messageIds[0]);
  const updatedContent = upsertFrontmatterFields(content, {
    telegramUrl,
    telegramMessageIds: messageIds,
  });
  await writeFile(options.postPath, updatedContent, "utf8");

  const primaryPreviousId = previousMessageIds.at(-1);
  const messageUnchanged =
    primaryPreviousId !== undefined && messageIds[0] === primaryPreviousId;

  return {
    telegramUrl,
    action:
      previousMessageIds.length > 0 && messageUnchanged ? "updated" : "posted",
    chunkCount: chunks.length,
    coverStatus: { kind: "none" },
    truncated,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}
