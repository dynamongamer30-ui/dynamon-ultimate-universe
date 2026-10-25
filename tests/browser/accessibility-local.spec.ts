import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }, info) => {
  test.setTimeout(120000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Local intercepted configuration only.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
  await page.route("**/*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    const data = url.pathname.endsWith("/site_settings")
      ? [
          {
            key: "announcement",
            value: { enabled: true, message: "Local announcement fixture", href: "", tone: "info" },
          },
        ]
      : [];
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(data) });
  });
});

async function ready(page: Page, route = "/") {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
}

test("announcement dismissal works with blocked storage and keeps a usable target", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    Storage.prototype.getItem = function (key) {
      if (key.startsWith("announce:"))
        throw new DOMException("Local blocked storage", "SecurityError");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("announce:"))
        throw new DOMException("Local blocked storage", "SecurityError");
      return set.call(this, key, value);
    };
  });
  await ready(page);
  const dismiss = page.getByRole("button", { name: "Dismiss announcement", exact: true });
  await expect(dismiss).toBeVisible();
  const box = (await dismiss.boundingBox())!;
  expect(box.width).toBeGreaterThanOrEqual(44);
  expect(box.height).toBeGreaterThanOrEqual(44);
  await dismiss.click();
  await expect(page.getByText("Local announcement fixture", { exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Home", exact: true }).last().click();
  await expect(page.getByText("Local announcement fixture", { exact: true })).toHaveCount(0);
});

test("feature tilt stops work on reduced-motion changes and coarse input", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const schedule = requestAnimationFrame.bind(window);
    const state = window as unknown as { tiltFrames: number };
    state.tiltFrames = 0;
    window.requestAnimationFrame = (callback) => {
      if (callback.toString().includes("--card-tilt-x")) state.tiltFrames++;
      return schedule(callback);
    };
  });
  await ready(page);
  const card = page.locator(".feature-tilt").first();
  await card.scrollIntoViewIfNeeded();
  const count = () => page.evaluate(() => (window as unknown as { tiltFrames: number }).tiltFrames);
  const move = () =>
    card.dispatchEvent("pointermove", { clientX: 100, clientY: 100, pointerType: "mouse" });
  const initial = await count();
  await page.waitForTimeout(200);
  expect(await count()).toBe(initial);
  await move();
  const fine = await page.evaluate(() => matchMedia("(pointer: fine)").matches);
  if (fine) await expect.poll(count).toBeGreaterThan(initial);
  else {
    await page.waitForTimeout(200);
    expect(await count()).toBe(initial);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect
    .poll(() => card.evaluate((element) => element.style.getPropertyValue("--card-tilt-x")))
    .toBe("");
  const reduced = await count();
  await move();
  await page.waitForTimeout(250);
  expect(await count()).toBe(reduced);
  await expect(card).toHaveCSS("transform", "none");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await move();
  if (fine) await expect.poll(count).toBeGreaterThan(reduced);
});

test("all nine themes retain visible text and keyboard outlines in forced colors", async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ forcedColors: "active" });
  await ready(page, "/mods");
  const themes = page.getByRole("combobox", { name: "Website theme", exact: true }).first();
  for (const theme of [
    "royal-black",
    "dark",
    "fire",
    "thunder",
    "water",
    "earth",
    "diamond",
    "gold",
    "spirit",
  ]) {
    await themes.selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-website-theme", theme);
    const gradient = page.locator("header .text-gradient").first();
    const style = await gradient.evaluate((element) => ({
      color: getComputedStyle(element).color,
      fill: getComputedStyle(element).webkitTextFillColor,
      image: getComputedStyle(element).backgroundImage,
    }));
    expect(style.color).not.toBe("rgba(0, 0, 0, 0)");
    expect(style.fill).not.toBe("transparent");
    expect(style.image).toBe("none");
  }
  const search = page.getByRole("button", { name: "Search", exact: true });
  await search.focus();
  await expect(search).toHaveCSS("outline-style", "solid");
  await expect(search).toHaveCSS("outline-width", "2px");
  await page.screenshot({ path: info.outputPath("forced-colors.png") });
});

test("automated WCAG checks cover shared chrome and public forms", async ({ page }) => {
  const axePath = process.env.AXE_CORE_PATH;
  test.skip(
    !axePath,
    "Set AXE_CORE_PATH to an installed axe-core/axe.min.js to run the optional scanner.",
  );
  for (const route of ["/mods", "/contact", "/auth", "/generator"]) {
    await ready(page, route);
    // Measure the settled surface, after visible entrance fades finish.
    await expect
      .poll(() =>
        page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>(".page-transition, .mods-grid article")].some(
            (element) => {
              const box = element.getBoundingClientRect();
              const opacity = Number(getComputedStyle(element).opacity);
              return (
                element.style.opacity !== "" &&
                box.bottom > 0 &&
                box.top < innerHeight &&
                opacity > 0 &&
                opacity < 1
              );
            },
          ),
        ),
      )
      .toBe(false);
    await page.evaluate(() => document.fonts.ready.then(() => undefined));
    await page.addScriptTag({ path: axePath! });
    const violations = await page.evaluate(async () => {
      const axe = (
        window as unknown as {
          axe: {
            run: (
              context: Document,
              options: unknown,
            ) => Promise<{
              violations: {
                id: string;
                impact: string;
                nodes: { target: string[]; failureSummary: string }[];
              }[];
            }>;
          };
        }
      ).axe;
      const result = await axe.run(document, {
        runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] },
      });
      return result.violations.map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        nodes: violation.nodes.map((node) => ({
          target: node.target,
          summary: node.failureSummary,
        })),
      }));
    });
    expect(violations, `${route}: ${JSON.stringify(violations)}`).toEqual([]);
  }
});
