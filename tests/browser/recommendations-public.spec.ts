import { expect, test } from "@playwright/test";

test("signed-out home never loads private recommendation sources", async ({ page }, info) => {
  const privateReads: string[] = [],
    writes: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!url.hostname.endsWith(".supabase.co")) return;
    if (request.method() !== "GET") writes.push(url.pathname);
    if (
      /\/(favorites|mod_likes|user_preferences|get_my_profile|notification_prefs)$/.test(
        url.pathname,
      )
    )
      privateReads.push(url.pathname);
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await expect(page.locator("#homepage-title")).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Picks based on your taste", exact: true }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("home-signed-out.png") });
  expect(privateReads).toEqual([]);
  expect(writes).toEqual([]);
  expect(errors).toEqual([]);
});
