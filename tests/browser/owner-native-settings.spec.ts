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
  await expect(page.getByText(/Key (?:creation|action) was not confirmed/)).toBeVisible();
  await expect(button).toBeEnabled();
  expect(state.writes).toHaveLength(1);
  expect(state.writes[0].target).toBe("valid_keys");
  expect(state.writes[0].body.action).toBe("create");
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
  await expect(page.getByRole("switch", { name: "Maintenance mode", exact: true })).toBeVisible();
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
  await page
    .getByRole("heading", { name: "App update system", exact: true })
    .locator("..")
    .getByRole("button", { name: "Save now", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Local write denied");
  await expect(field).toHaveValue("local-draft");
  state.mode = "allow";
  state.configs.set("Update", { Enabled: false, VersionCode: 51, VersionName: "newer-tab" });
  await page
    .getByRole("heading", { name: "App update system", exact: true })
    .locator("..")
    .getByRole("button", { name: "Save now", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("another session");
  expect(state.configs.get("Update")).toMatchObject({ VersionCode: 51 });
  await page.screenshot({ path: info.outputPath("owner-stale-update.png"), fullPage: true });
});

test("app text uses one atomic document and preserves drafts on a conflict", async ({ page }) => {
  const state = await managementFixture(page, "/admin-keys");
  state.configs.set("Ui", { schema: 1, brand: { title: "Original title" } });
  await page.getByRole("button", { name: "app", exact: true }).click();
  const section = page.getByRole("heading", { name: "DEX branding", exact: true }).locator("..");
  const title = section.getByRole("textbox", { name: "Heading", exact: true });
  await expect(title).toHaveValue("Original title");
  await title.fill("Retained title draft");
  state.configs.set("Ui", { schema: 1, brand: { title: "Newer title" } });
  state.mode = "allow";
  await page.getByRole("button", { name: "Save app config", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("another session");
  await expect(title).toHaveValue("Retained title draft");
  expect(state.configs.get("Ui")).toMatchObject({ brand: { title: "Newer title" } });
  expect(state.writes).toHaveLength(1);
});

test("switch autosaves preserve independent update drafts", async ({ page }) => {
  const state = await managementFixture(page, "/admin-keys");
  state.mode = "allow";
  await page.getByRole("button", { name: "config", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Version name", exact: true });
  await field.fill("Independent update draft");
  await page.getByRole("switch", { name: "Maintenance mode", exact: true }).check();
  await expect.poll(() => state.configs.get("Maintenance")).toBe(true);
  await expect
    .poll(() => state.configs.get("Update"))
    .toMatchObject({ VersionName: "Independent update draft" });
  await expect(field).toHaveValue("Independent update draft");
});

test("app settings remain available without the website payload uploader", async ({ page }) => {
  const state = await managementFixture(page, "/admin-keys");
  await page.getByRole("button", { name: "app", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save app config", exact: true })).toBeVisible();
  await expect(page.getByRole("group", { name: "Signed payload upload", exact: true })).toHaveCount(
    0,
  );
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
  await expect(page.getByText("Payload Upload", { exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
