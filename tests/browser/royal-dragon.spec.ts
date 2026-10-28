import { test, expect } from "@playwright/test";

test("guardian animation, controls, guide and phone layout work together", async ({ page }) => {
  test.setTimeout(90000);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  const awaken = page.getByRole("button", { name: "Awaken", exact: true });
  await expect(awaken).toBeEnabled({ timeout: 60000 });
  const canvas = page.locator(".dragon-canvas canvas");
  await expect(canvas).toBeVisible();
  await page.getByRole("button", { name: "Flight", exact: true }).click();
  await expect(page.getByRole("button", { name: "Flight", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const frameA = await canvas.screenshot();
  await page.waitForTimeout(350);
  const frameB = await canvas.screenshot();
  expect(frameA.equals(frameB), "Actual rendered creature changes with animation").toBe(false);
  await page.getByRole("button", { name: "Pause dragon animation", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Play dragon animation", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Rotate dragon right", exact: true }).click();
  await page.getByRole("button", { name: "Reset dragon view", exact: true }).click();
  await expect(awaken).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Quick guide", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Follow the build’s download flow." }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
  await page.screenshot({ path: test.info().outputPath("royal-guardian.png"), fullPage: false });
  expect(errors).toEqual([]);
});

test("missing model leaves a readable poster and usable navigation", async ({ page }) => {
  await page.route("**/models/shadow-dragon.glb", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Retry 3D", exact: true })).toBeVisible({
    timeout: 45000,
  });
  const poster = page.locator(".dragon-poster");
  expect(
    await poster.evaluate((image) => (image as HTMLImageElement).naturalWidth),
  ).toBeGreaterThan(0);
  await page.getByRole("link", { name: "Browse every build", exact: true }).click();
  await expect(page).toHaveURL(/\/mods$/);
});

test("artwork swipes open details while vertical gestures keep the catalog usable", async ({
  page,
}) => {
  await page.goto("/mods");
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  const art = page.locator(".build-artwork").first();
  await expect(art).toBeVisible();
  const destination = await art.getAttribute("href");
  await art.dispatchEvent("pointerdown", { pointerType: "touch", clientX: 100, clientY: 200 });
  await art.dispatchEvent("pointerup", { pointerType: "touch", clientX: 110, clientY: 340 });
  await expect(page).toHaveURL(/\/mods$/);
  await art.dispatchEvent("pointerdown", { pointerType: "touch", clientX: 250, clientY: 200 });
  await art.dispatchEvent("pointerup", { pointerType: "touch", clientX: 100, clientY: 205 });
  await expect(page).toHaveURL(new RegExp(`${destination}$`));
});
