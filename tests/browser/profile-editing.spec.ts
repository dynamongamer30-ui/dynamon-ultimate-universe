import { expect, test, type Page } from "@playwright/test";
const pageErrors = new WeakMap<Page, string[]>();

test.beforeEach(({ page }, info) => {
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic account traffic is intercepted on localhost only.",
  );
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }, info) => {
  if (info.status !== info.expectedStatus) {
    const audit = await page.evaluate(
      () => (window as unknown as { authPathAudit?: unknown[] }).authPathAudit,
    );
    console.log("Return path audit", JSON.stringify(audit));
    if (audit)
      await info.attach("return-path-audit", {
        body: JSON.stringify(audit),
        contentType: "application/json",
      });
  }
  expect(pageErrors.get(page)).toEqual([]);
});

async function ready(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
}

async function account(page: Page, setup = false) {
  const id = "00000000-0000-4000-8000-000000000001";
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
    },
    { user, token, expires },
  );
  const state = {
    id,
    profile: setup
      ? null
      : {
          id,
          username: "fixture",
          display_name: "Fixture Trainer",
          gender: "other",
          avatar_url: "/dynamon-gamer-avatar.png",
          is_owner: false,
          custom_avatar_url: null,
        },
    reads: 0,
    denyRead: false,
    mode: "deny" as "deny" | "empty" | "allow",
    holdSave: false,
    saves: [] as Record<string, unknown>[],
    checks: [] as string[],
    releaseSave: undefined as undefined | (() => void),
    releaseName: undefined as undefined | (() => void),
    nameFailure: false,
    avatarMode: "allow" as "allow" | "deny" | "empty" | "hold",
    avatarReads: 0,
    releaseAvatars: undefined as undefined | (() => void),
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname.endsWith("/rpc/get_my_profile")) {
      state.reads++;
      if (state.denyRead) {
        status = 503;
        data = { message: "Fixture profile read failed" };
      } else data = state.profile ? [state.profile] : [];
    } else if (url.pathname.endsWith("/rpc/username_available")) {
      const name =
        request.method() === "GET"
          ? url.searchParams.get("_username")
          : request.postDataJSON()._username;
      state.checks.push(name);
      if (name === "slow_name")
        await new Promise<void>((resolve) => {
          state.releaseName = resolve;
        });
      if (state.nameFailure) {
        status = 503;
        data = { message: "Fixture availability failure" };
      } else data = name !== "taken_name";
      await route
        .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
        .catch(() => {}); // A superseded availability read may be aborted.
      return;
    } else if (url.pathname.endsWith("/profiles") && request.method() !== "GET") {
      state.saves.push(request.postDataJSON());
      if (state.holdSave)
        await new Promise<void>((resolve) => {
          state.releaseSave = resolve;
        });
      if (state.mode === "deny") {
        status = 403;
        data = { message: "Fixture save rejected" };
      } else if (state.mode === "allow") {
        state.profile = { ...state.profile!, ...request.postDataJSON(), id };
        data = [{ id }];
      }
    } else if (url.pathname.endsWith("/avatar_pool")) {
      state.avatarReads++;
      if (state.avatarMode === "hold")
        await new Promise<void>((resolve) => {
          state.releaseAvatars = resolve;
        });
      if (state.avatarMode === "deny") {
        status = 503;
        data = { message: "Fixture avatar load failed" };
      } else
        data =
          state.avatarMode === "empty"
            ? []
            : [
                {
                  id: "avatar",
                  url: "/dynamon-gamer-avatar.png",
                  gender: "male",
                  label: "Fixture hero",
                },
              ];
      await route
        .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
        .catch(() => {});
      return;
    } else if (url.pathname.endsWith("/notification_prefs"))
      data = { asked_at: "2026-01-01T00:00:00Z" };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  });
  return state;
}

