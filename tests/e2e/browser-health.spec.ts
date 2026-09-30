import { test } from "@playwright/test";
import { assertHealthyPage, assertNoHorizontalOverflow } from "./helpers";

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(viewport.name + " home page has no horizontal overflow", async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/", { waitUntil: "networkidle" });
    await assertHealthyPage(page);
    await assertNoHorizontalOverflow(page);
  });
}
