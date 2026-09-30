import { expect, type Page } from "@playwright/test";

export async function assertHealthyPage(page: Page) {
  await expect(page.locator("body")).toBeVisible();
  await expect(page.getByText("Something glitched", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Application error", { exact: true })).toHaveCount(0);
}

export async function assertNoBrokenImages(page: Page) {
  const broken = await page.locator("img").evaluateAll((images) =>
    images
      .filter((img) => {
        const style = window.getComputedStyle(img);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => ({ src: img.currentSrc || img.src, alt: img.alt })),
  );

  expect(broken, "Broken visible images found").toEqual([]);
}

export async function assertNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));

  expect(
    overflow.scrollWidth,
    "Horizontal overflow detected",
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}
