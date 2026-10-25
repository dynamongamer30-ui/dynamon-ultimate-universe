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
          state.settings.set(String(body!.key), body!.value);
          data = { key: body!.key };
        } else if (req.method() === "DELETE") {
          state.overrides = [];
          data = { slug: "fire-phoenix" };
        } else {
          state.overrides = [body!];
          data = { slug: body!.slug };
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
    expect(state.writes[2].body?.key).toBe(editor.key);
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
