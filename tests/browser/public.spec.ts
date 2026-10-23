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
  let currentRoute = "initial";
  const networkFailures: string[] = [];
  page.on("requestfailed", (request) =>
    networkFailures.push(`${currentRoute}: ${request.url()} ${request.failure()?.errorText}`),
  );
  page.on("pageerror", (error) => errors.push(`${currentRoute}: ${error.message}`));
  for (const route of routes) {
    currentRoute = route;
    const response = await page.goto(route, { waitUntil: "networkidle" });
    expect(response?.status(), route).toBeLessThan(400);
    await expect(page.locator("main"), `main content for ${route} at ${page.url()}`).toBeVisible();
    await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
      timeout: 15_000,
    });
    await expect(page.locator("body")).not.toContainText("Something glitched");
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), {
        message: route,
      })
      .toBe(true);
    if (route === "/mods/thunder-arena") {
      const community = page.locator("#comments");
      await expect(community).not.toContainText("Loading reviews…");
      await expect(community).not.toContainText("Community activity could not be loaded.");
      await expect
        .poll(
          () =>
            community.evaluate((root) => {
              const bounds = root.getBoundingClientRect();
              return [...root.querySelectorAll(".glass, [data-review-thread]")].every((node) => {
                const box = node.getBoundingClientRect();
                return box.left >= bounds.left - 1 && box.right <= bounds.right + 1;
              });
            }),
          {
            message:
              "Community panels must fit within their section, even when body overflow is clipped",
          },
        )
        .toBe(true);
    }
  }
  expect(errors, JSON.stringify(networkFailures)).toEqual([]);
});

test("search and mobile navigation remain usable", async ({ page }, testInfo) => {
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15_000,
  });
  if ((page.viewportSize()?.width ?? 0) < 1024) {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible();
    await page.getByRole("button", { name: "Close menu", exact: true }).click();
  }
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("region", { name: "Site search" })).toBeVisible();
  await page.getByRole("button", { name: "Close search", exact: true }).click();
  await expect(page.getByRole("region", { name: "Site search" })).toBeHidden();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByRole("region", { name: "Site search" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Site search" })).toBeHidden();
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeFocused();
});
