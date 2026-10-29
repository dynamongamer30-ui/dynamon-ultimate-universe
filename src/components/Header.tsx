import { HELP_TOPICS } from "@/lib/helpTopics";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  Menu,
  X,
  Search,
  LogOut,
  User as UserIcon,
  Settings,
  Heart,
  Trophy,
  Shield,
  Bell,
  Gift,
  KeyRound,
  Compass,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { playClick } from "@/lib/sound";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useGamification } from "@/hooks/useGamification";
import { LevelBadge } from "@/components/LevelBadge";
import { StreakBadge } from "@/components/StreakBadge";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { FeedbackPreferences } from "@/components/FeedbackPreferences";
import { WebsiteThemeSelector } from "@/components/WebsiteThemeSelector";
import { openSiteGuide } from "@/components/SiteGuide";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";

import { OPEN_UPDATE_PREFERENCES } from "@/lib/updatePreferences";

const nav = [
  { to: "/", label: "Home" },
  { to: "/mods", label: "Mods" },
  { to: "/rewards", label: "Rewards" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const reducedMotion = useReducedMotionPreference();
  const { user, signOut } = useAuth();
  const { profile } = useProfile();
  const { streak } = useGamification();
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    setOpen(false);
    setSearchOpen(false);
    setQ("");
  }, [pathname]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (searchOpen) {
        setSearchOpen(false);
        searchButtonRef.current?.focus();
      } else if (open) {
        setOpen(false);
        mobileButtonRef.current?.focus();
      }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [searchOpen, open]);

  const { branding, mods } = useSiteSettings();
  const results = q.trim()
    ? mods.filter((m) =>
        (m.name + " " + m.tagline + " " + m.features.join(" ") + " " + m.element)
          .toLowerCase()
          .includes(q.trim().toLowerCase()),
      )
    : [];

  const helpResults = q.trim()
    ? HELP_TOPICS.filter((t) =>
        (t.title + " " + t.steps.join(" ")).toLowerCase().includes(q.trim().toLowerCase()),
      ).slice(0, 4)
    : [];
  const brandLogo = /^(https:\/\/|\/(?!\/))/.test(branding.logoUrl || "")
    ? branding.logoUrl
    : "/dynamon-gamer-avatar.png";
  const avatarUrl = profile?.custom_avatar_url || profile?.avatar_url || undefined;

  return (
    <>
      <header className="site-header sticky top-0 site-chrome border-b border-border/60 bg-background/95 backdrop-blur-md">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            onMouseDown={playClick}
            aria-label="Dynamon Universe home"
            className="royal-brand flex min-w-0 items-center gap-2.5 rounded-full"
          >
            <img
              src={brandLogo}
              alt=""
              width={56}
              height={56}
              className="h-[52px] w-[52px] shrink-0 rounded-full border border-border object-cover"
              onError={(event) => {
                if (event.currentTarget.getAttribute("src") !== "/dynamon-gamer-avatar.png")
                  event.currentTarget.src = "/dynamon-gamer-avatar.png";
              }}
            />
            <span className="min-w-0 max-w-24 line-clamp-2 font-display text-sm font-bold leading-tight tracking-tight [overflow-wrap:anywhere] sm:max-w-44 sm:text-lg lg:max-w-48">
              {branding.siteName}
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden min-w-0 flex-1 flex-wrap items-center justify-center gap-1 xl:flex"
          >
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onMouseDown={playClick}
                className="royal-nav-link touch-target relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-[color,background-color,box-shadow] hover:bg-secondary/60 hover:text-foreground [&.active]:text-foreground"
                activeProps={{ className: "active" }}
                activeOptions={{ exact: n.to === "/" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <button
              onClick={() => {
                setSearchOpen((v) => !v);
                setOpen(false);
                playClick();
              }}
              aria-label="Search"
              ref={searchButtonRef}
              aria-expanded={searchOpen}
              aria-controls="site-search-panel"
              className="header-control press touch-target grid place-items-center rounded-xl border border-border bg-card text-muted-foreground transition-[color,border-color,box-shadow] hover:border-primary/55 hover:text-foreground"
            >
              <Search className="h-4 w-4" />
            </button>

            <Link
              to={user ? "/profile" : "/auth"}
              aria-label={user ? "Profile" : "Sign in"}
              className="account-trigger grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-card text-foreground"
            >
              {user && avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserIcon className="h-5 w-5" />
              )}
            </Link>

            <button
              onClick={() => {
                setOpen((v) => !v);
                setSearchOpen(false);
                playClick();
              }}
              className="header-control touch-target grid place-items-center rounded-xl border border-border"
              aria-label={open ? "Close menu" : "Open menu"}
              ref={mobileButtonRef}
              aria-expanded={open}
              aria-controls="mobile-navigation"
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Search panel */}
        <AnimatePresence>
          {searchOpen && (
            <motion.div
              id="site-search-panel"
              initial={reducedMotion ? false : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={reducedMotion ? { duration: 0 } : { duration: 0.18 }}
              role="region"
              aria-label="Site search"
              className="overflow-hidden border-t border-border/60 bg-background"
            >
              <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <label htmlFor="site-search" className="sr-only">
                    Search mods, elements, and features
                  </label>
                  <input
                    id="site-search"
                    name="site-search"
                    type="search"
                    autoComplete="off"
                    aria-controls="search-results"
                    autoFocus
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault();
                        setSearchOpen(false);
                        setQ("");
                        searchButtonRef.current?.focus();
                      }
                    }}
                    placeholder="Search mods, elements, features…"
                    className="w-full rounded-xl border border-border bg-card py-3 pl-11 pr-12 text-sm outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSearchOpen(false);
                      setQ("");
                      searchButtonRef.current?.focus();
                      playClick();
                    }}
                    aria-label="Close search"
                    className="touch-target absolute right-1 top-1/2 grid -translate-y-1/2 place-items-center rounded-lg text-muted-foreground hover:bg-card hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {(results.length > 0 || helpResults.length > 0) && (
                  <ul
                    id="search-results"
                    className="mt-3 max-h-72 space-y-1 overflow-auto rounded-xl border border-border bg-card/40 p-2"
                  >
                    {helpResults.map((topic) => (
                      <li key={topic.id}>
                        <Link
                          to="/help"
                          hash={topic.id}
                          onClick={() => {
                            setSearchOpen(false);
                            setQ("");
                          }}
                          className="touch-target flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-card"
                        >
                          <Compass size={14} />
                          Guide: {topic.title}
                        </Link>
                      </li>
                    ))}
                    {results.map((m) => (
                      <li key={m.slug}>
                        <button
                          onClick={() => {
                            setSearchOpen(false);
                            setQ("");
                            navigate({ to: "/mods/$slug", params: { slug: m.slug } });
                          }}
                          className="touch-target flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-card"
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
                {q && results.length === 0 && helpResults.length === 0 && (
                  <p className="mt-3 px-2 text-sm text-muted-foreground">No mods match "{q}".</p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {open && (
          <motion.div
            id="mobile-navigation"
            initial={reducedMotion ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.18 }}
            role="navigation"
            aria-label="Mobile navigation"
            className="royal-menu max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain border-t border-border bg-background"
          >
            <div className="royal-menu-inner flex flex-col gap-1 px-4 py-3 sm:px-6">
              <div className="mb-2 flex flex-wrap items-center gap-3 border-b border-border/60 pb-3">
                <WebsiteThemeSelector />
                <FeedbackPreferences />
                <button
                  type="button"
                  className="touch-target inline-flex items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm"
                  onClick={() => {
                    setOpen(false);
                    mobileButtonRef.current?.focus();
                    openSiteGuide();
                  }}
                >
                  <Compass size={16} aria-hidden="true" /> Quick guide
                </button>
              </div>
              <p className="royal-menu-group-title">Explore</p>
              <div className="grid gap-1 sm:grid-cols-3">
                {nav.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    activeProps={{ className: "active" }}
                    activeOptions={{ exact: n.to === "/" }}
                    className="royal-nav-link touch-target rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground [&.active]:text-foreground"
                  >
                    {n.label}
                  </Link>
                ))}
              </div>
              <Link
                to="/help"
                onClick={() => setOpen(false)}
                className="touch-target mt-2 flex items-center rounded-xl px-3 text-sm"
              >
                Help & Guide
              </Link>
              {user && (
                <div className="mt-3 grid gap-1 border-t border-border pt-3 sm:grid-cols-2">
                  <p className="royal-menu-group-title sm:col-span-2">Your account</p>
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)}
                    className="touch-target flex items-center gap-2 rounded-xl px-3 py-2"
                  >
                    <Settings className="h-4 w-4" />
                    Edit profile
                  </Link>
                  <Link
                    to="/favorites"
                    onClick={() => setOpen(false)}
                    className="touch-target flex items-center gap-2 rounded-xl px-3 py-2"
                  >
                    <Heart className="h-4 w-4" />
                    My favorites
                  </Link>
                  <Link
                    to="/notifications"
                    onClick={() => setOpen(false)}
                    className="touch-target flex items-center gap-2 rounded-xl px-3 py-2"
                  >
                    <Bell className="h-4 w-4" />
                    Notifications
                  </Link>
                  <Link
                    to="/achievements"
                    onClick={() => setOpen(false)}
                    className="touch-target flex items-center gap-2 rounded-xl px-3 py-2"
                  >
                    <Trophy className="h-4 w-4" />
                    Achievements
                  </Link>
                  <button
                    onClick={() => {
                      setOpen(false);
                      mobileButtonRef.current?.focus();
                      window.dispatchEvent(new Event(OPEN_UPDATE_PREFERENCES));
                    }}
                    className="touch-target flex items-center gap-2 rounded-xl px-3 py-2 text-left"
                  >
                    <Settings className="h-4 w-4" />
                    Update preferences
                  </button>
                  {profile?.is_owner && (
                    <>
                      <Link
                        to="/admin"
                        onClick={() => setOpen(false)}
                        className="touch-target flex items-center gap-2 rounded-xl px-3 py-2"
                      >
                        <Shield className="h-4 w-4" />
                        Owner dashboard
                      </Link>
                      <Link
                        to="/admin-keys"
                        onClick={() => setOpen(false)}
                        className="touch-target flex items-center gap-2 rounded-xl px-3 py-2"
                      >
                        <KeyRound className="h-4 w-4" />
                        Key system
                      </Link>
                      <Link
                        to="/admin-control"
                        onClick={() => setOpen(false)}
                        className="touch-target flex items-center gap-2 rounded-xl px-3 py-2"
                      >
                        <Settings className="h-4 w-4" />
                        Control panel
                      </Link>
                      <Link
                        to="/admin-notifications"
                        onClick={() => setOpen(false)}
                        className="touch-target flex items-center gap-2 rounded-xl px-3 py-2"
                      >
                        <Bell className="h-4 w-4" />
                        Send notifications
                      </Link>
                    </>
                  )}
                  <button
                    onClick={async () => {
                      setOpen(false);
                      await signOut();
                    }}
                    className="touch-target flex items-center gap-2 rounded-xl px-3 py-2 text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              )}
              {!user && (
                <Link
                  to="/auth"
                  onClick={() => setOpen(false)}
                  className="touch-target mt-2 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <UserIcon className="h-4 w-4" /> Sign in
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </header>
      {user && (
        <div aria-label="Trainer progress" className="border-b border-border/50 bg-background">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2 text-sm">
            <LevelBadge compact />
            {streak.current > 0 && <StreakBadge compact />}
            <Link
              to="/rewards"
              className="ml-auto inline-flex min-h-9 items-center gap-2 text-muted-foreground"
            >
              <Gift className="h-4 w-4" />
              Rewards
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
