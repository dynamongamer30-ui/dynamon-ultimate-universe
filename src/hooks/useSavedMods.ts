import { useCallback } from "react";
import { useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

// Locks belong to this query client, never to another SSR request or browser.
const pending = new WeakMap<QueryClient, Set<string>>();

/** Share a user's saved slugs across cards; retain the existing RLS-backed writes. */
export function useSavedMods(table: "favorites" | "mod_likes") {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const key = [table, userId] as const;
  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return [];
      const { data, error } = await supabase.from(table).select("mod_slug").eq("user_id", userId);
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => row.mod_slug);
    },
    staleTime: 60_000,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const refresh = useCallback(async () => {
    if (userId) await client.invalidateQueries({ queryKey: [table, userId], exact: true });
  }, [client, table, userId]);
  const toggle = useCallback(
    async (slug: string): Promise<boolean | null> => {
      if (!userId) return false;
      const queryKey = [table, userId] as const;
      const current = client.getQueryData<string[]>(queryKey);
      if (!current) return null;
      const lock = JSON.stringify([table, userId, slug]);
      let locks = pending.get(client);
      if (!locks) {
        locks = new Set();
        pending.set(client, locks);
      }
      if (locks.has(lock)) return null;
      locks.add(lock);
      const wasSaved = current.includes(slug);
      client.setQueryData<string[]>(
        queryKey,
        wasSaved ? current.filter((s) => s !== slug) : [...current, slug],
      );
      try {
        const result = wasSaved
          ? await supabase.from(table).delete().eq("user_id", userId).eq("mod_slug", slug)
          : await supabase.from(table).insert({ user_id: userId, mod_slug: slug });
        if (result.error) throw result.error;
        return !wasSaved;
      } catch {
        // Roll back just this slug, preserving simultaneous changes to other cards.
        if (client.getQueryState(queryKey)) {
          client.setQueryData<string[]>(queryKey, (latest = []) =>
            wasSaved ? [...new Set([...latest, slug])] : latest.filter((s) => s !== slug),
          );
        }
        return null;
      } finally {
        locks.delete(lock);
      }
    },
    [client, table, userId],
  );
  const slugs = userId ? (query.data ?? []) : [];
  return {
    slugs,
    loading: !!userId && query.isPending,
    error: query.error,
    refresh,
    toggle,
    has: (slug: string) => slugs.includes(slug),
  };
}
