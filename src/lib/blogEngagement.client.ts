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
  for (const item of items) {
    byId.set(item.id, { ...item, children: [] });
  }

  const roots: CommentNode[] = [];
  for (const node of byId.values()) {
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
