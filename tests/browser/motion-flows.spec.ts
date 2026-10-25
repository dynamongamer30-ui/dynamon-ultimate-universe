import { expect, test } from "@playwright/test";

test("detail, missing generator link and missing unlock pass stay readable with reduced motion", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  page.on("pageerror", (error) => {
    throw error;
  });
  const writes: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes(".supabase.co/") && request.method() === "POST")
      writes.push(new URL(request.url()).pathname);
  });
  for (const path of ["/mods/thunder-arena", "/generator", "/unlock"]) {
    await page.goto(path, { waitUntil: "networkidle" });
    await expect(page.locator("main")).toBeVisible();
    if (path === "/unlock")
      await expect(
        page.getByRole("alert").getByText(/could not find your download pass/),
      ).toBeVisible();
    expect(
      await page
        .locator('main [style*="opacity"][style*="transform"], main .route-hero')
        .evaluateAll((nodes) =>
          nodes.every(
            (node) =>
              getComputedStyle(node).opacity === "1" && getComputedStyle(node).transform === "none",
          ),
        ),
      path,
    ).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      path,
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`${path.split("/").pop()}.png`) });
  }
  expect(writes).toEqual([]);
});

test("unlock decoration stops on preference and visibility changes and uses theme colours", async ({
  page,
}, info) => {
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Canvas instrumentation and visibility simulation are confined to localhost.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
  const writes: string[] = [];
  await page.route("**/*.supabase.co/**", async (route) => {
    if (route.request().method() === "POST") writes.push(new URL(route.request().url()).pathname);
    await route.fulfill({ contentType: "application/json", body: "[]" });
  });
  await page.addInitScript(() => {
    localStorage.removeItem("dg_token");
    const state = window as unknown as { emberDraws: number; emberColours: string[] };
    state.emberDraws = 0;
    state.emberColours = [];
    const fill = CanvasRenderingContext2D.prototype.fill;
    CanvasRenderingContext2D.prototype.fill = function (...args: unknown[]) {
      if (this.canvas.getAttribute("aria-hidden") === "true") {
        state.emberDraws++;
        state.emberColours.push(String(this.fillStyle));
        if (state.emberColours.length > 100) state.emberColours.shift();
      }
      return Reflect.apply(fill, this, args);
    };
  });
  const draws = () => page.evaluate(() => (window as unknown as { emberDraws: number }).emberDraws);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/unlock", { waitUntil: "networkidle" });
  await expect.poll(draws).toBeGreaterThan(0);
  expect(
    await page.evaluate(() => {
      const colors = (window as unknown as { emberColours: string[] }).emberColours;
      const css = getComputedStyle(document.documentElement);
      return colors.every((color) =>
        [
          css.getPropertyValue("--primary-ink").trim(),
          css.getPropertyValue("--muted-foreground").trim(),
        ].includes(color),
      );
    }),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  const paused = await draws();
  await page.waitForTimeout(200);
  expect(await draws()).toBe(paused);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(draws).toBeGreaterThan(paused);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: true });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  const hidden = await draws();
  await page.waitForTimeout(200);
  expect(await draws()).toBe(hidden);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", { configurable: true, value: false });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect.poll(draws).toBeGreaterThan(hidden);
  expect(writes).toEqual([]);
});
