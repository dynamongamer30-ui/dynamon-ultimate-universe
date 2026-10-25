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
    generationStatus: 200,
    generationBody: { ok: true, key: "LOCAL-FIXTURE-NOT-A-LICENSE", remaining: 4 } as unknown,
    holdMod: false,
    releaseMod: undefined as (() => void) | undefined,
    modReads: 0,
  };
  await page.addInitScript(() => {
    const capture = window as unknown as {
      fixtureCopies: number;
      fixtureWidgets: number;
      fixtureCopyMode: string;
      fixtureReleaseCopy?: () => void;
      fixtureVerify?: () => void;
    };
    capture.fixtureCopies = 0;
    capture.fixtureWidgets = 0;
    capture.fixtureCopyMode = "ok";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          capture.fixtureCopies++;
          if (capture.fixtureCopyMode === "deny") throw new Error("Local clipboard denial");
          if (capture.fixtureCopyMode === "hold")
            await new Promise<void>((resolve) => {
              capture.fixtureReleaseCopy = resolve;
            });
        },
      },
    });
    window.turnstile = {
      render: (element, options) => {
        capture.fixtureWidgets++;
        element.textContent = "Local verification fixture";
        options.callback("local-fixture-captcha");
        capture.fixtureVerify = () => options.callback("local-fixture-captcha");
        return "local-widget";
      },
      remove: () => {},
      reset: () => {},
    };
  });
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
  await page.route("**/*.supabase.co/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/mod_overrides") && url.searchParams.get("limit") === "1") {
      state.modReads++;
      if (state.holdMod)
        await new Promise<void>((resolve) => {
          state.releaseMod = resolve;
        });
      await route
        .fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ slug: "local-fixture-mod", updated_at: "2026-10-25T00:00:00Z" }),
        })
        .catch(() => {});
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  });
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
            status: state.generationStatus,
            contentType: "application/json",
            body: JSON.stringify(state.generationBody),
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
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
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
  expect(await page.locator(".route-hero").evaluate((node) => getComputedStyle(node).opacity)).toBe(
    "1",
  );
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
  await expect(page.getByText(/Your key is ready/)).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { fixtureCopies: number }).fixtureCopies),
  ).toBe(0);
  expect(state.generations).toBe(1);
  expect(state.gateCalls).toBe(0);
});

async function ready(page: Page) {
  const state = await fixture(page);
  state.body = { valid: true };
  await open(page, "/generator?ref=local-fixture");
  await expect(page.getByRole("button", { name: "Get my key", exact: true })).toBeEnabled({
    timeout: 15000,
  });
  return state;
}
const keyField = (page: Page) => page.getByRole("textbox", { name: "Your key", exact: true });
const copyStatus = (page: Page) => page.locator("#generated-key-copy-status");
const copyMode = (page: Page, value: string) =>
  page.evaluate((mode) => {
    (window as unknown as { fixtureCopyMode: string }).fixtureCopyMode = mode;
  }, value);

test("unknown generation failure is explicit and cannot replay the request", async ({
  page,
}, info) => {
  const state = await ready(page);
  state.generationStatus = 500;
  state.generationBody = { error: "unavailable" };
  await page.getByRole("button", { name: "Get my key", exact: true }).click();
  await expect(
    page.getByRole("alert").filter({ hasText: "Your request may have completed" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Get my key", exact: true })).toHaveCount(0);
  await expect(keyField(page)).toHaveCount(0);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: info.outputPath(`generation-uncertain-${width}.png`),
      fullPage: true,
    });
  }
  expect(state.generations).toBe(1);
  expect(state.gateCalls).toBe(0);
});

test("stalled generation times out once and ignores a late successful receipt", async ({
  page,
}) => {
  const state = await ready(page);
  state.holdGeneration = true;
  await page.clock.install();
  await page
    .getByRole("button", { name: "Get my key", exact: true })
    .evaluate((button: HTMLButtonElement) => {
      button.click();
      button.click();
    });
  await expect.poll(() => state.generations).toBe(1);
  await page.clock.fastForward(10001);
  await expect(
    page.getByRole("alert").filter({ hasText: "Your request may have completed" }),
  ).toBeVisible();
  state.releaseGeneration?.();
  await page.waitForTimeout(100);
  await expect(keyField(page)).toHaveCount(0);
  expect(state.generations).toBe(1);
  expect(
    await page.evaluate(() => (window as unknown as { fixtureCopies: number }).fixtureCopies),
  ).toBe(0);
});

