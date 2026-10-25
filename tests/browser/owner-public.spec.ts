import { expect, test } from "@playwright/test";
test("signed-out owner routes expose no management data or mutations", async ({ page }) => {
  const privateRequests: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname.endsWith(".supabase.co") &&
      /\/(reports|profiles|valid_keys|mod_subscribers|moderation_log)$/.test(url.pathname)
    )
      privateRequests.push(url.pathname);
  });
  for (const route of ["/admin", "/admin-keys"]) {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Owner sign-in", exact: true })).toBeVisible({
      timeout: 20000,
    });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
  }
  expect(privateRequests).toEqual([]);
  expect(errors).toEqual([]);
});
