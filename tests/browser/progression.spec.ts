import { expect, test, type Page } from "@playwright/test";
const key = "sb-dfxcpxzylyycrirtnkof-auth-token";
const idA = "00000000-0000-4000-8000-000000000001";
const idB = "00000000-0000-4000-8000-000000000002";
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
    expires_in: 3600,
    token_type: "bearer",
  };
}

test.beforeEach(({ page }, info) => {
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic progression RPCs run on localhost only with all Supabase traffic intercepted.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});
async function fixture(page: Page, legacy = false) {
  await page.addInitScript(
    ({ key, session, legacy }) => {
      localStorage.setItem(key, JSON.stringify(session));
      sessionStorage.setItem(`notif-skipped:${session.user.id}`, "1");
      if (legacy)
        sessionStorage.setItem(
          `streak-checkin:${session.user.id}:${new Date().toISOString().slice(0, 10)}`,
          "1",
        );
    },
    { key, session: sessionFor(idA), legacy },
  );
  const state = {
    active: idA,
    checkIns: 0,
    awards: 0,
    denyCheckIn: false,
    emptyCheckIn: false,
    holdCheckIn: false,
    releaseCheckIn: undefined as (() => void) | undefined,
    holdAward: false,
    releaseAward: undefined as (() => void) | undefined,
    hold: new Set<string>(),
    deny: new Set<string>(),
    releases: new Map<string, () => void>(),
    reads: {} as Record<string, number>,
    saved: false,
    xpA: 0,
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
    else if (["user_xp", "user_streaks", "user_achievements"].includes(fn)) {
      const uid = url.searchParams.get("user_id")?.replace(/^eq\./, ""),
        k = `${fn}:${uid}`;
      state.reads[k] = (state.reads[k] ?? 0) + 1;
      data =
        fn === "user_xp"
          ? { xp: uid === idA ? state.xpA : 50, level: uid === idA ? (state.xpA ? 3 : 1) : 2 }
          : fn === "user_streaks"
            ? { current_streak: 1, longest_streak: 1 }
            : [];
      if (state.hold.has(k)) {
        state.hold.delete(k);
        await new Promise<void>((resolve) => state.releases.set(k, resolve));
      }
      if (state.deny.has(k)) {
        status = 503;
        data = { message: "Fixture read denied" };
      }
    } else if (fn === "touch_streak") {
      state.checkIns++;
      const who = state.active,
        denied = state.denyCheckIn,
        empty = state.emptyCheckIn;
      if (state.holdCheckIn)
        await new Promise<void>((resolve) => {
          state.releaseCheckIn = resolve;
        });
      if (denied) {
        status = 503;
        data = { message: "Fixture check-in denied" };
      } else
        data = empty
          ? []
          : [
              {
                current_streak: who === idA ? 4 : 2,
                longest_streak: who === idA ? 9 : 2,
                incremented: false,
              },
            ];
    } else if (fn === "record_engagement") {
      state.awards++;
      state.xpA = 200;
      if (state.holdAward)
        await new Promise<void>((resolve) => {
          state.releaseAward = resolve;
        });
      data = [{ xp: 200, level: 3, leveled_up: true, awarded: true }];
    } else if (fn === "favorites") {
      if (req.method() === "GET") data = state.saved ? [{ mod_slug: "fire-phoenix" }] : [];
      else {
        state.saved = true;
        data = [{ mod_slug: "fire-phoenix" }];
      }
    }
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  });
  return state;
}
const streak = (page: Page) => page.getByRole("region", { name: "Daily streak", exact: true });
const level = (page: Page) => page.getByRole("region", { name: "Trainer level", exact: true });
async function open(page: Page, path = "/achievements") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toBeVisible({
    timeout: 15000,
  });
}
async function marker(page: Page) {
  return page.evaluate(
    (id) => sessionStorage.getItem(`streak-checkin:${id}:${new Date().toISOString().slice(0, 10)}`),
    idA,
  );
}
async function switchToB(page: Page, state: { active: string }) {
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
}

test("a failed check-in stays unconfirmed and an explicit retry has one in-flight request", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.denyCheckIn = true;
  await open(page);
  await expect(streak(page).getByRole("alert")).toContainText("not confirmed");
  expect(await marker(page)).toBeNull();
  expect(state.checkIns).toBe(1);
  for (const [width, height] of [
    [320, 568],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await streak(page)
        .getByRole("button", { name: "Retry daily check-in", exact: true })
        .evaluate((node) => {
          const box = node.getBoundingClientRect();
          return box.width >= 44 && box.height >= 44;
        }),
    ).toBe(true);
    if (width === 320)
      await streak(page).screenshot({ path: info.outputPath("check-in-retry-320.png") });
  }
  state.denyCheckIn = false;
  state.holdCheckIn = true;
  await streak(page).getByRole("button", { name: "Retry daily check-in", exact: true }).dblclick();
  await expect.poll(() => state.checkIns).toBe(2);
  await expect(streak(page).getByRole("status")).toContainText("Confirming daily check-in");
  expect(await marker(page)).toBeNull();
  state.releaseCheckIn?.();
  await expect(streak(page).getByText("4 days", { exact: true })).toBeVisible();
  await expect.poll(() => marker(page)).toBe("confirmed");
  expect(state.checkIns).toBe(2);
});

