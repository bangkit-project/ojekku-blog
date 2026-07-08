/**
 * Utilities for blog content: filename parsing and entry ID helpers.
 */

export const FILENAME_REGEX =
  /^(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})_(.+)\.(en|id)\.md$/;

export function parseFilename(entryPath: string): {
  slug: string;
  lang: "en" | "id";
} | null {
  const basename = entryPath.split("/").pop() ?? entryPath;
  const match = basename.match(FILENAME_REGEX);
  if (!match) return null;
  const [, , , , , slug, lang] = match;
  return { slug, lang: lang as "en" | "id" };
}

export type BlogEntryId = `${string}--en` | `${string}--id`;

export function getBlogEntryId(slug: string, lang: "en" | "id"): BlogEntryId {
  return `${slug}--${lang}`;
}

export function parseBlogEntryId(
  id: string,
): { slug: string; lang: "en" | "id" } | null {
  const lastDash = id.lastIndexOf("--");
  if (lastDash === -1) return null;
  const slug = id.slice(0, lastDash);
  const lang = id.slice(lastDash + 2);
  if (lang !== "en" && lang !== "id") return null;
  return { slug, lang };
}
