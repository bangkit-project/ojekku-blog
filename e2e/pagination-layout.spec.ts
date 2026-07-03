import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        scroll-behavior: auto !important;
      }
    `,
  });
});

test.describe("Pagination layout", () => {
  test("id blog page 2 has 3-column pagination layout", async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 720 });
      await page.goto("/id/blog/page/2", { waitUntil: "networkidle" });

      const nav = page.getByTestId("pagination");
      const grid = page.getByTestId("pagination-grid");
      const prev = page.getByTestId("pagination-prev");
      const center = page.getByTestId("pagination-center");
      const next = page.getByTestId("pagination-next");

      await expect(nav).toBeVisible();
      await expect(grid).toBeVisible();

      await expect(prev.locator("a")).toBeVisible();
      await expect(center.locator("#page-picker")).toBeVisible();
      // next slot may be empty on the last page; assert the container exists.
      await expect(next).toBeAttached();

      const gridTemplateColumns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
      expect(gridTemplateColumns.split(" ").filter(Boolean).length).toBe(3);

      const rects = await Promise.all([
        grid.evaluate((el) => el.getBoundingClientRect()),
        prev.evaluate((el) => el.getBoundingClientRect()),
        center.evaluate((el) => el.getBoundingClientRect()),
        next.evaluate((el) => el.getBoundingClientRect()),
      ]);

      const [g, p, c, n] = rects;

      expect(p.left).toBeGreaterThanOrEqual(g.left - 1);
      expect(n.right).toBeLessThanOrEqual(g.right + 1);
      expect(p.right).toBeLessThanOrEqual(c.left + 1);
      expect(c.right).toBeLessThanOrEqual(n.left + 1);
      expect(Math.abs(p.top - c.top)).toBeLessThan(20);
      expect(Math.abs(n.top - c.top)).toBeLessThan(20);
  });
});
