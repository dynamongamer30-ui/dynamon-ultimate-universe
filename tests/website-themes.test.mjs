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

test("built-in palettes match the supplied native menu, including neutral Royal Black", async () => {
  const css = await readFile(new URL("../src/website-themes.css", import.meta.url), "utf8");
  assert.deepEqual(
    themes.WEBSITE_THEMES.map((theme) => theme.accent),
    [
      "#b4bbc4",
      "#7c3aed",
      "#f97316",
      "#38bdf8",
      "#22d3ee",
      "#84cc16",
      "#e0e7ff",
      "#fde047",
      "#e9d5ff",
    ],
  );
  const black = themes.builtInWebsitePalette("royal-black");
  assert.equal(black.background, "#08090c");
  assert.equal(black.card, "#1b1e23");
  assert.equal(black.elevated, "#111318");
  assert.equal(black.text, "#f3f5f7");
  assert.equal(black.muted, "#abb3bd");
  assert.equal(black.accentEnd, "#e2e6eb");
  for (const theme of themes.WEBSITE_THEMES) {
    const selector =
      theme.id === "royal-black" ? ":root" : `:root[data-website-theme="${theme.id}"]`;
    const block = css.slice(
      css.indexOf(selector + " {"),
      css.indexOf("}", css.indexOf(selector + " {")),
    );
    for (const [key, value] of Object.entries(themes.websitePaletteTokens(theme.id)))
      assert.ok(
        block.includes(`--theme-${key}: ${value};`),
        `${theme.id}/${key}: CSS and runtime agree`,
      );
  }
});

test("native accents, readable ink and both button gradient endpoints retain contrast", () => {
  for (const theme of themes.WEBSITE_THEMES) {
    const palette = themes.websitePaletteTokens(theme.id);
    for (const bg of [palette.background, palette.card, palette.elevated]) {
      for (const fg of [palette.text, palette.muted, palette.accentEnd])
        assert.ok(themes.contrastRatio(bg, fg) >= 4.5, `${theme.id} ink`);
    }
    for (const bg of [palette.accent, palette.controlEnd])
      assert.ok(themes.contrastRatio(bg, palette.onAccent) >= 4.5, `${theme.id} control`);
    const normalized = themes.normalizeWebsiteAppearance({
      schema: 1,
      palettes: { [theme.id]: { accent: theme.accent } },
    });
    assert.equal(normalized.palettes[theme.id]?.accent, theme.accent);
  }
  assert.equal(themes.websitePaletteTokens("dark").onAccent, "#ffffff");
  assert.equal(
    themes.normalizeWebsiteAppearance({
      schema: 1,
      palettes: { "royal-black": { accentEnd: "#08090c" } },
    }).palettes["royal-black"],
    undefined,
  );
});
