import { expect, test, type Page } from "@playwright/test";
const ownerId = "00000000-0000-4000-8000-000000000011";
test.beforeEach(async ({ page }, info) => {
  test.setTimeout(60000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Owner fixtures run only on localhost with HTTP/WebSocket interception.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
});
async function fixture(page: Page) {
  const expires = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id: ownerId,
    email: "owner@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: ownerId, exp: expires, role: "authenticated" })).toString("base64url")}.fixture`;
  await page.addInitScript(
    ({ user, token, expires }) => {
      localStorage.setItem(
        "sb-dfxcpxzylyycrirtnkof-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "local-owner-fixture-only",
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
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Local clipboard denial");
          },
        },
      });
      const ticks = new Set<number>(),
        nativeSet = window.setTimeout.bind(window),
        nativeClear = window.clearTimeout.bind(window);
      window.setTimeout = ((handler: TimerHandler, delay?: number, ...args: unknown[]) => {
        let id = 0;
        id = nativeSet(() => {
          ticks.delete(id);
          if (typeof handler === "function") handler(...args);
        }, delay);
        if (delay === 1000) ticks.add(id);
        return id;
      }) as typeof window.setTimeout;
      window.clearTimeout = ((id?: number) => {
        if (id !== undefined) ticks.delete(id);
        nativeClear(id);
      }) as typeof window.clearTimeout;
      (window as unknown as { fixtureTicks: () => number }).fixtureTicks = () => ticks.size;
    },
    { user, token, expires },
  );
  const state = {
    rejectCounts: false,
    rejectKeys: false,
    denyDelete: true,
    holdStatus: false,
    releaseStatus: undefined as (() => void) | undefined,
    reads: [] as { table: string; method: string; select: string | null }[],
    writes: [] as { table: string; method: string }[],
    report: {
      id: "00000000-0000-4000-8000-000000000101",
      target_type: "comment",
      target_id: "00000000-0000-4000-8000-000000000201",
      reason: "spam",
      details: "Long local report " + "x".repeat(300),
      status: "open",
      created_at: "2026-10-01T00:00:00Z",
    },
    keys: Array.from({ length: 12 }, (_, i) => ({
      id: `LOCAL-KEY-${i + 1}`,
      data: {
        status: "active",
        expiry: Math.floor(Date.now() / 1000) + 3600,
        durationHours: 24,
        activated: true,
        device: `LOCAL-DEVICE-${i}`,
        date: 1790812800,
        fingerprint: "LOCAL-FINGERPRINT",
        sourceIP: "192.0.2.1",
        source: "local-" + "x".repeat(80),
      },
    })),
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      table = url.pathname.split("/").pop()!;
    let body: unknown = [],
      status = 200;
    const headers: Record<string, string> = {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-expose-headers": "content-range",
    };
    if (req.method() === "GET" || req.method() === "HEAD")
      state.reads.push({ table, method: req.method(), select: url.searchParams.get("select") });
    else if (!url.pathname.startsWith("/auth/") && !url.pathname.includes("/rpc/"))
      state.writes.push({ table, method: req.method() });
    if (url.pathname === "/auth/v1/user") body = user;
    else if (table === "get_my_profile")
      body = [
        {
          id: ownerId,
          username: "fixture_owner",
          display_name: "Fixture Owner",
          is_owner: true,
          gender: "other",
          avatar_url: null,
          custom_avatar_url: null,
        },
      ];
    else if (table === "notification_prefs") body = { asked_at: "2026-10-01T00:00:00Z" };
    else if (table === "user_xp") body = { xp: 0, level: 1 };
    else if (table === "user_streaks") body = { current_streak: 3, longest_streak: 3 };
    else if (req.method() === "HEAD") {
      if (state.rejectCounts) {
        status = 503;
        body = null;
      } else {
        headers["content-range"] = `0-0/${table === "mod_subscribers" ? 2250 : 22}`;
        body = null;
      }
    } else if (table === "reports") {
      if (req.method() === "PATCH") {
        if (state.holdStatus)
          await new Promise<void>((resolve) => {
            state.releaseStatus = resolve;
          });
        state.report.status = req.postDataJSON().status;
        body = { id: state.report.id, status: state.report.status };
      } else body = [state.report];
    } else if (table === "comments" && req.method() === "DELETE") {
      if (state.denyDelete) {
        status = 403;
        body = { message: "Local deletion denied" };
      } else body = { id: state.report.target_id };
    } else if (table === "valid_keys") {
      if (state.rejectKeys) {
        status = 503;
        body = { message: "Local key lookup denied" };
      } else body = state.keys;
    }
    await route
      .fulfill({ status, headers, body: body === null ? "" : JSON.stringify(body) })
      .catch(() => {});
  });
  return state;
}
async function open(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 20000,
  });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: path === "/admin" ? "Dashboard" : "Key System",
      exact: true,
    }),
  ).toBeVisible({ timeout: 20000 });
}

