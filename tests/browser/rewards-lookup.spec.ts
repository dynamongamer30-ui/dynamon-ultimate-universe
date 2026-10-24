import { expect, test, type Page } from "@playwright/test";
const key = "sb-dfxcpxzylyycrirtnkof-auth-token";
const idA = "00000000-0000-4000-8000-000000000001";
const idB = "00000000-0000-4000-8000-000000000002";
function sessionFor(id: string) {
  const expires = Math.floor(Date.now() / 1000) + 60 * 86400;
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
    expires_in: 60 * 86400,
    token_type: "bearer",
  };
}

test.beforeEach(({ page }, info) => {
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic rewards and clipboard stubs run only on localhost; all Supabase traffic is intercepted.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});
const fixtureKey = "FIXTURE-ONLY-".repeat(12);
async function fixture(page: Page) {
  await page.addInitScript(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
      sessionStorage.setItem(`notif-skipped:${session.user.id}`, "1");
      const scope = window as unknown as { clipboardMode: string; copiedKeys: string[] };
      scope.clipboardMode = "allow";
      scope.copiedKeys = [];
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async (value: string) => {
            if (scope.clipboardMode === "deny") throw new Error("Fixture clipboard denied");
            scope.copiedKeys.push(value);
          },
        },
      });
    },
    { key, session: sessionFor(idA) },
  );
  const state = {
    active: idA,
    reads: {} as Record<string, number>,
    deny: new Set<string>(),
    hold: new Set<string>(),
    releases: new Map<string, () => void>(),
    mutations: [] as string[],
    claimed: true,
    missingKey: false,
    pass: true,
    keyPresent: true,
    keyExpires: "2027-01-01T00:00:00Z",
    passExpires: "2027-01-01T00:00:00Z",
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      fn = url.pathname.split("/").pop()!;
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = sessionFor(state.active).user;
    else if (url.pathname === "/auth/v1/logout") data = {};
    else if (fn === "get_my_profile")
      data = [
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
    else if (fn === "notification_prefs") data = { asked_at: "2026-10-01T00:00:00Z" };
    else if (["my_daily_key", "my_active_phoenix_pass"].includes(fn)) {
      const who = state.active,
        readKey = `${fn}:${who}`;
      state.reads[readKey] = (state.reads[readKey] ?? 0) + 1;
      data =
        who !== idA || (fn === "my_daily_key" && !state.keyPresent)
          ? []
          : fn === "my_daily_key"
            ? [
                {
                  id: "fixture-reward",
                  key: state.missingKey ? "" : fixtureKey,
                  claimed: state.claimed,
                  expires_at: state.keyExpires,
                },
              ]
            : state.pass
              ? [{ id: "fixture-pass", expires_at: state.passExpires }]
              : [];
      const denied = state.deny.has(readKey);
      if (state.hold.has(readKey))
        await new Promise<void>((resolve) => state.releases.set(readKey, resolve));
      if (denied) {
        status = 503;
        data = { message: "Fixture lookup denied" };
      }
    } else if (/claim_daily_key|consume_phoenix|record_engagement|grant_achievement/.test(fn))
      state.mutations.push(fn);
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  });
  return state;
}
const rewards = (page: Page) => page.getByRole("region", { name: "Your rewards", exact: true });
async function open(page: Page) {
  await page.goto("/rewards", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible({
    timeout: 15000,
  });
}

test("collected rewards stay read-only, long keys fit and clipboard failure has recovery", async ({
  page,
}, info) => {
  const state = await fixture(page);
  await open(page);
  await expect(
    rewards(page).getByRole("heading", { name: "Your Daily Key", exact: true }),
  ).toBeVisible();
  await expect(
    rewards(page).getByText("You have a Phoenix Pass ready!", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim your key", exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    (window as unknown as { clipboardMode: string }).clipboardMode = "deny";
  });
  await rewards(page).getByRole("button", { name: "Copy key", exact: true }).click();
  await expect(
    page.getByText("Could not copy your key. Select the key and copy it manually.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as unknown as { clipboardMode: string }).clipboardMode = "allow";
  });
  await rewards(page).getByRole("button", { name: "Copy key", exact: true }).click();
  await expect(page.getByText("Key copied", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => (window as unknown as { copiedKeys: string[] }).copiedKeys),
  ).toEqual([fixtureKey]);
  for (const [width, height] of [
    [320, 568],
    [600, 900],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await rewards(page).screenshot({ path: info.outputPath("rewards-fixture.png") });
  expect(state.reads).toEqual({ [`my_active_phoenix_pass:${idA}`]: 1, [`my_daily_key:${idA}`]: 1 });
  expect(state.mutations).toEqual([]);
});

for (const fn of ["my_daily_key", "my_active_phoenix_pass"]) {
  test(`failed ${fn} lookup retries only that source and preserves the healthy reward`, async ({
    page,
  }) => {
    const state = await fixture(page);
    state.deny.add(`${fn}:${idA}`);
    await open(page);
    await expect(rewards(page).getByRole("alert")).toBeVisible();
    if (fn === "my_daily_key")
      await expect(
        rewards(page).getByText("You have a Phoenix Pass ready!", { exact: true }),
      ).toBeVisible();
    else
      await expect(
        rewards(page).getByRole("heading", { name: "Your Daily Key", exact: true }),
      ).toBeVisible();
    state.deny.clear();
    await rewards(page).getByRole("button", { name: "Retry reward lookup", exact: true }).click();
    await expect(rewards(page).getByRole("alert")).toHaveCount(0);
    await expect(
      rewards(page).getByRole("heading", { name: "Your Daily Key", exact: true }),
    ).toBeVisible();
    for (const source of ["my_daily_key", "my_active_phoenix_pass"])
      expect(state.reads[`${source}:${idA}`]).toBe(source === fn ? 2 : 1);
    expect(state.mutations).toEqual([]);
  });
}

test("account switching discards the prior key while new lookups are pending", async ({ page }) => {
  const state = await fixture(page);
  await open(page);
  await expect(
    rewards(page).getByRole("heading", { name: "Your Daily Key", exact: true }),
  ).toBeVisible();
  state.active = idB;
  state.hold.add(`my_daily_key:${idB}`);
  await page.evaluate(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
      sessionStorage.setItem(`notif-skipped:${session.user.id}`, "1");
      const channel = new BroadcastChannel(key);
      channel.postMessage({ event: "SIGNED_IN", session });
      channel.close();
    },
    { key, session: sessionFor(idB) },
  );
  await expect.poll(() => state.reads[`my_daily_key:${idB}`]).toBe(1);
  await expect(page.getByText(fixtureKey, { exact: true })).toHaveCount(0);
  await expect(rewards(page).getByRole("status")).toBeVisible();
  state.releases.get(`my_daily_key:${idB}`)?.();
  await expect(rewards(page).getByText(/No active rewards were returned/)).toBeVisible();
  expect(state.mutations).toEqual([]);
});

test("stalled lookups time out and recover without automatic retries", async ({ page }) => {
  const state = await fixture(page);
  state.hold.add(`my_daily_key:${idA}`);
  await page.clock.install();
  await open(page);
  await expect.poll(() => state.reads[`my_daily_key:${idA}`]).toBe(1);
  await page.clock.runFor(11000);
  await expect(rewards(page).getByRole("alert")).toBeVisible();
  expect(state.reads[`my_daily_key:${idA}`]).toBe(1);
  state.hold.clear();
  state.releases.get(`my_daily_key:${idA}`)?.();
  await rewards(page).getByRole("button", { name: "Retry reward lookup", exact: true }).click();
  await expect(
    rewards(page).getByRole("heading", { name: "Your Daily Key", exact: true }),
  ).toBeVisible();
  expect(state.reads[`my_daily_key:${idA}`]).toBe(2);
});

test("uncollected keys point to Notifications and never offer a claim on rewards", async ({
  page,
}) => {
  const state = await fixture(page);
  state.claimed = false;
  await open(page);
  await expect(rewards(page).getByText(/A Daily Key is waiting in Notifications/)).toBeVisible();
  await expect(page.getByText(fixtureKey, { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Claim your key|Copy key/ })).toHaveCount(0);
  expect(state.mutations).toEqual([]);
});

test("a collected key missing its value gives an explicit retry rather than a blank result", async ({
  page,
}) => {
  const state = await fixture(page);
  state.missingKey = true;
  await open(page);
  await expect(rewards(page).getByRole("alert")).toBeVisible();
  state.missingKey = false;
  await rewards(page).getByRole("button", { name: "Retry reward lookup", exact: true }).click();
  await expect(
    rewards(page).getByRole("heading", { name: "Your Daily Key", exact: true }),
  ).toBeVisible();
  expect(state.reads[`my_daily_key:${idA}`]).toBe(2);
});

test("sign-out removes the key and ignores a late pass result", async ({ page }) => {
  const state = await fixture(page);
  state.hold.add(`my_active_phoenix_pass:${idA}`);
  await open(page);
  await expect(
    rewards(page).getByRole("heading", { name: "Your Daily Key", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  state.releases.get(`my_active_phoenix_pass:${idA}`)?.();
  await expect(rewards(page)).toHaveCount(0);
  await expect(page.getByText(fixtureKey, { exact: true })).toHaveCount(0);
  expect(state.mutations).toEqual([]);
});

test("expiry refreshes only the expired source and removes its old private value", async ({
  page,
}) => {
  const state = await fixture(page),
    now = Date.now();
  state.keyExpires = new Date(now + 60_000).toISOString();
  state.passExpires = new Date(now + 120_000).toISOString();
  await page.clock.install({ time: now });
  await open(page);
  await expect(page.getByText(fixtureKey, { exact: true })).toBeVisible();
  state.keyPresent = false;
  await page.clock.fastForward(61_000);
  await expect(page.getByText(fixtureKey, { exact: true })).toHaveCount(0);
  await expect(
    rewards(page).getByText("You have a Phoenix Pass ready!", { exact: true }),
  ).toBeVisible();
  expect(state.reads[`my_daily_key:${idA}`]).toBe(2);
  expect(state.reads[`my_active_phoenix_pass:${idA}`]).toBe(1);
  state.pass = false;
  await page.clock.fastForward(60_000);
  await expect(rewards(page).getByText(/No active rewards were returned/)).toBeVisible();
  expect(state.reads[`my_active_phoenix_pass:${idA}`]).toBe(2);
  expect(state.mutations).toEqual([]);
});

test("an expired server snapshot cannot trigger a refresh loop or stay visible", async ({
  page,
}) => {
  const state = await fixture(page),
    now = Date.now();
  state.keyExpires = new Date(now + 60_000).toISOString();
  await page.clock.install({ time: now });
  await open(page);
  await expect(page.getByText(fixtureKey, { exact: true })).toBeVisible();
  await page.clock.fastForward(61_000);
  await expect(
    rewards(page).getByRole("button", { name: "Retry reward lookup", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(fixtureKey, { exact: true })).toHaveCount(0);
  await page.clock.fastForward(600_000);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(state.reads[`my_daily_key:${idA}`]).toBe(2);
  state.keyPresent = false;
  await rewards(page).getByRole("button", { name: "Retry reward lookup", exact: true }).click();
  await expect(rewards(page).getByRole("alert")).toHaveCount(0);
  expect(state.reads[`my_daily_key:${idA}`]).toBe(3);
});

test("wake after expiry catches up and copying checks the deadline before clipboard access", async ({
  page,
}) => {
  const state = await fixture(page),
    now = Date.now();
  state.keyExpires = new Date(now + 60_000).toISOString();
  await page.clock.install({ time: now });
  await open(page);
  const copy = rewards(page).getByRole("button", { name: "Copy key", exact: true });
  await expect(copy).toBeVisible();
  state.keyPresent = false;
  await page.clock.setSystemTime(now + 70_000);
  await copy.evaluate((element) => (element as HTMLButtonElement).click());
  expect(
    await page.evaluate(() => (window as unknown as { copiedKeys: string[] }).copiedKeys),
  ).toEqual([]);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("focus"));
  });
  await expect(page.getByText(fixtureKey, { exact: true })).toHaveCount(0);
  await expect.poll(() => state.reads[`my_daily_key:${idA}`]).toBe(2);
  expect(state.reads[`my_active_phoenix_pass:${idA}`]).toBe(1);
});

test("account change disposes old reward deadlines", async ({ page }) => {
  const state = await fixture(page),
    now = Date.now();
  state.keyExpires = new Date(now + 60_000).toISOString();
  await page.clock.install({ time: now });
  await open(page);
  await expect(page.getByText(fixtureKey, { exact: true })).toBeVisible();
  state.active = idB;
  await page.evaluate(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
      sessionStorage.setItem(`notif-skipped:${session.user.id}`, "1");
      const channel = new BroadcastChannel(key);
      channel.postMessage({ event: "SIGNED_IN", session });
      channel.close();
    },
    { key, session: sessionFor(idB) },
  );
  await expect(rewards(page).getByText(/No active rewards were returned/)).toBeVisible();
  await page.clock.fastForward(61_000);
  expect(state.reads[`my_daily_key:${idA}`]).toBe(1);
  expect(state.reads[`my_daily_key:${idB}`]).toBe(1);
  expect(state.mutations).toEqual([]);
});

test("invalid expiry is a lookup failure rather than a usable reward", async ({ page }) => {
  const state = await fixture(page);
  state.keyExpires = "fixture-invalid-date";
  await open(page);
  await expect(
    rewards(page).getByRole("button", { name: "Retry reward lookup", exact: true }),
  ).toBeVisible();
  await expect(page.getByText(fixtureKey, { exact: true })).toHaveCount(0);
  state.keyExpires = new Date(Date.now() + 86400_000).toISOString();
  await rewards(page).getByRole("button", { name: "Retry reward lookup", exact: true }).click();
  await expect(page.getByText(fixtureKey, { exact: true })).toBeVisible();
  expect(state.reads[`my_active_phoenix_pass:${idA}`]).toBe(1);
});

test("thirty-day deadlines are chunked without an overflowing immediate timer", async ({
  page,
}) => {
  const state = await fixture(page),
    now = Date.now(),
    duration = 30 * 86400_000;
  state.passExpires = new Date(now + duration).toISOString();
  state.keyExpires = new Date(now + 50 * 86400_000).toISOString();
  await page.clock.install({ time: now });
  await open(page);
  await expect(
    rewards(page).getByText("You have a Phoenix Pass ready!", { exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(2_147_483_647);
  expect(state.reads[`my_active_phoenix_pass:${idA}`]).toBe(1);
  state.pass = false;
  await page.clock.fastForward(duration - 2_147_483_647 + 2);
  await expect(
    rewards(page).getByText("You have a Phoenix Pass ready!", { exact: true }),
  ).toHaveCount(0);
  await expect.poll(() => state.reads[`my_active_phoenix_pass:${idA}`]).toBe(2);
  expect(state.reads[`my_daily_key:${idA}`]).toBe(1);
  expect(state.mutations).toEqual([]);
});
