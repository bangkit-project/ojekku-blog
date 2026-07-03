/**
 * UI translations. Keep en and id side-by-side per key for easy translator review.
 */

export type Locale = "en" | "id";

const blogTranslations = {
  siteTitle: { en: "Ojekku Behind the Scenes", id: "Cerita Dapur Ojekku" },
  headerTitle: { en: "Ojekku Behind the Scenes", id: "Cerita Dapur Ojekku" },
  pageTitle: {
    en: (page: number) => `Ojekku Blog — Page ${page}`,
    id: (page: number) => `Blog Ojekku — Halaman ${page}`,
  },
} as const;

const translations = {
  previous: { en: "← Previous", id: "← Sebelumnya" },
  next: { en: "Next →", id: "Selanjutnya →" },
  backToBlog: { en: "← Back to Blog", id: "← Kembali ke Blog" },
  langSwitchLabel: { en: "Choose language", id: "Pilih bahasa" },
  langId: { en: "ID", id: "ID" },
  langEn: { en: "EN", id: "EN" },
  themeSwitchLabel: { en: "Display theme", id: "Tema tampilan" },
  themeDark: { en: "Dark", id: "Gelap" },
  themeLight: { en: "Light", id: "Terang" },
  fontSizeSwitchLabel: { en: "Text size", id: "Ukuran teks" },
  fontSizeDecrease: { en: "Decrease text size", id: "Perkecil teks" },
  fontSizeIncrease: { en: "Increase text size", id: "Perbesar teks" },
  menuLabel: { en: "Menu", id: "Menu" },
  menuCloseLabel: { en: "Close menu", id: "Tutup menu" },
  searchLabel: { en: "Search", id: "Cari" },
  searchPlaceholder: { en: "Search posts…", id: "Cari artikel…" },
  searchButton: { en: "Search", id: "Cari" },
  searchTitle: { en: "Search", id: "Pencarian" },
  searchDescription: {
    en: "Search across Ojekku blog posts.",
    id: "Cari di seluruh artikel blog Ojekku.",
  },
  searchHint: {
    en: "Search title, summary, tags, and content.",
    id: "Cari judul, ringkasan, tag, dan isi.",
  },
  searchIndexUnavailable: {
    en: "Search index is not available yet.",
    id: "Index pencarian belum tersedia.",
  },
  pageOf: {
    en: (n: number, total: number) => `Page ${n} of ${total}`,
    id: (n: number, total: number) => `Halaman ${n} dari ${total}`,
  },
  minReadOne: { en: "1 min read", id: "1 menit baca" },
  minRead: { en: "min read", id: "menit baca" },
  telegramDiscussion: { en: "Discuss on Telegram", id: "Diskusi di Telegram" },
} as const;

type StringKey = Exclude<keyof typeof translations, "pageOf">;

export function t(key: "pageOf", locale: Locale): (n: number, total: number) => string;
export function t(key: StringKey, locale: Locale): string;
export function t(
  key: keyof typeof translations,
  locale: Locale,
): string | ((n: number, total: number) => string) {
  const value = translations[key][locale];
  return typeof value === "function" ? value : value;
}

export function tPageOf(n: number, total: number, locale: Locale): string {
  return translations.pageOf[locale](n, total);
}

export function tBlogSiteTitle(locale: Locale): string {
  return blogTranslations.siteTitle[locale];
}

export function tBlogHeaderTitle(locale: Locale): string {
  return blogTranslations.headerTitle[locale];
}

export function tBlogPageTitle(page: number, locale: Locale): string {
  return blogTranslations.pageTitle[locale](page);
}

export function tReadingTime(minutes: number, locale: Locale): string {
  return minutes === 1
    ? translations.minReadOne[locale]
    : `${minutes} ${translations.minRead[locale]}`;
}
