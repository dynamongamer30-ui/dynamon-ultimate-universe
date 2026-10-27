import { useEffect, useRef, useState } from "react";
import { publishWebsiteAppearance } from "@/lib/websiteAppearance";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useWebsiteTheme } from "@/hooks/useWebsiteTheme";
import {
  DEFAULT_APPEARANCE,
  normalizeWebsiteAppearance,
  PALETTE_KEYS,
  WEBSITE_THEMES,
  type WebsiteAppearance,
  type WebsiteThemeId,
} from "@/lib/websiteThemes";
import { Button } from "./ui/button";
import { useAutosave } from "@/hooks/useAutosave";

export function WebsiteAppearanceEditor() {
  const { websiteAppearance, loading, refresh } = useSiteSettings();
  const { preview } = useWebsiteTheme();
  const snapshot = useRef(websiteAppearance);
  const [draft, setDraft] = useState<WebsiteAppearance>(() =>
    normalizeWebsiteAppearance(websiteAppearance),
  );
  const [selected, setSelected] = useState<WebsiteThemeId>(draft.defaultTheme);

  const [previewing, setPreviewing] = useState(false);
  const initialized = useRef(!loading);
  useEffect(() => {
    if (!loading && !initialized.current) {
      initialized.current = true;
      snapshot.current = websiteAppearance;
      const initial = normalizeWebsiteAppearance(websiteAppearance);
      setDraft(initial);
      setSelected(initial.defaultTheme);
    }
  }, [loading, websiteAppearance]);
  useEffect(() => () => preview(null), [preview]);
  const showPreview = () => {
    preview({ config: normalizeWebsiteAppearance(draft), theme: selected });
    setPreviewing(true);
  };
  const autosave = useAutosave({
    value: draft,
    ready: initialized.current,
    validate: (value) => {
      const next = normalizeWebsiteAppearance(value);
      if (!value.enabledThemes.includes(value.defaultTheme) || !value.enabledThemes.length)
        return "Enable the default theme and keep at least one appearance available.";
      if (
        WEBSITE_THEMES.some((theme) =>
          PALETTE_KEYS.some(
            (key) =>
              (next.palettes[theme.id]?.[key] ?? "").toLowerCase() !==
              (value.palettes[theme.id]?.[key] ?? "").toLowerCase(),
          ),
        )
      )
        return "Use six-digit hex colors with readable text and controls.";
      return null;
    },
    save: async (value) => {
      const next = normalizeWebsiteAppearance(value);
      await publishWebsiteAppearance(next, snapshot.current, AbortSignal.timeout(10000));
      snapshot.current = next;
      preview(null);
      setPreviewing(false);
      void refresh(true);
    },
  });
  const busy = autosave.saving,
    publishError = autosave.error;
  const publish = () => void autosave.saveNow();
  return (
    <section
      aria-labelledby="website-appearance-title"
      className="rounded-2xl border border-border bg-card p-5 sm:p-8"
    >
      <p className="text-xs uppercase tracking-widest text-primary-ink">Website appearance</p>
      <h2 id="website-appearance-title" className="mt-2 text-2xl font-semibold">
        Nine worlds. One universe.
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Choose the default appearance, available themes and optional colors. Visitors keep their own
        choice while it is enabled. Changes save automatically; preview is available while editing.
      </p>
      <p role="status" className="mt-3 text-sm text-muted-foreground">
        {autosave.status} · Changes save automatically.
      </p>
      <fieldset disabled={loading} className="mt-6 space-y-5">
        <legend className="sr-only">Website theme settings</legend>
        {publishError && (
          <p role="alert" className="break-words text-destructive">
            {publishError}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          {WEBSITE_THEMES.map((theme) => (
            <label
              key={theme.id}
              className="flex min-h-16 items-center gap-3 rounded-xl border border-border p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={draft.enabledThemes.includes(theme.id)}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    enabledThemes: event.target.checked
                      ? WEBSITE_THEMES.map((t) => t.id).filter(
                          (id) => id === theme.id || draft.enabledThemes.includes(id),
                        )
                      : draft.enabledThemes.filter((id) => id !== theme.id),
                  })
                }
              />
              <span>
                <span className="block font-semibold">{theme.name}</span>
                <span className="text-xs text-muted-foreground">{theme.description}</span>
              </span>
            </label>
          ))}
        </div>
        <label className="block text-sm font-semibold">
          Default website theme
          <select
            aria-label="Default website theme"
            className="control-input mt-2 min-h-11 w-full rounded-xl border px-3"
            value={draft.defaultTheme}
            onChange={(e) => setDraft({ ...draft, defaultTheme: e.target.value as WebsiteThemeId })}
          >
            {WEBSITE_THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Customize palette
          <select
            aria-label="Customize palette"
            className="control-input mt-2 min-h-11 w-full rounded-xl border px-3"
            value={selected}
            onChange={(e) => setSelected(e.target.value as WebsiteThemeId)}
          >
            {WEBSITE_THEMES.map((theme) => (
              <option key={theme.id} value={theme.id}>
                {theme.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          {PALETTE_KEYS.map((key) => (
            <label key={key} className="text-sm capitalize">
              {key}
              <input
                className="control-input mt-1 min-h-11 w-full rounded-xl border px-3"
                maxLength={7}
                placeholder="Built-in color"
                value={draft.palettes[selected]?.[key] ?? ""}
                onChange={(e) => {
                  const palette = { ...draft.palettes[selected] };
                  if (e.target.value) palette[key] = e.target.value;
                  else delete palette[key];
                  setDraft({ ...draft, palettes: { ...draft.palettes, [selected]: palette } });
                }}
              />
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={showPreview}>
            Preview selected theme
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDraft({ ...DEFAULT_APPEARANCE });
              preview(null);
              setPreviewing(false);
            }}
          >
            Reset all to built-ins
          </Button>
          {previewing && (
            <Button
              variant="outline"
              onClick={() => {
                preview(null);
                setPreviewing(false);
              }}
            >
              End preview
            </Button>
          )}
          <Button onClick={publish}>{busy ? "Publishing…" : "Publish website appearance"}</Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Text must meet 4.5:1 contrast. Changes here apply to the website. Native menu themes are
          managed in Key system → Royal Void DEX.
        </p>
      </fieldset>
    </section>
  );
}
