import { expect, test, type Page } from "@playwright/test";
const storageKey = "sb-dfxcpxzylyycrirtnkof-auth-token";
const idA = "00000000-0000-4000-8000-000000000001",
  idB = "00000000-0000-4000-8000-000000000002";
const levels = [
  { level: 1, days_required: 1, reward_kind: "trainer_dg_key", reward_qty: 1 },
  { level: 2, days_required: 2, reward_kind: "phoenix_pass", reward_qty: 1 },
  { level: 3, days_required: 3, reward_kind: "trainer_vip_key", reward_qty: 1 },
];
const initialProgress = {
  current_level: 1,
  next_level: 2,
  days_required: 2,
  days_elapsed: 4,
  reward_kind: "phoenix_pass",
  reward_qty: 1,
  claimable: true,
};
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
    "Synthetic Trainer Rank progress/check-in requests require localhost with all Supabase HTTP intercepted.",
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
    catalog: levels as unknown,
    progress: [initialProgress] as unknown,
    own: { current_level: 3 } as unknown,
    reads: {} as Record<string, number>,
    ownFilters: [] as string[],
    deny: new Set<string>(),
    hold: new Set<string>(),
    releases: new Map<string, () => void>(),
    mutations: [] as string[],
    checkInDeny: false,
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
    else if (fn === "user_xp") body = { xp: 0, level: 1 };
    else if (fn === "user_streaks") body = { current_streak: 4, longest_streak: 4 };
    else if (fn === "touch_streak") {
      body = [{ current_streak: 4, longest_streak: 4, incremented: false }];
      if (state.checkInDeny) {
        body = { message: "Fixture check-in denied" };
        status = 503;
      }
      if (state.hold.has(fn)) await new Promise<void>((resolve) => state.releases.set(fn, resolve));
    } else if (["trainer_levels", "my_trainer_progress", "user_trainer_progress"].includes(fn)) {
      const key = fn === "trainer_levels" ? fn : `${fn}:${state.active}`;
      state.reads[key] = (state.reads[key] ?? 0) + 1;
      body =
        fn === "trainer_levels"
          ? state.catalog
          : fn === "user_trainer_progress"
            ? state.own
            : state.active === idA
              ? state.progress
              : [
                  {
                    ...initialProgress,
                    current_level: 0,
                    next_level: 1,
                    days_required: 1,
                    days_elapsed: 0,
                    reward_kind: "trainer_dg_key",
                    claimable: false,
                  },
                ];
      if (fn === "user_trainer_progress")
        state.ownFilters.push(url.searchParams.get("user_id") || "");
      if (state.deny.has(fn)) {
        status = 503;
        body = { message: "Fixture rank source denied" };
      }
      if (state.hold.has(fn))
        await new Promise<void>((resolve) => state.releases.set(key, resolve));
    } else if (/^(claim_|redeem_|record_engagement)/.test(fn)) state.mutations.push(fn);
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
      .catch(() => {});
  });
  return state;
}
const rank = (page: Page) => page.getByRole("region", { name: "Trainer Rank", exact: true });
const claim = (page: Page) => rank(page).getByRole("link", { name: /Claim Trainer Level/ });
async function open(page: Page) {
  await page.goto("/achievements", { waitUntil: "domcontentloaded" });
  await expect(rank(page)).toBeVisible({ timeout: 15000 });
}
async function sameOrNewAccount(page: Page, state: { active: string }, id: string) {
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

test("confirmed rank renders once across same-account auth refresh and never awards", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  await expect(
    rank(page).getByText("Current Trainer Rank: Level 1", { exact: true }),
  ).toBeVisible();
  await expect(claim(page)).toHaveAttribute("href", /kind=trainer_level/);
  expect(
    await rank(page)
      .locator('[style*="opacity"]')
      .evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).opacity === "1")),
  ).toBe(true);
  await expect(rank(page).getByText("Claimed", { exact: true })).toHaveCount(1);
  await sameOrNewAccount(page, state, idA);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
  });
  await page.waitForTimeout(300);
  expect(state.reads.trainer_levels).toBe(1);
  expect(state.reads[`my_trainer_progress:${idA}`]).toBe(1);
  expect(state.mutations).toEqual([]);
});

