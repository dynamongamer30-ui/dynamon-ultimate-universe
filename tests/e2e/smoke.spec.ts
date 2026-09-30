import { test, expect } from "@playwright/test";

test("application loads", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/.+/);
});
