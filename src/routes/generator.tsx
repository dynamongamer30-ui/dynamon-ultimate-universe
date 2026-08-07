import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import { Copy, KeyRound, Loader2, ShieldCheck, Sparkles, ExternalLink, RefreshCw, Timer, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import {
  checkToken,
  generateKey,
  startGate,
  TURNSTILE_SITE_KEY,
} from "@/lib/dgWorker";
import { getFingerprint } from "@/lib/fingerprint";
import { supabase } from "@/integrations/supabase/client";
import { mods } from "@/lib/mods";

/** Short, silent-if-unsupported haptic pulse. */
function buzz(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch { /* unsupported or blocked */ }
}

// ---------- Route registration (both /generator and /generator.html) ----------

type GeneratorSearch = { ref?: string };

const head = () => ({
  meta: [
    { title: "Get Your Key — Dynamon Universe" },
    { name: "description", content: "Verify and claim your Dynamon Universe access key." },
    { name: "robots", content: "noindex" },
  ],
});

export const Route = createFileRoute("/generator")({
  ssr: false,
  head,
  validateSearch: (s: Record<string, unknown>): GeneratorSearch => ({
    ref: typeof s.ref === "string" ? s.ref : undefined,
  }),
  component: GeneratorPage,
});

// ---------- Turnstile global ----------
declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        }
      ) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
  }
}

const TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

function loadTurnstile(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.turnstile) return resolve();
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("turnstile_load_failed")), { once: true });
      return;
    }
    const s = document.createElement("script");
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile_load_failed"));
    document.head.appendChild(s);
  });
}

// ---------- Background fx ----------

function Particles() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full blur-3xl" style={{ background: "color-mix(in oklch, var(--primary) 22%, transparent)" }} />
      <div className="absolute top-1/3 right-0 h-[420px] w-[420px] rounded-full blur-3xl" style={{ background: "color-mix(in oklch, var(--gold) 16%, transparent)" }} />
      <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full blur-3xl" style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)" }} />
    </div>
  );
}

function Orb({ pulse }: { pulse: boolean }) {
  return (
    <motion.div
      className="relative mx-auto h-28 w-28"
      animate={pulse ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 1.6, repeat: pulse ? Infinity : 0, ease: "easeInOut" }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{ background: "linear-gradient(135deg, var(--primary), var(--gold))", boxShadow: "0 0 80px 10px oklch(0.54 0.22 296 / 40%)" }}
      />
      <div className="absolute inset-3 flex items-center justify-center rounded-full backdrop-blur-md" style={{ background: "color-mix(in oklch, var(--background) 75%, transparent)" }}>
        <KeyRound className="h-10 w-10" style={{ color: "var(--gold)" }} />
      </div>
    </motion.div>
  );
}

// ---------- States ----------

type Phase =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "ready" }
  | { kind: "success"; key: string; remaining: number; hours: number; generatedAt: number };

const REASON_TEXT: Record<string, string> = {
  not_found: "This link doesn't work any more. Tap below to start again.",
  missing: "Something's missing from this link. Tap below to start again.",
  used: "You've already used this link. Each one works only once — tap below for a fresh one.",
  expired: "This link only lasts 10 minutes and that time is up. Tap below to start again.",
  invalid_token: "This link doesn't work any more. Tap below to start again.",
  token_used: "You've already used this link. Tap below for a fresh one.",
  token_expired: "This link has expired. Tap below to start again.",
};

function reasonMessage(reason?: string): string {
  if (!reason) return "This link doesn't work any more. Tap below to start again.";
  return REASON_TEXT[reason] || "This link doesn't work any more. Tap below to start again.";
}

// ---------- Page ----------

