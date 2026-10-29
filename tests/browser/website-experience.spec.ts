import { test, expect } from "@playwright/test";

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
  await header.getByRole("button", { name: /search/i }).click();
  const search = header.getByRole("searchbox");
  await search.first().fill("Thunder");
  await expect(page.locator("#search-results")).toBeVisible();
  await expect(page.locator("#search-results").getByRole("button").first()).toBeVisible();
});

test("campaign legacy URL retains Phoenix identity and unconfigured service fails visibly", async ({
  page,
}) => {
  await page.route("**/api/phoenix/tesla", (route) =>
    route.fulfill({
      json: {
        campaign: {
          slug: "tesla",
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
  await expect(page.getByRole("heading", { name: "Phoenix Pass", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to claim", exact: true })).toBeVisible();
  await expect(page.getByText(/permanent phone hardware ID/)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
