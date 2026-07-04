import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ModCard } from "@/components/ModCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mods } from "@/lib/mods";

export const Route = createFileRoute("/favorites")({
  ssr: false,
  head: () => ({ meta: [{ title: "My Favorites — Dynamon Universe" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const { user } = useAuth();
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
      <header className="rounded-3xl glass p-8 sm:p-12">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-300">
          <Heart className="h-3.5 w-3.5 fill-rose-400" /> Your Vault
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">My favorites</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Bookmarked mods you've saved for later.</p>
      </header>

      {!user ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary hover:underline">Sign in</Link> to start saving mods.
        </div>
      ) : loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : favs.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
          No favorites yet. Tap the heart on any mod to save it here.
        </div>
      ) : (
        <section className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favs.map((m, i) => <ModCard key={m.slug} mod={m} index={i} />)}
        </section>
      )}
    </PageShell>
  );
}
