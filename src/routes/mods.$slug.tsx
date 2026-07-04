import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "motion/react";
import { useState } from "react";
import { ArrowLeft, Check, Download, Shield, PlayCircle, Sparkles, Lock, ExternalLink, Loader2, X } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { CommentsPanel } from "@/components/CommentsPanel";
import { SocialStrip } from "@/components/SocialStrip";
import { ChangelogTimeline } from "@/components/ChangelogTimeline";
import { FavoriteButton } from "@/components/FavoriteButton";
import { useAuth } from "@/hooks/useAuth";
import { useGamification } from "@/hooks/useGamification";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Cipher } from "@/lib/cipher";
import { getMod, mods, formatCount, elementTheme, type Mod } from "@/lib/mods";
import { playClick } from "@/lib/sound";
import { toast } from "sonner";

export const Route = createFileRoute("/mods/$slug")({
  loader: ({ params }) => {
    const mod = getMod(params.slug);
    if (!mod) throw notFound();
    return { mod };
  },
  head: ({ loaderData }) => ({
    meta: loaderData ? [
      { title: `${loaderData.mod.name} — Dynamon Universe` },
      { name: "description", content: loaderData.mod.tagline },
      { property: "og:title", content: `${loaderData.mod.name} — Dynamon Universe` },
      { property: "og:description", content: loaderData.mod.tagline },
      { property: "og:image", content: loaderData.mod.image },
      { property: "twitter:image", content: loaderData.mod.image },
    ] : [],
  }),
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
  const { overrides } = useSiteSettings();
  const theme = elementTheme[mod.element];
  const [tab, setTab] = useState<"overview" | "changelog">("overview");
  const [gateOpen, setGateOpen] = useState(false);

  // Decrypt the owner-configured, AES-encrypted links for this mod.
  const ov = overrides[mod.slug];
  const megaUrl = safeDecrypt(ov?.mega_enc) || ov?.download_url || "";
  const followUrl = safeDecrypt(ov?.follow_enc);

  const handleGet = () => {
    if (!user) { toast.error("Sign in to download"); return; }
    playClick();
    award(10, "Downloaded");
    grant("first_download");
    if (!megaUrl) {
      toast.error("Download not available yet", {
        description: "The owner hasn't published a download link for this build.",
      });
      return;
    }
    // Open the follow-gate; the actual MEGA link is only revealed inside it.
    setGateOpen(true);
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
          <img src={mod.image} alt={mod.name} width={1024} height={1024} className="relative aspect-square w-full object-cover" />
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
          <h1 className="mt-4 font-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-balance sm:text-5xl">{mod.name}</h1>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground text-pretty">{mod.tagline}</p>

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
                <p className="text-sm leading-relaxed text-muted-foreground">{mod.description}</p>
              </div>
              <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                {mod.features.map((f) => (
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
              <ChangelogTimeline entries={mod.changelog} glow={theme.glow} />
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              onClick={handleGet}
              className="press inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-sm font-bold text-primary-foreground glow-primary transition-[filter] hover:brightness-110"
            >
              <Download className="h-4 w-4" /> {user ? "Download mod" : "Sign in to download"}
            </button>
            <FavoriteButton slug={mod.slug} />
            <Link
              to="/disclaimer" onMouseDown={playClick}
              className="press inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-3 text-sm font-semibold transition-colors hover:border-primary/40"
            >
              <Shield className="h-4 w-4" /> Safety notes
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-4 gap-3 text-center text-xs">
            <Stat label="Downloads" value={`${formatCount(mod.downloads)}+`} />
            <Stat label="Version" value={mod.version} />
            <Stat label="Size" value={mod.size} />
            <Stat label="Updated" value={new Date(mod.updated).toLocaleDateString()} />
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
          {mod.youtubeId ? (
            <div className="relative aspect-video w-full">
              <iframe
                className="absolute inset-0 h-full w-full"
                src={`https://www.youtube.com/embed/${mod.youtubeId}`}
                title={`${mod.name} gameplay`}
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

      <CommentsPanel slug={mod.slug} />

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

      <section className="mt-16">
        <SocialStrip />
      </section>

      {gateOpen && (
        <FollowGate
          modName={mod.name}
          megaUrl={megaUrl}
          followUrl={followUrl}
          onClose={() => setGateOpen(false)}
        />
      )}
    </PageShell>
  );
}

function FollowGate({
  modName, megaUrl, followUrl, onClose,
}: { modName: string; megaUrl: string; followUrl: string; onClose: () => void }) {
  // If there's no follow link configured, skip straight to the unlocked state.
  const [step, setStep] = useState<"gate" | "ready">(followUrl ? "gate" : "ready");
  const [waiting, setWaiting] = useState(false);

  const handleFollow = () => {
    playClick();
    window.open(followUrl, "_blank", "noopener,noreferrer");
    // Short verify delay so the reveal feels earned, then unlock.
    setWaiting(true);
    setTimeout(() => { setWaiting(false); setStep("ready"); }, 4000);
  };

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
              One step to unlock
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Follow us to unlock the secure download for <span className="font-semibold text-foreground">{modName}</span>. The link reveals automatically once you&apos;re back.
            </p>
            <button
              onClick={handleFollow} disabled={waiting}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
            >
              {waiting ? (<><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</>) : (<><ExternalLink className="h-4 w-4" /> Follow to unlock</>)}
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Check className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-display text-xl font-extrabold uppercase tracking-tight text-balance">
              Download unlocked
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground text-pretty">
              Your secure MEGA link for <span className="font-semibold text-foreground">{modName}</span> is ready.
            </p>
            <a
              href={megaUrl} target="_blank" rel="noopener noreferrer" onMouseDown={playClick}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition hover:opacity-90"
            >
              <Download className="h-4 w-4" /> Open download
            </a>
          </div>
        )}
      </motion.div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  );
}
