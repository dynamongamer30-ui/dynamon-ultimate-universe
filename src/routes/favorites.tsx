import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ModCard } from "@/components/ModCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SkeletonCard } from "@/components/Skeleton";

export const Route = createFileRoute("/favorites")({
  ssr: false,
  head: () => ({ meta: [{ title: "My Favorites — Dynamon Universe" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
  const { mods } = useSiteSettings();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase.from("favorites").select("mod_slug").eq("user_id", user.id);
      setSlugs((data ?? []).map((r: { mod_slug: string }) => r.mod_slug));
      setLoading(false);
    })();
  }, [user]);

  const favs = mods.filter((m) => slugs.includes(m.slug));

  return (
    <PageShell>
      <header className="edge-light rounded-2xl glass p-8 sm:p-12">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-300">
          <Heart className="h-3.5 w-3.5 fill-rose-400" /> Your Vault
        </p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">My favorites</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Bookmarked mods you've saved for later.</p>
      </header>

      {!user ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary hover:underline">Sign in</Link> to start saving mods.
        </div>
      ) : loading ? (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => <SkeletonCard key={i} />)}
        </div>
      ) : favs.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/30 p-12 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary" style={{ boxShadow: "var(--shadow-glow)" }}>
            <Heart className="h-6 w-6" />
          </span>
          <p className="text-muted-foreground">No favorites yet. Tap the heart on any mod to save it here.</p>
        </div>
      ) : (
        <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favs.map((m, i) => <ModCard key={m.slug} mod={m} index={i} />)}
        </section>
      )}
    </PageShell>
  );
}
