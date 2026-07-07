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

function telegramMessagePath(channelMessageId: number): string | null {
  const base = blogApiBase();
  const siteId = blogSiteId();
  if (!base || !siteId) return null;
  return `${base}/api/v1/sites/${encodeURIComponent(siteId)}/telegram/messages/${channelMessageId}`;
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
  return date.toLocaleString(locale === "en" ? "en-US" : "id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
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
    makeEngagementPill(["💬"], String(display.comments.total), commentHref),
  );
}

export function renderDetailedPostEngagement(
  el: HTMLElement,
  engagement: EngagementResponse,
  lang: "id" | "en",
): void {
  el.replaceChildren();

  const display = formatDetailedPostEngagement(engagement, lang);
  el.appendChild(makeEngagementPill(display.reactionEmojis, display.reactionLabel));
  el.appendChild(makeEngagementPill(["💬"], display.commentLabel));
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

function makeEngagementPill(emojis: string[], labelText: string, href?: string): HTMLElement {
  const pill = document.createElement(href ? "a" : "span");
  pill.className = href ? "engagement-pill engagement-pill--link" : "engagement-pill";
  if (href) {
    (pill as HTMLAnchorElement).href = href;
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
  chip.className = href ? 'comment-reaction-chip comment-reaction-chip--link' : 'comment-reaction-chip';
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
