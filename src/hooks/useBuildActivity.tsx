import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuth } from "./useAuth";
import { useSiteSettings } from "./useSiteSettings";
import { compareVersions } from "@/lib/versionSort";
import type { Mod } from "@/lib/mods";
import { read, write, event, type Activity } from "@/lib/buildActivity";
export function useBuildActivity() {
  const { user } = useAuth();
  const [data, setData] = useState<Activity>({ enabled: true, rows: [] });
  const [scope, setScope] = useState<string | null>(null);
  const expectedScope = user?.id || "guest";
  useEffect(() => {
    const load = () => {
      setData(read(user?.id));
      setScope(user?.id || "guest");
    };
    load();
    window.addEventListener(event, load);
    window.addEventListener("storage", load);
    return () => {
      window.removeEventListener(event, load);
      window.removeEventListener("storage", load);
    };
  }, [user?.id]);
  return {
    ...(scope === expectedScope ? data : { enabled: true, rows: [] }),
    clear: () => write({ ...data, rows: [] }, user?.id),
    toggle: () => write({ enabled: !data.enabled, rows: [] }, user?.id),
  };
}
export function TrackBuildView({ mod }: { mod: Mod }) {
  const { user, loading } = useAuth();
  useEffect(() => {
    if (loading) return;
    const data = read(user?.id);
    if (!data.enabled) return;
    write(
      {
        ...data,
        rows: [
          { slug: mod.slug, version: mod.version, at: Date.now() },
          ...data.rows.filter((r) => r.slug !== mod.slug),
        ].slice(0, 6),
      },
      user?.id,
    );
  }, [loading, user?.id, mod.slug, mod.version]);
  return null;
}
export function BuildUpdateIndicator({ mod }: { mod: Mod }) {
  const { rows } = useBuildActivity();
  const previous = rows.find((r) => r.slug === mod.slug);
  return previous && compareVersions(mod.version, previous.version) > 0 ? (
    <span className="mt-2 inline-block rounded-full border border-primary/40 bg-primary/10 px-2 py-1 text-xs text-primary-ink">
      Updated since v{previous.version} · this device
    </span>
  ) : null;
}
export function ContinueBrowsing() {
  const { mods } = useSiteSettings();
  const activity = useBuildActivity();
  const rows = activity.rows
    .map((r) => mods.find((m) => m.slug === r.slug))
    .filter((m) => m !== undefined);
  return (
    <section
      className="mt-10 rounded-2xl border border-border bg-card p-5"
      aria-label="Recently viewed builds"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-bold">Continue your journey</h2>
          <p className="mt-1 text-xs text-muted-foreground">Recent builds on this device only.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={activity.clear}
            disabled={!rows.length}
            className="touch-target text-xs disabled:opacity-40"
          >
            Clear history
          </button>
          <button onClick={activity.toggle} className="touch-target text-xs underline">
            {activity.enabled ? "Turn off history" : "Enable history"}
          </button>
        </div>
      </div>
      {activity.enabled && rows.length > 0 ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {rows.map((m) => (
            <Link
              key={m.slug}
              to="/mods/$slug"
              params={{ slug: m.slug }}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-border p-3"
            >
              <img
                src={m.image}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 rounded-lg object-cover"
              />
              <span className="min-w-0 text-sm">
                <strong className="block truncate">{m.name}</strong>
                <span className="text-xs text-muted-foreground">v{m.version}</span>
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">
          {activity.enabled ? "Builds you open will appear here." : "Browsing history is disabled."}
        </p>
      )}
    </section>
  );
}
