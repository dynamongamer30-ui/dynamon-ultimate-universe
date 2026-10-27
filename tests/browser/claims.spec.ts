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
    "Synthetic claims require localhost and intercepted Supabase traffic.",
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
            throw new Error("fixture clipboard denied");
          },
        },
      });
    },
    { storageKey, session: sessionFor(idA) },
  );
  const state = {
    active: idA,
    calls: [] as string[],
    body: { ok: true, key: "FIXTURE-KEY" } as unknown,
    status: 200,
    hold: false,
    release: undefined as (() => void) | undefined,
  };
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
  await page.route("**/*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url()),
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
    else if (fn.startsWith("claim_")) {
      state.calls.push(fn);
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
async function open(
  page: Page,
  kind = "daily_key",
  extra = "&ref=00000000-0000-4000-8000-000000000003",
) {
  await page.goto(`/claim?kind=${kind}${extra}`, { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toBeVisible({
    timeout: 15000,
  });
}

test("notification claims require an explicit action and suppress duplicate submissions", async ({
  page,
}) => {
  const state = await fixture(page);
  state.hold = true;
  await open(page);
  expect(state.calls).toEqual([]);
  await page.getByRole("button", { name: "Claim now", exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect.poll(() => state.calls.length).toBe(1);
  await expect(page.getByRole("button", { name: "Claiming" })).toBeDisabled();
  state.release?.();
  await expect(page.getByRole("heading", { name: "Reward claimed", exact: true })).toBeVisible();
  await expect(page.getByText("FIXTURE-KEY", { exact: true })).toBeVisible();
  expect(
    await page.getByText("FIXTURE-KEY", { exact: true }).evaluate((node) => {
      const card = node.closest('[style*="opacity"]');
      return card ? getComputedStyle(card).opacity : "missing";
    }),
  ).toBe("1");
  expect(state.calls).toEqual(["claim_daily_key"]);
});

test("a rejected claim has an honest heading and a status link", async ({ page }) => {
  const state = await fixture(page);
  state.body = { ok: false, error: "invalid_or_expired" };
  await open(page, "phoenix_pass");
  await page.getByRole("button", { name: "Claim now", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("may already be active");
  await expect(page.getByRole("heading", { name: "Claim your reward", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Check Rewards", exact: true })).toHaveAttribute(
    "href",
    "/rewards",
  );
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toHaveCount(0);
});

test("uncertain trainer responses cannot replay the next-level mutation", async ({ page }) => {
  const state = await fixture(page);
  state.status = 503;
  state.body = { message: "Fixture response lost" };
  await open(page, "trainer_level", "");
  await page.getByRole("button", { name: "Claim now", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("may already have been claimed");
  await expect(page.getByRole("button", { name: "Claim now", exact: true })).toHaveCount(0);
  await page.waitForTimeout(1500);
  expect(state.calls).toEqual(["claim_trainer_level"]);
});

test("a stalled claim times out without a success or automatic replay", async ({ page }) => {
  const state = await fixture(page);
  state.hold = true;
  await open(page);
  await page.getByRole("button", { name: "Claim now", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("couldn't confirm", { timeout: 15000 });
  state.release?.();
  await expect(page.getByRole("heading", { name: "Reward claimed", exact: true })).toHaveCount(0);
  expect(state.calls).toHaveLength(1);
});

test("malformed trainer success never displays an empty key", async ({ page }) => {
  const state = await fixture(page);
  state.body = { ok: true, level: 2, reward_kind: "trainer_vip_key", key: "" };
  await open(page, "trainer_level", "");
  await page.getByRole("button", { name: "Claim now", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("couldn't confirm");
  await expect(page.getByRole("button", { name: "Copy reward key", exact: true })).toHaveCount(0);
});

test("Phoenix confirmation displays the returned expiry", async ({ page }) => {
  const state = await fixture(page);
  state.body = { ok: true, expires_at: "2026-12-31T12:00:00Z" };
  await open(page, "phoenix_pass");
  await page.getByRole("button", { name: "Claim now", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Reward claimed", exact: true })).toBeVisible();
  await expect(page.getByText(/Expires .*2026/)).toBeVisible();
  await expect(page.getByText(/Good for 30 days/)).toHaveCount(0);
});

test("account changes discard late private claim responses", async ({ page }) => {
  const state = await fixture(page);
  state.hold = true;
  await open(page);
  await page.getByRole("button", { name: "Claim now", exact: true }).click();
  await expect.poll(() => state.calls.length).toBe(1);
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
  await expect(page.getByRole("button", { name: "Claim now", exact: true })).toBeVisible();
  state.release?.();
  await page.waitForTimeout(300);
  await expect(page.getByText("FIXTURE-KEY", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Claim your reward", exact: true })).toBeVisible();
});

test("long granted keys fit and failed clipboard access has manual recovery", async ({ page }) => {
  await fixture(page);
  const value = "FIXTURE-".repeat(16);
  await open(page, "granted_key", `&ref=${value}&label=Fixture`);
  await expect(page.getByText(value, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Copy reward key", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "copy it manually" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("missing reward identifiers do not send mutations", async ({ page }) => {
  const state = await fixture(page);
  await open(page, "daily_key", "");
  await expect(page.getByText(/Nothing to claim here/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Claim now", exact: true })).toHaveCount(0);
  expect(state.calls).toEqual([]);
});

test("valid Trainer Rank key and pass acknowledgments display their rewards", async ({ page }) => {
  const state = await fixture(page);
  state.body = { ok: true, level: 2, reward_kind: "trainer_vip_key", key: "FIXTURE-VIP" };
  await open(page, "trainer_level", "");
  await page.getByRole("button", { name: "Claim now", exact: true }).click();
  await expect(page.getByText("Trainer Level 2: VIP Key", { exact: true })).toBeVisible();
  await expect(page.getByText("FIXTURE-VIP", { exact: true })).toBeVisible();
  state.body = { ok: true, level: 3, reward_kind: "phoenix_pass", key: null };
  await open(page, "trainer_level", "");
  await page.getByRole("button", { name: "Claim now", exact: true }).click();
  await expect(
    page.getByText("Trainer Level 3: Phoenix Pass claimed", { exact: false }),
  ).toBeVisible();
  await expect(page.getByText(/Check Rewards for your pass expiry/)).toBeVisible();
  expect(state.calls).toEqual(["claim_trainer_level", "claim_trainer_level"]);
});

test("claim key layout fits narrow and wide screens with accessible copy targets", async ({
  page,
}, info) => {
  await fixture(page);
  const value = "FIXTURE-".repeat(16);
  await open(page, "granted_key", `&ref=${value}&label=Fixture`);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const copy = page.getByRole("button", { name: "Copy reward key", exact: true });
    await expect(page.getByText(value, { exact: true })).toBeVisible();
    await expect(copy).toBeVisible();
    const box = await copy.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath(`claim-key-${width}.png`), fullPage: true });
  }
});
