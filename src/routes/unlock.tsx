import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Lock,
  Timer,
  ShieldCheck,
  Fingerprint,
  Cpu,
  Unlock,
  Loader2,
  Check,
  X,
  Download,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { Cipher } from "@/lib/cipher";
import { getFingerprint } from "@/lib/fingerprint";

type UnlockSearch = { v?: string };

export const Route = createFileRoute("/unlock")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): UnlockSearch => ({
    v: typeof s.v === "string" ? s.v : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Opening the Vault — Dynamon Universe" },
      { name: "description", content: "Hold on while we unlock your download link." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: UnlockPage,
});

type StageStatus = "pending" | "running" | "done" | "error";
type Stage = {
  id: number;
  title: string;
  Icon: React.ComponentType<{ className?: string }>;
  status: StageStatus;
  message?: string;
};

const INITIAL_STAGES: Stage[] = [
  { id: 0, title: "Opening a private connection", Icon: Lock, status: "pending" },
  { id: 1, title: "Reading your download settings", Icon: Timer, status: "pending" },
  { id: 2, title: "Checking your pass", Icon: ShieldCheck, status: "pending" },
  { id: 3, title: "Confirming it's the same device", Icon: Fingerprint, status: "pending" },
  { id: 4, title: "Confirming the wait time", Icon: Cpu, status: "pending" },
  { id: 5, title: "Unsealing your download", Icon: Unlock, status: "pending" },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Short, silent-if-unsupported haptic pulse — iOS Safari has no Vibration
 * API at all, and that's fine; this just becomes a no-op there. */
function buzz(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch { /* unsupported or blocked — ignore */ }
}

function mapRedeemError(code?: string): string {
  switch (code) {
    case "not_found": return "We couldn't find your download pass. Please start the download again.";
    case "already_used": return "This download link has already been used. Each link works only once — please start again.";
    case "fingerprint_mismatch": return "This link was started on a different phone. Please finish the download on the same device you started it on.";
    case "version_mismatch": return "Something changed while you were waiting. Please start the download again.";
    case "expired": return "This link took too long and has expired. Please start the download again.";
    case "too_fast": return "That was a bit too quick. Please go back and complete every step.";
    case "no_link": return "No download link is attached to this page. Please start the download again.";
    case "invalid_token": return "This download link isn't valid. Please start again from the mod page.";
    case "invalid_fingerprint": return "We couldn't recognise your device. Please start the download again.";
    default: return "Something went wrong. Please start the download again.";
  }
}

/** Slow-drifting embers instead of the old Matrix-code rain — same idea
 * (ambient motion behind the card) but reads as "royal/mystical" rather
 * than "hacker terminal", matching the rest of the site. */
function EmberField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let w = (c.width = window.innerWidth);
    let h = (c.height = window.innerHeight);

    type Ember = { x: number; y: number; r: number; vy: number; vx: number; hue: "gold" | "violet"; a: number };
    const count = Math.min(70, Math.floor((w * h) / 18000));
    const embers: Ember[] = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 0.6 + Math.random() * 1.8,
      vy: -(0.15 + Math.random() * 0.35),
      vx: (Math.random() - 0.5) * 0.15,
      hue: Math.random() > 0.65 ? "gold" : "violet",
      a: 0.25 + Math.random() * 0.45,
    }));

    const onResize = () => { w = c.width = window.innerWidth; h = c.height = window.innerHeight; };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const e of embers) {
        e.y += e.vy;
        e.x += e.vx;
        if (e.y < -10) { e.y = h + 10; e.x = Math.random() * w; }
        const color = e.hue === "gold" ? `rgba(224,180,90,${e.a})` : `rgba(168,110,230,${e.a})`;
        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = color;
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10 opacity-70" />;
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 88;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="unlockRingGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--gold)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#unlockRingGradient)"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 10px oklch(0.54 0.22 296 / 55%))", transition: "stroke-dashoffset 450ms cubic-bezier(0.4,0,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-display text-base font-bold" style={{ color: "var(--gold)" }}>
        {Math.round(pct)}%
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: StageStatus }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      {status === "running" && (
        <motion.span key="running" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }}>
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--gold)" }} />
        </motion.span>
      )}
      {status === "done" && (
        <motion.span key="done" initial={{ opacity: 0, scale: 0.4, rotate: -30 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}>
          <Check className="h-4 w-4" style={{ color: "#4ade80" }} />
        </motion.span>
      )}
      {status === "error" && (
        <motion.span key="error" initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }}>
          <X className="h-4 w-4" style={{ color: "#f87171" }} />
        </motion.span>
      )}
      {status === "pending" && (
        <motion.span key="pending" className="h-2 w-2 rounded-full" style={{ background: "var(--border)" }} />
      )}
    </AnimatePresence>
  );
}

