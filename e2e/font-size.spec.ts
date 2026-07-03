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

test.describe("Font size", () => {
  test("persists across ClientRouter navigation", async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.removeItem("ojekku-font-size");
    });
    await page.goto("/id/blog");

    const increaseBtn = page.getByRole("button", { name: "Perbesar teks" });
    await increaseBtn.click();
    await increaseBtn.click();

    const levelBefore = await page.evaluate(() => document.documentElement.dataset.fontSize);
    const fontSizeBefore = await page.evaluate(() =>
      getComputedStyle(document.documentElement).fontSize
    );

    expect(levelBefore).toBe("3");

    await page.getByRole("link", { name: /Kenapa Ojekku/i }).first().click();
    await page.waitForURL("**/id/blog/**");

    const levelAfter = await page.evaluate(() => document.documentElement.dataset.fontSize);
    const fontSizeAfter = await page.evaluate(() =>
      getComputedStyle(document.documentElement).fontSize
    );

    expect(levelAfter).toBe(levelBefore);
    expect(fontSizeAfter).toBe(fontSizeBefore);
  });
});
