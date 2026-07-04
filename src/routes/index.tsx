import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Shield, Zap, Users, ChevronRight, Star, Download, TrendingUp, ArrowRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ModCard } from "@/components/ModCard";
import { ForYouRail } from "@/components/ForYouRail";
import { mods, totalDownloads, formatCount, elementTheme } from "@/lib/mods";
import heroImg from "@/assets/hero.jpg";
import { playClick, playHover } from "@/lib/sound";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dynamon Universe — Premium Dynamons World Mod APKs" },
      { name: "description", content: "The home of Dynamons World mod APKs. Carefully crafted fan-made builds, community-rated, with weekly drops." },
      { property: "og:title", content: "Dynamon Universe — Premium Dynamons World Mods" },
      { property: "og:description", content: "Carefully crafted fan-made Dynamons World mod builds, community-rated and updated weekly." },
    ],
  }),
  component: Index,
});

const spring = { type: "spring" as const, stiffness: 120, damping: 20 };

function Index() {
  const sorted = [...mods].sort(
    (a, b) => (b.downloads * 0.6 + b.baseLikes * 4) - (a.downloads * 0.6 + a.baseLikes * 4),
  );
  const top = sorted[0];
  const latestVersion = mods.reduce((v, m) => (m.version > v ? m.version : v), "0");

  return (
    <PageShell>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section className="relative pt-6 sm:pt-12 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary"
            >
              <span className="inline-block h-px w-8 bg-primary" aria-hidden />
              Only Dynamons World
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }}
              className="mt-6 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight text-balance sm:text-6xl lg:text-7xl xl:text-8xl"
            >
              The mod
              <br />
              <span className="text-gradient">vault.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.12 }}
              className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg text-pretty"
            >
              Eight hand-crafted Dynamons World builds. Clean injections, real community
              ratings, weekly drops. No other games, no clutter — just Dynamons.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/mods"
                onMouseDown={playClick}
                onMouseEnter={playHover}
                className="press group inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:border-primary/50 hover:text-primary"
              >
                Browse the vault
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            {/* Honest stats — machined row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.24 }}
              className="mt-10 flex divide-x divide-border border-y border-border"
            >
              <HeroStat value={`${formatCount(totalDownloads)}+`} label="Downloads" />
              <HeroStat value={`${mods.length}`} label="Editions" />
              <HeroStat value={`v${latestVersion}`} label="Latest build" />
            </motion.div>
          </div>

          {/* Featured cartridge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, rotate: 1 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="relative mx-auto w-full max-w-md"
          >
            <Link
              to="/mods/$slug" params={{ slug: top.slug }} onMouseDown={playClick} onMouseEnter={playHover}
              className="edge-light group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-elev transition-transform duration-300 hover:-translate-y-1.5"
              style={{ boxShadow: elementTheme[top.element].glow }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={heroImg}
                  alt={`${top.name} key art`}
                  width={1536} height={1024}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card to-transparent" />
              </div>
              <div className="relative p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground">
                    <TrendingUp className="h-3 w-3" /> No.1 this week
                  </div>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-gold">
                    <Star className="h-3.5 w-3.5 fill-gold" /> {top.baseRating.toFixed(1)}
                  </span>
                </div>
                <p className="mt-3 font-display text-2xl font-extrabold uppercase tracking-tight">{top.name}</p>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    v{top.version} · {formatCount(top.downloads)}+ downloads
                  </p>
                  <ArrowRight className="h-4 w-4 text-primary transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ── ELEMENT TICKER ───────────────────────────────── */}
      <section className="mt-14 overflow-hidden border-y border-border py-3" aria-hidden>
        <div className="animate-ticker flex w-max items-center gap-8 whitespace-nowrap">
          {[...mods, ...mods].map((m, i) => (
            <span key={`${m.slug}-${i}`} className="inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
              <span className={elementTheme[m.element].text}>◆</span>
              {m.name}
            </span>
          ))}
        </div>
      </section>

      {/* ── FEATURE STRIP ────────────────────────────────── */}
      <section className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3">
        {[
          { Icon: Shield, title: "Clean injection", text: "No ads, no popups, no extras. Just the game, better." },
          { Icon: Zap, title: "Weekly drops", text: "Mods refreshed within days of every official update." },
          { Icon: Users, title: "Community-first", text: "Real ratings and reviews from real trainers." },
        ].map(({ Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ ...spring, delay: i * 0.08 }}
            className="group bg-card p-6 transition-colors hover:bg-secondary"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-base font-extrabold uppercase tracking-tight">{title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
          </motion.div>
        ))}
      </section>

      {/* ── MODS SHOWCASE ────────────────────────────────── */}
      <section className="mt-20">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
              <span className="inline-block h-px w-8 bg-primary" aria-hidden />
              The vault
            </p>
            <h2 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">
              Most popular
              <br className="sm:hidden" /> this week
            </h2>
          </div>
          <Link
            to="/mods" onMouseDown={playClick} onMouseEnter={playHover}
            className="group hidden shrink-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary sm:inline-flex"
          >
            View all
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {sorted.map((m, i) => (
            <ModCard key={m.slug} mod={m} index={i} featured={i === 0} />
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Link
            to="/mods" onMouseDown={playClick}
            className="press flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-bold uppercase tracking-wider"
          >
            View all mods <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <ForYouRail />
    </PageShell>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 px-4 py-4 first:pl-0 sm:px-6">
      <p className="font-display text-2xl font-black tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    </div>
  );
}
