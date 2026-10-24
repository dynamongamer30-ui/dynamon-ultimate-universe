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
    if (
      /\/(get_my_profile|username_available|profiles|notification_prefs|mod_subscribers)$/.test(
        url.pathname,
      )
    )
      privateReads.push(url.pathname);
  });
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
  await expect(page.getByRole("button", { name: /Google/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Google/ })).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole("region", { name: "Account access" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Update preferences", exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("dialog", { name: "Get notified on new mods", exact: true }),
  ).toHaveCount(0);
  const progress = page.getByRole("list", { name: "Account setup progress" });
  await expect(progress.getByRole("listitem")).toHaveCount(2);
  await expect(progress.getByText("1. Account", { exact: true })).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(
    page.getByText(/Accounts with no recorded activity for 30 days may be deleted/),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText("locked to your account");
  await expect(page.locator("main")).not.toContainText("every weekly drop");
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

test("account action stays within the initial viewport across narrow and wide layouts", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
  const action = page.getByRole("button", { name: "Continue with Google", exact: true });
  await expect(action).toBeVisible();
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [390, 844],
    [600, 900],
    [820, 1180],
    [1024, 900],
    [1440, 1000],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(action, `${width}x${height}`).toBeInViewport({ ratio: 1 });
    expect(
      await page.getByRole("region", { name: "Account access" }).evaluate((node) => {
        const b = node.getBoundingClientRect();
        return b.left >= 0 && b.right <= innerWidth;
      }),
      `${width} panel bounds`,
    ).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      `${width} document bounds`,
    ).toBe(true);
    if (width === 320) await page.screenshot({ path: info.outputPath("account-320.png") });
  }
});

test("account surfaces support all nine themes without extra backend reads", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  let reads = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith(".supabase.co")) reads++;
  });
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
  const action = page.getByRole("button", { name: "Continue with Google", exact: true });
  await expect(action).toBeVisible();
  const before = reads;
  const backgrounds = new Set<string>();
  for (const theme of [
    "royal-black",
    "dark",
    "fire",
    "thunder",
    "water",
    "earth",
    "diamond",
    "gold",
    "spirit",
  ]) {
    const menu = page.getByRole("button", { name: "Open menu", exact: true });
    const mobile = await menu.isVisible();
    if (mobile) await menu.click();
    await page.getByRole("combobox", { name: "Website theme" }).selectOption(theme);
    if (mobile) await page.keyboard.press("Escape");
    await expect(page.locator("html")).toHaveAttribute("data-website-theme", theme);
    await expect(action).toBeInViewport({ ratio: 1 });
    const surface = await page.getByRole("region", { name: "Account access" }).evaluate((node) => ({
      background: getComputedStyle(node).backgroundColor,
      root: getComputedStyle(document.documentElement).getPropertyValue("--card").trim(),
    }));
    backgrounds.add(surface.root);
    expect(surface.background).not.toBe("rgba(0, 0, 0, 0)");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (theme === "fire" || theme === "spirit")
      await page.screenshot({ path: info.outputPath(`account-${theme}.png`) });
  }
  expect(backgrounds.size).toBe(9);
  expect(reads).toBe(before);
  await action.focus();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Disclaimer & Safety", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Privacy Policy", exact: true })).toBeFocused();
});
