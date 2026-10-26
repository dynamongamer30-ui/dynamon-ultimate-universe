import { expect, test } from "@playwright/test";

test("public metadata, private indexing and install assets are consistent", async ({ page }) => {
  test.setTimeout(90000);
  page.on("pageerror", (error) => {
    throw error;
  });
  for (const path of ["/", "/mods", "/mods/thunder-arena", "/about", "/contact"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
      timeout: 15000,
    });
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://dynamongamer.com${path}`,
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", /\S.{30}/);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /^https:\/\//,
    );
  }
  for (const path of [
    "/auth",
    "/profile",
    "/admin-control",
    "/admin-loader",
    "/admin-notifications",
    "/claim",
    "/unlock",
    "/generator",
  ]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
      timeout: 15000,
    });
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/);
  }
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  const manifest = await response.json();
  expect(manifest.start_url).toBe("/");
  expect(manifest.display).toBe("standalone");
  for (const icon of manifest.icons) {
    expect((await page.request.get(icon.src)).ok()).toBe(true);
  }
  const robots = await page.request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /admin-control");
});

test("public pages and action labels remain usable at double text size on a narrow screen", async ({
  page,
}) => {
  test.setTimeout(90000);
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.setViewportSize({ width: 390, height: 900 });
  for (const path of ["/", "/mods", "/auth", "/contact", "/rewards"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
      timeout: 15000,
    });
    await expect(page.locator("main")).toBeVisible();
    await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
    await page.evaluate(() => document.fonts.ready);
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      outside: [
        ...document.querySelectorAll<HTMLElement>(
          "main h1, main h2, main button, main input, main textarea",
        ),
      ]
        .filter((node) => {
          const r = node.getBoundingClientRect();
          return r.width > 0 && (r.left < -1 || r.right > innerWidth + 1);
        })
        .map((node) => ({
          name: node.getAttribute("aria-label") || node.textContent?.trim().slice(0, 60),
          box: node.getBoundingClientRect().toJSON(),
          parent: node.parentElement?.getBoundingClientRect().toJSON(),
        })),
    }));
    expect(overflow.width, `${path}: ${JSON.stringify(overflow)}`).toBeLessThanOrEqual(
      overflow.viewport,
    );
    expect(overflow.outside, path).toEqual([]);
  }
});
