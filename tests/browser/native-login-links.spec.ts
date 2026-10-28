import { expect, test } from "@playwright/test";
import { managementFixture } from "./fixtures/owner-management";

test.beforeEach(({}, info) => {
  test.setTimeout(60000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Intercepted local settings only.",
  );
});

test("login buttons pair editable labels with saved destinations and preview only confirmed values", async ({
  page,
}, info) => {
  const state = await managementFixture(page, "/admin-keys");
  state.mode = "allow";
  await page.getByRole("button", { name: "app", exact: true }).click();
  const admin = page.getByRole("textbox", { name: "Admin URL", exact: true });
  const open = page.getByRole("button", { name: "Open saved Admin link", exact: true });
  await expect(admin).toHaveValue("");
  await expect(open).toBeDisabled();
  await expect(page.getByRole("textbox", { name: "Get Key URL", exact: true })).toHaveValue(
    "https://generator.dynamongamer30.workers.dev/start",
  );
  expect(state.writes).toHaveLength(0);
  state.mode = "hold";
  await page.getByRole("textbox", { name: "Admin button text", exact: true }).fill("Contact owner");
  await admin.fill("https://custom.example/support?from=apk");
  await expect(open).toBeDisabled();
  await expect.poll(() => state.writes.length).toBe(1);
  await expect(open).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect(open).toBeEnabled();
  expect(state.configs.get("Ui")).toMatchObject({
    login: { adminLabel: "Contact owner" },
    links: { admin: "https://custom.example/support?from=apk" },
  });
  await page
    .context()
    .route("https://custom.example/**", (route) =>
      route.fulfill({ contentType: "text/html", body: "<h1>Saved destination</h1>" }),
    );
  const popupPromise = page.context().waitForEvent("page");
  await open.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://custom.example/support?from=apk");
  expect(await popup.evaluate(() => window.opener)).toBeNull();
  await popup.close();
  await page.getByRole("button", { name: "Reload saved settings", exact: true }).click();
  await expect(admin).toHaveValue("https://custom.example/support?from=apk");
  await expect(page.getByRole("textbox", { name: "Admin button text", exact: true })).toHaveValue(
    "Contact owner",
  );
  await expect(
    page.getByText("Verifies the entered key inside the APK. This button has no website URL."),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: /Verify URL/ })).toHaveCount(0);
  await page.screenshot({ path: info.outputPath("login-links.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("all login destinations autosave, unsafe typing preserves saved links, and blank disables", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-keys");
  state.mode = "allow";
  await page.getByRole("button", { name: "app", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Get Key URL", exact: true })
    .fill("https://custom.example/key");
  await page
    .getByRole("textbox", { name: "Tutorial URL", exact: true })
    .fill("https://custom.example/help");
  await page.getByRole("textbox", { name: "Get Key button text", exact: true }).fill("Get access");
  await page.getByRole("textbox", { name: "Tutorial button text", exact: true }).fill("Read guide");
  await expect(page.getByRole("status")).toContainText("Saved");
  await expect
    .poll(() => state.configs.get("Ui"))
    .toMatchObject({
      links: { getkey: "https://custom.example/key", tutorial: "https://custom.example/help" },
      login: { getKeyLabel: "Get access", tutorialLabel: "Read guide" },
    });
  const count = state.writes.length;
  const field = page.getByRole("textbox", { name: "Get Key URL", exact: true });
  await field.fill("javascript:alert(1)");
  await expect(page.getByRole("alert")).toContainText("HTTPS");
  expect(state.writes).toHaveLength(count);
  await expect(
    page.getByRole("button", { name: "Open saved Get Key link", exact: true }),
  ).toBeDisabled();
  expect(state.configs.get("Ui")).toMatchObject({
    links: { getkey: "https://custom.example/key" },
  });
  await field.fill("");
  await expect.poll(() => state.configs.get("Ui")).toMatchObject({ links: { getkey: "" } });
  await expect(page.getByRole("status")).toContainText("Saved");
  await expect(
    page.getByRole("button", { name: "Open saved Get Key link", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Reload saved settings", exact: true }).click();
  await expect(field).toHaveValue("");
});

test("a denied link save keeps the draft and preview blocked until manual save succeeds", async ({
  page,
}) => {
  const state = await managementFixture(page, "/admin-keys");
  await page.getByRole("button", { name: "app", exact: true }).click();
  const field = page.getByRole("textbox", { name: "Admin URL", exact: true });
  const open = page.getByRole("button", { name: "Open saved Admin link", exact: true });
  await field.fill("https://custom.example/admin");
  await expect(page.getByRole("alert")).toContainText("Local write denied");
  await expect(field).toHaveValue("https://custom.example/admin");
  await expect(open).toBeDisabled();
  state.mode = "allow";
  await page.getByRole("button", { name: "Save app config", exact: true }).click();
  await expect(open).toBeEnabled();
  expect(state.writes).toHaveLength(2);
});
