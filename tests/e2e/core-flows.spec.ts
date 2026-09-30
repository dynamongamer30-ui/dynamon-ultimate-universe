import { test, expect } from "@playwright/test";
import { assertHealthyPage, assertNoBrokenImages, assertNoHorizontalOverflow } from "./helpers";

async function open(page: Parameters<typeof test>[0] extends never ? never : any, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("body")).toBeVisible();
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await assertHealthyPage(page);
}

test.describe("core user-facing flows", () => {
  test("mods search and filters change the visible catalog", async ({ page }) => {
    await open(page, "/mods");
    await assertNoBrokenImages(page);

    const cards = page.locator('a[href^="/mods/"]');
    await expect(cards.first()).toBeVisible();
    const initialCount = await cards.count();
    expect(initialCount).toBeGreaterThan(0);

    await page.getByLabel("Search mods, features").fill("this-mod-does-not-exist-xyz");
    await expect(page.getByText("No mods match your filters.")).toBeVisible();

    await page.getByLabel("Search mods, features").fill("fire");
    await expect(cards.first()).toBeVisible();

    const fireFilter = page.getByRole("button", { name: "fire", exact: true });
    await fireFilter.click();
    await expect(fireFilter).toHaveAttribute("aria-pressed", "true");

    const popular = page.getByRole("button", { name: /Most Popular/ });
    const newest = page.getByRole("button", { name: /Newest/ });
    await newest.click();
    await expect(newest).toHaveAttribute("aria-pressed", "true");
    await popular.click();
    await expect(popular).toHaveAttribute("aria-pressed", "true");
  });

  test("mod detail pages open from the catalog", async ({ page }) => {
    await open(page, "/mods");
    const href = await page.locator('a[href^="/mods/"]').first().getAttribute("href");
    expect(href).toMatch(/^\/mods\/[^/]+$/);
    await open(page, href!);
    await expect(page.locator("h1")).toBeVisible();
    await assertNoBrokenImages(page);
    await assertNoHorizontalOverflow(page);
  });

  test("auth page exposes the Google sign-in flow and disclaimer", async ({ page }) => {
    await open(page, "/auth");
    await expect(page.getByRole("button", { name: /Continue with Google/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Disclaimer & Safety/i })).toBeVisible();
  });

  test("generator handles a missing access reference safely", async ({ page }) => {
    await open(page, "/generator");
    await expect(page.getByText(/Something's missing from this link/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /New key/i })).toBeVisible();
  });

  test("signed-out users receive the expected auth prompts", async ({ page }) => {
    for (const route of ["/favorites", "/notifications", "/claim"]) {
      await open(page, route);
      await expect(page.getByRole("link", { name: "Sign in" }).first()).toBeVisible();
    }
  });

  test("signed-out profile redirects to authentication", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/auth\/?$/, { timeout: 10_000 });
    await assertHealthyPage(page);
  });

  test("signed-out achievements explains that progress requires an account", async ({ page }) => {
    await open(page, "/achievements");
    await expect(page.getByText("Sign in to track your progress.")).toBeVisible();
  });

  test("unlock without a valid token does not crash", async ({ page }) => {
    await open(page, "/unlock");
    await expect(page.locator("body")).toBeVisible();
    await assertNoHorizontalOverflow(page);
  });
});
