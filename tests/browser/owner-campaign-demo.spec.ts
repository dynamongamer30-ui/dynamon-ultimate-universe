import { test, expect } from "@playwright/test";
for (const ownerDemo of [true, false])
  test(`repeat demonstrations require server permission: ${ownerDemo}`, async ({ page }) => {
    test.setTimeout(60000);
    const user = {
      id: "00000000-0000-0000-0000-000000000001",
      email: "yugvadecha30@gmail.com",
      aud: "authenticated",
      role: "authenticated",
      email_confirmed_at: "2026-01-01T00:00:00Z",
      app_metadata: { provider: "email" },
      user_metadata: {},
    };
    await page.addInitScript(
      ({ user }) => {
        const token =
          btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })) +
          "." +
          btoa(
            JSON.stringify({
              sub: user.id,
              exp: Math.floor(Date.now() / 1000) + 3600,
              aud: "authenticated",
              role: "authenticated",
            }),
          ) +
          ".fixture";
        localStorage.setItem(
          "sb-dfxcpxzylyycrirtnkof-auth-token",
          JSON.stringify({
            access_token: token,
            refresh_token: "fixture-refresh",
            token_type: "bearer",
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user,
          }),
        );
        (window as any).turnstile = {
          render: (_node: unknown, options: any) => {
            setTimeout(() => options.callback("fixture-turnstile"), 0);
            return "fixture";
          },
          remove: () => {},
        };
      },
      { user },
    );
    await page.route("**/auth/v1/user", (route) => route.fulfill({ json: user }));
    await page.route("**/rest/v1/**", (route) => route.fulfill({ json: [] }));
    let prepared = 0;
    await page.route("**/api/phoenix/bonus", async (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({
          json: {
            enabled: true,
            campaign: {
              slug: "bonus",
              url_prefix: "diwali-pass",
              title: "Diwali Pass",
              active: true,
              max_claims: 50,
              claimed_count: ownerDemo ? 50 : 0,
              remaining: ownerDemo ? 0 : 50,
              starts_at: null,
              ends_at: null,
            },
          },
        });
      const body = route.request().postDataJSON();
      if (body.action === "status")
        return route.fulfill({ json: { claimed: false, demo: ownerDemo } });
      if (body.action === "prepare") {
        prepared++;
        return route.fulfill({ json: { intent: "fixture-" + prepared } });
      }
      return route.fulfill({
        json: { ok: true, telegram_url: "https://t.me/fixture_bot?start=pass_" + "a".repeat(48) },
      });
    });
    await page.goto("/diwali-pass/bonus", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Claim your pass", exact: true })).toBeVisible({
      timeout: 20000,
    });
    await page.getByRole("button", { name: "Claim your pass", exact: true }).click();
    const next = page.getByRole("button", { name: "Continue in Telegram", exact: true });
    await expect(next).toBeEnabled();
    await next.click();
    await expect(
      page.getByRole("link", { name: "Continue in Telegram", exact: true }),
    ).toBeVisible();
    const again = page.getByRole("button", { name: "Start another demonstration", exact: true });
    if (ownerDemo) {
      await expect(again).toBeVisible();
      await again.click();
      await expect.poll(() => prepared).toBe(2);
      await expect(next).toBeEnabled();
    } else await expect(again).toHaveCount(0);
  });
