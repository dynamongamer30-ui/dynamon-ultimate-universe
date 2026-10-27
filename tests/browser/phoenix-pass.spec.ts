import { expect, test, type Page } from "@playwright/test";
const storageKey = "sb-dfxcpxzylyycrirtnkof-auth-token";
const idA = "00000000-0000-4000-8000-000000000001";
const idB = "00000000-0000-4000-8000-000000000002";
const passId = "00000000-0000-4000-8000-000000000003";
function sessionFor(id: string) {
  const expires = Math.floor(Date.now() / 1000) + 3 * 86400;
  const user = {
    id,
    email: "fixture@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  return {
    user,
    access_token: `${Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: expires, role: "authenticated" })).toString("base64url")}.fixture`,
    refresh_token: "local-fixture-only",
    expires_at: expires,
    expires_in: 3 * 86400,
    token_type: "bearer",
  };
}
test.beforeEach(({ page }, info) => {
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic pass redemption requires localhost and interception of all Supabase traffic.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});
async function fixture(page: Page) {
  await page.addInitScript(
    ({ storageKey, session }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
      sessionStorage.setItem(`notif-skipped:${session.user.id}`, "1");
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Fixture clipboard denied");
          },
        },
      });
    },
    { storageKey, session: sessionFor(idA) },
  );
  const state = {
    active: idA,
    reads: 0,
    writes: [] as unknown[],
    readBody: [{ id: passId, expires_at: "2027-01-01T00:00:00Z" }] as unknown,
    body: { ok: true, link: "https://example.test/fixture-download", encrypted: false } as unknown,
    denyRead: false,
    status: 200,
    holdRead: false,
    hold: false,
    releaseRead: undefined as (() => void) | undefined,
    release: undefined as (() => void) | undefined,
  };
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      fn = url.pathname.split("/").pop()!;
    let body: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") body = sessionFor(state.active).user;
    else if (fn === "get_my_profile")
      body = [
        {
          id: state.active,
          username: "fixture",
          display_name: "Fixture Trainer",
          gender: "other",
          avatar_url: null,
          custom_avatar_url: null,
          is_owner: false,
        },
      ];
    else if (fn === "notification_prefs") body = { asked_at: "2026-10-01T00:00:00Z" };
    else if (fn === "touch_streak")
      body = [{ current_streak: 1, longest_streak: 1, incremented: false }];
    else if (fn === "user_xp") body = { xp: 0, level: 1 };
    else if (fn === "user_streaks") body = { current_streak: 1, longest_streak: 1 };
    else if (fn === "mod_overrides")
      body = [{ slug: "fire-phoenix", mega_enc: "fixture-configured" }];
    else if (fn === "my_active_phoenix_pass") {
      state.reads++;
      body = state.readBody;
      if (state.denyRead) {
        body = { message: "Fixture read denied" };
        status = 503;
      }
      if (state.holdRead)
        await new Promise<void>((resolve) => {
          state.releaseRead = resolve;
        });
    } else if (fn === "redeem_phoenix_pass") {
      state.writes.push(req.postDataJSON());
      body = state.body;
      status = state.status;
      if (state.hold)
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
    }
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
      .catch(() => {});
  });
  return state;
}
const dialog = (page: Page) => page.getByRole("dialog", { name: /Use a Phoenix Pass for/ });
async function show(page: Page, expectDialog = true) {
  await page.getByRole("button", { name: "Unlock this build", exact: true }).click();
  await page.getByRole("button", { name: /Use a Phoenix Pass/ }).click();
  if (expectDialog) await expect(dialog(page)).toBeVisible();
}
async function open(page: Page, expectDialog = true) {
  await page.goto("/mods/fire-phoenix", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true");
  await show(page, expectDialog);
}
async function switchAccount(page: Page, state: { active: string }) {
  state.active = idB;
  await page.evaluate(
    ({ storageKey, session }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
      sessionStorage.setItem(`notif-skipped:${session.user.id}`, "1");
      const channel = new BroadcastChannel(storageKey);
      channel.postMessage({ event: "SIGNED_IN", session });
      channel.close();
    },
    { storageKey, session: sessionFor(idB) },
  );
  await expect(dialog(page)).toHaveCount(0);
}

test("explicit confirmation prevents duplicate redemption and protects the pending modal", async ({
  page,
}) => {
  const state = await fixture(page);
  state.hold = true;
  await open(page);
  expect(
    await dialog(page)
      .locator('[style*="opacity"]')
      .evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            getComputedStyle(node).opacity === "1" && getComputedStyle(node).transform === "none",
        ),
      ),
  ).toBe(true);
  await expect(
    dialog(page).getByRole("heading", { name: "Spend your Phoenix Pass?", exact: true }),
  ).toBeVisible();
  expect(state.writes).toEqual([]);
  await dialog(page)
    .getByRole("button", { name: "Unlock now", exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(dialog(page).getByRole("button", { name: "Close", exact: true })).toBeDisabled();
  await page.keyboard.press("Escape");
  await dialog(page).click({ position: { x: 2, y: 2 } });
  await expect(dialog(page).getByText("Redeeming your pass…", { exact: true })).toBeVisible();
  state.release?.();
  await expect(
    dialog(page).getByRole("link", { name: "Open download link", exact: true }),
  ).toHaveAttribute("href", "https://example.test/fixture-download");
  expect(state.writes).toEqual([{ p_pass_id: passId, p_slug: "fire-phoenix" }]);
});

test("read-only lookup failure has explicit retry without spending a pass", async ({ page }) => {
  const state = await fixture(page);
  state.denyRead = true;
  await open(page);
  await expect(dialog(page).getByRole("alert")).toContainText("couldn’t check");
  expect(state.reads).toBe(1);
  state.denyRead = false;
  await dialog(page).getByRole("button", { name: "Retry pass lookup", exact: true }).click();
  await expect(dialog(page).getByRole("button", { name: "Unlock now", exact: true })).toBeVisible();
  expect(state.reads).toBe(2);
  expect(state.writes).toEqual([]);
});

test("empty pass lookup goes to Rewards without redemption", async ({ page }) => {
  const state = await fixture(page);
  state.readBody = [];
  await open(page, false);
  await expect(page).toHaveURL(/\/rewards$/);
  expect(state.writes).toEqual([]);
});

test("stalled lookup has a deadline and remains read-only", async ({ page }) => {
  const state = await fixture(page);
  state.holdRead = true;
  await open(page);
  await expect(
    dialog(page).getByRole("button", { name: "Retry pass lookup", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  state.releaseRead?.();
  expect(state.writes).toEqual([]);
});

test("uncertain redemption is not replayed when its modal is reopened", async ({ page }) => {
  const state = await fixture(page);
  state.status = 503;
  state.body = { message: "Fixture lost response" };
  await open(page);
  await dialog(page).getByRole("button", { name: "Unlock now", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("may already have been spent");
  await dialog(page).getByLabel("Close", { exact: true }).click();
  await show(page);
  await expect(dialog(page).getByRole("alert")).toContainText("may already have been spent");
  await expect(dialog(page).getByRole("button", { name: "Unlock now", exact: true })).toHaveCount(
    0,
  );
  expect(state.writes).toHaveLength(1);
  expect(state.reads).toBe(1);
});

test("stalled redemption unlocks dismissal after its deadline without replay", async ({ page }) => {
  const state = await fixture(page);
  state.hold = true;
  await open(page);
  await dialog(page).getByRole("button", { name: "Unlock now", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("couldn't confirm", {
    timeout: 15000,
  });
  await expect(dialog(page).getByLabel("Close", { exact: true })).toBeEnabled();
  state.release?.();
  await expect(
    dialog(page).getByRole("link", { name: "Open download link", exact: true }),
  ).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
});

test("late lookup from another account cannot redirect or reveal a pass", async ({ page }) => {
  const state = await fixture(page);
  state.holdRead = true;
  state.readBody = [];
  await open(page);
  await expect.poll(() => state.reads).toBe(1);
  await switchAccount(page, state);
  state.releaseRead?.();
  await page.waitForTimeout(300);
  await expect(page).toHaveURL(/\/mods\/fire-phoenix$/);
  expect(state.writes).toEqual([]);
});

test("late redemption from another account cannot reveal its download", async ({ page }) => {
  const state = await fixture(page);
  state.hold = true;
  await open(page);
  await dialog(page).getByRole("button", { name: "Unlock now", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await switchAccount(page, state);
  state.release?.();
  await page.waitForTimeout(300);
  await expect(page.getByRole("link", { name: "Open download link", exact: true })).toHaveCount(0);
});

test("unsafe and unreadable download payloads never become links", async ({ page }) => {
  const state = await fixture(page);
  state.body = { ok: true, link: "javascript:alert('fixture')", encrypted: false };
  await open(page);
  await dialog(page).getByRole("button", { name: "Unlock now", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("may already have been spent");
  await expect(
    dialog(page).getByRole("link", { name: "Open download link", exact: true }),
  ).toHaveCount(0);
});

test("used pass rejection is explicit and never reports success", async ({ page }) => {
  const state = await fixture(page);
  state.body = { ok: false, error: "invalid_or_used_pass" };
  await open(page);
  await dialog(page).getByRole("button", { name: "Unlock now", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("already been used");
  await expect(
    dialog(page).getByRole("link", { name: "Check Rewards", exact: true }),
  ).toBeVisible();
  await expect(
    dialog(page).getByRole("link", { name: "Open download link", exact: true }),
  ).toHaveCount(0);
});

test("copy denial offers recovery and pass controls fit narrow and wide layouts", async ({
  page,
}, info) => {
  const state = await fixture(page);
  await open(page);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const button = dialog(page).getByRole("button", { name: "Unlock now", exact: true });
    const box = await button.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`pass-confirm-${width}.png`) });
  }
  await dialog(page).getByRole("button", { name: "Unlock now", exact: true }).click();
  await dialog(page).getByRole("button", { name: "Copy link", exact: true }).click();
  await expect(dialog(page).getByRole("status")).toContainText("copy its address");
  expect(state.writes).toHaveLength(1);
});

test("malformed lookup is an error rather than evidence of no pass", async ({ page }) => {
  const state = await fixture(page);
  state.readBody = [null];
  await open(page);
  await expect(
    dialog(page).getByRole("button", { name: "Retry pass lookup", exact: true }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/mods\/fire-phoenix$/);
  expect(state.writes).toEqual([]);
});

test("encrypted downloads are decoded and unreadable ciphertext is held for recovery", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  const ciphertext = await page.evaluate(async (source) => {
    const { Cipher } = await import(/* @vite-ignore */ source);
    return Cipher.encrypt("https://example.test/fixture-encrypted");
  }, "/src/lib/cipher.ts");
  state.body = { ok: true, link: ciphertext, encrypted: true };
  await dialog(page).getByRole("button", { name: "Unlock now", exact: true }).click();
  await expect(
    dialog(page).getByRole("link", { name: "Open download link", exact: true }),
  ).toHaveAttribute("href", "https://example.test/fixture-encrypted");
  state.body = { ok: true, link: "fixture-unreadable-ciphertext", encrypted: true };
  await open(page);
  await dialog(page).getByRole("button", { name: "Unlock now", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("may already have been spent");
  await expect(
    dialog(page).getByRole("link", { name: "Open download link", exact: true }),
  ).toHaveCount(0);
});

test("expiry is rechecked at confirmation before any redemption", async ({ page }) => {
  const state = await fixture(page);
  const now = Date.now();
  state.readBody = [{ id: passId, expires_at: new Date(now + 60_000).toISOString() }];
  await page.clock.install({ time: now });
  await open(page);
  await expect(dialog(page).getByRole("button", { name: "Unlock now", exact: true })).toBeVisible();
  await page.clock.fastForward(120_000);
  await dialog(page).getByRole("button", { name: "Unlock now", exact: true }).click();
  await expect(dialog(page).getByRole("alert")).toContainText("has expired");
  expect(state.writes).toEqual([]);
});
