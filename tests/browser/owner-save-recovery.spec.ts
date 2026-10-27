import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }, info) => {
  test.setTimeout(60000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Owner writes use synthetic localhost accounts with all Supabase traffic intercepted.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
});

async function fixture(page: Page) {
  const id = "00000000-0000-4000-8000-000000000011";
  const exp = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id,
    email: "owner@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp, role: "authenticated" })).toString("base64url")}.fixture`;
  await page.addInitScript(
    ({ user, token, exp }) => {
      localStorage.setItem(
        "sb-dfxcpxzylyycrirtnkof-auth-token",
        JSON.stringify({
          user,
          access_token: token,
          refresh_token: "local-fixture-only",
          expires_at: exp,
          expires_in: 86400,
          token_type: "bearer",
        }),
      );
      sessionStorage.setItem(`notif-skipped:${user.id}`, "1");
      sessionStorage.setItem(
        `streak-checkin:${user.id}:${new Date().toISOString().slice(0, 10)}`,
        "confirmed",
      );
    },
    { user, token, exp },
  );
  const state = {
    denialMessage: "Fixture write denied",
    mode: "deny" as "deny" | "empty" | "hold" | "allow",
    release: undefined as undefined | (() => void),
    writes: [] as {
      table: string;
      method: string;
      body: Record<string, unknown> | null;
      select: string | null;
      identity: string | null;
    }[],
    settingsReads: 0,
    overrides: [
      { slug: "fire-phoenix", name: "Stored fixture mod", hidden: false, featured: false },
    ] as Record<string, unknown>[],
    settings: new Map<string, unknown>([
      ["branding", { siteName: "Saved fixture site" }],
      ["featured", { slug: "fire-phoenix" }],
    ]),
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      table = url.pathname.split("/").pop()!;
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = user;
    else if (table === "get_my_profile")
      data = [
        {
          id,
          display_name: "Fixture owner",
          username: "fixture_owner",
          gender: "other",
          is_owner: true,
          avatar_url: null,
          custom_avatar_url: null,
        },
      ];
    else if (["site_settings", "mod_overrides"].includes(table)) {
      if (req.method() === "GET") {
        if (table === "site_settings") {
          state.settingsReads++;
          data = [...state.settings].map(([key, value]) => ({ key, value }));
        } else data = state.overrides;
      } else {
        const body = req.postData() ? (req.postDataJSON() as Record<string, unknown>) : null;
        state.writes.push({
          table,
          method: req.method(),
          body,
          select: url.searchParams.get("select"),
          identity: url.searchParams.get("key")?.replace(/^eq\./, "") ?? null,
        });
        if (state.mode === "hold")
          await new Promise<void>((resolve) => {
            state.release = resolve;
          });
        if (state.mode === "deny") {
          status = 403;
          data = { message: state.denialMessage };
        } else if (state.mode === "empty") data = null;
        else if (table === "site_settings") {
          const key = String(body!.key ?? url.searchParams.get("key")?.replace(/^eq\./, ""));
          const expected = url.searchParams.get("value");
          if (
            req.method() === "PATCH" &&
            expected !== `eq.${JSON.stringify(state.settings.get(key))}`
          )
            data = null;
          else if (req.method() === "POST" && state.settings.has(key)) {
            status = 409;
            data = { code: "23505", message: "duplicate key" };
          } else {
            state.settings.set(key, body!.value);
            data = { key };
          }
        } else {
          const current = state.overrides[0];
          const matches =
            current &&
            [...url.searchParams].every(([key, filter]) => {
              if (key === "select") return true;
              const value = current[key] ?? null;
              return (
                filter ===
                (value === null
                  ? "is.null"
                  : `eq.${typeof value === "object" ? JSON.stringify(value) : value}`)
              );
            });
          if (req.method() !== "POST" && !matches) data = null;
          else if (req.method() === "DELETE") {
            state.overrides = [];
            data = { slug: "fire-phoenix" };
          } else {
            state.overrides = [{ ...current, ...body }];
            data = { slug: current?.slug ?? body!.slug };
          }
        }
      }
    } else if (table === "notification_prefs") data = { asked_at: "2026-01-01T00:00:00Z" };
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  });
  await page.goto("/admin-control", { waitUntil: "networkidle" });
  await expect(page.getByRole("textbox", { name: "Site name", exact: true })).toHaveValue(
    "Saved fixture site",
  );
  return state;
}

