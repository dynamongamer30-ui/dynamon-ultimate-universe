import { expect, test } from "@playwright/test";

test("signed-out claim routes never submit reward mutations or expose a supplied key", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const mutations: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname.endsWith(".supabase.co") &&
      /\/(claim_[^/]+|redeem_phoenix_pass)$/.test(url.pathname)
    )
      mutations.push(url.pathname);
  });
  for (const path of [
    "/claim",
    "/claim?kind=trainer_level",
    "/claim?kind=granted_key&ref=PUBLIC-FIXTURE-ONLY",
    "/claim/tesla",
  ]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
      timeout: 15000,
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("button", { name: "Account", exact: true })).toHaveCount(0);
    await expect(page.getByText("PUBLIC-FIXTURE-ONLY", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Claim now", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.screenshot({ path: info.outputPath("claims-signed-out.png") });
  expect(mutations).toEqual([]);
  expect(errors).toEqual([]);
});
