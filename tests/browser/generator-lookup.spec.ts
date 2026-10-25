import { expect, test, type Page } from "@playwright/test";

test.beforeEach(({ page }, info) => {
  test.setTimeout(60000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Generator fixtures are localhost-only; all Worker/Supabase traffic is intercepted.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
});

async function fixture(page: Page) {
  const state = {
    requests: [] as { method: string; ref: string | null }[],
    status: 200,
    body: { valid: false, reason: "used" } as unknown,
    raw: undefined as string | undefined,
    hold: false,
    release: undefined as (() => void) | undefined,
    holdGeneration: false,
    releaseGeneration: undefined as (() => void) | undefined,
    generations: 0,
    gateCalls: 0,
  };
  await page.addInitScript(() => {
    const capture = window as unknown as { fixtureCopies: number; fixtureWidgets: number };
    capture.fixtureCopies = 0;
    capture.fixtureWidgets = 0;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          capture.fixtureCopies++;
        },
      },
    });
    window.turnstile = {
      render: (element, options) => {
        capture.fixtureWidgets++;
        element.textContent = "Local verification fixture";
        options.callback("local-fixture-captcha");
        return "local-widget";
      },
      remove: () => {},
      reset: () => {},
    };
  });
  await page.route("**/*.supabase.co/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    }),
  );
  await page.route(
    (url) => /\/(check-token|generate-key|start|init(?:\/.*)?)$/.test(url.pathname),
    async (route) => {
      const request = route.request(),
        url = new URL(request.url());
      if (url.pathname === "/check-token") {
        state.requests.push({ method: request.method(), ref: url.searchParams.get("ref") });
        const status = state.status,
          body = state.raw ?? JSON.stringify(state.body);
        if (state.hold)
          await new Promise<void>((resolve) => {
            state.release = resolve;
          });
        await route.fulfill({ status, contentType: "application/json", body }).catch(() => {});
      } else if (url.pathname === "/generate-key") {
        state.generations++;
        if (state.holdGeneration)
          await new Promise<void>((resolve) => {
            state.releaseGeneration = resolve;
          });
        await route
          .fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({ ok: true, key: "LOCAL-FIXTURE-NOT-A-LICENSE", remaining: 4 }),
          })
          .catch(() => {});
      } else {
        state.gateCalls++;
        await route.abort();
      }
    },
  );
  return state;
}
const retry = (page: Page) => page.getByRole("button", { name: "Retry link check", exact: true });
async function open(page: Page, url: string) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
  await expect(page.getByRole("heading", { name: "Claim your key", exact: true })).toBeVisible({
    timeout: 15000,
  });
}
async function noGrant(state: Awaited<ReturnType<typeof fixture>>) {
  expect(state.generations).toBe(0);
  expect(state.gateCalls).toBe(0);
  expect(state.requests.every((request) => request.method === "GET")).toBe(true);
}

