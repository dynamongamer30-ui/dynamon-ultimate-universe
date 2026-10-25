import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }, info) => {
  test.setTimeout(150000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Local synthetic account; all service traffic intercepted.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
});

async function fixture(page: Page) {
  const id = "00000000-0000-4000-8000-000000000061",
    expires = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id,
    email: "theme@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: expires, role: "authenticated" })).toString("base64url")}.fixture`;
  await page.addInitScript(
    ({ user, token, expires }) => {
      localStorage.setItem(
        "sb-dfxcpxzylyycrirtnkof-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "local-theme-fixture-only",
          expires_at: expires,
          expires_in: 86400,
          token_type: "bearer",
          user,
        }),
      );
      sessionStorage.setItem(`notif-skipped:${user.id}`, "1");
      sessionStorage.setItem(
        `streak-checkin:${user.id}:${new Date().toISOString().slice(0, 10)}`,
        "confirmed",
      );
    },
    { user, token, expires },
  );
  await page.route("**/local-theme-avatar.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="2048"><rect width="2048" height="2048" fill="#b4bbc4"/><circle cx="1024" cy="1024" r="600" fill="#111318"/></svg>',
    }),
  );
  const writes: string[] = [];
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    let body: unknown = [];
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method()) && !url.pathname.includes("/rpc/"))
      writes.push(url.pathname);
    if (url.pathname === "/auth/v1/user") body = user;
    else if (url.pathname.endsWith("/rpc/get_my_profile"))
      body = [
        {
          id,
          username: "theme_fixture",
          display_name: "Local theme owner",
          is_owner: true,
          custom_avatar_url: "/local-theme-avatar.svg",
          avatar_url: null,
        },
      ];
    else if (url.pathname.endsWith("/notification_prefs"))
      body = { asked_at: "2026-01-01T00:00:00Z" };
    else if (url.pathname.endsWith("/user_xp")) body = { xp: 0, level: 1 };
    else if (url.pathname.endsWith("/user_streaks"))
      body = { current_streak: 0, longest_streak: 0 };
    await route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 20000,
  });
  await expect(page.locator(".account-trigger img")).toHaveJSProperty("naturalWidth", 2048);
  return writes;
}

test("large avatars and feedback/account popovers never expand or overflow the header", async ({
  page,
}, info) => {
  const writes = await fixture(page);
  const header = page.locator("header.site-chrome");
  for (const width of [320, 360, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const account = page.getByRole("button", { name: "Account", exact: true });
    const box = (await account.boundingBox())!;
    expect(box.width).toBe(44);
    expect(box.height).toBe(44);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    const height = (await header.boundingBox())!.height;
    if (width <= 430) expect(height).toBeLessThanOrEqual(90);
    const feedback = page.getByRole("button", { name: /^Feedback preference:/ });
    await feedback.click();
    const panel = page.getByRole("dialog", { name: "Feedback preferences", exact: true });
    await expect(panel).toBeInViewport({ ratio: 1 });
    expect((await header.boundingBox())!.height).toBe(height);
    if ([320, 390, 1440].includes(width))
      await page.screenshot({ path: info.outputPath(`feedback-${width}.png`) });
    await panel.getByRole("radio", { name: /^Off/ }).focus();
    await page.keyboard.press("Escape");
    await expect(panel).toHaveCount(0);
    await expect(feedback).toBeFocused();
    await account.click();
    const menu = page.getByRole("dialog", { name: "Account menu", exact: true });
    await expect(menu).toBeInViewport({ ratio: 1 });
    expect((await header.boundingBox())!.height).toBe(height);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  }
  expect(writes).toEqual([]);
});

test("all native palettes render readable homepage actions and persist without service writes", async ({
  page,
}, info) => {
  const writes = await fixture(page);
  await page.setViewportSize({ width: 390, height: 1000 });
  if (process.env.AXE_CORE_PATH) await page.addScriptTag({ path: process.env.AXE_CORE_PATH });
  const palette = {
    "royal-black": ["#08090c", "#b4bbc4", "#e2e6eb"],
    dark: ["#0d0b19", "#7c3aed", "#cbb5ff"],
    fire: ["#130e0f", "#f97316", "#ffba88"],
    thunder: ["#0a1119", "#38bdf8", "#a1dbff"],
    water: ["#091219", "#22d3ee", "#9aeef7"],
    earth: ["#0e120f", "#84cc16", "#d2ee99"],
    diamond: ["#12131a", "#e0e7ff", "#eef1ff"],
    gold: ["#131312", "#fde047", "#ffe99a"],
    spirit: ["#12121a", "#e9d5ff", "#f1dfff"],
  };
  for (const [theme, colors] of Object.entries(palette)) {
    await page.getByRole("button", { name: "Open menu", exact: true }).click();
    await page
      .getByRole("combobox", { name: "Website theme", exact: true })
      .last()
      .selectOption(theme);
    await expect(page.locator("html")).toHaveAttribute("data-website-theme", theme);
    await page.getByRole("button", { name: "Close menu", exact: true }).click();
    expect(
      await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return ["--background", "--primary", "--primary-ink"].map((key) =>
          style.getPropertyValue(key).trim(),
        );
      }),
    ).toEqual(colors);
    const action = page.getByRole("link", { name: "Browse every build", exact: true });
    await expect(action).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    if (process.env.AXE_CORE_PATH) {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await Promise.allSettled(
          document
            .getAnimations()
            .filter((animation) => animation.effect?.getComputedTiming().iterations !== Infinity)
            .map((animation) => animation.finished),
        );
      });
      const violations = await page.evaluate(async () => {
        const axe = (
          window as unknown as {
            axe: {
              run: (
                context: Document,
                options: unknown,
              ) => Promise<{
                violations: { id: string; nodes: { target: string[]; failureSummary: string }[] }[];
              }>;
            };
          }
        ).axe;
        return (
          await axe.run(document, {
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
            },
          })
        ).violations.map((issue) => ({
          id: issue.id,
          nodes: issue.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
        }));
      });
      expect(violations, `${theme}: ${JSON.stringify(violations)}`).toEqual([]);
    }
    await page.screenshot({ path: info.outputPath(`native-${theme}-390.png`) });
  }
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-website-theme", "spirit");
  expect(writes).toEqual([]);
});
