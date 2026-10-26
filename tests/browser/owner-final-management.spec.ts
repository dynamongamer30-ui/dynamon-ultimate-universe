import { expect, test } from "@playwright/test";
import { managementFixture } from "./fixtures/owner-management";

test.beforeEach(({ page }, info) => {
  test.setTimeout(60000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "All privileged management requests and owner identity are intercepted on localhost only.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("stale timing saves preserve newer configuration and the unsaved draft", async ({ page }) => {
  const state = await managementFixture(page, "/admin-control");
  state.mode = "allow";
  await page.getByRole("button", { name: "Unlock Timing", exact: true }).click();
  const region = page.getByRole("region", { name: "Unlock timing", exact: true });
  const field = region.getByRole("spinbutton", { name: "Minimum time (seconds)", exact: true });
  await expect(field).toHaveValue("60");
  await field.fill("55");
  state.configs.set("Security", { timer: 1500, minTimer: 75 });
  await region.getByRole("button", { name: "Save unlock timing", exact: true }).click();
  await expect(region.getByRole("alert")).toContainText("another session");
  await expect(field).toHaveValue("55");
  expect(state.configs.get("Security")).toEqual({ timer: 1500, minTimer: 75 });
});

test("timing lookup failures block defaults and retry restores the saved timing", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-control");
  state.configFail = true;
  await page.getByRole("button", { name: "Unlock Timing", exact: true }).click();
  const timing = page.getByRole("region", { name: "Unlock timing", exact: true });
  await expect(timing.getByRole("alert")).toContainText("Could not load");
  await expect(
    timing.getByRole("button", { name: "Save unlock timing", exact: true }),
  ).toBeDisabled();
  await expect(
    timing.getByRole("spinbutton", { name: "Minimum time (seconds)", exact: true }),
  ).toHaveValue("");
  state.configFail = false;
  await timing.getByRole("button", { name: "Retry unlock timing", exact: true }).click();
  await expect(
    timing.getByRole("spinbutton", { name: "Minimum time (seconds)", exact: true }),
  ).toHaveValue("60");
  expect(state.writes).toEqual([]);
});

test("timing saves validate values, retain denial and require a returned config row", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-control");
  await page.getByRole("button", { name: "Unlock Timing", exact: true }).click();
  const timing = page.getByRole("region", { name: "Unlock timing", exact: true });
  const min = timing.getByRole("spinbutton", { name: "Minimum time (seconds)", exact: true }),
    save = timing.getByRole("button", { name: "Save unlock timing", exact: true });
  await expect(min).toHaveValue("60");
  await min.fill("1300");
  await save.click();
  await expect(timing.getByRole("alert")).toContainText("valid values");
  expect(state.writes).toEqual([]);
  await min.fill("55");
  await save.click();
  await expect(timing.getByRole("alert")).toContainText("Local write denied");
  state.mode = "empty";
  await save.click();
  await expect(timing.getByRole("alert")).toContainText("not confirmed");
  state.mode = "hold";
  await save.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => state.writes.length).toBe(3);
  await expect(min).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect(min).toBeEnabled();
  expect(state.configs.get("Security")).toEqual({ timer: 1200, minTimer: 55 });
});

test("account cleanup saves retain a false setting after denial and avoid false success", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-control");
  await page.getByRole("button", { name: "Unlock Timing", exact: true }).click();
  const accounts = page.getByRole("region", { name: "Accounts", exact: true });
  const choice = accounts.getByRole("checkbox", {
    name: "Auto-delete inactive accounts",
    exact: true,
  });
  await expect(choice).not.toBeChecked();
  await accounts.getByRole("button", { name: "Save account setting", exact: true }).click();
  await expect(accounts.getByRole("alert")).toContainText("Local write denied");
  await expect(choice).not.toBeChecked();
  state.mode = "allow";
  await accounts.getByRole("button", { name: "Save account setting", exact: true }).click();
  await expect(choice).toBeEnabled();
  expect(state.writes).toHaveLength(2);
  expect(state.configs.get("AccountDeletion")).toEqual({ enabled: false });
});

