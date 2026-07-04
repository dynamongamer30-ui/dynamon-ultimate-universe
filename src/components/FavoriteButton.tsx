import { Bookmark } from "lucide-react";
import { motion } from "motion/react";
import { useFavorites } from "@/hooks/useFavorites";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { useNavigate } from "@tanstack/react-router";
import { playSoft } from "@/lib/sound";
import { toast } from "sonner";

export function FavoriteButton({ slug, className = "" }: { slug: string; className?: string }) {
  const { user } = useAuth();
  const { has, toggle, slugs } = useFavorites();
  const { award, grant } = useGamification();
  const navigate = useNavigate();
  const fav = has(slug);
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={async () => {
        if (!user) { navigate({ to: "/auth" }); return; }
        playSoft();
        const added = await toggle(slug);
        if (added) {
          toast.success("Saved to your vault");
          award(5, "Bookmarked");
          if (slugs.length + 1 >= 5) grant("collector");
        }
      }}
      aria-label={fav ? "Remove bookmark" : "Bookmark"}
      className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 transition-colors ${fav ? "text-amber-300 border-amber-400/40" : "text-muted-foreground hover:text-foreground"} ${className}`}
    >
      <Bookmark className={`h-4 w-4 ${fav ? "fill-amber-300" : ""}`} />
    </motion.button>
  );
}
