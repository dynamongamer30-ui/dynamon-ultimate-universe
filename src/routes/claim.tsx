import { useState } from "react";
import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { motion } from "motion/react";
import { Feather, Gift, KeyRound, Copy, Check, Loader2, PartyPopper, Trophy } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { playClick } from "@/lib/sound";

type ClaimKind = "trainer_level" | "phoenix_pass" | "daily_key" | "granted_key" | "";

type ClaimSearch = { kind: ClaimKind; ref: string; label: string };

export const Route = createFileRoute("/claim")({
  ssr: false,
  head: () => ({ meta: [{ title: "Claim your reward — Dynamon Universe" }] }),
  validateSearch: (s: Record<string, unknown>): ClaimSearch => ({
    kind: (["trainer_level", "phoenix_pass", "daily_key", "granted_key"].includes(s.kind as string)
      ? (s.kind as ClaimKind) : ""),
    ref: typeof s.ref === "string" ? s.ref : "",
    label: typeof s.label === "string" ? s.label : "",
  }),
  component: ClaimPage,
});

// These RPCs aren't in the generated Supabase types yet; call loosely.
// IMPORTANT: .bind(supabase) — a plain variable extraction loses `this`.
const looseRpc = supabase.rpc.bind(supabase) as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

type Result =
  | { kind: "key"; key: string; title: string }
  | { kind: "pass"; expiresAt: string; title: string }
  | { kind: "error"; message: string };

function ClaimPage() {
  const { user } = useAuth();
  const { kind, ref, label } = useSearch({ from: "/claim" }) as ClaimSearch;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(
    kind === "granted_key" && ref ? { kind: "key", key: ref, title: label || "Your key" } : null,
  );
  const [copied, setCopied] = useState(false);

  const copy = (text: string) => {
    navigator.clipboard?.writeText(text)
      .then(() => { setCopied(true); toast.success("Copied"); setTimeout(() => setCopied(false), 1800); })
      .catch(() => {});
  };

  const claim = async () => {
    setBusy(true);
    try {
      if (kind === "trainer_level") {
        const { data, error } = await looseRpc("claim_trainer_level");
        if (error) throw new Error("claim_failed");
        const res = data as { ok?: boolean; error?: string; level?: number; reward_kind?: string; key?: string } | null;
        if (!res?.ok) {
          const map: Record<string, string> = {
            no_next_level: "You've already claimed every level — nothing left to claim!",
            not_enough_days: "You're not there yet — keep your login streak going.",
          };
          setResult({ kind: "error", message: map[res?.error || ""] || "Couldn't claim this level. Please try again." });
          return;
        }
        playClick();
        if (res.reward_kind === "phoenix_pass") {
          setResult({ kind: "pass", expiresAt: "", title: `Trainer Level ${res.level}: Phoenix Pass` });
        } else {
          setResult({ kind: "key", key: res.key || "", title: `Trainer Level ${res.level}: ${res.reward_kind === "trainer_vip_key" ? "VIP Key" : "DG Key"}` });
        }
        return;
      }

      if (kind === "phoenix_pass") {
        const { data, error } = await looseRpc("claim_phoenix_pass", { p_id: ref });
        if (error) throw new Error("claim_failed");
        const res = data as { ok?: boolean; error?: string; expires_at?: string } | null;
        if (!res?.ok) {
          setResult({ kind: "error", message: res?.error === "invalid_or_expired"
            ? "This pass can't be claimed — the 24-hour window may have passed."
            : "Couldn't claim your pass. Please try again." });
          return;
        }
        playClick();
        setResult({ kind: "pass", expiresAt: res.expires_at || "", title: "Phoenix Pass" });
        return;
      }

      if (kind === "daily_key") {
        const { data, error } = await looseRpc("claim_daily_key", { p_id: ref });
        if (error) throw new Error("claim_failed");
        const res = data as { ok?: boolean; error?: string; key?: string } | null;
        if (!res?.ok || !res.key) {
          setResult({ kind: "error", message: "This key isn't available to claim — it may have expired." });
          return;
        }
        playClick();
        setResult({ kind: "key", key: res.key, title: "Daily Key" });
        return;
      }
    } catch {
      setResult({ kind: "error", message: "Something went wrong. Please try again." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell>
      <header className="edge-light rounded-2xl glass p-8 sm:p-12 text-center">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
          <Gift className="h-3.5 w-3.5" /> Claim
        </p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
          {result ? "Reward claimed" : "Claim your reward"}
        </h1>
      </header>

      <div className="mx-auto mt-8 max-w-md">
        {!user ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-muted-foreground">
            <Link to="/auth" className="font-semibold text-primary hover:underline">Sign in</Link> to claim this.
          </div>
        ) : !kind ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/30 p-8 text-center text-muted-foreground">
            Nothing to claim here — open this page from a reward notification.
          </div>
        ) : result?.kind === "key" ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center">
            <PartyPopper className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-3 font-display text-lg font-bold">{result.title}</p>
            <div className="mt-4 flex items-center gap-2">
              <code className="flex-1 select-all rounded-lg border border-border bg-background/60 px-3 py-3 text-center font-mono text-sm font-bold tracking-wider">
                {result.key}
              </code>
              <button onClick={() => copy(result.key)}
                className="press grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground">
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Paste this key into the app to activate it.</p>
          </motion.div>
        ) : result?.kind === "pass" ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-amber-400/40 bg-amber-500/5 p-6 text-center">
            <Feather className="mx-auto h-8 w-8 text-amber-300" />
            <p className="mt-3 font-display text-lg font-bold">{result.title} claimed 🔥</p>
            <p className="mt-2 text-sm text-muted-foreground">Good for 30 days — use it on any mod's download page.</p>
            <Link to="/mods" onMouseDown={playClick}
              className="press mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-amber-950 transition hover:brightness-110">
              Pick a mod
            </Link>
          </motion.div>
        ) : result?.kind === "error" ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 text-center">
            <p className="text-sm text-destructive">{result.message}</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-card/40 p-6 text-center">
            {kind === "trainer_level" && <Trophy className="mx-auto h-8 w-8 text-primary" />}
            {kind === "phoenix_pass" && <Feather className="mx-auto h-8 w-8 text-amber-300" />}
            {kind === "daily_key" && <KeyRound className="mx-auto h-8 w-8 text-primary" />}
            <p className="mt-3 text-sm text-muted-foreground">
              {kind === "trainer_level" ? "Claim your next Trainer Rank reward." : "Tap below to collect your reward."}
            </p>
            <button onClick={claim} disabled={busy}
              className="press mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60">
              {busy ? (<><Loader2 className="h-4 w-4 animate-spin" /> Claiming…</>) : "Claim now"}
            </button>
          </div>
        )}
      </div>
    </PageShell>
  );
}
