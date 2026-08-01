import { useEffect, useState } from "react";
import { Feather, Gift, KeyRound, Copy, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { playClick } from "@/lib/sound";
import type { AppNotification } from "@/lib/notifications";

type DailyKey = { id: string; key: string; claimed: boolean; expires_at: string };
type UnclaimedPass = { id: string; claim_deadline: string };

// These reward RPCs aren't in the generated Supabase types yet; call loosely.
// IMPORTANT: must .bind(supabase) — assigning supabase.rpc to a plain variable
// loses its `this` binding and throws "Cannot read properties of undefined
// (reading 'rest')" the moment it's called (same gotcha documented for
// .from() in src/lib/notifications.ts).
const looseRpc = supabase.rpc.bind(supabase) as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

/**
 * Renders nothing unless this specific notification is a reward the
 * signed-in user actually won — checked against `reward_kind`/`reward_ref`
 * on the notification row itself (not the title text, which could
 * theoretically collide across different wins). Claiming happens right
 * here, inline, since /rewards no longer carries any claim UI — this is
 * the only place a claim button exists anywhere on the site.
 */
export function NotificationClaim({ notification }: { notification: AppNotification }) {
  const { user } = useAuth();
  const [dailyKey, setDailyKey] = useState<DailyKey | null>(null);
  const [pass, setPass] = useState<UnclaimedPass | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user || !notification.reward_kind) return;
    if (notification.reward_kind === "vip_key") {
      looseRpc("my_daily_key").then(({ data, error }) => {
        if (!error) setDailyKey((data as DailyKey[] | null)?.[0] ?? null);
      });
    } else if (notification.reward_kind === "phoenix_pass") {
      looseRpc("my_unclaimed_phoenix_pass").then(({ data, error }) => {
        if (!error) setPass((data as UnclaimedPass[] | null)?.[0] ?? null);
      });
    }
  }, [user, notification.reward_kind]);

  if (!notification.reward_kind || !notification.reward_ref) return null;

  const copyKey = (key: string) => {
    navigator.clipboard?.writeText(key)
      .then(() => { setCopied(true); toast.success("Key copied"); setTimeout(() => setCopied(false), 1800); })
      .catch(() => {});
  };

  // Already-claimed VIP/Daily Key tied to this exact notification: show it
  // as a copyable code, no button needed.
  if (
    notification.reward_kind === "vip_key" &&
    dailyKey?.claimed &&
    dailyKey.key === notification.reward_ref
  ) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
        <KeyRound className="h-4 w-4 shrink-0 text-primary" />
        <code className="flex-1 select-all rounded-lg border border-border bg-background/60 px-3 py-2 text-center font-mono text-sm font-bold tracking-wider">
          {dailyKey.key}
        </code>
        <button
          onClick={() => copyKey(dailyKey.key)}
          className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
          aria-label="Copy key"
        >
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    );
  }

  const claimableKey =
    notification.reward_kind === "vip_key" &&
    dailyKey && !dailyKey.claimed && dailyKey.key === notification.reward_ref;

  const claimablePass =
    notification.reward_kind === "phoenix_pass" &&
    pass && pass.id === notification.reward_ref;

  if (!claimableKey && !claimablePass) return null;

  const claim = async () => {
    setBusy(true);
    try {
      if (claimableKey && dailyKey) {
        const { data, error } = await looseRpc("claim_daily_key", { p_id: dailyKey.id });
        if (error) throw new Error("claim_failed");
        const res = data as { ok?: boolean; error?: string; key?: string } | null;
        if (!res || !res.ok || !res.key) {
          const map: Record<string, string> = {
            not_a_winner: "This key isn’t available to claim — it may have expired.",
          };
          toast.error(map[res?.error || ""] || "We couldn’t claim your key. Please try again.");
          return;
        }
        playClick();
        toast.success("Daily Key claimed 🎉");
        setDailyKey({ ...dailyKey, claimed: true, key: res.key });
      } else if (claimablePass && pass) {
        const { data, error } = await looseRpc("claim_phoenix_pass", { p_id: pass.id });
        if (error) throw new Error("claim_failed");
        const res = data as { ok?: boolean; error?: string } | null;
        if (!res || !res.ok) {
          const map: Record<string, string> = {
            invalid_or_expired: "This pass can’t be claimed — the 24-hour window may have passed.",
          };
          toast.error(map[res?.error || ""] || "We couldn’t claim your pass. Please try again.");
          return;
        }
        playClick();
        toast.success("Phoenix Pass claimed 🔥 — good for 30 days");
        setPass(null);
      }
    } catch {
      toast.error("We couldn’t claim this. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const deadline = claimableKey ? dailyKey?.expires_at : claimablePass ? pass?.claim_deadline : null;

  return (
    <div
      className="mt-3 flex flex-col items-start gap-3 rounded-xl border p-3 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: claimableKey ? "hsl(var(--primary) / 0.4)" : "rgba(251,191,36,0.4)" }}
    >
      {deadline && (
        <p className="text-xs text-muted-foreground">
          Claim before {new Date(deadline).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
          {claimablePass ? " · good for 30 days once claimed." : "."}
        </p>
      )}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); claim(); }}
        disabled={busy}
        className={`press inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition hover:brightness-110 disabled:opacity-60 sm:w-auto ${
          claimableKey ? "bg-primary text-primary-foreground" : "bg-amber-500 text-amber-950"
        }`}
      >
        {busy ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Claiming…</>
        ) : claimableKey ? (
          <><Gift className="h-3.5 w-3.5" /> Claim your key</>
        ) : (
          <><Feather className="h-3.5 w-3.5" /> Claim your pass</>
        )}
      </button>
    </div>
  );
}
