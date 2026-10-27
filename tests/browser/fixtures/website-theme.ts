import type { Page } from "@playwright/test";
const names: Record<string, string> = {
  "royal-black": "Royal Black",
  dark: "Royal Void",
  fire: "Fire",
  thunder: "Thunder",
  water: "Water",
  earth: "Earth",
  diamond: "Diamond",
  gold: "Gold",
  spirit: "Spirit",
};
export async function chooseWebsiteTheme(page: Page, id: string) {
  await page.getByRole("combobox", { name: "Website theme", exact: true }).click();
  await page.getByRole("option", { name: names[id], exact: true }).click();
}
