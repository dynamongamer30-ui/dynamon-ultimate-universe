import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Check, Feather, KeyRound, Gift, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBody } from "@/components/NotificationBody";
import { supabase } from "@/integrations/supabase/client";
import { playClick } from "@/lib/sound";

// These reward RPCs aren't in the generated Supabase types yet; call loosely.
const looseRpc = supabase.rpc as unknown as (
  fn: string,
  args?: Record<string, unknown>,
) => Promise<{ data: unknown; error: { message: string } | null }>;

type UnclaimedPass = { id: string; claim_deadline: string };
type DailyKeyWin = { id: string; key: string; claimed: boolean; expires_at: string };

const isPhoenixWinTitle = (t: string) => /phoenix pass/i.test(t) && /won/i.test(t);
const isDailyKeyWinTitle = (t: string) => /daily key/i.test(t) && /won/i.test(t);

export const Route = createFileRoute("/notifications")({
  ssr: false,
  head: () => ({ meta: [{ title: "Notifications — Dynamon Universe" }] }),
  component: NotificationsPage,
});

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function NotificationsPage() {
  const { user } = useAuth();
  const { items, readIds, loading, markAllRead, sender } = useNotifications();

  // Snapshot which notifications were unread when the page opened, so they keep
  // their "new" highlight during this visit even after we mark them read.
  const [unreadOnArrival, setUnreadOnArrival] = useState<Set<string>>(new Set());
  const snapshotted = useRef(false);

  // The caller's own still-claimable win, if any — used to decide whether to
  // show a Claim button inline on the matching winning notification. This is
  // the ONLY place a claim button appears anywhere on the site.
  const [unclaimedPass, setUnclaimedPass] = useState<UnclaimedPass | null>(null);
  const [dailyKey, setDailyKey] = useState<DailyKeyWin | null>(null);
  const checkedWins = useRef(false);

  useEffect(() => {
    if (!user || checkedWins.current) return;
    checkedWins.current = true;
    (async () => {
      const [passRes, keyRes] = await Promise.all([
        looseRpc("my_unclaimed_phoenix_pass"),
        looseRpc("my_daily_key"),
      ]);
      if (!passRes.error) {
        const rows = (passRes.data as UnclaimedPass[] | null) || [];
        setUnclaimedPass(rows[0] || null);
      }
      if (!keyRes.error) {
        const rows = (keyRes.data as DailyKeyWin[] | null) || [];
        setDailyKey(rows[0] || null);
      }
    })();
  }, [user]);

  // Auto-mark everything read once the list has loaded — no button needed.
  useEffect(() => {
    if (!user || loading || snapshotted.current) return;
    snapshotted.current = true;
    setUnreadOnArrival(new Set(items.filter((n) => !readIds.has(n.id)).map((n) => n.id)));
    markAllRead();
  }, [user, loading, items, readIds, markAllRead]);

  return (
    <PageShell>
      <header className="edge-light rounded-2xl glass p-8 sm:p-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <Bell className="h-3.5 w-3.5" /> Inbox
            </p>
            <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">Notifications</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Announcements and updates from the Dynamon Universe team.
            </p>
          </div>
        </div>
      </header>

      {!user ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary hover:underline">Sign in</Link> to view your notifications.
        </div>
      ) : loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
          No notifications yet. Check back soon.
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((n) => {
            const unread = unreadOnArrival.has(n.id);
            return (
              <li
                key={n.id}
                className={`rounded-2xl border p-5 transition-colors ${unread ? "border-primary/40 bg-primary/5" : "border-border bg-card/40"}`}
              >
                <div className="flex items-start gap-3">
                  {sender ? (
                    <img
                      src={sender.custom_avatar_url || sender.avatar_url || "/favicon.ico"}
                      alt=""
                      className="mt-0.5 h-9 w-9 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${unread ? "text-primary-foreground" : "bg-card text-muted-foreground"}`}
                      style={unread ? { background: "var(--gradient-primary)" } : undefined}
                      aria-hidden
                    >
                      {unread ? <Bell className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    {sender && (
                      <p className="text-xs font-semibold text-primary">
                        {sender.display_name || "Dynamon Gamer 07"}
                      </p>
                    )}
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-lg font-bold">{n.title}</h2>
                      <span className="shrink-0 text-xs text-muted-foreground">{fmt(n.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      <NotificationBody text={n.body} />
                    </p>

                    {isPhoenixWinTitle(n.title) && unclaimedPass && (
                      <PhoenixClaimInline
                        pass={unclaimedPass}
                        onClaimed={() => setUnclaimedPass(null)}
                      />
                    )}

                    {isDailyKeyWinTitle(n.title) && dailyKey && !dailyKey.claimed && (
                      <DailyKeyClaimInline
                        dailyKey={dailyKey}
                        onClaimed={(key) => setDailyKey({ ...dailyKey, claimed: true, key })}
                      />
                    )}

                    {isDailyKeyWinTitle(n.title) && dailyKey?.claimed && (
                      <DailyKeyClaimedInline dailyKey={dailyKey} />
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}

function PhoenixClaimInline({ pass, onClaimed }: { pass: UnclaimedPass; onClaimed: () => void }) {
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    setBusy(true);
    try {
      const { data, error } = await looseRpc("claim_phoenix_pass", { p_id: pass.id });
      if (error) throw new Error("claim_failed");
      const res = data as { ok?: boolean; error?: string; expires_at?: string } | null;
      if (!res || !res.ok) {
        const map: Record<string, string> = {
          invalid_or_expired: "This pass can’t be claimed — the 24-hour window may have passed.",
        };
        toast.error(map[res?.error || ""] || "We couldn’t claim your pass. Please try again.");
        return;
      }
      playClick();
      toast.success("Phoenix Pass claimed 🔥 — good for 30 days");
      onClaimed();
    } catch {
      toast.error("We couldn’t claim your pass. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col items-start gap-3 rounded-xl border border-amber-400/40 bg-amber-500/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Claim before {new Date(pass.claim_deadline).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} · good for 30 days once claimed.
      </p>
      <button
        onClick={claim} disabled={busy}
        className="press inline-flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-amber-950 transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
      >
        {busy ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Claiming…</>) : (<><Feather className="h-3.5 w-3.5" /> Claim your pass</>)}
      </button>
    </div>
  );
}

function DailyKeyClaimInline({ dailyKey, onClaimed }: { dailyKey: DailyKeyWin; onClaimed: (key: string) => void }) {
  const [busy, setBusy] = useState(false);

  const claim = async () => {
    setBusy(true);
    try {
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
      onClaimed(res.key);
    } catch {
      toast.error("We couldn’t claim your key. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 flex flex-col items-start gap-3 rounded-xl border border-primary/40 bg-primary/5 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs text-muted-foreground">
        Claim before {new Date(dailyKey.expires_at).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}.
      </p>
      <button
        onClick={claim} disabled={busy}
        className="press inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60 sm:w-auto"
      >
        {busy ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Claiming…</>) : (<><Gift className="h-3.5 w-3.5" /> Claim your key</>)}
      </button>
    </div>
  );
}

function DailyKeyClaimedInline({ dailyKey }: { dailyKey: DailyKeyWin }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(dailyKey.key)
      .then(() => { setCopied(true); toast.success("Key copied"); setTimeout(() => setCopied(false), 1800); })
      .catch(() => {});
  };
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/40 bg-primary/5 p-3">
      <KeyRound className="h-4 w-4 shrink-0 text-primary" />
      <code className="flex-1 select-all rounded-lg border border-border bg-background/60 px-3 py-2 text-center font-mono text-sm font-bold tracking-wider">
        {dailyKey.key}
      </code>
      <button
        onClick={copy}
        className="press grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
        aria-label="Copy key"
      >
        {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
