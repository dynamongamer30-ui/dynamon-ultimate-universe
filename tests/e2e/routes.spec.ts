import { test, expect } from "@playwright/test";
import { assertHealthyPage, assertNoBrokenImages } from "./helpers";

const publicRoutes = [
  "/",
  "/about",
  "/contact",
  "/disclaimer",
  "/rewards",
  "/auth",
  "/claim",
  "/generator",
  "/unlock",
  "/mods",
];

const protectedRoutes = [
  "/profile",
  "/favorites",
  "/notifications",
  "/achievements",
  "/admin",
  "/admin-control",
  "/admin-keys",
  "/admin-loader",
  "/admin-notifications",
];

test.describe("route health", () => {
  for (const route of publicRoutes) {
    test("public route " + route + " renders cleanly", async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      await assertHealthyPage(page);
      await assertNoBrokenImages(page);
    });
  }

  for (const route of protectedRoutes) {
    test("protected route " + route + " does not crash for signed-out visitors", async ({ page }) => {
      await page.goto(route, { waitUntil: "networkidle" });
      await assertHealthyPage(page);
    });
  }

  test("mod detail links discovered from the mods page render cleanly", async ({ page }) => {
    await page.goto("/mods", { waitUntil: "networkidle" });
    const links = await page.locator('a[href^="/mods/"]').evaluateAll((anchors) =>
      [...new Set(
        anchors
          .map((a) => (a as HTMLAnchorElement).pathname)
          .filter((path) => path !== "/mods/" && path !== "/mods"),
      )],
    );

    expect(links.length, "Expected at least one mod detail link").toBeGreaterThan(0);

    for (const route of links) {
      await page.goto(route, { waitUntil: "networkidle" });
      await assertHealthyPage(page);
      await assertNoBrokenImages(page);
    }
  });
});
