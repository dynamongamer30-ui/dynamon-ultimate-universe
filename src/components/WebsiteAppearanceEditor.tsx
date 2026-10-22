import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
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

export function WebsiteAppearanceEditor() {
  const { websiteAppearance, loading, refresh } = useSiteSettings();
  const { preview } = useWebsiteTheme();
  const snapshot = useRef(websiteAppearance);
  const [draft, setDraft] = useState<WebsiteAppearance>(() =>
    normalizeWebsiteAppearance(websiteAppearance),
  );
  const [selected, setSelected] = useState<WebsiteThemeId>(draft.defaultTheme);
  const [busy, setBusy] = useState(false);
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
  const publish = async () => {
    if (busy || loading) return;
    const next = normalizeWebsiteAppearance(draft);
    if (!draft.enabledThemes.includes(draft.defaultTheme) || !draft.enabledThemes.length) {
      toast.error("Enable the default theme and keep at least one appearance available.");
      return;
    }
    if (
      WEBSITE_THEMES.some((theme) =>
        PALETTE_KEYS.some(
          (key) =>
            (next.palettes[theme.id]?.[key] ?? "").toLowerCase() !==
            (draft.palettes[theme.id]?.[key] ?? "").toLowerCase(),
        ),
      )
    ) {
      toast.error(
        "Use six-digit hex colors with readable text and controls. Invalid palettes cannot be published.",
      );
      return;
    }
    setBusy(true);
    try {
      await publishWebsiteAppearance(next, snapshot.current);
      snapshot.current = next;
      await refresh();
      preview(null);
      setPreviewing(false);
      toast.success("Website appearance published");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Could not publish. Reload to check for changes in another session.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-labelledby="website-appearance-title"
      className="rounded-2xl border border-border bg-card p-5 sm:p-8"
    >
      <p className="text-xs uppercase tracking-widest text-primary">Website appearance</p>
      <h2 id="website-appearance-title" className="mt-2 text-2xl font-semibold">
        Nine worlds. One universe.
      </h2>
      <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
        Choose the default appearance, available themes and optional colors. Visitors keep their own
        choice while it is enabled. Preview changes before publishing.
      </p>
      <fieldset disabled={busy || loading} className="mt-6 space-y-5">
        <legend className="sr-only">Website theme settings</legend>
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