test("failed private progress retains catalog without inventing claim status and retries only progress", async ({
  page,
}) => {
  const state = await fixture(page);
  state.deny.add("my_trainer_progress");
  await open(page);
  await expect(
    rank(page).getByRole("button", { name: "Retry rank lookup", exact: true }),
  ).toBeVisible();
  await expect(rank(page).getByText("Level 3", { exact: true })).toBeVisible();
  await expect(claim(page)).toHaveCount(0);
  await expect(rank(page).getByText("Claimed", { exact: true })).toHaveCount(0);
  state.deny.clear();
  await rank(page).getByRole("button", { name: "Retry rank lookup", exact: true }).click();
  await expect(claim(page)).toBeVisible();
  expect(state.reads.trainer_levels).toBe(1);
  expect(state.reads[`my_trainer_progress:${idA}`]).toBe(2);
});

test("failed catalog retains proven current rank and retries only rewards", async ({ page }) => {
  const state = await fixture(page);
  state.deny.add("trainer_levels");
  await open(page);
  await expect(
    rank(page).getByText("Current Trainer Rank: Level 1", { exact: true }),
  ).toBeVisible();
  await expect(claim(page)).toHaveCount(0);
  state.deny.clear();
  await rank(page).getByRole("button", { name: "Retry rank rewards", exact: true }).click();
  await expect(claim(page)).toBeVisible();
  expect(state.reads.trainer_levels).toBe(2);
  expect(state.reads[`my_trainer_progress:${idA}`]).toBe(1);
});

test("empty catalog is an explicit configuration state rather than endless skeletons", async ({
  page,
}) => {
  const state = await fixture(page);
  state.catalog = [];
  await open(page);
  await expect(
    rank(page).getByText("Trainer Rank rewards are not configured yet.", { exact: true }),
  ).toBeVisible();
  await expect(rank(page).getByLabel("Loading rank rewards", { exact: true })).toHaveCount(0);
  await expect(claim(page)).toHaveCount(0);
});

test("malformed progress is recoverable and cannot show claim links", async ({ page }) => {
  const state = await fixture(page);
  state.progress = [{ ...initialProgress, current_level: "1" }];
  await open(page);
  await expect(
    rank(page).getByRole("button", { name: "Retry rank lookup", exact: true }),
  ).toBeVisible();
  await expect(claim(page)).toHaveCount(0);
  state.progress = [initialProgress];
  await rank(page).getByRole("button", { name: "Retry rank lookup", exact: true }).click();
  await expect(claim(page)).toBeVisible();
});

test("empty RPC confirms final-rank completion through an own-row lookup", async ({ page }) => {
  const state = await fixture(page);
  state.progress = [];
  await open(page);
  await expect(
    rank(page).getByText("All configured Trainer Rank rewards claimed.", { exact: true }),
  ).toBeVisible();
  await expect(rank(page).getByText("Claimed", { exact: true })).toHaveCount(3);
  await expect(claim(page)).toHaveCount(0);
  expect(state.ownFilters).toEqual([`eq.${idA}`]);
  expect(state.mutations).toEqual([]);
});

test("missing completion proof is an error and can be retried", async ({ page }) => {
  const state = await fixture(page);
  state.progress = [];
  state.own = null;
  await open(page);
  await expect(
    rank(page).getByRole("button", { name: "Retry rank lookup", exact: true }),
  ).toBeVisible();
  await expect(rank(page).getByText("Claimed", { exact: true })).toHaveCount(0);
  state.own = { current_level: 3 };
  await rank(page).getByRole("button", { name: "Retry rank lookup", exact: true }).click();
  await expect(
    rank(page).getByText("All configured Trainer Rank rewards claimed.", { exact: true }),
  ).toBeVisible();
});

test("catalog and progress mismatch never labels an incomplete ladder complete", async ({
  page,
}) => {
  const state = await fixture(page);
  state.progress = [];
  state.own = { current_level: 2 };
  await open(page);
  await expect(
    rank(page).getByRole("button", { name: "Refresh Trainer Rank", exact: true }),
  ).toBeVisible();
  await expect(claim(page)).toHaveCount(0);
  await expect(rank(page).getByText("Claimed", { exact: true })).toHaveCount(0);
  state.own = { current_level: 3 };
  await rank(page).getByRole("button", { name: "Refresh Trainer Rank", exact: true }).click();
  await expect(
    rank(page).getByText("All configured Trainer Rank rewards claimed.", { exact: true }),
  ).toBeVisible();
});

