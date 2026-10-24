import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

async function firstReward<T extends { id: string; expires_at: string }>(
  signal: AbortSignal,
  request: (
    signal: AbortSignal,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  validate?: (row: T) => boolean,
) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const deadline = setTimeout(abort, 10_000);
  try {
    const { data, error } = await request(controller.signal);
    if (error || !Array.isArray(data) || data.length > 1)
      throw new Error("Reward lookup unavailable");
    if (data.length === 0) return null;
    const row = data[0];
    if (
      !row ||
      typeof row.id !== "string" ||
      !row.id ||
      typeof row.expires_at !== "string" ||
      !Number.isFinite(Date.parse(row.expires_at)) ||
      (validate && !validate(row))
    )
      throw new Error("Reward lookup unavailable");
    return row;
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener("abort", abort);
  }
}

function useRewardExpiry(
  expiresAt: string | undefined,
  userId: string | undefined,
  refetch: () => unknown,
) {
  const [, update] = useState(0);
  useEffect(() => {
    if (!userId || !expiresAt) return;
    const deadline = Date.parse(expiresAt);
    if (!Number.isFinite(deadline)) return;
    let disposed = false,
      refreshed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expire = () => {
      if (disposed || refreshed) return;
      refreshed = true;
      clearTimeout(timer);
      update((value) => value + 1);
      void refetch();
    };
    const schedule = () => {
      const remaining = deadline - Date.now();
      if (remaining <= 0) expire();
      else timer = setTimeout(schedule, Math.min(remaining + 1, 2_147_483_647));
    };
    const wake = () => {
      if (Date.now() >= deadline) expire();
    };
    const visible = () => {
      if (!document.hidden) wake();
    };
    schedule();
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      clearTimeout(timer);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [expiresAt, userId, refetch]);
  return !!expiresAt && Date.parse(expiresAt) <= Date.now();
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
      firstReward(
        signal,
        (abortSignal) => supabase.rpc("my_daily_key").abortSignal(abortSignal).retry(false),
        (row) => typeof row.claimed === "boolean" && typeof row.key === "string",
      ),
  });
  const passExpired = useRewardExpiry(pass.data?.expires_at, userId, pass.refetch);
  const keyExpired = useRewardExpiry(dailyKey.data?.expires_at, userId, dailyKey.refetch);
  return { pass, dailyKey, passExpired, keyExpired };
}
