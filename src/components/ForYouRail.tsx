import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mods, elementTheme } from "@/lib/mods";

export function ForYouRail() {
  const { user } = useAuth();
  const [elements, setElements] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      const [{ data: likes }, { data: favs }, { data: prefs }] = await Promise.all([
        supabase.from("mod_likes").select("mod_slug").eq("user_id", user.id),
        supabase.from("favorites").select("mod_slug").eq("user_id", user.id),
        supabase.from("user_preferences").select("favorite_elements").eq("user_id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      const slugs = [
        ...(likes ?? []).map((r: { mod_slug: string }) => r.mod_slug),
        ...(favs ?? []).map((r: { mod_slug: string }) => r.mod_slug),
      ];
      const inferred: string[] = slugs
        .map((s) => mods.find((m) => m.slug === s)?.element)
        .filter((e): e is NonNullable<typeof e> => !!e);
      const stated = (prefs?.favorite_elements ?? []) as string[];
      const uniq = Array.from(new Set<string>([...stated, ...inferred]));
      setElements(uniq);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [user]);

  if (!user || !loaded) return null;

  // Score mods: prefer matching elements; fall back to top popular
  const scored = mods.map((m) => ({
    mod: m,
    score: (elements.includes(m.element) ? 1000 : 0) + m.downloads / 1000,
  })).sort((a, b) => b.score - a.score).slice(0, 4);

  if (elements.length === 0) return null;

  return (
    <section className="mt-16">
      <div className="flex items-end justify-between">
        <div>
          <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary">
            <Sparkles className="h-3 w-3" /> For You
          </p>
          <h2 className="mt-2 font-display text-2xl font-extrabold sm:text-3xl">Picks based on your taste</h2>
          <p className="mt-1 text-sm text-muted-foreground">Recommended from {elements.slice(0, 3).join(", ")} affinity.</p>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {scored.map((s, i) => {
          const t = elementTheme[s.mod.element];
          return (
            <motion.div
              key={s.mod.slug}
              initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link to="/mods/$slug" params={{ slug: s.mod.slug }}
                className="group relative block overflow-hidden rounded-2xl glass"
                style={{ boxShadow: t.glow }}>
                <img src={s.mod.image} alt={s.mod.name} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card to-transparent p-3">
                  <p className="text-[10px] uppercase tracking-widest text-primary">{t.label}</p>
                  <p className="font-display text-sm font-bold leading-tight">{s.mod.name}</p>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
