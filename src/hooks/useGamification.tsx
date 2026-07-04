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
  award: (amount: number, label?: string) => Promise<void>;
  grant: (key: string) => Promise<void>;
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

  const grant = useCallback(async (key: string) => {
    if (!user) return;
    const { data } = await supabase.rpc("grant_achievement", { _key: key });
    if (data === true) {
      const { data: meta } = await supabase.from("achievements").select("name, xp_reward, tier").eq("key", key).maybeSingle();
      if (meta) {
        toast.success(`🏆 Achievement unlocked — ${meta.name}`, { description: `+${meta.xp_reward} XP · ${meta.tier}` });
        setAchievements((prev) => (prev.includes(key) ? prev : [...prev, key]));
      }
      refresh();
    }
  }, [user, refresh]);

  const award = useCallback(async (amount: number, label?: string) => {
    if (!user) return;
    const { data } = await supabase.rpc("award_xp", { _amount: amount });
    const row = (data as { xp: number; level: number; leveled_up: boolean }[] | null)?.[0];
    if (row) {
      setXP({ xp: row.xp, level: row.level });
      if (row.leveled_up) {
        toast.success(`⚡ Level up — you're now Level ${row.level}!`);
        if (row.level === 5) grant("level_5");
        if (row.level === 10) grant("level_10");
      } else if (label) {
        toast(`+${amount} XP · ${label}`, { duration: 1500 });
      }
    }
  }, [user, grant]);

  const checkIn = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.rpc("touch_streak");
    const row = (data as { current_streak: number; longest_streak: number; incremented: boolean }[] | null)?.[0];
    if (row) {
      setStreak({ current: row.current_streak, longest: row.longest_streak });
      if (row.incremented) {
        if (row.current_streak >= 30) grant("streak_30");
        else if (row.current_streak >= 7) grant("streak_7");
        else if (row.current_streak >= 3) grant("streak_3");
        if (row.current_streak === 1) grant("first_login");
      }
    }
  }, [user, grant]);

  return (
    <GamificationCtx.Provider value={{ xp, streak, achievements, refresh, award, grant, checkIn }}>
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
  grant: async () => {},
  checkIn: async () => {},
};

export function useGamification(): Ctx {
  return useContext(GamificationCtx) ?? NOOP;
}
