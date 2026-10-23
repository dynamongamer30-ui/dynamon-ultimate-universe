import { expect, test, type Page } from "@playwright/test";

test.beforeEach(({ page }, info) => {
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic subscription traffic is intercepted on localhost only.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});

async function fixture(page: Page) {
  const id = "00000000-0000-4000-8000-000000000001",
    expires = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id,
    email: "fixture@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: expires, role: "authenticated" })).toString("base64url")}.fixture`;
  await page.addInitScript(
    ({ user, token, expires }) => {
      localStorage.setItem(
        "sb-dfxcpxzylyycrirtnkof-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "local-fixture-only",
          expires_at: expires,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
      const scope = window as unknown as { permissionCalls: number };
      scope.permissionCalls = 0;
      Object.defineProperty(window, "Notification", {
        configurable: true,
        value: {
          permission: "default",
          requestPermission: async () => {
            scope.permissionCalls++;
            return "denied";
          },
        },
      });
    },
    { user, token, expires },
  );
  const state = {
    id,
    reads: 0,
    denyRead: false,
    order: [] as string[],
    subscriberWrites: [] as { method: string; body: unknown }[],
    prefs: [] as Record<string, unknown>[],
    subscriberMode: "allow" as "allow" | "deny" | "empty",
    prefsMode: "allow" as "allow" | "deny" | "empty",
    exists: false,
    hold: false,
    release: undefined as undefined | (() => void),
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname.endsWith("/rpc/get_my_profile"))
      data = [
        {
          id,
          username: "fixture",
          display_name: "Fixture Trainer",
          gender: "other",
          avatar_url: null,
          custom_avatar_url: null,
          is_owner: false,
        },
      ];
    else if (url.pathname.endsWith("/notification_prefs")) {
      if (request.method() === "GET") {
        state.reads++;
        data = null;
        if (state.denyRead) {
          status = 503;
          data = { message: "Fixture read failed" };
        }
      } else {
        state.order.push("preferences");
        state.prefs.push(request.postDataJSON());
        if (state.prefsMode === "deny") {
          status = 403;
          data = { message: "Fixture denied" };
        } else data = state.prefsMode === "empty" ? [] : [{ user_id: id }];
      }
    } else if (url.pathname.endsWith("/mod_subscribers")) {
      if (request.method() === "GET") data = state.exists ? { user_id: id } : null;
      else {
        state.order.push("subscription");
        state.subscriberWrites.push({
          method: request.method(),
          body: request.postData() ? request.postDataJSON() : null,
        });
        if (state.hold)
          await new Promise<void>((resolve) => {
            state.release = resolve;
          });
        if (state.subscriberMode === "deny") {
          status = 403;
          data = { message: "Fixture denied" };
        } else if (state.subscriberMode === "empty") data = [];
        else {
          state.exists = request.method() !== "DELETE";
          data = [{ user_id: id }];
        }
      }
    }
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  });
  return state;
}

async function open(page: Page) {
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
  const dialog = page.getByRole("dialog", { name: "Get notified on new mods", exact: true });
  await expect(dialog).toBeVisible({ timeout: 15000 });
  return dialog;
}

test("subscription save locks choices and every dismissal while one request is pending", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.hold = true;
  const dialog = await open(page);
  const email = dialog.getByRole("button", { name: /Email me/ }),
    push = dialog.getByRole("button", { name: /Browser notification/ });
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).dblclick();
  await expect.poll(() => state.subscriberWrites.length).toBe(1);
  await expect(email).toBeDisabled();
  await expect(push).toBeDisabled();
  await expect(
    dialog.getByRole("button", { name: "Close notification preferences" }),
  ).toBeDisabled();
  await expect(dialog.getByRole("button", { name: "Maybe later" })).toBeDisabled();
  await page.keyboard.press("Escape");
  await page.mouse.click(2, 2);
  await expect(dialog).toBeVisible();
  expect(state.prefs).toEqual([]);
  expect(
    await page.evaluate(() => (window as unknown as { permissionCalls: number }).permissionCalls),
  ).toBe(1);
  state.hold = false;
  state.release!();
  await expect(dialog).toHaveCount(0);
  expect(state.order).toEqual(["subscription", "preferences"]);
  expect(state.prefs[0]).toMatchObject({
    user_id: state.id,
    email_opt_in: true,
    push_opt_in: true,
  });
  expect(state.subscriberWrites).toHaveLength(1);
  await page.screenshot({ path: info.outputPath("subscription-saved.png") });
});

