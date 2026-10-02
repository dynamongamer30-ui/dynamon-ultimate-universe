import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type XPState = { xp: number; level: number };
export type StreakState = { current: number; longest: number };

const XP_LEVELS = (xp: number) => Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
export const xpForLevel = (lvl: number) => 50 * (lvl - 1) ** 2;
export const xpToNext = (xp: number) => {
  const l = XP_LEVELS(xp);
  const next = xpForLevel(l + 1);
  const base = xpForLevel(l);
  return { level: l, base, next, progress: Math.min(1, (xp - base) / Math.max(1, next - base)) };
};

type Ctx = {
  xp: XPState;
  streak: StreakState;
  achievements: string[];
  refresh: () => Promise<void>;
  award: (amount: number, label?: string, eventKey?: "rating" | "mod_like" | "favorite", targetKey?: string) => Promise<void>;
  checkIn: () => Promise<void>;
};

const GamificationCtx = createContext<Ctx | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [xp, setXP] = useState<XPState>({ xp: 0, level: 1 });
  const [streak, setStreak] = useState<StreakState>({ current: 0, longest: 0 });
  const [achievements, setAchievements] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setXP({ xp: 0, level: 1 });
      setStreak({ current: 0, longest: 0 });
      setAchievements([]);
      return;
    }
    const [{ data: x }, { data: s }, { data: a }] = await Promise.all([
      supabase.from("user_xp").select("xp, level").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle(),
      supabase.from("user_achievements").select("achievement_key").eq("user_id", user.id),
    ]);
    if (x) setXP({ xp: x.xp, level: x.level });
    if (s) setStreak({ current: s.current_streak, longest: s.longest_streak });
    if (a) setAchievements(a.map((r: { achievement_key: string }) => r.achievement_key));
  }, [user]);

  // Fetch once per user change, not once per component mount.
  useEffect(() => { refresh(); }, [refresh]);

  const award = useCallback(async (amount: number, label?: string, eventKey?: "rating" | "mod_like" | "favorite", targetKey?: string) => {
    if (!user || !eventKey || !targetKey) return;
    const { data, error } = await supabase.rpc("record_engagement", { _event_key: eventKey, _target_key: targetKey });
    if (error) {
      console.error("Failed to award XP:", error);
      return;
    }
    const row = (data as { xp: number; level: number; leveled_up: boolean; awarded: boolean }[] | null)?.[0];
    if (row) {
      setXP({ xp: row.xp, level: row.level });
      if (row.awarded && row.leveled_up) {
        toast.success(`⚡ Level up — you're now Level ${row.level}!`);
      } else if (row.awarded && label) {
        toast(`+${amount} XP · ${label}`, { duration: 1500 });
      }
    }
  }, [user]);

  const checkIn = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc("touch_streak");
    if (error) {
      console.error("Failed to update streak:", error);
      return;
    }
    const row = (data as { current_streak: number; longest_streak: number; incremented: boolean }[] | null)?.[0];
    if (row) {
      setStreak({ current: row.current_streak, longest: row.longest_streak });
    }
  }, [user]);

  return (
    <GamificationCtx.Provider value={{ xp, streak, achievements, refresh, award, checkIn }}>
      {children}
    </GamificationCtx.Provider>
  );
}

const NOOP: Ctx = {
  xp: { xp: 0, level: 1 },
  streak: { current: 0, longest: 0 },
  achievements: [],
  refresh: async () => {},
  award: async () => {},
  checkIn: async () => {},
};

export function useGamification(): Ctx {
  return useContext(GamificationCtx) ?? NOOP;
}
