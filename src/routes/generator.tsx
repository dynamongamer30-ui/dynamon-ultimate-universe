import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import confetti from "canvas-confetti";
import {
  Copy,
  KeyRound,
  Loader2,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Timer,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { checkToken, generateKey, startGate, TURNSTILE_SITE_KEY } from "@/lib/dgWorker";
import { getFingerprint } from "@/lib/fingerprint";
import { supabase } from "@/integrations/supabase/client";
import { mods } from "@/lib/mods";
import { playUnlock } from "@/lib/sound";

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
          action?: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
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
      existing.addEventListener("error", () => reject(new Error("turnstile_load_failed")), {
        once: true,
      });
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
      <div
        className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full blur-3xl"
        style={{ background: "color-mix(in oklch, var(--primary) 22%, transparent)" }}
      />
      <div
        className="absolute top-1/3 right-0 h-[420px] w-[420px] rounded-full blur-3xl"
        style={{ background: "color-mix(in oklch, var(--gold) 16%, transparent)" }}
      />
      <div
        className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full blur-3xl"
        style={{ background: "color-mix(in oklch, var(--primary) 12%, transparent)" }}
      />
    </div>
  );
}

function Orb({ pulse }: { pulse: boolean }) {
  const reducedMotion = useReducedMotionPreference();
  return (
    <motion.div
      className="relative mx-auto h-28 w-28"
      animate={pulse && !reducedMotion ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={
        reducedMotion
          ? { duration: 0 }
          : { duration: 1.6, repeat: pulse && !reducedMotion ? Infinity : 0, ease: "easeInOut" }
      }
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "linear-gradient(135deg, var(--primary), var(--gold))",
          boxShadow: "0 0 80px 10px oklch(0.54 0.22 296 / 40%)",
        }}
      />
      <div
        className="absolute inset-3 flex items-center justify-center rounded-full backdrop-blur-md"
        style={{ background: "color-mix(in oklch, var(--background) 75%, transparent)" }}
      >
        <KeyRound className="h-10 w-10" style={{ color: "var(--gold)" }} />
      </div>
    </motion.div>
  );
}

// ---------- States ----------

type Phase =
  | { kind: "loading" }
  | { kind: "lookup-error" }
  | { kind: "uncertain" }
  | { kind: "invalid"; reason: string }
  | { kind: "ready" }
  | { kind: "success"; key: string; remaining: number | null; generatedAt: number };

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
  return <GeneratorFlow key={search.ref ?? ""} accessRef={search.ref} />;
}