for (const path of ["/auth", "/profile"]) {
  test(`${path} retries avatar failures without losing drafts or submitting the profile`, async ({
    page,
  }, info) => {
    const state = await account(page, path === "/auth");
    state.avatarMode = "deny";
    await ready(page, path);
    const form = page.getByRole("form", {
      name: path === "/auth" ? "Build your trainer" : "Edit profile",
    });
    const name = form.getByRole("textbox", { name: /Display name/ });
    await name.fill("Keep this draft");
    if (path === "/auth") await form.getByRole("button", { name: "other", exact: true }).click();
    await expect(form.getByRole("alert")).toContainText("Could not load avatars");
    await expect(form).not.toContainText("No avatars available");
    expect(state.avatarReads).toBe(1);
    await page.screenshot({ path: info.outputPath("avatar-error.png"), fullPage: true });
    state.avatarMode = "hold";
    await form.getByRole("button", { name: "Retry avatars", exact: true }).dblclick();
    await expect(form.getByRole("status")).toContainText("Loading avatars");
    await expect.poll(() => state.avatarReads).toBe(2);
    await expect(name).toHaveValue("Keep this draft");
    state.avatarMode = "allow";
    state.releaseAvatars!();
    const hero = form.getByRole("button", { name: "Fixture hero", exact: true });
    await expect(hero).toBeVisible();
    await expect(hero).toHaveAttribute("aria-pressed", path === "/profile" ? "true" : "false");
    await hero.click();
    await expect(hero).toHaveAttribute("aria-pressed", "true");
    await form.getByRole("button", { name: "female", exact: true }).click();
    await expect(
      form.getByText("No avatars available for this selection.", { exact: true }),
    ).toBeVisible();
    await form.getByRole("button", { name: "other", exact: true }).click();
    await expect(hero).toHaveAttribute("aria-pressed", path === "/auth" ? "false" : "true");
    expect(state.avatarReads).toBe(2);
    expect(state.saves).toEqual([]);
    await form.scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: info.outputPath("avatar-retry.png"), fullPage: true });
  });
}

test("avatar empty state is distinct from a failed request", async ({ page }) => {
  const state = await account(page);
  state.avatarMode = "empty";
  await ready(page, "/profile");
  const form = page.getByRole("form", { name: "Edit profile" });
  await expect(form.getByText("No avatars available yet.", { exact: true })).toBeVisible();
  await expect(form.getByRole("button", { name: "Retry avatars" })).toHaveCount(0);
  expect(state.avatarReads).toBe(1);
  expect(state.saves).toEqual([]);
});

test("avatar deadline allows retry and ignores the expired response", async ({ page }) => {
  await page.clock.install();
  const state = await account(page);
  state.avatarMode = "hold";
  await ready(page, "/profile");
  const form = page.getByRole("form", { name: "Edit profile" });
  await expect(form.getByRole("status")).toContainText("Loading avatars");
  await expect.poll(() => !!state.releaseAvatars).toBe(true);
  const releaseExpired = state.releaseAvatars!;
  await page.clock.runFor(10_001);
  await expect(form.getByRole("button", { name: "Retry avatars", exact: true })).toBeVisible();
  expect(state.avatarReads).toBe(1);
  state.avatarMode = "allow";
  await form.getByRole("button", { name: "Retry avatars", exact: true }).click();
  const hero = form.getByRole("button", { name: "Fixture hero", exact: true });
  await expect(hero).toHaveAttribute("aria-pressed", "true");
  state.avatarMode = "empty";
  releaseExpired();
  await page.waitForTimeout(150); // Settle the deliberately late, aborted fixture response.
  await expect(hero).toHaveAttribute("aria-pressed", "true");
  expect(state.avatarReads).toBe(2);
  expect(state.saves).toEqual([]);
});

