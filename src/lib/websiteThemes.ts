export const WEBSITE_THEMES = [
  {
    id: "royal-black",
    name: "Royal Black",
    accent: "#b4bbc4",
    description: "Black, charcoal & silver",
  },
  { id: "dark", name: "Royal Void", accent: "#7c3aed", description: "Amethyst & midnight" },
  { id: "fire", name: "Fire", accent: "#f97316", description: "Ember & volcanic stone" },
  { id: "thunder", name: "Thunder", accent: "#38bdf8", description: "Lightning & storm blue" },
  { id: "water", name: "Water", accent: "#22d3ee", description: "Tidal blue & sea glass" },
  { id: "earth", name: "Earth", accent: "#84cc16", description: "Moss & forest shadow" },
  { id: "diamond", name: "Diamond", accent: "#e0e7ff", description: "Silver & glacial slate" },
  { id: "gold", name: "Gold", accent: "#fde047", description: "Gold & bronze" },
  { id: "spirit", name: "Spirit", accent: "#e9d5ff", description: "Orchid & twilight" },
] as const;

export type WebsiteThemeId = (typeof WEBSITE_THEMES)[number]["id"];
export const WEBSITE_THEME_STORAGE = "dg-website-theme-v1";
export const WEBSITE_APPEARANCE_KEY = "website_appearance";
export const PALETTE_KEYS = [
  "background",
  "card",
  "elevated",
  "text",
  "muted",
  "accent",
  "accentEnd",
] as const;
export type WebsitePalette = Partial<Record<(typeof PALETTE_KEYS)[number], string>>;

// Read-only port of the supplied RoyalVoid ThemeManager defaults and RGB mixing.
const NATIVE_DEEP = [
  "#464b52",
  "#4a168f",
  "#7f1d1d",
  "#1e3a8a",
  "#0e5364",
  "#354513",
  "#35445c",
  "#694008",
  "#312e81",
];
const NATIVE_HIGHLIGHT = [
  "#e2e6eb",
  "#cbb5ff",
  "#ffba88",
  "#a1dbff",
  "#9aeef7",
  "#d2ee99",
  "#eef1ff",
  "#ffe99a",
  "#f1dfff",
];
function mix(first: string, second: string, ratio: number) {
  return (
    "#" +
    [1, 3, 5]
      .map((offset) =>
        Math.round(
          parseInt(first.slice(offset, offset + 2), 16) * (1 - ratio) +
            parseInt(second.slice(offset, offset + 2), 16) * ratio,
        )
          .toString(16)
          .padStart(2, "0"),
      )
      .join("")
  );
}
export function builtInWebsitePalette(id: WebsiteThemeId) {
  const index = WEBSITE_THEMES.findIndex((theme) => theme.id === id);
  const accent = WEBSITE_THEMES[index].accent;
  const background = index === 0 ? "#08090c" : mix("#08090f", accent, 0.045);
  const card = index === 0 ? "#1b1e23" : mix("#11131c", accent, 0.1);
  return {
    background,
    card,
    elevated: index === 0 ? "#111318" : mix("#0b0c14", accent, 0.085),
    text: index === 0 ? "#f3f5f7" : "#f5f4fb",
    muted: index === 0 ? "#abb3bd" : mix("#bbc0cd", NATIVE_HIGHLIGHT[index], 0.12),
    accent,
    accentEnd: NATIVE_HIGHLIGHT[index],
    deep: NATIVE_DEEP[index],
    border: index === 0 ? "#3a4049" : mix("#30333e", accent, 0.16),
    input: index === 0 ? "#171a1f" : mix(background, card, 0.65),
    success: index === 0 ? "#86cab2" : "#72dbc0",
    error: index === 0 ? "#ff9696" : "#ff8b98",
  };
}

export function websitePaletteTokens(id: WebsiteThemeId, custom?: WebsitePalette) {
  const palette = { ...builtInWebsitePalette(id), ...custom };
  const foreground = contrastRatio(palette.accent, "#101114") >= 4.5 ? "#101114" : "#ffffff";
  const end =
    contrastRatio(palette.accentEnd, foreground) >= 4.5
      ? palette.accentEnd
      : contrastRatio(palette.deep, foreground) >= 4.5
        ? palette.deep
        : palette.accent;
  return { ...palette, onAccent: foreground, controlEnd: end };
}
export type WebsiteAppearance = {
  schema: 1;
  defaultTheme: WebsiteThemeId;
  enabledThemes: WebsiteThemeId[];
  palettes: Partial<Record<WebsiteThemeId, WebsitePalette>>;
};

export const DEFAULT_APPEARANCE: WebsiteAppearance = {
  schema: 1,
  defaultTheme: "royal-black",
  enabledThemes: WEBSITE_THEMES.map((t) => t.id),
  palettes: {},
};

export function isWebsiteTheme(value: unknown): value is WebsiteThemeId {
  return WEBSITE_THEMES.some((theme) => theme.id === value);
}

export function contrastRatio(a: string, b: string): number {
  const luminance = (color: string) => {
    const [r, g, blue] = color
      .slice(1)
      .match(/.{2}/g)!
      .map((hex) => {
        const value = parseInt(hex, 16) / 255;
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
      });
    return 0.2126 * r + 0.7152 * g + 0.0722 * blue;
  };
  const first = luminance(a),
    second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function normalizeWebsiteAppearance(value: unknown): WebsiteAppearance {
  if (!value || typeof value !== "object" || Array.isArray(value)) return DEFAULT_APPEARANCE;
  const raw = value as Record<string, unknown>;
  if (raw.schema !== 1) return DEFAULT_APPEARANCE;
  const enabled = WEBSITE_THEMES.map((theme) => theme.id).filter(
    (id) => !Array.isArray(raw.enabledThemes) || raw.enabledThemes.includes(id),
  );
  if (!enabled.length) enabled.push("royal-black");
  const palettes: WebsiteAppearance["palettes"] = {};
  if (raw.palettes && typeof raw.palettes === "object" && !Array.isArray(raw.palettes)) {
    for (const theme of WEBSITE_THEMES) {
      const source = (raw.palettes as Record<string, unknown>)[theme.id];
      if (!source || typeof source !== "object" || Array.isArray(source)) continue;
      const palette: WebsitePalette = {};
      for (const key of PALETTE_KEYS) {
        const color = (source as Record<string, unknown>)[key];
        if (typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color))
          palette[key] = color.toLowerCase();
      }
      // These are dark website palettes. Reject unreadable customization rather than publishing it.
      const resolved = { ...builtInWebsitePalette(theme.id), ...palette };
      const backgrounds = [resolved.background, resolved.card, resolved.elevated];
      const foregrounds = [resolved.text, resolved.muted, resolved.accentEnd];
      if (backgrounds.some((bg) => foregrounds.some((fg) => contrastRatio(bg, fg) < 4.5))) continue;
      if (backgrounds.some((bg) => contrastRatio(resolved.accent, bg) < 3)) continue;
      if (
        Math.max(
          contrastRatio(resolved.accent, "#101114"),
          contrastRatio(resolved.accent, "#ffffff"),
        ) < 4.5
      )
        continue;
      palettes[theme.id] = palette;
    }
  }
  return {
    schema: 1,
    defaultTheme:
      isWebsiteTheme(raw.defaultTheme) && enabled.includes(raw.defaultTheme)
        ? raw.defaultTheme
        : enabled[0],
    enabledThemes: enabled,
    palettes,
  };
}
