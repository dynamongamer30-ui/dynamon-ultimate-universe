import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  KeyRound, Loader2, Sparkles, Trash2, Copy, Plus, RefreshCw, Search, Clock,
  Ban, AlertTriangle, X,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listKeys, revokeKey, unrevokeKey, deleteKey, extendKey,
  getConfig, setMaintenance, setRateLimitEnabled, setKeyDurationHours, setIPWhitelist,
  listGenerationLogs, createManualKey,
  nowSeconds,
  type ValidKey, type DgConfig, type GenerationLog,
} from "@/lib/dgData";

export const Route = createFileRoute("/admin-keys")({
  ssr: false,
  head: () => ({ meta: [{ title: "Key System — Dynamon Universe" }] }),
  component: KeysAdminGate,
});

// ----- Owner gate (Google login) -----

function KeysAdminGate() {
  return (
    <OwnerGate>
      <KeysAdmin />
    </OwnerGate>
  );
}

// ----- Main panel -----

type Tab = "keys" | "config" | "logs";

function KeysAdmin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("keys");

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Key System</h1>
          <p className="text-sm text-muted-foreground">Live Supabase data (valid_keys).</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
        </div>
      </div>

      <div className="mb-6 inline-flex rounded-full border border-border bg-card/60 p-1 text-xs font-semibold">
        {(["keys","config","logs"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 capitalize transition-colors ${tab===t ? "text-primary-foreground" : "text-muted-foreground"}`}
            style={tab===t ? { background: "var(--gradient-primary)" } : undefined}>
            {t}
          </button>
        ))}
      </div>

      {tab === "keys" && <KeysPanel />}
      {tab === "config" && <ConfigPanel />}
      {tab === "logs" && <LogsPanel />}
    </PageShell>
  );
}

// ----- Keys panel -----

function KeysPanel() {
  const [keys, setKeys] = useState<ValidKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all"|"active"|"expired"|"revoked"|"activated">("all");

  useEffect(() => {
    const unsub = listKeys((list) => {
      setKeys(list.sort((a, b) => b.date - a.date));
      setLoading(false);
    });
    return unsub;
  }, []);

  const stats = useMemo(() => {
    const now = nowSeconds();
    return {
      total: keys.length,
      active: keys.filter(k => k.status === "active" && k.expiry > now).length,
      expired: keys.filter(k => k.expiry <= now).length,
      activated: keys.filter(k => k.activated).length,
      revoked: keys.filter(k => k.status === "revoked").length,
    };
  }, [keys]);

  const filtered = useMemo(() => {
    const now = nowSeconds();
    const q = search.trim().toLowerCase();
    return keys.filter(k => {
      if (q && !(k.key.toLowerCase().includes(q) || k.fingerprint.toLowerCase().includes(q) || k.sourceIP.toLowerCase().includes(q))) return false;
      switch (filter) {
        case "active": return k.status === "active" && k.expiry > now;
        case "expired": return k.expiry <= now;
        case "revoked": return k.status === "revoked";
        case "activated": return k.activated;
        default: return true;
      }
    });
  }, [keys, search, filter]);

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Total" value={stats.total} icon={<KeyRound className="h-4 w-4" />} />
        <StatTile label="Active" value={stats.active} icon={<ShieldCheck className="h-4 w-4 text-green-400" />} />
        <StatTile label="Expired" value={stats.expired} icon={<Clock className="h-4 w-4 text-amber-400" />} />
        <StatTile label="Activated" value={stats.activated} icon={<Sparkles className="h-4 w-4 text-primary" />} />
        <StatTile label="Revoked" value={stats.revoked} icon={<Ban className="h-4 w-4 text-red-400" />} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-border bg-card/60 p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by key, fingerprint, IP" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <div className="inline-flex rounded-full border border-border p-1 text-xs">
              {(["all","active","expired","revoked","activated"] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)}
                  className={`rounded-full px-3 py-1 capitalize ${filter===f ? "text-primary-foreground" : "text-muted-foreground"}`}
                  style={filter===f ? { background: "var(--gradient-primary)" } : undefined}>
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">No keys found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Key</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Device</th>
                    <th className="py-2 pr-3">Created</th>
                    <th className="py-2 pr-3">Expires</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(k => <KeyRow key={k.key} k={k} />)}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <ManualKeyForm />
      </div>
    </div>
  );
}

function KeyRow({ k }: { k: ValidKey }) {
  const [busy, setBusy] = useState(false);
  const now = nowSeconds();
  const isExpired = k.expiry <= now;
  const status: { label: string; cls: string } =
    k.status === "revoked" ? { label: "Revoked", cls: "border-red-400/40 text-red-300" } :
    isExpired ? { label: "Expired", cls: "border-amber-400/40 text-amber-300" } :
    k.activated ? { label: "Activated", cls: "border-primary/40 text-primary" } :
    { label: "Active", cls: "border-green-400/40 text-green-300" };

  const copy = async () => {
    await navigator.clipboard.writeText(k.key);
    toast.success(`Copied ${k.key}`);
  };

  const doExtend = async (hours: number) => {
    setBusy(true);
    try { await extendKey(k.key, hours); toast.success(`Extended +${hours}h`); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const doExtendCustom = async () => {
    const v = window.prompt("Extend by how many hours?", "24");
    const h = Number(v);
    if (!v || !Number.isFinite(h) || h <= 0) return;
    doExtend(h);
  };
  const doRevoke = async () => {
    setBusy(true);
    try {
      if (k.status === "revoked") { await unrevokeKey(k.key); toast.success("Unrevoked"); }
      else { await revokeKey(k.key); toast.success("Revoked"); }
    } catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };
  const doDelete = async () => {
    if (!window.confirm(`Delete ${k.key}? This cannot be undone.`)) return;
    setBusy(true);
    try { await deleteKey(k.key); toast.success("Deleted"); }
    catch (e) { toast.error((e as Error).message); }
    finally { setBusy(false); }
  };

  return (
    <tr className="border-t border-border/40">
      <td className="py-3 pr-3">
        <button onDoubleClick={copy} className="font-mono text-sm text-primary hover:underline" title="Double-click to copy">
          {k.key}
        </button>
      </td>
      <td className="py-3 pr-3"><span className={`rounded-full border px-2 py-0.5 text-[11px] ${status.cls}`}>{status.label}</span></td>
      <td className="py-3 pr-3 font-mono text-[11px] text-muted-foreground">{k.device ? k.device.slice(0, 12) + "…" : "—"}</td>
      <td className="py-3 pr-3 text-xs text-muted-foreground">{k.date ? new Date(k.date * 1000).toLocaleString() : "—"}</td>
      <td className="py-3 pr-3 text-xs"><Countdown unixSec={k.expiry} /></td>
      <td className="py-3 pr-3 text-xs text-muted-foreground">{k.source || "—"}</td>
      <td className="py-3 pr-3">
        <div className="flex justify-end gap-1">
          <IconBtn title="Copy" onClick={copy}><Copy className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn title="+24h" disabled={busy} onClick={() => doExtend(24)}>+1d</IconBtn>
          <IconBtn title="+7d" disabled={busy} onClick={() => doExtend(24*7)}>+7d</IconBtn>
          <IconBtn title="Custom" disabled={busy} onClick={doExtendCustom}><Clock className="h-3.5 w-3.5" /></IconBtn>
          <IconBtn title={k.status==="revoked"?"Unrevoke":"Revoke"} disabled={busy} onClick={doRevoke}>
            {k.status==="revoked" ? <RefreshCw className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
          </IconBtn>
          <IconBtn title="Delete" disabled={busy} onClick={doDelete} danger><Trash2 className="h-3.5 w-3.5" /></IconBtn>
        </div>
      </td>
    </tr>
  );
}

function IconBtn({ children, onClick, title, disabled, danger }: { children: React.ReactNode; onClick: () => void; title: string; disabled?: boolean; danger?: boolean }) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={`inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium transition disabled:opacity-50 ${
        danger ? "border-red-400/30 text-red-300 hover:bg-red-400/10" : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
      }`}>
      {children}
    </button>
  );
}

function Countdown({ unixSec }: { unixSec: number }) {
  const [now, setNow] = useState(nowSeconds());
  useEffect(() => { const i = setInterval(() => setNow(nowSeconds()), 1000); return () => clearInterval(i); }, []);
  if (!unixSec) return <span className="text-muted-foreground">—</span>;
  const diff = unixSec - now;
  if (diff <= 0) return <span className="text-amber-400">Expired</span>;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return <span className="font-mono text-xs text-foreground">{h}h {m}m {s}s</span>;
}

function StatTile({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tight">{value}</div>
    </div>
  );
}

// ----- Manual key form -----

function ManualKeyForm() {
  const [prefix, setPrefix] = useState("DG");
  const [hours, setHours] = useState("24");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const h = Number(hours);
    if (!Number.isFinite(h) || h <= 0) { toast.error("Invalid hours"); return; }
    setBusy(true);
    try {
      const key = await createManualKey(prefix, h);
      await navigator.clipboard.writeText(key).catch(() => {});
      toast.success(`Created ${key} (copied)`);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="h-fit rounded-2xl border border-primary/20 bg-card/60 p-4 glow-primary">
      <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
        <Plus className="h-4 w-4 text-primary" /> Add manual key
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">Writes one ValidKeys entry. Users normally generate keys through the worker gate.</p>

      <label className="text-xs text-muted-foreground">Prefix</label>
      <div className="mt-1 mb-3 inline-flex rounded-full border border-border p-1 text-xs">
        {["DG","VIP"].map(p => (
          <button type="button" key={p} onClick={() => setPrefix(p)}
            className={`rounded-full px-3 py-1 ${prefix===p ? "text-primary-foreground" : "text-muted-foreground"}`}
            style={prefix===p ? { background: "var(--gradient-primary)" } : undefined}>
            {p}
          </button>
        ))}
        <Input value={["DG","VIP"].includes(prefix) ? "" : prefix} onChange={(e) => setPrefix(e.target.value.toUpperCase())} placeholder="Custom" className="ml-1 h-7 w-20 border-0 bg-transparent px-2 text-xs" />
      </div>

      <label className="text-xs text-muted-foreground">Duration (hours)</label>
      <Input type="number" min="1" value={hours} onChange={(e) => setHours(e.target.value)} className="mt-1 mb-3" />

      <div className="mb-3 flex gap-1 text-xs">
        {[{l:"1d",h:"24"},{l:"7d",h:"168"},{l:"30d",h:"720"}].map(p => (
          <button type="button" key={p.l} onClick={() => setHours(p.h)} className="rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-primary">{p.l}</button>
        ))}
      </div>

      <Button type="submit" disabled={busy} className="w-full" style={{ background: "var(--gradient-primary)" }}>
        {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Generate & copy
      </Button>
    </form>
  );
}

// ----- Config panel -----

function ConfigPanel() {
  const [cfg, setCfg] = useState<DgConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [newIP, setNewIP] = useState("");
  const [hours, setHours] = useState("24");
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    setLoading(true);
    try { const c = await getConfig(); setCfg(c); setHours(String(c.KeyDurationHours)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  if (loading || !cfg) {
    return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  const toggleMaintenance = async () => {
    setBusy(true);
    try { await setMaintenance(!cfg.Maintenance); toast.success(cfg.Maintenance ? "Maintenance OFF" : "Maintenance ON"); await reload(); }
    finally { setBusy(false); }
  };
  const toggleRate = async () => {
    setBusy(true);
    try { await setRateLimitEnabled(!cfg.RateLimit.enabled); toast.success("Updated"); await reload(); }
    finally { setBusy(false); }
  };
  const saveHours = async () => {
    const n = Number(hours);
    if (!Number.isFinite(n) || n < 1) return toast.error("Invalid hours");
    setBusy(true);
    try { await setKeyDurationHours(n); toast.success("Saved"); await reload(); }
    finally { setBusy(false); }
  };
  const addIP = async () => {
    const ip = newIP.trim();
    if (!ip) return;
    if (cfg.IPWhitelist.includes(ip)) return toast.error("Already in list");
    setBusy(true);
    try { await setIPWhitelist([...cfg.IPWhitelist, ip]); setNewIP(""); await reload(); }
    finally { setBusy(false); }
  };
  const removeIP = async (ip: string) => {
    setBusy(true);
    try { await setIPWhitelist(cfg.IPWhitelist.filter(x => x !== ip)); await reload(); }
    finally { setBusy(false); }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-border bg-card/60 p-5">
        <h3 className="mb-4 font-display text-lg font-bold">Switches</h3>

        <Toggle label="Maintenance mode" desc="Blocks /generate-key with 503." on={cfg.Maintenance} onClick={toggleMaintenance} disabled={busy} warn />
        <div className="my-3 h-px bg-border/50" />
        <Toggle label="Rate limiting" desc="Throttle key generation per IP." on={cfg.RateLimit.enabled} onClick={toggleRate} disabled={busy} />

        <div className="my-5 h-px bg-border/50" />

        <label className="text-sm font-semibold">Key duration (hours)</label>
        <p className="mb-2 text-xs text-muted-foreground">Default lifetime for newly generated keys.</p>
        <div className="flex gap-2">
          <Input type="number" min="1" value={hours} onChange={(e) => setHours(e.target.value)} />
          <Button onClick={saveHours} disabled={busy} style={{ background: "var(--gradient-primary)" }}>Save</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-5">
        <h3 className="mb-1 font-display text-lg font-bold">IP whitelist</h3>
        <p className="mb-4 text-xs text-muted-foreground">IPs bypass rate limits. Empty = no whitelist.</p>
        <div className="flex gap-2">
          <Input placeholder="1.2.3.4" value={newIP} onChange={(e) => setNewIP(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addIP()} />
          <Button onClick={addIP} disabled={busy}><Plus className="h-4 w-4" /></Button>
        </div>
        <ul className="mt-4 space-y-1.5">
          {cfg.IPWhitelist.length === 0 && <li className="text-xs text-muted-foreground">No IPs whitelisted.</li>}
          {cfg.IPWhitelist.map(ip => (
            <li key={ip} className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm">
              <span className="font-mono">{ip}</span>
              <button onClick={() => removeIP(ip)} className="text-muted-foreground hover:text-red-400"><X className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Toggle({ label, desc, on, onClick, disabled, warn }: { label: string; desc: string; on: boolean; onClick: () => void; disabled?: boolean; warn?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {warn && on && <AlertTriangle className="h-4 w-4 text-amber-400" />}
          {label}
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button onClick={onClick} disabled={disabled}
        className={`relative h-6 w-11 rounded-full transition ${on ? "bg-primary" : "bg-muted"} disabled:opacity-50`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

// ----- Logs panel -----

function LogsPanel() {
  const [logs, setLogs] = useState<GenerationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const reload = async () => {
    setLoading(true);
    try { setLogs(await listGenerationLogs(200)); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? logs.filter(l => l.key.toLowerCase().includes(q) || l.ip.toLowerCase().includes(q) || l.fingerprint.toLowerCase().includes(q))
    : logs;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search key / IP / fingerprint" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No logs.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr><th className="py-2 pr-3">When</th><th className="py-2 pr-3">Key</th><th className="py-2 pr-3">IP</th><th className="py-2 pr-3">Fingerprint</th></tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id} className="border-t border-border/40">
                  <td className="py-2 pr-3 text-xs text-muted-foreground">{l.time ? new Date(l.time * 1000).toLocaleString() : "—"}</td>
                  <td className="py-2 pr-3 font-mono text-primary">{l.key}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{l.ip || "—"}</td>
                  <td className="py-2 pr-3 font-mono text-[11px] text-muted-foreground">{l.fingerprint ? l.fingerprint.slice(0,16)+"…" : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// silence unused
void currentAdmin;
