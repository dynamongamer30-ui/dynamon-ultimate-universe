import { expect, test, type Page } from "@playwright/test";

async function opaqueContent(page: Page) {
  return page
    .locator('main [style*="opacity"], .page-transition')
    .evaluateAll((nodes) =>
      nodes
        .filter((node) => (node as HTMLElement).style.opacity !== "")
        .every(
          (node) =>
            getComputedStyle(node).opacity === "1" && getComputedStyle(node).transform === "none",
        ),
    );
}

test("reduced motion keeps homepage, sign-in and reward surfaces readable before scrolling", async ({
  page,
}, info) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  const writes: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes(".supabase.co/") &&
      !["GET", "HEAD", "OPTIONS"].includes(request.method())
    )
      writes.push(new URL(request.url()).pathname);
  });
  for (const route of ["/", "/auth", "/rewards"]) {
    await page.goto(route, { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible();
    expect(await opaqueContent(page), route).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      route,
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`motion-${route.replaceAll("/", "") || "home"}.png`),
    });
  }
  expect(writes).toEqual([]);
});

test("homepage content settles immediately when reduced motion is enabled during the visit", async ({
  page,
}) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => opaqueContent(page)).toBe(true);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(
    page
      .getByRole("button", { name: "Open menu", exact: true })
      .or(page.getByRole("combobox", { name: "Website theme" }))
      .first(),
  ).toBeVisible();
});
