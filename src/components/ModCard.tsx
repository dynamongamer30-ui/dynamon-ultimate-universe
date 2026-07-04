import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Download, Heart, MessageSquare, Star, TrendingUp, Sparkles } from "lucide-react";
import type { Mod } from "@/lib/mods";
import { formatCount, elementTheme } from "@/lib/mods";
import { useLocalState } from "@/hooks/useLocalState";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { FavoriteButton } from "@/components/FavoriteButton";
import { playClick, playSoft } from "@/lib/sound";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";

export function ModCard({ mod, index = 0, featured = false }: { mod: Mod; index?: number; featured?: boolean }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { award, grant } = useGamification();
  const theme = elementTheme[mod.element];
  const [localLikes, setLocalLikes] = useLocalState<number>(`mod:${mod.slug}:likes`, 0);
  const [liked, setLiked] = useLocalState<boolean>(`mod:${mod.slug}:liked`, false);
  const [extraDl, setExtraDl] = useLocalState<number>(`mod:${mod.slug}:dl`, 0);

  const totalLikes = mod.baseLikes + localLikes;
  const totalDownloads = mod.downloads + extraDl;

  const toggleLike = () => {
    if (!user) { navigate({ to: "/auth" }); return; }
    const newLiked = !liked;
    setLiked(newLiked);
    setLocalLikes((n) => (newLiked ? n + 1 : Math.max(0, n - 1)));
    playSoft();
    if (newLiked) { award(3, "Liked"); grant("first_like"); }
  };

  const handleGet = (e: React.MouseEvent) => {
    if (!user) {
      e.preventDefault();
      navigate({ to: "/auth" });
      return;
    }
    playClick();
    setExtraDl((n) => n + 1);
    award(10, "Downloaded");
    grant("first_download");
    toast.success(`${mod.name} — download starting`, {
      description: "Build access is delivered through our community channels for safety.",
    });
  };

  const share = async () => {
    playClick();
    const url = `${window.location.origin}/mods/${mod.slug}`;
    try {
      if (navigator.share) await navigator.share({ title: mod.name, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch { /* ignore */ }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
      className="group relative flex flex-col overflow-hidden rounded-3xl glass shadow-elev"
      style={{ boxShadow: theme.glow }}
    >
      {/* Image — entire thing links to detail */}
      <Link
        to="/mods/$slug" params={{ slug: mod.slug }} onMouseDown={playClick}
        className="relative block aspect-[16/10] overflow-hidden"
      >
        <div className="absolute inset-0 opacity-50 mix-blend-overlay transition-opacity group-hover:opacity-70" style={{ background: theme.gradient }} />
        <motion.img
          src={mod.image} alt={mod.name} loading="lazy" width={1024} height={1024}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-card via-card/40 to-transparent" />

        <div className={`absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-widest backdrop-blur ${theme.chip}`}>
          <Sparkles className="h-3 w-3" /> {theme.label}
        </div>
        <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
          <div className="inline-flex items-center gap-1 rounded-full bg-background/70 px-2.5 py-1 text-xs font-semibold backdrop-blur">
            <Star className="h-3 w-3 fill-[var(--gold)] text-[var(--gold)]" />
            {mod.baseRating.toFixed(1)}
          </div>
          <div className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur">
            v{mod.version}
          </div>
        </div>
        {featured && (
          <div className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
            <TrendingUp className="h-3 w-3" /> Most Popular
          </div>
        )}
      </Link>

      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <Link to="/mods/$slug" params={{ slug: mod.slug }} onMouseDown={playClick}>
          <h3 className="font-display text-xl font-bold leading-tight hover:text-primary">{mod.name}</h3>
        </Link>
        <p className="mt-1.5 text-sm text-muted-foreground">{mod.tagline}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {mod.features.slice(0, 3).map((f) => (
            <span key={f} className="rounded-full border border-border bg-card/60 px-2.5 py-0.5 text-[11px] text-muted-foreground">
              {f}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl border border-border/60 bg-background/40 p-3 text-center">
          <Stat icon={<Download className="h-3 w-3" />} label="Downloads" value={formatCount(totalDownloads)} />
          <Stat icon={<Heart className="h-3 w-3" />} label="Likes" value={formatCount(totalLikes)} />
          <Stat icon={<Star className="h-3 w-3" />} label={mod.ratingCount ? `${formatCount(mod.ratingCount)} reviews` : "Rating"} value={mod.baseRating.toFixed(1)} />
        </div>

        <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 pt-5">
          <Link
            to="/mods/$slug" params={{ slug: mod.slug }} onClick={handleGet}
            className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary transition-transform hover:scale-[1.02]"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Download className="h-4 w-4" /> {user ? "Download" : "Sign in to download"}
          </Link>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleLike} aria-label="Like"
              className={`grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 transition-colors ${liked ? "text-rose-400 border-rose-400/40" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Heart className={`h-4 w-4 ${liked ? "fill-rose-400" : ""}`} />
            </button>
            <FavoriteButton slug={mod.slug} />
            <Link
              to="/mods/$slug" params={{ slug: mod.slug }} hash="comments" aria-label="Comments"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
            <button
              onClick={share} aria-label="Share"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 text-muted-foreground transition-colors hover:text-foreground"
            >
              <ShareIcon />
            </button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
    </div>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}