for (const path of ["/auth", "/profile"]) {
  test(`${path} ignores superseded username checks and offers a failed-check retry`, async ({
    page,
  }) => {
    const state = await account(page, path === "/auth");
    await ready(page, path);
    const form = page.getByRole("form", {
      name: path === "/auth" ? "Build your trainer" : "Edit profile",
    });
    const username = form.getByRole("textbox", { name: /Username/ });
    await expect(username).toBeVisible();
    await username.fill("slow_name");
    await expect.poll(() => state.checks.includes("slow_name")).toBe(true);
    await username.fill("taken_name");
    await expect(form.getByText("taken", { exact: true })).toBeVisible();
    state.releaseName!();
    await page.waitForTimeout(200); // Let the deliberately reordered fixture response settle.
    await expect(form.getByText("taken", { exact: true })).toBeVisible();
    await username.fill("??");
    await expect(form.getByText("invalid", { exact: true })).toBeVisible();
    state.nameFailure = true;
    await username.fill("retry_name");
    await expect(form.getByRole("button", { name: "Retry username check" })).toBeVisible();
    await expect(
      form.getByRole("button", { name: path === "/auth" ? "Enter the Universe" : "Save changes" }),
    ).toBeDisabled();
    state.nameFailure = false;
    await form.getByRole("button", { name: "Retry username check" }).click();
    await expect(form.getByText("available", { exact: true })).toBeVisible();
    expect(state.saves).toEqual([]);
  });
}

