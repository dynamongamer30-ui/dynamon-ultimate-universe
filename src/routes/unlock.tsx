import { createFileRoute, Link } from "@tanstack/react-router";
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
import { get, ref, update, remove } from "firebase/database";
import { db } from "@/lib/firebase";
import { Cipher } from "@/lib/cipher";
import { getFingerprint } from "@/lib/fingerprint";

export const Route = createFileRoute("/unlock")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Secure Verification — Dynamon Universe" },
      { name: "description", content: "Verifying your secure download session." },
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
  { id: 0, title: "Initialize Secure Channel", Icon: Lock, status: "pending" },
  { id: 1, title: "Fetch Security Config", Icon: Timer, status: "pending" },
  { id: 2, title: "Verify Session Token", Icon: ShieldCheck, status: "pending" },
  { id: 3, title: "Check Device Fingerprint", Icon: Fingerprint, status: "pending" },
  { id: 4, title: "Validate Timestamp", Icon: Cpu, status: "pending" },
  { id: 5, title: "Decrypt Payload", Icon: Unlock, status: "pending" },
];

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
      // 0. Initialize
      const token = await runStage(0, async () => {
        const raw = typeof window !== "undefined" ? localStorage.getItem("dg_token") : null;
        if (!raw) throw new Error("No session token found.");
        let decoded = "";
        try {
          decoded = Cipher.decrypt(raw);
        } catch {
          throw new Error("Failed to read session token.");
        }
        if (!decoded) throw new Error("Failed to read session token.");
        if (!UUID_RE.test(decoded)) throw new Error("Invalid session token format.");
        return decoded;
      });

      // 1. Config
      const cfg = await runStage(1, async () => {
        const snap = await get(ref(db, "Config/Security"));
        const v = (snap.val() || {}) as { timer?: number; minTimer?: number };
        return {
          timerSec: Number(v.timer ?? 900),
          minTimerSec: Number(v.minTimer ?? 45),
        };
      });

      // 2. Session
      const session = await runStage(2, async () => {
        const snap = await get(ref(db, `SecureSessions/${token}`));
        const s = snap.val() as
          | { megaLink: string; timestamp: number; used: boolean; fingerprint: string; modVersion?: string }
          | null;
        if (!s) throw new Error("Session token not found.");
        if (s.used === true) throw new Error("Token already used.");
        const v = new URLSearchParams(window.location.search).get("v");
        if (v && s.modVersion && s.modVersion !== v) throw new Error("Session version mismatch.");
        return s;
      });

      // 3. Fingerprint
      await runStage(3, async () => {
        const fp = await getFingerprint();
        if (fp !== session.fingerprint) throw new Error("Device fingerprint mismatch.");
      });

      // 4. Timestamp
      await runStage(4, async () => {
        let offset = 0;
        try {
          const snap = await get(ref(db, ".info/serverTimeOffset"));
          offset = Number(snap.val() || 0);
        } catch {
          /* ignore */
        }
        const serverNow = Date.now() + offset;
        const elapsed = (serverNow - Number(session.timestamp)) / 1000;
        if (elapsed > cfg.timerSec) throw new Error("Session expired. Please try again.");
        if (elapsed < cfg.minTimerSec) throw new Error("Verification too fast. Please complete all steps.");
      });

      // 5. Decrypt
      const url = await runStage(5, async () => {
        let out = "";
        try {
          out = Cipher.decrypt(session.megaLink);
        } catch (e) {
          throw new Error(`Cipher error: ${e instanceof Error ? e.message : "unknown"}`);
        }
        if (!out) throw new Error("Decryption returned empty.");
        return out;
      });

      // Success: mark used, cleanup
      try {
        await update(ref(db, `SecureSessions/${token}`), { used: true });
      } catch {
        /* non-fatal */
      }
      try {
        localStorage.removeItem("dg_token");
      } catch {
        /* ignore */
      }
      // Best-effort cleanup of stale sessions
      void (async () => {
        try {
          const snap = await get(ref(db, "SecureSessions"));
          const all = (snap.val() || {}) as Record<string, { used?: boolean; timestamp?: number }>;
          const cutoff = Date.now() - 24 * 60 * 60 * 1000;
          await Promise.all(
            Object.entries(all)
              .filter(([, v]) => v?.used === true || Number(v?.timestamp ?? 0) < cutoff)
              .map(([k]) => remove(ref(db, `SecureSessions/${k}`))),
          );
        } catch {
          /* ignore */
        }
      })();

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
                Secure Verification
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
              <p className="text-base font-semibold text-emerald-400">Verification Complete!</p>
              <p className="mt-1 text-xs text-white/60">Redirecting to download in 2 seconds…</p>
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
              <p className="text-sm font-semibold text-red-400">Verification failed</p>
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
          Protected session • Single-use token • Device-bound
        </p>
      </main>
    </div>
  );
}
