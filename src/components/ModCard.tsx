import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { Download, Heart, MessageSquare, Star, TrendingUp } from "lucide-react";
import type { Mod } from "@/lib/mods";
import { formatCount, elementTheme } from "@/lib/mods";
import { useLocalState } from "@/hooks/useLocalState";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { FavoriteButton } from "@/components/FavoriteButton";
import { playClick, playSoft, playHover, playSuccess } from "@/lib/sound";
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

  // Pointer-tracking tilt (subtle, spring-released)
  const cardRef = useRef<HTMLElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });
  const [hovered, setHovered] = useState(false);

  const onPointerMove = (e: React.PointerEvent) => {
    const el = cardRef.current;
    if (!el || window.matchMedia("(pointer: coarse)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -y * 4, ry: x * 4 });
  };
  const onPointerLeave = () => {
    setTilt({ rx: 0, ry: 0 });
    setHovered(false);
  };

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
    playSuccess();
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
      ref={cardRef}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ type: "spring", stiffness: 100, damping: 18, delay: index * 0.05 }}
      onPointerMove={onPointerMove}
      onPointerEnter={() => { setHovered(true); playHover(); }}
      onPointerLeave={onPointerLeave}
      className="edge-light group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card"
      style={{
        transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: hovered ? "box-shadow 0.3s" : "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s",
        boxShadow: hovered ? theme.glow : "var(--shadow-card)",
      }}
    >
      {/* Image — entire thing links to detail */}
      <Link
        to="/mods/$slug" params={{ slug: mod.slug }} onMouseDown={playClick}
        className="relative block aspect-[16/9] overflow-hidden"
      >
        <div
          className="absolute inset-0 z-10 opacity-30 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-55"
          style={{ background: theme.gradient }}
        />
        <img
          src={mod.image} alt={mod.name} loading="lazy" width={1024} height={1024}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-card to-transparent" />

        <div className={`absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${theme.chip}`}>
          {theme.label}
        </div>
        <div className="absolute right-4 top-4 z-20 flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-bold backdrop-blur-sm">
            <Star className="h-3 w-3 fill-gold text-gold" />
            {mod.baseRating.toFixed(1)}
          </span>
          <span className="rounded-md bg-background/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm">
            v{mod.version}
          </span>
        </div>
        {featured && (
          <div className="absolute bottom-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground">
            <TrendingUp className="h-3 w-3" /> Most popular
          </div>
        )}
      </Link>

      <div className="relative flex flex-1 flex-col p-5 sm:p-6">
        <Link to="/mods/$slug" params={{ slug: mod.slug }} onMouseDown={playClick}>
          <h3 className="font-display text-xl font-extrabold uppercase leading-tight tracking-tight transition-colors hover:text-primary">
            {mod.name}
          </h3>
        </Link>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{mod.tagline}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {mod.features.slice(0, 3).map((f) => (
            <span key={f} className="rounded-md border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
              {f}
            </span>
          ))}
        </div>

        <div className="mt-4 flex divide-x divide-border rounded-xl border border-border bg-background/50 text-center">
          <Stat label="Downloads" value={formatCount(totalDownloads)} />
          <Stat label="Likes" value={formatCount(totalLikes)} />
          <Stat label={mod.ratingCount ? "Reviews" : "Rating"} value={mod.ratingCount ? formatCount(mod.ratingCount) : mod.baseRating.toFixed(1)} />
        </div>

        <div className="mt-auto flex items-center gap-2 pt-5">
          <Link
            to="/mods/$slug" params={{ slug: mod.slug }} onClick={handleGet}
            className="press inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-[filter] hover:brightness-110 glow-primary"
          >
            <Download className="h-4 w-4 shrink-0" />
            <span className="truncate">{user ? "Download" : "Sign in to download"}</span>
          </Link>
          <button
            onClick={toggleLike} aria-label={liked ? "Unlike" : "Like"} aria-pressed={liked}
            className={`press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${liked ? "border-rose-400/50 bg-rose-400/10 text-rose-400" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`}
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-rose-400" : ""}`} />
          </button>
          <FavoriteButton slug={mod.slug} />
          <Link
            to="/mods/$slug" params={{ slug: mod.slug }} hash="comments" aria-label="Comments" onMouseDown={playClick}
            className="press hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground sm:flex"
          >
            <MessageSquare className="h-4 w-4" />
          </Link>
          <button
            onClick={share} aria-label="Share"
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShareIcon />
          </button>
        </div>
      </div>
    </motion.article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 px-2 py-2.5">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
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