function GeneratorFlow({ accessRef: ref }: { accessRef?: string }) {
  const reducedMotion = useReducedMotionPreference();
  // Deep link registered by the modded APK (com.funtomic.dynamons):
  //   <data android:scheme="dynamongamer" android:host="verify" />
  // If it isn't installed we fall back to the newest mod page on the site
  // (resolved at runtime, so new uploads are followed automatically).

  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [turnstileToken, setTurnstileToken] = useState<string>("");
  const [fingerprint, setFingerprint] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copying" | "copied" | "error">("idle");
  const [openingApp, setOpeningApp] = useState(false);
  const active = useRef(true);
  const generating = useRef(false);
  const opening = useRef(false);
  const copyRevision = useRef(0);
  const controllers = useRef(new Set<AbortController>());
  const appCleanup = useRef<(() => void) | undefined>(undefined);

  useEffect(() => {
    active.current = true;
    const activeControllers = controllers.current;
    return () => {
      active.current = false;
      for (const controller of activeControllers) controller.abort();
      appCleanup.current?.();
    };
  }, []);

  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  // Step 1+2 — validate ref
  useEffect(() => {
    if (!ref) {
      setPhase({ kind: "invalid", reason: "missing" });
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 10_000);
    (async () => {
      setPhase({ kind: "loading" });
      const res = await checkToken(ref, controller.signal);
      clearTimeout(deadline);
      if (cancelled) return;
      if (res.unavailable) {
        setPhase({ kind: "lookup-error" });
        return;
      }
      if (!res.valid) {
        setPhase({ kind: "invalid", reason: res.reason || "not_found" });
        return;
      }
      setPhase({ kind: "ready" });
    })();
    return () => {
      cancelled = true;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [ref, lookupAttempt]);

  // Step 4 — fingerprint
  useEffect(() => {
    if (phase.kind !== "ready") return;
    getFingerprint()
      .then(setFingerprint)
      .catch(() =>
        toast.error(
          "We couldn’t check your device. Turn off private/incognito mode and try again.",
        ),
      );
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
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* Widget already removed. */
        }
        widgetIdRef.current = null;
      }
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
    if (!ref || !turnstileToken || !fingerprint || generating.current || !active.current) return;
    generating.current = true;
    setSubmitting(true);
    const controller = new AbortController();
    controllers.current.add(controller);
    const deadline = setTimeout(() => controller.abort(), 10_000);
    const res = await generateKey(
      { accessToken: ref, turnstileToken, fingerprint },
      controller.signal,
    );
    clearTimeout(deadline);
    controllers.current.delete(controller);
    generating.current =
      res.ok ||
      res.uncertain === true ||
      ["invalid_token", "token_used", "token_expired"].includes(res.error);
    if (!active.current) return;
    setSubmitting(false);

    if (res.ok) {
      setCopyStatus("idle");
      setPhase({
        kind: "success",
        key: res.key,
        remaining: res.remaining,
        generatedAt: Date.now(),
      });
      toast.success("Your key is ready");
      resetTurnstile();
      playUnlock();
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

    if (res.uncertain) {
      setPhase({ kind: "uncertain" });
      resetTurnstile();
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
        toast.error(`Limit reached. Try again in ${res.resetInMinutes ?? "a few"} minutes`);
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

  const copyKey = useCallback(async (k: string, announce = true): Promise<boolean> => {
    if (!active.current) return false;
    const revision = ++copyRevision.current;
    setCopyStatus("copying");
    try {
      await navigator.clipboard.writeText(k);
      if (!active.current) return false;
      if (revision === copyRevision.current) {
        setCopyStatus("copied");
        if (announce) toast.success("Key copied");
      }
      return true;
    } catch {
      if (active.current && revision === copyRevision.current) {
        setCopyStatus("error");
        if (announce) toast.error("Couldn’t copy — select the key to copy it manually");
      }
      return false;
    }
  }, []);

  // Receipt-time estimate for unused web-key cleanup, not proof of license expiry.
  const KEY_TTL_SECONDS = 600;
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);

  useEffect(() => {
    if (phase.kind !== "success") {
      setSecondsLeft(null);
      return;
    }
    const deadline = phase.generatedAt + KEY_TTL_SECONDS * 1000;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      clearTimeout(timer);
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setSecondsLeft(remaining);
      if (remaining > 0 && !document.hidden) timer = setTimeout(tick, 1000);
    };
    tick();
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [phase]);

  // Auto-copy the key the instant the success screen appears (no tap needed).
  useEffect(() => {
    if (phase.kind === "success") {
      void copyKey(phase.key, false);
    }
  }, [phase, copyKey]);

  const fmtCountdown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // Resolve the newest mod page at runtime so the "app not installed" fallback
  // always follows your latest upload. Prefers the most recently updated row in
  // mod_overrides; if that's unavailable, uses the newest base mod by date.
  const latestModUrl = useCallback(async (): Promise<string> => {
    const controller = new AbortController();
    controllers.current.add(controller);
    const deadline = setTimeout(() => controller.abort(), 5000);
    try {
      const { data } = await supabase
        .from("mod_overrides")
        .select("slug, updated_at")
        .eq("hidden", false)
        .order("updated_at", { ascending: false })
        .limit(1)
        .abortSignal(controller.signal)
        .maybeSingle()
        .retry(false);
      if (typeof data?.slug === "string" && data.slug)
        return `/mods/${encodeURIComponent(data.slug)}`;
    } catch {
      /* fall through */
    } finally {
      clearTimeout(deadline);
      controllers.current.delete(controller);
    }
    // Fallback: newest base mod by its `updated` date.
    const newest = [...mods].sort((a, b) => (a.updated < b.updated ? 1 : -1))[0];
    return newest ? `/mods/${newest.slug}` : "/mods";
  }, []);

  // Copy the key, then try to launch the modded APK. If it doesn't take over
  // the screen within ~1.5s (not installed / can't open), tell the user and
  // send them to the latest mod page to download it.
  const copyAndOpenApp = async (k: string) => {
    if (opening.current || !active.current) return;
    opening.current = true;
    setOpeningApp(true);
    const finish = () => {
      opening.current = false;
      if (active.current) setOpeningApp(false);
    };
    if (!(await copyKey(k)) || !active.current) {
      finish();
      return;
    }
    const isAndroid = /android/i.test(navigator.userAgent);
    const fallback = async () => {
      toast("Opening the latest mod page. Use your key in the Android app.");
      const url = await latestModUrl();
      if (active.current) window.location.assign(url);
    };

    if (!isAndroid) {
      await fallback();
      finish();
      return;
    }

    let hidden = false;
    const onHide = () => {
      if (document.hidden) hidden = true;
    };
    document.addEventListener("visibilitychange", onHide);

    // Must match the APK's intent-filter exactly:
    //   <data android:scheme="dynamongamer" android:host="verify" />
    // Using the plain scheme URL (not intent://) avoids Android's default
    // "open Play Store" fallback when the package isn't resolvable.
    window.location.href = "dynamongamer://verify";

    // If the app took over, the tab goes hidden; if we're still here after the
    // delay, treat it as "not installed" and redirect.
    const timer = setTimeout(() => {
      document.removeEventListener("visibilitychange", onHide);
      appCleanup.current = undefined;
      if (active.current && !hidden && !document.hidden) void fallback().finally(finish);
      else finish();
    }, 1500);
    appCleanup.current = () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onHide);
    };
  };

  // ---------- Render ----------

  return (
    <PageShell>
      <Particles />
      <div className="mx-auto max-w-xl py-8">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="route-hero rounded-2xl border p-8 shadow-elev backdrop-blur-xl"
          style={{
            borderColor: "var(--border)",
            background: "color-mix(in oklch, var(--card) 88%, transparent)",
          }}
        >
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Orb pulse={phase.kind === "loading" || submitting} />
            <h1
              className="font-display text-3xl font-bold tracking-tight"
              style={{
                background: "linear-gradient(90deg, var(--foreground), var(--gold))",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Claim your key
            </h1>
            <p className="text-sm" style={{ color: "var(--muted-foreground)" }}>
              {phase.kind === "ready"
                ? "Complete the verification below, then request your key."
                : phase.kind === "success"
                  ? "Copy your key and activate it in the Android app."
                  : phase.kind === "uncertain"
                    ? "Check the request outcome before starting again."
                    : "Use a valid access link to claim your key for the app."}
            </p>
          </div>

          {phase.kind === "loading" && (
            <div
              role="status"
              className="flex flex-col items-center gap-3 py-10"
              style={{ color: "var(--muted-foreground)" }}
            >
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Checking your link…</span>
            </div>
          )}

          {phase.kind === "invalid" && (
            <div role="alert" className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-lg" style={{ color: "var(--foreground)" }}>
                {reasonMessage(phase.reason)}
              </p>
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

          {phase.kind === "lookup-error" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p role="alert" className="text-sm text-foreground">
                We couldn’t check your link. Your connection or the key service may be unavailable.
                Retry the check with this same link.
              </p>
              <Button
                className="touch-target"
                onClick={() => setLookupAttempt((attempt) => attempt + 1)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry link check
              </Button>
            </div>
          )}

          {phase.kind === "uncertain" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p role="alert" className="text-sm text-foreground">
                We couldn’t confirm the result. Your request may have completed, so it won’t be sent
                again automatically. This page can’t recover a key from a lost response. Start again
                if you still need a key.
              </p>
              <Button className="touch-target" onClick={() => window.location.assign(startGate())}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Start with a new link
              </Button>
            </div>
          )}

          {phase.kind === "ready" && (
            <div className="flex flex-col items-center gap-5">
              <div
                role="status"
                className="flex items-center gap-2 rounded-full border px-3 py-1 text-xs"
                style={{
                  borderColor: "color-mix(in oklch, var(--gold) 35%, transparent)",
                  background: "color-mix(in oklch, var(--gold) 8%, transparent)",
                  color: "var(--gold)",
                }}
              >
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
            <div className="flex flex-col items-center gap-6 py-2">
              {/* Key reveal card */}
              <div className="w-full">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
                  <label
                    htmlFor="generated-access-key"
                    className="text-xs font-semibold uppercase tracking-[0.2em]"
                    style={{ color: "var(--muted-foreground)" }}
                  >
                    Your key
                  </label>
                  {phase.remaining !== null && (
                    <span
                      className="inline-flex items-center gap-1 text-xs font-medium"
                      style={{ color: "var(--gold)" }}
                    >
                      <Sparkles className="h-3 w-3" />
                      {phase.remaining} keys left in this window
                    </span>
                  )}
                </div>

                <div
                  className="relative w-full overflow-hidden rounded-2xl p-[1.5px]"
                  style={{
                    background: "linear-gradient(135deg, var(--gold), var(--primary), var(--gold))",
                  }}
                >
                  <div
                    className="rounded-[15px] px-5 py-6"
                    style={{
                      background: "color-mix(in oklch, var(--background) 92%, transparent)",
                    }}
                  >
                    <input
                      id="generated-access-key"
                      aria-describedby="generated-key-copy-status"
                      readOnly
                      value={phase.key}
                      onFocus={(event) => event.currentTarget.select()}
                      className="w-full min-w-0 select-all bg-transparent text-center font-display text-2xl font-bold leading-tight tracking-wide text-foreground outline-offset-4"
                      style={{
                        color: "var(--gold)",
                        filter: "drop-shadow(0 0 18px oklch(0.78 0.13 82 / 35%))",
                      }}
                    />
                    <p
                      id="generated-key-copy-status"
                      role={copyStatus === "error" ? "alert" : "status"}
                      className="mt-3 text-center text-xs text-muted-foreground"
                    >
                      {copyStatus === "copied"
                        ? "Key copied"
                        : copyStatus === "copying"
                          ? "Copying key…"
                          : copyStatus === "error"
                            ? "Copy was blocked. Select the key field to copy it manually, or try Copy key."
                            : "Select the key field or use Copy key."}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      className="touch-target mt-3 w-full"
                      disabled={copyStatus === "copying"}
                      onClick={() => void copyKey(phase.key)}
                    >
                      {copyStatus === "copied" ? (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      ) : (
                        <Copy className="mr-2 h-4 w-4" />
                      )}
                      {copyStatus === "copying"
                        ? "Copying…"
                        : copyStatus === "copied"
                          ? "Copy again"
                          : "Copy key"}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Countdown */}
              {secondsLeft !== null &&
                (secondsLeft > 0 ? (
                  <div
                    className="w-full rounded-xl border px-4 py-3"
                    style={
                      secondsLeft <= 60
                        ? {
                            borderColor: "color-mix(in oklch, #f87171 35%, transparent)",
                            background: "color-mix(in oklch, #f87171 7%, transparent)",
                          }
                        : {
                            borderColor: "var(--border)",
                            background: "color-mix(in oklch, var(--background) 45%, transparent)",
                          }
                    }
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs font-medium"
                        style={{ color: secondsLeft <= 60 ? "#f87171" : "var(--muted-foreground)" }}
                      >
                        <Timer className="h-3.5 w-3.5" />
                        {secondsLeft <= 60
                          ? "Activate an unused key soon"
                          : "Approximate unused-key window"}
                      </span>
                      <span
                        className="font-display text-xl font-bold tabular-nums tracking-wide"
                        style={{ color: secondsLeft <= 60 ? "#f87171" : "var(--gold)" }}
                      >
                        {fmtCountdown(secondsLeft)}
                      </span>
                    </div>
                    <div
                      className="mt-2.5 h-1 w-full overflow-hidden rounded-full"
                      style={{ background: "var(--border)" }}
                    >
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          background:
                            secondsLeft <= 60
                              ? "#f87171"
                              : "linear-gradient(90deg, var(--primary), var(--gold))",
                        }}
                        animate={{ width: `${(secondsLeft / KEY_TTL_SECONDS) * 100}%` }}
                        transition={
                          reducedMotion ? { duration: 0 } : { duration: 0.6, ease: "linear" }
                        }
                      />
                    </div>
                  </div>
                ) : (
                  <div
                    className="flex w-full items-center gap-2 rounded-xl border px-4 py-3"
                    style={{
                      borderColor: "color-mix(in oklch, #f87171 40%, transparent)",
                      background: "color-mix(in oklch, #f87171 10%, transparent)",
                    }}
                  >
                    <XCircle className="h-4 w-4 shrink-0" style={{ color: "#f87171" }} />
                    <span className="text-sm font-semibold" style={{ color: "#f87171" }}>
                      The unused-key window has passed. If you already activated this key, its
                      server-controlled access period still applies. Otherwise, start again if the
                      app rejects it.
                    </span>
                  </div>
                ))}

              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => window.location.assign(startGate())}
                  variant="outline"
                  className="flex-1"
                  style={{
                    borderColor: "color-mix(in oklch, var(--gold) 30%, transparent)",
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  New key
                </Button>
                <Button
                  onClick={() => copyAndOpenApp(phase.key)}
                  disabled={openingApp || copyStatus === "copying"}
                  className="flex-1 text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  {openingApp ? "Opening app…" : "Copy & Open App"}
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        <p
          className="mt-4 text-center text-xs"
          style={{ color: "var(--muted-foreground)", opacity: 0.7 }}
        >
          Keep your key private and use it in the Android app on your device.
        </p>
      </div>
    </PageShell>
  );
}
