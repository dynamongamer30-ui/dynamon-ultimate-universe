import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, TrendingUp, Clock, Heart, Download, Star, Sparkles } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ModCard } from "@/components/ModCard";
import { ThemedSelect } from "@/components/ThemedSelect";
import { mods, totalDownloads, formatCount, elementTheme, type Element } from "@/lib/mods";

export const Route = createFileRoute("/mods/")({
  head: () => ({
    meta: [
      { title: "Mods — Dynamon Universe" },
      { name: "description", content: "All Dynamons World mod APK builds available on Dynamon Universe. Compare versions, features and ratings." },
      { property: "og:title", content: "All Dynamons World Mods — Dynamon Universe" },
      { property: "og:description", content: "Compare every fan-made Dynamons World mod build on Dynamon Universe." },
    ],
  }),
  component: ModsPage,
});

type Sort = "popular" | "downloads" | "likes" | "newest";

const ALL_ELEMENTS: Element[] = ["dark", "fire", "thunder", "water", "earth", "diamond", "gold", "spirit"];

function ModsPage() {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("popular");
  const [elements, setElements] = useState<Set<Element>>(new Set());
  const [minRating, setMinRating] = useState(0);
  const [version, setVersion] = useState<string>("all");

  const versions = useMemo(() => Array.from(new Set(mods.map((m) => m.version))).sort().reverse(), []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = mods.filter((m) => {
      if (term && !(m.name + " " + m.tagline + " " + m.features.join(" ")).toLowerCase().includes(term)) return false;
      if (elements.size > 0 && !elements.has(m.element)) return false;
      if (minRating > 0 && m.baseRating < minRating) return false;
      if (version !== "all" && m.version !== version) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      if (sort === "downloads") return b.downloads - a.downloads;
      if (sort === "likes") return b.baseLikes - a.baseLikes;
      if (sort === "newest") return +new Date(b.updated) - +new Date(a.updated);
      return (b.downloads * 0.6 + b.baseLikes * 4) - (a.downloads * 0.6 + a.baseLikes * 4);
    });
    return list;
  }, [q, sort, elements, minRating, version]);

  const sorts: { id: Sort; label: string; icon: React.ReactNode }[] = [
    { id: "popular", label: "Most Popular", icon: <TrendingUp className="h-3.5 w-3.5" /> },
    { id: "downloads", label: "Most Downloaded", icon: <Download className="h-3.5 w-3.5" /> },
    { id: "likes", label: "Most Liked", icon: <Heart className="h-3.5 w-3.5" /> },
    { id: "newest", label: "Newest", icon: <Clock className="h-3.5 w-3.5" /> },
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
      <header className="pt-4 sm:pt-8">
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
          <span className="inline-block h-px w-8 bg-primary" aria-hidden />
          The vault
        </p>
        <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-6xl">
          All Dynamon mods
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
          Every build below is fan-made and exclusively for Dynamons World. {formatCount(totalDownloads)}+ downloads
          across all builds.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Search mods, features…"
              className="w-full rounded-lg border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {sorts.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={`press inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
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
        <div className="edge-light mt-5 space-y-3 rounded-xl border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-3 w-3" /> Element
            </span>
            {ALL_ELEMENTS.map((el) => {
              const active = elements.has(el);
              const t = elementTheme[el];
              return (
                <button
                  key={el} onClick={() => toggleElement(el)}
                  className={`rounded-md border px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors ${active ? t.chip : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <Star className="h-3 w-3" /> Min rating
            </span>
            {[0, 4, 4.5, 4.7, 4.9].map((r) => (
              <button
                key={r} onClick={() => setMinRating(r)}
                className={`rounded-md border px-3 py-1 text-[11px] font-semibold transition-colors ${minRating === r ? "border-amber-400/50 bg-amber-500/10 text-amber-300" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}
              >
                {r === 0 ? "Any" : `${r}+`}
              </button>
            ))}
            <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Version</span>
            <ThemedSelect
              value={version}
              onValueChange={setVersion}
              ariaLabel="Filter by version"
              className="h-auto w-auto rounded-md bg-secondary px-3 py-1 text-[11px] font-semibold"
              options={[{ value: "all", label: "All" }, ...versions.map((v) => ({ value: v, label: `v${v}` }))]}
            />
            {activeFilters > 0 && (
              <button onClick={() => { setElements(new Set()); setMinRating(0); setVersion("all"); }}
                className="ml-auto rounded-md px-3 py-1 text-[11px] font-semibold text-rose-300 hover:text-rose-200">
                Clear {activeFilters} filter{activeFilters > 1 ? "s" : ""}
              </button>
            )}
          </div>
        </div>
      </header>

      {filtered.length === 0 ? (
        <div className="mt-12 rounded-3xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground">
          No mods match your filters.
        </div>
      ) : (
        <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m, i) => <ModCard key={m.slug} mod={m} index={i} featured={i === 0 && sort !== "newest"} />)}
        </section>
      )}
    </PageShell>
  );
}
