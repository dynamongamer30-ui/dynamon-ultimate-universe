import { test } from "@playwright/test";
import { assertHealthyPage, assertNoBrokenImages } from "./helpers";

test("home page loads without browser errors or broken visuals", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto("/", { waitUntil: "networkidle" });
  await assertHealthyPage(page);
  await assertNoBrokenImages(page);

  if (pageErrors.length) {
    throw new Error("Unhandled browser errors:\n" + pageErrors.join("\n"));
  }
});
