import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowLeft, Check, Download, Shield, PlayCircle, Sparkles, Lock, ExternalLink, Loader2, X, Feather, Copy } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { CommentsPanel } from "@/components/CommentsPanel";
import { ChangelogTimeline } from "@/components/ChangelogTimeline";
import { FavoriteButton } from "@/components/FavoriteButton";
import { LikeButton } from "@/components/LikeButton";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";
import { Cipher } from "@/lib/cipher";
import { getFingerprint } from "@/lib/fingerprint";
import { getMod, mods, formatCount, elementTheme, type Mod } from "@/lib/mods";
import { canonicalHead, softwareAppJsonLd } from "@/lib/seo";
import { playClick } from "@/lib/sound";
import { toast } from "sonner";

export const Route = createFileRoute("/mods/$slug")({
  loader: ({ params }) => {
    const mod = getMod(params.slug);
    if (!mod) throw notFound();
    return { mod };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) return { meta: [] };
    const { links, meta: canonicalMeta } = canonicalHead(`/mods/${params.slug}`);
    return {
      meta: [
        { title: `${loaderData.mod.name} — Dynamon Universe` },
        { name: "description", content: loaderData.mod.tagline },
        { property: "og:title", content: `${loaderData.mod.name} — Dynamon Universe` },
        { property: "og:description", content: loaderData.mod.tagline },
        { property: "og:image", content: loaderData.mod.image },
        { property: "twitter:image", content: loaderData.mod.image },
        ...canonicalMeta,
      ],
      links,
      scripts: [softwareAppJsonLd({
        name: loaderData.mod.name, slug: loaderData.mod.slug, tagline: loaderData.mod.tagline,
        image: loaderData.mod.image, rating: loaderData.mod.baseRating,
        ratingCount: loaderData.mod.ratingCount, downloads: loaderData.mod.downloads,
        version: loaderData.mod.version,
      })],
    };
  },
  notFoundComponent: () => (
    <PageShell>
      <div className="py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Mod not found</h1>
        <p className="mt-2 text-muted-foreground">It might have been renamed or removed.</p>
        <Link to="/mods" className="mt-6 inline-block text-primary hover:underline">Back to all mods</Link>
      </div>
    </PageShell>
  ),
  errorComponent: ({ error }) => (
    <PageShell><div className="py-20 text-center text-sm text-muted-foreground">{error.message}</div></PageShell>
  ),
  component: ModDetail,
});

function safeDecrypt(ct?: string | null): string {
  if (!ct) return "";
  try { return Cipher.decrypt(ct) || ""; } catch { return ""; }
}

