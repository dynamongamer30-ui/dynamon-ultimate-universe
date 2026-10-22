import { expect, test } from "@playwright/test";

test("account reads are shared, failed saves roll back and sign-out clears private UI", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic identity runs only against the local app; every Supabase request is intercepted.",
  );
  const id = "00000000-0000-4000-8000-000000000001";
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
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
      const get = Storage.prototype.getItem,
        set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (key) {
        if (this === sessionStorage) throw new DOMException("Blocked", "SecurityError");
        return get.call(this, key);
      };
      Storage.prototype.setItem = function (key, value) {
        if (this === sessionStorage) throw new DOMException("Blocked", "SecurityError");
        return set.call(this, key, value);
      };
    },
    { user, token, expires },
  );
  const reads = { likes: 0, favorites: 0, profile: 0 };
  let rejectDelete = true;
  let deletes = 0;
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    let data: unknown = [];
    let status = 200;
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname === "/auth/v1/logout") data = {};
    else if (url.pathname.endsWith("/rpc/get_my_profile")) {
      reads.profile++;
      data = [
        {
          id,
          username: "fixture_trainer",
          display_name: "Fixture Trainer",
          gender: "other",
          avatar_url: null,
          custom_avatar_url: null,
          is_owner: false,
        },
      ];
    } else if (url.pathname.endsWith("/mod_likes") && url.searchParams.has("user_id")) {
      reads.likes++;
      data = [{ mod_slug: "fire-phoenix" }];
    } else if (url.pathname.endsWith("/favorites")) {
      if (request.method() === "GET") {
        reads.favorites++;
        data = [{ mod_slug: "fire-phoenix" }];
      } else if (request.method() === "DELETE") {
        deletes++;
        if (rejectDelete) {
          status = 403;
          data = { message: "Fixture write denied" };
        }
      }
    } else if (url.pathname.endsWith("/notification_prefs"))
      data = { asked_at: "2026-01-01T00:00:00Z" };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.goto("/mods", { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Unlike", exact: true })).toHaveCount(1);
  await expect(page.getByRole("button", { name: "Remove bookmark", exact: true })).toHaveCount(1);
  expect(reads.likes).toBe(1);
  expect(reads.favorites).toBe(1);
  expect(reads.profile).toBe(1);
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("link", { name: "My favorites", exact: true }).click();
  await expect(page.getByRole("heading", { name: "My favorites", exact: true })).toBeVisible();
  const remove = page.getByRole("button", { name: "Remove bookmark", exact: true });
  await expect(remove).toBeVisible();
  await remove.click();
  await expect(page.getByText("Could not update your vault", { exact: true })).toBeVisible();
  await expect(remove).toBeVisible();
  expect(deletes).toBe(1);
  rejectDelete = false;
  await remove.click();
  await expect(
    page.getByText("No favorites yet. Tap the bookmark on any mod to save it here.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Explore mods", exact: true })).toBeVisible();
  expect(deletes).toBe(2);
  const profileReads = reads.profile;
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("link", { name: "Edit profile", exact: true }).click();
  await expect(page.getByRole("form", { name: "Edit profile", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /^Display name/ })).toHaveValue("Fixture Trainer");
  expect(reads.profile - profileReads).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("link", { name: "My favorites", exact: true }).click();
  await page.getByRole("button", { name: "Account", exact: true }).click();
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(page.getByText("to start saving mods.")).toBeVisible();
  await expect(page.getByText("Fixture Trainer", { exact: true })).toHaveCount(0);
  expect(errors).toEqual([]);
});
