import { expect, test } from "@playwright/test";

test("signed-out account routes show sign-in without private reads or setup writes", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  const writes: string[] = [],
    privateReads: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (!url.hostname.endsWith(".supabase.co")) return;
    if (request.method() !== "GET") writes.push(url.pathname);
    if (/\/(get_my_profile|username_available|profiles)$/.test(url.pathname))
      privateReads.push(url.pathname);
  });
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  await expect(page.getByRole("form", { name: "Build your trainer" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Retry profile", exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("account-sign-in.png") });
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  await expect(page.getByRole("form", { name: "Edit profile" })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(writes).toEqual([]);
  expect(privateReads).toEqual([]);
  expect(errors).toEqual([]);
});
