import { Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Menu, Sparkles, X, Search, LogOut, User as UserIcon, Settings, Heart, Trophy, Shield, Bell } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { playClick } from "@/lib/sound";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useGamification } from "@/hooks/useGamification";
import { getAvatarUrl } from "@/lib/avatars";
import { mods } from "@/lib/mods";
import { OwnerBadge } from "@/components/OwnerBadge";
import { LevelBadge } from "@/components/LevelBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { NotificationBell } from "@/components/NotificationBell";

const nav = [
  { to: "/", label: "Home" },
  { to: "/mods", label: "Mods" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { xp, streak } = useGamification();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const results = q.trim()
    ? mods.filter((m) => (m.name + " " + m.tagline + " " + m.features.join(" ") + " " + m.element).toLowerCase().includes(q.toLowerCase()))
    : [];

  const avatarUrl = getAvatarUrl(profile?.avatar_url);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link to="/" onMouseDown={playClick} className="flex items-center gap-2 min-w-0">
          <motion.span
            initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Sparkles className="h-5 w-5 text-primary-foreground" />
            <span className="absolute inset-0 rounded-xl animate-pulse-glow" />
          </motion.span>
          <span className="hidden truncate font-display text-lg font-bold sm:inline sm:text-xl">
            Dynamon <span className="text-gradient">Universe</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {nav.map((n) => (
            <Link
              key={n.to} to={n.to} onMouseDown={playClick}
              className="relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:bg-card/60"
              activeProps={{ className: "active" }}
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden items-center gap-2 md:flex">
              <LevelBadge compact />
              {streak.current > 0 && <StreakBadge compact />}
            </div>
          )}
          <button
            onClick={() => { setSearchOpen((v) => !v); playClick(); }}
            aria-label="Search"
            className="press grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>

          {user && <NotificationBell />}

          {user ? (
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className={`relative grid h-10 w-10 place-items-center overflow-hidden rounded-full text-primary-foreground ${profile?.is_owner ? "ring-2 ring-amber-400/70" : "ring-2 ring-primary/40"}`}
                style={!avatarUrl ? { background: "var(--gradient-violet)" } : undefined}
                aria-label="Account"
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (profile?.display_name?.[0] ?? user.email?.[0] ?? "T").toUpperCase()
                )}
                {profile?.is_owner && (
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-[8px] font-extrabold text-amber-50" style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", boxShadow: "0 0 8px rgba(251,191,36,0.7)" }}>
                    ★
                  </span>
                )}
              </button>
              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl glass shadow-elev"
                  >
                    <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
                      {avatarUrl && <img src={avatarUrl} alt="" className={`h-10 w-10 rounded-full object-cover ${profile?.is_owner ? "ring-2 ring-amber-400/70" : "ring-2 ring-primary/40"}`} />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">{profile?.display_name ?? "Trainer"}</p>
                          {profile?.is_owner && <OwnerBadge size="xs" />}
                        </div>
                        <p className="truncate text-xs text-muted-foreground">@{profile?.username ?? user.email}</p>
                      </div>
                    </div>
                    <Link to="/profile" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-card/60">
                      <Settings className="h-4 w-4" /> Edit profile
                    </Link>
                    <Link to="/favorites" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-card/60">
                      <Heart className="h-4 w-4" /> My favorites
                    </Link>
                    <Link to="/notifications" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-card/60">
                      <Bell className="h-4 w-4" /> Notifications
                    </Link>
                    <Link to="/achievements" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-card/60">
                      <Trophy className="h-4 w-4" /> Achievements · Lv {xp.level}
                    </Link>
                    {profile?.is_owner && (
                      <>
                        <Link to="/admin" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 border-t border-border/60 px-4 py-3 text-left text-sm text-amber-300 hover:bg-card/60">
                          <Shield className="h-4 w-4" /> Owner dashboard
                        </Link>
                        <Link to="/admin-control" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-amber-300 hover:bg-card/60">
                          <Settings className="h-4 w-4" /> Control panel
                        </Link>
                        <Link to="/admin-notifications" onClick={() => setMenuOpen(false)} className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-amber-300 hover:bg-card/60">
                          <Bell className="h-4 w-4" /> Send notifications
                        </Link>
                      </>
                    )}
                    <button
                      onClick={async () => { setMenuOpen(false); await signOut(); }}
                      className="flex w-full items-center gap-2 border-t border-border/60 px-4 py-3 text-left text-sm hover:bg-card/60"
                    >
                      <LogOut className="h-4 w-4" /> Sign out
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <Link
              to="/auth" onMouseDown={playClick}
              className="press hidden items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground glow-primary transition-[filter] hover:brightness-110 sm:inline-flex"
            >
              <UserIcon className="h-4 w-4" /> Sign in
            </Link>
          )}

          <button
            onClick={() => { setOpen((v) => !v); playClick(); }}
            className="grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden"
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Search panel */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden border-t border-border/60 bg-background/95"
          >
            <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Search mods, elements, features…"
                  className="w-full rounded-xl border border-border bg-card/60 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
                />
              </div>
              {results.length > 0 && (
                <ul className="mt-3 max-h-72 space-y-1 overflow-auto rounded-xl border border-border bg-card/40 p-2">
                  {results.map((m) => (
                    <li key={m.slug}>
                      <button
                        onClick={() => { setSearchOpen(false); setQ(""); navigate({ to: "/mods/$slug", params: { slug: m.slug } }); }}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-card"
                      >
                        <img src={m.image} alt="" className="h-9 w-9 rounded-lg object-cover" />
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{m.name}</p>
                          <p className="truncate text-xs text-muted-foreground">{m.tagline}</p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {q && results.length === 0 && (
                <p className="mt-3 px-2 text-sm text-muted-foreground">No mods match "{q}".</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="border-t border-border/60 bg-background/95 lg:hidden"
        >
          <div className="flex flex-col gap-1 px-4 py-3">
            {nav.map((n) => (
              <Link
                key={n.to} to={n.to} onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground"
              >
                {n.label}
              </Link>
            ))}
            {!user && (
              <Link
                to="/auth" onClick={() => setOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <UserIcon className="h-4 w-4" /> Sign in
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </header>
  );
}
