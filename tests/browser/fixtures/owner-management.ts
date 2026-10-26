import { expect, type Page } from "@playwright/test";

export async function managementFixture(page: Page, path: string) {
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
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
  await page.addInitScript(
    ({ user, token, exp }) => {
      localStorage.setItem(
        "sb-dfxcpxzylyycrirtnkof-auth-token",
        JSON.stringify({
          user,
          access_token: token,
          refresh_token: "local-only",
          expires_at: exp,
          expires_in: 86400,
          token_type: "bearer",
        }),
      );
      sessionStorage.setItem("dg_admin_key", "LOCAL-OWNER-FIXTURE-NOT-A-SECRET");
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
    readsFail: false,
    configFail: false,
    deviceFail: false,
    notificationFail: false,
    release: undefined as undefined | (() => void),
    writes: [] as {
      target: string;
      method: string;
      body: Record<string, unknown>;
      select: string | null;
    }[],
    configReads: 0,
    notificationReads: 0,
    workerReads: 0,
    configs: new Map<string, unknown>([
      ["Security", { timer: 1200, minTimer: 60 }],
      ["AccountDeletion", { enabled: false }],
    ]),
    notifications: [
      {
        id: "00000000-0000-4000-8000-000000000151",
        title: "Local existing announcement",
        body: "Local announcement body",
        created_at: "2026-01-01T00:00:00Z",
        reward_kind: null,
        reward_ref: null,
        burn_after_read: false,
      },
    ] as Record<string, unknown>[],
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const req = route.request(),
      url = new URL(req.url()),
      target = url.pathname.split("/").pop()!;
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = user;
    else if (target === "get_my_profile")
      data = [
        {
          id,
          display_name: "Local owner",
          username: "local_owner",
          gender: "other",
          is_owner: true,
          avatar_url: null,
          custom_avatar_url: null,
        },
      ];
    else if (target === "admin_account_stats") data = [{ total_users: 7, inactive_30d: 2 }];
    else if (target === "notification_prefs") data = { asked_at: "2026-01-01T00:00:00Z" };
    else if (target === "activated_users" && state.deviceFail) {
      status = 503;
      data = { message: "Local device lookup denied" };
    } else if (target === "valid_keys" && req.method() === "POST") {
      const body = req.postDataJSON() as Record<string, unknown>;
      state.writes.push({
        target,
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
        data = { message: "Local key write denied" };
      } else data = state.mode === "empty" ? [] : [{ id: body.id }];
    } else if (target === "app_config" || target === "notifications") {
      if (req.method() === "GET") {
        if (target === "app_config") {
          state.configReads++;
          const idFilter = url.searchParams.get("id") ?? "";
          data = idFilter.startsWith("in.")
            ? [...state.configs]
                .filter(([id]) => idFilter.slice(3).replace(/[()"]/g, "").split(",").includes(id))
                .map(([id, data]) => ({ id, data }))
            : { data: state.configs.get(idFilter.replace(/^eq\./, "")) };
        } else {
          state.notificationReads++;
          data = state.notifications;
        }
        if (
          (target === "app_config" && state.configFail) ||
          (target === "notifications" && state.notificationFail)
        ) {
          status = 503;
          data = { message: "Local lookup denied" };
        }
      } else {
        const body = req.postData() ? (req.postDataJSON() as Record<string, unknown>) : {};
        state.writes.push({
          target,
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
          data = { message: "Local write denied" };
        } else if (state.mode === "empty") data = null;
        else if (target === "app_config") {
          const id = String(body.id ?? url.searchParams.get("id")?.replace(/^eq\./, ""));
          const expected = url.searchParams.get("data");
          if (
            req.method() === "PATCH" &&
            expected !== `eq.${JSON.stringify(state.configs.get(id))}`
          )
            data = null;
          else {
            state.configs.set(id, body.data);
            data = { id };
          }
        } else if (req.method() === "POST") {
          data = {
            ...body,
            created_at: "2026-01-02T00:00:00Z",
            reward_kind: null,
            reward_ref: null,
            burn_after_read: false,
          };
          state.notifications.unshift(data as Record<string, unknown>);
        } else if (req.method() === "DELETE") {
          data = { id: state.notifications[0].id };
          state.notifications.shift();
        } else {
          state.notifications[0] = { ...state.notifications[0], ...body };
          data = state.notifications[0];
        }
      }
    } else if (target === "banned_devices") data = [];
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  });
  await page.route(/\/admin\/(list|upload-payload|ban|unban)(?:\?|$)/, async (route) => {
    const req = route.request(),
      target = new URL(req.url()).pathname;
    let data: unknown = { current_build: "LOCAL-BUILD", active: [], presence_disabled: true },
      status = 200;
    if (req.method() === "GET") {
      state.workerReads++;
      if (state.readsFail) {
        status = 503;
        data = { error: "Local worker unavailable" };
      }
    } else {
      state.writes.push({ target, method: req.method(), body: req.postDataJSON(), select: null });
      if (state.mode === "hold")
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
      if (state.mode === "deny") {
        status = 500;
        data = { error: "Local worker denied" };
      } else data = state.mode === "empty" ? { ok: false } : { ok: true };
    }
    await route
      .fulfill({ status, contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  });
  await page.goto(path, { waitUntil: "networkidle" });
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible({
    timeout: 15000,
  });
  return state;
}
