import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type XPState = { xp: number; level: number };
export type StreakState = { current: number; longest: number };
const XP_LEVELS = (xp: number) => Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
export const xpForLevel = (lvl: number) => 50 * (lvl - 1) ** 2;
export const xpToNext = (xp: number) => {
  const l = XP_LEVELS(xp),
    next = xpForLevel(l + 1),
    base = xpForLevel(l);
  return { level: l, base, next, progress: Math.min(1, (xp - base) / Math.max(1, next - base)) };
};
type CheckInStatus = "idle" | "pending" | "error" | "success";
type Ctx = {
  xp: XPState;
  streak: StreakState;
  achievements: string[];
  loading: boolean;
  readError: boolean;
  checkInStatus: CheckInStatus;
  refresh: () => Promise<void>;
  award: (
    amount: number,
    label?: string,
    eventKey?: "rating" | "mod_like" | "favorite",
    targetKey?: string,
  ) => Promise<void>;
  checkIn: () => Promise<boolean>;
};
type Scope = {
  id: string | undefined;
  active: boolean;
  controllers: Set<AbortController>;
  read: number;
  xpRevision: number;
  streakRevision: number;
  confirmedDay?: string;
  pending?: Promise<boolean>;
};
const empty = {
  xp: { xp: 0, level: 1 },
  streak: { current: 0, longest: 0 },
  achievements: [] as string[],
};
const GamificationCtx = createContext<Ctx | null>(null);

