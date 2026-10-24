import { motion } from "motion/react";
import { Zap } from "lucide-react";
import { useGamification, xpToNext } from "@/hooks/useGamification";

export function LevelBadge({ compact = false }: { compact?: boolean }) {
  const { xp, loading, readError, xpConfirmationError, xpConfirming, refresh } = useGamification();
  const busy = loading || xpConfirming;
  const unavailable = readError || xpConfirmationError;
  const { level, base, next, progress } = xpToNext(xp.xp);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
        <Zap className="h-3 w-3" /> Lv {busy ? "…" : unavailable ? "—" : level}
      </div>
    );
  }
  return (
    <div
      role="region"
      aria-label="Trainer level"
      className="rounded-2xl border border-border bg-card/60 p-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Trainer Level</p>
            <p className="font-display text-xl font-bold">
              Lv {busy ? "…" : unavailable ? "—" : level}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {busy
            ? "Loading XP…"
            : unavailable
              ? "XP unavailable"
              : `${xp.xp - base} / ${next - base} XP`}
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/60">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${busy || unavailable ? 0 : progress * 100}%` }}
          transition={{ duration: 0.8 }}
          className="h-full rounded-full"
          style={{ background: "var(--gradient-primary)" }}
        />
      </div>
      {readError && (
        <p role="alert" className="mt-3 text-sm">
          Could not finish loading your progress.
        </p>
      )}
      {xpConfirmationError && (
        <div className="mt-3 text-sm">
          <p role="alert">
            XP could not be confirmed. The action may already be recorded. Retry the lookup to check
            your current XP.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void refresh()}
            className="touch-target mt-3 rounded-xl border border-border px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Retry XP lookup
          </button>
        </div>
      )}
    </div>
  );
}
