import { expect, test } from "@playwright/test";

test("signed-out rewards stay public without account lookups or claim calls", async ({
  page,
}, info) => {
  const rewardRequests: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname.endsWith(".supabase.co") &&
      /\/(my_daily_key|my_active_phoenix_pass|claim_daily_key|touch_streak|record_engagement)$/.test(
        url.pathname,
      )
    )
      rewardRequests.push(url.pathname);
  });
  await page.goto("/rewards", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in free", exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Your rewards", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Copy key|Claim your key/ })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath("rewards-signed-out.png") });
  expect(rewardRequests).toEqual([]);
  expect(errors).toEqual([]);
});
