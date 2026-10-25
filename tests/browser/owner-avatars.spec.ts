import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }, info) => {
  test.setTimeout(60000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic owner and avatar/storage writes require localhost with all Supabase traffic intercepted.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
});

async function fixture(page: Page) {
  const id = "00000000-0000-4000-8000-000000000011",
    exp = Math.floor(Date.now() / 1000) + 86400;
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
          refresh_token: "fixture-only",
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
    mode: "deny" as "deny" | "empty" | "hold" | "allow",
    readMode: "allow" as "allow" | "deny" | "hold" | "malformed",
    rows: [
      {
        id: "00000000-0000-4000-8000-000000000121",
        url: "/dynamon-gamer-avatar.png",
        gender: "male",
        label: "Fixture avatar",
        active: true,
        sort_order: 0,
      },
    ] as Record<string, unknown>[],
    custom: null as string | null,
    reads: 0,
    profileReads: 0,
    holdProfile: false,
    releaseProfile: undefined as undefined | (() => void),
    storage: 0,
    storageMode: "allow" as "allow" | "deny" | "hold",
    release: undefined as undefined | (() => void),
    releaseRead: undefined as undefined | (() => void),
    releaseStorage: undefined as undefined | (() => void),
    writes: [] as { table: string; method: string; body: Record<string, unknown> | null }[],
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      table = url.pathname.split("/").pop()!;
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname.includes("/storage/v1/object/") && req.method() === "POST") {
      state.storage++;
      if (state.storageMode === "hold")
        await new Promise<void>((resolve) => {
          state.releaseStorage = resolve;
        });
      if (state.storageMode === "deny") {
        status = 403;
        data = { statusCode: "403", error: "Unauthorized", message: "Fixture storage denied" };
      } else data = { Key: `avatars/${table}`, Id: "local-storage-object" };
    } else if (table === "get_my_profile") {
      state.profileReads++;
      if (state.holdProfile && state.profileReads > 1)
        await new Promise<void>((resolve) => {
          state.releaseProfile = resolve;
        });
      data = [
        {
          id,
          display_name: "Fixture owner",
          username: "fixture_owner",
          gender: "other",
          is_owner: true,
          avatar_url: null,
          custom_avatar_url: state.custom,
        },
      ];
    } else if (table === "avatar_pool") {
      if (req.method() === "GET") {
        state.reads++;
        if (state.readMode === "hold")
          await new Promise<void>((resolve) => {
            state.releaseRead = resolve;
          });
        if (state.readMode === "deny") {
          status = 503;
          data = { message: "Fixture read denied" };
        } else if (state.readMode === "malformed") data = { unexpected: true };
        else if (url.searchParams.has("url"))
          data = state.rows.find((row) => `eq.${row.url}` === url.searchParams.get("url")) ?? null;
        else data = state.rows;
      } else {
        const body = req.postData() ? (req.postDataJSON() as Record<string, unknown>) : null;
        state.writes.push({ table, method: req.method(), body });
        if (state.mode === "hold")
          await new Promise<void>((resolve) => {
            state.release = resolve;
          });
        if (state.mode === "deny") {
          status = 403;
          data = { message: "Fixture avatar denied" };
        } else if (state.mode === "empty") data = null;
        else if (req.method() === "DELETE") {
          data = { id: state.rows[0].id };
          state.rows = [];
        } else if (req.method() === "PATCH") {
          state.rows[0] = { ...state.rows[0], ...body };
          data = state.rows[0];
        } else {
          data = { id: "00000000-0000-4000-8000-000000000122", label: null, ...body };
          state.rows.push(data as Record<string, unknown>);
        }
      }
    } else if (table === "profiles" && req.method() === "PATCH") {
      const body = req.postDataJSON();
      state.writes.push({ table, method: req.method(), body });
      if (state.mode === "hold")
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
      if (state.mode === "deny") {
        status = 403;
        data = { message: "Fixture profile denied" };
      } else if (state.mode === "empty") data = null;
      else {
        state.custom = body.custom_avatar_url;
        data = { id };
      }
    } else if (table === "notification_prefs") data = { asked_at: "2026-01-01T00:00:00Z" };
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  });
  await page.goto("/admin-control", { waitUntil: "networkidle" });
  await expect(page.getByRole("textbox", { name: "Site name", exact: true })).toBeVisible();
  return state;
}
const pool = (page: Page) => page.getByRole("region", { name: "Avatar pool", exact: true });
const row = (page: Page) => page.getByRole("group", { name: "Fixture avatar", exact: true });
async function open(page: Page) {
  await page.getByRole("button", { name: "Avatars", exact: true }).click();
}
const image = {
  name: "local-avatar.png",
  mimeType: "image/png",
  buffer: Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a1FYAAAAASUVORK5CYII=",
    "base64",
  ),
};

