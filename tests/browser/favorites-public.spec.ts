import { expect, test } from "@playwright/test";

test("signed-out favorites and bookmark navigation make no private reads or writes", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  const reads: string[] = [],
    writes: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!url.hostname.endsWith(".supabase.co")) return;
    if (request.method() !== "GET") writes.push(url.pathname);
    if (/\/(favorites|mod_likes|profiles|get_my_profile|notification_prefs)$/.test(url.pathname))
      reads.push(url.pathname);
  });
  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "My favorites", exact: true })).toBeVisible();
  await expect(page.getByText("to start saving mods.")).toBeVisible();
  for (const [width, height] of [
    [320, 568],
    [390, 844],
    [820, 1180],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(
      page.locator("main").getByRole("link", { name: "Sign in", exact: true }),
    ).toBeVisible();
  }
  await page.screenshot({ path: info.outputPath("favorites-signed-out.png") });
  await page.goto("/mods", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await page.getByRole("button", { name: "Bookmark", exact: true }).first().click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  expect(reads).toEqual([]);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
