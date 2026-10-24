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
const validXP = (value: XPState | null | undefined): value is XPState =>
  !!value &&
  Number.isSafeInteger(value.xp) &&
  value.xp >= 0 &&
  Number.isSafeInteger(value.level) &&
  value.level >= 1;
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
type AchievementStatus = "idle" | "loading" | "error" | "success" | "stale";
type Ctx = {
  xp: XPState;
  streak: StreakState;
  achievements: string[];
  achievementStatus: AchievementStatus;
  loading: boolean;
  readError: boolean;
  xpConfirmationError: boolean;
  xpConfirming: boolean;
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
  achievementRevision: number;
  awards: Promise<void>;
  xpKnown?: XPState;
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
    () => ({
      id,
      active: true,
      controllers: new Set(),
      read: 0,
      xpRevision: 0,
      streakRevision: 0,
      achievementRevision: 0,
      awards: Promise.resolve(),
    }),
    [id],
  );
  const current = useRef(scope);
  current.current = scope;
  const [state, setState] = useState({
    scope,
    ...empty,
    loading: !!id,
    readError: false,
    xpConfirmationError: false,
    xpConfirming: false,
    achievementStatus: (id ? "loading" : "idle") as AchievementStatus,
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
              xpConfirmationError: false,
              xpConfirming: false,
              achievementStatus: (id ? "loading" : "idle") as AchievementStatus,
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
      patch({
        ...empty,
        loading: false,
        readError: false,
        xpConfirmationError: false,
        xpConfirming: false,
        achievementStatus: "idle",
        checkInStatus: "idle",
      });
      return;
    }
    const read = ++scope.read,
      xpRevision = scope.xpRevision,
      streakRevision = scope.streakRevision,
      achievementRevision = scope.achievementRevision;
    patch({ loading: true, readError: false, achievementStatus: "loading" });
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
      const earnedValid =
        !a.error &&
        Array.isArray(a.data) &&
        a.data.every(
          (row) => row && typeof row.achievement_key === "string" && row.achievement_key.length > 0,
        );
      const xpValid = !x.error && (x.data === null || validXP(x.data));
      const update: Partial<typeof state> = {
        loading: false,
        readError: !!(!xpValid || s.error || !earnedValid),
      };
      if (xpValid && xpRevision === scope.xpRevision) {
        update.xp = x.data ? { xp: x.data.xp, level: x.data.level } : empty.xp;
        scope.xpKnown = update.xp;
        update.xpConfirmationError = false;
      }
      if (!s.error && streakRevision === scope.streakRevision)
        update.streak = s.data
          ? { current: s.data.current_streak, longest: s.data.longest_streak }
          : empty.streak;
      if (achievementRevision === scope.achievementRevision) {
        update.achievementStatus = earnedValid ? "success" : "error";
        if (earnedValid)
          update.achievements = [...new Set(a.data!.map((row) => row.achievement_key))];
      }
      patch(update);
    } catch {
      if (read === scope.read)
        patch({
          loading: false,
          readError: true,
          ...(achievementRevision === scope.achievementRevision
            ? { achievementStatus: "error" as const }
            : {}),
        });
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
    (
      amount: number,
      label?: string,
      eventKey?: "rating" | "mod_like" | "favorite",
      targetKey?: string,
    ) => {
      if (!id || !eventKey || !targetKey || !live()) return Promise.resolve();
      const confirm = async () => {
        if (!live()) return;
        scope.xpRevision++;
        patch({ xpConfirming: true });
        let acknowledged = false;
        try {
          const result = await bounded(scope, async (signal) => {
            const { data, error } = await supabase
              .rpc("record_engagement", { _event_key: eventKey, _target_key: targetKey })
              .abortSignal(signal)
              .retry(false);
            if (!live()) return null;
            const row = data?.[0];
            if (
              error ||
              !Array.isArray(data) ||
              data.length !== 1 ||
              !validXP(row) ||
              typeof row.awarded !== "boolean" ||
              typeof row.leveled_up !== "boolean"
            )
              throw new Error("award_unconfirmed");
            acknowledged = true;
            if (row.awarded) {
              scope.achievementRevision++;
              patch({ achievementStatus: "stale" });
            }
            // The RPC's initial XP row can precede achievement bonuses. Read the final total.
            const total = await supabase
              .from("user_xp")
              .select("xp, level")
              .eq("user_id", id)
              .abortSignal(signal)
              .maybeSingle()
              .retry(false);
            // Historical ledger backfills can acknowledge an old event without an XP row.
            // A newly awarded event must have created one in the same server transaction.
            const confirmedTotal = total.data === null && !row.awarded ? empty.xp : total.data;
            if (total.error || !validXP(confirmedTotal)) throw new Error("xp_unconfirmed");
            return { row, total: confirmedTotal };
          });
          if (!live() || !result) return;
          const previous = scope.xpKnown;
          const confirmed = { xp: result.total.xp, level: result.total.level };
          scope.xpKnown = confirmed;
          scope.xpRevision++;
          patch({ xp: confirmed, xpConfirmationError: false });
          const leveledUp = previous
            ? confirmed.level > previous.level
            : result.row.leveled_up && confirmed.level >= result.row.level;
          if (result.row.awarded && leveledUp)
            toast.success(`⚡ Level up — you're now Level ${confirmed.level}!`);
          else if (result.row.awarded && label)
            toast(`+${amount} XP · ${label}`, { duration: 1500 });
        } catch {
          if (!live()) return;
          scope.xpRevision++;
          if (!acknowledged) scope.achievementRevision++;
          patch({
            xpConfirmationError: true,
            ...(!acknowledged ? { achievementStatus: "stale" as const } : {}),
          });
        } finally {
          if (live()) patch({ xpConfirming: false });
        }
      };
      // Serialize only confirmations, retaining the server's own totals and reset behavior.
      const pending = scope.awards.then(confirm, confirm);
      scope.awards = pending.catch(() => {});
      return pending;
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
      : {
          ...empty,
          loading: !!id,
          readError: false,
          xpConfirmationError: false,
          xpConfirming: false,
          achievementStatus: (id ? "loading" : "idle") as AchievementStatus,
          checkInStatus: "idle" as CheckInStatus,
        };
  return (
    <GamificationCtx.Provider
      value={{
        xp: visible.xp,
        streak: visible.streak,
        achievements: visible.achievements,
        achievementStatus: visible.achievementStatus,
        loading: visible.loading,
        readError: visible.readError,
        xpConfirmationError: visible.xpConfirmationError,
        xpConfirming: visible.xpConfirming,
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
  xpConfirmationError: false,
  xpConfirming: false,
  achievementStatus: "idle",
  checkInStatus: "idle",
  refresh: async () => {},
  award: async () => {},
  checkIn: async () => false,
};
export function useGamification(): Ctx {
  return useContext(GamificationCtx) ?? NOOP;
}
