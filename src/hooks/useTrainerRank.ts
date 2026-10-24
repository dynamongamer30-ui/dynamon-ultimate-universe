import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const rewards = ["trainer_dg_key", "trainer_vip_key", "phoenix_pass", "none"];
const integer = (value: unknown, minimum = 0): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= minimum;

export type TrainerLevel = {
  level: number;
  days_required: number;
  reward_kind: string;
  reward_qty: number;
};
export type TrainerProgress = {
  current_level: number;
  next_level: number | null;
  days_required: number;
  days_elapsed: number;
  reward_kind: string;
  reward_qty: number;
  claimable: boolean;
};

async function bounded<T>(signal: AbortSignal, work: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) abort();
  const timer = setTimeout(abort, 10_000);
  try {
    return await work(controller.signal);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", abort);
  }
}

const options = { retry: false, refetchOnWindowFocus: false, refetchOnReconnect: false } as const;

export function useTrainerRank(
  userId: string,
  confirmedStreak: number | null,
  checkInSettled: boolean,
) {
  const catalog = useQuery({
    ...options,
    queryKey: ["trainer-rank", "catalog"],
    staleTime: 60_000,
    queryFn: ({ signal }) =>
      bounded(signal, async (abortSignal) => {
        const { data, error } = await supabase
          .from("trainer_levels")
          .select("level, days_required, reward_kind, reward_qty")
          .order("level")
          .abortSignal(abortSignal)
          .retry(false);
        if (
          error ||
          !Array.isArray(data) ||
          data.some(
            (row, index) =>
              !row ||
              row.level !== index + 1 ||
              !integer(row.days_required) ||
              !integer(row.reward_qty) ||
              !rewards.includes(row.reward_kind),
          )
        )
          throw new Error("rank_catalog_unavailable");
        return data as TrainerLevel[];
      }),
  });
  const progress = useQuery({
    ...options,
    queryKey: ["trainer-rank", "progress", userId, confirmedStreak],
    enabled: checkInSettled,
    staleTime: 0,
    gcTime: 0,
    queryFn: ({ signal }) =>
      bounded(signal, async (abortSignal) => {
        // The existing RPC can initialize a default progress row; it never awards a rank.
        const { data, error } = await supabase
          .rpc("my_trainer_progress")
          .abortSignal(abortSignal)
          .retry(false);
        if (error || !Array.isArray(data) || data.length > 1)
          throw new Error("rank_progress_unavailable");
        if (data.length === 0) {
          // The RPC returns no row after the final configured rank. Confirm it independently.
          const { data: own, error: ownError } = await supabase
            .from("user_trainer_progress")
            .select("current_level")
            .eq("user_id", userId)
            .abortSignal(abortSignal)
            .retry(false)
            .maybeSingle();
          if (ownError || !own || !integer(own.current_level))
            throw new Error("rank_progress_unavailable");
          return { kind: "terminal" as const, current_level: own.current_level };
        }
        const row = data[0];
        if (
          !row ||
          !integer(row.current_level) ||
          row.next_level !== row.current_level + 1 ||
          !integer(row.days_required) ||
          !integer(row.days_elapsed) ||
          !integer(row.reward_qty) ||
          !rewards.includes(row.reward_kind) ||
          typeof row.claimable !== "boolean"
        )
          throw new Error("rank_progress_unavailable");
        return { kind: "next" as const, ...row } as TrainerProgress & { kind: "next" };
      }),
  });
  return { catalog, progress };
}
