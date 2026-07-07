export interface BlogComment {
  id: string;
  authentikUserId?: string | null;
  source?: string;
  authorUsername?: string | null;
  authorDisplayName?: string | null;
  authorAvatarUrl?: string | null;
  body: string;
  createdAt: string;
  parentCommentId?: string | null;
  telegramMessageId?: number;
  replyToMessageId?: number;
  discussionRootMessageId?: number;
  replyCount?: number;
  deletedAt?: string | null;
}

export interface TelegramReaction {
  emoji: string;
  count: number;
}

export interface CommentNode extends BlogComment {
  children: CommentNode[];
}

export interface CommentListResponse {
  items: BlogComment[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface EngagementResponse {
  commentCount: number;
  likeCount: number;
  shareCount: number;
  telegramReactions?: TelegramReaction[];
  telegramCommentCount?: number;
}

export interface BulkEngagementItem extends EngagementResponse {
  channelMessageId: number;
}

export interface BulkEngagementResponse {
  items: BulkEngagementItem[];
}

export const MAX_BULK_ENGAGEMENT_IDS = 50;

const TOKEN_KEY = "ojekku_blog_access_token";

export function blogApiBase(): string | undefined {
  const base = import.meta.env.PUBLIC_BLOG_API_BASE?.trim();
  return base ? base.replace(/\/$/, "") : undefined;
}

export function blogSiteId(): string | undefined {
  const id = import.meta.env.PUBLIC_BLOG_SITE_ID?.trim();
  return id || undefined;
}

export function getStoredAccessToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeAccessToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function captureTokenFromHash(): void {
  const hash = window.location.hash.replace(/^#/, "");
  if (!hash) return;
  const params = new URLSearchParams(hash);
  const token = params.get("access_token");
  if (!token) return;
  storeAccessToken(token);
  params.delete("access_token");
  params.delete("token_type");
  const nextHash = params.toString();
  const nextUrl = nextHash ? `${window.location.pathname}${window.location.search}#${nextHash}` : `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(null, "", nextUrl);
}

export function buildLoginUrl(returnUrl: string): string | null {
  const base = blogApiBase();
  if (!base) return null;
  return `${base}/auth/login?returnUrl=${encodeURIComponent(returnUrl)}`;
}

function sitePostPath(postId: string): string | null {
  const base = blogApiBase();
  const siteId = blogSiteId();
  if (!base || !siteId) return null;
  return `${base}/api/v1/sites/${encodeURIComponent(siteId)}/posts/${encodeURIComponent(postId)}`;
}

function telegramMessagesPath(): string | null {
  const base = blogApiBase();
  const siteId = blogSiteId();
  if (!base || !siteId) return null;
  return `${base}/api/v1/sites/${encodeURIComponent(siteId)}/telegram/messages`;
}

function telegramMessagePath(channelMessageId: number): string | null {
  const path = telegramMessagesPath();
  if (!path) return null;
  return `${path}/${channelMessageId}`;
}

export async function fetchComments(channelMessageId: number, page = 1): Promise<CommentListResponse | null> {
  const path = telegramMessagePath(channelMessageId);
  if (!path) return null;
  try {
    const res = await fetch(`${path}/comments?page=${page}`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as CommentListResponse;
  } catch {
    return null;
  }
}

export async function fetchCommentReplies(
  channelMessageId: number,
  parentTelegramMessageId: number,
  page = 1,
): Promise<CommentListResponse | null> {
  const path = telegramMessagePath(channelMessageId);
  if (!path) return null;
  try {
    const res = await fetch(
      `${path}/comments/${parentTelegramMessageId}/replies?page=${page}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    return (await res.json()) as CommentListResponse;
  } catch {
    return null;
  }
}

export function formatReplyCountLabel(count: number, lang: string): string {
  if (lang === "en") {
    return count === 1 ? "View 1 reply" : `View ${count} replies`;
  }
  return count === 1 ? "Lihat 1 balasan" : `Lihat ${count} balasan`;
}

export function formatDeletedCommentLabel(lang: string): string {
  return lang === "en" ? "Comment deleted" : "Komentar dihapus";
}

const COMMENTER_AVATAR_BACKGROUND = "0D8ABC";

function initialsFromParts(parts: string[]): string {
  const letters = parts
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .filter(Boolean);
  return letters.join("");
}

export function buildCommenterInitials(
  displayName?: string | null,
  username?: string | null,
): string {
  const source = displayName?.trim() || username?.trim() || "";
  if (!source) return "U";

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return initialsFromParts(words) || "U";
  }

  const word = words[0] ?? source;
  const separated = word.split(/[._-]+/g).filter(Boolean);
  if (separated.length >= 2) {
    return initialsFromParts(separated) || "U";
  }

  const compact = word.slice(0, 2).toUpperCase();
  return compact || "U";
}

export function buildCommenterAvatarUrl(
  displayName?: string | null,
  username?: string | null,
): string {
  const initials = buildCommenterInitials(displayName, username);
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=${COMMENTER_AVATAR_BACKGROUND}&color=fff&rounded=true&size=64`;
}

export function resolveCommentAvatarUrl(comment: Pick<BlogComment, "authorAvatarUrl" | "authorDisplayName" | "authorUsername">): string {
  const existing = comment.authorAvatarUrl?.trim();
  if (existing) return existing;
  return buildCommenterAvatarUrl(comment.authorDisplayName, comment.authorUsername);
}

export async function fetchEngagement(channelMessageId: number): Promise<EngagementResponse | null> {
  const path = telegramMessagePath(channelMessageId);
  if (!path) return null;
  try {
    const res = await fetch(`${path}/engagement`, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    return (await res.json()) as EngagementResponse;
  } catch {
    return null;
  }
}

function normalizeChannelMessageIds(channelMessageIds: readonly number[]): number[] {
  const seen = new Set<number>();
  const normalized: number[] = [];
  for (const id of channelMessageIds) {
    if (!Number.isInteger(id) || id <= 0 || seen.has(id)) continue;
    seen.add(id);
    normalized.push(id);
  }
  return normalized;
}

function chunkChannelMessageIds(ids: readonly number[], chunkSize: number): number[][] {
  const chunks: number[][] = [];
  for (let i = 0; i < ids.length; i += chunkSize) {
    chunks.push(ids.slice(i, i + chunkSize));
  }
  return chunks;
}

export async function fetchBulkEngagement(
  channelMessageIds: readonly number[],
): Promise<BulkEngagementItem[] | null> {
  const path = telegramMessagesPath();
  if (!path) return null;

  const ids = normalizeChannelMessageIds(channelMessageIds);
  if (ids.length === 0) return null;

  const items: BulkEngagementItem[] = [];

  try {
    for (const chunk of chunkChannelMessageIds(ids, MAX_BULK_ENGAGEMENT_IDS)) {
      const res = await fetch(`${path}/engagement`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelMessageIds: chunk }),
      });
      if (!res.ok) return null;

      const data = (await res.json()) as BulkEngagementResponse;
      if (data.items?.length) {
        items.push(...data.items);
      }
    }

    return items;
  } catch {
    return null;
  }
}

export async function postComment(
  postId: string,
  body: string,
  parentCommentId?: string | null,
): Promise<BlogComment | null> {
  const path = sitePostPath(postId);
  const token = getStoredAccessToken();
  if (!path || !token) return null;
  try {
    const payload: { body: string; parentCommentId?: string } = { body };
    if (parentCommentId) payload.parentCommentId = parentCommentId;
    const res = await fetch(`${path}/comments`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return null;
    return (await res.json()) as BlogComment;
  } catch {
    return null;
  }
}

export function buildCommentTree(items: BlogComment[]): CommentNode[] {
  const byId = new Map<string, CommentNode>();
  const byTelegramMessageId = new Map<number, CommentNode>();
  for (const item of items) {
    const node: CommentNode = { ...item, children: [] };
    byId.set(item.id, node);
    if (item.telegramMessageId != null) {
      byTelegramMessageId.set(item.telegramMessageId, node);
    }
  }

  const roots: CommentNode[] = [];
  for (const node of byId.values()) {
    if (node.telegramMessageId != null && node.replyToMessageId != null) {
      const parent = byTelegramMessageId.get(node.replyToMessageId);
      if (parent && parent.telegramMessageId !== node.telegramMessageId) {
        parent.children.push(node);
      } else if (node.replyToMessageId === node.discussionRootMessageId) {
        roots.push(node);
      }
      continue;
    }

    const parentId = node.parentCommentId;
    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.children.push(node);
    } else if (!parentId) {
      roots.push(node);
    }
  }

  const sortByCreatedAsc = (a: CommentNode, b: CommentNode) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  const sortByCreatedDesc = (a: CommentNode, b: CommentNode) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

  const sortChildReplies = (nodes: CommentNode[]) => {
    nodes.sort(sortByCreatedAsc);
    for (const node of nodes) sortChildReplies(node.children);
  };

  roots.sort(sortByCreatedDesc);
  for (const root of roots) sortChildReplies(root.children);
  return roots;
}

export function formatCommentDate(iso: string, locale: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  const lang = locale === "en" ? "en" : "id";
  const diffSec = Math.round((date.getTime() - Date.now()) / 1000);
  const absSec = Math.abs(diffSec);

  if (absSec < 45) {
    return lang === "en" ? "just now" : "baru saja";
  }

  const rtf = new Intl.RelativeTimeFormat(lang === "en" ? "en-US" : "id-ID", {
    numeric: "auto",
  });

  if (absSec < 3600) {
    return rtf.format(Math.round(diffSec / 60), "minute");
  }
  if (absSec < 86400) {
    return rtf.format(Math.round(diffSec / 3600), "hour");
  }
  if (absSec < 604800) {
    return rtf.format(Math.round(diffSec / 86400), "day");
  }

  return date.toLocaleDateString(lang === "en" ? "en-US" : "id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function sumReactionCounts(reactions?: TelegramReaction[]): number {
  if (!reactions?.length) return 0;
  return reactions.reduce((sum, reaction) => sum + reaction.count, 0);
}

export interface PostListEngagementDisplay {
  reaction: { emoji: string; total: number };
  comments: { total: number };
}

export function formatPostListEngagement(
  engagement: EngagementResponse,
  lang: "id" | "en",
): PostListEngagementDisplay {
  const reactions = engagement.telegramReactions ?? [];
  const reactionTotal = sumReactionCounts(reactions);
  const commentCount = engagement.telegramCommentCount ?? engagement.commentCount ?? 0;

  const reactionEmoji =
    reactionTotal > 0 ? [...reactions].sort((a, b) => b.count - a.count)[0]?.emoji ?? "👍" : "❤️";

  return {
    reaction: { emoji: reactionEmoji, total: reactionTotal },
    comments: { total: commentCount },
  };
}

export function formatReactionCountLabel(count: number, lang: "id" | "en"): string {
  if (lang === "en") {
    return count === 1 ? "1 reaction" : `${count} reactions`;
  }
  return `${count} reaksi`;
}

export function formatCommentCountLabel(count: number, lang: "id" | "en"): string {
  if (lang === "en") {
    return count === 1 ? "1 comment" : `${count} comments`;
  }
  return `${count} komentar`;
}

export interface DetailedPostEngagementDisplay {
  reactionEmojis: string[];
  reactionLabel: string;
  commentLabel: string;
}

export function formatDetailedPostEngagement(
  engagement: EngagementResponse,
  lang: "id" | "en",
): DetailedPostEngagementDisplay {
  const reactions = engagement.telegramReactions ?? [];
  const reactionTotal = sumReactionCounts(reactions);
  const commentCount = engagement.telegramCommentCount ?? engagement.commentCount ?? 0;

  const reactionEmojis =
    reactionTotal === 0
      ? ["❤️"]
      : [...reactions]
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((reaction) => reaction.emoji);

  return {
    reactionEmojis,
    reactionLabel: formatReactionCountLabel(reactionTotal, lang),
    commentLabel: formatCommentCountLabel(commentCount, lang),
  };
}

export function renderPostListEngagement(
  el: HTMLElement,
  display: PostListEngagementDisplay,
  options?: { commentHref?: string },
): void {
  el.replaceChildren();

  const commentHref = options?.commentHref?.trim() || undefined;
  el.appendChild(
    makeEngagementPill([display.reaction.emoji], String(display.reaction.total)),
  );
  el.appendChild(
    makeEngagementPill(["💬"], String(display.comments.total), { href: commentHref }),
  );
}

export function renderDetailedPostEngagement(
  el: HTMLElement,
  engagement: EngagementResponse,
  lang: "id" | "en",
  options?: { interactive?: boolean },
): void {
  el.replaceChildren();

  const display = formatDetailedPostEngagement(engagement, lang);
  const pillOptions = options?.interactive ? { interactive: true as const } : undefined;
  el.appendChild(buildReactionEngagementPill(engagement.telegramReactions, lang, pillOptions));
  el.appendChild(makeEngagementPill(["💬"], display.commentLabel, pillOptions));
}

function buildReactionEngagementPill(
  reactions: TelegramReaction[] | undefined,
  lang: "id" | "en",
  options?: { interactive?: boolean },
): HTMLElement {
  const display = formatDetailedPostEngagement(
    {
      commentCount: 0,
      likeCount: 0,
      shareCount: 0,
      telegramReactions: reactions ?? [],
      telegramCommentCount: 0,
    },
    lang,
  );
  return makeEngagementPill(display.reactionEmojis, display.reactionLabel, options);
}

function buildCommentReactionPill(
  reactions: TelegramReaction[] | undefined,
  options?: { interactive?: boolean },
): HTMLElement {
  const display = formatDetailedPostEngagement(
    {
      commentCount: 0,
      likeCount: 0,
      shareCount: 0,
      telegramReactions: reactions ?? [],
      telegramCommentCount: 0,
    },
    "id",
  );
  return makeEngagementPill(display.reactionEmojis, String(sumReactionCounts(reactions)), options);
}

function appendEmojiToPill(pill: HTMLElement, emojis: string[]): void {
  if (emojis.length <= 1) {
    const emoji = document.createElement("span");
    emoji.className = "engagement-emoji";
    emoji.setAttribute("aria-hidden", "true");
    emoji.textContent = emojis[0] ?? "❤️";
    pill.appendChild(emoji);
    return;
  }

  const group = document.createElement("span");
  group.className = "engagement-emoji-group";
  group.setAttribute("aria-hidden", "true");
  for (const emojiText of emojis) {
    const item = document.createElement("span");
    item.className = "engagement-emoji-group__item";
    item.textContent = emojiText;
    group.appendChild(item);
  }
  pill.appendChild(group);
}

function makeEngagementPill(
  emojis: string[],
  labelText: string,
  options?: { href?: string; interactive?: boolean },
): HTMLElement {
  const href = options?.href?.trim() || undefined;
  const interactive = options?.interactive === true;

  let pill: HTMLElement;
  if (interactive) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "engagement-pill engagement-pill--interactive";
    button.setAttribute("data-telegram-join-trigger", "");
    pill = button;
  } else if (href) {
    const anchor = document.createElement("a");
    anchor.className = "engagement-pill engagement-pill--link";
    anchor.href = href;
    pill = anchor;
  } else {
    pill = document.createElement("span");
    pill.className = "engagement-pill";
  }

  appendEmojiToPill(pill, emojis);

  const label = document.createElement("span");
  label.className = "engagement-text";
  label.textContent = labelText;
  pill.appendChild(label);

  return pill;
}

export function renderReactionChip(
  parent: HTMLElement,
  emoji: string,
  count: number,
  href?: string,
): void {
  const chip = document.createElement(href ? 'a' : 'span');
  chip.className = href ? 'engagement-pill engagement-pill--link' : 'engagement-pill';
  if (href) {
    (chip as HTMLAnchorElement).href = href;
  }

  const emojiSpan = document.createElement('span');
  emojiSpan.className = 'engagement-emoji';
  emojiSpan.setAttribute('aria-hidden', 'true');
  emojiSpan.textContent = emoji;
  chip.appendChild(emojiSpan);

  const textSpan = document.createElement('span');
  textSpan.className = 'engagement-text';
  textSpan.textContent = ` ${count}`;
  chip.appendChild(textSpan);

  parent.appendChild(chip);
}

export function renderTelegramReactionChips(
  parent: HTMLElement,
  reactions?: TelegramReaction[],
  options?: { interactive?: boolean },
): void {
  parent.replaceChildren();
  parent.appendChild(buildCommentReactionPill(reactions, options));
}
