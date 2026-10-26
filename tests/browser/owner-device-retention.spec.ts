import { expect, test } from "@playwright/test";
import { managementFixture } from "./fixtures/owner-management";

test.beforeEach(({ page }, info) => {
  test.setTimeout(90000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Owner requests are intercepted on localhost only.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("Royal Black and Config tabs remain separate at narrow widths and enlarged text", async ({
  page,
}) => {
  await managementFixture(page, "/admin-keys");
  const black = page.getByRole("button", { name: "Royal Black", exact: true });
  const config = page.getByRole("button", { name: "config", exact: true });
  for (const width of [320, 360, 390, 430, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const font of ["16px", "32px"]) {
      await page.evaluate((font) => {
        document.documentElement.style.fontSize = font;
      }, font);
      await expect(black).toBeVisible();
      const boxes = await Promise.all([black.boundingBox(), config.boundingBox()]);
      const [a, b] = boxes;
      expect(a && b).toBeTruthy();
      expect(
        a!.x + a!.width <= b!.x + 1 ||
          b!.x + b!.width <= a!.x + 1 ||
          a!.y + a!.height <= b!.y + 1 ||
          b!.y + b!.height <= a!.y + 1,
      ).toBe(true);
      expect(await black.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
    }
  }
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "16px";
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await black.click();
  await expect(
    page.getByRole("heading", { name: "Royal Black themes", exact: true }),
  ).toBeVisible();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "C:/Users/yugva/.codex/tmp/royal-void-audit/royal-black-tabs-phone.png",
  });
  await config.click();
  await expect(page.getByRole("heading", { name: "Royal Black themes", exact: true })).toHaveCount(
    0,
  );
});

test("only current activated devices appear and Delete keeps keys and bans", async ({ page }) => {
  const state = await managementFixture(page, "/admin-keys");
  const future = Math.floor(Date.now() / 1000) + 86400;
  state.keys = [
    { id: "LIVE", data: { device: "phone-live", expiry: future, status: "active" } },
    { id: "LIFETIME", data: { device: "phone-life", expiry: 0 } },
    { id: "NEW", data: { device: "phone-renewed", expiry: future } },
    { id: "OLD", data: { device: "phone-renewed", expiry: 1 } },
    { id: "EXPIRED", data: { device: "phone-expired", expiry: 1 } },
    { id: "REVOKED", data: { device: "phone-revoked", expiry: future, status: "revoked" } },
    { id: "UNUSED", data: { device: null, expiry: 0 } },
  ];
  state.devices = [
    "live",
    "life",
    "renewed",
    "expired",
    "revoked",
    ...Array.from({ length: 60 }, (_, i) => `orphan-${i}`),
  ].map((id) => ({ id: `phone-${id}`, data: { Key: "OLD", expiry: 1, lastLogin: Date.now() } }));
  state.bans = [{ id: "phone-live", data: { reason: "Existing ban" } }];
  const keys = structuredClone(state.keys),
    bans = structuredClone(state.bans);
  await page.getByRole("button", { name: "devices", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Delete device info", exact: true }).filter({ visible: true }),
  ).toHaveCount(3);
  await expect(page.getByText("NEW", { exact: true }).filter({ visible: true })).toHaveCount(1);
  await expect(page.getByText("OLD", { exact: true }).filter({ visible: true })).toHaveCount(0);
  const deletion = page
    .getByRole("button", { name: "Delete device info", exact: true })
    .filter({ visible: true })
    .first();
  await deletion.click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Cancel", exact: true }).click();
  expect(state.writes).toEqual([]);
  await deletion.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete information", exact: true })
    .click();
  await expect(page.getByText("Local device deletion denied", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete device info", exact: true }).filter({ visible: true }),
  ).toHaveCount(3);
  state.mode = "empty";
  await deletion.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete information", exact: true })
    .click();
  await expect(
    page.getByText(/Device information changed|Deletion was not confirmed/),
  ).toBeVisible();
  state.mode = "hold";
  await deletion.click();
  await page
    .getByRole("alertdialog")
    .getByRole("button", { name: "Delete information", exact: true })
    .click();
  await expect.poll(() => state.writes.length).toBe(3);
  await expect(deletion).toBeDisabled();
  state.mode = "allow";
  state.release?.();
  await expect(
    page.getByRole("button", { name: "Delete device info", exact: true }).filter({ visible: true }),
  ).toHaveCount(2);
  expect(state.keys).toEqual(keys);
  expect(state.bans).toEqual(bans);
  expect(state.devices).toHaveLength(64);
  expect(
    state.writes.every(
      (write) =>
        write.target === "activated_users" && write.method === "DELETE" && write.body.expected,
    ),
  ).toBe(true);
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "C:/Users/yugva/.codex/tmp/royal-void-audit/royal-black-devices.png",
    fullPage: true,
  });
});

test("a selected device disappears at key expiry without a network delete", async ({ page }) => {
  const state = await managementFixture(page, "/admin-keys");
  await page.clock.install();
  const expiry = Math.floor(Date.now() / 1000) + 60;
  state.keys = [{ id: "SHORT", data: { device: "phone-expiring", expiry } }];
  state.devices = [{ id: "phone-expiring", data: { Key: "SHORT", lastLogin: Date.now() } }];
  await page.getByRole("button", { name: "devices", exact: true }).click();
  const checkbox = page
    .getByRole("checkbox", { name: "Select phone-expiring", exact: true })
    .filter({ visible: true });
  await expect(checkbox).toBeVisible();
  await checkbox.check();
  await expect(page.getByText("1 selected", { exact: true })).toBeVisible();
  await page.clock.fastForward(61000);
  await expect(page.getByText("No activated devices yet.", { exact: true })).toBeVisible();
  await expect(page.getByText("1 selected", { exact: true })).toHaveCount(0);
  expect(state.writes).toEqual([]);
});
