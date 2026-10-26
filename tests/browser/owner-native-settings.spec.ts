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

test("app settings remain available without the website payload uploader", async ({ page }) => {
  const state = await managementFixture(page, "/admin-keys");
  await page.getByRole("button", { name: "app", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save App Config", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Signed payload upload", exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByText("Payload Upload", { exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
