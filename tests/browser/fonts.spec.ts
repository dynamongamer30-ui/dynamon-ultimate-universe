import { expect, test } from "@playwright/test";

test("licensed fonts load locally and the page remains usable when fonts fail", async ({
  page,
}) => {
  const fontRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "font") fontRequests.push(request.url());
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const fonts = await page.evaluate(() => ({
    body: getComputedStyle(document.body).fontFamily,
    heading: getComputedStyle(document.querySelector("h1")!).fontFamily,
    loaded: [...document.fonts]
      .filter((font) => font.status === "loaded")
      .map((font) => font.family),
  }));
  expect(fonts.body).toContain("Manrope");
  expect(fonts.heading).toContain("Sora");
  expect(fonts.loaded).toEqual(expect.arrayContaining(["Manrope", "Sora"]));
  expect(fontRequests.length).toBe(2);
  for (const url of fontRequests) {
    expect(new URL(url).origin).toBe(new URL(page.url()).origin);
    expect(url).toMatch(/\/fonts\/(manrope|sora)\/.+\.woff2$/);
  }

  // Block the network fonts in a new document to exercise the system fallback.
  await page.route("**/*.woff2", (route) => route.abort());
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator("body")).not.toContainText("Something glitched");
  expect(
    await page.evaluate(() => [...document.fonts].some((font) => font.status === "error")),
  ).toBe(true);
});
