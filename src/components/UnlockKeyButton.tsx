import { KeyRound } from "lucide-react";
import { GEN_WORKER_URL } from "@/lib/dgWorker";
import { playClick } from "@/lib/sound";

type Variant = "primary" | "outline";

export function UnlockKeyButton({
  variant = "primary",
  label = "Get Free Key",
  className = "",
}: {
  variant?: Variant;
  label?: string;
  className?: string;
}) {
  const onClick = () => {
    playClick();
    const url = GEN_WORKER_URL ? `${GEN_WORKER_URL}/start` : "/generator";
    window.location.assign(url);
  };

  const base =
    "inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.03]";

  const styles =
    variant === "primary"
      ? "text-primary-foreground glow-primary"
      : "border border-primary/40 bg-card/60 text-primary hover:border-primary hover:bg-primary/10";

  return (
    <button
      onClick={onClick}
      className={`${base} ${styles} ${className}`}
      style={variant === "primary" ? { background: "var(--gradient-primary)" } : undefined}
    >
      <KeyRound className="h-4 w-4" />
      {label}
    </button>
  );
}
