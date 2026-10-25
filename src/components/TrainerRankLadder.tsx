import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { Link, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Trophy, Lock, KeyRound, Feather, Check, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { useTrainerRank } from "@/hooks/useTrainerRank";
import { Skeleton } from "@/components/Skeleton";

function rewardLabel(kind: string, qty: number) {
  const label =
    kind === "trainer_vip_key" ? "VIP Key" : kind === "trainer_dg_key" ? "DG Key" : "Phoenix Pass";
  return `${qty} ${label}${qty === 1 ? "" : "s"}`;
}

export function TrainerRankLadder() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // Router transitions can briefly remount the previous outlet on the next URL.
  return user && pathname === "/achievements" ? (
    <AccountRank key={user.id} userId={user.id} />
  ) : null;
}

function AccountRank({ userId }: { userId: string }) {
  const reducedMotion = useReducedMotionPreference();
  const { streak, checkInStatus } = useGamification();
  const confirmed = checkInStatus === "success";
  const settled = confirmed || checkInStatus === "error";
  const { catalog, progress } = useTrainerRank(userId, confirmed ? streak.current : null, settled);
  const levels = catalog.isSuccess && !catalog.isFetching ? catalog.data : undefined;
  const personal = progress.isSuccess && !progress.isFetching ? progress.data : undefined;
  const current = personal?.current_level;
  const next = levels?.find((level) => level.level === (current ?? -1) + 1);
  const mismatch = !!(
    personal &&
    levels?.length &&
    (personal.kind === "terminal"
      ? current !== levels.at(-1)!.level
      : !next ||
        next.level !== personal.next_level ||
        next.days_required !== personal.days_required ||
        next.reward_kind !== personal.reward_kind ||
        next.reward_qty !== personal.reward_qty)
  );
  const known = !!personal && !mismatch;
  const retryClass =
    "touch-target mt-3 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-card/60 disabled:opacity-60";

  return (
    <section className="mt-10" aria-labelledby="trainer-rank-title">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-300" />
        <h2
          id="trainer-rank-title"
          className="font-display text-xl font-bold uppercase tracking-tight"
        >
          Trainer Rank
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Keep your login streak to unlock Trainer Rank rewards. Claim eligibility is checked by the
        server.
      </p>

      {catalog.isError && (
        <div role="alert" className="mt-4 rounded-xl border border-destructive/30 p-4">
          <p>Trainer Rank rewards couldn’t be loaded.</p>
          <button
            type="button"
            className={retryClass}
            disabled={catalog.isFetching}
            onClick={() => void catalog.refetch()}
          >
            Retry rank rewards
          </button>
        </div>
      )}
      {progress.isError && (
        <div role="alert" className="mt-4 rounded-xl border border-destructive/30 p-4">
          <p>Your Trainer Rank couldn’t be loaded. Claim status is unavailable.</p>
          <button
            type="button"
            className={retryClass}
            disabled={progress.isFetching}
            onClick={() => void progress.refetch()}
          >
            Retry rank lookup
          </button>
        </div>
      )}
      {mismatch && (
        <div role="alert" className="mt-4 rounded-xl border border-destructive/30 p-4">
          <p>Your rank could not be matched to the current rewards. Refresh before claiming.</p>
          <button
            type="button"
            className={retryClass}
            onClick={() => {
              void catalog.refetch();
              void progress.refetch();
            }}
          >
            Refresh Trainer Rank
          </button>
        </div>
      )}
      {known && <p className="mt-4 text-sm font-semibold">Current Trainer Rank: Level {current}</p>}
      {!settled && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Waiting for daily check-in before looking up your rank…
        </p>
      )}
      {settled && progress.isFetching && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          Loading your Trainer Rank…
        </p>
      )}
      {!confirmed && settled && (
        <p className="mt-3 text-sm text-muted-foreground">
          Confirm your daily check-in in the Daily streak card before claiming a rank reward.
        </p>
      )}
      {known && personal?.kind === "terminal" && !!levels?.length && (
        <p role="status" className="mt-3 text-sm text-emerald-300">
          All configured Trainer Rank rewards claimed.
        </p>
      )}
      {levels?.length === 0 && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Trainer Rank rewards are not configured yet.
        </p>
      )}

      {catalog.isFetching ? (
        <div aria-label="Loading rank rewards" className="mt-5 space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {levels?.map((level) => {
            const claimed = known && level.level <= current!;
            const isNext =
              known && personal?.kind === "next" && personal.next_level === level.level;
            const claimable =
              isNext && personal?.kind === "next" && personal.claimable && confirmed;
            return (
              <motion.div
                key={level.level}
                initial={reducedMotion ? false : { opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={reducedMotion ? { duration: 0 } : { delay: level.level * 0.02 }}
                className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 ${claimed ? "border-emerald-400/30 bg-emerald-500/5" : claimable ? "border-primary/40 bg-primary/5" : "border-border bg-card/30"}`}
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl font-display font-black ${claimed ? "bg-emerald-500/15 text-emerald-300" : "bg-card text-muted-foreground"}`}
                  aria-hidden="true"
                >
                  {claimed ? <Check className="h-5 w-5" /> : level.level}
                </span>
                <div className="min-w-0 flex-1 basis-24">
                  <p className="text-sm font-bold">
                    Level {level.level}
                    {known && !claimed && !isNext && (
                      <Lock
                        className="ml-1 inline h-3 w-3 text-muted-foreground"
                        aria-label="Locked"
                      />
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {claimed
                      ? "Claimed"
                      : isNext && personal?.kind === "next"
                        ? `${personal.days_elapsed} / ${level.days_required} day login streak`
                        : `${level.days_required}-day login streak`}
                  </p>
                </div>
                {level.reward_kind !== "none" && (
                  <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-border bg-background/60 px-2.5 py-1 text-xs font-semibold">
                    {level.reward_kind === "phoenix_pass" ? (
                      <Feather className="h-4 w-4 shrink-0 text-amber-300" />
                    ) : (
                      <KeyRound
                        className={`h-4 w-4 shrink-0 ${level.reward_kind === "trainer_vip_key" ? "text-fuchsia-300" : "text-primary-ink"}`}
                      />
                    )}
                    <span>{rewardLabel(level.reward_kind, level.reward_qty)}</span>
                  </span>
                )}
                {claimable && (
                  <Link
                    to="/claim"
                    search={{ kind: "trainer_level", ref: "", label: "" }}
                    aria-label={`Claim Trainer Level ${level.level}`}
                    className="touch-target press inline-flex shrink-0 items-center justify-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"
                  >
                    Claim <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}
