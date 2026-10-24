import { expect, test } from "@playwright/test";

test("signed-out pages make no private progression reads or mutations", async ({ page }, info) => {
  test.setTimeout(60000);
  const privateRequests: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname.endsWith(".supabase.co") &&
      /\/(user_xp|user_streaks|user_achievements|touch_streak|record_engagement|trainer_levels|my_trainer_progress|user_trainer_progress|claim_trainer_level)$/.test(
        url.pathname,
      )
    )
      privateRequests.push(url.pathname);
  });
  for (const path of ["/", "/achievements", "/rewards"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
      timeout: 15000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Retry daily check-in", exact: true }),
    ).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: info.outputPath("progression-public.png") });
  expect(privateRequests).toEqual([]);
  expect(errors).toEqual([]);
});
