import { expect, test } from "@playwright/test";

const routes = [
  "/",
  "/mods",
  "/about",
  "/contact",
  "/privacy",
  "/disclaimer",
  "/rewards",
  "/auth",
  "/generator",
  "/profile",
  "/favorites",
  "/achievements",
  "/notifications",
  "/unlock",
  "/claim",
  "/claim/tesla",
  "/admin",
  "/admin-control",
  "/admin-keys",
  "/admin-loader",
  "/admin-notifications",
  "/mods/thunder-arena",
];

test("public routes render without runtime errors or horizontal overflow", async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of routes) {
    const response = await page.goto(route);
    expect(response?.status(), route).toBeLessThan(400);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("body")).not.toContainText("Something glitched");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), {
        message: route,
      })
      .toBe(true);
  }
  expect(errors).toEqual([]);
});

test("search and mobile navigation remain usable", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  if (testInfo.project.name !== "desktop") {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu", exact: true }).click();
  }
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("region", { name: "Site search" })).toBeVisible();
  await page.getByRole("button", { name: "Close search", exact: true }).click();
  await expect(page.getByRole("region", { name: "Site search" })).toBeHidden();
});
