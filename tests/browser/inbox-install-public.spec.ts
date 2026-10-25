import { expect, test } from "@playwright/test";

test("signed-out inbox stays private and the install manifest is available", async ({ page }) => {
  const privateReads: string[] = [],
    errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (
      url.hostname.endsWith(".supabase.co") &&
      (/\/(notifications|notification_reads)$/.test(url.pathname) ||
        (url.pathname.endsWith("/public_profiles") && url.searchParams.has("is_owner")))
    )
      privateReads.push(url.pathname);
  });
  await page.goto("/notifications", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", { level: 1, name: "Notifications", exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.getByRole("link", { name: "Sign in", exact: true }).last()).toBeVisible();
  await expect(page.locator('meta[name="robots"]').last()).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    ),
  ).toBe(true);
  const response = await page.request.get("/manifest.webmanifest");
  expect(response.ok()).toBe(true);
  expect(await response.json()).toMatchObject({
    name: "Dynamon Universe",
    start_url: "/",
    display: "standalone",
  });
  expect(privateReads).toEqual([]);
  expect(errors).toEqual([]);
});
