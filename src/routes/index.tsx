import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Shield, Zap, Users, ChevronRight, Star, Download, TrendingUp, ArrowRight, Gift, MessageCircle, ArrowUpRight } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { ModCard } from "@/components/ModCard";
import { ForYouRail } from "@/components/ForYouRail";
import { usePerspectiveTilt } from "@/components/HeroWebGL";
import { formatCount, elementTheme, mods as catalogMods } from "@/lib/mods";
import { compareVersions, sortByLatest } from "@/lib/versionSort";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import heroImg from "@/assets/hero.webp";
import { playClick, playHover } from "@/lib/sound";
import { faqPageJsonLd, itemListJsonLd, pageSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/")({
  head: () => {
    const { links, meta } = pageSeoHead({
      path: "/",
      title: "Dynamons World Mod APK Builds, Guides & Rewards | Dynamon Universe",
      description: "Compare Dynamons World mod APK builds by features, version, element, ratings, and community signals. Explore release notes, rewards, and guided unlock access.",
    });
    return {
      meta,
      links,
      scripts: [
        faqPageJsonLd(FAQ_ITEMS),
        itemListJsonLd(catalogMods.map((mod) => ({ name: mod.name, path: `/mods/${mod.slug}`, image: mod.image }))),
      ],
    };
  },
  component: Index,
});

const spring = { type: "spring" as const, stiffness: 120, damping: 20 };

const FAQ_ITEMS = [
  {
    question: "How do I choose the right Dynamons World build?",
    answer: "Start with the feature list and version number. Choose a build that matches the way you want to play, whether that is collecting, competitive battles, exploration, or a specific element focus.",
  },
  {
    question: "Where can I see what changed in a release?",
    answer: "Every build page includes a changelog tab, a version label, and a concise feature overview so you can compare editions before starting the unlock flow.",
  },
  {
    question: "Why do some download actions require sign-in?",
    answer: "Sign-in keeps community features, saved builds, rewards, and device-bound download access connected to one trainer profile.",
  },
];

