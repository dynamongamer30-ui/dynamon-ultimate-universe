import { motion } from "motion/react";
import { Flame } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";

export function StreakBadge({ compact = false }: { compact?: boolean }) {
  const { streak, checkIn, checkInStatus, loading, readError, refresh } = useGamification();
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-500/10 px-2.5 py-1 text-xs font-bold text-orange-300">
        <Flame className="h-3 w-3" /> {loading ? "…" : readError ? "—" : `${streak.current}d`}
      </div>
    );
  }
  return (
    <div
      role="region"
      aria-label="Daily streak"
      className="rounded-2xl border border-orange-400/30 bg-orange-500/5 p-4"
    >
      <div className="flex items-center gap-2">
        <motion.span
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="grid h-9 w-9 place-items-center rounded-xl text-orange-100"
          style={{ background: "linear-gradient(135deg,#f97316,#dc2626)" }}
        >
          <Flame className="h-4 w-4" />
        </motion.span>
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Daily Streak</p>
          <p className="font-display text-xl font-bold">
            {streak.current} {streak.current === 1 ? "day" : "days"}
          </p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Longest: {streak.longest} {streak.longest === 1 ? "day" : "days"} ·{" "}
        {checkInStatus === "success"
          ? "Come back tomorrow!"
          : checkInStatus === "pending"
            ? "Checking today’s visit…"
            : "Today’s check-in needs confirmation."}
      </p>
      {loading && (
        <p role="status" className="mt-3 text-sm">
          Loading your progress…
        </p>
      )}
      {readError && (
        <button
          type="button"
          onClick={() => void refresh()}
          className="touch-target mt-3 text-sm text-primary underline"
        >
          Retry progress lookup
        </button>
      )}
      {checkInStatus === "pending" && (
        <p role="status" className="mt-3 text-sm">
          Confirming daily check-in…
        </p>
      )}
      {checkInStatus === "error" && (
        <div className="mt-3 text-sm">
          <p role="alert">Daily check-in was not confirmed. Retry to finish.</p>
          <button
            type="button"
            onClick={() => void checkIn()}
            className="touch-target mt-2 text-primary underline"
          >
            Retry daily check-in
          </button>
        </div>
      )}
    </div>
  );
}
