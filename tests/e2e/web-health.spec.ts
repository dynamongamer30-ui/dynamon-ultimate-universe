import { test, expect, type Page } from "@playwright/test";

const publicRoutes = [
  "/",
  "/mods",
  "/mods/fire-phoenix",
  "/mods/thunder-arena",
  "/mods/water-tide",
  "/mods/diamond-collector",
  "/mods/gold-phoenix",
  "/mods/earth-titan",
  "/mods/spirit-fox",
  "/mods/dark-eclipse",
  "/about",
  "/contact",
  "/disclaimer",
  "/rewards",
  "/auth",
];

const guardedRoutes = [
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

async function assertNoBrokenImages(page: Page) {
  const broken = await page.locator("img").evaluateAll((images) =>
    images
      .filter((img) => {
        const style = window.getComputedStyle(img);
        return style.display !== "none" && style.visibility !== "hidden";
      })
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => ({
        src: img.currentSrc || img.getAttribute("src") || "",
        alt: img.getAttribute("alt") || "",
      })),
  );

  expect(broken, "visible images must load successfully").toEqual([]);
}

async function assertHealthyPage(page: Page) {
  await expect(page.locator("body")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Something glitched");
  await expect(page.locator("body")).not.toContainText("Application error");
  await assertNoBrokenImages(page);
}

test.describe("web route health", () => {
  for (const route of publicRoutes) {
    test(`loads ${route} without a broken visual`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await assertHealthyPage(page);

      expect(pageErrors, `uncaught browser errors on ${route}`).toEqual([]);
    });
  }

  for (const route of guardedRoutes) {
    test(`protected route ${route} does not crash for signed-out visitors`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on("pageerror", (error) => pageErrors.push(error.message));

      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForLoadState("networkidle").catch(() => {});
      await assertHealthyPage(page);

      expect(pageErrors, `uncaught browser errors on ${route}`).toEqual([]);
      await expect(page).not.toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
    });
  }
});

test.describe("responsive visual health", () => {
  test("home page has no horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(overflow.scrollWidth, "mobile layout must not overflow horizontally").toBeLessThanOrEqual(overflow.clientWidth + 1);
    await assertNoBrokenImages(page);
  });

  test("mods page has no horizontal overflow on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/mods", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));

    expect(overflow.scrollWidth, "tablet layout must not overflow horizontally").toBeLessThanOrEqual(overflow.clientWidth + 1);
    await assertNoBrokenImages(page);
  });
});
