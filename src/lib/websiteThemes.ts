export const WEBSITE_THEMES = [
  {
    id: "royal-black",
    name: "Royal Black",
    accent: "#e5c480",
    description: "Obsidian & champagne",
  },
  { id: "dark", name: "Royal Void", accent: "#c4a1ff", description: "Amethyst & midnight" },
  { id: "fire", name: "Fire", accent: "#ffb07a", description: "Ember & volcanic stone" },
  { id: "thunder", name: "Thunder", accent: "#9ed8ff", description: "Lightning & storm blue" },
  { id: "water", name: "Water", accent: "#84e6ee", description: "Tidal blue & sea glass" },
  { id: "earth", name: "Earth", accent: "#c5dfa1", description: "Moss & forest shadow" },
  { id: "diamond", name: "Diamond", accent: "#c8d9ee", description: "Silver & glacial slate" },
  { id: "gold", name: "Gold", accent: "#f0d687", description: "Antique gold & bronze" },
  { id: "spirit", name: "Spirit", accent: "#e5c6fb", description: "Orchid & twilight" },
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
      const backgrounds = [
        palette.background ?? "#080a0d",
        palette.card ?? "#171c23",
        palette.elevated ?? "#242b35",
      ];
      const foregrounds = [palette.text ?? "#f5f4f0", palette.muted ?? "#b5bac3"];
      if (backgrounds.some((bg) => foregrounds.some((fg) => contrastRatio(bg, fg) < 4.5))) continue;
      if (palette.accent && contrastRatio(palette.accent, "#101114") < 4.5) continue;
      if (palette.accentEnd && contrastRatio(palette.accentEnd, "#101114") < 4.5) continue;
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