function ModDetail() {
  const { mod } = Route.useLoaderData() as { mod: Mod };
  const { user } = useAuth();
  const { award, grant } = useGamification();
  const { overrides, allMods } = useSiteSettings();
  const navigate = useNavigate();
  const theme = elementTheme[mod.element];
  const [tab, setTab] = useState<"overview" | "changelog">("overview");
  const [chooseOpen, setChooseOpen] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  // Phoenix Pass redemption modal state (null = closed).
  const [passOpen, setPassOpen] = useState(false);

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
    if (!user) { toast.error("Sign in to download"); return; }
    playClick();
    award(10, "Downloaded");
    grant("first_download");
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
      <Link to="/mods" onMouseDown={playClick} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to mods
      </Link>

      <article className="mt-6 grid gap-8 lg:grid-cols-[1.05fr_1fr] lg:items-start">
        {/* Hero image with element halo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="edge-light relative overflow-hidden rounded-2xl border border-border bg-card"
          style={{ boxShadow: theme.glow }}
        >
          <div className="absolute inset-0 z-10 opacity-40 mix-blend-overlay" style={{ background: theme.gradient }} />
          <img src={mod.image} alt={blendedMod.name} width={1024} height={1024} className="relative aspect-square w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-card to-transparent p-6">
            <span className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${theme.chip}`}>
              <Sparkles className="h-3 w-3" /> {theme.label} element
            </span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
            <span className="inline-block h-px w-8 bg-primary" aria-hidden />
            Dynamons World · Mod APK
          </p>
          <h1 className="mt-4 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl">{blendedMod.name}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">{blendedMod.tagline}</p>

          {/* Tabs */}
          <div className="mt-6 inline-flex rounded-lg border border-border bg-card p-1 text-xs font-bold">
            {(["overview", "changelog"] as const).map((t) => (
              <button key={t} onClick={() => { setTab(t); playClick(); }}
                className={`press rounded-md px-4 py-1.5 capitalize transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === "overview" ? (
            <>
              <div className="mt-5 rounded-2xl glass p-5">
                <p className="text-sm leading-relaxed text-muted-foreground">{blendedMod.description}</p>
              </div>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {blendedMod.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 text-primary">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="mt-5">
              <ChangelogTimeline entries={blendedMod.changelog} glow={theme.glow} />
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={handleGet}
              className="press animate-pulse-glow inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground glow-primary transition-[filter] hover:brightness-110"
            >
              <Download className="h-4 w-4" /> {user ? "Download mod" : "Log in to download"}
            </button>
            <LikeButton slug={mod.slug} />
            <FavoriteButton slug={mod.slug} />
            <Link
              to="/disclaimer" onMouseDown={playClick}
              className="press inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:border-primary/40"
            >
              <Shield className="h-4 w-4" /> Safety notes
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 text-center text-xs sm:grid-cols-4">
            <Stat label="Downloads" value={`${formatCount(blendedMod.downloads)}+`} />
            <Stat label="Version" value={blendedMod.version} />
            <Stat label="Size" value={blendedMod.size} />
            <Stat label="Updated" value={new Date(blendedMod.updated).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" })} />
          </div>
        </motion.div>
      </article>

      {/* YouTube embed / placeholder */}
      <section className="mt-14">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-primary">Gameplay</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tight">Watch the {theme.label} build in action</h2>
          </div>
        </div>
        <div className="mt-5 overflow-hidden edge-light rounded-2xl glass" style={{ boxShadow: theme.glow }}>
          {blendedMod.youtubeId ? (
            <div className="relative aspect-video w-full">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${blendedMod.youtubeId}`}
                title={`${blendedMod.name} gameplay`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : (
            <div className="relative aspect-video w-full">
              <img src={mod.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
              <div className="absolute inset-0 grid place-items-center bg-gradient-to-t from-background/90 to-background/30">
                <div className="text-center">
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-full text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
                    <PlayCircle className="h-8 w-8" />
                  </div>
                  <p className="mt-4 font-display text-lg font-bold">Trailer dropping soon</p>
                  <p className="mt-1 text-sm text-muted-foreground">Subscribe on YouTube to be the first to watch.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <CommentsPanel slug={mod.slug} combinedRating={blendedMod.baseRating} combinedCount={blendedMod.ratingCount} combinedLikes={ov?.seed_review_likes ?? 0} />

      <section className="mt-16">
        <h2 className="font-display text-2xl font-extrabold uppercase tracking-tight">More from the vault</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {mods.filter((m) => m.slug !== mod.slug).slice(0, 3).map((m) => {
            const t = elementTheme[m.element];
            return (
              <Link
                key={m.slug} to="/mods/$slug" params={{ slug: m.slug }} onMouseDown={playClick}
                className="group relative overflow-hidden rounded-2xl glass"
                style={{ boxShadow: t.glow }}
              >
                <img src={m.image} alt={m.name} width={1024} height={1024} loading="lazy" className="aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-card to-transparent p-4">
                  <p className="font-display text-sm font-bold">{m.name}</p>
                  <p className="text-[11px] text-muted-foreground">v{m.version} · {t.label}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {chooseOpen && (
        <DownloadChoice
          modName={blendedMod.name}
          onCompleteStep={() => { setChooseOpen(false); setGateOpen(true); }}
          onUsePass={() => { setChooseOpen(false); setPassOpen(true); }}
          onClose={() => setChooseOpen(false)}
        />
      )}

      {passOpen && (
        <PhoenixPassModal
          modName={blendedMod.name}
          slug={mod.slug}
          onNoPass={() => { setPassOpen(false); navigate({ to: "/rewards" }); }}
          onClose={() => setPassOpen(false)}
        />
      )}

      {gateOpen && (
        <FollowGate
          modName={blendedMod.name}
          slug={mod.slug}
          version={blendedMod.version}
          followUrl={followUrl}
          onClose={() => setGateOpen(false)}
        />
      )}
    </PageShell>
  );
}

function FollowGate({
  modName, slug, version, followUrl, onClose,
}: { modName: string; slug: string; version?: string; followUrl: string; onClose: () => void }) {
  const navigate = useNavigate();
  // If there's no follow link configured, skip straight to verifying.
  const [step, setStep] = useState<"gate" | "verifying" | "error">(followUrl ? "gate" : "verifying");
  const [waiting, setWaiting] = useState(false);
  const [errMsg, setErrMsg] = useState("");
  const started = useRef(false);

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
      if (error) throw new Error("We couldn’t reach the server. Check your internet and try again.");
      const res = data as { ok: boolean; token?: string; error?: string } | null;
      if (!res || !res.ok || !res.token) {
        const map: Record<string, string> = {
          rate_limited: "You’ve tried a few times in a row. Please wait a minute, then try again.",
          no_link: "This mod doesn’t have a download ready yet. Please check back soon.",
        };
        throw new Error(map[res?.error || ""] || "We couldn’t start the download. Please try again.");
      }

      try {
        localStorage.setItem("dg_token", Cipher.encrypt(res.token));
      } catch {
        localStorage.setItem("dg_token", res.token);
      }

      navigate({ to: "/unlock", search: { v: version || undefined } });
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
    setTimeout(() => { setWaiting(false); void goToUnlock(); }, 4000);
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
      role="dialog" aria-modal="true" aria-label={`Download ${modName}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose} aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {step === "gate" ? (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Lock className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight text-balance">
              One quick step first
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Tap the button below and finish the short step that opens. Come back here when you’re done and your download for <span className="font-semibold text-foreground">{modName}</span> will unlock automatically.
            </p>
            <button
              onClick={handleFollow} disabled={waiting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {waiting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Checking…</>) : (<><ExternalLink className="h-4 w-4" /> Start the step</>)}
            </button>
          </div>
        ) : step === "verifying" ? (
          <div className="text-center py-4">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">Starting your secure download session…</p>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="mt-1 font-display text-xl font-extrabold uppercase tracking-tight text-balance text-destructive">
              Couldn&apos;t start download
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{errMsg}</p>
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
  label, onClose, children,
}: { label: string; onClose: () => void; children: ReactNode }) {
  return (
    <div
      role="dialog" aria-modal="true" aria-label={label}
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose} aria-label="Close"
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
        {children}
      </motion.div>
    </div>
  );
}

function DownloadChoice({
  modName, onCompleteStep, onUsePass, onClose,
}: { modName: string; onCompleteStep: () => void; onUsePass: () => void; onClose: () => void }) {
  return (
    <ModalShell label={`Download ${modName}`} onClose={onClose}>
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
          <Download className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight text-balance">
          Choose how to unlock
        </h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
          Grab <span className="font-semibold text-foreground">{modName}</span> the free way, or skip
          the line with a Phoenix Pass if you&apos;ve won one.
        </p>
      </div>

      <div className="mt-6 grid gap-3">
        <button
          onClick={() => { playClick(); onCompleteStep(); }}
          className="press flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3.5 text-left transition hover:border-primary/40"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-muted text-foreground">
            <Check className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold">Complete this step</span>
            <span className="block text-xs text-muted-foreground">Finish one quick step, then download. Always free.</span>
          </span>
        </button>

        <button
          onClick={() => { playClick(); onUsePass(); }}
          className="press flex items-center gap-3 rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-orange-500/5 px-4 py-3.5 text-left transition hover:border-amber-400/70"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-amber-400/15 text-amber-300">
            <Feather className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 text-sm font-bold">
              Use a Phoenix Pass <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            </span>
            <span className="block text-xs text-muted-foreground">Skip the step and go straight to the link.</span>
          </span>
        </button>
      </div>

      <Link
        to="/rewards" onMouseDown={playClick}
        className="mt-4 block text-center text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        What&apos;s a Phoenix Pass?
      </Link>
    </ModalShell>
  );
}

type PassStep = "checking" | "confirm" | "redeeming" | "done" | "error";

function PhoenixPassModal({
  modName, slug, onNoPass, onClose,
}: { modName: string; slug: string; onNoPass: () => void; onClose: () => void }) {
  const [step, setStep] = useState<PassStep>("checking");
  const [passId, setPassId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const checked = useRef(false);

  // Loose cast: these RPCs aren't in the generated Supabase types yet.
  // IMPORTANT: must .bind(supabase) or calling this later throws
  // "Cannot read properties of undefined (reading 'rest')" — extracting a
  // Supabase client method into a plain variable loses its `this` binding.
  const rpc = supabase.rpc.bind(supabase) as unknown as (
    fn: string,
    args?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    (async () => {
      try {
        const { data, error } = await rpc("my_active_phoenix_pass");
        if (error) throw new Error("check_failed");
        const rows = (data as Array<{ id: string; expires_at: string }> | null) || [];
        const pass = rows[0];
        if (!pass) { onNoPass(); return; }
        setPassId(pass.id);
        setExpiresAt(pass.expires_at);
        setStep("confirm");
      } catch {
        setErrMsg("We couldn’t check your passes. Please try again.");
        setStep("error");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const redeem = async () => {
    if (!passId) return;
    setStep("redeeming");
    try {
      const { data, error } = await rpc("redeem_phoenix_pass", { p_pass_id: passId, p_slug: slug });
      if (error) throw new Error("redeem_failed");
      const res = data as { ok?: boolean; error?: string; link?: string; encrypted?: boolean } | null;
      if (!res || !res.ok || !res.link) {
        const map: Record<string, string> = {
          invalid_slug: "This mod can’t be unlocked with a pass right now.",
          no_link: "This mod doesn’t have a download ready yet.",
          invalid_or_used_pass: "That pass is no longer valid — it may have expired or already been used.",
        };
        throw new Error(map[res?.error || ""] || "We couldn’t redeem your pass. Please try again.");
      }
      let out = res.link;
      if (res.encrypted) {
        try { out = Cipher.decrypt(res.link); } catch { throw new Error("We couldn’t read the download link. Please try again."); }
      }
      if (!out) throw new Error("No download link available.");
      setLink(out);
      setStep("done");
      playClick();
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Something went wrong.");
      setStep("error");
    }
  };

  const expiryLabel = expiresAt
    ? new Date(expiresAt).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <ModalShell label={`Use a Phoenix Pass for ${modName}`} onClose={onClose}>
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
            This unlocks <span className="font-semibold text-foreground">{modName}</span> instantly — no steps.
            A pass is single-use and can only be spent once.
          </p>
          {expiryLabel && (
            <p className="mt-3 text-xs text-amber-300/90">Expires {expiryLabel}</p>
          )}
          <button
            onClick={redeem}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-amber-950 transition hover:brightness-110"
          >
            <Sparkles className="h-4 w-4" /> Unlock now
          </button>
          <button
            onClick={onClose}
            className="mt-2 inline-flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Not yet
          </button>
        </div>
      ) : step === "redeeming" ? (
        <div className="py-6 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-amber-300" />
          <p className="mt-4 text-sm text-muted-foreground">Redeeming your pass…</p>
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
            Your download for <span className="font-semibold text-foreground">{modName}</span> is ready.
          </p>
          <a
            href={link} target="_blank" rel="noopener noreferrer"
            onClick={playClick}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground glow-primary transition hover:brightness-110"
          >
            <ExternalLink className="h-4 w-4" /> Open download link
          </a>
          <button
            onClick={() => { navigator.clipboard?.writeText(link).then(() => toast.success("Link copied")).catch(() => {}); }}
            className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold transition hover:border-primary/40"
          >
            <Copy className="h-4 w-4" /> Copy link
          </button>
        </div>
      ) : (
        <div className="text-center">
          <h3 className="mt-1 font-display text-xl font-extrabold uppercase tracking-tight text-balance text-destructive">
            Couldn&apos;t use your pass
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">{errMsg}</p>
          <button
            onClick={onClose}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold transition hover:border-primary/40"
          >
            Close
          </button>
        </div>
      )}
    </ModalShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card/60 p-3">
      <p className="truncate text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-tight">{value}</p>
    </div>
  );
}
