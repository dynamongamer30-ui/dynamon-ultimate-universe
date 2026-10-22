import { useId } from "react";
import { Palette } from "lucide-react";
import { WEBSITE_THEMES, isWebsiteTheme } from "@/lib/websiteThemes";
import { useWebsiteTheme } from "@/hooks/useWebsiteTheme";

export function WebsiteThemeSelector() {
  const id = useId();
  const { theme, config, setTheme } = useWebsiteTheme();
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground">
      <Palette className="h-4 w-4 shrink-0" aria-hidden="true" />
      <label className="sr-only" htmlFor={id}>
        Website theme
      </label>
      <select
        id={id}
        value={theme}
        onChange={(event) => {
          if (isWebsiteTheme(event.target.value)) setTheme(event.target.value);
        }}
        className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none"
      >
        {WEBSITE_THEMES.filter((option) => config.enabledThemes.includes(option.id)).map(
          (option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ),
        )}
      </select>
    </div>
  );
}
