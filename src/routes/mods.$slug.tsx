import "@/components/build-experience.css";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  Shield,
  PlayCircle,
  Sparkles,
  Lock,
  ExternalLink,
  Loader2,
  X,
  Feather,
  Copy,
  CalendarDays,
  FileArchive,
  Gauge,
  ShieldCheck,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GameplayTrailer } from "@/components/GameplayTrailer";
import { CommentsPanel } from "@/components/CommentsPanel";
import { ChangelogTimeline } from "@/components/ChangelogTimeline";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LikeButton } from "@/components/LikeButton";
import { useAuth } from "@/hooks/useAuth";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { Cipher } from "@/lib/cipher";
import { getFingerprint } from "@/lib/fingerprint";
import { getMod, mods, formatCount, elementTheme, type Mod } from "@/lib/mods";
import { breadcrumbJsonLd, pageSeoHead, softwareAppJsonLd } from "@/lib/seo";
import { playClick } from "@/lib/sound";
import { toast } from "sonner";
import { useDialogFocus } from "@/hooks/useDialogFocus";
import { formatReleaseDate } from "@/lib/releaseDate";

export const Route = createFileRoute("/mods/$slug")({
  loader: ({ params }) => {
    const mod = getMod(params.slug);
    if (!mod) throw notFound();
    return { mod };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [] };
    const mod = loaderData.mod;
    const { links, meta } = pageSeoHead({
      path: `/mods/${params.slug}`,
      title: `${mod.name} for Dynamons World — Features, Version & Build Notes`,
      description: `${mod.tagline} Review features, release version, update notes, community rating, and unlock details for this Dynamons World build.`,
      image: mod.image,
      type: "article",
    });
    return {
      meta,
      links,
      scripts: [
        breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Dynamons World Builds", path: "/mods" },
          { name: mod.name, path: `/mods/${mod.slug}` },
        ]),
        softwareAppJsonLd({
          name: mod.name,
          slug: mod.slug,
          tagline: mod.tagline,
          image: mod.image,
          rating: mod.baseRating,
          ratingCount: mod.ratingCount,
          version: mod.version,
          updated: mod.updated,
        }),
      ],
    };
  },
  notFoundComponent: () => (
    <PageShell>
      <div className="py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Mod not found</h1>
        <p className="mt-2 text-muted-foreground">It might have been renamed or removed.</p>
        <Link to="/mods" className="mt-6 inline-block text-primary-ink hover:underline">
          Back to all mods
        </Link>
      </div>
    </PageShell>
  ),
  errorComponent: ({ error }) => (
    <PageShell>
      <div className="py-20 text-center text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Could not load this mod."}
      </div>
    </PageShell>
  ),
  component: ModDetail,
});

function safeDecrypt(ct?: string | null): string {
  if (!ct) return "";
  try {
    return Cipher.decrypt(ct) || "";
  } catch {
    return "";
  }
}

