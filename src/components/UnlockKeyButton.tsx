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
    "press inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-[filter] hover:brightness-110";

  const styles =
    variant === "primary"
      ? "bg-primary text-primary-foreground glow-primary"
      : "border border-primary/40 bg-card text-primary hover:border-primary hover:bg-primary/10";

  return (
    <button onClick={onClick} className={`${base} ${styles} ${className}`}>
      <KeyRound className="h-4 w-4" />
      {label}
    </button>
  );
}