function UnlockPage() {
  // Router-parsed search (goes through TanStack Router's own JSON-based
  // codec, matching how the value was written on navigate()). Reading this
  // instead of the raw URLSearchParams avoids a mismatch: navigate({search})
  // JSON-encodes values, so the raw query string literally contains quote
  // characters around the slug — comparing that against the plain slug
  // stored server-side always failed with "version_mismatch".
  const { v: modVersionFromUrl } = useSearch({ from: "/unlock" });
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [done, setDone] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const ran = useRef(false);

  const completed = stages.filter((s) => s.status === "done").length;
  const pct = (completed / stages.length) * 100;

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStage = (id: number, patch: Partial<Stage>) =>
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  async function runStage<T>(id: number, fn: () => Promise<T>): Promise<T> {
    setStage(id, { status: "running" });
    await sleep(420 + Math.random() * 180);
    try {
      const r = await fn();
      setStage(id, { status: "done" });
      buzz(12);
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStage(id, { status: "error", message: msg });
      buzz([30, 40, 30]);
      throw e;
    }
  }

  async function run() {
    try {
      // 0. Initialize — read + decode the local session token (obfuscated in storage).
      const token = await runStage(0, async () => {
        const raw = typeof window !== "undefined" ? localStorage.getItem("dg_token") : null;
        if (!raw) throw new Error("We could not find your download pass. Please start the download again from the mod page.");
        let decoded = "";
        try {
          decoded = Cipher.decrypt(raw);
        } catch {
          decoded = raw; // tolerate plain-UUID tokens written by newer clients
        }
        if (!decoded) throw new Error("Failed to read session token.");
        if (!UUID_RE.test(decoded)) throw new Error("This download link looks broken. Please start again from the mod page.");
        return decoded;
      });

      // 1. Compute the device fingerprint that the server will verify against.
      const fingerprint = await runStage(1, async () => {
        const fp = await getFingerprint();
        if (!fp) throw new Error("We could not recognise your device. Try turning off private/incognito mode, then start again.");
        return fp;
      });

      // 2-4. Server-side verification. A single SECURITY DEFINER RPC checks the
      // session, fingerprint, timing window and version, then ATOMICALLY burns
      // the token — none of this logic or the link is exposed to the browser.
      const version = modVersionFromUrl;
      let redeemed: { ok: boolean; error?: string; link?: string; encrypted?: boolean } | null = null;

      await runStage(2, async () => {
        // redeem_secure_session isn't in the generated types yet; call loosely.
        const { data, error } = await (supabase.rpc as unknown as (
          fn: string,
          args: Record<string, unknown>,
        ) => Promise<{ data: unknown; error: { message: string } | null }>)(
          "redeem_secure_session",
          { p_token: token, p_fingerprint: fingerprint, p_version: version },
        );
        if (error) throw new Error("Secure channel error. Please try again.");
        redeemed = data as typeof redeemed;
        if (!redeemed || !redeemed.ok) {
          throw new Error(mapRedeemError(redeemed?.error));
        }
      });

      // 3-4 are validated inside the RPC; surface them as completed UX steps.
      await runStage(3, async () => { /* fingerprint verified server-side */ });
      await runStage(4, async () => { /* timing verified server-side */ });

      // 5. Resolve the final link. New sessions return plaintext; legacy sessions
      // return an encrypted blob we decrypt locally for backward compatibility.
      const url = await runStage(5, async () => {
        const r = redeemed!;
        let out = r.link || "";
        if (r.encrypted && out) {
          try {
            out = Cipher.decrypt(out);
          } catch (e) {
            throw new Error(`Cipher error: ${e instanceof Error ? e.message : "unknown"}`);
          }
        }
        if (!out) throw new Error("No download link available.");
        return out;
      });

      try {
        localStorage.removeItem("dg_token");
      } catch {
        /* ignore */
      }

      setDownloadUrl(url);
      setDone(true);
      buzz([15, 60, 15, 60, 40]);

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#a86ee6", "#e0b45a", "#c9a4ee", "#ffffff"],
        });
      }

      setTimeout(() => {
        window.location.href = url;
      }, 2000);
    } catch (e) {
      setFatalError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden" style={{ background: "var(--background)", color: "var(--foreground)" }}>
      <EmberField />
      {/* royal aurora glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full opacity-25 blur-[120px]" style={{ background: "var(--primary)" }} />
        <div className="absolute top-1/3 -right-32 h-[460px] w-[460px] rounded-full opacity-20 blur-[140px]" style={{ background: "var(--gold)" }} />
        <div className="absolute -bottom-32 left-1/4 h-[420px] w-[420px] rounded-full opacity-15 blur-[150px]" style={{ background: "var(--primary)" }} />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full rounded-2xl border p-6 shadow-elev backdrop-blur-xl sm:p-8"
          style={{ borderColor: "var(--border)", background: "color-mix(in oklch, var(--card) 88%, transparent)" }}
        >
          {/* Top progress bar */}
          <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, var(--primary), var(--gold))", boxShadow: "0 0 18px oklch(0.54 0.22 296 / 50%)" }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>

          <div className="mb-6 flex items-center gap-4">
            <ProgressRing pct={pct} />
            <div className="min-w-0">
              <h1 className="font-display text-2xl font-bold tracking-tight sm:text-[1.6rem]">
                Opening the vault
              </h1>
              <p className="mt-1 text-sm" style={{ color: "var(--muted-foreground)" }}>
                A few quick checks, then your download is yours.
              </p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {stages.map((s, i) => {
              const I = s.Icon;
              const active = s.status === "running";
              return (
                <motion.li
                  key={s.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-start gap-3 rounded-xl border px-3.5 py-3 transition-colors"
                  style={{
                    borderColor: active ? "color-mix(in oklch, var(--primary) 45%, var(--border))" : "var(--border)",
                    background: active ? "color-mix(in oklch, var(--primary) 8%, transparent)" : "color-mix(in oklch, var(--background) 55%, transparent)",
                  }}
                >
                  <span
                    className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg ring-1"
                    style={{
                      background: "color-mix(in oklch, var(--primary) 14%, transparent)",
                      color: "var(--gold)",
                      boxShadow: active ? "0 0 0 3px oklch(0.54 0.22 296 / 20%)" : "none",
                    }}
                  >
                    <I className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium" style={{ color: "var(--foreground)" }}>{s.title}</span>
                      <StatusIcon status={s.status} />
                    </div>
                    {s.status === "error" && s.message && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 text-xs" style={{ color: "#f87171" }}>
                        {s.message}
                      </motion.p>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <AnimatePresence>
            {done && downloadUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="mt-6 rounded-xl border p-4 text-center"
                style={{ borderColor: "color-mix(in oklch, var(--gold) 40%, transparent)", background: "color-mix(in oklch, var(--gold) 8%, transparent)" }}
              >
                <p className="flex items-center justify-center gap-1.5 font-display text-base font-semibold" style={{ color: "var(--gold)" }}>
                  <Sparkles className="h-4 w-4" /> Unsealed — your download is ready
                </p>
                <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>Taking you there in a moment…</p>
                <a
                  href={downloadUrl}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.02]"
                  style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
                >
                  <Download className="h-4 w-4" /> Download now
                </a>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {fatalError && (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-6 rounded-xl border p-4 text-center"
                style={{ borderColor: "color-mix(in oklch, #f87171 35%, transparent)", background: "color-mix(in oklch, #f87171 8%, transparent)" }}
              >
                <p className="text-sm font-semibold" style={{ color: "#f87171" }}>The vault didn&apos;t open</p>
                <p className="mt-1 text-xs" style={{ color: "var(--muted-foreground)" }}>{fatalError}</p>
                <Link
                  to="/"
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border px-4 py-2 text-xs font-medium transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--foreground)" }}
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Return home
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <p className="mt-6 text-center text-[11px] tracking-wide" style={{ color: "var(--muted-foreground)", opacity: 0.7 }}>
          Private link • Works once • Only on this device
        </p>
      </main>
    </div>
  );
}
