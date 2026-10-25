import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useSiteSettings } from "./useSiteSettings";
import {
  DEFAULT_APPEARANCE,
  normalizeWebsiteAppearance,
  isWebsiteTheme,
  websitePaletteTokens,
  WEBSITE_THEME_STORAGE,
  type WebsiteAppearance,
  type WebsiteThemeId,
} from "@/lib/websiteThemes";

type Preview = { config: WebsiteAppearance; theme: WebsiteThemeId } | null;
const ThemeContext = createContext({
  theme: "royal-black" as WebsiteThemeId,
  config: DEFAULT_APPEARANCE,
  setTheme: (_theme: WebsiteThemeId) => {},
  preview: (_value: Preview) => {},
});

export function WebsiteThemeProvider({ children }: { children: ReactNode }) {
  const { websiteAppearance, loading } = useSiteSettings();
  const config = useMemo(() => normalizeWebsiteAppearance(websiteAppearance), [websiteAppearance]);
  const [selected, setSelected] = useState<WebsiteThemeId | null>(null);
  const [preview, setPreview] = useState<Preview>(null);
  useEffect(() => {
    const restore = () => {
      try {
        const value = localStorage.getItem(WEBSITE_THEME_STORAGE);
        setSelected(isWebsiteTheme(value) ? value : null);
      } catch {
        setSelected(null);
      }
    };
    restore();
    const onStorage = (event: StorageEvent) => {
      if (event.key === WEBSITE_THEME_STORAGE) restore();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  const activeConfig = preview?.config ?? config;
  const theme =
    preview?.theme ??
    (selected && (loading || config.enabledThemes.includes(selected))
      ? selected
      : config.defaultTheme);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.websiteTheme = theme;
    const palette = websitePaletteTokens(theme, activeConfig.palettes[theme]);
    for (const [key, color] of Object.entries(palette))
      root.style.setProperty(`--theme-${key}`, color);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", getComputedStyle(root).getPropertyValue("--background").trim());
  }, [theme, activeConfig]);
  const setTheme = (id: WebsiteThemeId) => {
    if (!config.enabledThemes.includes(id)) return;
    setPreview(null);
    setSelected(id);
    try {
      localStorage.setItem(WEBSITE_THEME_STORAGE, id);
    } catch {
      /* Selection still works without persistence. */
    }
  };
  return (
    <ThemeContext.Provider value={{ theme, config, setTheme, preview: setPreview }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useWebsiteTheme = () => useContext(ThemeContext);
