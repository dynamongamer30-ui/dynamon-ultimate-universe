import { expect, test } from "@playwright/test";

test("gameplay waits for keyboard activation and preserves space with a YouTube fallback", async ({
  page,
}, testInfo) => {
  const videoRequests: string[] = [];
  page.on("request", (request) => {
    if (/youtube\.com|ytimg\.com|googlevideo\.com/.test(request.url()))
      videoRequests.push(request.url());
  });
  // Exercise the embed integration without playing a real video or sending traffic to YouTube.
  await page.route("https://www.youtube.com/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>Isolated player fixture</title><p>Player fixture</p>",
    }),
  );
  await page.goto("/mods/thunder-arena", { waitUntil: "networkidle" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true");
  const load = page.getByRole("button", { name: /Load .* gameplay on YouTube/ });
  await load.scrollIntoViewIfNeeded();
  await expect(load).toBeVisible();
  const before = await load.boundingBox();
  expect(videoRequests).toEqual([]);
  await expect(page.locator("iframe")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open trailer on YouTube" })).toHaveAttribute(
    "href",
    /^https:\/\/www\.youtube\.com\/watch\?v=/,
  );
  await page.screenshot({ path: testInfo.outputPath("trailer-before-load.png") });
  await load.focus();
  await page.keyboard.press("Enter");
  const frame = page.locator('iframe[title$="gameplay"]');
  await expect(frame).toBeVisible();
  await expect(frame).toBeFocused();
  await expect.poll(() => videoRequests.length).toBe(1);
  const after = await frame.boundingBox();
  expect(Math.abs(before!.height - after!.height)).toBeLessThan(1);
  expect(Math.abs(before!.width - after!.width)).toBeLessThan(1);
  await expect(frame).not.toHaveAttribute("src", /autoplay/);
  await page.reload({ waitUntil: "networkidle" });
  await expect(load).toBeVisible();
  await expect(page.locator("iframe")).toHaveCount(0);
  expect(videoRequests).toHaveLength(1);
});
