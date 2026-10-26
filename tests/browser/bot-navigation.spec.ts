import { expect, test } from "@playwright/test";

test("download arrival focuses the actual controls and preserves the destination for sign-in", async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/mods/fire-phoenix#download", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 20000,
  });
  const controls = page.getByLabel("Download controls", { exact: true });
  await expect(controls).toBeVisible({ timeout: 20000 });
  await expect(controls).toBeFocused();
  const box = await controls.boundingBox();
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.y + box!.height).toBeLessThanOrEqual(page.viewportSize()!.height);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await controls.getByRole("button", { name: "Log in to unlock", exact: true }).click();
  await expect(page).toHaveURL(/\/auth/);
  expect(await page.evaluate(() => sessionStorage.getItem("dg_after_auth"))).toBe(
    "/mods/fire-phoenix#download",
  );
  expect(errors).toEqual([]);
});

test("public bot feed contains published metadata and only website action links", async ({
  request,
}) => {
  const response = await request.get("/api/bot/catalog");
  expect(response.status()).toBe(200);
  const data = await response.json();
  expect(data.schema).toBe(1);
  expect(Array.isArray(data.releases)).toBe(true);
  for (const release of data.releases) {
    expect(release.downloadUrl).toBe(`https://dynamongamer.com/mods/${release.slug}#download`);
    expect(release.keyUrl).toBe("https://dynamongamer.com/links/get-key");
    expect(release.version).toEqual(expect.any(String));
  }
  expect(JSON.stringify(data)).not.toMatch(
    /mega_enc|follow_enc|download_url|access_token|fingerprint/,
  );
});

test("Get Key uses the APK start entry without creating a gate during inspection", async ({
  request,
}) => {
  const response = await request.get("/links/get-key", { maxRedirects: 0 });
  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe("https://generator.dynamongamer30.workers.dev/start");
  expect(response.headers()["cache-control"]).toContain("no-store");
});
