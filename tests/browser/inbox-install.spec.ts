import { expect, test, type Page } from "@playwright/test";

test.beforeEach(async ({ page }, info) => {
  test.setTimeout(60000);
  test.skip(
    !info.project.use.baseURL?.startsWith("http://127.0.0.1"),
    "Local intercepted fixtures only.",
  );
  page.on("pageerror", (error) => {
    throw error;
  });
  await page.routeWebSocket(/supabase\.co/, (socket) => socket.close());
});

async function fixture(page: Page, signedIn = true) {
  const id = "00000000-0000-4000-8000-000000000041";
  const expires = Math.floor(Date.now() / 1000) + 86400;
  const user = {
    id,
    email: "inbox@example.test",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: {},
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: id, exp: expires, role: "authenticated" })).toString("base64url")}.fixture`;
  await page.addInitScript(
    ({ user, token, expires, signedIn }) => {
      if (signedIn)
        localStorage.setItem(
          "sb-dfxcpxzylyycrirtnkof-auth-token",
          JSON.stringify({
            access_token: token,
            refresh_token: "local-inbox-fixture",
            expires_at: expires,
            expires_in: 86400,
            token_type: "bearer",
            user,
          }),
        );
      sessionStorage.setItem(`notif-skipped:${user.id}`, "1");
      sessionStorage.setItem(
        `streak-checkin:${user.id}:${new Date().toISOString().slice(0, 10)}`,
        "confirmed",
      );
      const state = window as unknown as { copies: number; denyCopy: boolean };
      state.copies = 0;
      state.denyCopy = false;
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            state.copies++;
            if (state.denyCopy) throw new Error("Local denied clipboard");
          },
        },
      });
    },
    { user, token, expires, signedIn },
  );
  const state = {
    inboxReads: 0,
    receiptReads: 0,
    writes: [] as string[],
    hold: false,
    release: undefined as (() => void) | undefined,
  };
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    let data: unknown = [];
    if (!["GET", "HEAD", "OPTIONS"].includes(request.method())) state.writes.push(url.pathname);
    if (url.pathname === "/auth/v1/user") data = user;
    else if (url.pathname.endsWith("/rpc/get_my_profile"))
      data = [{ id, username: "inbox_fixture", display_name: "Inbox Fixture", is_owner: false }];
    else if (url.pathname.endsWith("/notifications")) {
      state.inboxReads++;
      if (state.hold)
        await new Promise<void>((resolve) => {
          state.release = resolve;
        });
      data = [
        {
          id: "00000000-0000-4000-8000-000000000042",
          title: "Local inbox update",
          body: "Copy this fixture key DG-LOCALFIXTURE " + "LongWord".repeat(35),
          created_at: "2026-10-25T00:00:00Z",
          reward_kind: "phoenix_pass",
          reward_ref: "local-fixture-pass",
          burn_after_read: false,
        },
      ];
    } else if (url.pathname.endsWith("/notification_reads")) state.receiptReads++;
    else if (url.pathname.endsWith("/public_profiles") && url.searchParams.has("is_owner"))
      data = { display_name: "Fixture sender", avatar_url: null, custom_avatar_url: null };
    else if (url.pathname.endsWith("/notification_prefs"))
      data = { asked_at: "2026-01-01T00:00:00Z" };
    await route
      .fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) })
      .catch(() => {});
  });
  return state;
}
const bell = (page: Page) => page.getByRole("button", { name: "Notifications", exact: true });
const panel = (page: Page) =>
  page.getByRole("region", { name: "Recent notifications", exact: true });
const installRegion = (page: Page) =>
  page.getByRole("region", { name: "Install Dynamon Universe", exact: true });
async function open(page: Page) {
  await page.goto("/mods", { waitUntil: "domcontentloaded" });
  await expect(page.locator("html")).toHaveAttribute("data-site-settings-ready", "true", {
    timeout: 15000,
  });
}

test("inbox loading reaches a bounded error and a manual retry shares fresh reads", async ({
  page,
}) => {
  const state = await fixture(page);
  state.hold = true;
  await open(page);
  await bell(page).click();
  await expect(panel(page).getByRole("status")).toHaveText("Loading notifications…");
  await expect(panel(page).getByText("No notifications yet.", { exact: true })).toHaveCount(0);
  await expect(panel(page).getByText("Could not load notifications.", { exact: true })).toBeVisible(
    { timeout: 15000 },
  );
  expect(state.inboxReads).toBe(1);
  state.hold = false;
  state.release?.();
  await panel(page).getByRole("button", { name: "Try again", exact: true }).click();
  await expect(
    panel(page).getByRole("link", { name: "Local inbox update", exact: true }),
  ).toBeVisible();
  expect(state.inboxReads).toBe(2);
  expect(state.receiptReads).toBe(2);
  expect(state.writes.filter((path) => !path.includes("/rpc/"))).toEqual([]);
});

test("keyboard key copy stays in the panel, reports denial and never marks or claims", async ({
  page,
}, info) => {
  const state = await fixture(page);
  await open(page);
  const headerHeight = await page
    .locator("header.site-chrome")
    .evaluate((element) => element.getBoundingClientRect().height);
  await bell(page).click();
  const key = panel(page).getByRole("button", { name: "Copy key DG-LOCALFIXTURE", exact: true });
  await expect(key).toBeVisible();
  expect(
    await page
      .locator("header.site-chrome")
      .evaluate((element) => element.getBoundingClientRect().height),
  ).toBeLessThanOrEqual(headerHeight + 1);
  const before = [...state.writes];
  await page.evaluate(() => {
    (window as unknown as { denyCopy: boolean }).denyCopy = true;
  });
  await key.focus();
  await key.press("Enter");
  await expect(
    page.getByText("Could not copy — press and hold the key to copy it", { exact: true }),
  ).toBeVisible();
  await expect(panel(page)).toBeVisible();
  await expect(page).toHaveURL(/\/mods$/);
  await page.evaluate(() => {
    (window as unknown as { denyCopy: boolean }).denyCopy = false;
  });
  await key.press("Space");
  await expect(page.getByText("Key copied", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { copies: number }).copies)).toBe(2);
  expect(state.writes).toEqual(before);
  const claim = panel(page).getByRole("link", { name: "Claim your pass", exact: true });
  await expect(claim).toHaveAttribute("href", /\/claim\?/);
  expect(
    await claim.evaluate((element) => element.parentElement?.closest('[role="link"], a')),
  ).toBeNull();
  for (const width of [320, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(panel(page)).toBeInViewport({ ratio: 1 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    for (const target of [key, claim, panel(page).getByRole("button", { name: "Mark all read" })])
      expect((await target.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: info.outputPath(`inbox-controls-${width}.png`) });
  }
  await page.screenshot({ path: info.outputPath("inbox-controls.png") });
});

test("notification disclosure closes on Escape, focus departure and navigation", async ({
  page,
}) => {
  await fixture(page);
  await open(page);
  await bell(page).click();
  await panel(page).getByRole("button", { name: "Copy key DG-LOCALFIXTURE" }).focus();
  await page.keyboard.press("Escape");
  await expect(bell(page)).toBeFocused();
  await expect(panel(page)).toHaveCount(0);
  await bell(page).click();
  await page.getByRole("link", { name: "Dynamon Universe home", exact: true }).focus();
  await expect(panel(page)).toHaveCount(0);
  await bell(page).click();
  await panel(page).getByRole("link", { name: "View all notifications", exact: true }).click();
  await expect(page).toHaveURL(/\/notifications$/);
  await expect(panel(page)).toHaveCount(0);
});

async function suggestInstall(page: Page, mode: "hold" | "reject" = "hold") {
  await page.evaluate((mode) => {
    const state = window as unknown as {
      promptCalls: number;
      finishInstall?: () => void;
      suggestAgain?: () => void;
    };
    state.promptCalls = 0;
    state.suggestAgain = () => {
      const event = new Event("beforeinstallprompt", { cancelable: true });
      Object.assign(event, {
        prompt: async () => {
          state.promptCalls++;
          if (mode === "reject") throw new Error("Local install withdrawn");
        },
        userChoice: new Promise((resolve) => {
          state.finishInstall = () => resolve({ outcome: "dismissed" });
        }),
      });
      window.dispatchEvent(event);
    };
    state.suggestAgain();
  }, mode);
  await expect(installRegion(page)).toBeVisible({ timeout: 10000 });
}

test("install suggestion submits once while pending and fits narrow layouts", async ({
  page,
}, info) => {
  await fixture(page, false);
  await open(page);
  await suggestInstall(page);
  for (const width of [320, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(installRegion(page)).toBeInViewport({ ratio: 1 });
    expect(
      await installRegion(page).evaluate((element) => getComputedStyle(element).position),
    ).toBe("fixed");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
      ),
    ).toBe(true);
    for (const button of await installRegion(page).getByRole("button").all())
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await page.screenshot({ path: info.outputPath(`install-controls-${width}.png`) });
  }
  await page.screenshot({ path: info.outputPath("install-controls.png") });
  await installRegion(page)
    .getByRole("button", { name: "Install", exact: true })
    .evaluate((button) => {
      (button as HTMLButtonElement).click();
      (button as HTMLButtonElement).click();
    });
  await expect(
    installRegion(page).getByRole("button", { name: "Installing…", exact: true }),
  ).toBeDisabled();
  expect(
    await page.evaluate(() => (window as unknown as { promptCalls: number }).promptCalls),
  ).toBe(1);
  await page.evaluate(() =>
    (window as unknown as { finishInstall?: () => void }).finishInstall?.(),
  );
  await expect(installRegion(page)).toHaveCount(0);
});

test("withdrawn install eligibility closes without an unhandled error", async ({ page }) => {
  await fixture(page, false);
  await open(page);
  await suggestInstall(page, "reject");
  await installRegion(page).getByRole("button", { name: "Install", exact: true }).click();
  await expect(installRegion(page)).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { promptCalls: number }).promptCalls),
  ).toBe(1);
});

test("install dismissal survives blocked storage and repeated eligibility events", async ({
  page,
}) => {
  await fixture(page, false);
  await open(page);
  await suggestInstall(page);
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Local blocked storage", "SecurityError");
    };
  });
  await installRegion(page)
    .getByRole("button", { name: "Dismiss install suggestion", exact: true })
    .click();
  await page.evaluate(() => (window as unknown as { suggestAgain?: () => void }).suggestAgain?.());
  await page.waitForTimeout(4500);
  await expect(installRegion(page)).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as unknown as { promptCalls: number }).promptCalls),
  ).toBe(0);
});

test("installed event dismisses the suggestion and prevents another prompt", async ({ page }) => {
  await fixture(page, false);
  await open(page);
  await suggestInstall(page);
  await page.evaluate(() => {
    window.dispatchEvent(new Event("appinstalled"));
    (window as unknown as { suggestAgain?: () => void }).suggestAgain?.();
  });
  await page.waitForTimeout(4500);
  await expect(installRegion(page)).toHaveCount(0);
});
