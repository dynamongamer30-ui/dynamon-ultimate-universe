import { expect, test, type Page } from "@playwright/test";

const key = "sb-dfxcpxzylyycrirtnkof-auth-token";
const idA = "00000000-0000-4000-8000-000000000001";
const idB = "00000000-0000-4000-8000-000000000002";
const railName = "Picks based on your taste";
function sessionFor(id: string) {
  const expires = Math.floor(Date.now() / 1000) + 3600;
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
    "Synthetic recommendation accounts are localhost-only; all Supabase traffic is intercepted.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});

async function fixture(page: Page) {
  await page.addInitScript(
    ({ key, session, ids }) => {
      localStorage.setItem(key, JSON.stringify(session));
      for (const id of ids) sessionStorage.setItem(`notif-skipped:${id}`, "1");
    },
    { key, session: sessionFor(idA), ids: [idA, idB] },
  );
  const state = {
    active: idA,
    accounts: {
      [idA]: {
        favorites: ["fire-phoenix"],
        mod_likes: ["thunder-arena"],
        elements: ["water"] as string[] | null,
      },
      [idB]: {
        favorites: [] as string[],
        mod_likes: [] as string[],
        elements: ["earth"] as string[] | null,
      },
    },
    reads: {} as Record<string, number>,
    deny: new Set<string>(),
    hold: new Set<string>(),
    releases: new Map<string, () => void>(),
    writes: [] as { table: string; method: string; user: string }[],
    holdWrite: false,
    denyWrite: false,
    releaseWrite: undefined as (() => void) | undefined,
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url()),
      table = url.pathname.split("/").pop()!;
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = sessionFor(state.active).user;
    else if (url.pathname === "/auth/v1/logout") data = {};
    else if (table === "get_my_profile")
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
    else if (table === "notification_prefs") data = { asked_at: "2026-10-01T00:00:00Z" };
    else if (["favorites", "mod_likes", "user_preferences"].includes(table)) {
      const user =
        request.method() === "POST"
          ? request.postDataJSON().user_id
          : (url.searchParams.get("user_id")?.replace(/^eq\./, "") ?? "");
      const account = state.accounts[user],
        readKey = `${table}:${user}`;
      if (request.method() === "GET") {
        state.reads[readKey] = (state.reads[readKey] ?? 0) + 1;
        data =
          table === "user_preferences"
            ? account?.elements === null
              ? null
              : { favorite_elements: [...(account?.elements ?? [])] }
            : (account?.[table as "favorites" | "mod_likes"] ?? []).map((mod_slug) => ({
                mod_slug,
              }));
        const denied = state.deny.has(readKey);
        if (state.hold.has(readKey))
          await new Promise<void>((resolve) => state.releases.set(readKey, resolve));
        if (denied) {
          status = 503;
          data = { message: "Fixture read denied" };
        }
      } else {
        state.writes.push({ table, method: request.method(), user });
        const denied = state.denyWrite;
        if (state.holdWrite)
          await new Promise<void>((resolve) => {
            state.releaseWrite = resolve;
          });
        if (denied) {
          status = 403;
          data = { message: "Fixture write denied" };
        } else {
          const slug =
            request.method() === "POST"
              ? request.postDataJSON().mod_slug
              : url.searchParams.get("mod_slug")?.replace(/^eq\./, "");
          const collection = table as "favorites" | "mod_likes";
          account[collection] =
            request.method() === "DELETE"
              ? account[collection].filter((s) => s !== slug)
              : [...new Set([...account[collection], slug])];
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
const rail = (page: Page) => page.getByRole("region", { name: railName, exact: true });
async function home(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible({
    timeout: 15000,
  });
}

test("recommendations share collection reads, ignore unknown elements and survive theme changes", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.accounts[idA].elements = ["water", "__proto__", "constructor", "water"];
  await home(page);
  await expect(rail(page).getByText(/Recommended from/)).toContainText("water");
  await expect(rail(page).getByRole("link")).toHaveCount(4);
  await expect(rail(page)).not.toContainText("__proto__");
  await expect(rail(page)).not.toContainText("constructor");
  expect(state.reads).toEqual({
    [`favorites:${idA}`]: 1,
    [`mod_likes:${idA}`]: 1,
    [`user_preferences:${idA}`]: 1,
  });
  const menu = page.getByRole("button", { name: "Open menu", exact: true });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole("combobox", { name: "Website theme" }).selectOption("fire");
  await page.keyboard.press("Escape");
  await expect(page.locator("html")).toHaveAttribute("data-website-theme", "fire");
  await expect(rail(page).getByRole("link")).toHaveCount(4);
  expect(Object.values(state.reads)).toEqual([1, 1, 1]);
  // Reveal each lazy card and wait for its entrance fade before capturing the whole rail.
  for (const link of await rail(page).getByRole("link").all()) {
    await link.evaluate((node) => node.scrollIntoView({ block: "nearest", behavior: "instant" }));
    await expect
      .poll(() => link.evaluate((node) => getComputedStyle(node.parentElement!).opacity))
      .toBe("1");
    await expect
      .poll(() => link.locator("img").evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBeGreaterThan(0);
  }
  await rail(page).evaluate((node) => node.scrollIntoView({ block: "start", behavior: "instant" }));
  await rail(page).screenshot({ path: info.outputPath("recommendations-fire.png") });
  for (const [width, height] of [
    [320, 568],
    [600, 900],
    [1440, 1000],
  ]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(
      await rail(page)
        .getByRole("link")
        .evaluateAll((links) =>
          links.every((link) => {
            const box = link.getBoundingClientRect();
            return box.left >= 0 && box.right <= innerWidth && box.width >= 44 && box.height >= 44;
          }),
        ),
    ).toBe(true);
  }
  expect(state.writes).toEqual([]);
});

test("failed preferences retry only the failed source without presenting fallback picks", async ({
  page,
}) => {
  const state = await fixture(page);
  state.deny.add(`user_preferences:${idA}`);
  await home(page);
  await expect(rail(page).getByRole("alert")).toContainText("Could not load your recommendations");
  await expect(rail(page).getByRole("link")).toHaveCount(0);
  state.deny.clear();
  await rail(page).getByRole("button", { name: "Retry recommendations", exact: true }).click();
  await expect(rail(page).getByRole("link")).toHaveCount(4);
  expect(state.reads).toEqual({
    [`favorites:${idA}`]: 1,
    [`mod_likes:${idA}`]: 1,
    [`user_preferences:${idA}`]: 2,
  });
  expect(state.writes).toEqual([]);
});

test("an empty account does not receive invented personal recommendations", async ({ page }) => {
  const state = await fixture(page);
  state.accounts[idA] = { favorites: [], mod_likes: [], elements: null };
  await home(page);
  await expect.poll(() => Object.keys(state.reads).length).toBe(3);
  await expect(rail(page)).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

test("pending and rolled-back favorites never become confirmed recommendation affinity", async ({
  page,
}) => {
  const state = await fixture(page);
  state.accounts[idA] = { favorites: ["fire-phoenix"], mod_likes: [], elements: null };
  await home(page);
  await expect(rail(page).getByText(/Recommended from fire/)).toBeVisible();
  state.holdWrite = true;
  state.denyWrite = true;
  await page.getByRole("button", { name: "Remove bookmark", exact: true }).click();
  await expect(rail(page).getByRole("status")).toContainText("Updating your recommendations");
  await expect(rail(page).getByRole("link")).toHaveCount(0);
  await expect.poll(() => !!state.releaseWrite).toBe(true);
  state.releaseWrite?.();
  await expect(rail(page).getByText(/Recommended from fire/)).toBeVisible();
  state.holdWrite = false;
  state.denyWrite = false;
  await page.getByRole("button", { name: "Remove bookmark", exact: true }).click();
  await expect(rail(page)).toHaveCount(0);
  expect(state.reads[`favorites:${idA}`]).toBe(1);
});

test("account changes hide prior affinity while the new account is loading", async ({ page }) => {
  const state = await fixture(page);
  state.accounts[idA] = { favorites: [], mod_likes: [], elements: ["fire"] };
  await home(page);
  await expect(rail(page).getByText(/Recommended from fire/)).toBeVisible();
  state.active = idB;
  state.hold.add(`user_preferences:${idB}`);
  await page.evaluate(
    ({ key, session }) => {
      localStorage.setItem(key, JSON.stringify(session));
      const channel = new BroadcastChannel(key);
      channel.postMessage({ event: "SIGNED_IN", session });
      channel.close();
    },
    { key, session: sessionFor(idB) },
  );
  await expect.poll(() => state.reads[`user_preferences:${idB}`]).toBe(1);
  await expect(rail(page).getByRole("status")).toBeVisible();
  await expect(rail(page)).not.toContainText("Recommended from fire");
  await expect(rail(page).getByRole("link")).toHaveCount(0);
  state.releases.get(`user_preferences:${idB}`)?.();
  await expect(rail(page).getByText(/Recommended from earth/)).toBeVisible();
  await expect(rail(page)).not.toContainText("Recommended from fire");
  expect(state.writes).toEqual([]);
});

test("a stalled preference read times out and an explicit retry recovers", async ({ page }) => {
  const state = await fixture(page);
  state.hold.add(`user_preferences:${idA}`);
  await page.clock.install();
  await home(page);
  await expect.poll(() => state.reads[`user_preferences:${idA}`]).toBe(1);
  await page.clock.runFor(11000);
  await expect(rail(page).getByRole("alert")).toBeVisible();
  state.hold.clear();
  state.releases.get(`user_preferences:${idA}`)?.();
  await rail(page).getByRole("button", { name: "Retry recommendations", exact: true }).click();
  await expect(rail(page).getByRole("link")).toHaveCount(4);
  expect(state.reads[`user_preferences:${idA}`]).toBe(2);
});

test("sign-out disposes a pending recommendation read and hides late results", async ({ page }) => {
  const state = await fixture(page);
  state.hold.add(`user_preferences:${idA}`);
  await home(page);
  await expect.poll(() => !!state.releases.get(`user_preferences:${idA}`)).toBe(true);
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByRole("button", { name: "Account", exact: true })).toHaveCount(0);
  state.releases.get(`user_preferences:${idA}`)?.();
  await expect(rail(page)).toHaveCount(0);
  expect(state.writes).toEqual([]);
});

for (const table of ["favorites", "mod_likes"]) {
  test(`a failed ${table} read retries once without reloading healthy recommendation sources`, async ({
    page,
  }) => {
    const state = await fixture(page);
    state.deny.add(`${table}:${idA}`);
    await home(page);
    await expect(rail(page).getByRole("alert")).toBeVisible();
    await expect(rail(page).getByRole("link")).toHaveCount(0);
    state.deny.clear();
    await rail(page).getByRole("button", { name: "Retry recommendations", exact: true }).click();
    await expect(rail(page).getByRole("link")).toHaveCount(4);
    for (const source of ["favorites", "mod_likes", "user_preferences"])
      expect(state.reads[`${source}:${idA}`]).toBe(source === table ? 2 : 1);
    expect(state.writes).toEqual([]);
  });
}