test("profile refresh keeps drafts; denied and empty saves recover before confirmed success", async ({
  page,
}, info) => {
  test.setTimeout(60_000);
  await page.clock.install();
  const state = await account(page);
  await ready(page, "/profile");
  const form = page.getByRole("form", { name: "Edit profile" });
  const name = form.getByRole("textbox", { name: /Display name/ });
  const username = form.getByRole("textbox", { name: /Username/ });
  await expect(name).toHaveValue("Fixture Trainer");
  await expect
    .poll(() =>
      form
        .getByRole("button", { name: "Fixture hero" })
        .locator("img")
        .evaluate((image) => (image as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);
  await name.fill("Unsaved Trainer");
  state.profile = { ...state.profile!, display_name: "Changed elsewhere" };
  await page.clock.setSystemTime(new Date(Date.now() + 65_000));
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  await expect.poll(() => state.reads).toBeGreaterThan(1);
  await expect(name).toHaveValue("Unsaved Trainer");
  state.holdSave = true;
  await form.evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect.poll(() => state.saves.length).toBe(1);
  await expect(name).toBeDisabled();
  await expect(username).toBeDisabled();
  await expect(form.getByRole("button", { name: "Fixture hero" })).toBeDisabled();
  state.releaseSave!();
  await expect(form.getByRole("alert")).toContainText("Your changes are still here");
  await expect(name).toHaveValue("Unsaved Trainer");
  state.holdSave = false;
  state.mode = "empty";
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect.poll(() => state.saves.length).toBe(2);
  await expect(form.getByRole("alert")).toContainText("Your changes are still here");
  await expect(page.getByText("Profile updated", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("profile-save-denied.png") });
  state.mode = "allow";
  await form.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByText("Profile updated", { exact: true })).toBeVisible();
  await expect(name).toHaveValue("Unsaved Trainer");
  expect(state.saves).toHaveLength(3);
  expect(state.saves[2]).toMatchObject({
    username: "fixture",
    display_name: "Unsaved Trainer",
    gender: "other",
    avatar_url: "/dynamon-gamer-avatar.png",
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const path of ["/auth", "/profile"]) {
  test(`${path} distinguishes failed profile reads from missing setup`, async ({ page }) => {
    const state = await account(page);
    state.denyRead = true;
    await ready(page, path);
    await expect(page.getByRole("alert")).toContainText("Could not load your profile");
    await expect(page.getByRole("form")).toHaveCount(0);
    state.denyRead = false;
    await page.getByRole("button", { name: "Retry profile" }).click();
    if (path === "/profile")
      await expect(page.getByRole("form", { name: "Edit profile" })).toBeVisible();
    else await expect(page).toHaveURL(/\/mods$/);
    expect(state.saves).toEqual([]);
  });
}

test("onboarding preserves rejected drafts and waits for a confirmed profile before redirecting", async ({
  page,
}) => {
  const state = await account(page, true);
  await page.addInitScript(() => {
    const audit: unknown[] = [];
    (window as unknown as { authPathAudit: unknown[] }).authPathAudit = audit;
    const get = Storage.prototype.getItem,
      remove = Storage.prototype.removeItem;
    Storage.prototype.getItem = function (key) {
      const value = get.call(this, key);
      if (key === "dg_after_auth") audit.push({ action: "get", value, stack: new Error().stack });
      return value;
    };
    Storage.prototype.removeItem = function (key) {
      if (key === "dg_after_auth") audit.push({ action: "remove", stack: new Error().stack });
      return remove.call(this, key);
    };
  });
  await page.addInitScript(() => sessionStorage.setItem("dg_after_auth", "/favorites"));
  await ready(page, "/auth");
  await expect
    .poll(() => page.evaluate(() => sessionStorage.getItem("dg_after_auth")))
    .toBe("/favorites");
  const form = page.getByRole("form", { name: "Build your trainer" });
  await form.getByRole("textbox", { name: /Username/ }).fill("new_trainer");
  await form.getByRole("textbox", { name: /Display name/ }).fill("New Trainer");
  await form.getByRole("button", { name: "other", exact: true }).click();
  await form.getByRole("button", { name: "Fixture hero", exact: true }).click();
  await expect(form.getByText("available", { exact: true })).toBeVisible();
  state.holdSave = true;
  await form.evaluate((form) => {
    (form as HTMLFormElement).requestSubmit();
    (form as HTMLFormElement).requestSubmit();
  });
  await expect.poll(() => state.saves.length).toBe(1);
  await expect(form.getByRole("textbox", { name: /Username/ })).toBeDisabled();
  await expect(form.getByRole("button", { name: "Fixture hero", exact: true })).toBeDisabled();
  state.releaseSave!();
  await expect(form.getByRole("alert")).toContainText("Your changes are still here");
  await expect(form.getByRole("textbox", { name: /Display name/ })).toHaveValue("New Trainer");
  state.holdSave = false;
  state.mode = "empty";
  await form.getByRole("button", { name: "Enter the Universe", exact: true }).click();
  await expect.poll(() => state.saves.length).toBe(2);
  await expect(form.getByRole("alert")).toContainText("Your changes are still here");
  await expect(page).toHaveURL(/\/auth$/);
  state.mode = "allow";
  await form.getByRole("button", { name: "Enter the Universe", exact: true }).click();
  await expect(page).toHaveURL(/\/favorites$/);
  expect(state.saves).toHaveLength(3);
  expect(state.saves[2]).toMatchObject({
    id: state.id,
    username: "new_trainer",
    display_name: "New Trainer",
    gender: "other",
    avatar_url: "/dynamon-gamer-avatar.png",
  });
});

test("onboarding retains an existing draft when a background profile read fails", async ({
  page,
}) => {
  await page.clock.install();
  const state = await account(page, true);
  await ready(page, "/auth");
  const form = page.getByRole("form", { name: "Build your trainer" });
  const name = form.getByRole("textbox", { name: /Display name/ });
  await name.fill("Keep this setup draft");
  state.denyRead = true;
  await page.clock.setSystemTime(new Date(Date.now() + 65_000));
  await page.evaluate(() => {
    window.dispatchEvent(new Event("offline"));
    window.dispatchEvent(new Event("online"));
  });
  await expect.poll(() => state.reads).toBeGreaterThan(1);
  await expect(page.getByRole("alert")).toContainText("Could not load your profile");
  await expect(name).toHaveValue("Keep this setup draft");
  state.denyRead = false;
  await page.getByRole("button", { name: "Retry profile" }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(name).toHaveValue("Keep this setup draft");
  expect(state.saves).toEqual([]);
});
