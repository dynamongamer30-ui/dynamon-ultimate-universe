import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

async function firstReward<T>(
  signal: AbortSignal,
  request: (
    signal: AbortSignal,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const deadline = setTimeout(abort, 10_000);
  try {
    const { data, error } = await request(controller.signal);
    if (error) throw new Error(error.message);
    return data?.[0] ?? null;
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener("abort", abort);
  }
}

const options = {
  staleTime: 60_000,
  gcTime: 0,
  retry: false,
  refetchOnWindowFocus: false,
  refetchOnReconnect: false,
} as const;

/** Current-account lookups only: this hook never claims or consumes a reward. */
export function useDailyRewards() {
  const { user } = useAuth();
  const userId = user?.id;
  const pass = useQuery({
    ...options,
    queryKey: ["daily-rewards", userId, "phoenix"],
    enabled: !!userId,
    queryFn: ({ signal }) =>
      firstReward(signal, (abortSignal) =>
        supabase.rpc("my_active_phoenix_pass").abortSignal(abortSignal).retry(false),
      ),
  });
  const dailyKey = useQuery({
    ...options,
    queryKey: ["daily-rewards", userId, "key"],
    enabled: !!userId,
    queryFn: ({ signal }) =>
      firstReward(signal, (abortSignal) =>
        supabase.rpc("my_daily_key").abortSignal(abortSignal).retry(false),
      ),
  });
  return { pass, dailyKey };
}
