import { expect, test, type Page } from "@playwright/test";

test.beforeEach(({ page }, info) => {
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic account writes are localhost-only and all Supabase traffic is intercepted.",
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
      sessionStorage.setItem(`notif-skipped:${user.id}`, "1");
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
    saved: [] as string[],
    reads: 0,
    writes: [] as { method: string; slug: string }[],
    awards: 0,
    denyRead: false,
    holdRead: false,
    releaseRead: undefined as undefined | (() => void),
    mode: "allow" as "allow" | "deny" | "empty",
    hold: false,
    release: undefined as undefined | (() => void),
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname === "/auth/v1/logout") data = {};
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
    else if (url.pathname.endsWith("/rpc/record_engagement")) {
      state.awards++;
      data = [];
    } else if (url.pathname.endsWith("/notification_prefs"))
      data = { asked_at: "2026-10-01T00:00:00Z" };
    else if (url.pathname.endsWith("/favorites")) {
      if (request.method() === "GET") {
        state.reads++;
        if (state.holdRead)
          await new Promise<void>((resolve) => {
            state.releaseRead = resolve;
          });
        const filter = url.searchParams.get("mod_slug")?.replace(/^eq\./, "");
        data = state.saved
          .filter((slug) => !filter || slug === filter)
          .map((mod_slug) => ({ mod_slug }));
        if (state.denyRead) {
          status = 503;
          data = { message: "Fixture read denied" };
        }
      } else {
        const slug =
          request.method() === "DELETE"
            ? url.searchParams.get("mod_slug")!.replace(/^eq\./, "")
            : request.postDataJSON().mod_slug;
        state.writes.push({ method: request.method(), slug });
        const mode = state.mode;
        if (state.hold)
          await new Promise<void>((resolve) => {
            state.release = resolve;
          });
        if (mode === "deny") {
          status = 403;
          data = { message: "Fixture write denied" };
        } else if (mode === "empty") data = [];
        else {
          state.saved =
            request.method() === "DELETE"
              ? state.saved.filter((s) => s !== slug)
              : [...new Set([...state.saved, slug])];
          data = [{ mod_slug: slug }];
        }
      }
    }
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  });
  return state;
}

async function library(page: Page) {
  await page.goto("/mods", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toBeVisible({
    timeout: 15000,
  });
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: /Fire Phoenix/i }) })
    .first();
  await expect(card.getByRole("button", { name: /bookmark/i })).toBeEnabled({ timeout: 15000 });
  return card;
}

test("failed favorite reads show retry rather than an empty vault", async ({ page }) => {
  const state = await fixture(page);
  state.denyRead = true;
  await page.goto("/favorites");
  await expect(page.getByRole("alert")).toContainText("Could not load your saved mods", {
    timeout: 15000,
  });
  await expect(page.getByText(/No favorites yet/)).toHaveCount(0);
  expect(state.reads).toBe(1);
  state.denyRead = false;
  state.saved = ["fire-phoenix"];
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove bookmark", exact: true })).toBeEnabled();
  expect(state.reads).toBe(2);
  expect(state.writes).toHaveLength(0);
});

test("pending favorites share a lock across navigation and award only after confirmed insert", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.hold = true;
  const card = await library(page);
  const bookmark = card.getByRole("button", { name: "Bookmark", exact: true });
  await bookmark.dblclick();
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(card.getByRole("button", { name: "Remove bookmark", exact: true })).toBeDisabled();
  expect(state.awards).toBe(0);
  await page
    .getByRole("button", { name: "Open menu", exact: true })
    .or(page.getByRole("button", { name: "Close menu", exact: true }))
    .click();
  await page.getByRole("link", { name: "My favorites", exact: true }).click();
  const remove = page.getByRole("button", { name: "Remove bookmark", exact: true });
  await expect(remove).toBeDisabled();
  expect(state.reads).toBe(1);
  state.release?.();
  await expect(remove).toBeEnabled();
  await expect.poll(() => state.awards).toBe(1);
  await page.screenshot({ path: info.outputPath("favorites-confirmed.png") });
});

