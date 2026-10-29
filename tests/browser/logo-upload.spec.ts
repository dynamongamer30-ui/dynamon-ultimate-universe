import { test, expect } from "@playwright/test";
import { writeFile, unlink, readFile } from "node:fs/promises";
const fixture = new URL("../../logo-validation.tsx", import.meta.url);
test.beforeAll(async () =>
  writeFile(
    fixture,
    await readFile(new URL("../fixtures/logo-validation.txt", import.meta.url), "utf8"),
  ),
);
test.afterAll(async () => {
  await unlink(fixture).catch(() => {});
});

test.beforeEach(async ({ page }) => {
  await page.route("**/logo-fixture*", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><script type="module">import RefreshRuntime from "/@react-refresh";RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import("/logo-validation.tsx");</script></body></html>',
    }),
  );
});

for (const failure of [false, true])
  test(`logo picker publishes only after confirmation: failure=${failure}`, async ({ page }) => {
    await page.goto("/logo-fixture" + (failure ? "?fail=1" : ""));
    const picker = page.locator("input[type=file]");
    await expect(picker).toBeVisible({ timeout: 20000 });
    // Generate an actual PNG in the browser, including a valid 64x64 bitmap.
    const data = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 64;
      canvas.getContext("2d")!.fillRect(0, 0, 64, 64);
      return canvas.toDataURL().split(",")[1];
    });
    await picker.setInputFiles({
      name: "brand.png",
      mimeType: "",
      buffer: Buffer.from(data, "base64"),
    });
    await expect(page.getByRole("button", { name: "Upload and use image" })).toBeEnabled();
    await page.getByRole("button", { name: "Upload and use image" }).click();
    await expect(
      page.getByText(failure ? "Publication was refused" : "Logo published successfully.", {
        exact: true,
      }),
    ).toBeVisible({ timeout: 20000 });
    if (failure) await expect(page.getByText("Logo published successfully.")).toHaveCount(0);
  });

test("logo selection accepts 15 MB and rejects larger files", async ({ page }) => {
  await page.goto("/logo-fixture");
  const picker = page.locator("input[type=file]");
  await expect(picker).toBeVisible({ timeout: 20000 });
  await picker.setInputFiles({
    name: "large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(15 * 1024 * 1024),
  });
  await expect(page.getByRole("button", { name: "Upload and use image" })).toBeEnabled();
  await picker.setInputFiles({
    name: "too-large.png",
    mimeType: "image/png",
    buffer: Buffer.alloc(15 * 1024 * 1024 + 1),
  });
  await expect(page.getByRole("alert")).toHaveText("Choose a PNG, JPEG or WebP of 15 MB or less.");
});
