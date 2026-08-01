import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Trophy, Lock, Zap, Flame, KeyRound, Feather, Check, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { LevelBadge } from "@/components/LevelBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";

// Not in the generated Supabase types yet; .bind(supabase) or `this` is lost.
const looseRpc = supabase.rpc.bind(supabase) as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

type TrainerLevelRow = { level: number; days_required: number; reward_kind: string; reward_qty: number };
type TrainerProgress = {
  current_level: number; next_level: number | null; days_required: number;
  days_elapsed: number; reward_kind: string; reward_qty: number; claimable: boolean;
};

const rewardIcon = (kind: string) => {
  if (kind === "trainer_vip_key") return <KeyRound className="h-4 w-4 text-fuchsia-300" />;
  if (kind === "trainer_dg_key") return <KeyRound className="h-4 w-4 text-primary" />;
  if (kind === "phoenix_pass") return <Feather className="h-4 w-4 text-amber-300" />;
  return null;
};
const rewardLabel = (kind: string, qty: number) => {
  if (kind === "trainer_vip_key") return `${qty} VIP Key`;
  if (kind === "trainer_dg_key") return `${qty} DG Key`;
  if (kind === "phoenix_pass") return `${qty} Phoenix Pass`;
  return "";
};

function TrainerRankLadder() {
  const { user } = useAuth();
  const [levels, setLevels] = useState<TrainerLevelRow[]>([]);
  const [progress, setProgress] = useState<TrainerProgress | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("trainer_levels").select("*").order("level");
      setLevels((data ?? []) as TrainerLevelRow[]);
      if (user) {
        const { data: p, error } = await looseRpc("my_trainer_progress");
        if (!error) setProgress(((p as TrainerProgress[] | null) ?? [])[0] ?? null);
      }
      setLoading(false);
    })();
  }, [user]);

  if (!user || loading || levels.length === 0) return null;

  const currentLevel = progress?.current_level ?? 0;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-300" />
        <h2 className="font-display text-xl font-bold uppercase tracking-tight">Trainer Rank</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Climb 10 levels by staying active. Real Phoenix Passes, DG keys, and — only at Level 10 — a VIP key you can't get any other way.
      </p>

      <div className="mt-5 space-y-2">
        {levels.map((lv) => {
          const claimed = lv.level <= currentLevel;
          const isNext = lv.level === currentLevel + 1;
          const claimable = isNext && !!progress?.claimable;
          return (
            <motion.div
              key={lv.level}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: lv.level * 0.02 }}
              className={`flex items-center gap-4 rounded-2xl border p-4 ${
                claimed ? "border-emerald-400/30 bg-emerald-500/5"
                : claimable ? "border-primary/40 bg-primary/5"
                : "border-border bg-card/30"
              }`}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display font-black ${
                claimed ? "bg-emerald-500/15 text-emerald-300" : "bg-card text-muted-foreground"
              }`}>
                {claimed ? <Check className="h-5 w-5" /> : lv.level}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold">Level {lv.level}</p>
                <p className="text-xs text-muted-foreground">
                  {isNext
                    ? `${progress?.days_elapsed ?? 0} / ${lv.days_required} day login streak`
                    : claimed ? "Claimed" : `${lv.days_required}-day login streak`}
                </p>
              </div>
              {lv.reward_kind !== "none" && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1 text-xs font-semibold">
                  {rewardIcon(lv.reward_kind)} {rewardLabel(lv.reward_kind, lv.reward_qty)}
                </span>
              )}
              {claimable && (
                <Link
                  to="/claim" search={{ kind: "trainer_level", ref: "", label: "" }}
                  className="press inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition hover:brightness-110"
                >
                  Claim <ArrowRight className="h-3 w-3" />
                </Link>
              )}
              {!claimed && !isNext && <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

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
      <header className="edge-light rounded-2xl glass p-8 sm:p-12">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <Trophy className="h-3.5 w-3.5" /> Progression
        </p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">Trainer achievements</h1>
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

          <TrainerRankLadder />

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
