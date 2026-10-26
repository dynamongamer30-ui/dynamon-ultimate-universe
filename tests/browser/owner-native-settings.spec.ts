import { expect, test } from "@playwright/test";
import { managementFixture } from "./fixtures/owner-management";

test.beforeEach(({ page }, info) => {
  test.setTimeout(60000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "All native-setting writes and owner identity use intercepted localhost fixtures.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("device read failures never display a fake empty device count", async ({ page }) => {
  const state = await managementFixture(page, "/admin-keys");
  state.deviceFail = true;
  await page.getByRole("button", { name: "devices", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not load");
  await expect(page.getByText("Total devices", { exact: true })).toHaveCount(0);
  await expect(page.getByText("No activated devices yet.", { exact: true })).toHaveCount(0);
  state.deviceFail = false;
  await page.getByRole("button", { name: "Retry device records", exact: true }).click();
  await expect(page.getByText("No activated devices yet.", { exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
});

test("manual key allocation locks rapid submissions and never retries an unconfirmed allocation", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {} } }),
  );
  const state = await managementFixture(page, "/admin-keys");
  const button = page.getByRole("button", { name: "Generate & copy", exact: true });
  state.mode = "hold";
  await button.evaluate((node: HTMLButtonElement) => {
    node.click();
    node.click();
  });
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(button).toBeDisabled();
  state.mode = "empty";
  state.release?.();
  await expect(page.getByText(/Key creation was not confirmed/)).toBeVisible();
  await expect(button).toBeEnabled();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].select).toBe("id");
  await expect(page.getByText("Key created", { exact: true })).toHaveCount(0);
});

test("generator configuration failures recover without fallback writes", async ({ page }) => {
  const state = await managementFixture(page, "/admin-keys");
  state.configFail = true;
  await page.getByRole("button", { name: "config", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Could not load");
  expect(state.writes).toEqual([]);
  state.configFail = false;
  await page.getByRole("button", { name: "Retry generator settings", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Switches", exact: true })).toBeVisible();
  expect(state.writes).toEqual([]);
});

test("generator setting denial retains controls and stale updates cannot replace current settings", async ({
  page,
}, info) => {
  const state = await managementFixture(page, "/admin-keys");
  state.configs.set("Update", { Enabled: false, VersionCode: 50, VersionName: "local-original" });
  await page.getByRole("button", { name: "config", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Version name", exact: true });
  await expect(field).toHaveValue("local-original");
  await field.fill("local-draft");
  await page.getByRole("button", { name: "Save update settings", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Local write denied");
  await expect(field).toHaveValue("local-draft");
  state.mode = "allow";
  state.configs.set("Update", { Enabled: false, VersionCode: 51, VersionName: "newer-tab" });
  await page.getByRole("button", { name: "Save update settings", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("another session");
  expect(state.configs.get("Update")).toMatchObject({ VersionCode: 51 });
  await page.screenshot({ path: info.outputPath("owner-stale-update.png"), fullPage: true });
});

test("legacy app settings report partial confirmations and preserve drafts on a conflict", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-keys");
  state.configs.set("Title", "Original title");
  state.configs.set("Subtitle", "Original subtitle");
  await page.getByRole("button", { name: "app", exact: true }).click();
  const title = page.getByRole("textbox", { name: "Dialog Title", exact: true });
  await expect(title).toHaveValue("Original title");
  await title.fill("Retained title draft");
  state.configs.set("Subtitle", "Newer subtitle");
  state.mode = "allow";
  await page.getByRole("button", { name: "Save App Config", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("1 of 6 setting saves confirmed");
  await expect(title).toHaveValue("Retained title draft");
  expect(state.configs.get("Subtitle")).toBe("Newer subtitle");
  expect(state.writes).toHaveLength(2);
});

test("confirmed switch saves preserve other drafts and lock duplicate clicks", async ({ page }) => {
  const state = await managementFixture(page, "/admin-keys");
  await page.getByRole("button", { name: "config", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Version name", exact: true });
  await field.fill("Unsaved update draft");
  const toggle = page.getByRole("switch", { name: "Maintenance mode", exact: true });
  state.mode = "hold";
  await toggle.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(toggle).toBeDisabled();
  await expect(field).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect(toggle).toHaveAttribute("aria-checked", "true");
  await expect(field).toHaveValue("Unsaved update draft");
  expect(state.configs.get("Maintenance")).toBe(true);
});

test("legacy payload upload protects credentials and requires the signed bundle and explicit acknowledgement", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-keys");
  await page.getByRole("button", { name: "app", exact: true }).click();
  const group = page.getByRole("group", { name: "Signed payload upload", exact: true });
  await group
    .getByRole("textbox", { name: "DG Worker URL", exact: true })
    .fill("https://dg.example.test");
  await expect(group.getByLabel("Admin Key (X-Admin)", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  const file = group.getByLabel("Signed payload JSON file", { exact: true });
  const payload = {
    build: "LOCAL",
    ct_b64: "LOCAL",
    iv_b64: "LOCAL",
    sig_b64: "LOCAL",
    key_b64: "LOCAL",
    ct_sha: "LOCAL",
  };
  await file.setInputFiles({
    name: "local.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(payload)),
  });
  await expect(group.getByRole("alert")).toContainText("protocol-2");
  expect(state.writes).toEqual([]);
  state.mode = "empty";
  await file.setInputFiles({
    name: "local.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        ...payload,
        protocol: 2,
        min_client: 3,
        issued: Math.floor(Date.now() / 1000),
        meta_sig_b64: "LOCAL",
      }),
    ),
  });
  await expect(group.getByRole("alert")).toContainText("Upload was not confirmed");
  expect(state.writes).toHaveLength(1);
  await expect(group.getByLabel("Admin Key (X-Admin)", { exact: true })).toHaveValue(
    "LOCAL-OWNER-FIXTURE-NOT-A-SECRET",
  );
});