test("branding and image autosaves refresh the header while keeping the editor usable", async ({
  page,
}) => {
  const state = await fixture(page);
  state.mode = "allow";
  const name = page.getByRole("textbox", { name: "Site name", exact: true });
  await name.fill("Updated brand");
  await expect
    .poll(() => state.settings.get("branding"))
    .toMatchObject({ siteName: "Updated brand" });
  await expect(
    page.locator("header").getByRole("link", { name: "Dynamon Universe home", exact: true }),
  ).toContainText("Updated brand");
  await expect(name).toHaveValue("Updated brand");
  const icon = page.getByRole("textbox", {
    name: "Website icon URL (browser and search)",
    exact: true,
  });
  await icon.fill("https://images.example.com/site-icon.png");
  await expect
    .poll(() => state.settings.get("branding"))
    .toMatchObject({
      siteName: "Updated brand",
      faviconUrl: "https://images.example.com/site-icon.png",
      logoUrl: "/dynamon-gamer-avatar.png",
    });
  await expect(icon).toHaveValue("https://images.example.com/site-icon.png");
  expect(state.writes).toHaveLength(2);
});

test("stale branding drafts cannot overwrite a newer owner setting", async ({ page }) => {
  const state = await fixture(page);
  state.mode = "allow";
  const field = page.getByRole("textbox", { name: "Site name", exact: true });
  await field.fill("Retained older-tab draft");
  state.settings.set("branding", { siteName: "Newer tab saved first" });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("another session");
  await expect(field).toHaveValue("Retained older-tab draft");
  expect(state.settings.get("branding")).toEqual({ siteName: "Newer tab saved first" });
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].method).toBe("PATCH");
});

test("appearance publication locks duplicate submissions and retains an unconfirmed draft", async ({
  page,
}) => {
  const state = await fixture(page);
  await page.getByRole("button", { name: "Website themes", exact: true }).click();
  const field = page.getByLabel("Default website theme", { exact: true });
  await field.selectOption("dark");
  state.mode = "hold";
  const publish = page.getByRole("button", { name: "Publish website appearance", exact: true });
  await publish.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(field).toBeEnabled();
  state.mode = "empty";
  state.release?.();
  await expect(page.getByRole("alert")).toContainText("publication was not confirmed");
  await expect(field).toHaveValue("dark");
  expect(state.writes).toHaveLength(1);
  expect(state.settingsReads).toBe(1);
});

