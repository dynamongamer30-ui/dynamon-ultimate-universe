import { useId } from "react";
import { Palette } from "lucide-react";
import { WEBSITE_THEMES, isWebsiteTheme } from "@/lib/websiteThemes";
import { useWebsiteTheme } from "@/hooks/useWebsiteTheme";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function WebsiteThemeSelector() {
  const id = useId();
  const { theme, config, setTheme } = useWebsiteTheme();
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-card px-3 text-muted-foreground">
      <Palette className="h-4 w-4 shrink-0" aria-hidden="true" />
      <label className="sr-only" htmlFor={id}>
        Website theme
      </label>
      <Select
        value={theme}
        onValueChange={(value) => {
          if (isWebsiteTheme(value)) setTheme(value);
        }}
      >
        <SelectTrigger
          id={id}
          aria-label="Website theme"
          className="min-h-11 min-w-0 flex-1 gap-2 border-0 bg-transparent px-0 text-sm text-foreground shadow-none"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="z-[120] min-w-48 rounded-xl border-border bg-card p-1 text-foreground shadow-xl"
          position="popper"
        >
          {WEBSITE_THEMES.filter((option) => config.enabledThemes.includes(option.id)).map(
            (option) => (
              <SelectItem
                className="min-h-11 cursor-pointer rounded-lg focus:bg-primary/15 focus:text-foreground"
                key={option.id}
                value={option.id}
              >
                {option.name}
              </SelectItem>
            ),
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