function GeneratorPage() {
  const search = useSearch({ from: "/generator" }) as GeneratorSearch;
  const ref = search.ref;

  // Deep link registered by the modded APK (com.funtomic.dynamons):
  //   <data android:scheme="dynamongamer" android:host="verify" />
  // If it isn't installed we fall back to the newest mod page on the site
  // (resolved at runtime, so new uploads are followed automatically).

  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [fingerprint, setFingerprint] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Step 1+2 — validate ref
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!ref) {
        setPhase({ kind: "invalid", reason: "missing" });
        return;
      }
      setPhase({ kind: "loading" });
      const res = await checkToken(ref);
      if (cancelled) return;
      if (!res.valid) {
        setPhase({ kind: "invalid", reason: res.reason || "not_found" });
        return;
      }
      setPhase({ kind: "ready" });
    })();
    return () => {
      cancelled = true;
    };
  }, [ref]);

  // Step 4 — fingerprint
  useEffect(() => {
    if (phase.kind !== "ready") return;
    getFingerprint()
      .then(setFingerprint)
      .catch(() => toast.error("We couldn’t check your device. Turn off private/incognito mode and try again."));
  }, [phase.kind]);

  // Step 3 — render Turnstile
  useEffect(() => {
    if (phase.kind !== "ready") return;
    if (!TURNSTILE_SITE_KEY) {
      toast.error("The robot check isn’t set up right now. Please try again later.");
      return;
    }
    let cancelled = false;
    loadTurnstile()
      .then(() => {
        if (cancelled || !widgetRef.current || !window.turnstile) return;
        // wipe any previous widget
        widgetRef.current.innerHTML = "";
        widgetIdRef.current = window.turnstile.render(widgetRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "dark",
          callback: (token: string) => setTurnstileToken(token),
          "error-callback": () => {
            setTurnstileToken("");
            toast.error("The robot check didn’t work. Please try again.");
          },
          "expired-callback": () => {
            setTurnstileToken("");
          },
        });
      })
      .catch(() => toast.error("The robot check couldn’t load. Check your internet and refresh."));
    return () => {
      cancelled = true;
    };
  }, [phase.kind]);

  const resetTurnstile = useCallback(() => {
    setTurnstileToken("");
    if (window.turnstile && widgetIdRef.current) {
      try {
        window.turnstile.reset(widgetIdRef.current);
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Step 5/6/7 — generate
  const onGenerate = async () => {
    if (!ref || !turnstileToken || !fingerprint) return;
    setSubmitting(true);
    const res = await generateKey({ accessToken: ref, turnstileToken, fingerprint });
    setSubmitting(false);

    if (res.ok) {
      // Default to 24h for the user-visible label; the real expiry is enforced server-side.
      setPhase({ kind: "success", key: res.key, remaining: res.remaining, hours: 24, generatedAt: Date.now() });
      toast.success("Your key is ready and copied!");
      resetTurnstile();
      buzz([15, 60, 15, 60, 40]);
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        confetti({
          particleCount: 130,
          spread: 75,
          origin: { y: 0.55 },
          colors: ["#a86ee6", "#e0b45a", "#c9a4ee", "#ffffff"],
        });
      }
      return;
    }

    const err = res.error;
    switch (err) {
      case "maintenance":
        toast.error("Keys are paused for maintenance right now. Please check back soon.");
        break;
      case "captcha_failed":
        toast.error("The robot check didn’t pass. Please try again.");
        resetTurnstile();
        break;
      case "rate_limited":
        toast.error(
          `Limit reached. Try again in ${res.resetInMinutes ?? "a few"} minutes`
        );
        break;
      case "invalid_token":
      case "token_used":
      case "token_expired":
        toast.error("That link no longer works. Please get a new key.");
        setPhase({ kind: "invalid", reason: err });
        break;
      case "missing_fields":
      case "bad_request":
      default:
        toast.error("Something went wrong, retry");
        resetTurnstile();
        break;
    }
  };

  const copyKey = async (k: string) => {
    try {
      await navigator.clipboard.writeText(k);
      toast.success("Key copied");
    } catch {
      toast.error("Couldn’t copy — press and hold the key to copy it");
    }
  };

  // ---- Live countdown to the 10-minute unused-key deletion deadline ----
  // Starts from when the key was generated (client time; within ~1-2s of the
  // DB `date`, which is fine — avoids an extra DB/Worker round-trip per key).
  const KEY_TTL_SECONDS = 600; // must match the cleanup_valid_keys() 10-min rule
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (phase.kind !== "success") { setSecondsLeft(null); return; }
    const deadline = phase.generatedAt + KEY_TTL_SECONDS * 1000;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((deadline - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [phase]);

  // Auto-copy the key the instant the success screen appears (no tap needed).
  useEffect(() => {
    if (phase.kind === "success") {
      navigator.clipboard.writeText(phase.key).catch(() => { /* clipboard may be blocked; tap still works */ });
    }
  }, [phase]);

  const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Resolve the newest mod page at runtime so the "app not installed" fallback
  // always follows your latest upload. Prefers the most recently updated row in
  // mod_overrides; if that's unavailable, uses the newest base mod by date.
  const latestModUrl = useCallback(async (): Promise<string> => {
    try {
      const { data } = await supabase
        .from("mod_overrides")
        .select("slug, updated_at")
        .eq("hidden", false)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.slug) return `/mods/${data.slug}`;
    } catch { /* fall through */ }
    // Fallback: newest base mod by its `updated` date.
    const newest = [...mods].sort((a, b) => (a.updated < b.updated ? 1 : -1))[0];
    return newest ? `/mods/${newest.slug}` : "/mods";
  }, []);

  // Copy the key, then try to launch the modded APK. If it doesn't take over
  // the screen within ~1.5s (not installed / can't open), tell the user and
  // send them to the latest mod page to download it.
  const copyAndOpenApp = async (k: string) => {
    await copyKey(k);
    const isAndroid = /android/i.test(navigator.userAgent);
    const fallback = async () => {
      toast.error("App not installed on your phone — opening the latest mod page.");
      const url = await latestModUrl();
      window.location.assign(url);
    };

    if (!isAndroid) { await fallback(); return; }

    let hidden = false;
    const onHide = () => { hidden = true; };
    document.addEventListener("visibilitychange", onHide);

    // Must match the APK's intent-filter exactly:
    //   <data android:scheme="dynamongamer" android:host="verify" />
    // Using the plain scheme URL (not intent://) avoids Android's default
    // "open Play Store" fallback when the package isn't resolvable.
    window.location.href = "dynamongamer://verify";

    // If the app took over, the tab goes hidden; if we're still here after the
    // delay, treat it as "not installed" and redirect.
    setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      if (!hidden && !document.hidden) fallback();
    }, 1500);
  };

  // ---------- Render ----------

  return (
    <PageShell>
      <Particles />
      <div className="mx-auto max-w-xl py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-2xl border p-8 shadow-elev backdrop-blur-xl"
          style={{ borderColor: "var(--border)", background: "color-mix(in oklch, var(--card) 88%, transparent)" }}
        >
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Orb pulse={phase.kind === "loading" || submitting} />
            <h1 className="font-display text-3xl font-bold tracking-tight" style={{ background: "linear-gradient(90deg, var(--foreground), var(--gold))", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>
              Claim your key
            </h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              Tick the box below to prove you're not a robot. Then we'll forge a key that unlocks the mod in the app.
            </p>
          </div>

            {phase.kind === "loading" && (
              <div className="flex flex-col items-center gap-3 py-10" style={{ color: "var(--muted-foreground)" }}>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Checking your link…</span>
              </div>
            )}

            {phase.kind === "invalid" && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <p className="text-lg" style={{ color: "var(--foreground)" }}>{reasonMessage(phase.reason)}</p>
                <Button
                  onClick={() => window.location.assign(startGate())}
                  className="text-primary-foreground"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
                >
                  <KeyRound className="mr-2 h-4 w-4" />
                  Start again
                </Button>
              </div>
            )}

            {phase.kind === "ready" && (
              <div className="flex flex-col items-center gap-5">
                <div className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "color-mix(in oklch, var(--gold) 35%, transparent)", background: "color-mix(in oklch, var(--gold) 8%, transparent)", color: "var(--gold)" }}>
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Link looks good — just tick the box below
                </div>

                <div ref={widgetRef} className="min-h-[70px]" />

                <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                  Your device ID: {fingerprint ? `${fingerprint.slice(0, 10)}…` : "checking…"}
                </div>

                <Button
                  onClick={onGenerate}
                  disabled={!turnstileToken || !fingerprint || submitting}
                  className="w-full text-primary-foreground transition-transform hover:scale-[1.01] disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Forging your key…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Get my key
                    </>
                  )}
                </Button>
              </div>
            )}

            {phase.kind === "success" && (
              <div className="flex flex-col items-center gap-5 py-2">
                <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "color-mix(in oklch, var(--gold) 35%, transparent)", background: "color-mix(in oklch, var(--gold) 10%, transparent)", color: "var(--gold)" }}>
                  <Sparkles className="h-3.5 w-3.5" />
                  {phase.remaining} more key{phase.remaining === 1 ? "" : "s"} left for you today
                </div>

                <button
                  onClick={() => copyKey(phase.key)}
                  className="group w-full rounded-xl border p-5 text-center transition-colors"
                  style={{ borderColor: "color-mix(in oklch, var(--gold) 30%, transparent)", background: "linear-gradient(135deg, color-mix(in oklch, var(--primary) 10%, transparent), color-mix(in oklch, var(--gold) 6%, transparent))" }}
                >
                  <div className="font-display text-3xl tracking-widest" style={{ color: "var(--gold)" }}>
                    {phase.key}
                  </div>
                  <div className="mt-2 inline-flex items-center gap-1 text-xs" style={{ color: "#4ade80" }}>
                    <CheckCircle2 className="h-3 w-3" />
                    Already copied — just paste it in the app
                  </div>
                </button>

                {secondsLeft !== null && (
                  secondsLeft > 0 ? (
                    <div
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold"
                      style={
                        secondsLeft <= 60
                          ? { borderColor: "color-mix(in oklch, #f87171 40%, transparent)", background: "color-mix(in oklch, #f87171 10%, transparent)", color: "#f87171" }
                          : { borderColor: "color-mix(in oklch, var(--gold) 30%, transparent)", background: "color-mix(in oklch, var(--gold) 6%, transparent)", color: "var(--gold)" }
                      }
                    >
                      <Timer className="h-4 w-4" />
                      Use it within <span className="font-mono tabular-nums">{fmtCountdown(secondsLeft)}</span> or it disappears
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold" style={{ borderColor: "color-mix(in oklch, #f87171 40%, transparent)", background: "color-mix(in oklch, #f87171 10%, transparent)", color: "#f87171" }}>
                      <XCircle className="h-4 w-4" />
                      This key ran out of time — get a new one
                    </div>
                  )
                )}

                <div className="flex w-full flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => window.location.assign(startGate())}
                    variant="outline"
                    className="flex-1"
                    style={{ borderColor: "color-mix(in oklch, var(--gold) 30%, transparent)", color: "var(--foreground)" }}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    New key
                  </Button>
                  <Button
                    onClick={() => copyAndOpenApp(phase.key)}
                    disabled={secondsLeft === 0}
                    className="flex-1 text-primary-foreground disabled:opacity-50"
                    style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Copy &amp; Open App
                  </Button>
                </div>
              </div>
            )}
        </motion.div>

        <p className="mt-4 text-center text-xs" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
          One key per device. Don't share your key — shared keys get blocked.
        </p>
      </div>
    </PageShell>
  );
}
