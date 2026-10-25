import { expect, test, type Page } from "@playwright/test";
const storageKey = "sb-dfxcpxzylyycrirtnkof-auth-token";
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
    expires_in: 3 * 86400,
    token_type: "bearer",
  };
}
test.beforeEach(({ page }, info) => {
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Automatic campaign claims use localhost-only synthetic sessions and intercepted Supabase traffic.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});
async function fixture(page: Page, signedIn = true, blockReturnStorage = false) {
  await page.addInitScript(
    ({ storageKey, session, signedIn, blockReturnStorage }) => {
      if (signedIn) {
        localStorage.setItem(storageKey, JSON.stringify(session));
        sessionStorage.setItem(`notif-skipped:${session.user.id}`, "1");
      }
      if (blockReturnStorage) {
        const original = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === "dg_after_auth") throw new Error("Fixture return storage denied");
          return original.call(this, key, value);
        };
      }
    },
    { storageKey, session: sessionFor(idA), signedIn, blockReturnStorage },
  );
  const state = {
    active: idA,
    calls: [] as { user: string; body: unknown }[],
    body: {
      ok: true,
      pass_id: "00000000-0000-4000-8000-000000000003",
      expires_at: new Date(Date.now() + 30 * 86400_000).toISOString(),
      claimed_count: 4,
      max_claims: 100,
    } as unknown,
    status: 200,
    hold: false,
    releases: [] as (() => void)[],
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
    else if (fn === "claim_campaign_pass") {
      state.calls.push({ user: state.active, body: req.postDataJSON() });
      body = state.body;
      status = state.status;
      if (state.hold) await new Promise<void>((resolve) => state.releases.push(resolve));
    }
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(body) })
      .catch(() => {});
  });
  return state;
}
async function open(page: Page) {
  await page.goto("/claim/tesla", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tesla Phoenix Pass", {
    timeout: 15000,
  });
}
async function signInAs(page: Page, id: string, state: { active: string }) {
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

test("authenticated arrival claims once and same-account refresh events cannot replay it", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  await expect(page.getByRole("heading", { name: "Claim successful", exact: true })).toBeVisible();
  expect(
    await page
      .locator('main [style*="opacity"]')
      .evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).opacity === "1")),
  ).toBe(true);
  await expect(page.getByText("4 of 100 claimed", { exact: true })).toBeVisible();
  await signInAs(page, idA, state);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
  });
  await page.waitForTimeout(400);
  expect(state.calls).toEqual([{ user: idA, body: { p_campaign_slug: "tesla" } }]);
});

