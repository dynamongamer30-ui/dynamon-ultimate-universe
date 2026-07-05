```tsx
/**
 * Admin Extras — feature-parity panel (Ember Vault theme).
 * Access tokens · Rate limits · Feature locks · Key tools.
 * Owner-gated, Supabase-backed. Reachable at /admin-extras.
 *
 * PATH: src/routes/admin-extras.tsx
 */
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { KeyRound, Ticket, ShieldAlert, Lock, RefreshCw, Copy, Trash2, Loader2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import {
  generateAccessTokens, listAccessTokensFull, deleteAccessToken, type AccessTokenRow,
  listRateLimited, unblockIP, type RateLimitRow,
  getFeatureLocks, setFeatureLock,
  rotateKey, reduceKey, unbindKeyDevice,
} from "@/lib/dgAdminExtras";

export const Route = createFileRoute("/admin-extras")({ component: AdminExtras });

const card = "rounded-2xl border border-border bg-card/60 backdrop-blur p-5 space-y-4";
const h = "flex items-center gap-2 text-lg font-semibold text-primary";
const input = "w-full rounded-lg bg-background/70 border border-border px-3 py-2 text-sm outline-none focus:border-primary";
const btn = "inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50";
const btnGhost = "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary";

// Adjust to match the features you actually gate in the app/worker config.
const FEATURES = ["generator", "mods", "unlock", "downloads", "app"];

function AdminExtras() {
  return (
    <PageShell>
      <OwnerGate>
        <div className="mx-auto max-w-4xl space-y-6 py-6">
          <h1 className="text-2xl font-bold text-primary">Admin Extras</h1>
          <TokensPanel />
          <RateLimitPanel />
          <LocksPanel />
          <KeyToolsPanel />
        </div>
      </OwnerGate>
    </PageShell>
  );
}

/* ---------- #1 Access tokens ---------- */
function TokensPanel() {
  const [qty, setQty] = useState(5);
  const [prefix, setPrefix] = useState("ref");
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<AccessTokenRow[]>([]);
  const load = async () => { try { setRows(await listAccessTokensFull()); } catch (e) { toast.error(String(e)); } };
  useEffect(() => { load(); }, []);
  const gen = async () => {
    setBusy(true);
    try {
      const made = await generateAccessTokens(qty, prefix);
      await navigator.clipboard.writeText(made.map((m) => m.url).join("\n")).catch(() => {});
      toast.success(`Generated ${made.length} tokens — links copied`);
      await load();
    } catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  const del = async (t: string) => { try { await deleteAccessToken(t); toast.success("Deleted"); await load(); } catch (e) { toast.error(String(e)); } };
  return (
    <div className={card}>
      <div className={h}><Ticket className="h-5 w-5" /> Access Tokens</div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-sm">Qty<input className={input} type="number" min={1} max={500} value={qty} onChange={(e) => setQty(+e.target.value)} /></label>
        <label className="text-sm">Prefix<input className={input} value={prefix} onChange={(e) => setPrefix(e.target.value)} /></label>
        <button className={btn} disabled={busy} onClick={gen}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />} Generate</button>
      </div>
      <div className="max-h-64 overflow-auto text-sm">
        {rows.length === 0 ? <p className="text-muted-foreground">No tokens.</p> : rows.map((r) => (
          <div key={r.token} className="flex items-center justify-between border-b border-border/50 py-1.5">
            <span className="truncate">{r.token} {r.used && <em className="text-muted-foreground">(used)</em>}</span>
            <span className="flex gap-2">
              <button className={btnGhost} onClick={() => { navigator.clipboard.writeText(window.location.origin + "/generator.html?ref=" + r.token); toast.success("Link copied"); }}><Copy className="h-4 w-4" /></button>
              <button className={btnGhost} onClick={() => del(r.token)}><Trash2 className="h-4 w-4" /></button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- #2 Rate limits ---------- */
function RateLimitPanel() {
  const [rows, setRows] = useState<RateLimitRow[]>([]);
  const [ip, setIp] = useState("");
  const load = async () => { try { setRows(await listRateLimited()); } catch (e) { toast.error(String(e)); } };
  useEffect(() => { load(); }, []);
  const unblock = async (val: string) => {
    if (!val.trim()) return;
    try { const n = await unblockIP(val); toast.success(`Cleared ${n} entr${n === 1 ? "y" : "ies"}`); setIp(""); await load(); }
    catch (e) { toast.error(String(e)); }
  };
  return (
    <div className={card}>
      <div className={h}><ShieldAlert className="h-5 w-5" /> Rate Limits <span className="text-sm text-muted-foreground">({rows.length} active)</span></div>
      <div className="flex gap-2">
        <input className={input} placeholder="IP to unblock (e.g. 1.2.3.4)" value={ip} onChange={(e) => setIp(e.target.value)} />
        <button className={btn} onClick={() => unblock(ip)}>Unblock</button>
        <button className={btnGhost} onClick={load}><RefreshCw className="h-4 w-4" /></button>
      </div>
      <div className="max-h-64 overflow-auto text-sm">
        {rows.length === 0 ? <p className="text-muted-foreground">Nothing rate-limited.</p> : rows.map((r) => (
          <div key={r.id} className="flex items-center justify-between border-b border-border/50 py-1.5">
            <span className="truncate">{r.ip} <em className="text-muted-foreground">· {r.count} hits · {r.id}</em></span>
            <button className={btnGhost} onClick={() => unblock(r.id)}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- #3 Feature locks ---------- */
function LocksPanel() {
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const load = async () => { try { setLocks(await getFeatureLocks()); } catch (e) { toast.error(String(e)); } };
  useEffect(() => { load(); }, []);
  const toggle = async (name: string) => {
    const next = !locks[name];
    try { await setFeatureLock(name, next); setLocks((p) => ({ ...p, [name]: next })); toast.success(`${name} ${next ? "locked" : "unlocked"}`); }
    catch (e) { toast.error(String(e)); }
  };
  return (
    <div className={card}>
      <div className={h}><Lock className="h-5 w-5" /> Feature Locks</div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {FEATURES.map((f) => (
          <button key={f} className={locks[f] ? btn : btnGhost} onClick={() => toggle(f)}>
            <Lock className="h-4 w-4" /> {f}{locks[f] ? " (locked)" : ""}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------- #7 Key tools ---------- */
function KeyToolsPanel() {
  const [key, setKey] = useState("");
  const [hours, setHours] = useState(24);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    if (!key.trim()) { toast.error("Enter a key"); return; }
    setBusy(true);
    try { const r = await fn(); toast.success(typeof r === "string" ? `${ok}: ${r}` : ok); }
    catch (e) { toast.error(String(e)); } finally { setBusy(false); }
  };
  return (
    <div className={card}>
      <div className={h}><KeyRound className="h-5 w-5" /> Key Tools</div>
      <input className={input} placeholder="Key (e.g. DG-ABC123)" value={key} onChange={(e) => setKey(e.target.value)} />
      <div className="flex flex-wrap items-end gap-3">
        <button className={btn} disabled={busy} onClick={() => run(() => rotateKey(key.trim()).then((nk) => { setKey(nk); return nk; }), "Rotated → new key")}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Rotate
        </button>
        <button className={btnGhost} disabled={busy} onClick={() => run(() => unbindKeyDevice(key.trim()), "Device unbound")}>Unbind device</button>
        <label className="text-sm">Reduce hours<input className={input} type="number" min={1} value={hours} onChange={(e) => setHours(+e.target.value)} /></label>
        <button className={btnGhost} disabled={busy} onClick={() => run(() => reduceKey(key.trim(), hours), `Reduced by ${hours}h`)}>Reduce</button>
      </div>
    </div>
  );
}
```