test("an empty response cannot mark a daily check-in complete", async ({ page }) => {
  const state = await fixture(page);
  state.emptyCheckIn = true;
  await open(page);
  await expect(streak(page).getByRole("alert")).toBeVisible();
  expect(await marker(page)).toBeNull();
  state.emptyCheckIn = false;
  await streak(page).getByRole("button", { name: "Retry daily check-in", exact: true }).click();
  await expect.poll(() => marker(page)).toBe("confirmed");
});

test("a legacy attempt marker is rechecked and only replaced after acknowledgment", async ({
  page,
}) => {
  const state = await fixture(page, true);
  state.holdCheckIn = true;
  await open(page);
  await expect.poll(() => state.checkIns).toBe(1);
  expect(await marker(page)).toBe("1");
  state.releaseCheckIn?.();
  await expect.poll(() => marker(page)).toBe("confirmed");
});

test("late initial reads cannot replace a just-confirmed streak", async ({ page }) => {
  const state = await fixture(page);
  state.hold.add(`user_streaks:${idA}`);
  await open(page);
  await expect(streak(page).getByText("4 days", { exact: true })).toBeVisible();
  state.releases.get(`user_streaks:${idA}`)?.();
  await expect(streak(page).getByText("Loading your progress…", { exact: true })).toHaveCount(0);
  await expect(streak(page).getByText("4 days", { exact: true })).toBeVisible();
});

test("switching accounts discards held progression reads from the prior account", async ({
  page,
}) => {
  const state = await fixture(page);
  state.hold.add(`user_xp:${idA}`);
  await open(page);
  await expect.poll(() => !!state.releases.get(`user_xp:${idA}`)).toBe(true);
  await switchToB(page, state);
  await expect(level(page).getByText("Lv 2", { exact: true })).toBeVisible();
  state.releases.get(`user_xp:${idA}`)?.();
  await expect(level(page).getByText("Lv 2", { exact: true })).toBeVisible();
  await expect(streak(page).getByText("2 days", { exact: true })).toBeVisible();
});

test("a late award cannot change the next account or show a level-up toast", async ({ page }) => {
  const state = await fixture(page);
  state.holdAward = true;
  await open(page, "/mods");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: /Fire Phoenix/ }) })
    .first();
  await card.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect.poll(() => !!state.releaseAward).toBe(true);
  await switchToB(page, state);
  state.releaseAward?.();
  await page
    .getByRole("button", { name: "Open menu", exact: true })
    .or(page.getByRole("button", { name: "Close menu", exact: true }))
    .click();
  await page.getByRole("link", { name: /Achievements/ }).click();
  await expect(level(page).getByText("Lv 2", { exact: true })).toBeVisible();
  await expect(page.getByText(/Level up — you're now Level 3/)).toHaveCount(0);
});

test("a confirmed award is not replaced by an older XP lookup", async ({ page }) => {
  const state = await fixture(page);
  state.hold.add(`user_xp:${idA}`);
  await open(page, "/mods");
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: /Fire Phoenix/ }) })
    .first();
  await card.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect.poll(() => state.awards).toBe(1);
  await expect(page.getByText(/Level up — you're now Level 3/)).toBeVisible();
  state.releases.get(`user_xp:${idA}`)?.();
  await page
    .getByRole("button", { name: "Open menu", exact: true })
    .or(page.getByRole("button", { name: "Close menu", exact: true }))
    .click();
  await page.getByRole("link", { name: /Achievements/ }).click();
  await expect(level(page).getByText("Lv 3", { exact: true })).toBeVisible();
});

test("the next UTC day gets one new check-in without a polling loop", async ({ page }) => {
  const state = await fixture(page);
  await page.clock.install({ time: new Date("2026-10-24T23:50:00Z") });
  await open(page);
  await expect.poll(() => marker(page)).toBe("confirmed");
  expect(state.checkIns).toBe(1);
  const remaining = await page.evaluate(() => {
    const now = new Date();
    return (
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1) - now.getTime() + 1000
    );
  });
  await page.clock.fastForward(remaining);
  await expect.poll(() => state.checkIns).toBe(2);
  await expect.poll(() => marker(page)).toBe("confirmed");
});

test("a stalled check-in times out, leaves no completion marker and retries explicitly", async ({
  page,
}) => {
  const state = await fixture(page);
  state.holdCheckIn = true;
  await page.clock.install();
  await open(page);
  await expect.poll(() => state.checkIns).toBe(1);
  await page.clock.runFor(11000);
  await expect(streak(page).getByRole("alert")).toBeVisible();
  expect(await marker(page)).toBeNull();
  state.holdCheckIn = false;
  state.releaseCheckIn?.();
  await streak(page).getByRole("button", { name: "Retry daily check-in", exact: true }).click();
  await expect.poll(() => marker(page)).toBe("confirmed");
  expect(state.checkIns).toBe(2);
});

test("failed progression reads have an explicit bounded retry", async ({ page }) => {
  const state = await fixture(page);
  state.deny.add(`user_xp:${idA}`);
  await open(page);
  await expect(level(page).getByRole("alert")).toBeVisible();
  expect(state.reads[`user_xp:${idA}`]).toBe(1);
  state.deny.clear();
  await streak(page).getByRole("button", { name: "Retry progress lookup", exact: true }).click();
  await expect(level(page).getByRole("alert")).toHaveCount(0);
  expect(state.reads[`user_xp:${idA}`]).toBe(2);
});
