import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Sparkles, Shield, Zap, Users, ChevronRight, Star, Download, TrendingUp } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ModCard } from "@/components/ModCard";
import { UnlockKeyButton } from "@/components/UnlockKeyButton";
import { ForYouRail } from "@/components/ForYouRail";
import { mods, totalDownloads, formatCount } from "@/lib/mods";
import heroImg from "@/assets/hero.jpg";
import { playClick } from "@/lib/sound";

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

function Index() {
  // Sorted by popularity (downloads weighted with likes)
  const sorted = [...mods].sort(
    (a, b) => (b.downloads * 0.6 + b.baseLikes * 4) - (a.downloads * 0.6 + a.baseLikes * 4),
  );
  const top = sorted[0];

  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden rounded-[2rem] glass noise p-6 sm:p-10 lg:p-14">
        <div className="absolute -right-20 top-1/2 h-96 w-96 -translate-y-1/2 rounded-full bg-accent/20 blur-3xl" aria-hidden />
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/20 blur-3xl" aria-hidden />

        <div className="relative grid gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div>
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary"
            >
              <Sparkles className="h-3.5 w-3.5" /> Only Dynamons World mods
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="mt-5 font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl lg:text-6xl"
            >
              The premium <span className="text-gradient">Dynamons World</span> mod hub.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg"
            >
              Hand-picked, lovingly crafted fan-made builds. Clean injections, real community ratings,
              and weekly drops — no clutter, no other games. Just Dynamons.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="mt-8 flex flex-wrap gap-3"
            >
              <UnlockKeyButton label="Get Free Key" />
              <Link
                to="/mods"
                onMouseDown={playClick}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
              >
                Browse the mods
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/about"
                onMouseDown={playClick}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-6 py-3 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
              >
                What is this?
              </Link>
            </motion.div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
              <HeroStat icon={<Download className="h-4 w-4" />} value={`${formatCount(totalDownloads)}+`} label="Total downloads" />
              <HeroStat icon={<Users className="h-4 w-4" />} value="20K+" label="Active trainers" />
              <HeroStat icon={<Star className="h-4 w-4" />} value="4.9" label="Avg. rating" />
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7 }}
            className="relative mx-auto w-full max-w-md"
          >
            <div className="absolute inset-0 rounded-[2rem] blur-3xl opacity-60" style={{ background: "var(--gradient-violet)" }} aria-hidden />
            <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }} className="relative overflow-hidden rounded-[2rem] glass shadow-elev">
              <img src={heroImg} alt="Dynamon creature key art" width={1536} height={1024} className="h-full w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card via-card/40 to-transparent p-6 pt-16">
                <div className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                  <TrendingUp className="h-3 w-3" /> #1 Most Popular
                </div>
                <p className="mt-2 font-display text-xl font-bold">{top.name}</p>
                <p className="text-xs text-muted-foreground">v{top.version} · {formatCount(top.downloads)}+ downloads</p>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature strip */}
      <section className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { Icon: Shield, title: "Clean injection", text: "No ads, no popups, no extras. Just the game, better." },
          { Icon: Zap, title: "Weekly drops", text: "Mods refreshed within days of every official update." },
          { Icon: Users, title: "Community-first", text: "Real ratings & reviews from real trainers." },
        ].map(({ Icon, title, text }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: i * 0.08 }}
            className="rounded-2xl glass p-5"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="mt-4 font-display text-base font-bold">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{text}</p>
          </motion.div>
        ))}
      </section>

      {/* MODS PANEL */}
      <section className="mt-16">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">The vault</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl">Most popular this week</h2>
            <p className="mt-2 text-sm text-muted-foreground">Sorted by downloads & likes. Like, review and share the ones you love.</p>
          </div>
          <Link to="/mods" onMouseDown={playClick} className="hidden shrink-0 text-sm font-semibold text-primary hover:underline sm:inline">
            View all →
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-2">
          {sorted.map((m, i) => (
            <ModCard key={m.slug} mod={m} index={i} featured={i === 0} />
          ))}
        </div>
      </section>

      <ForYouRail />
    </PageShell>
  );
}

function HeroStat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 px-4 py-3">
      <div className="flex items-center gap-1.5 text-primary">{icon}<span className="font-display text-lg font-bold text-foreground">{value}</span></div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
