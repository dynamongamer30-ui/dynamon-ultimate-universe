import { expect, test } from "@playwright/test";

test("generator without a link makes no gate, key or verification requests", async ({
  page,
}, info) => {
  const requests: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      /\/(check-token|generate-key|start|init(?:\/.*)?)$/.test(url.pathname) ||
      url.hostname === "challenges.cloudflare.com"
    )
      requests.push(url.pathname);
  });
  await page.goto("/generator", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await expect(page.getByRole("heading", { name: "Claim your key", exact: true })).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByRole("alert").filter({ hasText: "Something's missing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start again", exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: info.outputPath("generator-public.png"), fullPage: true });
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