test("an unconfirmed insert rolls back without XP and can be retried", async ({ page }) => {
  const state = await fixture(page);
  state.mode = "empty";
  const card = await library(page);
  await card.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect(page.getByText("Could not update your vault", { exact: true })).toBeVisible();
  await expect(card.getByRole("button", { name: "Bookmark", exact: true })).toBeEnabled();
  expect(state.awards).toBe(0);
  expect(state.saved).toEqual([]);
  state.mode = "allow";
  await card.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect(card.getByRole("button", { name: "Remove bookmark", exact: true })).toBeEnabled();
  await expect.poll(() => state.awards).toBe(1);
  expect(state.writes).toHaveLength(2);
});

test("zero-row removal verifies absence before claiming an empty vault", async ({ page }) => {
  const state = await fixture(page);
  state.saved = ["fire-phoenix"];
  state.mode = "empty";
  await page.goto("/favorites");
  await page.getByRole("button", { name: "Remove bookmark", exact: true }).click();
  await expect(page.getByText("Could not update your vault", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Remove bookmark", exact: true })).toBeEnabled();
  state.saved = [];
  await page.getByRole("button", { name: "Remove bookmark", exact: true }).click();
  await expect(page.getByText(/No favorites yet/)).toBeVisible();
  expect(state.writes).toHaveLength(2);
  expect(state.reads).toBe(3);
  expect(state.awards).toBe(0);
});

test("a successful late insert after sign-out cannot toast success or award XP", async ({
  page,
}) => {
  const state = await fixture(page);
  state.hold = true;
  const card = await library(page);
  await card.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect.poll(() => !!state.release).toBe(true);
  await page
    .getByRole("button", { name: "Open menu", exact: true })
    .or(page.getByRole("button", { name: "Close menu", exact: true }))
    .click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toHaveCount(0);
  const response = page.waitForResponse(
    (r) => r.url().includes("/favorites") && r.request().method() === "POST",
  );
  state.release?.();
  await (await response).finished();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await expect(card.getByRole("button", { name: "Bookmark", exact: true })).toBeEnabled();
  await expect(page.getByText("Saved to your vault", { exact: true })).toHaveCount(0);
  expect(state.awards).toBe(0);
});

test("one card failure preserves a different pending favorite", async ({ page }) => {
  const state = await fixture(page);
  state.hold = true;
  const fire = await library(page);
  await fire.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect.poll(() => !!state.release).toBe(true);
  state.hold = false;
  state.mode = "deny";
  const thunder = page
    .getByRole("article")
    .filter({ has: page.getByRole("heading", { name: "Thunder Arena Pro", exact: true }) })
    .first();
  await thunder.getByRole("button", { name: "Bookmark", exact: true }).click();
  await expect(page.getByText("Could not update your vault", { exact: true })).toBeVisible();
  await expect(thunder.getByRole("button", { name: "Bookmark", exact: true })).toBeEnabled();
  await expect(fire.getByRole("button", { name: "Remove bookmark", exact: true })).toBeDisabled();
  state.release?.();
  await expect(fire.getByRole("button", { name: "Remove bookmark", exact: true })).toBeEnabled();
  await expect.poll(() => state.awards).toBe(1);
  expect(state.saved).toEqual(["fire-phoenix"]);
  expect(state.writes).toHaveLength(2);
});

test("a stalled collection read times out and explicit retry recovers", async ({ page }) => {
  const state = await fixture(page);
  state.holdRead = true;
  await page.clock.install();
  await page.goto("/favorites", { waitUntil: "domcontentloaded" });
  await expect.poll(() => state.reads, { timeout: 15000 }).toBe(1);
  await page.clock.runFor(11000);
  await expect(page.getByRole("alert")).toContainText("Could not load your saved mods");
  expect(state.reads).toBe(1);
  expect(state.writes).toHaveLength(0);
  state.holdRead = false;
  state.saved = ["fire-phoenix"];
  state.releaseRead?.();
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Remove bookmark", exact: true })).toBeEnabled();
  expect(state.reads).toBe(2);
});
