import { motion } from "motion/react";
import { Zap } from "lucide-react";
import { useGamification, xpToNext } from "@/hooks/useGamification";

export function LevelBadge({ compact = false }: { compact?: boolean }) {
  const { xp } = useGamification();
  const { level, base, next, progress } = xpToNext(xp.xp);

  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
        <Zap className="h-3 w-3" /> Lv {level}
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <Zap className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Trainer Level</p>
            <p className="font-display text-xl font-bold">Lv {level}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">{xp.xp - base} / {next - base} XP</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-background/60">
        <motion.div initial={{ width: 0 }} animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.8 }} className="h-full rounded-full" style={{ background: "var(--gradient-primary)" }} />
      </div>
    </div>
  );
}