test("notification read failure stays distinct from an empty sent list", async ({ page }) => {
  const state = await managementFixture(page, "/admin-control");
  state.notificationFail = true;
  await page.goto("/admin-notifications", { waitUntil: "networkidle" });
  await expect(page.getByRole("alert")).toContainText("Could not load");
  await expect(page.getByRole("button", { name: "Send notification", exact: true })).toBeDisabled();
  await expect(page.locator("main")).not.toContainText("Nothing sent yet");
  state.notificationFail = false;
  await page.getByRole("button", { name: "Retry sent notifications", exact: true }).click();
  await expect(page.getByText("Local existing announcement", { exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
});

test("uncertain notification creation is recovered by its stable identity without another insert", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-notifications");
  await page
    .getByRole("textbox", { name: "Notification title", exact: true })
    .fill("Local unsent draft");
  await page.getByRole("textbox", { name: "Notification message", exact: true }).fill("Local body");
  state.mode = "hold";
  await page
    .getByRole("button", { name: "Send notification", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(
    page.getByRole("textbox", { name: "Notification title", exact: true }),
  ).toBeDisabled();
  state.mode = "empty";
  state.release?.();
  await expect(page.getByRole("alert")).toContainText("not confirmed");
  await expect(page.getByRole("button", { name: "Send notification", exact: true })).toBeDisabled();
  state.notifications.unshift({
    ...state.writes[0].body,
    created_at: "2026-01-02T00:00:00Z",
    reward_kind: null,
    reward_ref: null,
    burn_after_read: false,
  });
  await page.getByRole("button", { name: "Check sent notifications", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Notification title", exact: true })).toHaveValue(
    "",
  );
  expect(state.writes).toHaveLength(1);
});

test("notification editing and deletion require confirmations and keep failed drafts", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-notifications");
  await page.getByRole("button", { name: "Edit notification", exact: true }).click();
  const title = page.getByRole("textbox", { name: "Edit notification title", exact: true });
  await title.fill("Local edited title");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Local write denied");
  await expect(title).toHaveValue("Local edited title");
  state.mode = "hold";
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(2);
  await expect(page.getByRole("button", { name: "Cancel", exact: true })).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect(page.getByText("Local edited title", { exact: true })).toBeVisible();
  for (const mode of ["deny", "empty", "allow"] as const) {
    state.mode = mode;
    await page.getByRole("button", { name: "Delete notification", exact: true }).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    if (mode !== "allow") {
      await expect(page.getByRole("alert")).toContainText(
        mode === "deny" ? "Local write denied" : "not confirmed",
      );
      await expect(page.getByText("Local edited title", { exact: true })).toBeVisible();
    }
  }
  await expect(page.getByText("Nothing sent yet.", { exact: true })).toBeVisible();
  expect(state.writes).toHaveLength(5);
});

test("loader lookup failures have a read-only refresh and no native writes", async ({ page }) => {
  const state = await managementFixture(page, "/admin-control");
  state.readsFail = true;
  await page.goto("/admin-loader", { waitUntil: "networkidle" });
  await expect(page.getByRole("alert")).toContainText("Could not load");
  state.readsFail = false;
  await page.getByRole("button", { name: "Refresh", exact: true }).first().click();
  await expect(page.getByText("LOCAL-BUILD", { exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
});

const payload = {
  build: "LOCAL-FIXTURE-ONLY",
  ct_b64: "bG9jYWw=",
  iv_b64: "bG9jYWw=",
  sig_b64: "bG9jYWw=",
  key_b64: "bG9jYWw=",
  ct_sha: "local",
  protocol: 2,
  min_client: 3,
  issued: Math.floor(Date.now() / 1000),
  meta_sig_b64: "bG9jYWw=",
};
test("payload form preserves typing and rejects unconfirmed Worker acknowledgements", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-loader");
  const field = page.getByRole("textbox", { name: "ct_b64 (ciphertext)", exact: true });
  await field.fill("");
  await field.pressSequentially("abcd");
  await expect(field).toHaveValue("abcd");
  await page.getByLabel("Load ct_b64 (ciphertext)", { exact: true }).setInputFiles({
    name: "local-fixture.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  const build = page.getByRole("textbox", { name: "Payload build", exact: true });
  await expect(build).toHaveValue(payload.build);
  state.mode = "empty";
  await page.getByRole("button", { name: "Upload payload", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("not confirmed");
  await expect(build).toHaveValue(payload.build);
  state.mode = "hold";
  await page
    .getByRole("button", { name: "Upload payload", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(() => state.writes.length).toBe(2);
  await expect(build).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect(build).toBeEnabled();
  expect(state.writes[1].body).toMatchObject(payload);
});

test("device ban confirmation and pending state prevent overlapping writes", async ({ page }) => {
  const state = await managementFixture(page, "/admin-loader");
  const group = page.getByRole("group", { name: "Device ban management", exact: true });
  const fingerprint = group
    .getByRole("textbox", { name: "Device fingerprint", exact: true })
    .first();
  await fingerprint.fill("LOCAL-FINGERPRINT");
  await group
    .getByRole("textbox", { name: "Ban reason", exact: true })
    .fill("Local fixture reason");
  await group.getByRole("button", { name: "Ban", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ban", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Local worker denied");
  await expect(fingerprint).toHaveValue("LOCAL-FINGERPRINT");
  state.mode = "hold";
  await group.getByRole("button", { name: "Ban", exact: true }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Ban", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(2);
  await expect(fingerprint).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect(fingerprint).toHaveValue("");
});

test("owner configuration and notification controls fit doubled text on narrow screens", async ({
  page,
}) => {
  await managementFixture(page, "/admin-control");
  await page.getByRole("button", { name: "Unlock Timing", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save unlock timing", exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 900 });
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.goto("/admin-notifications", { waitUntil: "networkidle" });
  await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