test("manual reward grant freezes an uncertain outcome instead of sending twice", async ({
  page,
}) => {
  await fixture(page);
  let writes = 0;
  let release: () => void = () => {};
  await page.route("**/rest/v1/rpc/admin_grant_phoenix_pass", async (route) => {
    writes++;
    await new Promise<void>((resolve) => {
      release = resolve;
    });
    await route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
  });
  await page.getByRole("button", { name: "Rewards", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Reward recipient email", exact: true });
  await field.fill("recipient@example.test");
  const grant = page.getByRole("button", { name: "Grant", exact: true });
  await grant.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => writes).toBe(1);
  await expect(field).toBeDisabled();
  release();
  await expect(page.getByRole("alert")).toContainText("Grant outcome was not confirmed");
  await expect(grant).toBeDisabled();
  await expect(field).toHaveValue("recipient@example.test");
  expect(writes).toBe(1);
});

test("explicit reward denial retains the recipient while a confirmed manual retry clears it", async ({
  page,
}) => {
  await fixture(page);
  let allow = false,
    writes = 0;
  await page.route("**/rest/v1/rpc/admin_grant_phoenix_pass", async (route) => {
    writes++;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(allow ? { ok: true } : { ok: false, error: "user_not_found" }),
    });
  });
  await page.getByRole("button", { name: "Rewards", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Reward recipient email", exact: true });
  await field.fill("recipient@example.test");
  await page.getByRole("button", { name: "Grant", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("No signed-up user");
  await expect(field).toHaveValue("recipient@example.test");
  allow = true;
  await page.getByRole("button", { name: "Grant", exact: true }).click();
  await expect(field).toHaveValue("");
  expect(writes).toBe(2);
});

test("stale mod edits and resets cannot replace a newer saved mod", async ({ page }) => {
  const state = await fixture(page);
  state.mode = "allow";
  const group = await modEditor(page);
  state.overrides[0].name = "Newer saved mod";
  const name = group.getByRole("textbox", { name: /^Name \(default:/ });
  await name.fill("Older draft");
  await group.getByRole("button", { name: "Save mod", exact: true }).click();
  await expect(group.getByRole("alert")).toContainText("another session");
  await expect(name).toHaveValue("Older draft");
  expect(state.overrides[0].name).toBe("Newer saved mod");
  await group.getByRole("button", { name: "Reset to defaults", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Reset", exact: true }).click();
  await expect(group.getByRole("alert")).toContainText("Reset was not confirmed");
  expect(state.overrides[0].name).toBe("Newer saved mod");
});

for (const editor of [
  { tab: "Branding & Hero", key: "branding", field: "Site name", value: "Owner retained draft" },
  {
    tab: "Announcement",
    key: "announcement",
    field: "Message",
    value: "Fixture announcement draft",
  },
  { tab: "Socials", key: "socials", field: "YouTube", value: "https://example.test/owner-channel" },
  { tab: "Featured Mod", key: "featured", field: "Featured mod", value: "thunder-arena" },
]) {
  test(`${editor.key} save retains failures, locks pending controls and requires an acknowledged row`, async ({
    page,
  }) => {
    const state = await fixture(page);
    if (editor.key !== "branding")
      await page.getByRole("button", { name: editor.tab, exact: true }).click();
    const field =
      editor.key === "featured"
        ? page.getByRole("combobox", { name: editor.field, exact: true })
        : page.getByRole("textbox", { name: editor.field, exact: true });
    if (editor.key === "featured") {
      await expect(field).toContainText("Fire Phoenix Edition");
      expect(state.settingsReads).toBe(1);
      await field.click();
      await page.getByRole("option", { name: "Thunder Arena Pro", exact: true }).click();
    } else await field.fill(editor.value);
    const draftIsRetained = () =>
      editor.key === "featured"
        ? expect(field).toContainText("Thunder Arena Pro")
        : expect(field).toHaveValue(editor.value);
    const save = page.getByRole("button", { name: "Save", exact: true });
    await save.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect(page.getByRole("alert")).toContainText("Fixture write denied");
    expect(state.writes).toHaveLength(1);
    await draftIsRetained();
    await expect(save).toBeEnabled();
    state.mode = "empty";
    await save.click();
    await expect(page.getByRole("alert")).toContainText("Save was not confirmed");
    await draftIsRetained();
    expect(state.writes).toHaveLength(2);
    state.mode = "hold";
    await save.evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
    await expect.poll(() => state.writes.length).toBe(3);
    await expect(field).toBeDisabled();
    await expect(page.getByRole("button", { name: "Reset defaults", exact: true })).toBeDisabled();
    state.mode = "allow";
    state.release?.();
    await expect.poll(() => state.settingsReads).toBe(2);
    if (editor.key !== "branding")
      await page.getByRole("button", { name: editor.tab, exact: true }).click();
    await draftIsRetained();
    expect(state.writes.map((write) => write.select)).toEqual(["key", "key", "key"]);
    expect(state.writes[2].body?.key ?? state.writes[2].identity).toBe(editor.key);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });
}

async function modEditor(page: Page) {
  await page.getByRole("button", { name: "Mods Editor", exact: true }).click();
  await page.getByRole("button", { name: /Stored fixture mod/ }).click();
  return page.getByRole("group", { name: "Edit Fire Phoenix Edition", exact: true });
}

test("mod saves reject invalid data locally and retain drafts after unconfirmed writes", async ({
  page,
}) => {
  const state = await fixture(page);
  const group = await modEditor(page);
  const name = group.getByRole("textbox", { name: /^Name \(default:/ });
  const json = group.getByRole("textbox", { name: /^Changelog/ });
  const save = group.getByRole("button", { name: "Save mod", exact: true });
  await name.fill("Retained mod draft");
  await json.fill('{"invalid":"shape"}');
  await save.click();
  await expect(group.getByRole("alert")).toContainText("Changelog must be a list");
  expect(state.writes).toHaveLength(0);
  await json.fill("");
  const likes = group.getByRole("spinbutton", { name: /^Set likes/ });
  await likes.fill("1.5");
  await save.click();
  await expect(group.getByRole("alert")).toContainText("whole numbers");
  expect(state.writes).toHaveLength(0);
  await likes.fill("12");
  await save.click();
  await expect(group.getByRole("alert")).toContainText("Fixture write denied");
  await expect(name).toHaveValue("Retained mod draft");
  state.mode = "empty";
  await save.click();
  await expect(group.getByRole("alert")).toContainText("Mod save was not confirmed");
  state.mode = "hold";
  await save.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => state.writes.length).toBe(3);
  await expect(name).toBeDisabled();
  await expect(
    group.getByRole("button", { name: "Reset to defaults", exact: true }),
  ).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect.poll(() => state.settingsReads).toBe(2);
  expect(state.overrides[0]).toMatchObject({ name: "Retained mod draft", likes_absolute: 12 });
  expect(state.writes.every((write) => write.select === "slug")).toBe(true);
});

test("mod reset never reports success for denied or empty deletion and locks pending reset", async ({
  page,
}) => {
  const state = await fixture(page);
  const group = await modEditor(page);
  const reset = group.getByRole("button", { name: "Reset to defaults", exact: true });
  for (const mode of ["deny", "empty", "hold"] as const) {
    state.mode = mode;
    await reset.click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Reset", exact: true }).click();
    if (mode === "deny")
      await expect(group.getByRole("alert")).toContainText("Fixture write denied");
    if (mode === "empty")
      await expect(group.getByRole("alert")).toContainText("Reset was not confirmed");
  }
  await expect.poll(() => state.writes.length).toBe(3);
  await expect(reset).toBeDisabled();
  await expect(group.getByRole("button", { name: "Save mod", exact: true })).toBeDisabled();
  expect(state.settingsReads).toBe(1);
  state.mode = "allow";
  state.release?.();
  await expect.poll(() => state.settingsReads).toBe(2);
  expect(state.overrides).toEqual([]);
  expect(state.writes.every((write) => write.method === "DELETE" && write.select === "slug")).toBe(
    true,
  );
});

test("a stalled settings save releases controls with a retained draft and no automatic replay", async ({
  page,
}) => {
  const state = await fixture(page);
  state.mode = "hold";
  const name = page.getByRole("textbox", { name: "Site name", exact: true });
  await name.fill("Timeout draft");
  await page.clock.install();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await page.clock.runFor(10050);
  await expect(page.getByRole("alert")).toContainText("could not be confirmed");
  await expect(name).toBeEnabled();
  await expect(name).toHaveValue("Timeout draft");
  state.mode = "allow";
  state.release?.();
  await page.clock.runFor(500);
  expect(state.writes).toHaveLength(1);
  expect(state.settingsReads).toBe(1);
});

test("leaving a pending editor ignores its late acknowledgement and long errors fit narrow screens", async ({
  page,
}, info) => {
  const state = await fixture(page);
  state.mode = "hold";
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  await page.getByRole("button", { name: "Socials", exact: true }).click();
  const youtube = page.getByRole("textbox", { name: "YouTube", exact: true });
  await youtube.fill("https://example.test/retained-social-draft");
  state.mode = "allow";
  state.release?.();
  await page.waitForTimeout(200);
  expect(state.settingsReads).toBe(1);
  await expect(youtube).toHaveValue("https://example.test/retained-social-draft");
  state.mode = "deny";
  state.denialMessage = "LocalServiceFailure".repeat(30);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(state.denialMessage);
  for (const width of [320, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await page.getByRole("alert").scrollIntoViewIfNeeded();
  expect(
    await page.getByRole("alert").evaluate((node) => {
      const rect = node.getBoundingClientRect();
      const hit = document.elementFromPoint(
        rect.left + rect.width / 2,
        Math.max(80, Math.min(innerHeight - 10, rect.top + rect.height / 2)),
      );
      return hit === node || node.contains(hit);
    }),
  ).toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({ path: info.outputPath("owner-recovery-320.png") });
  expect(state.writes).toHaveLength(2);
});
