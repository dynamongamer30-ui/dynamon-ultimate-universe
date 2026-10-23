import { expect, test } from "@playwright/test";
import { fixtureReviewPage } from "./fixtures/community";

test("report submission locks immediately, preserves failed drafts and confirms success", async ({
  page,
}, testInfo) => {
  test.skip(
    !testInfo.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Synthetic report writes require intercepted localhost traffic.",
  );
  test.setTimeout(60_000);
  const id = "00000000-0000-4000-8000-000000000001";
  const commentId = "00000000-0000-4000-8000-000000000002";
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
  const author = { id, username: "fixture", display_name: "Fixture Trainer", is_owner: false };
  const comments = [
    {
      id: commentId,
      mod_slug: "thunder-arena",
      user_id: id,
      body: "Report fixture review",
      parent_id: null,
      created_at: "2026-10-01T10:00:00Z",
    },
  ];
  const writes: unknown[] = [];
  const errors: string[] = [];
  let release: (() => void) | undefined;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    let data: unknown = [],
      status = 200;
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname.endsWith("/rpc/get_my_profile")) data = [author];
    else if (url.pathname.endsWith("/rpc/get_review_page"))
      data = fixtureReviewPage(comments, [author], [], "thunder-arena", 0, id);
    else if (url.pathname.endsWith("/notification_prefs"))
      data = { asked_at: "2026-01-01T00:00:00Z" };
    else if (url.pathname.endsWith("/reports") && request.method() === "POST") {
      writes.push(request.postDataJSON());
      if (writes.length === 1) {
        await new Promise<void>((resolve) => {
          release = resolve;
        });
        status = 403;
        data = { message: "Fixture report denial" };
      } else status = 201;
    }
    await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(data) });
  });
  await page.goto("/mods/thunder-arena", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
  await expect(page.getByRole("button", { name: "Account", exact: true })).toBeVisible();
  const trigger = page
    .locator(`[data-comment-id="${commentId}"]`)
    .getByRole("button", { name: "Report", exact: true });
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Report this comment", exact: true });
  const details = dialog.getByRole("textbox", { name: "Additional report details", exact: true });
  const reason = dialog.getByRole("combobox", { name: "Report reason", exact: true });
  await reason.click();
  await page.getByRole("option", { name: "Misleading info", exact: true }).click();
  await details.fill("Please review the context of this comment.");
  await dialog.getByRole("button", { name: "Submit report", exact: true }).evaluate((button) => {
    (button as HTMLButtonElement).click();
    (button as HTMLButtonElement).click();
  });
  await expect.poll(() => writes.length).toBe(1);
  await expect(details).toBeDisabled();
  await expect(reason).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Close report dialog" })).toBeDisabled();
  release!();
  await expect(dialog.getByRole("alert")).toContainText("Your details are still here");
  await expect(details).toHaveValue("Please review the context of this comment.");
  await expect(reason).toContainText("Misleading info");
  await expect(dialog.getByText("Report received", { exact: true })).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("report-denied.png") });
  await dialog.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(dialog.getByRole("status")).toContainText("Report received");
  const done = dialog.getByRole("button", { name: "Done", exact: true });
  await expect(done).toBeFocused();
  expect(writes).toHaveLength(2);
  expect(writes[0]).toEqual({
    reporter_id: id,
    target_type: "comment",
    target_id: commentId,
    reason: "misinformation",
    details: "Please review the context of this comment.",
  });
  expect(writes[1]).toEqual(writes[0]);
  await done.click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(details).toHaveValue("");
  await expect(reason).toContainText("Spam or promotion");
  await details.fill("Discard on Escape");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(details).toHaveValue("");
  expect(errors).toEqual([]);
});

test("signed-out report preview stays read-only and fits the viewport", async ({
  page,
}, testInfo) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith(".supabase.co") && request.method() !== "GET")
      writes.push(request.method());
  });
  await page.goto("/mods/thunder-arena", { waitUntil: "domcontentloaded" });
  await page.waitForFunction(() => document.documentElement.dataset.siteSettingsReady === "true");
  const trigger = page
    .locator("[data-review-thread]")
    .first()
    .getByRole("button", { name: "Report", exact: true })
    .first();
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Report this comment", exact: true });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Sign in before submitting");
  await expect(dialog).not.toContainText("within 24h");
  const close = dialog.getByRole("button", { name: "Close report dialog" });
  await expect(close).toBeFocused();
  await page.keyboard.press("Shift+Tab");
  await expect(dialog.getByRole("button", { name: "Submit report", exact: true })).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(close).toBeFocused();
  await dialog.getByRole("button", { name: "Submit report", exact: true }).click();
  await expect(page.getByText("Sign in to report", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Report received", { exact: true })).toHaveCount(0);
  expect(
    await dialog.evaluate((node) => {
      const b = node.getBoundingClientRect();
      return b.left >= 0 && b.right <= innerWidth && b.top >= 0 && b.bottom <= innerHeight;
    }),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("report-preview.png") });
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  expect(writes).toEqual([]);
});