function ModDetail() {
  const reducedMotion = useReducedMotionPreference();
  const { mod } = Route.useLoaderData() as { mod: Mod };
  const { user } = useAuth();
  const { overrides, allMods, loading: settingsLoading } = useSiteSettings();
  const navigate = useNavigate();
  const theme = elementTheme[mod.element];
  const [tab, setTab] = useState<"overview" | "changelog">("overview");
  const downloadTarget = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const arrive = () => {
      if (settingsLoading || window.location.hash !== "#download") return;
      timer = setTimeout(() => {
        downloadTarget.current?.scrollIntoView({
          behavior: reducedMotion ? "instant" : "smooth",
          block: "center",
        });
        downloadTarget.current?.focus({ preventScroll: true });
      }, 150);
    };
    arrive();
    window.addEventListener("hashchange", arrive);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("hashchange", arrive);
    };
  }, [mod.slug, reducedMotion, settingsLoading]);
  const [chooseOpen, setChooseOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  // Phoenix Pass redemption modal state (null = closed).
  const [passOpen, setPassOpen] = useState<string | null>(null);
  const passIdentity = JSON.stringify([user?.id, mod.slug]);
  const currentPassIdentity = useRef(passIdentity);
  currentPassIdentity.current = passIdentity;
  const passAttempts = useRef(new Map<string, { uncertain: boolean }>());
  const passAttempt = useMemo(() => {
    const attempt = passAttempts.current.get(passIdentity) ?? { uncertain: false };
    passAttempts.current.set(passIdentity, attempt);
    return attempt;
  }, [passIdentity]);
  useEffect(() => setPassOpen(null), [passIdentity]);

  // Only check whether a link is configured — never decrypt it here.
  // The plaintext/ciphertext link is now only ever revealed through
  // create_secure_session() -> /unlock -> redeem_secure_session(), all
  // server-side and one-time-use. It used to be decrypted right here on
  // page load, before any gate — anyone reading the anon REST response
  // for mod_overrides plus the bundled cipher key could pull it directly.
  const ov = overrides[mod.slug];
  // The route loader's `mod` is the static base definition (no admin seed,
  // no real user data folded in — used for name/description/etc). For the
  // rating shown in the Comments panel, use the fully blended version from
  // useSiteSettings (same seed+real math as the mods list / mod cards) so
  // the number here always matches the rest of the site.
  const blendedMod = allMods.find((m) => m.slug === mod.slug) || mod;
  const hasDownload = !!(ov?.mega_enc || ov?.download_url);
  const followUrl = safeDecrypt(ov?.follow_enc);

  const handleGet = () => {
    if (!user) {
      try {
        sessionStorage.setItem(
          "dg_after_auth",
          "/mods/" + encodeURIComponent(mod.slug) + "#download",
        );
      } catch {
        /* Optional storage. */
      }
      navigate({ to: "/auth" });
      return;
    }
    playClick();
    if (!hasDownload) {
      toast.error("No download ready for this mod yet", {
        description: "The owner hasn't published a download link for this build.",
      });
      return;
    }
    // Two ways down: finish the free follow-step, or spend a Phoenix Pass
    // to skip straight to the link. Let the user choose.
    setChooseOpen(true);
  };

  return (
    <PageShell>
      <Link
        to="/mods"
        onMouseDown={playClick}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to mods
      </Link>

      <article className="mod-detail-layout mt-6 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        {/* Hero image with element halo */}
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          transition={reducedMotion ? { duration: 0 } : undefined}
          animate={{ opacity: 1, y: 0 }}
          className="mod-detail-hero surface-l1 edge-light relative overflow-hidden rounded-2xl border"
          style={{ boxShadow: theme.glow }}
        >
          <div
            className="absolute inset-0 z-10 opacity-15 mix-blend-overlay"
            style={{ background: theme.gradient }}
          />
          <img
            src={mod.image}
            alt={`${blendedMod.name} Dynamons World build artwork`}
            width={1024}
            height={1024}
            decoding="async"
            sizes="(min-width: 1024px) 44vw, 100vw"
            className="relative aspect-square w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-card to-transparent p-6">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${theme.chip}`}
            >
              <Sparkles className="h-3 w-3" /> {theme.label} element
            </span>
          </div>
        </motion.div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { delay: 0.1 }}
        >
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary-ink">
            <span className="inline-block h-px w-8 bg-primary" aria-hidden />
            Dynamons World · Mod APK
          </p>
          <h1 className="mt-4 font-display text-4xl font-black uppercase leading-tight tracking-tight text-balance sm:text-5xl">
            {blendedMod.name}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">
            {blendedMod.tagline} Review the feature list, latest version, and changelog before
            unlocking this edition.
          </p>

          {/* Tabs */}
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as "overview" | "changelog");
              playClick();
            }}
          >
            <TabsList
              aria-label="Build details"
              className="mt-6 border border-border bg-card text-xs font-bold"
            >
              <TabsTrigger
                value="overview"
                className="px-4 py-1.5 capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="changelog"
                className="px-4 py-1.5 capitalize data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                Changelog
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="mt-5 rounded-2xl glass p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {blendedMod.description}
                </p>
              </div>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {blendedMod.features.map((f) => (
                  <li
                    key={f}
                    className="surface-l1 flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm"
                  >
                    <span
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary-ink"
                      aria-hidden="true"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </TabsContent>
            <TabsContent value="changelog">
              <div className="mt-5">
                <ChangelogTimeline entries={blendedMod.changelog} glow={theme.glow} />
              </div>
            </TabsContent>
          </Tabs>

          <div
            id="download"
            ref={downloadTarget}
            tabIndex={-1}
            aria-label="Download controls"
            className="mt-7 flex scroll-mt-32 flex-wrap gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-primary target:ring-2 target:ring-primary/50 target:ring-offset-8 target:ring-offset-background"
          >
            <button
              onClick={handleGet}
              className="press animate-pulse-glow inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground glow-primary transition-[filter] hover:brightness-110"
            >
              <Download className="h-4 w-4" /> {user ? "Unlock this build" : "Log in to unlock"}
            </button>
            <LikeButton slug={mod.slug} />
            <FavoriteButton slug={mod.slug} />
            <Link
              to="/disclaimer"
              onMouseDown={playClick}
              className="press inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:border-primary/40"
            >
              <Shield className="h-4 w-4" /> Safety notes
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs sm:grid-cols-4">
            <Stat label="Downloads" value={`${formatCount(blendedMod.downloads)}+`} />
            <Stat label="Version" value={blendedMod.version} />
            <Stat label="Size" value={blendedMod.size} />
            <Stat label="Updated" value={formatReleaseDate(blendedMod.updated)} />
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Build trust metadata">
            <TrustSignal
              icon={<Gauge className="h-4 w-4" />}
              label="Build type"
              value="Fan-made edition"
            />
            <TrustSignal
              icon={<CalendarDays className="h-4 w-4" />}
              label="Release"
              value={`Updated ${formatReleaseDate(blendedMod.updated, true)}`}
            />
            <TrustSignal
              icon={<FileArchive className="h-4 w-4" />}
              label="Package"
              value={blendedMod.size}
            />
          </div>
        </motion.div>
      </article>

      <section
        aria-labelledby="safety-title"
        className="mt-12 grid gap-4 lg:grid-cols-[1.15fr_0.85fr]"
      >
        <div className="material-l1 rounded-[var(--radius-surface)] p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary-ink"
              aria-hidden="true"
            >
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-ink">
                Decision notes
              </p>
              <h2 id="safety-title" className="mt-1 font-display text-xl font-bold">
                Know what you are choosing
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Review the feature list, version, package size, and changelog before starting the
                secure unlock flow. The page keeps the action clear without hiding the context
                around it.
              </p>
            </div>
          </div>
          <ul className="mt-5 grid gap-2 sm:grid-cols-2">
            <li className="flex items-start gap-2 rounded-xl border border-border bg-background/35 p-3 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> Confirm the version
              matches your intended release.
            </li>
            <li className="flex items-start gap-2 rounded-xl border border-border bg-background/35 p-3 text-sm text-muted-foreground">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" /> Read the changelog for
              the latest update notes.
            </li>
          </ul>
        </div>
        <div className="material-l1 rounded-[var(--radius-surface)] p-5 sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary-ink">
            Compatibility
          </p>
          <h2 className="mt-1 font-display text-xl font-bold">Release context</h2>
          <dl className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <dt className="text-muted-foreground">Game</dt>
              <dd className="font-semibold">Dynamons World</dd>
            </div>
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <dt className="text-muted-foreground">Element</dt>
              <dd className={theme.text}>{theme.label}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Features</dt>
              <dd className="font-semibold">{blendedMod.features.length} listed</dd>
            </div>
          </dl>
          <Link
            to="/disclaimer"
            className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary-ink hover:underline"
          >
            <Shield className="h-4 w-4" /> Read safety notes
          </Link>
        </div>
      </section>

      {/* YouTube embed / placeholder */}
      <section className="mt-14">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary-ink">
              Gameplay
            </p>
            <h2 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tight">
              Watch the {theme.label} build in action
            </h2>
          </div>
        </div>
        <div
          className="mt-5 overflow-hidden edge-light rounded-2xl glass"
          style={{ boxShadow: theme.glow }}
        >
          {blendedMod.youtubeId ? (
            <GameplayTrailer
              key={`${blendedMod.slug}:${blendedMod.youtubeId}`}
              videoId={blendedMod.youtubeId}
              name={blendedMod.name}
              image={blendedMod.image}
            />
          ) : (
            <div className="relative aspect-video w-full">
              <img
                src={mod.image}
                alt=""
                decoding="async"
                sizes="(min-width: 1024px) 70vw, 100vw"
                className="absolute inset-0 h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-background/90 to-background/30">
                <div className="text-center">
                  <div
                    className="mx-auto grid h-16 w-16 place-items-center rounded-full text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <PlayCircle className="h-8 w-8" />
                  </div>
                  <p className="mt-4 font-display text-lg font-bold">Trailer dropping soon</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Subscribe on YouTube to be the first to watch.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <CommentsPanel
        key={`${mod.slug}:${user?.id ?? "public"}`}
        slug={mod.slug}
        combinedRating={blendedMod.baseRating}
        combinedCount={blendedMod.ratingCount}
        combinedLikes={ov?.seed_review_likes ?? 0}
      />

      <section className="mt-16">
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">
          More from the vault
        </h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {mods
            .filter((m) => m.slug !== mod.slug)
            .slice(0, 3)
            .map((m) => {
              const t = elementTheme[m.element];
              return (
                <Link
                  key={m.slug}
                  to="/mods/$slug"
                  params={{ slug: m.slug }}
                  onMouseDown={playClick}
                  className="group relative overflow-hidden rounded-2xl glass"
                  style={{ boxShadow: t.glow }}
                >
                  <img
                    src={m.image}
                    alt={`${m.name} Dynamons World build artwork`}
                    width={1024}
                    height={1024}
                    loading="lazy"
                    decoding="async"
                    sizes="(min-width: 1024px) 30vw, 100vw"
                    className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card to-transparent p-4">
                    <p className="font-display text-sm font-bold">{m.name}</p>
                    <p className="text-xs text-muted-foreground">
                      v{m.version} · {t.label}
                    </p>
                  </div>
                </Link>
              );
            })}
        </div>
      </section>

      {chooseOpen && (
        <DownloadChoice
          modName={blendedMod.name}
          onCompleteStep={() => {
            setChooseOpen(false);
            setGateOpen(true);
          }}
          onUsePass={() => {
            setChooseOpen(false);
            setPassOpen(passIdentity);
          }}
          onClose={() => setChooseOpen(false)}
        />
      )}

      {user && passOpen === passIdentity && (
        <PhoenixPassModal
          key={passIdentity}
          attempt={passAttempt}
          isCurrent={() => currentPassIdentity.current === passIdentity}
          modName={blendedMod.name}
          slug={mod.slug}
          onNoPass={() => {
            setPassOpen(null);
            navigate({ to: "/rewards" });
          }}
          onClose={() => setPassOpen(null)}
        />
      )}

      {gateOpen && (
        <FollowGate
          modName={blendedMod.name}
          slug={mod.slug}
          followUrl={followUrl}
          onClose={() => setGateOpen(false)}
        />
      )}
    </PageShell>
  );
}

function FollowGate({
  modName,
  slug,
  followUrl,
  onClose,
}: {
  modName: string;
  slug: string;
  followUrl: string;
  onClose: () => void;
}) {
  const reducedMotion = useReducedMotionPreference();
  const navigate = useNavigate();
  // If there's no follow link configured, skip straight to verifying.
  const [step, setStep] = useState<"gate" | "verifying" | "error">(
    followUrl ? "gate" : "verifying",
  );
  const [waiting, setWaiting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const started = useRef(false);
  const dialogRef = useDialogFocus(true, onClose);

  const goToUnlock = async () => {
    setStep("verifying");
    try {
      const fingerprint = await getFingerprint();
      if (!fingerprint) throw new Error("Could not verify this device.");

      // Server-side only: mints a one-time token and stores the link
      // (still ciphertext) in secure_sessions. The link itself never
      // reaches the browser here.
      const { data, error } = await supabase.rpc("create_secure_session", {
        p_slug: slug,
        p_fingerprint: fingerprint,
      });
      if (error)
        throw new Error("We couldn’t reach the server. Check your internet and try again.");
      const res = data as { ok: boolean; token?: string; error?: string } | null;
      if (!res || !res.ok || !res.token) {
        const map: Record<string, string> = {
          rate_limited: "You’ve tried a few times in a row. Please wait a minute, then try again.",
          no_link: "This mod doesn’t have a download ready yet. Please check back soon.",
        };
        throw new Error(
          map[res?.error || ""] || "We couldn’t start the download. Please try again.",
        );
      }

      try {
        localStorage.setItem("dg_token", Cipher.encrypt(res.token));
      } catch {
        localStorage.setItem("dg_token", res.token);
      }

      navigate({ to: "/unlock" });
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Something went wrong.");
      setStep("error");
    }
  };

  const handleFollow = () => {
    playClick();
    window.open(followUrl, "_blank", "noopener,noreferrer");
    // Short delay so the follow feels earned, then verify server-side.
    setWaiting(true);
    setTimeout(() => {
      setWaiting(false);
      void goToUnlock();
    }, 4000);
  };

  useEffect(() => {
    if (!followUrl && !started.current) {
      started.current = true;
      void goToUnlock();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Download ${modName}`}
      tabIndex={-1}
      className="modal-frame overlay-scrim fixed inset-0 flex items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
        transition={reducedMotion ? { duration: 0 } : undefined}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="modal-panel overlay-surface relative w-full max-w-md rounded-[var(--radius-command)] border p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {step === "gate" ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary-ink">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight text-balance">
              One quick step first
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Tap the button below and finish the short step that opens. Come back here when you’re
              done and your download for{" "}
              <span className="font-semibold text-foreground">{modName}</span> will unlock
              automatically.
            </p>
            <button
              onClick={handleFollow}
              disabled={waiting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {waiting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking…
                </>
              ) : (
                <>
                  <ExternalLink className="h-4 w-4" /> Start the step
                </>
              )}
            </button>
          </div>
        ) : step === "verifying" ? (
          <div className="text-center py-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary-ink" />
            <p className="mt-4 text-sm text-muted-foreground">
              Starting your secure download session…
            </p>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="mt-1 font-display text-xl font-extrabold uppercase tracking-tight text-balance text-destructive">
              Couldn&apos;t start download
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              {errMsg}
            </p>
            <button
              onClick={() => setStep(followUrl ? "gate" : "verifying")}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:border-primary/40"
            >
              Try again
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function ModalShell({
  label,
  onClose,
  children,
  dismissible = true,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const reducedMotion = useReducedMotionPreference();
  const dismiss = () => {
    if (dismissible) onClose();
  };
  const dialogRef = useDialogFocus(true, dismiss);
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className="modal-frame fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
      onClick={dismiss}
    >
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, scale: 0.95, y: 10 }}
        transition={reducedMotion ? { duration: 0 } : undefined}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="modal-panel overlay-surface relative w-full max-w-md rounded-[var(--radius-command)] border p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          disabled={!dismissible}
          aria-label="Close"
          className="touch-target absolute right-2 top-2 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

function DownloadChoice({
  modName,
  onCompleteStep,
  onUsePass,
  onClose,
}: {
  modName: string;
  onCompleteStep: () => void;
  onUsePass: () => void;
  onClose: () => void;
}) {
  return (
    <ModalShell label={`Download ${modName}`} onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary-ink">
          <Download className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight text-balance">
          Choose how to unlock
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Grab <span className="font-semibold text-foreground">{modName}</span> the free way, or
          skip the line with a Phoenix Pass if you&apos;ve won one.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        <button
          onClick={() => {
            playClick();
            onCompleteStep();
          }}
          className="press flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition hover:border-primary/40"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
            <Check className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">Complete this step</span>
            <span className="block text-xs text-muted-foreground">
              Finish one quick step, then download. Always free.
            </span>
          </span>
        </button>

        <button
          onClick={() => {
            playClick();
            onUsePass();
          }}
          className="press flex items-center gap-3 rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5 px-4 py-3.5 text-left transition hover:border-amber-400/70"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-400/15 text-amber-300">
            <Feather className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-bold">
              Use a Phoenix Pass <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </span>
            <span className="block text-xs text-muted-foreground">
              Skip the step and go straight to the link.
            </span>
          </span>
        </button>
      </div>

      <Link
        to="/rewards"
        onMouseDown={playClick}
        className="mt-4 block text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        What&apos;s a Phoenix Pass?
      </Link>
    </ModalShell>
  );
}

type PassStep = "checking" | "confirm" | "redeeming" | "done" | "error";

function PhoenixPassModal({
  modName,
  slug,
  onNoPass,
  onClose,
  attempt,
  isCurrent,
}: {
  modName: string;
  slug: string;
  onNoPass: () => void;
  onClose: () => void;
  attempt: { uncertain: boolean };
  isCurrent: () => boolean;
}) {
  const [step, setStep] = useState<PassStep>("checking");
  const [passId, setPassId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [lookupRetry, setLookupRetry] = useState(0);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const active = useRef(true);
  const submitted = useRef(false);
  const redeeming = useRef(false);
  const redemption = useRef<AbortController | null>(null);
  const callbacks = useRef({ onNoPass, isCurrent });
  callbacks.current = { onNoPass, isCurrent };
  const valid = () => active.current && callbacks.current.isCurrent();
  const uncertainMessage =
    "We couldn't confirm the download. Your pass may already have been spent. Check Rewards before spending another pass; contact support if the download is missing.";

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      redemption.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (attempt.uncertain) {
      setErrMsg(uncertainMessage);
      setStep("error");
      return;
    }
    const controller = new AbortController();
    let disposed = false;
    const timer = setTimeout(() => controller.abort(), 10_000);
    setStep("checking");
    setLookupFailed(false);
    (async () => {
      try {
        const { data, error } = await supabase
          .rpc("my_active_phoenix_pass")
          .abortSignal(controller.signal)
          .retry(false);
        if (disposed || !valid()) return;
        if (error || !Array.isArray(data)) throw new Error("check_failed");
        if (data.length === 0) {
          callbacks.current.onNoPass();
          return;
        }
        const pass = data[0];
        if (
          !pass ||
          typeof pass.id !== "string" ||
          !pass.id ||
          typeof pass.expires_at !== "string" ||
          !Number.isFinite(Date.parse(pass.expires_at))
        )
          throw new Error("check_failed");
        if (Date.parse(pass.expires_at) <= Date.now()) {
          callbacks.current.onNoPass();
          return;
        }
        setPassId(pass.id);
        setExpiresAt(pass.expires_at);
        setStep("confirm");
      } catch {
        if (disposed || !valid()) return;
        setErrMsg("We couldn’t check your passes. Please try again.");
        setLookupFailed(true);
        setStep("error");
      } finally {
        clearTimeout(timer);
      }
    })();
    return () => {
      disposed = true;
      clearTimeout(timer);
      controller.abort();
    };
    // Request identity is fixed by the parent's account/slug-keyed mount.
  }, [attempt, lookupRetry]);

  const redeem = async () => {
    if (!valid() || !passId || submitted.current || attempt.uncertain) return;
    if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
      setErrMsg("This pass has expired. Check Rewards for your available passes.");
      setStep("error");
      return;
    }
    submitted.current = true;
    redeeming.current = true;
    attempt.uncertain = true;
    setStep("redeeming");
    const controller = new AbortController();
    redemption.current = controller;
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const { data, error } = await supabase
        .rpc("redeem_phoenix_pass", { p_pass_id: passId, p_slug: slug })
        .abortSignal(controller.signal)
        .retry(false);
      if (!valid()) return;
      if (error || !data || typeof data !== "object" || Array.isArray(data))
        throw new Error(uncertainMessage);
      const res = data as {
        ok?: boolean;
        error?: string;
        link?: string;
        encrypted?: boolean;
      } | null;
      if (res?.ok === false) {
        const map: Record<string, string> = {
          invalid_slug: "This mod can’t be unlocked with a pass right now.",
          no_link: "This mod doesn’t have a download ready yet.",
          invalid_or_used_pass:
            "That pass is no longer valid — it may have expired or already been used.",
        };
        const message = map[res.error || ""];
        if (message) attempt.uncertain = false;
        throw new Error(message || uncertainMessage);
      }
      if (
        res?.ok !== true ||
        typeof res.link !== "string" ||
        !res.link ||
        typeof res.encrypted !== "boolean"
      )
        throw new Error(uncertainMessage);
      let out = res.link;
      if (res.encrypted) {
        try {
          out = Cipher.decrypt(res.link);
        } catch {
          throw new Error(uncertainMessage);
        }
      }
      // Accept absolute web downloads only, including after decryption.
      let destination: URL;
      try {
        destination = new URL(out);
      } catch {
        throw new Error(uncertainMessage);
      }
      if (
        !["https:", "http:"].includes(destination.protocol) ||
        destination.username ||
        destination.password
      )
        throw new Error(uncertainMessage);
      attempt.uncertain = false;
      setLink(out);
      setStep("done");
      playClick();
    } catch (e) {
      if (!valid()) return;
      setErrMsg(e instanceof Error ? e.message : "Something went wrong.");
      setStep("error");
    } finally {
      clearTimeout(timer);
      redeeming.current = false;
    }
  };

  const close = () => {
    if (!redeeming.current) onClose();
  };
  const copyLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error("clipboard_unavailable");
      await navigator.clipboard.writeText(link);
      if (valid()) {
        setCopyFailed(false);
        toast.success("Link copied");
      }
    } catch {
      if (valid()) setCopyFailed(true);
    }
  };

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleString(undefined, {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <ModalShell
      label={`Use a Phoenix Pass for ${modName}`}
      onClose={close}
      dismissible={step !== "redeeming"}
    >
      {step === "checking" ? (
        <div className="py-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-300" />
          <p className="mt-4 text-sm text-muted-foreground">Checking your Phoenix Passes…</p>
        </div>
      ) : step === "confirm" ? (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-400/15 text-amber-300">
            <Feather className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight text-balance">
            Spend your Phoenix Pass?
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            This unlocks <span className="font-semibold text-foreground">{modName}</span> instantly
            — no steps. A pass is single-use and can only be spent once.
          </p>
          {expiryLabel && <p className="mt-3 text-xs text-amber-300/90">Expires {expiryLabel}</p>}
          <button
            onClick={redeem}
            className="touch-target mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-amber-950 transition hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" /> Unlock now
          </button>
          <button
            onClick={close}
            className="touch-target mt-2 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Not yet
          </button>
        </div>
      ) : step === "redeeming" ? (
        <div className="py-6 text-center" role="status" aria-live="polite">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-300" />
          <p className="mt-4 text-sm text-muted-foreground">Redeeming your pass…</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Keep this window open while we confirm your download.
          </p>
        </div>
      ) : step === "done" ? (
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight text-balance">
            Pass redeemed 🎉
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
            Your download for <span className="font-semibold text-foreground">{modName}</span> is
            ready.
          </p>
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={playClick}
            className="touch-target mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground glow-primary transition hover:brightness-110"
          >
            <ExternalLink className="h-4 w-4" /> Open download link
          </a>
          <button
            onClick={copyLink}
            className="touch-target mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40"
          >
            <Copy className="h-4 w-4" /> Copy link
          </button>
          {copyFailed && (
            <p role="status" className="mt-3 text-sm text-muted-foreground">
              Copy isn't available. Use the download link above, or copy its address from your
              browser.
            </p>
          )}
        </div>
      ) : (
        <div className="text-center">
          <h3 className="mt-1 font-display text-xl font-extrabold uppercase tracking-tight text-balance text-destructive">
            Couldn&apos;t use your pass
          </h3>
          <p
            role="alert"
            className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty"
          >
            {errMsg}
          </p>
          {lookupFailed ? (
            <button
              type="button"
              onClick={() => setLookupRetry((value) => value + 1)}
              className="touch-target mt-4 w-full rounded-xl border border-border px-4 py-3 text-sm font-semibold"
            >
              Retry pass lookup
            </button>
          ) : (
            <Link
              to="/rewards"
              className="touch-target mt-4 inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-3 text-sm font-semibold"
            >
              Check Rewards
            </Link>
          )}
          <button
            onClick={close}
            className="touch-target mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:border-primary/40"
          >
            Close
          </button>
        </div>
      )}
    </ModalShell>
  );
}

function TrustSignal({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="material-l1 flex min-w-0 items-center gap-3 rounded-xl p-3">
      <span
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary-ink"
        aria-hidden="true"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-[0.65rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold">{value}</p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card/60 p-3">
      <p className="truncate text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-tight">{value}</p>
    </div>
  );
}
