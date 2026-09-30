import { test, expect } from "@playwright/test";

test.describe("public application", () => {
  test("home page renders the primary navigation and featured content", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Dynamons World/i);
    await expect(page.getByRole("link", { name: /Browse every build/i })).toBeVisible();
    await expect(page.getByText("Questions, answered.")).toBeVisible();
  });

  test("mods page supports search and sorting", async ({ page }) => {
    await page.goto("/mods");
    await expect(page.getByRole("heading", { name: /All Dynamon mods/i })).toBeVisible();

    const search = page.getByRole("searchbox", { name: /Search mods, features/i });
    await search.fill("nonexistent-playwright-search-term");
    await expect(page.getByText("No mods match your filters.")).toBeVisible();

    await search.fill("");
    const newest = page.getByRole("button", { name: "Newest" });
    await newest.click();
    await expect(newest).toHaveAttribute("aria-pressed", "true");
  });

  test("auth page renders without requiring an authenticated session", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByRole("heading", { name: /Forge your trainer identity/i })).toBeVisible();
  });

  test("owner console does not expose the dashboard to an unauthenticated visitor", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).not.toHaveURL(/\/admin$/);
  });
});
