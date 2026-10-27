import { expect, test, type Page } from "@playwright/test";
const storageKey = "sb-dfxcpxzylyycrirtnkof-auth-token";
const idA = "00000000-0000-4000-8000-000000000001",
  idB = "00000000-0000-4000-8000-000000000002";
const catalogRows = [
  {
    key: "fixture_pioneer",
    name: "Fixture pioneer",
    description: "A synthetic badge for local checks.",
    icon: "🏆",
    tier: "bronze",
    xp_reward: 10,
  },
  {
    key: "fixture_explorer",
    name: "Fixture explorer",
    description: "Another synthetic badge.",
    icon: null,
    tier: "gold",
    xp_reward: 20,
  },
];
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
    "Synthetic badge/progression data and engagement writes require localhost and intercepted Supabase traffic.",
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
    catalog: catalogRows as unknown,
    earnedA: [{ achievement_key: "fixture_pioneer" }] as unknown,
    earnedB: [{ achievement_key: "fixture_explorer" }] as unknown,
    reads: {} as Record<string, number>,
    deny: new Set<string>(),
    hold: new Set<string>(),
    releases: new Map<string, () => void>(),
    awards: 0,
    saved: false,
    xp: 0,
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      fn = url.pathname.split("/").pop()!;
    const who = state.active,
      key = fn === "achievements" ? fn : `${fn}:${who}`;
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
    else if (["achievements", "user_achievements", "user_xp", "user_streaks"].includes(fn)) {
      state.reads[key] = (state.reads[key] ?? 0) + 1;
      body =
        fn === "achievements"
          ? state.catalog
          : fn === "user_achievements"
            ? who === idA
              ? state.earnedA
              : state.earnedB
            : fn === "user_xp"
              ? { xp: state.xp, level: state.xp ? 2 : 1 }
              : { current_streak: 4, longest_streak: 4 };
      if (state.deny.has(key)) {
        status = 503;
        body = { message: "Fixture badge source denied" };
      }
      if (state.hold.has(key))
        await new Promise<void>((resolve) => state.releases.set(key, resolve));
    } else if (fn === "touch_streak")
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
      if (req.method() !== "GET") state.saved = true;
      body = state.saved ? [{ mod_slug: "fire-phoenix" }] : [];
    } else if (fn === "record_engagement") {
      state.awards++;
      state.xp = 50;
      state.earnedA = catalogRows.map((row) => ({ achievement_key: row.key }));
      body = [{ xp: 50, level: 2, leveled_up: true, awarded: true }];
    }
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
      .catch(() => {});
  });
  return state;
}
const badges = (page: Page) =>
  page.getByRole("region", { name: "Achievement badges", exact: true });
const pioneer = (page: Page) =>
  badges(page).getByRole("article", { name: "Fixture pioneer", exact: true });
async function open(page: Page, path = "/achievements") {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toBeVisible({
    timeout: 15000,
  });
}
async function goToBadges(page: Page) {
  await page
    .getByRole("button", { name: "Open menu", exact: true })
    .or(page.getByRole("button", { name: "Close menu", exact: true }))
    .click();
  await page.getByRole("link", { name: /Achievements/ }).click();
  await expect(badges(page)).toBeVisible();
}
async function switchAccount(page: Page, state: { active: string }, id: string) {
  state.active = id;
  await page.evaluate(
    ({ storageKey, session }) => {
      localStorage.setItem(storageKey, JSON.stringify(session));
      sessionStorage.setItem(`notif-skipped:${session.user.id}`, "1");
      const channel = new BroadcastChannel(storageKey);
      channel.postMessage({ event: "SIGNED_IN", session });
      channel.close();
    },
    { storageKey, session: sessionFor(id) },
  );
}

test("confirmed badge ownership shares existing reads across auth refresh and focus", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  await expect(pioneer(page).getByText("Earned", { exact: true })).toBeVisible();
  expect(
    await badges(page)
      .locator("article")
      .evaluateAll((cards) =>
        cards.every(
          (card) =>
            getComputedStyle(card).opacity === "1" && getComputedStyle(card).transform === "none",
        ),
      ),
  ).toBe(true);
  await expect(badges(page).getByText("1 / 2 badges earned", { exact: true })).toBeVisible();
  await switchAccount(page, state, idA);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
  });
  await page.waitForTimeout(300);
  expect(state.reads.achievements).toBe(1);
  expect(state.reads[`user_achievements:${idA}`]).toBe(1);
  expect(state.awards).toBe(0);
});

