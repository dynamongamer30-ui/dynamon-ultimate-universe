import { expect, test } from "@playwright/test";

test("shared discovery URLs survive detail navigation, reload and history", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/mods?q=Thunder&elements=thunder&sort=downloads&rating=4&version=1.13.37", {
    waitUntil: "networkidle",
  });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true");
  const query = page.getByRole("searchbox", { name: "Search mods, features" });
  await expect(query).toHaveValue("Thunder");
  expect((await query.boundingBox())!.width).toBeGreaterThan(250);
  await expect(page.getByRole("combobox", { name: "Filter by version" })).toContainText("1.13.37");
  await expect(page.getByRole("button", { name: "Most Downloaded", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("#mods-result-status")).toContainText("1 build found");
  await expect(
    page.locator("article").first().getByText("Most downloaded", { exact: true }),
  ).toBeVisible();
  await page.locator("article").first().getByRole("heading").click();
  await expect(page).toHaveURL(/\/mods\/thunder-arena/);
  await page.goBack();
  await expect(query).toHaveValue("Thunder");
  await expect(page.getByRole("button", { name: "Remove Thunder filter" })).toBeVisible();
  await page.reload({ waitUntil: "networkidle" });
  await expect(query).toHaveValue("Thunder");

  // A trailing space must survive the URL update while a phrase is being typed.
  await query.press("End");
  await query.pressSequentially(" Arena");
  await expect(query).toHaveValue("Thunder Arena");
  await expect(page.locator("#mods-result-status")).toContainText("1 build found");
  await page.getByRole("button", { name: "Remove Thunder filter" }).click();
  await expect(page.getByRole("button", { name: "Remove Thunder filter" })).toBeHidden();
  await page.goBack();
  await expect(page.getByRole("button", { name: "Remove Thunder filter" })).toBeVisible();
  await expect(query).toHaveValue("Thunder Arena");
});

test("discovery filters recover from empty results and badges match each ranking", async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.goto("/mods?sort=unsupported&elements=unknown&rating=invalid", {
    waitUntil: "networkidle",
  });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true");
  await expect(page.getByRole("button", { name: "Latest Version", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("supabase.co")) requests.push(request.url());
  });
  for (const [sort, badge] of [
    ["Most Downloaded", "Most downloaded"],
    ["Most Liked", "Most liked"],
    ["Recently Updated", "Recently updated"],
    ["Most Popular", "Most popular"],
    ["Latest Version", "Latest version"],
  ]) {
    await page.getByRole("button", { name: sort, exact: true }).click();
    await expect(page.locator("article").first().getByText(badge, { exact: true })).toBeVisible();
  }
  await page
    .getByRole("group", { name: "Filter by element" })
    .getByRole("button", { name: "Fire", exact: true })
    .click();
  await expect(page.getByRole("button", { name: "Remove Fire filter" })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search mods, features" }).fill("No matching edition");
  await expect(page.getByText("No builds found", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset discovery", exact: true }).click();
  await expect(page.locator("article").first()).toBeVisible();
  const card = page.locator("article").first();
  await expect(card.getByRole("link", { name: "Comments", exact: true })).toBeVisible();
  const primary = card.getByRole("link", { name: "Sign in to download", exact: true });
  expect(
    await primary.locator("span").evaluate((element) => element.scrollWidth <= element.clientWidth),
  ).toBe(true);
  await expect(page.getByRole("searchbox", { name: "Search mods, features" })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Remove Fire filter" })).toBeHidden();
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("discovery-ready.png"), fullPage: true });
  await page.goto(`/mods?version=${"retired-" + "x".repeat(70)}`, { waitUntil: "networkidle" });
  await expect(page.getByText("No builds found", { exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Filter by version" })).toContainText(
    "unavailable",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Remove version filter" }).click();
  await expect(page.locator("article").first()).toBeVisible();
});