async function bounded<T>(scope: Scope, request: (signal: AbortSignal) => PromiseLike<T>) {
  const controller = new AbortController();
  scope.controllers.add(controller);
  if (!scope.active) controller.abort();
  const deadline = setTimeout(() => controller.abort(), 10_000);
  try {
    return await request(controller.signal);
  } finally {
    clearTimeout(deadline);
    scope.controllers.delete(controller);
  }
}

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const id = user?.id;
  const scope = useMemo<Scope>(
    () => ({ id, active: true, controllers: new Set(), read: 0, xpRevision: 0, streakRevision: 0 }),
    [id],
  );
  const current = useRef(scope);
  current.current = scope;
  const [state, setState] = useState({
    scope,
    ...empty,
    loading: !!id,
    readError: false,
    checkInStatus: "idle" as CheckInStatus,
  });
  const live = useCallback(() => scope.active && current.current === scope, [scope]);
  const patch = useCallback(
    (update: Partial<Omit<typeof state, "scope">>) => {
      if (!live()) return;
      setState((previous) => ({
        ...(previous.scope === scope
          ? previous
          : {
              scope,
              ...empty,
              loading: !!id,
              readError: false,
              checkInStatus: "idle" as CheckInStatus,
            }),
        ...update,
      }));
    },
    [id, scope, live],
  );

  const refresh = useCallback(async () => {
    if (!live()) return;
    if (!id) {
      patch({ ...empty, loading: false, readError: false, checkInStatus: "idle" });
      return;
    }
    const read = ++scope.read,
      xpRevision = scope.xpRevision,
      streakRevision = scope.streakRevision;
    patch({ loading: true, readError: false });
    try {
      const [x, s, a] = await bounded(scope, (signal) =>
        Promise.all([
          supabase
            .from("user_xp")
            .select("xp, level")
            .eq("user_id", id)
            .abortSignal(signal)
            .maybeSingle()
            .retry(false),
          supabase
            .from("user_streaks")
            .select("current_streak, longest_streak")
            .eq("user_id", id)
            .abortSignal(signal)
            .maybeSingle()
            .retry(false),
          supabase
            .from("user_achievements")
            .select("achievement_key")
            .eq("user_id", id)
            .abortSignal(signal)
            .retry(false),
        ]),
      );
      if (!live() || read !== scope.read) return;
      const update: Partial<typeof state> = {
        loading: false,
        readError: !!(x.error || s.error || a.error),
      };
      if (!x.error && xpRevision === scope.xpRevision)
        update.xp = x.data ? { xp: x.data.xp, level: x.data.level } : empty.xp;
      if (!s.error && streakRevision === scope.streakRevision)
        update.streak = s.data
          ? { current: s.data.current_streak, longest: s.data.longest_streak }
          : empty.streak;
      if (!a.error) update.achievements = (a.data ?? []).map((row) => row.achievement_key);
      patch(update);
    } catch {
      if (read === scope.read) patch({ loading: false, readError: true });
    }
  }, [id, live, patch, scope]);
  useEffect(() => {
    scope.active = true;
    void refresh();
    return () => {
      scope.active = false;
      for (const controller of scope.controllers) controller.abort();
    };
  }, [scope, refresh]);

  const award = useCallback(
    async (
      amount: number,
      label?: string,
      eventKey?: "rating" | "mod_like" | "favorite",
      targetKey?: string,
    ) => {
      if (!id || !eventKey || !targetKey || !live()) return;
      try {
        const { data, error } = await bounded(scope, (signal) =>
          supabase
            .rpc("record_engagement", { _event_key: eventKey, _target_key: targetKey })
            .abortSignal(signal)
            .retry(false),
        );
        if (!live()) return;
        if (error) {
          console.error("Failed to award XP:", error);
          return;
        }
        const row = data?.[0];
        if (!row || !Number.isFinite(row.xp) || !Number.isFinite(row.level)) return;
        scope.xpRevision++;
        patch({ xp: { xp: row.xp, level: row.level } });
        if (row.awarded && row.leveled_up)
          toast.success(`⚡ Level up — you're now Level ${row.level}!`);
        else if (row.awarded && label) toast(`+${amount} XP · ${label}`, { duration: 1500 });
      } catch {
        /* The engagement action can already be saved; do not invent an XP award. */
      }
    },
    [id, live, patch, scope],
  );

  const checkIn = useCallback((): Promise<boolean> => {
    if (!id || !live()) return Promise.resolve(false);
    if (scope.pending) return scope.pending;
    const key = `streak-checkin:${id}:${new Date().toISOString().slice(0, 10)}`;
    let confirmed = scope.confirmedDay === key;
    try {
      confirmed ||= sessionStorage.getItem(key) === "confirmed";
    } catch {
      /* Optional storage. */
    }
    if (confirmed) {
      patch({ checkInStatus: "success" });
      return Promise.resolve(true);
    }
    patch({ checkInStatus: "pending" });
    scope.pending = (async () => {
      try {
        const { data, error } = await bounded(scope, (signal) =>
          supabase.rpc("touch_streak").abortSignal(signal).retry(false),
        );
        const row = data?.[0];
        if (!live()) return false;
        if (
          error ||
          !row ||
          !Number.isFinite(row.current_streak) ||
          !Number.isFinite(row.longest_streak)
        )
          throw new Error("Check-in not confirmed");
        scope.streakRevision++;
        patch({
          streak: { current: row.current_streak, longest: row.longest_streak },
          checkInStatus: "success",
        });
        scope.confirmedDay = key;
        try {
          sessionStorage.setItem(key, "confirmed");
        } catch {
          /* In-memory confirmation remains. */
        }
        return true;
      } catch {
        patch({ checkInStatus: "error" });
        return false;
      } finally {
        scope.pending = undefined;
      }
    })();
    return scope.pending;
  }, [id, live, patch, scope]);
  const visible =
    state.scope === scope
      ? state
      : { ...empty, loading: !!id, readError: false, checkInStatus: "idle" as CheckInStatus };
  return (
    <GamificationCtx.Provider
      value={{
        xp: visible.xp,
        streak: visible.streak,
        achievements: visible.achievements,
        loading: visible.loading,
        readError: visible.readError,
        checkInStatus: visible.checkInStatus,
        refresh,
        award,
        checkIn,
      }}
    >
      {children}
    </GamificationCtx.Provider>
  );
}
const NOOP: Ctx = {
  ...empty,
  loading: false,
  readError: false,
  checkInStatus: "idle",
  refresh: async () => {},
  award: async () => {},
  checkIn: async () => false,
};
export function useGamification(): Ctx {
  return useContext(GamificationCtx) ?? NOOP;
}
