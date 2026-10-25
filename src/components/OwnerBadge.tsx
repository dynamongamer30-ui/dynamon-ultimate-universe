import { Crown, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

type Size = "xs" | "sm" | "md" | "lg";

const SIZES: Record<Size, { pad: string; text: string; icon: string }> = {
  xs: { pad: "px-1.5 py-0.5", text: "text-xs", icon: "h-2.5 w-2.5" },
  sm: { pad: "px-2 py-0.5", text: "text-xs", icon: "h-3 w-3" },
  md: { pad: "px-2.5 py-1", text: "text-xs", icon: "h-3.5 w-3.5" },
  lg: { pad: "px-3 py-1.5", text: "text-sm", icon: "h-4 w-4" },
};

export function OwnerBadge({ size = "sm", label = "OWNER" }: { size?: Size; label?: string }) {
  const s = SIZES[size];
  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative inline-flex items-center gap-1 rounded-full font-extrabold uppercase tracking-wider text-primary-foreground ${s.pad} ${s.text}`}
      style={{
        background: "var(--gradient-primary)",
        boxShadow: "var(--shadow-glow)",
      }}
      aria-label="Verified owner"
    >
      <Crown className={`${s.icon} drop-shadow`} />
      {label}
    </motion.span>
  );
}

export function VerifiedFounderChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-primary-ink">
      <ShieldCheck className="h-3.5 w-3.5" /> Verified Founder
    </span>
  );
}
