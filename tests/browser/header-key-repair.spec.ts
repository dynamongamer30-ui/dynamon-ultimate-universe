import { expect, test } from "@playwright/test";
import { managementFixture } from "./fixtures/owner-management";

test.beforeEach(({ page }, info) => {
  test.setTimeout(90000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Privileged requests are intercepted on localhost only.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});

test("circular brand and focused header fit phone/desktop widths and enlarged text", async ({
  page,
}, info) => {
  await managementFixture(page, "/admin-keys");
  const header = page.locator("header").first();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const size of ["16px", "32px"]) {
      await page.evaluate((size) => (document.documentElement.style.fontSize = size), size);
      await expect(header.getByRole("button", { name: "Search", exact: true })).toBeVisible();
      await expect(header.getByRole("button", { name: "Account", exact: true })).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      ).toBe(true);
      const clipped = await header.locator("button:visible,a:visible").evaluateAll((elements) =>
        elements
          .filter((element) => {
            const box = element.getBoundingClientRect();
            return box.left < 0 || box.right > innerWidth + 1;
          })
          .map((element) => element.getAttribute("aria-label")),
      );
      expect(clipped).toEqual([]);
    }
  }
  await page.evaluate(() => (document.documentElement.style.fontSize = "16px"));
  await page.setViewportSize({ width: 390, height: 844 });
  const logo = header
    .getByRole("link", { name: "Dynamon Universe home", exact: true })
    .locator("img");
  expect(
    await logo.evaluate((image) => {
      const radius = parseFloat(getComputedStyle(image).borderRadius);
      return radius >= image.getBoundingClientRect().width / 2;
    }),
  ).toBe(true);
  await expect(logo).toHaveAttribute("src", "/dynamon-gamer-avatar.png");
  await expect(header.getByRole("combobox", { name: "Website theme" })).toHaveCount(0);
  await header.getByRole("button", { name: "Account", exact: true }).click();
  await expect(page.getByLabel("Trainer progress", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Website theme" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Feedback preference:/ })).toBeVisible();
  await header.getByRole("button", { name: "Account", exact: true }).click();
  await page.screenshot({ path: info.outputPath("header-and-key-form.png") });
});

test("compact manual form creates six-character DG/VIP keys through owner API only", async ({
  page,
}, info) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", { value: { writeText: async () => {} } }),
  );
  const state = await managementFixture(page, "/admin-keys");
  state.mode = "allow";
  const form = page.getByRole("heading", { name: "Add manual key", exact: true }).locator("..");
  await form.scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath("manual-key-form.png") });
  await form.getByRole("button", { name: "Lifetime", exact: true }).click();
  await form.getByRole("button", { name: "Generate & copy", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(1);
  expect(state.writes[0].body.key).toMatch(/^DG-[A-Z2-9]{6}$/);
  expect(state.writes[0].body).toMatchObject({ action: "create", hours: 0 });
  await expect(form.getByRole("button", { name: "Generate & copy", exact: true })).toBeEnabled();
  await form.getByRole("button", { name: "VIP", exact: true }).click();
  await form.getByRole("button", { name: "7d", exact: true }).click();
  await form.getByRole("button", { name: "Generate & copy", exact: true }).click();
  await expect.poll(() => state.writes.length).toBe(2);
  expect(state.writes[1].body.key).toMatch(/^VIP-[A-Z2-9]{6}$/);
  expect(state.writes[1].body.hours).toBe(168);
});

test("Royal Black omits retired and fixed-on toggles while retaining supported controls", async ({
  page,
}) => {
  await managementFixture(page, "/admin-keys");
  await page.getByRole("button", { name: "Royal Black", exact: true }).click();
  await expect(page.getByRole("heading", { name: /Royal Black feature access/ })).toBeVisible();
  await expect(page.getByRole("checkbox", { name: "Stat cap override", exact: true })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("checkbox", { name: "Defense cap override", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByRole("checkbox", { name: "Shop compatibility", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("checkbox", { name: "Win bot matches", exact: true })).toBeVisible();
  await expect(page.getByText(/Shop compatibility is always enabled/)).toBeVisible();
});