test("a partially saved preference retains choices and retries before marking the prompt complete", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.prefsMode = "deny";
  const dialog = await open(page);
  const push = dialog.getByRole("button", { name: /Browser notification/ });
  await push.click();
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(dialog.getByRole("alert")).toContainText("Some changes may already be saved");
  await expect(push).toHaveAttribute("aria-pressed", "false");
  expect(state.order).toEqual(["subscription", "preferences"]);
  expect(state.exists).toBe(true);
  await dialog.screenshot({ path: info.outputPath("subscription-partial.png") });
  state.prefsMode = "empty";
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  state.prefsMode = "allow";
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.prefs).toHaveLength(3);
  expect(state.prefs.every((row) => row.push_opt_in === false)).toBe(true);
  expect(
    await page.evaluate(() => (window as unknown as { permissionCalls: number }).permissionCalls),
  ).toBe(0);
});

test("a zero-row unsubscribe cannot claim success while the subscription remains", async ({
  page,
}) => {
  const state = await fixture(page);
  state.exists = true;
  state.subscriberMode = "empty";
  const dialog = await open(page);
  await dialog.getByRole("button", { name: /Email me/ }).click();
  await dialog.getByRole("button", { name: /Browser notification/ }).click();
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  expect(state.prefs).toEqual([]);
  expect(state.subscriberWrites[0].method).toBe("DELETE");
  state.exists = false;
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.prefs).toHaveLength(1);
  expect(state.prefs[0]).toMatchObject({ email_opt_in: false, push_opt_in: false });
});

test("dismissal skips the prompt for this session without writes or a permission request", async ({
  page,
}) => {
  const state = await fixture(page);
  const dialog = await open(page);
  await dialog.getByRole("button", { name: "Maybe later", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible();
  expect(state.reads).toBe(1);
  expect(state.prefs).toEqual([]);
  expect(state.subscriberWrites).toEqual([]);
  expect(
    await page.evaluate(() => (window as unknown as { permissionCalls: number }).permissionCalls),
  ).toBe(0);
});

test("denied or unconfirmed subscription writes do not mark preferences complete", async ({
  page,
}) => {
  const state = await fixture(page);
  state.subscriberMode = "deny";
  const dialog = await open(page);
  await dialog.getByRole("button", { name: /Browser notification/ }).click();
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  expect(state.prefs).toEqual([]);
  state.subscriberMode = "empty";
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect.poll(() => state.subscriberWrites.length).toBe(2);
  await expect(dialog.getByRole("alert")).toBeVisible();
  expect(state.prefs).toEqual([]);
  state.subscriberMode = "allow";
  await dialog.getByRole("button", { name: "Save preferences", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(state.prefs).toHaveLength(1);
});

test("a failed preference read does not open the opt-in prompt or retry automatically", async ({
  page,
}) => {
  await page.clock.install();
  const state = await fixture(page);
  state.denyRead = true;
  await page.goto("/auth", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible();
  await expect.poll(() => state.reads).toBe(1);
  await page.clock.runFor(12_000);
  await expect(
    page.getByRole("dialog", { name: "Get notified on new mods", exact: true }),
  ).toHaveCount(0);
  expect(state.reads).toBe(1);
  expect(state.prefs).toEqual([]);
  expect(state.subscriberWrites).toEqual([]);
});

test("preference error and actions remain usable across narrow and wide viewports", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  const state = await fixture(page);
  state.prefsMode = "deny";
  const dialog = await open(page);
  await dialog.getByRole("button", { name: /Browser notification/ }).click();
  const save = dialog.getByRole("button", { name: "Save preferences", exact: true });
  await save.click();
  await expect(dialog.getByRole("alert")).toBeVisible();
  for (const [width, height] of [
    [320, 568],
    [360, 640],
    [390, 844],
    [600, 900],
    [820, 1180],
    [1024, 900],
    [1440, 1000],
    [1920, 1080],
  ]) {
    await page.setViewportSize({ width, height });
    await save.scrollIntoViewIfNeeded();
    await expect(save).toBeInViewport({ ratio: 1 });
    expect(
      await dialog.evaluate((node) => {
        const r = node.getBoundingClientRect();
        return r.top >= 0 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
      }),
      `${width} dialog bounds`,
    ).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    if (width === 320) await dialog.screenshot({ path: info.outputPath("preferences-320.png") });
  }
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  expect(state.subscriberWrites).toHaveLength(1);
  expect(state.prefs).toHaveLength(1);
});
