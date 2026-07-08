/**
 * Estimate reading time from text.
 * Uses ~200 words per minute (common for blogs).
 */

import { tReadingTime } from "./translations";
import type { Locale } from "./translations";

const WORDS_PER_MINUTE = 200;

export function getReadingTimeMinutes(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}

export function formatReadingTime(minutes: number, lang: Locale): string {
  return tReadingTime(minutes, lang);
}
