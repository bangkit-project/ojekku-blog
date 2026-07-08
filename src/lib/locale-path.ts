import type { Locale } from "./translations";

export const LOCALES: Locale[] = ["id", "en"];

/** Locales built and served on the public site. */
export const PUBLIC_LOCALES: Locale[] = ["id"];

/** Strip leading /id or /en from pathname. */
export function pathWithoutLocale(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "id" || segments[0] === "en") {
    return segments.slice(1).join("/");
  }
  return segments.join("/");
}

export function getLocalePath(locale: Locale, path: string): string {
  const normalized = path.replace(/^\/+|\/+$/g, "");
  return normalized ? `/${locale}/${normalized}` : `/${locale}/`;
}

/** Redirect target when a legacy /en URL is requested in dev. */
export function getIdEquivalentPath(url: URL): string {
  const path = pathWithoutLocale(url.pathname);
  const idPath = path ? getLocalePath("id", path) : getLocalePath("id", "blog");
  return idPath + url.search + url.hash;
}
