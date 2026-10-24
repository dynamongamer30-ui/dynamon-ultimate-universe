import { expect, test, type Page } from "@playwright/test";
const storageKey = "sb-dfxcpxzylyycrirtnkof-auth-token";
const idA = "00000000-0000-4000-8000-000000000001",
  idB = "00000000-0000-4000-8000-000000000002";
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
    "Synthetic engagement and XP receipts run on localhost only with Supabase HTTP intercepted.",
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
    },
    { storageKey, session: sessionFor(idA) },
  );
  const state = {
    active: idA,
    xp: 0,
    xpB: 50,
    receipts: [] as { user: string; args: unknown }[],
    events: [] as string[],
    saved: new Set<string>(),
    holdFirst: false,
    release: undefined as (() => void) | undefined,
    denyConfirmation: false,
    bonus: false,
    failFirst: false,
    missingXP: false,
    backfilled: false,
    xpReads: 0,
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      fn = url.pathname.split("/").pop()!,
      who = state.active;
    let body: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") body = sessionFor(who).user;
    else if (fn === "get_my_profile")
      body = [
        {
          id: who,
          username: "fixture",
          display_name: "Fixture Trainer",
          gender: "other",
          avatar_url: null,
          custom_avatar_url: null,
          is_owner: false,
        },
      ];
    else if (fn === "notification_prefs") body = { asked_at: "2026-10-01T00:00:00Z" };
    else if (fn === "user_xp") {
      state.xpReads++;
      const value = who === idA ? state.xp : state.xpB;
      state.events.push(`xp:${value}`);
      body = { xp: value, level: value >= 200 ? 3 : value >= 50 ? 2 : 1 };
      if (state.missingXP || state.backfilled) body = null;
      if (state.denyConfirmation && state.receipts.length) {
        status = 503;
        body = { message: "Fixture confirmation denied" };
      }
    } else if (fn === "user_streaks") body = { current_streak: 4, longest_streak: 4 };
    else if (fn === "touch_streak")
      body = [{ current_streak: 4, longest_streak: 4, incremented: false }];
    else if (fn === "trainer_levels")
      body = [{ level: 1, days_required: 1, reward_kind: "trainer_dg_key", reward_qty: 1 }];
    else if (fn === "my_trainer_progress")
      body = [
        {
          current_level: 0,
          next_level: 1,
          days_required: 1,
          days_elapsed: 4,
          reward_kind: "trainer_dg_key",
          reward_qty: 1,
          claimable: false,
        },
      ];
    else if (fn === "favorites") {
      if (req.method() !== "GET") {
        const row = req.postDataJSON();
        state.saved.add(`${who}:${row.mod_slug}`);
        body = [{ mod_slug: row.mod_slug }];
      } else
        body = [...state.saved]
          .filter((key) => key.startsWith(`${who}:`))
          .map((key) => ({ mod_slug: key.slice(who.length + 1) }));
    } else if (fn === "record_engagement") {
      const number = state.receipts.length + 1;
      state.receipts.push({ user: who, args: req.postDataJSON() });
      state.events.push(`award:${number}`);
      state.xp = state.backfilled ? 0 : state.bonus || number > 1 ? 200 : 50;
      body = [
        { xp: number > 1 ? 200 : 50, level: number > 1 ? 3 : 2, leveled_up: true, awarded: true },
      ];
      if (state.backfilled) body = [{ xp: 0, level: 1, leveled_up: false, awarded: false }];
      if (number === 1 && state.failFirst) {
        status = 503;
        body = { message: "Fixture lost receipt" };
      }
      if (number === 1 && state.holdFirst)
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
async function open(page: Page) {
  await page.goto("/mods", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("banner").getByText("Lv 1", { exact: true })).toHaveCount(1);
}
async function bookmark(page: Page, title: RegExp) {
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: title }) })
    .first();
  await card.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect(card.getByRole("button", { name: "Remove bookmark", exact: true })).toBeVisible();
}
async function achievements(page: Page) {
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("link", { name: /Achievements/ }).click();
}
const level = (page: Page) => page.getByRole("region", { name: "Trainer level", exact: true });

test("two actions queue award confirmation instead of applying reversed responses", async ({
  page,
}) => {
  const state = await fixture(page);
  state.holdFirst = true;
  await open(page);
  await bookmark(page, /Fire Phoenix/);
  await expect.poll(() => !!state.release).toBe(true);
  await bookmark(page, /Thunder Arena/);
  await page.waitForTimeout(300);
  expect(state.receipts).toHaveLength(1);
  state.release?.();
  await expect.poll(() => state.receipts.length).toBe(2);
  await expect(page.getByRole("banner").getByText("Lv 3", { exact: true })).toHaveCount(1);
  expect(state.events).toEqual(["xp:0", "award:1", "xp:50", "award:2", "xp:200"]);
  await achievements(page);
  await expect(level(page).getByText("Lv 3", { exact: true })).toHaveCount(1);
});

