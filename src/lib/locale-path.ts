import type { Locale } from "./translations";

export const LOCALES: Locale[] = ["id", "en"];

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
