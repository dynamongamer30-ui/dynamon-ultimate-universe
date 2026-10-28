import { test, expect } from "@playwright/test";

test("home features the real build and quick searches without loading 3D", async ({ page }) => {
  const models: string[] = [];
  page.on("request", (request) => {
    if (/\.glb(?:\?|$)|DragonScene/.test(request.url())) models.push(request.url());
  });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await expect(page.locator(".featured-build-panel img")).toBeVisible();
  await expect(page.locator("canvas")).toHaveCount(0);
  await page.getByRole("link", { name: "Find: Coins", exact: true }).click();
  await expect(page).toHaveURL(/\/mods\?q=Coins/);
  await expect(page.getByRole("searchbox", { name: "Search mods, features" })).toHaveValue("Coins");
  expect(models).toEqual([]);
});

test("compare builds, enforce the limit, and preserve selection across filters", async ({
  page,
}) => {
  await page.goto("/mods");
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  const choices = page
    .getByRole("button", { name: /^Compare / })
    .filter({ hasText: "Add to comparison" });
  for (let i = 0; i < 3; i++) await choices.first().click();
  await expect(page.getByText("3/3 selected", { exact: true })).toBeVisible();
  const remaining = page
    .getByRole("button", { name: /^Compare / })
    .filter({ hasText: "Add to comparison" });
  if (await remaining.count()) await expect(remaining.first()).toBeDisabled();
  await page.getByRole("searchbox", { name: "Search mods, features" }).fill("no-match-xyz");
  await expect(page.getByText("No builds found", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Compare builds", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("columnheader")).toHaveCount(4);
  await expect(page.getByRole("rowheader", { name: "File size", exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(
    page.getByRole("complementary", { name: "Selected builds for comparison" }),
  ).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
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
