import { Crown, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";

type Size = "xs" | "sm" | "md" | "lg";

const SIZES: Record<Size, { pad: string; text: string; icon: string }> = {
  xs: { pad: "px-1.5 py-0.5", text: "text-[9px]", icon: "h-2.5 w-2.5" },
  sm: { pad: "px-2 py-0.5",   text: "text-[10px]", icon: "h-3 w-3" },
  md: { pad: "px-2.5 py-1",   text: "text-xs",   icon: "h-3.5 w-3.5" },
  lg: { pad: "px-3 py-1.5",   text: "text-sm",   icon: "h-4 w-4" },
};

export function OwnerBadge({ size = "sm", label = "OWNER" }: { size?: Size; label?: string }) {
  const s = SIZES[size];
  return (
    <motion.span
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`relative inline-flex items-center gap-1 rounded-full font-extrabold uppercase tracking-wider text-amber-50 ${s.pad} ${s.text}`}
      style={{
        background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 35%, #f97316 65%, #d97706 100%)",
        boxShadow: "0 0 16px rgba(251,191,36,0.55), inset 0 1px 0 rgba(255,255,255,0.35)",
      }}
      aria-label="Verified owner"
    >
      <Crown className={`${s.icon} drop-shadow`} />
      {label}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ boxShadow: "0 0 0 0 rgba(251,191,36,0.6)" }}
        animate={{ boxShadow: ["0 0 0 0 rgba(251,191,36,0.55)", "0 0 0 8px rgba(251,191,36,0)"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
      />
    </motion.span>
  );
}

export function VerifiedFounderChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300">
      <ShieldCheck className="h-3.5 w-3.5" /> Verified Founder
    </span>
  );
}