test("dashboard lookup errors mask counts, preserve drafts and retry without writes", async ({
  page,
}) => {
  const state = await fixture(page);
  state.rejectCounts = true;
  await open(page, "/admin");
  await expect(
    page.getByRole("button", { name: "Retry dashboard lookup", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Dashboard totals" }).getByText("0", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("textbox", { name: "Subject", exact: true }).fill("Local owner draft");
  await expect(page.getByRole("button", { name: "Queue broadcast", exact: true })).toBeDisabled();
  state.rejectCounts = false;
  await page.getByRole("button", { name: "Retry dashboard lookup", exact: true }).click();
  await expect(page.getByRole("button", { name: "Queue broadcast", exact: true })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Subject", exact: true })).toHaveValue(
    "Local owner draft",
  );
  await expect(page.getByText(/2250 subscription records/)).toBeVisible();
  expect(
    state.reads
      .filter((r) => r.table === "mod_subscribers")
      .every((r) => r.method === "HEAD" && !r.select?.includes("email")),
  ).toBe(true);
  expect(state.writes).toEqual([]);
});

test("failed content removal leaves its report open and never logs false success", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page, "/admin");
  const remove = page.getByRole("button", { name: "Remove content", exact: true });
  await expect(remove).toBeEnabled();
  await remove.click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText(/Content removal was not confirmed/)).toBeVisible();
  await expect(remove).toBeEnabled();
  expect(state.writes).toEqual([{ table: "comments", method: "DELETE" }]);
  expect(state.report.status).toBe("open");
});

test("report status controls lock until an acknowledged update and count it once", async ({
  page,
}) => {
  const state = await fixture(page);
  state.holdStatus = true;
  await open(page, "/admin");
  const dismiss = page.getByRole("button", { name: "Dismiss", exact: true });
  await expect(dismiss).toBeEnabled();
  await dismiss.click();
  await expect.poll(() => !!state.releaseStatus).toBe(true);
  await expect(dismiss).toBeDisabled();
  await dismiss.evaluate((button: HTMLButtonElement) => button.click());
  expect(state.writes.filter((r) => r.table === "reports")).toHaveLength(1);
  state.releaseStatus?.();
  await expect(dismiss).toHaveCount(0);
  expect(state.report.status).toBe("dismissed");
  expect(state.writes.filter((r) => r.table === "moderation_log")).toHaveLength(1);
});

test("key lookup failure has a read-only retry and no fallback generation", async ({ page }) => {
  const state = await fixture(page);
  state.rejectKeys = true;
  await open(page, "/admin-keys");
  await expect(page.getByRole("button", { name: "Retry key lookup", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate & copy", exact: true })).toBeDisabled();
  await expect(page.getByRole("region", { name: "Key totals" })).not.toContainText("0");
  state.rejectKeys = false;
  await page.getByRole("button", { name: "Retry key lookup", exact: true }).click();
  await expect(page.getByRole("button", { name: "LOCAL-KEY-1", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Generate & copy", exact: true })).toBeEnabled();
  await page.getByRole("textbox", { name: "Search keys", exact: true }).fill("LOCAL-KEY-1");
  await page.getByRole("button", { name: "Refresh key list", exact: true }).click();
  await expect(page.getByRole("button", { name: "Refresh key list", exact: true })).toBeEnabled();
  await expect(page.getByRole("textbox", { name: "Search keys", exact: true })).toHaveValue(
    "LOCAL-KEY-1",
  );
  expect(state.reads.filter((row) => row.table === "valid_keys")).toHaveLength(3);
  expect(state.writes).toEqual([]);
});

test("owner key controls wrap, have accessible names and share one expiry timer", async ({
  page,
}, info) => {
  const state = await fixture(page);
  await open(page, "/admin-keys");
  await expect(page.getByRole("button", { name: "LOCAL-KEY-1", exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { fixtureTicks: () => number }).fixtureTicks()),
  ).toBeLessThanOrEqual(2);
  await expect(
    page.getByRole("spinbutton", { name: "Duration (hours; 0 = lifetime)", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Key system sections" })).toBeVisible();
  for (const width of [320, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      (await page.getByRole("button", { name: "Copy", exact: true }).first().boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: info.outputPath(`owner-keys-${width}.png`), fullPage: true });
  }
  await page.getByRole("button", { name: "Copy", exact: true }).first().click();
  await expect(
    page.getByText("Could not copy the key. Clipboard access may be blocked.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Search keys", exact: true }).fill("LOCAL-KEY-1");
  await expect(page.getByRole("button", { name: "LOCAL-KEY-2", exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("dashboard report details and named form fields remain usable at narrow widths", async ({
  page,
}, info) => {
  await fixture(page);
  await open(page, "/admin");
  await expect(page.getByRole("textbox", { name: "Message", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Dismiss", exact: true })).toBeEnabled();
  for (const width of [320, 820, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      (await page.getByRole("button", { name: "Dismiss", exact: true }).boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: info.outputPath(`owner-dashboard-${width}.png`),
      fullPage: false,
    });
  }
});
