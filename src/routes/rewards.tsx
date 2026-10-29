import { RewardHistory } from "@/components/RewardHistory";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Feather,
  KeyRound,
  Sparkles,
  Clock,
  Users,
  Bell,
  Gift,
  ArrowRight,
  Loader2,
  Copy,
  Check,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { useDailyRewards } from "@/hooks/useDailyRewards";
import { playClick } from "@/lib/sound";
import { toast } from "sonner";
import { pageSeoHead } from "@/lib/seo";

export const Route = createFileRoute("/rewards")({
  head: () =>
    pageSeoHead({
      path: "/rewards",
      title: "Dynamon Universe Daily Rewards — Keys, Passes & Trainer Progress",
      description:
        "Learn how Dynamon Universe daily rewards, trainer progress, keys, and Phoenix Passes work, including the steps to claim available rewards.",
    }),
  component: Rewards,
});

function Rewards() {
  const { user } = useAuth();
  return (
    <PageShell>
      <RewardHistory />
      {/* Hero */}
      <section
        aria-labelledby="rewards-title"
        className="route-hero relative overflow-hidden edge-light rounded-2xl glass p-8 sm:p-14"
      >
        <div
          className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-amber-500/10 blur-3xl"
          aria-hidden
        />
        <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary-ink">
          <span className="inline-block h-px w-8 bg-primary" aria-hidden />
          Daily rewards
        </p>
        <h1
          id="rewards-title"
          className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-5xl"
        >
          Two prizes. <span className="text-gradient">Every single day.</span>
        </h1>
        <p className="mt-5 max-w-2xl leading-relaxed text-muted-foreground text-pretty">
          At <span className="font-semibold text-foreground">midnight IST</span> we draw winners for
          two different rewards — a <span className="font-semibold text-foreground">Daily Key</span>{" "}
          and a <span className="font-semibold text-foreground">Phoenix Pass</span>. Everyone with
          an account is automatically in the running. Winners change daily, and you never need to
          buy anything.
        </p>
      </section>

      {user && <AccountRewards key={user.id} />}

      {/* The two prizes */}
      <section aria-labelledby="prizes-title" className="mt-10 grid gap-6 md:grid-cols-2">
        <h2 id="prizes-title" className="sr-only">
          Available daily rewards
        </h2>
        <PrizeCard
          icon={<KeyRound className="h-6 w-6" />}
          accent="text-primary-ink"
          ring="border-primary/30"
          glow="from-primary/10 to-transparent"
          eyebrow="3 winners daily"
          title="Daily Key"
          body="A free license key for the Dynamon Universe Android app — the same key others pay for. If you win, your key arrives straight in your notifications. Just open it, copy the key, and paste it into the app."
          points={[
            "Delivered instantly to your Notifications",
            "Copy-paste ready — no steps to complete",
            "Collect from Notifications within 24 hours of winning",
          ]}
        />
        <PrizeCard
          icon={<Feather className="h-6 w-6" />}
          accent="text-amber-300"
          ring="border-amber-400/40"
          glow="from-amber-500/10 to-transparent"
          eyebrow="3 winners daily"
          title="Phoenix Pass"
          body="A golden skip-pass. Spend it on ANY mod to bypass the download step and go straight to the link — instantly. One pass, one download, your choice of mod."
          points={[
            "Skips the follow / download step entirely",
            "Works on any mod on the site",
            "Claim within 24 hours; spend within 30 days of claiming",
          ]}
        />
      </section>

      {/* How it works */}
      <section className="mt-12">
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
          How it works
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Step
            icon={<Clock className="h-5 w-5" />}
            title="Midnight IST"
            text="Both draws run automatically every day at 12:00 AM India time."
          />
          <Step
            icon={<Users className="h-5 w-5" />}
            title="Fresh winners"
            text="Six different accounts win each day — three keys, three passes. Recent winners sit out so it spreads around."
          />
          <Step
            icon={<Bell className="h-5 w-5" />}
            title="Everyone’s notified"
            text="The same announcement goes to every account, so you’ll always know a draw just happened."
          />
          <Step
            icon={<Gift className="h-5 w-5" />}
            title="Collect in 24h"
            text="Open the winning notification to collect your prize within 24 hours. A claimed Phoenix Pass has a 30-day spending window."
          />
        </div>
      </section>

      {/* Rules / fine print */}
      <section className="mt-12 rounded-2xl glass p-6 sm:p-8">
        <h2 className="font-display text-xl font-extrabold uppercase tracking-tight">
          Good to know
        </h2>
        <ul className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
          {[
            "You’re entered automatically just by having an account — nothing to sign up for.",
            "Keys and passes are separate prizes. A Daily Key can’t be used as a Phoenix Pass, and vice-versa.",
            "Each day, a key winner won’t also win a pass that same day — the two winner lists don’t overlap.",
            "Claim a won Phoenix Pass within 24 hours. Once claimed, use it within 30 days.",
            "Winners rotate — recent winners are skipped so more people get a turn.",
            "One identity per registered account decides who wins.",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-primary-ink" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* CTA */}
      <section className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/50 p-8 text-center">
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight text-balance">
          {user ? "You’re already in the draw" : "Make an account to get in the draw"}
        </h2>
        <p className="max-w-lg text-sm text-muted-foreground text-pretty">
          {user
            ? "Keep an eye on your notifications — the next draw is never far away. Browse the mods while you wait."
            : "Sign in once and you’re automatically entered in every daily draw, forever. It’s free."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {!user && (
            <Link
              to="/auth"
              onMouseDown={playClick}
              className="press inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground glow-primary transition-[filter] hover:brightness-110"
            >
              <Sparkles className="h-4 w-4" /> Sign in free
            </Link>
          )}
          <Link
            to="/mods"
            onMouseDown={playClick}
            className="press inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:border-primary/40"
          >
            Browse mods <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}

function AccountRewards() {
  const reducedMotion = useReducedMotionPreference();
  const { pass, dailyKey, passExpired, keyExpired } = useDailyRewards();
  const loading = pass.isFetching || dailyKey.isFetching;
  const keyUnavailable = !!(dailyKey.data?.claimed && !dailyKey.data.key);
  const failed = !!(
    pass.error ||
    dailyKey.error ||
    keyUnavailable ||
    (!pass.isFetching && passExpired) ||
    (!dailyKey.isFetching && keyExpired)
  );
  const retry = () => {
    if (pass.error || passExpired) void pass.refetch();
    if (dailyKey.error || keyUnavailable || keyExpired) void dailyKey.refetch();
  };
  return (
    <section aria-label="Your rewards" aria-busy={loading}>
      {loading && (
        <p
          role="status"
          className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card/50 p-5 text-sm text-muted-foreground"
        >
          <Loader2 className="h-4 w-4 animate-spin" /> Checking your rewards…
        </p>
      )}
      {failed && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-5">
          <p role="alert">
            Could not finish checking your rewards. Retry to load the missing information.
          </p>
          <button
            type="button"
            onClick={retry}
            disabled={loading}
            className="touch-target mt-3 rounded-full border border-border px-4 py-2 text-primary-ink disabled:opacity-60"
          >
            {loading ? "Retrying rewards…" : "Retry reward lookup"}
          </button>
        </div>
      )}
      {!dailyKey.isFetching &&
        !dailyKey.error &&
        !keyExpired &&
        dailyKey.data?.claimed &&
        dailyKey.data.key && (
          <DailyKeyCard
            key={dailyKey.data.id + dailyKey.data.key}
            value={dailyKey.data.key}
            expiresAt={dailyKey.data.expires_at}
          />
        )}
      {/* Active Phoenix Pass banner */}
      {!pass.isFetching && !pass.error && !passExpired && pass.data && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 10 }}
          transition={reducedMotion ? { duration: 0 } : undefined}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-amber-400/15 text-amber-300">
              <Feather className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold">You have a Phoenix Pass ready!</p>
              <p className="text-xs text-muted-foreground">
                Expires{" "}
                {new Date(pass.data.expires_at).toLocaleString(undefined, {
                  day: "2-digit",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · spend it on any mod
              </p>
            </div>
          </div>
          <Link
            to="/mods"
            onMouseDown={playClick}
            className="touch-target press inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-amber-950 transition hover:brightness-110"
          >
            Pick a mod <ArrowRight className="h-4 w-4" />
          </Link>
        </motion.div>
      )}

      {!loading && !failed && !pass.data && !dailyKey.data && (
        <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          No active rewards were returned for your account. Check Notifications for draw
          announcements.
        </p>
      )}
      {!dailyKey.isFetching &&
        !dailyKey.error &&
        !keyExpired &&
        dailyKey.data &&
        !dailyKey.data.claimed && (
          <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm">
            A Daily Key is waiting in Notifications. Open the winning notification to collect it.
          </p>
        )}
    </section>
  );
}

function DailyKeyCard({ value, expiresAt }: { value: string; expiresAt: string }) {
  const reducedMotion = useReducedMotionPreference();
  const [copied, setCopied] = useState(false);
  const active = useRef(true);
  const reset = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      clearTimeout(reset.current);
    };
  }, []);
  const copy = async () => {
    try {
      if (Date.parse(expiresAt) <= Date.now()) {
        toast.error("This reward lookup has expired. Refresh your rewards.");
        return;
      }
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      if (!active.current) return;
      setCopied(true);
      toast.success("Key copied");
      clearTimeout(reset.current);
      reset.current = setTimeout(() => setCopied(false), 1800);
    } catch {
      if (active.current)
        toast.error("Could not copy your key. Select the key and copy it manually.");
    }
  };
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      transition={reducedMotion ? { duration: 0 } : undefined}
      animate={{ opacity: 1, y: 0 }}
      className="mt-6 rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 to-transparent p-5"
    >
      <div className="flex min-w-0 flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary-ink">
            <KeyRound className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-sm font-bold">Your Daily Key</h2>
            <p className="text-xs text-muted-foreground">
              Paste this into the Dynamon Universe app.
            </p>
          </div>
        </div>
        <div className="flex w-full min-w-0 items-center gap-2 sm:w-auto">
          <code
            aria-label="Daily Key"
            className="min-w-0 flex-1 select-all break-all rounded-lg border border-border bg-background/60 px-3 py-2.5 text-center font-mono text-sm font-bold tracking-wider"
          >
            {value}
          </code>
          <button
            type="button"
            onClick={copy}
            className="touch-target press grid shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            aria-label="Copy key"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PrizeCard({
  icon,
  accent,
  ring,
  glow,
  eyebrow,
  title,
  body,
  points,
}: {
  icon: ReactNode;
  accent: string;
  ring: string;
  glow: string;
  eyebrow: string;
  title: string;
  body: string;
  points: string[];
}) {
  const reducedMotion = useReducedMotionPreference();
  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 16 }}
      transition={reducedMotion ? { duration: 0 } : undefined}
      animate={reducedMotion ? { opacity: 1, y: 0 } : undefined}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className={`relative overflow-hidden rounded-2xl border ${ring} bg-card p-6`}
    >
      <div className={`absolute inset-x-0 top-0 h-32 bg-gradient-to-b ${glow}`} aria-hidden />
      <div className="relative">
        <div
          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-card/80 ${accent} ${ring} border`}
        >
          {icon}
        </div>
        <p className={`mt-4 text-xs font-black uppercase tracking-[0.2em] ${accent}`}>{eyebrow}</p>
        <h3 className="mt-1 font-display text-2xl font-black uppercase tracking-tight">{title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground text-pretty">{body}</p>
        <ul className="mt-4 space-y-2">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm">
              <span className={`mt-0.5 ${accent}`}>
                <Sparkles className="h-4 w-4" />
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function Step({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl glass p-5">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary-ink">
        {icon}
      </div>
      <p className="mt-3 font-display text-sm font-bold uppercase tracking-wide">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
