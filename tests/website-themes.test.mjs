import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import test from "node:test";

const source = await readFile(new URL("../src/lib/websiteThemes.ts", import.meta.url), "utf8");
const themes = await import(
  `data:text/javascript;base64,${Buffer.from(stripTypeScriptTypes(source)).toString("base64")}`
);

test("website-only schema includes nine themes without changing native DEX identifiers", () => {
  assert.equal(themes.WEBSITE_THEMES.length, 9);
  assert.equal(themes.DEFAULT_APPEARANCE.defaultTheme, "royal-black");
  const native = themes.WEBSITE_THEMES.filter((t) => t.id !== "royal-black").map((t) => t.id);
  assert.deepEqual(native, [
    "dark",
    "fire",
    "thunder",
    "water",
    "earth",
    "diamond",
    "gold",
    "spirit",
  ]);
});
test("invalid schema, disabled defaults and unknown themes safely fall back", () => {
  for (const raw of [null, [], "fire", { schema: 2 }])
    assert.deepEqual(themes.normalizeWebsiteAppearance(raw), themes.DEFAULT_APPEARANCE);
  assert.equal(
    themes.normalizeWebsiteAppearance({
      schema: 1,
      enabledThemes: ["fire"],
      defaultTheme: "unknown",
    }).defaultTheme,
    "fire",
  );
  assert.deepEqual(
    themes.normalizeWebsiteAppearance({ schema: 1, enabledThemes: [] }).enabledThemes,
    ["royal-black"],
  );
});
test("untrusted colors and unreadable palettes cannot become theme tokens", () => {
  const normalize = (palettes) =>
    themes.normalizeWebsiteAppearance({ schema: 1, palettes }).palettes;
  assert.equal(normalize({ fire: { accent: "url(javascript:alert(1))" } }).fire?.accent, undefined);
  assert.equal(normalize({ fire: { background: "#ffffff", text: "#ffffff" } }).fire, undefined);
  assert.equal(normalize({ fire: { accent: "#101010" } }).fire, undefined);
  assert.equal(normalize({ fire: { accent: "#FFB07A" } }).fire.accent, "#ffb07a");
});
test("contrast uses WCAG relative luminance", () => {
  assert.equal(themes.contrastRatio("#ffffff", "#000000"), 21);
  assert.equal(themes.contrastRatio("#111111", "#111111"), 1);
});
