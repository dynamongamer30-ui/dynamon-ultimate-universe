import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAchievementCatalog() {
  return useQuery({
    queryKey: ["achievement-catalog"],
    staleTime: 60_000,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const abort = () => controller.abort();
      signal.addEventListener("abort", abort, { once: true });
      if (signal.aborted) abort();
      const timer = setTimeout(abort, 10_000);
      try {
        const { data, error } = await supabase
          .from("achievements")
          .select("key, name, description, icon, tier, xp_reward")
          .order("xp_reward")
          .order("key")
          .abortSignal(controller.signal)
          .retry(false);
        if (
          error ||
          !Array.isArray(data) ||
          data.some(
            (row) =>
              !row ||
              typeof row.key !== "string" ||
              !row.key.trim() ||
              typeof row.name !== "string" ||
              !row.name.trim() ||
              typeof row.description !== "string" ||
              (row.icon !== null && typeof row.icon !== "string") ||
              typeof row.tier !== "string" ||
              !Number.isSafeInteger(row.xp_reward) ||
              row.xp_reward < 0,
          ) ||
          new Set(data.map((row) => row.key)).size !== data.length
        )
          throw new Error("achievement_catalog_unavailable");
        return data;
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    },
  });
}