test("late prior-account progress cannot replace the new rank and public catalog is shared", async ({
  page,
}) => {
  const state = await fixture(page);
  state.hold.add("my_trainer_progress");
  await open(page);
  await expect.poll(() => state.reads[`my_trainer_progress:${idA}`]).toBe(1);
  state.hold.clear();
  await sameOrNewAccount(page, state, idB);
  await expect(
    rank(page).getByText("Current Trainer Rank: Level 0", { exact: true }),
  ).toBeVisible();
  state.releases.get(`my_trainer_progress:${idA}`)?.();
  await page.waitForTimeout(300);
  await expect(rank(page).getByText("Current Trainer Rank: Level 1", { exact: true })).toHaveCount(
    0,
  );
  await expect(claim(page)).toHaveCount(0);
  expect(state.reads.trainer_levels).toBe(1);
});

test("progress deadline recovers without accepting the earlier response", async ({ page }) => {
  const state = await fixture(page);
  state.hold.add("my_trainer_progress");
  await open(page);
  await expect(
    rank(page).getByRole("button", { name: "Retry rank lookup", exact: true }),
  ).toBeVisible({ timeout: 15000 });
  state.hold.clear();
  state.progress = [{ ...initialProgress, claimable: false }];
  await rank(page).getByRole("button", { name: "Retry rank lookup", exact: true }).click();
  await expect(
    rank(page).getByText("Current Trainer Rank: Level 1", { exact: true }),
  ).toBeVisible();
  state.releases.get(`my_trainer_progress:${idA}`)?.();
  await page.waitForTimeout(300);
  await expect(claim(page)).toHaveCount(0);
  expect(state.reads.trainer_levels).toBe(1);
});

test("rank waits for check-in and refreshes eligibility after check-in recovery", async ({
  page,
}) => {
  const state = await fixture(page);
  state.checkInDeny = true;
  state.progress = [{ ...initialProgress, claimable: false, days_elapsed: 0 }];
  await open(page);
  await expect(
    rank(page).getByText("Current Trainer Rank: Level 1", { exact: true }),
  ).toBeVisible();
  await expect(claim(page)).toHaveCount(0);
  state.checkInDeny = false;
  state.progress = [initialProgress];
  await page.getByRole("button", { name: "Retry daily check-in", exact: true }).click();
  await expect(claim(page)).toBeVisible();
  expect(state.reads[`my_trainer_progress:${idA}`]).toBe(2);
  expect(state.reads.trainer_levels).toBe(1);
});

test("pending check-in does not start a rank RPC and rank controls fit narrow layouts", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.hold.add("touch_streak");
  await open(page);
  await expect(
    rank(page).getByRole("status").filter({ hasText: "Waiting for daily check-in" }),
  ).toBeVisible();
  expect(state.reads[`my_trainer_progress:${idA}`] ?? 0).toBe(0);
  await expect.poll(() => state.releases.has("touch_streak")).toBe(true);
  state.releases.get("touch_streak")?.();
  await expect(claim(page)).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const box = await claim(page).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await page
        .getByRole("heading", { level: 1 })
        .evaluate((element) => element.scrollWidth <= element.clientWidth),
    ).toBe(true);
    await page.screenshot({ path: info.outputPath(`trainer-rank-${width}.png`), fullPage: true });
  }
  expect(state.mutations).toEqual([]);
});

test("returning from the claim page reloads current rank rather than cached eligibility", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  await expect(claim(page)).toBeVisible();
  await claim(page).click();
  await expect(page.getByRole("heading", { name: "Claim your reward", exact: true })).toBeVisible();
  state.progress = [
    {
      ...initialProgress,
      current_level: 2,
      next_level: 3,
      days_required: 3,
      reward_kind: "trainer_vip_key",
    },
  ];
  await page.goBack();
  await expect(
    rank(page).getByText("Current Trainer Rank: Level 2", { exact: true }),
  ).toBeVisible();
  await expect(claim(page)).toHaveAccessibleName("Claim Trainer Level 3");
  expect(state.reads[`my_trainer_progress:${idA}`]).toBe(2);
  expect(state.reads.trainer_levels).toBe(1);
  expect(state.mutations).toEqual([]);
});
