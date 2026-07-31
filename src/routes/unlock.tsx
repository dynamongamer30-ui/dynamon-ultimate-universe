import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Lock,
  Timer,
  ShieldCheck,
  Fingerprint,
  Cpu,
  Unlock,
  Loader2,
  CheckCircle2,
  XCircle,
  Download,
  ArrowLeft,
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
      { title: "Unlocking Your Download — Dynamon Universe" },
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
  { id: 0, title: "Starting secure connection", Icon: Lock, status: "pending" },
  { id: 1, title: "Loading download settings", Icon: Timer, status: "pending" },
  { id: 2, title: "Checking your download pass", Icon: ShieldCheck, status: "pending" },
  { id: 3, title: "Making sure it's the same device", Icon: Fingerprint, status: "pending" },
  { id: 4, title: "Confirming the wait time", Icon: Cpu, status: "pending" },
  { id: 5, title: "Unlocking your download link", Icon: Unlock, status: "pending" },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

function MatrixRain() {
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
    const chars = "アァカサタナハマヤラワ0123456789ABCDEF$#@*+=<>".split("");
    const fontSize = 14;
    let columns = Math.floor(w / fontSize);
    let drops = Array(columns).fill(1);

    const onResize = () => {
      w = c.width = window.innerWidth;
      h = c.height = window.innerHeight;
      columns = Math.floor(w / fontSize);
      drops = Array(columns).fill(1);
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "rgba(255,69,0,0.35)";
      ctx.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > h && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 -z-10 opacity-60" />;
}

function ProgressRing({ pct }: { pct: number }) {
  const size = 84;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#FF4500"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: "drop-shadow(0 0 8px rgba(255,69,0,0.7))", transition: "stroke-dashoffset 400ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center font-mono text-sm font-bold text-orange-400">
        {Math.round(pct)}%
      </div>
    </div>
  );
}

function UnlockPage() {
  // Router-parsed search (goes through TanStack Router's own JSON-based
  // codec, matching how the value was written on navigate()). Reading this
  // instead of the raw URLSearchParams avoids a mismatch: navigate({search})
  // JSON-encodes values, so the raw query string literally contains quote
  // characters around the slug — comparing that against the plain slug
  // stored server-side always failed with "version_mismatch".
  const { v: modSlugFromUrl } = useSearch({ from: "/unlock" });
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
      return r;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setStage(id, { status: "error", message: msg });
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
      const version = modSlugFromUrl;
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

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!reduced) {
        confetti({
          particleCount: 140,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#FF4500", "#F59E0B", "#FBBF24", "#FFFFFF"],
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
    <div className="relative min-h-screen overflow-hidden bg-[#080808] text-white" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <MatrixRain />
      {/* aurora blobs */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-orange-600/20 blur-[120px]" />
        <div className="absolute top-1/3 -right-32 h-[460px] w-[460px] rounded-full bg-amber-500/15 blur-[140px]" />
        <div className="absolute -bottom-32 left-1/4 h-[420px] w-[420px] rounded-full bg-orange-500/10 blur-[150px]" />
      </div>

      <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-12">
        <div
          className="w-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_-30px_rgba(255,69,0,0.45)] backdrop-blur-xl sm:p-8"
        >
          {/* Top progress bar */}
          <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500"
              style={{ width: `${pct}%`, boxShadow: "0 0 18px rgba(255,69,0,0.55)" }}
            />
          </div>

          <div className="mb-6 flex items-center gap-4">
            <ProgressRing pct={pct} />
            <div className="min-w-0">
              <h1
                className="text-2xl font-bold tracking-tight text-white sm:text-[1.6rem]"
                style={{ fontFamily: "'Space Grotesk', system-ui, sans-serif" }}
              >
                Unlocking your download
              </h1>
              <p className="mt-1 text-sm text-white/60">Verifying your download session…</p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {stages.map((s) => {
              const I = s.Icon;
              return (
                <li
                  key={s.id}
                  className="flex items-start gap-3 rounded-xl border border-white/5 bg-black/30 px-3.5 py-3"
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20">
                    <I className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-white/90">{s.title}</span>
                      {s.status === "running" && <Loader2 className="h-4 w-4 animate-spin text-orange-400" />}
                      {s.status === "done" && <CheckCircle2 className="h-4 w-4" style={{ color: "#22C55E" }} />}
                      {s.status === "error" && <XCircle className="h-4 w-4" style={{ color: "#EF4444" }} />}
                      {s.status === "pending" && <span className="h-2 w-2 rounded-full bg-white/20" />}
                    </div>
                    {s.status === "error" && s.message && (
                      <p className="mt-1 text-xs text-red-400">{s.message}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          {done && downloadUrl && (
            <div className="mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
              <p className="text-base font-semibold text-emerald-400">All done — your download is ready!</p>
              <p className="mt-1 text-xs text-white/60">Taking you to the download in 2 seconds…</p>
              <a
                href={downloadUrl}
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_10px_30px_-10px_rgba(255,69,0,0.8)] transition hover:brightness-110"
              >
                <Download className="h-4 w-4" /> Download Now
              </a>
            </div>
          )}

          {fatalError && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center">
              <p className="text-sm font-semibold text-red-400">We could not unlock this download</p>
              <p className="mt-1 text-xs text-white/60">{fatalError}</p>
              <Link
                to="/"
                className="mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Return Home
              </Link>
            </div>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-white/30">
          Private link • Works once • Only on this device
        </p>
      </main>
    </div>
  );
}
