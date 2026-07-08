/**
 * Pagination helpers for blog index.
 */

export const POSTS_PER_PAGE = 5;

export function getPageSlice<T>(items: T[], page: number): T[] {
  const start = (page - 1) * POSTS_PER_PAGE;
  return items.slice(start, start + POSTS_PER_PAGE);
}

export function getTotalPages(totalItems: number): number {
  return Math.ceil(totalItems / POSTS_PER_PAGE);
}
