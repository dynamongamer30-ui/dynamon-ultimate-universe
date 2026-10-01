import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useFavorites() {
  const { user } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setSlugs([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("favorites").select("mod_slug").eq("user_id", user.id);
    setSlugs((data ?? []).map((r: { mod_slug: string }) => r.mod_slug));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async (slug: string): Promise<boolean | null> => {
    if (!user) return false;
    const isFav = slugs.includes(slug);
    if (isFav) {
      setSlugs((p) => p.filter((s) => s !== slug));
      const { error } = await supabase.from("favorites").delete().eq("user_id", user.id).eq("mod_slug", slug);
      if (error) {
        setSlugs((p) => (p.includes(slug) ? p : [...p, slug]));
        return null;
      }
      return false;
    }
    setSlugs((p) => [...p, slug]);
    const { error } = await supabase.from("favorites").insert({ user_id: user.id, mod_slug: slug });
    if (error) {
      setSlugs((p) => p.filter((s) => s !== slug));
      return null;
    }
    return true;
  }, [user, slugs]);

  return { slugs, loading, refresh, toggle, has: (s: string) => slugs.includes(s) };
}
