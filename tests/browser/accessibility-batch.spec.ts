import { expect, test, type Page } from "@playwright/test";

const routes = [
  "/",
  "/mods",
  "/mods/thunder-arena",
  "/about",
  "/contact",
  "/rewards",
  "/auth",
  "/generator",
  "/privacy",
  "/disclaimer",
  "/notifications",
  "/claim",
];

test.beforeEach(({ page }) => {
  test.setTimeout(180000);
  page.on("pageerror", (error) => {
    throw error;
  });
});

async function ready(page: Page, route: string) {
  const response = await page.goto(route, { waitUntil: "domcontentloaded" });
  expect(response?.status(), route).toBeLessThan(400);
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await expect(page.locator("main")).toBeVisible();
}

test("public journeys expose names, labels, landmarks and a logical heading start", async ({
  page,
}) => {
  for (const route of routes) {
    await ready(page, route);
    const issues = await page.evaluate(() => {
      const visible = (element: Element) => {
        const style = getComputedStyle(element),
          box = element.getBoundingClientRect();
        return (
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          box.width > 0 &&
          box.height > 0
        );
      };
      const name = (element: Element) =>
        element.getAttribute("aria-label")?.trim() ||
        (element
          .getAttribute("aria-labelledby")
          ?.split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent?.trim())
          .filter(Boolean)
          .join(" ") ??
          "") ||
        (element.id
          ? document.querySelector(`label[for="${CSS.escape(element.id)}"]`)?.textContent?.trim()
          : "") ||
        element.closest("label")?.textContent?.trim() ||
        element.textContent?.trim() ||
        element.getAttribute("title")?.trim() ||
        (element instanceof HTMLInputElement ? element.value || element.placeholder : "");
      const problems: string[] = [];
      const h1 = [...document.querySelectorAll("main h1")].filter(visible);
      if (h1.length !== 1) problems.push(`visible main h1 count ${h1.length}`);
      for (const image of document.querySelectorAll("img"))
        if (!image.hasAttribute("alt")) problems.push("image missing alt");
      for (const control of document.querySelectorAll("button, a[href], input, select, textarea"))
        if (visible(control) && !name(control))
          problems.push(`unnamed ${control.tagName.toLowerCase()}`);
      for (const field of document.querySelectorAll("input:not([type=hidden]), select, textarea")) {
        if (!visible(field)) continue;
        const labelled =
          !!field.getAttribute("aria-label") ||
          !!field.getAttribute("aria-labelledby") ||
          (field.id && !!document.querySelector(`label[for="${CSS.escape(field.id)}"]`)) ||
          !!field.closest("label");
        if (!labelled) problems.push(`unlabelled ${field.tagName.toLowerCase()}#${field.id}`);
      }
      for (const nested of document.querySelectorAll("a a, a button, button a, button button"))
        if (visible(nested)) problems.push(`nested interactive ${nested.tagName.toLowerCase()}`);
      return [...new Set(problems)];
    });
    expect(issues, `${route}: ${issues.join(", ")}`).toEqual([]);
  }
});

test("keyboard focus is visible and skip navigation reaches main content", async ({ page }) => {
  await ready(page, "/mods");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Skip to content", exact: true });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();
  const controls = page.locator(
    'a[href]:visible, button:visible, input:visible, select:visible, textarea:visible, [tabindex]:not([tabindex="-1"]):visible',
  );
  const count = Math.min(await controls.count(), 24);
  for (let index = 0; index < count; index++) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const element = document.activeElement;
      if (!(element instanceof HTMLElement)) return null;
      const style = getComputedStyle(element);
      return {
        tag: element.tagName,
        visible:
          element.getBoundingClientRect().width > 0 && element.getBoundingClientRect().height > 0,
        name: element.getAttribute("aria-label") || element.textContent?.trim().slice(0, 40),
        outline: style.outlineStyle,
        outlineWidth: parseFloat(style.outlineWidth),
        shadow: style.boxShadow,
      };
    });
    expect(
      !!focus &&
        focus.visible &&
        focus.tag !== "BODY" &&
        ((focus.outline !== "none" && focus.outlineWidth >= 2) || focus.shadow !== "none"),
      JSON.stringify(focus),
    ).toBe(true);
  }
});

test("content reflows at 320 CSS pixels with 200 percent text", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 900 });
  for (const route of ["/", "/mods", "/contact", "/auth", "/generator", "/notifications"]) {
    await ready(page, route);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect
      .poll(() =>
        page.evaluate(
          () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
    await expect(page.locator("main h1")).toBeVisible();
  }
});

test("reduced motion disables repeating decorative animation and smooth scrolling", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await ready(page, "/");
  const result = await page.evaluate(() => ({
    scroll: getComputedStyle(document.documentElement).scrollBehavior,
    repeating: [...document.querySelectorAll("*")]
      .filter((element) => {
        const style = getComputedStyle(element);
        return style.animationName !== "none" && style.animationIterationCount === "infinite";
      })
      .map((element) => `${element.tagName}.${(element as HTMLElement).className}`),
  }));
  expect(result.scroll).toBe("auto");
  expect(result.repeating).toEqual([]);
});
