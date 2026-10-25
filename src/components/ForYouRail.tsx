import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { elementTheme } from "@/lib/mods";
import { useFavorites } from "@/hooks/useFavorites";
import { useLikes } from "@/hooks/useLikes";

export function ForYouRail() {
  const { user } = useAuth();
  const { mods } = useSiteSettings();
  const userId = user?.id;
  const favorites = useFavorites();
  const likes = useLikes();
  const preferences = useQuery({
    queryKey: ["recommendation-elements", userId],
    enabled: !!userId,
    queryFn: async ({ signal }) => {
      if (!userId) return [];
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) controller.abort();
      const deadline = setTimeout(abort, 10_000);
      try {
        const { data, error } = await supabase
          .from("user_preferences")
          .select("favorite_elements")
          .eq("user_id", userId)
          .abortSignal(controller.signal)
          .maybeSingle()
          .retry(false);
        if (error) throw new Error(error.message);
        return (data?.favorite_elements ?? []).filter((element) =>
          Object.hasOwn(elementTheme, element),
        );
      } finally {
        clearTimeout(deadline);
        signal.removeEventListener("abort", abort);
      }
    },
    staleTime: 60_000,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  });
  if (!user) return null;

  const working =
    preferences.isFetching ||
    favorites.fetching ||
    likes.fetching ||
    favorites.updating ||
    likes.updating;
  const failed = !!(preferences.error || favorites.error || likes.error);
  const slugs = new Set([...favorites.slugs, ...likes.slugs]);
  const inferred = mods.filter((mod) => slugs.has(mod.slug)).map((mod) => mod.element);
  const elements = [...new Set([...(preferences.data ?? []), ...inferred])];
  if (!working && !failed && elements.length === 0) return null;

  const retry = () => {
    if (preferences.error) void preferences.refetch();
    if (favorites.error) void favorites.refresh();
    if (likes.error) void likes.refresh();
  };

  // Score mods: prefer matching elements; fall back to top popular
  const scored = mods
    .map((m) => ({
      mod: m,
      score: (elements.includes(m.element) ? 1000 : 0) + m.downloads / 1000,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  return (
    <section aria-labelledby="recommendations-title" aria-busy={working} className="mt-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary-ink">
            <Sparkles className="h-3 w-3" /> For You
          </p>
          <h2
            id="recommendations-title"
            className="mt-2 font-display text-2xl font-extrabold sm:text-3xl"
          >
            Picks based on your taste
          </h2>
          {!working && !failed && (
            <p className="mt-1 text-sm text-muted-foreground">
              Recommended from {elements.slice(0, 3).join(", ")} affinity.
            </p>
          )}
        </div>
      </div>
      {failed ? (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p role="alert">Could not load your recommendations.</p>
          <button
            type="button"
            onClick={retry}
            disabled={working}
            className="touch-target mt-3 rounded-full border border-border px-4 py-2 text-primary-ink disabled:opacity-60"
          >
            {working ? "Retrying recommendations…" : "Retry recommendations"}
          </button>
        </div>
      ) : working ? (
        <p role="status" className="mt-6 rounded-2xl border border-border bg-card p-5">
          Updating your recommendations…
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scored.map((s, i) => {
            const t = elementTheme[s.mod.element];
            return (
              <motion.div
                key={s.mod.slug}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  to="/mods/$slug"
                  params={{ slug: s.mod.slug }}
                  aria-label={s.mod.name}
                  className="group relative block overflow-hidden rounded-2xl glass"
                  style={{ boxShadow: t.glow }}
                >
                  <img
                    src={s.mod.image}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card to-transparent p-3">
                    <p className="text-xs uppercase tracking-widest text-primary-ink">{t.label}</p>
                    <p className="font-display text-sm font-bold leading-tight">{s.mod.name}</p>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
