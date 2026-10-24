import { useCallback, useRef } from "react";
import {
  useMutation,
  useMutationState,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

type SavedTable = "favorites" | "mod_likes";
// Locks belong to this query client, never to another SSR request or browser.
const pending = new WeakMap<QueryClient, Set<string>>();

async function readSlugs(table: SavedTable, userId: string, signal?: AbortSignal, slug?: string) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const deadline = setTimeout(abort, 10_000);
  try {
    let request = supabase.from(table).select("mod_slug").eq("user_id", userId);
    if (slug) request = request.eq("mod_slug", slug);
    const { data, error } = await request.abortSignal(controller.signal).retry(false);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => row.mod_slug);
  } finally {
    clearTimeout(deadline);
    signal?.removeEventListener("abort", abort);
  }
}

/** Share a user's saved slugs across cards; retain the existing RLS-backed writes. */
export function useSavedMods(table: SavedTable) {
  const { user } = useAuth();
  const userId = user?.id;
  const identity = useRef(userId);
  identity.current = userId;
  const client = useQueryClient();
  const key = [table, userId] as const;
  const mutationKey = [table, userId, "toggle"] as const;
  const query = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: ({ signal }) => (userId ? readSlugs(table, userId, signal) : []),
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
      if (!current || client.getQueryState(queryKey)?.status === "error") return null;
      const lock = JSON.stringify([table, userId, slug]);
      let locks = pending.get(client);
      if (!locks) {
        locks = new Set();
        pending.set(client, locks);
      }
      if (locks.has(lock)) return false;
      locks.add(lock);
      const originalQuery = client.getQueryCache().find({ queryKey, exact: true });
      const stillCurrent = () =>
        identity.current === userId &&
        client.getQueryCache().find({ queryKey, exact: true }) === originalQuery;
      const wasSaved = current.includes(slug);
      const controller = new AbortController();
      const deadline = setTimeout(() => controller.abort(), 10_000);
      try {
        await client.cancelQueries({ queryKey, exact: true });
        if (!stillCurrent()) return false;
        client.setQueryData<string[]>(queryKey, (latest = []) =>
          wasSaved ? latest.filter((s) => s !== slug) : [...new Set([...latest, slug])],
        );
        const request = wasSaved
          ? supabase.from(table).delete().eq("user_id", userId).eq("mod_slug", slug)
          : supabase.from(table).insert({ user_id: userId, mod_slug: slug });
        // Favorites need representation proof; preserve the existing like contract.
        const result =
          table === "favorites"
            ? await request.select("mod_slug").abortSignal(controller.signal).retry(false)
            : await request.abortSignal(controller.signal).retry(false);
        if (result.error) throw result.error;
        if (!stillCurrent()) return false;
        if (table === "favorites" && !result.data?.some((row) => row.mod_slug === slug)) {
          if (!wasSaved || (await readSlugs(table, userId, undefined, slug)).includes(slug))
            throw new Error("Favorite change not confirmed");
        }
        return stillCurrent() ? !wasSaved : false;
      } catch {
        // Roll back just this slug, preserving simultaneous changes to other cards.
        if (stillCurrent()) {
          client.setQueryData<string[]>(queryKey, (latest = []) =>
            wasSaved ? [...new Set([...latest, slug])] : latest.filter((s) => s !== slug),
          );
          return null;
        }
        return false;
      } finally {
        clearTimeout(deadline);
        locks.delete(lock);
      }
    },
    [client, table, userId],
  );
  const mutation = useMutation({ mutationKey, mutationFn: toggle, retry: false, gcTime: 0 });
  const pendingSlugs = useMutationState({
    filters: { mutationKey, exact: true, status: "pending" },
    select: (entry) => entry.state.variables as string,
  });
  const slugs = userId ? (query.data ?? []) : [];
  return {
    slugs,
    loading: !!userId && query.isPending,
    error: query.error,
    refresh,
    toggle: mutation.mutateAsync,
    updating: pendingSlugs.length > 0,
    isPending: (slug: string) => pendingSlugs.includes(slug),
    has: (slug: string) => slugs.includes(slug),
  };
}