test("blocked clipboard preserves a selectable key and does not launch the app", async ({
  page,
}, info) => {
  const state = await ready(page);
  await copyMode(page, "deny");
  await page.getByRole("button", { name: "Get my key", exact: true }).click();
  await expect(copyStatus(page)).toContainText("Copy was blocked");
  await expect(keyField(page)).toHaveValue("LOCAL-FIXTURE-NOT-A-LICENSE");
  await expect(keyField(page)).toHaveAttribute("readonly", "");
  await keyField(page).focus();
  expect(
    await keyField(page).evaluate(
      (input: HTMLInputElement) =>
        input.selectionStart === 0 && input.selectionEnd === input.value.length,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Copy & Open App", exact: true }).click();
  await expect(copyStatus(page)).toContainText("Copy was blocked");
  expect(state.modReads).toBe(0);
  for (const width of [320, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    expect(
      (await page.getByRole("button", { name: "Copy key", exact: true }).boundingBox())!.height,
    ).toBeGreaterThanOrEqual(44);
    await page.screenshot({
      path: info.outputPath(`generation-copy-${width}.png`),
      fullPage: true,
    });
  }
  await copyMode(page, "ok");
  const newKey = page.getByRole("button", { name: "New key", exact: true });
  await newKey.hover();
  const contrast = await newKey.evaluate((element) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const context = canvas.getContext("2d")!;
    const style = getComputedStyle(element);
    context.fillStyle = getComputedStyle(document.body).backgroundColor;
    context.fillRect(0, 0, 1, 1);
    context.fillStyle = style.backgroundColor;
    context.fillRect(0, 0, 1, 1);
    const background = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    context.fillStyle = style.color;
    context.fillRect(0, 0, 1, 1);
    const foreground = Array.from(context.getImageData(0, 0, 1, 1).data).slice(0, 3);
    const luminance = (rgb: number[]) =>
      rgb
        .map((value) => {
          const channel = value / 255;
          return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        })
        .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
    const a = luminance(background),
      b = luminance(foreground);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Copy key", exact: true }).click();
  await expect(copyStatus(page)).toHaveText("Key copied");
  expect(state.generations).toBe(1);
  expect(state.gateCalls).toBe(0);
});

test("copy success is announced only after the clipboard promise resolves", async ({ page }) => {
  await ready(page);
  await copyMode(page, "hold");
  await page.getByRole("button", { name: "Get my key", exact: true }).click();
  await expect(copyStatus(page)).toHaveText("Copying key…");
  await expect(page.getByRole("button", { name: "Copy & Open App", exact: true })).toBeDisabled();
  await page.evaluate(() =>
    (window as unknown as { fixtureReleaseCopy?: () => void }).fixtureReleaseCopy?.(),
  );
  await expect(copyStatus(page)).toHaveText("Key copied");
});

test("unused-key countdown does not claim an activated key was revoked", async ({ page }) => {
  const state = await ready(page);
  await page.clock.install();
  await page.getByRole("button", { name: "Get my key", exact: true }).click();
  await expect(copyStatus(page)).toHaveText("Key copied");
  await page.clock.setSystemTime(new Date(Date.now() + 610000));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  await expect(page.getByText(/The unused-key window has passed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Copy & Open App", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Copy again", exact: true }).click();
  await expect(copyStatus(page)).toHaveText("Key copied");
  expect(state.generations).toBe(1);
});

test("a valid key with unknown remaining quota hides the unsupported counter", async ({ page }) => {
  const state = await ready(page);
  state.generationBody = { ok: true, key: "LOCAL-FIXTURE-NOT-A-LICENSE" };
  await page.getByRole("button", { name: "Get my key", exact: true }).click();
  await expect(keyField(page)).toHaveValue("LOCAL-FIXTURE-NOT-A-LICENSE");
  await expect(page.getByText(/keys left in this window|left today/)).toHaveCount(0);
});

test("a fallback lookup finishing after navigation cannot redirect the new page", async ({
  page,
}) => {
  const state = await ready(page);
  // Keep the held lookup pending while slower engines perform the navigation.
  // The lookup deadline is covered separately; this case isolates late completion.
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  state.holdMod = true;
  await page.evaluate(() => {
    const value = navigator.userAgent.replace(/android/gi, "fixture");
    Object.defineProperty(navigator, "userAgent", {
      configurable: true,
      get: () => value,
    });
  });
  await page.getByRole("button", { name: "Get my key", exact: true }).click();
  await expect(copyStatus(page)).toHaveText("Key copied");
  await page.getByRole("button", { name: "Copy & Open App", exact: true }).click();
  await expect.poll(() => !!state.releaseMod).toBe(true);
  await page.getByRole("link", { name: "Home", exact: true }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: /Dynamons World/ })).toBeVisible();
  state.releaseMod?.();
  await page.waitForTimeout(200);
  await expect(page).toHaveURL(/\/$/);
  expect(state.modReads).toBe(1);
});

test("confirmed CAPTCHA rejection permits a fresh manual attempt without auto replay", async ({
  page,
}) => {
  const state = await ready(page);
  state.generationStatus = 403;
  state.generationBody = { error: "captcha_failed" };
  await page.getByRole("button", { name: "Get my key", exact: true }).click();
  await expect(
    page.getByText("The robot check didn’t pass. Please try again.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Get my key", exact: true })).toBeDisabled();
  expect(state.generations).toBe(1);
  state.generationStatus = 200;
  state.generationBody = { ok: true, key: "LOCAL-FIXTURE-NOT-A-LICENSE", remaining: 3 };
  await page.evaluate(() =>
    (window as unknown as { fixtureVerify?: () => void }).fixtureVerify?.(),
  );
  await page.getByRole("button", { name: "Get my key", exact: true }).click();
  await expect(keyField(page)).toHaveValue("LOCAL-FIXTURE-NOT-A-LICENSE");
  expect(state.generations).toBe(2);
});
