import type { Mod } from "./mods";
import { compareVersions } from "./versionSort";

export const WEBSITE_ORIGIN = "https://dynamongamer.com";
export const APK_KEY_ENTRY = "https://generator.dynamongamer30.workers.dev/start";

/** Explicit public projection: never include encrypted/direct downloads or account data. */
export function buildBotCatalog(base: Mod[], rows: Record<string, unknown>[]) {
  const overrides = new Map(rows.map((row) => [row.slug, row]));
  const releases = base.flatMap((mod) => {
    const row = overrides.get(mod.slug);
    if (row?.hidden === true) return [];
    const value = (field: string, fallback: string) =>
      typeof row?.[field] === "string" && row[field] ? String(row[field]) : fallback;
    const rawNotes =
      Array.isArray(row?.changelog) && row.changelog.length ? row.changelog : mod.changelog;
    const changelog = rawNotes.slice(0, 10).flatMap((entry) => {
      if (
        !entry ||
        typeof entry !== "object" ||
        typeof entry.version !== "string" ||
        !Array.isArray(entry.notes)
      )
        return [];
      return [
        {
          version: entry.version.slice(0, 80),
          date: typeof entry.date === "string" ? entry.date.slice(0, 40) : "",
          notes: entry.notes
            .filter((note: unknown): note is string => typeof note === "string")
            .slice(0, 30)
            .map((note: string) => note.slice(0, 1000)),
        },
      ];
    });
    const pageUrl = `${WEBSITE_ORIGIN}/mods/${encodeURIComponent(mod.slug)}`;
    return [
      {
        slug: mod.slug,
        name: value("name", mod.name),
        version: value("version", mod.version),
        updated: value("updated_date", mod.updated),
        size: value("size", mod.size),
        changelog,
        pageUrl,
        downloadUrl: `${pageUrl}#download`,
        keyUrl: `${WEBSITE_ORIGIN}/links/get-key`,
      },
    ];
  });
  releases.sort(
    (a, b) =>
      compareVersions(b.version, a.version) ||
      b.updated.localeCompare(a.updated) ||
      a.slug.localeCompare(b.slug),
  );
  return { schema: 1, releases, latestSlug: releases[0]?.slug ?? null };
}