test("confirmation includes server badge bonuses after the initial award receipt", async ({
  page,
}) => {
  const state = await fixture(page);
  state.bonus = true;
  await open(page);
  await bookmark(page, /Fire Phoenix/);
  await expect(page.getByText(/Level up — you're now Level 3/)).toBeVisible();
  await expect(page.getByText(/Level up — you're now Level 2/)).toHaveCount(0);
  await achievements(page);
  await expect(level(page).getByText("Lv 3", { exact: true })).toHaveCount(1);
  expect(state.receipts).toHaveLength(1);
  expect(state.xpReads).toBe(2);
});

test("failed XP confirmation has read-only recovery and no replay of the grant", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.denyConfirmation = true;
  await open(page);
  await bookmark(page, /Fire Phoenix/);
  await achievements(page);
  const retry = level(page).getByRole("button", { name: "Retry XP lookup", exact: true });
  await expect(retry).toBeVisible();
  await expect(level(page).getByText("XP unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText(/Level up —/)).toHaveCount(0);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`xp-confirmation-${width}.png`),
      fullPage: true,
    });
  }
  state.denyConfirmation = false;
  await retry.click();
  await expect(level(page).getByText("Lv 2", { exact: true })).toHaveCount(1);
  expect(state.receipts).toHaveLength(1);
  expect(state.xpReads).toBe(3);
});

test("a stalled receipt releases the queue and its late response cannot regress XP", async ({
  page,
}) => {
  const state = await fixture(page);
  state.holdFirst = true;
  await open(page);
  await bookmark(page, /Fire Phoenix/);
  await bookmark(page, /Thunder Arena/);
  await expect.poll(() => state.receipts.length, { timeout: 15000 }).toBe(2);
  await expect(page.getByRole("banner").getByText("Lv 3", { exact: true })).toHaveCount(1);
  state.release?.();
  await page.waitForTimeout(300);
  await expect(page.getByText(/Level up — you're now Level 2/)).toHaveCount(0);
  expect(state.receipts).toHaveLength(2);
  expect(state.xpReads).toBe(2);
});

test("account disposal skips queued old-account grants and hides late confirmation", async ({
  page,
}) => {
  const state = await fixture(page);
  state.holdFirst = true;
  await open(page);
  await bookmark(page, /Fire Phoenix/);
  await bookmark(page, /Thunder Arena/);
  await expect.poll(() => !!state.release).toBe(true);
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
  await expect(page.getByRole("banner").getByText("Lv 2", { exact: true })).toHaveCount(1);
  state.release?.();
  await page.waitForTimeout(300);
  expect(state.receipts.map((row) => row.user)).toEqual([idA]);
  await expect(page.getByText(/Level up —/)).toHaveCount(0);
});

test("a fresh authoritative lookup can accept a lower legitimate total", async ({ page }) => {
  const state = await fixture(page);
  state.bonus = true;
  await open(page);
  await bookmark(page, /Fire Phoenix/);
  await expect(page.getByRole("banner").getByText("Lv 3", { exact: true })).toHaveCount(1);
  await achievements(page);
  state.xp = 50;
  await page.getByRole("button", { name: "Refresh earned badges", exact: true }).click();
  await expect(level(page).getByText("Lv 2", { exact: true })).toHaveCount(1);
  expect(state.receipts).toHaveLength(1);
});

test("a backfilled event with no XP row confirms zero without a false recovery error", async ({
  page,
}) => {
  const state = await fixture(page);
  state.backfilled = true;
  await open(page);
  await bookmark(page, /Fire Phoenix/);
  await expect.poll(() => state.xpReads).toBe(2);
  await achievements(page);
  await expect(level(page).getByText("Lv 1", { exact: true })).toBeVisible();
  await expect(level(page).getByText("0 / 50 XP", { exact: true })).toBeVisible();
  await expect(
    level(page).getByRole("button", { name: "Retry XP lookup", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(/Level up —|\+5 XP/)).toHaveCount(0);
  expect(state.receipts).toHaveLength(1);
});

test("a newly awarded event still requires a real XP row", async ({ page }) => {
  const state = await fixture(page);
  state.missingXP = true;
  await open(page);
  await bookmark(page, /Fire Phoenix/);
  await achievements(page);
  await expect(
    level(page).getByRole("button", { name: "Retry XP lookup", exact: true }),
  ).toBeVisible();
  await expect(level(page).getByText("XP unavailable", { exact: true })).toBeVisible();
  await expect(page.getByText(/Level up —/)).toHaveCount(0);
  expect(state.receipts).toHaveLength(1);
});
