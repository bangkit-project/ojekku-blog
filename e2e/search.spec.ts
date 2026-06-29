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

test.describe("Search", () => {
  test("form submit via ClientRouter returns results", async ({ page }) => {
    await page.goto("/id/blog");
    await page.getByRole("link", { name: "Cari" }).click();
    await expect(page.locator("#search-status")).toContainText("Ketik kata kunci");

    await page.fill("#search-q", "salatiga");
    await Promise.all([
      page.waitForURL("**/search?q=salatiga**"),
      page.click("button.search-btn"),
    ]);

    await expect(page.locator("#search-status")).toContainText("hasil", { timeout: 10_000 });
    await expect(page.locator("#search-results li")).not.toHaveCount(0);
  });
});
