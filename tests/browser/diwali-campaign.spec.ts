import { test, expect } from "@playwright/test";
const themes = [
  "royal-black",
  "dark",
  "fire",
  "thunder",
  "water",
  "earth",
  "diamond",
  "gold",
  "spirit",
];
for (const theme of themes)
  test(`campaign is readable and signs in first: ${theme}`, async ({ page }) => {
    await page.addInitScript((value) => localStorage.setItem("dg-website-theme-v1", value), theme);
    await page.route("**/api/phoenix/bonus", (route) =>
      route.fulfill({
        json: {
          enabled: true,
          campaign: {
            slug: "bonus",
            url_prefix: "diwali-pass",
            title: "Diwali Pass",
            active: true,
            max_claims: 50,
            claimed_count: 0,
            remaining: 50,
            starts_at: null,
            ends_at: null,
          },
        },
      }),
    );
    await page.goto("/diwali-pass/bonus");
    await expect(page.getByRole("heading", { name: "Diwali Pass", exact: true })).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator("html")).toHaveAttribute("data-website-theme", theme);
    await expect(page.getByRole("link", { name: "Sign in to claim", exact: true })).toBeVisible();
    await expect(page.getByText("One pass per verified")).toHaveCount(0);
    await expect(page.locator('iframe[src*="turnstile"]')).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.getByRole("link", { name: "Sign in to claim", exact: true }).click();
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("dg_after_auth")))
      .toBe("/diwali-pass/bonus");
  });
