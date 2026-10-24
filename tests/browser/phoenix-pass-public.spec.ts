import { expect, test } from "@playwright/test";

test("public mod visits and signed-out unlock do not look up or consume passes", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const privateRequests: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname.endsWith(".supabase.co") &&
      /\/(my_active_phoenix_pass|redeem_phoenix_pass)$/.test(url.pathname)
    )
      privateRequests.push(url.pathname);
  });
  for (const path of ["/mods", "/mods/fire-phoenix"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
      timeout: 15000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.getByRole("button", { name: "Log in to unlock", exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("dialog", { name: /Use a Phoenix Pass for/ })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("pass-public-sign-in.png") });
  expect(privateRequests).toEqual([]);
  expect(errors).toEqual([]);
});
