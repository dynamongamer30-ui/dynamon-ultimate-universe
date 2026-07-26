import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Real per-user likes, backed by mod_likes (mod_slug, user_id).
 * This is the missing "write" side — mod_likes already existed and was
 * read for recommendations, but nothing ever inserted into it. Counts
 * here feed directly into useSiteSettings' real like totals.
 */
export function useLikes() {
  const { user } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setSlugs([]); setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase.from("mod_likes").select("mod_slug").eq("user_id", user.id);
    setSlugs((data ?? []).map((r: { mod_slug: string }) => r.mod_slug));
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const toggle = useCallback(async (slug: string) => {
    if (!user) return false;
    const isLiked = slugs.includes(slug);
    if (isLiked) {
      setSlugs((p) => p.filter((s) => s !== slug));
      await supabase.from("mod_likes").delete().eq("user_id", user.id).eq("mod_slug", slug);
      return false;
    }
    setSlugs((p) => [...p, slug]);
    await supabase.from("mod_likes").insert({ user_id: user.id, mod_slug: slug });
    return true;
  }, [user, slugs]);

  return { slugs, loading, refresh, toggle, has: (s: string) => slugs.includes(s) };
}
