import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Copy, KeyRound, Loader2, ShieldCheck, Sparkles, ExternalLink, RefreshCw } from "lucide-react";
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
      <div className="absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-amber-500/20 blur-3xl" />
      <div className="absolute top-1/3 right-0 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-yellow-400/10 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.08),transparent_60%)]" />
    </div>
  );
}

function Orb({ pulse }: { pulse: boolean }) {
  return (
    <div className="relative mx-auto h-28 w-28">
      <div
        className={`absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 ${
          pulse ? "animate-pulse" : ""
        }`}
        style={{ boxShadow: "0 0 80px 10px rgba(251,191,36,0.45)" }}
      />
      <div className="absolute inset-3 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center">
        <Sparkles className="h-10 w-10 text-amber-300" />
      </div>
    </div>
  );
}

// ---------- States ----------

type Phase =
  | { kind: "loading" }
  | { kind: "invalid"; reason: string }
  | { kind: "ready" }
  | { kind: "success"; key: string; remaining: number; hours: number };

const REASON_TEXT: Record<string, string> = {
  not_found: "This access link is invalid.",
  missing: "Access link is missing.",
  used: "This link was already used.",
  expired: "Link expired (10 minute limit). Please get a new one.",
  invalid_token: "Access link is invalid.",
  token_used: "This link was already used.",
  token_expired: "Link expired. Please get a new one.",
};

function reasonMessage(reason?: string): string {
  if (!reason) return "Link invalid.";
  return REASON_TEXT[reason] || "Link invalid.";
}

// ---------- Page ----------

function GeneratorPage() {
  const search = useSearch({ from: "/generator" }) as GeneratorSearch;
  const ref = search.ref;

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
      .catch(() => toast.error("Could not compute device fingerprint"));
  }, [phase.kind]);

  // Step 3 — render Turnstile
  useEffect(() => {
    if (phase.kind !== "ready") return;
    if (!TURNSTILE_SITE_KEY) {
      toast.error("Turnstile not configured");
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
            toast.error("Captcha error — please retry");
          },
          "expired-callback": () => {
            setTurnstileToken("");
          },
        });
      })
      .catch(() => toast.error("Failed to load captcha"));
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
      setPhase({ kind: "success", key: res.key, remaining: res.remaining, hours: 24 });
      toast.success("Key generated!");
      resetTurnstile();
      return;
    }

    const err = res.error;
    switch (err) {
      case "maintenance":
        toast.error("Generator is under maintenance, try later");
        break;
      case "captcha_failed":
        toast.error("Captcha failed — please try again");
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
        toast.error("Link invalid — please get a new key");
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
      toast.success("Key copied to clipboard");
    } catch {
      toast.error("Could not copy");
    }
  };

  // ---------- Render ----------

  return (
    <PageShell>
      <Particles />
      <div className="mx-auto max-w-xl py-8">
        <div className="rounded-2xl border border-amber-500/20 bg-black/40 p-8 backdrop-blur-xl shadow-[0_0_60px_-10px_rgba(251,191,36,0.25)]">
          <div className="mb-6 flex flex-col items-center gap-3 text-center">
            <Orb pulse={phase.kind === "loading" || submitting} />
            <h1 className="bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              Get Your Access Key
            </h1>
            <p className="text-sm text-amber-100/70">
              Verify you're human to claim your one-time Dynamon Universe key.
            </p>
          </div>

          {phase.kind === "loading" && (
            <div className="flex flex-col items-center gap-3 py-10 text-amber-200/80">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Validating your access link…</span>
            </div>
          )}

          {phase.kind === "invalid" && (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <p className="text-lg text-amber-100">{reasonMessage(phase.reason)}</p>
              <Button
                onClick={() => window.location.assign(startGate())}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Get a New Key
              </Button>
            </div>
          )}

          {phase.kind === "ready" && (
            <div className="flex flex-col items-center gap-5">
              <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-xs text-amber-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                Link verified — complete the captcha
              </div>

              <div ref={widgetRef} className="min-h-[70px]" />

              <div className="text-xs text-amber-100/50">
                Device: {fingerprint ? `${fingerprint.slice(0, 10)}…` : "computing…"}
              </div>

              <Button
                onClick={onGenerate}
                disabled={!turnstileToken || !fingerprint || submitting}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating…
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Key
                  </>
                )}
              </Button>
            </div>
          )}

          {phase.kind === "success" && (
            <div className="flex flex-col items-center gap-5 py-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs text-amber-200">
                <Sparkles className="h-3.5 w-3.5" />
                {phase.remaining} key{phase.remaining === 1 ? "" : "s"} remaining today
              </div>

              <button
                onClick={() => copyKey(phase.key)}
                className="group w-full rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 text-center transition hover:border-amber-400/60"
              >
                <div className="font-mono text-3xl tracking-widest text-amber-200 group-hover:text-amber-100">
                  {phase.key}
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs text-amber-100/60">
                  <Copy className="h-3 w-3" />
                  Tap to copy
                </div>
              </button>

              <p className="text-sm text-amber-100/70">
                Valid for {phase.hours} hours from first activation.
              </p>

              <div className="flex w-full flex-col gap-2 sm:flex-row">
                <Button
                  onClick={() => copyKey(phase.key)}
                  variant="outline"
                  className="flex-1 border-amber-500/30 text-amber-100 hover:bg-amber-500/10"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Key
                </Button>
                <Button
                  onClick={() => window.location.assign(startGate())}
                  variant="outline"
                  className="flex-1 border-amber-500/30 text-amber-100 hover:bg-amber-500/10"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Get Another
                </Button>
                <Button
                  onClick={() => window.open("https://dynamonsworld.com", "_blank")}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open App
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-amber-100/40">
          One key per device. Sharing keys may result in a ban.
        </p>
      </div>
    </PageShell>
  );
}
