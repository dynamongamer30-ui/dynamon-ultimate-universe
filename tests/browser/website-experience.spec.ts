import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Keep this local UI suite independent of production Supabase credentials
  // and read quotas. The test runner supplies this non-routable mock URL.
  // Do not execute the production ad vendor's script or service-worker import.
  for (const host of ["quge5.com", "5gvci.com"]) {
    await page.route(`https://${host}/**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/javascript", body: "" }),
    );
  }
  await page.route("http://127.0.0.1:54321/**", async (route) => {
    const request = route.request();
    const headers = {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
      "access-control-allow-headers": "authorization, apikey, content-type, prefer, x-client-info",
    };
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers, body: "" });
      return;
    }
    await route.fulfill({ status: 200, headers, contentType: "application/json", body: "[]" });
  });
});

test("help is searchable and guest searches survive reload without account requests", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  await page.goto("/help");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const search = page.getByRole("searchbox");
  await search.fill("Phoenix");
  await expect(page.getByText("Claim and spend a Phoenix Pass", { exact: true })).toBeVisible();
  await search.fill("not-a-help-topic-xyz");
  await expect(page.getByText(/No matching topic/)).toBeVisible();
  await page.goto("/mods?q=Coins");
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await page.getByText("Saved searches", { exact: false }).first().click();
  await page.getByRole("textbox", { name: "Saved search name" }).fill("My coin builds");
  await page.getByRole("button", { name: "Save search", exact: true }).click();
  await expect(page.getByRole("button", { name: "My coin builds", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await page.getByText("Saved searches", { exact: false }).first().click();
  await page.getByRole("searchbox", { name: "Search mods, features" }).fill("Nothing");
  await page.getByRole("button", { name: "My coin builds", exact: true }).click();
  await expect(page.getByRole("searchbox", { name: "Search mods, features" })).toHaveValue("Coins");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  expect(failures).toEqual([]);
});

test("shared comparison selection restores from URL and header search lists actual builds", async ({
  page,
}) => {
  await page.goto("/mods");
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  const catalogSearch = page.getByRole("searchbox", { name: "Search mods, features" });
  await expect(catalogSearch).toBeVisible();
  expect((await catalogSearch.boundingBox())?.height).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  const choices = page
    .getByRole("button", { name: /^Compare / })
    .filter({ hasText: "Add to comparison" });
  await choices.first().click();
  await choices.first().click();
  await expect(page).toHaveURL(/compare=/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Compare builds", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("checkbox", { name: /differences/i })).toBeVisible();
  await page.keyboard.press("Escape");
  const header = page.locator("header").first();
  const searchTrigger = header.getByRole("button", { name: /search/i });
  expect((await searchTrigger.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await searchTrigger.click();
  const search = header.getByRole("searchbox");
  await expect(search).toBeFocused();
  expect((await search.boundingBox())?.height).toBeGreaterThanOrEqual(44);
  await search.first().fill("Thunder");
  await expect(page.locator("#search-results")).toBeVisible();
  await expect(page.locator("#search-results").getByRole("button").first()).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await search.press("Escape");
  await expect(searchTrigger).toBeFocused();
});

test("campaign legacy URL retains Phoenix identity and guest affordances", async ({ page }) => {
  await page.route("**/api/phoenix/tesla", (route) =>
    route.fulfill({
      json: {
        campaign: {
          slug: "tesla",
          url_prefix: "diwali-pass",
          title: "Phoenix Pass",
          active: true,
          max_claims: 110,
          claimed_count: 10,
          remaining: 100,
          starts_at: null,
          ends_at: null,
        },
        enabled: false,
      },
    }),
  );
  await page.goto("/claim/tesla");
  await expect(page).toHaveURL(/\/diwali-pass\/tesla$/);
  await expect(page.getByRole("heading", { name: "Phoenix Pass", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to claim", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "How campaigns work" })).toBeVisible();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
