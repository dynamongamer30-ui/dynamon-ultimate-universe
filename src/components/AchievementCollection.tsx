import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Lock, Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { useAchievementCatalog } from "@/hooks/useAchievementCatalog";
import { Skeleton } from "@/components/Skeleton";

const tierStyle: Record<string, string> = {
  bronze: "from-amber-700 to-amber-500",
  silver: "from-slate-400 to-slate-200",
  gold: "from-amber-400 to-yellow-200",
  platinum: "from-cyan-300 to-violet-300",
  diamond: "from-sky-300 to-fuchsia-300",
};

export function AchievementCollection() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  return user && pathname === "/achievements" ? <AccountAchievements key={user.id} /> : null;
}

function AccountAchievements() {
  const reducedMotion = useReducedMotionPreference();
  const catalog = useAchievementCatalog();
  const { achievements, achievementStatus, refresh } = useGamification();
  const known = achievementStatus === "success";
  const list = catalog.isSuccess && !catalog.isFetching ? catalog.data : undefined;
  return (
    <section aria-labelledby="achievement-badges-title" className="mt-8">
      <h2
        id="achievement-badges-title"
        className="font-display text-xl font-bold uppercase tracking-tight"
      >
        Achievement badges
      </h2>
      {catalog.isError && (
        <div role="alert" className="mt-4 rounded-xl border border-destructive/30 p-4">
          <p>The achievement catalog couldn’t be loaded.</p>
          <button
            type="button"
            disabled={catalog.isFetching}
            onClick={() => void catalog.refetch()}
            className="touch-target mt-3 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Retry achievement catalog
          </button>
        </div>
      )}
      {achievementStatus === "error" && (
        <div role="alert" className="mt-4 rounded-xl border border-destructive/30 p-4">
          <p>Your earned badges couldn’t be loaded. Badge status is unavailable.</p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="touch-target mt-3 rounded-xl border border-border px-4 py-2 text-sm font-semibold"
          >
            Retry earned badges
          </button>
        </div>
      )}
      {achievementStatus === "stale" && (
        <div className="mt-4 rounded-xl border border-border p-4">
          <p role="status">
            Your progress changed. Refresh earned badges to confirm their latest status.
          </p>
          <button
            type="button"
            onClick={() => void refresh()}
            className="touch-target mt-3 rounded-xl border border-border px-4 py-2 text-sm font-semibold"
          >
            Refresh earned badges
          </button>
        </div>
      )}
      {(achievementStatus === "loading" || achievementStatus === "idle") && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Checking your earned badges…
        </p>
      )}
      {catalog.isFetching && (
        <div
          aria-label="Loading achievement catalog"
          className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-52 w-full rounded-3xl" />
          ))}
        </div>
      )}
      {list?.length === 0 && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          No achievement badges are configured yet.
        </p>
      )}
      {!!list?.length && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((a, i) => {
            const owned = known && achievements.includes(a.key);
            const style = tierStyle[a.tier] ?? "from-primary to-primary";
            return (
              <motion.article
                key={a.key}
                aria-label={a.name}
                initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={reducedMotion ? { duration: 0 } : { delay: i * 0.03 }}
                className={`relative min-w-0 overflow-hidden rounded-3xl border p-5 ${owned ? "border-amber-400/40 bg-amber-500/5" : "border-border bg-card/40"}`}
              >
                <div
                  className={`absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${style} ${owned ? "opacity-30" : "opacity-5"} blur-2xl`}
                  aria-hidden
                />
                <div className="relative flex items-start justify-between">
                  <div
                    className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${style} ${known && !owned ? "grayscale opacity-50" : ""}`}
                  >
                    <span className="text-xl" aria-hidden="true">
                      {a.icon ?? "🏆"}
                    </span>
                  </div>
                  {known && !owned && (
                    <Lock className="h-4 w-4 text-muted-foreground" aria-label="Not earned" />
                  )}
                </div>
                <h3 className="relative mt-3 break-words font-display text-lg font-bold">
                  {a.name}
                </h3>
                <p className="relative mt-1 break-words text-sm text-muted-foreground">
                  {a.description}
                </p>
                <p className="relative mt-3 text-xs font-semibold">
                  {known
                    ? owned
                      ? "Earned"
                      : "Not earned yet"
                    : achievementStatus === "error"
                      ? "Status unavailable"
                      : achievementStatus === "stale"
                        ? "Refresh needed"
                        : "Checking…"}
                </p>
                <div className="relative mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 text-amber-300">
                    <Zap className="h-3 w-3" /> +{a.xp_reward} XP
                  </span>
                  <span className="min-w-0 break-all uppercase tracking-widest text-muted-foreground">
                    {a.tier}
                  </span>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}
      {known && !!list?.length && (
        <p className="mt-6 text-center text-xs text-muted-foreground">
          {list.filter((a) => achievements.includes(a.key)).length} / {list.length} badges earned
        </p>
      )}
    </section>
  );
}
