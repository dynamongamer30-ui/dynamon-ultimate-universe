import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trophy, Lock, Zap, Flame } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { LevelBadge } from "@/components/LevelBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";

export const Route = createFileRoute("/achievements")({
  ssr: false,
  head: () => ({ meta: [{ title: "Achievements — Dynamon Universe" }] }),
  component: AchievementsPage,
});

type Achievement = {
  key: string;
  name: string;
  description: string;
  icon: string | null;
  tier: string;
  xp_reward: number;
};

const tierStyle: Record<string, string> = {
  bronze: "from-amber-700 to-amber-500",
  silver: "from-slate-400 to-slate-200",
  gold: "from-amber-400 to-yellow-200",
  platinum: "from-cyan-300 to-violet-300",
  diamond: "from-sky-300 to-fuchsia-300",
};

function AchievementsPage() {
  const { user } = useAuth();
  const { achievements, xp, streak } = useGamification();
  const [list, setList] = useState<Achievement[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("achievements").select("*").order("xp_reward");
      setList((data ?? []) as Achievement[]);
    })();
  }, []);

  return (
    <PageShell>
      <header className="rounded-3xl glass p-8 sm:p-12">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <Trophy className="h-3.5 w-3.5" /> Progression
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Trainer achievements</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Earn XP, level up, keep your streak, unlock badges.</p>
      </header>

      {!user ? (
        <p className="mt-10 text-center text-muted-foreground">Sign in to track your progress.</p>
      ) : (
        <>
          <section className="mt-8 grid gap-4 md:grid-cols-2">
            <LevelBadge />
            <StreakBadge />
          </section>

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a, i) => {
              const owned = achievements.includes(a.key);
              return (
                <motion.div
                  key={a.key}
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                  className={`relative overflow-hidden rounded-3xl border p-5 ${owned ? "border-amber-400/40 bg-amber-500/5" : "border-border bg-card/40"}`}
                >
                  <div className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${tierStyle[a.tier] ?? "from-primary to-primary"} opacity-${owned ? "30" : "5"} blur-2xl`} aria-hidden />
                  <div className="relative flex items-start justify-between">
                    <div className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${tierStyle[a.tier] ?? "from-primary to-primary"} ${owned ? "" : "grayscale opacity-50"}`}>
                      <span className="text-xl">{a.icon ?? "🏆"}</span>
                    </div>
                    {!owned && <Lock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <h3 className="relative mt-3 font-display text-lg font-bold">{a.name}</h3>
                  <p className="relative mt-1 text-sm text-muted-foreground">{a.description}</p>
                  <div className="relative mt-3 flex items-center justify-between text-xs">
                    <span className="inline-flex items-center gap-1 text-amber-300"><Zap className="h-3 w-3" /> +{a.xp_reward} XP</span>
                    <span className="uppercase tracking-widest text-muted-foreground">{a.tier}</span>
                  </div>
                </motion.div>
              );
            })}
          </section>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            {achievements.length} / {list.length} unlocked · Lv {xp.level} · <Flame className="inline h-3 w-3 text-orange-400" /> {streak.current}d streak
          </p>
        </>
      )}
    </PageShell>
  );
}
