import { test, expect, type Page } from "@playwright/test";
const id = "00000000-0000-4000-8000-000000000001";
async function identity(page: Page, owner = false) {
  const expires = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id,
    email: "fixture@example.test",
    email_confirmed_at: "2026-10-01",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email", providers: ["email"] },
    user_metadata: {},
    created_at: "2026-01-01",
  };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: expires, role: "authenticated" })).toString("base64url")}.fixture`;
  await page.addInitScript(
    ({ user, token, expires }) => {
      localStorage.setItem(
        "sb-dfxcpxzylyycrirtnkof-auth-token",
        JSON.stringify({
          user,
          access_token: token,
          refresh_token: "fixture-only",
          expires_at: expires,
          expires_in: 86400,
          token_type: "bearer",
        }),
      );
      sessionStorage.setItem(`notif-skipped:${user.id}`, "1");
    },
    { user, token, expires },
  );
  const state = {
    ack: 0,
    grant: 0,
    requests: [] as string[],
    saved: [] as unknown[],
    notice: true,
  };
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      fn = new URL(req.url()).pathname.split("/").pop();
    let data: unknown = [];
    if (fn === "user") data = user;
    else if (fn === "get_my_profile")
      data = [
        {
          id,
          username: "fixture",
          display_name: "Fixture Trainer",
          gender: "other",
          avatar_url: null,
          custom_avatar_url: null,
          is_owner: owner,
        },
      ];
    else if (fn === "notification_prefs") data = { asked_at: "2026-10-01" };
    else if (fn === "notifications")
      data = state.notice
        ? [
            {
              id: "00000000-0000-4000-8000-000000000002",
              title: "Your trainer key",
              body: "Recover it in My Rewards.",
              created_at: new Date().toISOString(),
              reward_kind: "trainer_dg_key",
              reward_ref: "DG-TEST12",
              burn_after_read: false,
              source_kind: "automated",
              target_user_id: id,
            },
          ]
        : [];
    else if (fn === "website_acknowledge_notification") {
      state.ack++;
      state.notice = false;
      data = { ok: true, acknowledged: 1 };
    } else if (fn === "website_reward_history")
      data = {
        server_time: new Date().toISOString(),
        items: [
          {
            id: "key:DG-TEST12",
            kind: "granted_key",
            label: "Trainer DG Key",
            awarded_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 86400000).toISOString(),
            claimed: true,
            key_code: "DG-TEST12",
            claim_ref: "DG-TEST12",
            claim_kind: "granted_key",
          },
        ],
      };
    else if (fn === "website_find_account") data = { id, email: "fixture@example.test" };
    else if (fn === "website_grant_pass") {
      state.grant++;
      state.requests.push(req.postDataJSON().p_request_id);
      data = { ok: true, pass_id: "00000000-0000-4000-8000-000000000003" };
    } else if (fn === "website_manage_campaign") data = state.saved;
    else if (fn === "website_owner_automation")
      data = { automated_notices: 1, manual_notices: 0, cleanup_last_status: "No run recorded" };
    await route.fulfill({ json: data });
  });
  return state;
}
test.beforeEach(({ page }, info) => {
  void page;
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Isolated local identities only.",
  );
});
test("reading an automated notice clears the delivery while reward history retains its key", async ({
  page,
}) => {
  const state = await identity(page);
  await page.goto("/notifications");
  await expect(page.getByRole("heading", { name: "Your trainer key", exact: true })).toBeVisible();
  expect(state.ack).toBe(0);
  await page.getByRole("button", { name: "Open notification", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect.poll(() => state.ack).toBe(1);
  await page.getByRole("link", { name: "Open My Rewards", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Reveal key", exact: true }).click();
  await expect(page.locator("#my-rewards code")).toHaveText("DG-TEST12");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
test("owner logo upload and Phoenix grant controls are usable without automatic grants", async ({
  page,
}) => {
  const state = await identity(page, true);
  await page.goto("/admin-control");
  await expect(page.getByText("Upload website logo", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Upload and use image", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Rewards", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Phoenix Pass", exact: true })).toBeVisible();
  const email = page.getByRole("textbox", { name: "Recipient email", exact: true });
  await email.fill("fixture@example.test");
  await page.getByRole("button", { name: "Find account", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Confirm grant / Retry", exact: true }),
  ).toBeVisible();
  expect(state.grant).toBe(0);
  await page.getByRole("button", { name: "Confirm grant / Retry", exact: true }).click();
  await expect(page.getByText(/Phoenix Pass confirmed for fixture@example.test/)).toBeVisible();
  expect(state.grant).toBe(1);
  expect(state.requests[0]).toMatch(/^[a-f0-9-]{36}$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(
    true,
  );
});