test("uncertain response has one explicit recovery request despite duplicate clicks", async ({
  page,
}) => {
  const state = await fixture(page);
  state.status = 503;
  state.body = { message: "Fixture lost response" };
  await open(page);
  await expect(page.getByRole("alert")).toContainText("may already have been claimed");
  await page.waitForTimeout(1200);
  expect(state.calls).toHaveLength(1);
  state.status = 200;
  state.body = { ok: false, error: "already_claimed" };
  state.hold = true;
  await page.getByRole("button", { name: "Check claim again", exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect.poll(() => state.calls.length).toBe(2);
  await expect(page.getByRole("button", { name: "Check claim again", exact: true })).toHaveCount(0);
  state.releases[0]?.();
  await expect(page.getByRole("heading", { name: "Already claimed", exact: true })).toBeVisible();
  await expect(page.getByText("Invalid Date", { exact: false })).toHaveCount(0);
  await expect(page.getByText("Tesla Phoenix Pass claimed", { exact: true })).toHaveCount(0);
});

test("stalled claim times out and its late response cannot replace a recovery result", async ({
  page,
}) => {
  const state = await fixture(page);
  state.hold = true;
  await open(page);
  await expect(page.getByRole("heading", { name: "Claim not confirmed", exact: true })).toBeVisible(
    { timeout: 15000 },
  );
  expect(state.calls).toHaveLength(1);
  state.hold = false;
  state.body = { ok: false, error: "already_claimed" };
  await page.getByRole("button", { name: "Check claim again", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Already claimed", exact: true })).toBeVisible();
  state.releases[0]?.();
  await page.waitForTimeout(300);
  await expect(page.getByRole("heading", { name: "Claim successful", exact: true })).toHaveCount(0);
  expect(state.calls).toHaveLength(2);
});

test("account switch discards a late claim and starts the new account's own request", async ({
  page,
}) => {
  const state = await fixture(page);
  state.hold = true;
  await open(page);
  await expect.poll(() => state.calls.length).toBe(1);
  state.hold = false;
  state.body = { ok: false, error: "campaign_inactive" };
  await signInAs(page, idB, state);
  await expect(page.getByRole("alert")).toHaveText("This campaign is not currently available.");
  state.releases[0]?.();
  await page.waitForTimeout(300);
  await expect(page.getByRole("heading", { name: "Claim successful", exact: true })).toHaveCount(0);
  await expect(page.getByText("Tesla Phoenix Pass claimed", { exact: true })).toHaveCount(0);
  expect(state.calls.map((call) => call.user)).toEqual([idA, idB]);
});

test("sign-out clears a settled account result without another claim", async ({ page }) => {
  const state = await fixture(page);
  await open(page);
  await expect(page.getByRole("heading", { name: "Claim successful", exact: true })).toBeVisible();
  await page.evaluate((storageKey) => {
    localStorage.removeItem(storageKey);
    const channel = new BroadcastChannel(storageKey);
    channel.postMessage({ event: "SIGNED_OUT", session: null });
    channel.close();
  }, storageKey);
  await expect(page.getByRole("heading", { name: "Sign in to claim", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Claim successful", exact: true })).toHaveCount(0);
  expect(state.calls).toHaveLength(1);
});

test("malformed success cannot show a claim or invalid dates", async ({ page }) => {
  const state = await fixture(page);
  state.body = { ok: true, expires_at: "not-a-date" };
  await open(page);
  await expect(
    page.getByRole("heading", { name: "Claim not confirmed", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Claim successful", exact: true })).toHaveCount(0);
  await expect(page.getByText("Invalid Date", { exact: false })).toHaveCount(0);
});

test("invalid optional campaign counts are omitted from an acknowledged reward", async ({
  page,
}) => {
  const state = await fixture(page);
  state.body = { ...(state.body as object), claimed_count: 101, max_claims: 100 };
  await open(page);
  await expect(page.getByRole("heading", { name: "Claim successful", exact: true })).toBeVisible();
  await expect(page.getByText(/of .*claimed/)).toHaveCount(0);
});

test("known campaign denials are terminal with a Rewards status link", async ({ page }) => {
  const state = await fixture(page);
  for (const error of ["sold_out", "campaign_inactive", "not_authenticated"]) {
    state.body = { ok: false, error };
    await open(page);
    await expect(
      page.getByRole("heading", { name: "Campaign unavailable", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Check Rewards", exact: true })).toHaveAttribute(
      "href",
      "/rewards",
    );
    await expect(page.getByRole("button", { name: "Check claim again", exact: true })).toHaveCount(
      0,
    );
  }
  expect(state.calls).toHaveLength(3);
});

test("recorded expired claims do not promise an active pass", async ({ page }) => {
  const state = await fixture(page);
  state.body = { ok: false, error: "already_claimed", expires_at: "2020-01-01T00:00:00Z" };
  await open(page);
  await expect(page.getByRole("heading", { name: "Already claimed", exact: true })).toBeVisible();
  await expect(page.getByText(/Recorded expiry/)).toBeVisible();
  await expect(
    page.getByText("Your Tesla Phoenix Pass is now active in your account.", { exact: true }),
  ).toHaveCount(0);
});

test("sign-in handoff returns to the campaign after a synthetic authenticated profile", async ({
  page,
}) => {
  const state = await fixture(page, false);
  await open(page);
  expect(state.calls).toHaveLength(0);
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  expect(await page.evaluate(() => sessionStorage.getItem("dg_after_auth"))).toBe("/claim/tesla");
  await signInAs(page, idA, state);
  await expect(page).toHaveURL((url) => url.pathname === "/claim/tesla");
  await expect(page.getByRole("heading", { name: "Claim successful", exact: true })).toBeVisible();
  expect(state.calls).toHaveLength(1);
});

test("blocked optional return storage still reaches sign-in without claiming", async ({ page }) => {
  const state = await fixture(page, false, true);
  await open(page);
  await page.getByRole("button", { name: "Continue with Google", exact: true }).click();
  await expect(page).toHaveURL(/\/auth$/);
  expect(state.calls).toHaveLength(0);
});

test("recovery layout fits narrow and wide screens with 44-pixel actions", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.body = null;
  await open(page);
  const retry = page.getByRole("button", { name: "Check claim again", exact: true });
  await expect(retry).toBeVisible();
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const target of [retry, page.getByRole("link", { name: "Check Rewards", exact: true })]) {
      const box = await target.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`campaign-recovery-${width}.png`),
      fullPage: true,
    });
  }
  expect(state.calls).toHaveLength(1);
});
