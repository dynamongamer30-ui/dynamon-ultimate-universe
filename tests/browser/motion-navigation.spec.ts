import { expect, test } from "@playwright/test";

test("reduced motion keeps back navigation and offscreen changelog entries fully visible", async ({
  page,
}) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/mods/thunder-arena", { waitUntil: "networkidle" });
  const back = page.getByRole("button", { name: "Back", exact: true });
  await expect(back).toBeVisible();
  expect(await back.evaluate((node) => getComputedStyle(node.parentElement!).opacity)).toBe("1");
  await page.getByRole("tab", { name: "Changelog", exact: true }).click();
  const entries = page.getByRole("tabpanel").locator("ol > li");
  await expect(entries.first()).toBeAttached();
  expect(
    await entries.evaluateAll((nodes) =>
      nodes.every(
        (node) =>
          getComputedStyle(node).opacity === "1" && getComputedStyle(node).transform === "none",
      ),
    ),
  ).toBe(true);
  await expect(page.getByRole("tabpanel")).toContainText(/v\d/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("changing the system motion preference reveals existing offscreen content without a reload", async ({
  page,
}) => {
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/mods/thunder-arena", { waitUntil: "networkidle" });
  await page.getByRole("tab", { name: "Changelog", exact: true }).click();
  const entries = page.getByRole("tabpanel").locator("ol > li");
  await expect(entries.first()).toBeAttached();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() =>
      entries.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            getComputedStyle(node).opacity === "1" && getComputedStyle(node).transform === "none",
        ),
      ),
    )
    .toBe(true);
  await page.goto("/mods", { waitUntil: "networkidle" });
  await expect(page.locator(".mods-grid article").first()).toBeAttached();
  expect(
    await page
      .locator(".mods-grid article")
      .evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).opacity === "1")),
  ).toBe(true);
});
