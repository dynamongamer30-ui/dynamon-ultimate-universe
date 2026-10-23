import { expect, test } from "@playwright/test";

test("owner editors wait for saved settings and block writes after a failed load", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  test.skip(
    !testInfo.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic owner is restricted to the local intercepted fixture.",
  );
  const id = "00000000-0000-4000-8000-000000000011";
  const expires = Math.floor(Date.now() / 1000) + 3600;
  const user = {
    id,
    email: "owner@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: expires, role: "authenticated" })).toString("base64url")}.fixture`;
  await page.addInitScript(
    ({ user, token, expires }) => {
      localStorage.setItem(
        "sb-dfxcpxzylyycrirtnkof-auth-token",
        JSON.stringify({
          access_token: token,
          refresh_token: "local-owner-fixture-only",
          expires_at: expires,
          expires_in: 3600,
          token_type: "bearer",
          user,
        }),
      );
    },
    { user, token, expires },
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const settings = new Map<string, unknown>([
    ["branding", { siteName: "Configured owner site", avgRating: "4.8" }],
  ]);
  const writes: Record<string, unknown>[] = [];
  let settingsReads = 0;
  let releaseSettings!: () => void;
  const initialRead = new Promise<void>((resolve) => {
    releaseSettings = resolve;
  });
  let rejectSettings = true;
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname.endsWith("/rpc/get_my_profile"))
      data = [
        {
          id,
          username: "fixture_owner",
          display_name: "Fixture Owner",
          is_owner: true,
          gender: "other",
          avatar_url: null,
          custom_avatar_url: null,
        },
      ];
    else if (url.pathname.endsWith("/site_settings")) {
      if (request.method() === "GET") {
        settingsReads++;
        await initialRead;
        if (rejectSettings) {
          status = 403;
          data = { message: "Fixture configuration unavailable" };
        } else data = [...settings].map(([key, value]) => ({ key, value }));
      } else {
        const body = request.postDataJSON() as Record<string, unknown>;
        writes.push(body);
        settings.set(String(body.key), body.value);
        data = { key: body.key };
      }
    } else if (url.pathname.endsWith("/notification_prefs"))
      data = { asked_at: "2026-01-01T00:00:00Z" };
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.goto("/admin-control", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { name: "Edit everything, live.", exact: true }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("textbox", { name: "Average rating stat", exact: true })).toHaveCount(
    0,
  );
  expect(writes).toHaveLength(0);
  releaseSettings();
  await expect(page.getByRole("alert")).toContainText("Could not load site configuration");
  expect(settingsReads).toBe(1);
  await expect(page.getByRole("button", { name: "Save", exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("owner-settings-error.png"), fullPage: true });
  rejectSettings = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Average rating stat", exact: true })).toHaveValue(
    "4.8",
  );
  expect(settingsReads).toBe(2);
  await page.screenshot({ path: testInfo.outputPath("owner-settings-ready.png"), fullPage: true });
  await expect(page.getByRole("textbox", { name: "Site name", exact: true })).toHaveValue(
    "Configured owner site",
  );
  await page.getByRole("textbox", { name: "Site name", exact: true }).fill("Owner draft name");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => writes.length).toBe(1);
  expect(writes[0].key).toBe("branding");
  expect(writes[0].value).toMatchObject({ siteName: "Owner draft name", avgRating: "4.8" });
  await expect(page.getByRole("textbox", { name: "Site name", exact: true })).toHaveValue(
    "Owner draft name",
  );
  await page.getByRole("button", { name: "Website themes", exact: true }).click();
  await page.getByRole("button", { name: "Publish website appearance", exact: true }).click();
  await expect(page.getByText("Website appearance published", { exact: true })).toBeVisible();
  expect(writes).toHaveLength(2);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.getByRole("textbox", { name: "Site name", exact: true })).toHaveValue(
    "Owner draft name",
  );
  await page.getByRole("button", { name: "Website themes", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Default website theme", exact: true }),
  ).toHaveValue("royal-black");
  await expect(page.getByRole("checkbox", { checked: true })).toHaveCount(9);
  expect(writes).toHaveLength(2);
  expect(errors).toEqual([]);
});
