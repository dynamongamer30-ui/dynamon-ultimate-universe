import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, Home } from "lucide-react";
import { playClick } from "@/lib/sound";

/** Smooth back + home pills shown on every page (hidden on the home route). */
export function BackHome() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/") return null;

  const goBack = () => {
    playClick();
    if (window.history.length > 1) router.history.back();
    else router.navigate({ to: "/" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="mb-6 flex items-center gap-2"
    >
      <button
        onClick={goBack}
        className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3.5 py-2 text-xs font-semibold text-muted-foreground backdrop-blur transition-all hover:border-primary/40 hover:text-foreground hover:shadow-[0_0_24px_-6px_var(--primary)]"
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        Back
      </button>
      <Link
        to="/"
        onMouseDown={playClick}
        className="group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3.5 py-2 text-xs font-semibold text-muted-foreground backdrop-blur transition-all hover:border-primary/40 hover:text-foreground hover:shadow-[0_0_24px_-6px_var(--primary)]"
      >
        <Home className="h-3.5 w-3.5" />
        Home
      </Link>
    </motion.div>
  );
}
