import type { Author, AuthorId } from "./authors";
import { getAuthor } from "./authors";

export interface UserSnapshotResponse {
  displayName?: string | null;
  avatarUrl?: string | null;
}

const snapshotCache = new Map<string, UserSnapshotResponse | null>();

function blogApiBase(): string | undefined {
  const base = import.meta.env.PUBLIC_BLOG_API_BASE?.trim();
  return base ? base.replace(/\/$/, "") : undefined;
}

export async function fetchUserSnapshot(username: string): Promise<UserSnapshotResponse | null> {
  const trimmed = username.trim();
  if (!trimmed) return null;

  const cached = snapshotCache.get(trimmed);
  if (cached !== undefined) return cached;

  const base = blogApiBase();
  if (!base) {
    snapshotCache.set(trimmed, null);
    return null;
  }

  try {
    const res = await fetch(`${base}/api/v1/user-snapshots/${encodeURIComponent(trimmed)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      snapshotCache.set(trimmed, null);
      return null;
    }
    const snapshot = (await res.json()) as UserSnapshotResponse;
    snapshotCache.set(trimmed, snapshot);
    return snapshot;
  } catch {
    snapshotCache.set(trimmed, null);
    return null;
  }
}

export function mergeAuthorWithSnapshot(
  fallback: Author,
  snapshot: UserSnapshotResponse | null,
): Author {
  if (!snapshot) return fallback;
  return {
    id: fallback.id,
    name: snapshot.displayName?.trim() || fallback.name,
    avatarUrl: snapshot.avatarUrl?.trim() || fallback.avatarUrl,
  };
}

export async function hydrateAuthor(authorId: AuthorId): Promise<Author> {
  const fallback = getAuthor(authorId) ?? { id: authorId, name: authorId, avatarUrl: "/brand/ojekku-logo.svg" };
  const snapshot = await fetchUserSnapshot(authorId);
  return mergeAuthorWithSnapshot(fallback, snapshot);
}

export interface AuthorBylineTarget {
  root: HTMLElement;
  authorId: AuthorId;
  nameEl: HTMLElement;
  avatarEl: HTMLImageElement;
}

export async function hydrateAuthorByline(target: AuthorBylineTarget): Promise<void> {
  const author = await hydrateAuthor(target.authorId);
  target.nameEl.textContent = author.name;
  target.avatarEl.src = author.avatarUrl;
  target.avatarEl.alt = author.name;
  target.root.dataset.hydrated = "true";
}
