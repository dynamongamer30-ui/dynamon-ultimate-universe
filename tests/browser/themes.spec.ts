import { expect, test } from "@playwright/test";

const themes = [
  "royal-black",
  "dark",
  "fire",
  "thunder",
  "water",
  "earth",
  "diamond",
  "gold",
  "spirit",
];

test("shell and discovery fit intermediate viewport widths", async ({ page }) => {
  test.setTimeout(180_000);
  for (const width of [320, 360, 375, 390, 430, 600, 768, 820, 1024, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ["/", "/mods"]) {
      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
        timeout: 15000,
      });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        `${route} at ${width}`,
      ).toBe(true);
      const clipped = await page
        .locator("header")
        .first()
        .locator("button:visible, a:visible, select:visible")
        .evaluateAll((elements) =>
          elements
            .filter((element) => {
              const r = element.getBoundingClientRect();
              return r.left < 0 || r.right > innerWidth;
            })
            .map((element) => element.getAttribute("aria-label") || element.textContent),
        );
      expect(clipped, `header at ${width}`).toEqual([]);
    }
  }
});

test("all nine appearances change full surfaces, persist and send no theme requests", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  const errors: string[] = [];
  let requests = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (request) => {
    if (request.url().includes("supabase.co")) requests++;
  });
  await page.goto("/", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  if ((page.viewportSize()?.width ?? 0) < 1024)
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const selector = page.getByRole("combobox", { name: "Website theme" });
  const before = requests;
  const backgrounds = new Set<string>();
  for (const theme of themes) {
    await selector.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-website-theme", theme);
    backgrounds.add(
      await page.evaluate(() =>
        getComputedStyle(document.documentElement).getPropertyValue("--background").trim(),
      ),
    );
    const contrast = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      const luminance = (hex: string) => {
        const c = hex
          .slice(1)
          .match(/.{2}/g)!
          .map((v) => parseInt(v, 16) / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
        return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722;
      };
      const ratio = (a: string, b: string) => {
        const x = luminance(a),
          y = luminance(b);
        return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
      };
      return ratio(
        style.getPropertyValue("--muted-foreground").trim(),
        style.getPropertyValue("--card").trim(),
      );
    });
    expect(contrast, theme).toBeGreaterThanOrEqual(4.5);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      theme,
    ).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${theme}.png`) });
  }
  expect(backgrounds.size).toBe(9);
  expect(requests).toBe(before);
  await page.reload({ waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-website-theme", "spirit");
  await page.goto("/mods", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-website-theme", "spirit");
  expect(errors).toEqual([]);
});
