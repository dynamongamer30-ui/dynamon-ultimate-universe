import { motion } from "motion/react";
import { Flame } from "lucide-react";
import { useGamification } from "@/hooks/useGamification";

export function StreakBadge({ compact = false }: { compact?: boolean }) {
  const { streak } = useGamification();
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-300">
        <Flame className="h-3 w-3" /> {streak.current}d
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-orange-400/30 bg-orange-500/5 p-4">
      <div className="flex items-center gap-2">
        <motion.span animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="grid h-9 w-9 place-items-center rounded-xl text-orange-100" style={{ background: "linear-gradient(135deg,#f97316,#dc2626)" }}>
          <Flame className="h-4 w-4" />
        </motion.span>
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Daily Streak</p>
          <p className="font-display text-xl font-bold">{streak.current} days</p>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Longest: {streak.longest} days · Come back tomorrow!</p>
    </div>
  );
}
