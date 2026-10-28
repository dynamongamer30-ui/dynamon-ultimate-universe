import { expect, test } from "@playwright/test";
import { managementFixture } from "./fixtures/owner-management";
test.beforeEach(({}, info) => {
  test.setTimeout(60000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Local intercepted settings only.",
  );
});
test("app content loads without writes, coalesces typing, and shares the five social URLs", async ({
  page,
}, info) => {
  const state = await managementFixture(page, "/admin-keys");
  state.mode = "allow";
  await page.getByRole("button", { name: "app", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Shared social links", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Saved");
  expect(state.writes).toHaveLength(0);
  await page
    .getByRole("textbox", { name: "Website", exact: true })
    .fill("https://dynamongamer.com/community");
  await page
    .getByRole("textbox", { name: "Get Key button text", exact: true })
    .fill("Claim access");
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(page.getByRole("status")).toContainText("Saved");
  expect(state.configs.get("Ui")).toMatchObject({
    schema: 1,
    links: { website: "https://dynamongamer.com/community" },
    login: { getKeyLabel: "Claim access" },
  });
  await page.screenshot({ path: info.outputPath("native-content-editor.png") });
});
test("denied autosave retains the draft, pauses retries and supports explicit fallback save", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-keys");
  await page.getByRole("button", { name: "app", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Verify button text", exact: true });
  await field.fill("Unlock game");
  await expect(page.getByRole("alert")).toContainText("Local write denied");
  expect(state.writes).toHaveLength(1);
  await expect(field).toHaveValue("Unlock game");
  await page
    .getByRole("textbox", { name: "Device information text", exact: true })
    .fill("Your registered device");
  state.mode = "allow";
  await page.getByRole("button", { name: "Save app config", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved");
  expect(state.configs.get("Ui")).toMatchObject({
    login: { verifyLabel: "Unlock game", deviceNote: "Your registered device" },
  });
  expect(state.writes).toHaveLength(2);
});
test("maintenance autosaves and mandatory update settings retain newer edits during an in-flight save", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-keys");
  state.mode = "allow";
  await page.getByRole("button", { name: "config", exact: true }).click();
  await page.getByRole("switch", { name: "Maintenance mode", exact: true }).check();
  await expect.poll(() => state.configs.get("Maintenance")).toBe(true);
  const field = page.getByRole("textbox", { name: "Version name", exact: true });
  state.mode = "hold";
  await field.fill("first draft");
  await expect.poll(() => state.writes.length).toBe(2);
  await field.fill("latest draft");
  state.mode = "allow";
  state.release?.();
  await expect
    .poll(() => state.configs.get("Update"))
    .toMatchObject({ VersionName: "latest draft" });
  expect(state.writes).toHaveLength(3);
});
test("one theme menu follows the selected palette and progress is outside the profile", async ({
  page,
}, info) => {
  await managementFixture(page, "/admin-keys");
  await expect(page.getByRole("dialog", { name: "Account menu", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Profile", exact: true })).toBeVisible();
  await expect(page.getByLabel("Trainer progress", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Open menu", exact: true }).click();
  const selector = page.getByRole("combobox", { name: "Website theme", exact: true });
  await expect(selector).toHaveCount(1);
  await selector.click();
  await expect(page.getByRole("option", { name: "Royal Black", exact: true })).toBeVisible();
  await page.getByRole("option", { name: "Fire", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-website-theme", "fire");
  await selector.click();
  await page.screenshot({ path: info.outputPath("theme-popup-fire.png") });
});