test("missing link stays local and does not contact the gate or generator", async ({ page }) => {
  const state = await fixture(page);
  await open(page, "/generator");
  await expect(page.getByRole("alert").filter({ hasText: "Something's missing" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Start again", exact: true })).toBeVisible();
  expect(state.requests).toEqual([]);
  await noGrant(state);
});

test("service failure preserves the link and retries only its read", async ({ page }, info) => {
  const state = await fixture(page);
  state.status = 503;
  state.body = { valid: false, reason: "expired" };
  await open(page, "/generator?ref=local%2Bfixture%26ref");
  await expect(retry(page)).toBeVisible();
  const initialRequests = state.requests.length;
  await expect(page.getByText(/10 minutes and that time is up/)).toHaveCount(0);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect((await retry(page).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({
      path: info.outputPath(`generator-lookup-${width}.png`),
      fullPage: true,
    });
  }
  state.status = 200;
  state.body = { valid: false, reason: "used" };
  await retry(page).click();
  await expect(page.getByRole("alert").filter({ hasText: "already used this link" })).toBeVisible();
  expect(state.requests).toHaveLength(initialRequests + 1);
  expect(state.requests.every((request) => request.ref === "local+fixture&ref")).toBe(true);
  await noGrant(state);
});

test("malformed lookup bodies never count as valid or conclusively invalid links", async ({
  page,
}) => {
  const state = await fixture(page);
  const malformed = [null, [], { valid: "true" }, { valid: true, reason: 1 }, { other: true }];
  let completedRequests = 0;
  for (let index = 0; index < malformed.length; index++) {
    state.body = malformed[index];
    if (index === 0) await open(page, "/generator?ref=local-fixture");
    else {
      await retry(page).click();
      await expect.poll(() => state.requests.length).toBe(completedRequests + 1);
    }
    await expect(retry(page)).toBeVisible();
    completedRequests = state.requests.length;
    await expect(page.getByRole("button", { name: "Get my key", exact: true })).toHaveCount(0);
  }
  state.raw = "{invalid json";
  await retry(page).click();
  await expect.poll(() => state.requests.length).toBe(completedRequests + 1);
  await expect(retry(page)).toBeVisible();
  await noGrant(state);
});

test("a failed check can recover to verified readiness without issuing a key", async ({ page }) => {
  const state = await fixture(page);
  state.status = 502;
  await open(page, "/generator?ref=local-fixture");
  await expect(retry(page)).toBeVisible();
  const initialRequests = state.requests.length;
  state.status = 200;
  state.body = { valid: true };
  await retry(page).click();
  await expect(page.getByText("Local verification fixture")).toBeVisible();
  await expect(page.getByRole("button", { name: "Get my key", exact: true })).toBeEnabled({
    timeout: 15000,
  });
  expect(state.requests).toHaveLength(initialRequests + 1);
  await noGrant(state);
});

test("stalled checks reach a bounded retry state and ignore late readiness", async ({ page }) => {
  const state = await fixture(page);
  state.hold = true;
  state.body = { valid: true };
  await open(page, "/generator?ref=local-fixture");
  await expect(page.getByText("Checking your link…", { exact: true })).toBeVisible();
  await expect(retry(page)).toBeVisible({ timeout: 15000 });
  const initialRequests = state.requests.length;
  state.release?.();
  await page.waitForTimeout(300);
  await expect(retry(page)).toBeVisible();
  expect(state.requests).toHaveLength(initialRequests);
  await expect(page.getByText("Local verification fixture")).toHaveCount(0);
  state.hold = false;
  state.body = { valid: false, reason: "expired" };
  await retry(page).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "10 minutes and that time is up" }),
  ).toBeVisible();
  expect(state.requests).toHaveLength(initialRequests + 1);
  await noGrant(state);
});

test("leaving the page aborts its lookup and prevents a late widget", async ({ page }) => {
  const state = await fixture(page);
  state.hold = true;
  state.body = { valid: true };
  await open(page, "/generator?ref=local-fixture");
  await expect.poll(() => !!state.release).toBe(true);
  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /Dynamons World/ })).toBeVisible();
  state.release?.();
  await page.waitForTimeout(300);
  expect(
    await page.evaluate(() => (window as unknown as { fixtureWidgets: number }).fixtureWidgets),
  ).toBe(0);
  await noGrant(state);
});

test("a late generation response cannot copy or announce a key after navigation", async ({
  page,
}) => {
  const state = await fixture(page);
  state.body = { valid: true };
  state.holdGeneration = true;
  await open(page, "/generator?ref=local-fixture");
  const generate = page.getByRole("button", { name: "Get my key", exact: true });
  await expect(generate).toBeEnabled({ timeout: 15000 });
  await generate.click();
  await expect.poll(() => !!state.releaseGeneration).toBe(true);
  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: /Dynamons World/ })).toBeVisible();
  state.releaseGeneration?.();
  await page.waitForTimeout(400);
  await expect(page.getByText("Your key is ready and copied!", { exact: true })).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { fixtureCopies: number }).fixtureCopies),
  ).toBe(0);
  expect(state.generations).toBe(1);
  expect(state.gateCalls).toBe(0);
});