test("pool errors are distinct from empty data and retry cannot duplicate its read", async ({
  page,
}) => {
  const state = await fixture(page);
  state.readMode = "deny";
  await open(page);
  await expect(pool(page).getByRole("alert")).toContainText("Could not load");
  await expect(pool(page)).not.toContainText("No avatars yet");
  await expect(
    pool(page).getByRole("button", { name: "Add male avatar", exact: true }),
  ).toBeDisabled();
  state.readMode = "hold";
  await pool(page)
    .getByRole("button", { name: "Retry avatar pool", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(() => state.reads).toBe(2);
  state.readMode = "allow";
  state.rows = [];
  state.releaseRead?.();
  await expect(pool(page)).toContainText("No avatars yet");
  expect(state.writes).toEqual([]);
});

test("URL edits stay local until saved and denied or unconfirmed writes retain the draft", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  const field = row(page).getByRole("textbox", { name: "Image URL", exact: true });
  await field.fill("https://example.test/retained-avatar.png");
  await field.blur();
  expect(state.writes).toEqual([]);
  const save = row(page).getByRole("button", { name: "Save URL", exact: true });
  await save.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(pool(page).getByRole("alert")).toContainText("Fixture avatar denied");
  expect(state.writes).toHaveLength(1);
  await expect(field).toHaveValue("https://example.test/retained-avatar.png");
  state.mode = "empty";
  await save.click();
  await expect(pool(page).getByRole("alert")).toContainText("not confirmed");
  state.mode = "hold";
  await save.click();
  await expect.poll(() => state.writes.length).toBe(3);
  await expect(field).toBeDisabled();
  await expect(row(page).getByRole("button", { name: "Hide avatar", exact: true })).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect(field).toBeEnabled();
  expect(state.rows[0].url).toBe("https://example.test/retained-avatar.png");
});

test("visibility and removal change only after acknowledged writes", async ({ page }) => {
  const state = await fixture(page);
  await open(page);
  const hide = row(page).getByRole("button", { name: "Hide avatar", exact: true });
  await hide.click();
  await expect(pool(page).getByRole("alert")).toContainText("Fixture avatar denied");
  await expect(hide).toHaveAttribute("aria-pressed", "true");
  state.mode = "allow";
  await hide.click();
  await expect(row(page).getByRole("button", { name: "Show avatar", exact: true })).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  for (const mode of ["deny", "empty", "hold"] as const) {
    state.mode = mode;
    await row(page).getByRole("button", { name: "Remove avatar", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Remove", exact: true })
      .click();
    if (mode !== "hold")
      await expect(pool(page).getByRole("alert")).toContainText(
        mode === "deny" ? "Fixture avatar denied" : "Removal was not confirmed",
      );
  }
  await expect.poll(() => state.writes.length).toBe(5);
  await expect(
    row(page).getByRole("button", { name: "Remove avatar", exact: true }),
  ).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect(row(page)).toHaveCount(0);
});

test("custom picture failure retains the draft and confirmation refreshes only the profile", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  const picture = page.getByRole("region", { name: "My profile picture", exact: true });
  const field = picture.getByRole("textbox", { name: "Custom avatar URL", exact: true });
  await field.fill("javascript:alert(1)");
  await picture.getByRole("button").click();
  await expect(picture.getByRole("alert")).toContainText("valid image URL");
  expect(state.writes).toEqual([]);
  await field.fill("https://example.test/owner.png");
  await picture.getByRole("button").click();
  await expect(picture.getByRole("alert")).toContainText("Fixture profile denied");
  state.mode = "empty";
  await picture.getByRole("button").click();
  await expect(picture.getByRole("alert")).toContainText("not confirmed");
  const reads = state.profileReads;
  state.holdProfile = true;
  state.mode = "hold";
  await picture.getByRole("button").evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => state.writes.length).toBe(3);
  await expect(field).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect.poll(() => state.profileReads).toBe(reads + 1);
  await expect(field).toBeEnabled();
  state.releaseProfile?.();
  await expect(field).toHaveValue("https://example.test/owner.png");
  expect(state.reads).toBe(1);
});

test("failed pool registration retains the uploaded URL and retries without uploading twice", async ({
  page,
}) => {
  const state = await fixture(page);
  await open(page);
  await page.getByLabel("Male avatar image", { exact: true }).setInputFiles(image);
  await expect(pool(page).getByRole("alert")).toContainText("uploaded image URL is retained");
  const url = pool(page).getByRole("textbox", { name: "Uploaded image URL", exact: true });
  await expect(url).toHaveValue(/\/storage\/v1\/object\/public\/avatars\/male-/);
  expect(state.storage).toBe(1);
  expect(state.writes).toHaveLength(1);
  state.mode = "allow";
  await pool(page)
    .getByRole("button", { name: "Retry adding avatar", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect(url).toHaveCount(0);
  expect(state.storage).toBe(1);
  expect(state.writes).toHaveLength(2);
  expect(state.rows).toHaveLength(2);
});

test("uncertain registration offers lookup only and never inserts again automatically", async ({
  page,
}) => {
  const state = await fixture(page);
  state.mode = "empty";
  await open(page);
  await page.getByLabel("Female avatar image", { exact: true }).setInputFiles(image);
  await expect(pool(page).getByRole("alert")).toContainText("Registration could not be confirmed");
  await expect(
    pool(page).getByRole("button", { name: "Retry adding avatar", exact: true }),
  ).toHaveCount(0);
  const url = await pool(page)
    .getByRole("textbox", { name: "Uploaded image URL", exact: true })
    .inputValue();
  state.rows.push({
    id: "00000000-0000-4000-8000-000000000122",
    url,
    gender: "female",
    label: null,
    active: true,
    sort_order: 1,
  });
  await pool(page).getByRole("button", { name: "Check uploaded avatar", exact: true }).click();
  await expect(
    pool(page).getByRole("textbox", { name: "Uploaded image URL", exact: true }),
  ).toHaveCount(0);
  expect(state.writes).toHaveLength(1);
  expect(state.storage).toBe(1);
});

test("stalled storage upload releases controls and its late result cannot insert a pool row", async ({
  page,
}) => {
  const state = await fixture(page);
  state.storageMode = "hold";
  await open(page);
  await page.clock.install();
  await page.getByLabel("Male avatar image", { exact: true }).setInputFiles(image);
  await expect.poll(() => state.storage).toBe(1);
  await page.clock.runFor(10050);
  await expect(pool(page).getByRole("alert")).toContainText("could not be confirmed");
  await expect(
    pool(page).getByRole("button", { name: "Check uploaded avatar", exact: true }),
  ).toBeEnabled();
  state.releaseStorage?.();
  await page.clock.runFor(500);
  expect(state.writes).toEqual([]);
});

test("avatar controls and recovery remain usable from 320px to desktop", async ({ page }, info) => {
  const state = await fixture(page);
  await open(page);
  await row(page).getByRole("button", { name: "Save URL", exact: true }).click();
  await expect(pool(page).getByRole("alert")).toBeVisible();
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(
      row(page).getByRole("button", { name: "Remove avatar", exact: true }),
    ).toBeEnabled();
  }
  await page.setViewportSize({ width: 320, height: 900 });
  await pool(page).scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({ path: info.outputPath("avatar-recovery-320.png") });
  expect(state.writes).toHaveLength(1);
});

test("malformed and stalled pool reads recover without presenting an empty pool", async ({
  page,
}) => {
  const state = await fixture(page);
  state.readMode = "malformed";
  await open(page);
  await expect(pool(page).getByRole("alert")).toContainText("Could not load");
  await page.clock.install();
  state.readMode = "hold";
  await pool(page).getByRole("button", { name: "Retry avatar pool", exact: true }).click();
  await expect.poll(() => state.reads).toBe(2);
  const release = state.releaseRead;
  await page.clock.runFor(10050);
  await expect(
    pool(page).getByRole("button", { name: "Retry avatar pool", exact: true }),
  ).toBeEnabled();
  await expect(pool(page)).not.toContainText("No avatars yet");
  state.readMode = "allow";
  await pool(page).getByRole("button", { name: "Retry avatar pool", exact: true }).click();
  await expect(row(page)).toBeVisible();
  release?.();
  await page.clock.runFor(200);
  expect(state.reads).toBe(3);
  expect(state.writes).toEqual([]);
});

test("leaving an upload ignores its late receipt and preserves the next editor draft", async ({
  page,
}) => {
  const state = await fixture(page);
  state.storageMode = "hold";
  await open(page);
  await page.getByLabel("Male avatar image", { exact: true }).setInputFiles(image);
  await expect.poll(() => state.storage).toBe(1);
  await page.getByRole("button", { name: "Branding & Hero", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Site name", exact: true });
  await name.fill("Draft after abandoned upload");
  state.releaseStorage?.();
  await page.waitForTimeout(200);
  await expect(name).toHaveValue("Draft after abandoned upload");
  expect(state.writes).toEqual([]);
  await open(page);
  await expect(
    pool(page).getByRole("textbox", { name: "Uploaded image URL", exact: true }),
  ).toHaveValue(/\/storage\/v1\/object\/public\/avatars\/male-/);
  expect(state.storage).toBe(1);
});

test("upload recovery can be dismissed without deleting an object or changing the pool", async ({
  page,
}) => {
  const state = await fixture(page);
  state.mode = "empty";
  await open(page);
  await page.getByLabel("Male avatar image", { exact: true }).setInputFiles(image);
  const url = pool(page).getByRole("textbox", { name: "Uploaded image URL", exact: true });
  await expect(url).toBeVisible();
  await pool(page).getByRole("button", { name: "Dismiss upload recovery", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(url).toBeVisible();
  await pool(page).getByRole("button", { name: "Dismiss upload recovery", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Dismiss", exact: true }).click();
  await expect(url).toHaveCount(0);
  await expect(
    pool(page).getByRole("button", { name: "Add male avatar", exact: true }),
  ).toBeEnabled();
  await page.reload({ waitUntil: "networkidle" });
  await open(page);
  await expect(url).toHaveCount(0);
  expect(state.storage).toBe(1);
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].method).toBe("POST");
});
