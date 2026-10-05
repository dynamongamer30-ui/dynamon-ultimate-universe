import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, TrendingUp, Clock, Heart, Download, Star, Sparkles, X } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ModCard } from "@/components/ModCard";
import { ThemedSelect } from "@/components/ThemedSelect";
import { formatCount, elementTheme, mods as catalogMods, type Element } from "@/lib/mods";
import { compareVersions, sortByLatest } from "@/lib/versionSort";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { itemListJsonLd, pageSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/mods/")({
  head: () => {
    const { links, meta } = pageSeoHead({
      path: "/mods",
      title: "All Dynamons World Builds — Compare Features, Versions & Ratings",
      description: "Browse Dynamons World builds by element, version, popularity, downloads, and community rating. Compare feature notes and choose the edition that fits your play style.",
    });
    return {
      meta,
      links,
      scripts: [itemListJsonLd(catalogMods.map((mod) => ({ name: mod.name, path: `/mods/${mod.slug}`, image: mod.image })))],
    };
  },
  component: ModsPage,
});

type Sort = "latest" | "popular" | "downloads" | "likes" | "newest";

const ALL_ELEMENTS: Element[] = ["dark", "fire", "thunder", "water", "earth", "diamond", "gold", "spirit"];

function ModsPage() {
  const { mods } = useSiteSettings();
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const [elements, setElements] = useState<Set<Element>>(new Set());
  const [minRating, setMinRating] = useState(0);
  const [version, setVersion] = useState<string>("all");

  const totalDownloads = useMemo(() => mods.reduce((s, m) => s + m.downloads, 0), [mods]);
  const versions = useMemo(
    () => Array.from(new Set(mods.map((m) => m.version))).sort((a, b) => compareVersions(b, a)),
    [mods],
  );

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = mods.filter((m) => {
      if (term && !(m.name + " " + m.tagline + " " + m.features.join(" ")).toLowerCase().includes(term)) return false;
      if (elements.size > 0 && !elements.has(m.element)) return false;
      if (minRating > 0 && m.baseRating < minRating) return false;
      if (version !== "all" && m.version !== version) return false;
      return true;
    });
    if (sort === "latest") return sortByLatest(list);
    return [...list].sort((a, b) => {
      if (sort === "downloads") return b.downloads - a.downloads;
      if (sort === "likes") return b.baseLikes - a.baseLikes;
      if (sort === "newest") return +new Date(b.updated) - +new Date(a.updated);
      return (b.downloads * 0.6 + b.baseLikes * 4) - (a.downloads * 0.6 + a.baseLikes * 4);
    });
  }, [mods, q, sort, elements, minRating, version]);

  const sorts: { id: Sort; label: string; icon: React.ReactNode }[] = [
    { id: "latest", label: "Latest Version", icon: <Sparkles className="h-3.5 w-3.5" /> },
    { id: "popular", label: "Most Popular", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "downloads", label: "Most Downloaded", icon: <Download className="h-3.5 w-3.5" /> },
    { id: "likes", label: "Most Liked", icon: <Heart className="h-3.5 w-3.5" /> },
    { id: "newest", label: "Recently Updated", icon: <Clock className="h-3.5 w-3.5" /> },
  ];

  const toggleElement = (el: Element) => {
    setElements((prev) => {
      const next = new Set(prev);
      if (next.has(el)) next.delete(el); else next.add(el);
      return next;
    });
  };

  const activeFilters = elements.size + (minRating > 0 ? 1 : 0) + (version !== "all" ? 1 : 0);

  return (
    <PageShell>
      <header aria-labelledby="mods-title" className="route-hero pt-4 sm:pt-8">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
          <span className="inline-block h-px w-8 bg-primary" aria-hidden />
          The vault
        </p>
        <h1 id="mods-title" className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-6xl">
          All Dynamon mods
        </h1>
        <p className="page-copy mt-4 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
          Every build below is fan-made and exclusively for Dynamons World. {formatCount(totalDownloads)}+ downloads
          across all builds.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="relative">
            <label htmlFor="mods-search" className="sr-only">Search mods, features</label>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="mods-search" name="q" type="search" autoComplete="off"
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search mods, features…"
              aria-describedby="mods-result-status"
              className="control-input w-full rounded-lg border py-3 pl-11 pr-11 text-sm outline-none transition-colors focus:border-primary"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Clear mod search"
                className="touch-target absolute right-1 top-1/2 grid -translate-y-1/2 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Sort builds">
            {sorts.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                aria-pressed={sort === s.id}
                className={`press touch-target inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                  sort === s.id
                    ? "border-primary/60 bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.icon} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Advanced filters */}
        <div role="region" aria-label="Build filters" className="filter-tray edge-light mt-5 space-y-3 rounded-xl border p-4">
          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter by element">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Element
            </span>
            {ALL_ELEMENTS.map((el) => {
              const active = elements.has(el);
              const t = elementTheme[el];
              return (
                <button
                  key={el} onClick={() => toggleElement(el)}
                  aria-pressed={active}
                  className={`touch-target rounded-md border px-3 py-1 text-xs font-bold uppercase tracking-widest transition-colors ${active ? t.chip : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Filter by minimum rating">
            <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              <Star className="h-3 w-3" /> Min rating
            </span>
            {[0, 4, 4.5, 4.7, 4.9].map((r) => (
              <button
                key={r} onClick={() => setMinRating(r)}
                aria-pressed={minRating === r}
                className={`touch-target rounded-md border px-3 py-1 text-xs font-semibold transition-colors ${minRating === r ? "border-amber-400/50 bg-amber-500/10 text-amber-300" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {r === 0 ? "Any" : `${r}+`}
              </button>
            ))}
            <span className="ml-2 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-widest text-muted-foreground">Version</span>
            <ThemedSelect
              value={version}
              onValueChange={setVersion}
              ariaLabel="Filter by version"
              className="h-auto w-auto rounded-md bg-secondary px-3 py-1 text-xs font-semibold"
              options={[{ value: "all", label: "All" }, ...versions.map((v) => ({ value: v, label: `v${v}` }))]}
            />
            {activeFilters > 0 && (
              <button onClick={() => { setElements(new Set()); setMinRating(0); setVersion("all"); }}
                className="touch-target ml-auto rounded-md px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-400/10 hover:text-rose-200">
                Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>

        {activeFilters > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Active filters">
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">Active</span>
            {[...elements].map((el) => (
              <button key={el} type="button" onClick={() => toggleElement(el)} className="touch-target inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {elementTheme[el].label}<X className="h-3 w-3" aria-hidden="true" />
              </button>
            ))}
            {minRating > 0 && (
              <button type="button" onClick={() => setMinRating(0)} className="touch-target inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
                {minRating}+ rating<X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
            {version !== "all" && (
              <button type="button" onClick={() => setVersion("all")} className="touch-target inline-flex items-center gap-1 rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                v{version}<X className="h-3 w-3" aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={() => { setElements(new Set()); setMinRating(0); setVersion("all"); }} className="touch-target ml-auto inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
              Reset all
            </button>
          </div>
        )}
      </header>

      <p id="mods-result-status" aria-live="polite" className="mt-5 text-sm text-muted-foreground">
        {filtered.length} {filtered.length === 1 ? "build" : "builds"} found
        {activeFilters > 0 || q ? " with the current discovery settings" : ""}.
      </p>

      {filtered.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-border bg-card/30 p-8 text-center sm:p-12">
          <p className="font-display text-lg font-bold uppercase tracking-tight">No builds found</p>
          <p className="mt-2 text-sm text-muted-foreground">Try a different search or clear the active filters.</p>
          {(activeFilters > 0 || q) && (
            <button
              type="button"
              onClick={() => { setQ(""); setElements(new Set()); setMinRating(0); setVersion("all"); }}
              className="touch-target mt-5 inline-flex items-center justify-center rounded-lg border border-border bg-card px-4 py-2 text-sm font-semibold hover:border-primary/50 hover:text-foreground"
            >
              Reset discovery
            </button>
          )}
        </div>
      ) : (
        <section aria-labelledby="mods-grid-title" className="mods-grid mt-6 grid gap-6 sm:mt-8 sm:grid-cols-2 xl:grid-cols-3">
          <h2 id="mods-grid-title" className="sr-only">Available Dynamon builds</h2>
          {filtered.map((m, i) => (
            <ModCard
              key={m.slug} mod={m} index={i}
              featured={i === 0 && sort !== "newest"}
              badge={sort === "latest" ? "Latest update" : "Most popular"}
              headingLevel="h2"
            />
          ))}
        </section>
      )}
    </PageShell>
  );
}
