export type AuthorId = string;

export interface Author {
  id: AuthorId;
  name: string;
  avatarUrl: string;
}

const OJEKKU_FALLBACK: Author = {
  id: "ojekku",
  name: "Ojekku",
  avatarUrl: "/brand/ojekku-logo.svg",
};

export const AUTHOR_REGISTRY: Record<string, Author> = {
  ojekku: OJEKKU_FALLBACK,
  // BEGIN GENERATED AUTHORS
  "andri.ys.st@gmail.com": {
    id: "andri.ys.st@gmail.com",
    name: "Andri YS",
    avatarUrl: "https://ui-avatars.com/api/?name=AY&background=0D8ABC&color=fff&rounded=true&size=64",
  },
  // END GENERATED AUTHORS
};

function buildDefaultFallbackAuthor(id: AuthorId): Author {
  const trimmed = id.trim();
  const safeId = trimmed || "unknown";
  const initials = safeId
    .split(/[._-]+/g)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("") || "U";

  return {
    id: safeId,
    name: safeId,
    avatarUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=0D8ABC&color=fff&rounded=true&size=64`,
  };
}

/** Resolve author from the local manifest (registry or generated fallback). */
export function getAuthor(id: AuthorId | undefined): Author | undefined {
  const trimmed = id?.trim();
  if (!trimmed) return undefined;
  return AUTHOR_REGISTRY[trimmed] ?? buildDefaultFallbackAuthor(trimmed);
}