test("private failure keeps catalog neutral and an explicit progress retry restores status", async ({
  page,
}) => {
  const state = await fixture(page);
  state.deny.add(`user_achievements:${idA}`);
  await open(page);
  await expect(
    badges(page).getByRole("button", { name: "Retry earned badges", exact: true }),
  ).toBeVisible();
  await expect(badges(page).getByText("Status unavailable", { exact: true })).toHaveCount(2);
  await expect(badges(page).getByText("Not earned yet", { exact: true })).toHaveCount(0);
  await expect(badges(page).getByLabel("Not earned", { exact: true })).toHaveCount(0);
  await expect(badges(page).getByText(/badges earned$/)).toHaveCount(0);
  state.deny.clear();
  await badges(page).getByRole("button", { name: "Retry earned badges", exact: true }).click();
  await expect(pioneer(page).getByText("Earned", { exact: true })).toBeVisible();
  expect(state.reads.achievements).toBe(1);
  expect(state.reads[`user_achievements:${idA}`]).toBe(2);
});

test("catalog failure never fabricates a zero denominator and retries only catalog", async ({
  page,
}) => {
  const state = await fixture(page);
  state.deny.add("achievements");
  await open(page);
  await expect(
    badges(page).getByRole("button", { name: "Retry achievement catalog", exact: true }),
  ).toBeVisible();
  await expect(badges(page).getByText(/badges earned$/)).toHaveCount(0);
  state.deny.clear();
  await badges(page)
    .getByRole("button", { name: "Retry achievement catalog", exact: true })
    .click();
  await expect(badges(page).getByText("1 / 2 badges earned", { exact: true })).toBeVisible();
  expect(state.reads.achievements).toBe(2);
  expect(state.reads[`user_achievements:${idA}`]).toBe(1);
});

test("pending private data cannot imply an unearned badge", async ({ page }) => {
  const state = await fixture(page),
    key = `user_achievements:${idA}`;
  state.hold.add(key);
  await open(page);
  await expect(pioneer(page)).toBeVisible();
  await expect(badges(page).getByText("Checking…", { exact: true })).toHaveCount(2);
  await expect(badges(page).getByText("Not earned yet", { exact: true })).toHaveCount(0);
  await expect.poll(() => state.releases.has(key)).toBe(true);
  state.releases.get(key)?.();
  await expect(pioneer(page).getByText("Earned", { exact: true })).toBeVisible();
});

test("late ownership from the previous account cannot change current badges", async ({ page }) => {
  const state = await fixture(page),
    key = `user_achievements:${idA}`;
  state.hold.add(key);
  await open(page);
  await expect(pioneer(page)).toBeVisible();
  await expect.poll(() => state.releases.has(key)).toBe(true);
  await switchAccount(page, state, idB);
  await expect(pioneer(page).getByText("Not earned yet", { exact: true })).toBeVisible();
  state.releases.get(key)?.();
  await page.waitForTimeout(300);
  await expect(pioneer(page).getByText("Earned", { exact: true })).toHaveCount(0);
  await expect(
    badges(page)
      .getByRole("article", { name: "Fixture explorer", exact: true })
      .getByText("Earned", { exact: true }),
  ).toBeVisible();
  expect(state.reads.achievements).toBe(1);
});

test("malformed earned rows stay unknown until a confirmed empty response", async ({ page }) => {
  const state = await fixture(page);
  state.earnedA = [{ achievement_key: "" }];
  await open(page);
  await expect(
    badges(page).getByRole("button", { name: "Retry earned badges", exact: true }),
  ).toBeVisible();
  state.earnedA = [];
  await badges(page).getByRole("button", { name: "Retry earned badges", exact: true }).click();
  await expect(badges(page).getByText("0 / 2 badges earned", { exact: true })).toBeVisible();
  await expect(badges(page).getByText("Not earned yet", { exact: true })).toHaveCount(2);
});