function Index() {
  const { mods } = useSiteSettings();
  // Newest version first (1.13.33, then 1.13.32, then 1.13.31 ...).
  // The first build is automatically the featured one.
  const sorted = sortByLatest(mods);
  const top = sorted[0];
  const latestVersion = mods.reduce((v, m) => (compareVersions(m.version, v) > 0 ? m.version : v), "0");
  const totalDownloads = mods.reduce((s, m) => s + m.downloads, 0);

  if (!top) return <PageShell><div className="py-20 text-center text-muted-foreground">No mods available yet.</div></PageShell>;

  return (
    <PageShell>
      {/* ── HERO ─────────────────────────────────────────── */}
      <section aria-labelledby="homepage-title" className="relative pt-4 sm:pt-10 lg:pt-14">
        <div className="hero-field">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_1fr] lg:items-center lg:gap-12">
          <div>
            <motion.p
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={spring}
              className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary"
            >
              <span className="inline-block h-px w-8 bg-primary" aria-hidden />
              Dynamon Gamer Space
            </motion.p>

            <motion.h1
              initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.06 }}
              id="homepage-title"
              className="mt-6 font-display text-4xl font-black uppercase leading-[1.05] tracking-tight text-balance sm:text-6xl lg:text-7xl xl:text-8xl"
            >
              Dynamons World
              <br />
              <span className="text-gradient">Builds, guides & rewards.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.12 }}
              className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg text-pretty"
            >
              Explore a focused collection of Dynamons World builds with clear feature notes,
              version details, and community signals. Find the edition that fits your play style,
              then unlock it through a simple, guided flow.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.18 }}
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                to="/mods"
                onMouseDown={playClick}
                onMouseEnter={playHover}
                className="press touch-target group inline-flex items-center gap-2 rounded-xl border border-primary/45 bg-primary px-6 py-3 text-sm font-bold text-primary-foreground glow-primary transition-[filter,box-shadow] hover:brightness-110 hover:shadow-[0_0_34px_-8px_oklch(0.66_0.21_318_/_0.8)]"
              >
                Browse every build
                <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </motion.div>

            {/* Honest stats — machined row */}
            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ ...spring, delay: 0.24 }}
              className="mt-8 grid grid-cols-3 divide-x divide-border border-y border-border sm:mt-10"
            >
              <HeroStat value={`${formatCount(totalDownloads)}+`} label="Community downloads" />
              <HeroStat value={`${mods.length}`} label="Curated editions" />
              <HeroStat value={`v${latestVersion}`} label="Latest release" />
            </motion.div>
          </div>

          {/* Featured cartridge */}
          <motion.div
            initial={{ opacity: 1, scale: 0.94, rotate: 1 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ ...spring, delay: 0.1 }}
            className="relative mx-auto w-full max-w-md"
          >
            <Link
              to="/mods/$slug" params={{ slug: top.slug }} onMouseDown={playClick} onMouseEnter={playHover}
              aria-label={`View featured build: ${top.name}`}
              className="edge-light group relative block overflow-hidden rounded-[var(--radius-surface)] border border-border bg-card shadow-elev transition-transform duration-300 hover:-translate-y-1.5"
              style={{ boxShadow: elementTheme[top.element].glow }}
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={heroImg}
                  alt={`${top.name} key art`}
                  width={1536} height={1024}
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-[var(--artwork-overlay)]" aria-hidden="true" />
              </div>
              <div className="relative p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-xs font-black uppercase tracking-widest text-primary-foreground">
                    <TrendingUp className="h-3 w-3" /> Featured build
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
      <section aria-labelledby="value-signals-title" className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:mt-14 sm:grid-cols-3">
        <h2 id="value-signals-title" className="sr-only">Why trainers use the vault</h2>
          {[
          { Icon: Shield, title: "Clear build notes", text: "See the features, version, and gameplay focus before you choose an edition." },
          { Icon: Zap, title: "Release-aware", text: "Track active editions and recent updates without hunting through unrelated pages." },
          { Icon: Users, title: "Community signal", text: "Use ratings, favorites, and trainer feedback to make a faster, better-informed choice." },
        ].map(({ Icon, title, text }, i) => (
          <FeaturePanel key={title} Icon={Icon} title={title} text={text} index={i} />
        ))}
      </section>

      {/* ── MODS SHOWCASE ────────────────────────────────── */}
      <section aria-labelledby="showcase-title" className="mt-16 sm:mt-20">
        <div className="flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
              <span className="inline-block h-px w-8 bg-primary" aria-hidden />
              The vault
            </p>
            <h2 id="showcase-title" className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-5xl">
              Start with the
              <br className="sm:hidden" /> latest builds
            </h2>
          </div>
          <Link
            to="/mods" onMouseDown={playClick} onMouseEnter={playHover}
            className="group hidden shrink-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary sm:inline-flex"
          >
            Compare builds
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {sorted.map((m, i) => (
            <ModCard key={m.slug} mod={m} index={i} featured={i === 0} badge="Latest update" />
          ))}
        </div>

        <div className="mt-8 sm:hidden">
          <Link
            to="/mods" onMouseDown={playClick}
            className="press flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-bold uppercase tracking-wider"
          >
            Compare all builds <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── COMMUNITY + REWARD PREVIEW ───────────────────── */}
      <motion.section
        aria-labelledby="journey-title"
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ ...spring, delay: 0.04 }}
        className="mt-20 grid gap-6 border-t border-border pt-16 lg:grid-cols-[0.8fr_1.2fr] lg:items-stretch"
      >
        <div className="flex flex-col justify-between rounded-[var(--radius-surface)] border border-border bg-card/55 p-6 sm:p-8">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
              <span className="inline-block h-px w-8 bg-primary" aria-hidden />
              Your trainer journey
            </p>
            <h2 id="journey-title" className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              Choose with confidence. <span className="text-gradient">Keep your progress.</span>
            </h2>
            <p className="page-copy mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Save the builds you care about, share useful feedback, and keep reward progress connected to your trainer profile.
            </p>
          </div>
          <Link
            to="/rewards"
            onMouseDown={playClick}
            className="press touch-target mt-8 inline-flex w-fit items-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-4 py-3 text-sm font-bold text-primary transition-colors hover:bg-primary/20"
          >
            View rewards <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <JourneyCard
            icon={<MessageCircle className="h-5 w-5" />}
            eyebrow="Community signal"
            title="Read the room before you unlock"
            text="Ratings, comments, and build notes stay separate so every signal remains understandable."
            href="/mods"
            action="Explore builds"
          />
          <JourneyCard
            icon={<Gift className="h-5 w-5" />}
            eyebrow="Reward loop"
            title="Earn without the noise"
            text="See your level, streaks, and available rewards in one calm progression surface."
            href="/rewards"
            action="Open rewards"
          />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ ...spring, delay: 0.04 }}
        className="mt-20 grid gap-10 border-t border-border pt-16 lg:grid-cols-[0.75fr_1.25fr] lg:items-start"
      >
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            <span className="inline-block h-px w-8 bg-primary" aria-hidden />
            Before you choose
          </p>
          <h2 id="faq-title" className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
            Questions, answered.
          </h2>
          <p className="page-copy mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
            The fastest route to the right build is knowing what it changes, when it was updated,
            and how it fits your play style.
          </p>
        </div>
        <div className="grid gap-3">
          {FAQ_ITEMS.map((item) => (
            <details key={item.question} className="group rounded-2xl glass px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-base font-bold tracking-tight marker:content-none">
                {item.question}
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-primary/30 text-primary transition-transform duration-300 group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="page-copy max-w-2xl pt-3 text-sm leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </motion.section>

      <ForYouRail />
    </PageShell>
  );
}

function FeaturePanel({
  Icon,
  title,
  text,
  index,
}: {
  Icon: typeof Shield;
  title: string;
  text: string;
  index: number;
}) {
  const tiltRef = usePerspectiveTilt<HTMLDivElement>();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }} transition={{ ...spring, delay: index * 0.08 }}
      className="group bg-card p-2 transition-colors hover:bg-secondary"
    >
      <div ref={tiltRef} className="feature-tilt h-full rounded-xl p-4 sm:p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
          <h3 className="mt-4 font-display text-base font-extrabold uppercase tracking-tight">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
    </motion.div>
  );
}

function JourneyCard({
  icon,
  eyebrow,
  title,
  text,
  href,
  action,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  text: string;
  href: "/mods" | "/rewards";
  action: string;
}) {
  return (
    <Link
      to={href}
      onMouseDown={playClick}
      className="group material-l1 press flex min-h-56 flex-col justify-between rounded-[var(--radius-surface)] p-6 transition-[border-color,box-shadow,transform] hover:border-primary/45 hover:shadow-[var(--interactive-glow)]"
    >
      <div>
        <span className="grid h-10 w-10 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary" aria-hidden="true">
          {icon}
        </span>
        <p className="mt-5 text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
        <h3 className="mt-2 font-display text-xl font-bold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
      </div>
      <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-foreground group-hover:text-primary">
        {action} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
      </span>
    </Link>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="min-w-0 px-2 py-3 first:pl-0 last:pr-0 sm:px-6 sm:py-4">
      <p className="truncate font-display text-xl font-black tracking-tight sm:text-3xl">{value}</p>
      <p className="mt-0.5 text-[0.65rem] font-semibold uppercase leading-tight tracking-[0.12em] text-muted-foreground sm:text-xs sm:tracking-[0.2em]">{label}</p>
    </div>
  );
}
