import { expect, test } from "@playwright/test";

test("contact prepares a real draft without claiming or performing delivery", async ({ page }) => {
  await page.addInitScript(() => {
    window.open = (url) => {
      (window as unknown as { draftURL: string }).draftURL = String(url);
      return null;
    };
  });
  await page.goto("/contact", { waitUntil: "networkidle" });
  await page.getByLabel("Your name", { exact: true }).fill("Trainer Test");
  await page.getByLabel("Your email", { exact: true }).fill("trainer@example.com");
  await page.getByLabel("Message", { exact: true }).fill("Thunder Arena support & device details");
  await page.getByRole("button", { name: "Open email draft" }).click();
  const draft = new URL(
    await page.evaluate(() => (window as unknown as { draftURL: string }).draftURL),
  );
  expect(draft.protocol).toBe("mailto:");
  expect(draft.pathname).toBe("info@dynamongamer.com");
  expect(draft.searchParams.get("body")).toContain("support & device details");
  await expect(page.getByLabel("Message", { exact: true })).toHaveValue(
    "Thunder Arena support & device details",
  );
  await expect(page.locator("body")).not.toContainText("Message sent");
});

test("optional feedback tolerates unavailable preference storage", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const get = Storage.prototype.getItem,
      set = Storage.prototype.setItem;
    const optional = (key: string) =>
      key === "dynamon-feedback-preference" || key === "pwa-dismissed";
    Storage.prototype.getItem = function (key) {
      if (optional(key)) throw new DOMException("Blocked", "SecurityError");
      return get.call(this, key);
    };
    Storage.prototype.setItem = function (key, value) {
      if (optional(key)) throw new DOMException("Blocked", "SecurityError");
      return set.call(this, key, value);
    };
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const button = page.getByRole("button", { name: "Feedback preference: Off", exact: true });
  await expect(button).toBeVisible();
  const touch = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  if (touch) await button.tap();
  else await button.click();
  const option = page.getByRole("radio", { name: /Reduced/ });
  if (touch) await option.tap();
  else await option.click();
  await expect(page.getByRole("radio", { name: /Reduced/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  expect(errors).toEqual([]);
});

test("decorative cursor schedules no idle frames and honors changed reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.addInitScript(() => {
    const schedule = window.requestAnimationFrame.bind(window);
    (window as unknown as { cursorFrames: number }).cursorFrames = 0;
    window.requestAnimationFrame = (callback) => {
      if (callback.toString().includes("aurora-ring-hover"))
        (window as unknown as { cursorFrames: number }).cursorFrames++;
      return schedule(callback);
    };
  });
  await page.goto("/", { waitUntil: "networkidle" });
  const count = () =>
    page.evaluate(() => (window as unknown as { cursorFrames: number }).cursorFrames);
  const initial = await count();
  await page.waitForTimeout(500);
  expect(await count()).toBe(initial);
  await page.mouse.move(200, 200);
  await page.mouse.move(500, 400, { steps: 5 });
  await page.waitForTimeout(1500);
  const settled = await count();
  await page.waitForTimeout(500);
  expect(await count()).toBe(settled);
  const finePointer = await page.evaluate(() => matchMedia("(pointer: fine)").matches);
  if ((page.viewportSize()?.width ?? 0) >= 768 && finePointer)
    expect(settled).toBeGreaterThan(initial);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const reduced = await count();
  await page.mouse.move(600, 500);
  await page.waitForTimeout(300);
  expect(await count()).toBe(reduced);
});