test("duplicate and obsolete earned keys cannot inflate the visible count", async ({ page }) => {
  const state = await fixture(page);
  state.earnedA = [
    { achievement_key: "fixture_pioneer" },
    { achievement_key: "fixture_pioneer" },
    { achievement_key: "retired_fixture" },
  ];
  await open(page);
  await expect(badges(page).getByText("1 / 2 badges earned", { exact: true })).toBeVisible();
});

test("XP read failure does not conceal independently confirmed badge ownership", async ({
  page,
}) => {
  const state = await fixture(page);
  state.deny.add(`user_xp:${idA}`);
  await open(page);
  await expect(pioneer(page).getByText("Earned", { exact: true })).toBeVisible();
  await expect(badges(page).getByText("1 / 2 badges earned", { exact: true })).toBeVisible();
  await expect(
    badges(page).getByRole("button", { name: "Retry earned badges", exact: true }),
  ).toHaveCount(0);
});

test("empty and malformed catalogs have separate recoverable states", async ({ page }) => {
  const state = await fixture(page);
  state.catalog = [];
  await open(page);
  await expect(
    badges(page).getByText("No achievement badges are configured yet.", { exact: true }),
  ).toBeVisible();
  for (const invalid of [
    [catalogRows[0], catalogRows[0]],
    [{ ...catalogRows[0], xp_reward: -1 }],
  ]) {
    state.catalog = invalid;
    await open(page);
    await expect(
      badges(page).getByRole("button", { name: "Retry achievement catalog", exact: true }),
    ).toBeVisible();
    await expect(badges(page).getByText(/badges earned$/)).toHaveCount(0);
  }
});

test("catalog timeout recovers without accepting its earlier response", async ({ page }) => {
  const state = await fixture(page);
  state.hold.add("achievements");
  await open(page);
  await expect(
    badges(page).getByRole("button", { name: "Retry achievement catalog", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  state.hold.clear();
  await badges(page)
    .getByRole("button", { name: "Retry achievement catalog", exact: true })
    .click();
  await expect(badges(page).getByText("1 / 2 badges earned", { exact: true })).toBeVisible();
  state.releases.get("achievements")?.();
  expect(state.reads[`user_achievements:${idA}`]).toBe(1);
});

test("a confirmed engagement makes badges stale and an older lookup cannot clear it", async ({
  page,
}) => {
  const state = await fixture(page),
    key = `user_achievements:${idA}`;
  state.hold.add(key);
  await open(page, "/mods");
  await expect.poll(() => state.releases.has(key)).toBe(true);
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: /Fire Phoenix/ }) })
    .first();
  await card.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect.poll(() => state.awards).toBe(1);
  await expect(page.getByText(/Level up — you're now Level 2/)).toBeVisible();
  state.hold.clear();
  state.releases.get(key)?.();
  await goToBadges(page);
  await expect(
    badges(page).getByRole("button", { name: "Refresh earned badges", exact: true }),
  ).toBeVisible();
  await expect(badges(page).getByText("Refresh needed", { exact: true })).toHaveCount(2);
  expect(state.reads[key]).toBe(1);
  state.deny.add(key);
  await badges(page).getByRole("button", { name: "Refresh earned badges", exact: true }).click();
  await expect(
    badges(page).getByRole("button", { name: "Retry earned badges", exact: true }),
  ).toBeVisible();
  await expect(badges(page).getByText(/badges earned$/)).toHaveCount(0);
  state.deny.clear();
  await badges(page).getByRole("button", { name: "Retry earned badges", exact: true }).click();
  await expect(badges(page).getByText("2 / 2 badges earned", { exact: true })).toBeVisible();
  expect(state.awards).toBe(1);
  expect(state.reads[key]).toBe(3);
});

test("unknown badge layout and retry controls fit narrow and wide screens", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.deny.add(`user_achievements:${idA}`);
  state.catalog = [
    {
      ...catalogRows[0],
      name: "FIXTURE".repeat(8),
      description: "FIXTURE-DESCRIPTION-".repeat(8),
      tier: "fixture".repeat(8),
    },
  ];
  await open(page);
  const retry = badges(page).getByRole("button", { name: "Retry earned badges", exact: true });
  await expect(retry).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`badges-unknown-${width}.png`), fullPage: true });
  }
});
