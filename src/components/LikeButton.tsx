import { Heart } from "lucide-react";
import { motion } from "motion/react";
import { useLikes } from "@/hooks/useLikes";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { useNavigate } from "@tanstack/react-router";
import { playSoft } from "@/lib/sound";
import { toast } from "sonner";

export function LikeButton({ slug, className = "" }: { slug: string; className?: string }) {
  const { user } = useAuth();
  const { has, toggle } = useLikes();
  const { award } = useGamification();
  const navigate = useNavigate();
  const liked = has(slug);
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={async () => {
        if (!user) { navigate({ to: "/auth" }); return; }
        playSoft();
        const added = await toggle(slug);
        if (added) { toast.success("Liked"); award(2, "Liked a mod"); }
      }}
      aria-label={liked ? "Unlike" : "Like"}
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3 py-2 text-sm font-semibold transition-colors ${liked ? "text-rose-400 border-rose-400/40" : "text-muted-foreground hover:text-foreground"} ${className}`}
    >
      <Heart className={`h-4 w-4 ${liked ? "fill-rose-400" : ""}`} />
    </motion.button>
  );
}
