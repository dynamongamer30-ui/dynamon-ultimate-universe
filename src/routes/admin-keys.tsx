import { DexControls } from "@/components/DexControls";
import { isKeyBound, isKeyExpired } from "@/lib/dgKeyPolicy";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { readOwnerConfig, saveOwnerSetting } from "@/lib/ownerSettings";
import { useOwnerResource } from "@/hooks/useOwnerResource";
import { useOwnerMutation } from "@/hooks/useOwnerMutation";
import { licensedDevices } from "@/lib/licensedDevices";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyRound,
  Loader2,
  Sparkles,
  Trash2,
  Copy,
  Plus,
  RefreshCw,
  Search,
  Clock,
  Ban,
  AlertTriangle,
  X,
  ShieldCheck,
  Smartphone,
  Lock,
  Unlock,
  ArrowUpCircle,
  Settings2,
  Save,
  Link2,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  listKeys,
  revokeKey,
  unrevokeKey,
  deleteKey,
  extendKey,
  getConfigNode,
  listGenerationLogs,
  createManualKey,
  listActivatedUsers,
  readDeviceLicenseKeys,
  deleteDeviceInformation,
  listBannedDevices,
  banDevice,
  unbanDevice,
  nowSeconds,
  DEFAULT_APP_UPDATE,
  type ValidKey,
  type DgConfig,
  type GenerationLog,
  type ActivatedUser,
  type BannedDevice,
  type AppUpdate,
} from "@/lib/dgData";

export const Route = createFileRoute("/admin-keys")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Key System — Dynamon Universe" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
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

type Tab = "keys" | "devices" | "config" | "app" | "dex";
const KeyClock = createContext<number | null>(null);

function KeysAdmin() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("keys");

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Key System</h1>
          <p className="text-sm text-muted-foreground">
            Keys, devices, DEX locks, themes and branding. Game changes apply on the next launch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
        </div>
      </div>

      <nav aria-label="Key system sections" className="mb-6">
        <div className="flex flex-wrap gap-1 rounded-2xl border border-border bg-card/60 p-1 text-xs font-semibold sm:inline-flex sm:rounded-full">
          {(["keys", "devices", "dex", "config", "app"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              aria-pressed={tab === t}
              className={`touch-target min-w-max flex-auto shrink-0 whitespace-nowrap rounded-full px-3 py-2 capitalize transition-colors sm:flex-none sm:px-4 sm:py-1.5 ${tab === t ? "text-primary-foreground" : "text-muted-foreground"}`}
              style={tab === t ? { background: "var(--gradient-primary)" } : undefined}
            >
              {t === "dex" ? "Royal Black" : t}
            </button>
          ))}
        </div>
      </nav>

      {tab === "keys" && <KeysPanel />}
      {tab === "devices" && <DevicesPanel />}
      {tab === "config" && <ConfigPanel />}
      {tab === "app" && <AppExtrasPanel />}
      {tab === "dex" && <DexControls />}
    </PageShell>
  );
}

// ----- Keys panel -----

function KeysPanel() {
  const [keys, setKeys] = useState<ValidKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [lookupAttempt, setLookupAttempt] = useState(0);
  const [clock, setClock] = useState(nowSeconds());
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      clearTimeout(timer);
      const now = nowSeconds();
      setClock(now);
      if (!document.hidden && keys.some((key) => isKeyBound(key) && key.expiry > now))
        timer = setTimeout(tick, 1000);
    };
    tick();
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [keys]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "revoked" | "activated">(
    "all",
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const confirm = useConfirm();
  const retryKeys = () => {
    setSelected(new Set());
    setLookupAttempt((attempt) => attempt + 1);
  };

  useEffect(() => {
    setLoading(true);
    setLoadError("");
    const unsub = listKeys(
      (list) => {
        setLoadError("");
        setKeys(list.sort((a, b) => b.date - a.date));
        setLoading(false);
      },
      (error) => {
        setLoadError(error.message);
        setLoading(false);
      },
    );
    return unsub;
  }, [lookupAttempt]);

  const stats = useMemo(() => {
    const now = clock;
    return {
      total: keys.length,
      active: keys.filter((k) => k.status === "active" && !isKeyExpired(k, now)).length,
      expired: keys.filter((k) => isKeyExpired(k, now)).length,
      activated: keys.filter((k) => k.activated).length,
      revoked: keys.filter((k) => k.status === "revoked").length,
    };
  }, [keys, clock]);

  const filtered = useMemo(() => {
    const now = clock;
    const q = search.trim().toLowerCase();
    return keys.filter((k) => {
      if (
        q &&
        !(
          k.key.toLowerCase().includes(q) ||
          k.fingerprint.toLowerCase().includes(q) ||
          (k.device || "").toLowerCase().includes(q) ||
          k.sourceIP.toLowerCase().includes(q)
        )
      )
        return false;
      switch (filter) {
        case "active":
          return k.status === "active" && !isKeyExpired(k, now);
        case "expired":
          return isKeyExpired(k, now);
        case "revoked":
          return k.status === "revoked";
        case "activated":
          return k.activated;
        default:
          return true;
      }
    });
  }, [keys, search, filter, clock]);

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Select-all toggles only the currently-filtered rows (so "select all" while
  // on the Expired filter selects exactly the expired keys, etc).
  const allFilteredSelected = filtered.length > 0 && filtered.every((k) => selected.has(k.key));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) {
        filtered.forEach((k) => next.delete(k.key));
      } else {
        filtered.forEach((k) => next.add(k.key));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const bulkRevoke = async () => {
    const targets = [...selected];
    if (!targets.length) return;
    if (
      !(await confirm({
        title: "Revoke selected keys",
        description: `Revoke ${targets.length} selected key${targets.length > 1 ? "s" : ""}? Users on these keys lose access on their next check.`,
        confirmText: "Revoke all",
        danger: true,
      }))
    )
      return;
    setBulkBusy(true);
    let ok = 0;
    for (const key of targets) {
      try {
        await revokeKey(key);
        ok++;
      } catch {
        /* skip */
      }
    }
    setBulkBusy(false);
    clearSelection();
    if (ok === targets.length) toast.success(`Revoked ${ok} keys`);
    else toast.error(`Revoked ${ok}/${targets.length} keys. Reload and retry the remaining keys.`);
  };

  const bulkExtend = async () => {
    const targets = [...selected];
    if (!targets.length) return;
    const v = window.prompt(`Extend ${targets.length} selected key(s) by how many hours?`, "24");
    const h = Number(v);
    if (!v || !Number.isFinite(h) || h <= 0) return;
    setBulkBusy(true);
    let ok = 0;
    for (const key of targets) {
      try {
        await extendKey(key, h);
        ok++;
      } catch {
        /* skip */
      }
    }
    setBulkBusy(false);
    clearSelection();
    if (ok === targets.length) toast.success(`Extended ${ok} keys by +${h}h`);
    else
      toast.error(
        `Extended ${ok}/${targets.length} keys. Lifetime keys need no extension; reload before retrying other keys.`,
      );
  };

  const bulkDelete = async () => {
    const targets = [...selected];
    if (!targets.length) return;
    if (
      !(await confirm({
        title: "Delete selected keys",
        description: `Permanently delete ${targets.length} selected key${targets.length > 1 ? "s" : ""}? This cannot be undone.`,
        confirmText: "Delete all",
        danger: true,
      }))
    )
      return;
    setBulkBusy(true);
    let ok = 0;
    for (const key of targets) {
      try {
        await deleteKey(key);
        ok++;
      } catch {
        /* skip */
      }
    }
    setBulkBusy(false);
    clearSelection();
    if (ok === targets.length) toast.success(`Deleted ${ok} keys`);
    else toast.error(`Deleted ${ok}/${targets.length} keys. Reload and retry the remaining keys.`);
  };

  return (
    <KeyClock.Provider value={clock}>
      <div>
        {loadError && (
          <div
            role="alert"
            className="mb-4 rounded-xl border border-red-400/40 p-3 text-sm text-red-300"
          >
            <p>Could not confirm the key list. Displayed counts and key actions are unavailable.</p>
            <button
              type="button"
              className="touch-target mt-2 rounded-lg border border-border px-4 py-2"
              onClick={retryKeys}
            >
              Retry key lookup
            </button>
          </div>
        )}
        <div
          role="region"
          aria-label="Key totals"
          className="grid grid-cols-2 gap-3 sm:grid-cols-5"
        >
          <StatTile
            label="Loaded keys"
            value={loading || loadError ? null : stats.total}
            icon={<KeyRound className="h-4 w-4" />}
          />
          <StatTile
            label="Active"
            value={loading || loadError ? null : stats.active}
            icon={<ShieldCheck className="h-4 w-4 text-green-400" />}
          />
          <StatTile
            label="Expired"
            value={loading || loadError ? null : stats.expired}
            icon={<Clock className="h-4 w-4 text-amber-400" />}
          />
          <StatTile
            label="Activated"
            value={loading || loadError ? null : stats.activated}
            icon={<Sparkles className="h-4 w-4 text-primary-ink" />}
          />
          <StatTile
            label="Revoked"
            value={loading || loadError ? null : stats.revoked}
            icon={<Ban className="h-4 w-4 text-red-400" />}
          />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 rounded-2xl border border-border bg-card/60 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="touch-target"
                disabled={loading}
                onClick={retryKeys}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh key list
              </Button>
              <div className="relative min-w-0 basis-[200px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  aria-label="Search keys"
                  placeholder="Search by key, fingerprint, IP"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-11 pl-9"
                />
              </div>
              <div
                role="group"
                aria-label="Key status filter"
                className="flex flex-wrap gap-1 rounded-xl border border-border p-1 text-xs"
              >
                {(["all", "active", "expired", "revoked", "activated"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    aria-pressed={filter === f}
                    className={`touch-target rounded-full px-3 py-1 capitalize ${filter === f ? "text-primary-foreground" : "text-muted-foreground"}`}
                    style={filter === f ? { background: "var(--gradient-primary)" } : undefined}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {selected.size > 0 && !loading && !loadError && (
              <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5">
                <span className="text-sm font-semibold text-foreground">
                  {selected.size} selected
                </span>
                <div className="flex-1" />
                <button
                  onClick={bulkExtend}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary-ink hover:bg-primary/10 disabled:opacity-50"
                >
                  {bulkBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Clock className="h-3.5 w-3.5" />
                  )}{" "}
                  Extend
                </button>
                <button
                  onClick={bulkRevoke}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-400/10 disabled:opacity-50"
                >
                  {bulkBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Ban className="h-3.5 w-3.5" />
                  )}{" "}
                  Revoke
                </button>
                <button
                  onClick={bulkDelete}
                  disabled={bulkBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-50"
                >
                  {bulkBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}{" "}
                  Delete
                </button>
                <button
                  onClick={clearSelection}
                  disabled={bulkBusy}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-white/5 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>
            )}

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-primary-ink" />
              </div>
            ) : loadError ? (
              <p className="py-8 text-sm text-muted-foreground">
                Retry the lookup to view a confirmed key list.
              </p>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">No keys found.</p>
            ) : (
              <>
                <div
                  role="region"
                  aria-label="Access keys table"
                  tabIndex={0}
                  className="hidden overflow-x-auto md:block"
                >
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <caption className="sr-only">
                      Access keys, device binding, expiry and owner actions
                    </caption>
                    <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="py-2 pr-3">
                          <input
                            type="checkbox"
                            checked={allFilteredSelected}
                            onChange={toggleAll}
                            className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                            aria-label="Select all"
                          />
                        </th>
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
                      {filtered.map((k) => (
                        <KeyRow
                          key={k.key}
                          k={k}
                          selected={selected.has(k.key)}
                          onToggle={toggle}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2.5 md:hidden">
                  <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background/40 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                    />
                    <span className="text-sm font-semibold text-foreground">
                      {allFilteredSelected ? "Deselect all" : "Select all"}
                      <span className="ml-1 font-normal text-muted-foreground">
                        ({filtered.length})
                      </span>
                    </span>
                  </label>
                  {filtered.map((k) => (
                    <KeyCard key={k.key} k={k} selected={selected.has(k.key)} onToggle={toggle} />
                  ))}
                </div>
              </>
            )}
          </div>

          <ManualKeyForm disabled={loading || !!loadError} />
        </div>
      </div>
    </KeyClock.Provider>
  );
}

function useKeyActions(k: ValidKey) {
  const [busy, setBusy] = useState(false);
  const confirm = useConfirm();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(k.key);
      toast.success("Key copied");
    } catch {
      toast.error("Could not copy the key. Clipboard access may be blocked.");
    }
  };
  const doExtend = async (hours: number) => {
    setBusy(true);
    try {
      await extendKey(k.key, hours);
      toast.success(`Extended +${hours}h`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
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
      if (k.status === "revoked") {
        await unrevokeKey(k.key);
        toast.success("Unrevoked");
      } else {
        await revokeKey(k.key);
        toast.success("Revoked");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const doDelete = async () => {
    if (
      !(await confirm({
        title: "Delete key",
        description: `Delete ${k.key}? This cannot be undone.`,
        confirmText: "Delete",
        danger: true,
      }))
    )
      return;
    setBusy(true);
    try {
      await deleteKey(k.key);
      toast.success("Deleted");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const now = useContext(KeyClock) ?? nowSeconds();
  const isExpired = isKeyExpired(k, now);
  const status: { label: string; cls: string } =
    k.status === "revoked"
      ? { label: "Revoked", cls: "border-red-400/40 text-red-300" }
      : isExpired
        ? { label: "Expired", cls: "border-amber-400/40 text-amber-300" }
        : k.activated
          ? { label: "Activated", cls: "border-primary/40 text-primary-ink" }
          : { label: "Active", cls: "border-green-400/40 text-green-300" };

  return { busy, copy, doExtend, doExtendCustom, doRevoke, doDelete, status };
}

function KeyActionButtons({ k }: { k: ValidKey }) {
  const { busy, copy, doExtend, doExtendCustom, doRevoke, doDelete } = useKeyActions(k);
  return (
    <div className="flex flex-wrap justify-end gap-1">
      <IconBtn title="Copy" onClick={copy}>
        <Copy className="h-3.5 w-3.5" />
      </IconBtn>
      <IconBtn title="+24h" disabled={busy} onClick={() => doExtend(24)}>
        +1d
      </IconBtn>
      <IconBtn title="+7d" disabled={busy} onClick={() => doExtend(24 * 7)}>
        +7d
      </IconBtn>
      <IconBtn title="Custom" disabled={busy} onClick={doExtendCustom}>
        <Clock className="h-3.5 w-3.5" />
      </IconBtn>
      <IconBtn
        title={k.status === "revoked" ? "Unrevoke" : "Revoke"}
        disabled={busy}
        onClick={doRevoke}
      >
        {k.status === "revoked" ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : (
          <Ban className="h-3.5 w-3.5" />
        )}
      </IconBtn>
      <IconBtn title="Delete" disabled={busy} onClick={doDelete} danger>
        <Trash2 className="h-3.5 w-3.5" />
      </IconBtn>
    </div>
  );
}

function KeyCard({
  k,
  selected,
  onToggle,
}: {
  k: ValidKey;
  selected: boolean;
  onToggle: (key: string) => void;
}) {
  const { copy, status } = useKeyActions(k);
  return (
    <div
      className={`rounded-xl border p-3 [overflow-wrap:anywhere] ${selected ? "border-primary/40 bg-primary/5" : "border-border bg-background/40"}`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(k.key)}
          className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
          aria-label={`Select ${k.key}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={copy}
              className="truncate font-mono text-sm font-semibold text-primary-ink"
              title="Copy key"
            >
              {k.key}
            </button>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${status.cls}`}>
              {status.label}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Device: {k.device ? k.device.slice(0, 10) + "…" : "—"}</span>
            <span>Source: {k.source || "—"}</span>
            <span>Created: {k.date ? new Date(k.date * 1000).toLocaleDateString() : "—"}</span>
            <span className="flex gap-1">
              Expires: <Countdown unixSec={k.expiry} pending={!isKeyBound(k)} />
            </span>
          </div>
          <div className="mt-3">
            <KeyActionButtons k={k} />
          </div>
        </div>
      </div>
    </div>
  );
}

function KeyRow({
  k,
  selected,
  onToggle,
}: {
  k: ValidKey;
  selected: boolean;
  onToggle: (key: string) => void;
}) {
  const { copy, status } = useKeyActions(k);
  return (
    <tr className={`border-t border-border/40 ${selected ? "bg-primary/5" : ""}`}>
      <td className="py-3 pr-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggle(k.key)}
          className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
          aria-label={`Select ${k.key}`}
        />
      </td>
      <td className="py-3 pr-3">
        <button
          onClick={copy}
          className="font-mono text-sm text-primary-ink hover:underline"
          title="Copy key"
        >
          {k.key}
        </button>
      </td>
      <td className="py-3 pr-3">
        <span className={`rounded-full border px-2 py-0.5 text-xs ${status.cls}`}>
          {status.label}
        </span>
      </td>
      <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
        {k.device ? k.device.slice(0, 12) + "…" : "—"}
      </td>
      <td className="py-3 pr-3 text-xs text-muted-foreground">
        {k.date ? new Date(k.date * 1000).toLocaleString() : "—"}
      </td>
      <td className="py-3 pr-3 text-xs">
        <Countdown unixSec={k.expiry} pending={!isKeyBound(k)} />
      </td>
      <td className="py-3 pr-3 text-xs text-muted-foreground">{k.source || "—"}</td>
      <td className="py-3 pr-3">
        <KeyActionButtons k={k} />
      </td>
    </tr>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`touch-target inline-flex items-center justify-center gap-1 rounded-md border px-2 py-1 text-xs font-medium transition disabled:opacity-50 ${
        danger
          ? "border-red-400/30 text-red-300 hover:bg-red-400/10"
          : "border-border text-muted-foreground hover:border-primary/40 hover:text-primary-ink"
      }`}
    >
      {children}
    </button>
  );
}

function Countdown({ unixSec, pending = false }: { unixSec: number; pending?: boolean }) {
  const now = useContext(KeyClock) ?? nowSeconds();
  if (pending) return <span className="text-muted-foreground">Starts at first login</span>;
  if (unixSec === 0) return <span className="text-primary-ink">Lifetime</span>;
  const diff = unixSec - now;
  if (diff <= 0) return <span className="text-amber-400">Expired</span>;
  const h = Math.floor(diff / 3600);
  const m = Math.floor((diff % 3600) / 60);
  const s = diff % 60;
  return (
    <span className="font-mono text-xs text-foreground">
      {h}h {m}m {s}s
    </span>
  );
}

function StatTile({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | null;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1 font-display text-2xl font-extrabold uppercase tracking-tight">
        {value === null ? "—" : value}
      </div>
    </div>
  );
}

// ----- Manual key form -----

function ManualKeyForm({ disabled = false }: { disabled?: boolean }) {
  const [prefix, setPrefix] = useState("DG");
  const [hours, setHours] = useState("24");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || busy || pending.current) return;
    const h = Number(hours);
    if (!hours.trim() || !Number.isFinite(h) || h < 0 || h > 87600) {
      toast.error("Enter 0–87600 hours (0 = lifetime)");
      return;
    }
    pending.current = true;
    setBusy(true);
    try {
      const key = await createManualKey(prefix, h);
      const copied = await navigator.clipboard.writeText(key).then(
        () => true,
        () => false,
      );
      toast.success("Key created", {
        description: copied
          ? "Key copied."
          : "Copy was blocked. Refresh the key list to find and copy the created key.",
      });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="h-fit rounded-2xl border border-primary/20 bg-card/60 p-4 glow-primary"
    >
      <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
        <Plus className="h-4 w-4 text-primary-ink" /> Add manual key
      </h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Writes one ValidKeys entry. Users normally generate keys through the worker gate.
      </p>

      <p className="text-xs text-muted-foreground">Prefix</p>
      <div
        role="group"
        aria-label="Key prefix"
        className="mt-1 mb-3 inline-flex rounded-full border border-border p-1 text-xs"
      >
        {["DG", "VIP"].map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => setPrefix(p)}
            aria-pressed={prefix === p}
            className={`touch-target rounded-full px-3 py-1 ${prefix === p ? "text-primary-foreground" : "text-muted-foreground"}`}
            style={prefix === p ? { background: "var(--gradient-primary)" } : undefined}
          >
            {p}
          </button>
        ))}
      </div>

      <label htmlFor="manual-key-duration" className="text-xs text-muted-foreground">
        Duration (hours; 0 = lifetime)
      </label>
      <Input
        id="manual-key-duration"
        type="number"
        min="0"
        max="87600"
        value={hours}
        onChange={(e) => setHours(e.target.value)}
        className="mt-1 mb-3 h-11"
      />

      <div className="mb-3 flex flex-wrap gap-1 text-xs">
        {[
          { l: "1d", h: "24" },
          { l: "7d", h: "168" },
          { l: "30d", h: "720" },
          { l: "Lifetime", h: "0" },
        ].map((p) => (
          <button
            type="button"
            key={p.l}
            onClick={() => setHours(p.h)}
            className="touch-target rounded-md border border-border px-2 py-1 text-muted-foreground hover:text-primary-ink"
          >
            {p.l}
          </button>
        ))}
      </div>

      <Button
        type="submit"
        disabled={busy || disabled}
        className="w-full"
        style={{ background: "var(--gradient-primary)" }}
      >
        {busy ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="mr-2 h-4 w-4" />
        )}
        Generate & copy
      </Button>
    </form>
  );
}
// ----- Devices panel (activated devices) -----

async function readDeviceRecords(signal: AbortSignal) {
  const [users, bans, keys] = await Promise.all([
    listActivatedUsers(signal),
    listBannedDevices(signal),
    readDeviceLicenseKeys(signal),
  ]);
  return {
    users: users.sort((a, b) => Number(b.lastLogin ?? 0) - Number(a.lastLogin ?? 0)),
    bans,
    keys,
  };
}
function DevicesPanel() {
  const resource = useOwnerResource(readDeviceRecords);
  const [, tick] = useState(0);
  const deviceNow = Math.floor(Date.now() / 1000);
  const rows = licensedDevices(resource.data?.users ?? [], resource.data?.keys ?? [], deviceNow);
  useEffect(() => {
    const refresh = () => tick((value) => value + 1);
    const future = (resource.data?.keys ?? [])
      .map((key) => key.expiry)
      .filter((expiry) => Number.isFinite(expiry) && expiry > deviceNow);
    const deadline = future.length ? Math.min(...future) * 1000 - Date.now() + 25 : null;
    const timer =
      deadline === null
        ? undefined
        : setTimeout(refresh, Math.min(2147483647, Math.max(25, deadline)));
    document.addEventListener("visibilitychange", refresh);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [resource.data, deviceNow]);
  const banned = new Set(resource.data?.bans.map((b) => b.fingerprint) ?? []);
  const loading = resource.loading;
  const reload = resource.reload;
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  useEffect(() => {
    const live = new Set(
      licensedDevices(resource.data?.users ?? [], resource.data?.keys ?? [], deviceNow).map(
        (row) => row.fingerprint,
      ),
    );
    setSelected((previous) => {
      const next = new Set([...previous].filter((id) => live.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [resource.data, deviceNow]);
  const liveSelected = () => {
    const live = new Set(
      licensedDevices(
        resource.data?.users ?? [],
        resource.data?.keys ?? [],
        Math.floor(Date.now() / 1000),
      ).map((row) => row.fingerprint),
    );
    return [...selected].filter((id) => live.has(id));
  };
  const confirm = useConfirm();
  const pending = useRef(false);
  const serialize = async (action: () => Promise<void>) => {
    if (pending.current) return;
    pending.current = true;
    try {
      await action();
    } finally {
      pending.current = false;
    }
  };

  const doLock = (fp: string) =>
    serialize(async () => {
      setBusy(fp);
      try {
        await banDevice(fp, "locked from devices panel");
        toast.success("Device banned");
        await reload();
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy("");
      }
    });
  const doUnlock = (fp: string) =>
    serialize(async () => {
      setBusy(fp);
      try {
        await unbanDevice(fp);
        toast.success("Device unbanned");
        await reload();
      } catch (e) {
        toast.error((e as Error).message);
      } finally {
        setBusy("");
      }
    });

  const removeInformation = (row: ActivatedUser) =>
    serialize(async () => {
      if (
        !(await confirm({
          title: "Delete device information",
          description:
            "Remove this device's stored information? Its key, device binding and ban remain unchanged. A valid device can appear again when it verifies its key. It may need to verify again before loading the game.",
          confirmText: "Delete information",
          danger: true,
        }))
      )
        return;
      setBusy(row.fingerprint);
      try {
        await deleteDeviceInformation(row.fingerprint, row.recordData);
        resource.setData((previous) =>
          previous
            ? {
                ...previous,
                users: previous.users.filter((user) => user.fingerprint !== row.fingerprint),
              }
            : previous,
        );
        setSelected((previous) => {
          const next = new Set(previous);
          next.delete(row.fingerprint);
          return next;
        });
        toast.success("Device information deleted");
      } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : "Deletion was not confirmed");
      } finally {
        setBusy("");
      }
    });

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) =>
          r.fingerprint.toLowerCase().includes(q) ||
          String(r.Key ?? r.key ?? "")
            .toLowerCase()
            .includes(q),
      )
    : rows;

  const toggle = (fp: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(fp)) next.delete(fp);
      else next.add(fp);
      return next;
    });
  };
  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.fingerprint));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((r) => next.delete(r.fingerprint));
      else filtered.forEach((r) => next.add(r.fingerprint));
      return next;
    });
  };
  const clearSelection = () => setSelected(new Set());

  const bulkBan = () =>
    serialize(async () => {
      const targets = liveSelected();
      if (!targets.length) return;
      if (
        !(await confirm({
          title: "Ban selected devices",
          description: `Ban ${targets.length} device${targets.length > 1 ? "s" : ""}? They lose access immediately.`,
          confirmText: "Ban all",
          danger: true,
        }))
      )
        return;
      setBulkBusy(true);
      let ok = 0;
      for (const fp of targets) {
        try {
          await banDevice(fp, "bulk ban from devices panel");
          ok++;
        } catch {
          /* skip */
        }
      }
      setBulkBusy(false);
      clearSelection();
      toast.success(`Banned ${ok} device${ok !== 1 ? "s" : ""}`);
      await reload();
    });

  const bulkUnban = () =>
    serialize(async () => {
      const targets = liveSelected();
      if (!targets.length) return;
      if (
        !(await confirm({
          title: "Unban selected devices",
          description: `Unban ${targets.length} device${targets.length > 1 ? "s" : ""}?`,
          confirmText: "Unban all",
        }))
      )
        return;
      setBulkBusy(true);
      let ok = 0;
      for (const fp of targets) {
        try {
          await unbanDevice(fp);
          ok++;
        } catch {
          /* skip */
        }
      }
      setBulkBusy(false);
      clearSelection();
      toast.success(`Unbanned ${ok} device${ok !== 1 ? "s" : ""}`);
      await reload();
    });

  const bannedCount = rows.filter((r) => banned.has(r.fingerprint)).length;
  const unbannedCount = Math.max(0, rows.length - bannedCount);

  if (resource.error)
    return (
      <div role="alert">
        <p>{resource.error}</p>
        <Button onClick={reload}>Retry device records</Button>
      </div>
    );
  if (loading) return <p role="status">Loading device records…</p>;
  return (
    <fieldset disabled={!!busy || bulkBusy} className="min-w-0">
      <legend className="sr-only">Device records and actions</legend>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-3">
        <StatTile
          label="Total devices"
          value={rows.length}
          icon={<Smartphone className="h-4 w-4 text-primary-ink" />}
        />
        <StatTile
          label="Banned"
          value={bannedCount}
          icon={<Lock className="h-4 w-4 text-red-400" />}
        />
        <StatTile
          label="Unbanned"
          value={unbannedCount}
          icon={<Unlock className="h-4 w-4 text-green-400" />}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card/60 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by device or key"
              aria-label="Search device records"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={reload}
            disabled={loading}
            aria-label="Refresh device records"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {selected.size > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 p-2.5">
            <span className="text-sm font-semibold text-foreground">{selected.size} selected</span>
            <div className="flex-1" />
            <button
              onClick={bulkBan}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-red-400/40 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-400/10 disabled:opacity-50"
            >
              {bulkBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}{" "}
              Ban
            </button>
            <button
              onClick={bulkUnban}
              disabled={bulkBusy}
              className="inline-flex items-center gap-1.5 rounded-lg border border-green-400/40 px-3 py-1.5 text-xs font-semibold text-green-300 hover:bg-green-400/10 disabled:opacity-50"
            >
              {bulkBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Unlock className="h-3.5 w-3.5" />
              )}{" "}
              Unban
            </button>
            <button
              onClick={clearSelection}
              disabled={bulkBusy}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-white/5 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary-ink" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No activated devices yet.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={allFilteredSelected}
                        onChange={toggleAll}
                        className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                        aria-label="Select all devices"
                      />
                    </th>
                    <th className="py-2 pr-3">Device</th>
                    <th className="py-2 pr-3">Key</th>
                    <th className="py-2 pr-3">Last login</th>
                    <th className="py-2 pr-3">State</th>
                    <th className="py-2 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const isLocked = banned.has(r.fingerprint);
                    const last = Number(r.lastLogin ?? 0);
                    return (
                      <tr
                        key={r.fingerprint}
                        className={`border-t border-border/40 ${selected.has(r.fingerprint) ? "bg-primary/5" : ""}`}
                      >
                        <td className="py-3 pr-3">
                          <input
                            type="checkbox"
                            checked={selected.has(r.fingerprint)}
                            onChange={() => toggle(r.fingerprint)}
                            className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                            aria-label={`Select ${r.fingerprint}`}
                          />
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                          {r.fingerprint.slice(0, 16)}…
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs text-primary-ink">
                          {String(r.Key ?? r.key ?? "—")}
                        </td>
                        <td className="py-3 pr-3 text-xs text-muted-foreground">
                          {last ? new Date(last).toLocaleString() : "—"}
                        </td>
                        <td className="py-3 pr-3">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${isLocked ? "border-red-400/40 text-red-300" : "border-green-400/40 text-green-300"}`}
                          >
                            {isLocked ? "Banned" : "Active"}
                          </span>
                        </td>
                        <td className="py-3 pr-3">
                          <div className="flex justify-end gap-1">
                            <IconBtn
                              title="Delete device info"
                              disabled={!!busy}
                              onClick={() => removeInformation(r)}
                              danger
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </IconBtn>
                            {isLocked ? (
                              <IconBtn
                                title="Unban"
                                disabled={busy === r.fingerprint}
                                onClick={() => doUnlock(r.fingerprint)}
                              >
                                <Unlock className="h-3.5 w-3.5" />
                              </IconBtn>
                            ) : (
                              <IconBtn
                                title="Ban"
                                disabled={busy === r.fingerprint}
                                onClick={() => doLock(r.fingerprint)}
                                danger
                              >
                                <Lock className="h-3.5 w-3.5" />
                              </IconBtn>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="space-y-2.5 md:hidden">
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-border bg-background/40 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allFilteredSelected}
                  onChange={toggleAll}
                  className="h-4 w-4 cursor-pointer accent-[var(--primary)]"
                />
                <span className="text-sm font-semibold text-foreground">
                  {allFilteredSelected ? "Deselect all" : "Select all"}
                  <span className="ml-1 font-normal text-muted-foreground">
                    ({filtered.length})
                  </span>
                </span>
              </label>
              {filtered.map((r) => {
                const isLocked = banned.has(r.fingerprint);
                const last = Number(r.lastLogin ?? 0);
                const isSel = selected.has(r.fingerprint);
                return (
                  <div
                    key={r.fingerprint}
                    className={`rounded-xl border p-3 ${isSel ? "border-primary/40 bg-primary/5" : "border-border bg-background/40"}`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isSel}
                        onChange={() => toggle(r.fingerprint)}
                        className="mt-1 h-4 w-4 shrink-0 cursor-pointer accent-[var(--primary)]"
                        aria-label={`Select ${r.fingerprint}`}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate font-mono text-xs text-primary-ink">
                            {String(r.Key ?? r.key ?? "—")}
                          </span>
                          <span
                            className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${isLocked ? "border-red-400/40 text-red-300" : "border-green-400/40 text-green-300"}`}
                          >
                            {isLocked ? "Banned" : "Active"}
                          </span>
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                          <div className="truncate font-mono">
                            Device: {r.fingerprint.slice(0, 20)}…
                          </div>
                          <div>Last login: {last ? new Date(last).toLocaleString() : "—"}</div>
                        </div>
                        <div className="mt-3 flex flex-wrap justify-end gap-2">
                          <IconBtn
                            title="Delete device info"
                            disabled={!!busy}
                            onClick={() => removeInformation(r)}
                            danger
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </IconBtn>
                          {isLocked ? (
                            <IconBtn
                              title="Unban"
                              disabled={busy === r.fingerprint}
                              onClick={() => doUnlock(r.fingerprint)}
                            >
                              <Unlock className="h-3.5 w-3.5" /> Unban
                            </IconBtn>
                          ) : (
                            <IconBtn
                              title="Ban"
                              disabled={busy === r.fingerprint}
                              onClick={() => doLock(r.fingerprint)}
                              danger
                            >
                              <Lock className="h-3.5 w-3.5" /> Ban
                            </IconBtn>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </fieldset>
  );
}
// ----- Locks panel (banned devices) -----

function LocksPanel() {
  const [rows, setRows] = useState<BannedDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newFp, setNewFp] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState("");

  const reload = async () => {
    setLoading(true);
    try {
      setRows((await listBannedDevices()).sort((a, b) => b.time - a.time));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
  }, []);

  const doAdd = async () => {
    const fp = newFp.trim();
    if (!fp) return toast.error("Enter a device fingerprint");
    setBusy("add");
    try {
      await banDevice(fp, reason.trim() || "manual lock");
      toast.success("Device locked");
      setNewFp("");
      setReason("");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  };
  const doUnlock = async (fp: string) => {
    setBusy(fp);
    try {
      await unbanDevice(fp);
      toast.success("Device unlocked");
      await reload();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const q = search.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (r) => r.fingerprint.toLowerCase().includes(q) || r.reason.toLowerCase().includes(q),
      )
    : rows;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-2xl border border-border bg-card/60 p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search locked devices"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-primary-ink" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">No locked devices.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Device</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">Locked at</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.fingerprint} className="border-t border-border/40">
                    <td className="py-3 pr-3 font-mono text-xs text-muted-foreground">
                      {r.fingerprint.slice(0, 16)}…
                    </td>
                    <td className="py-3 pr-3 text-xs">{r.reason || "—"}</td>
                    <td className="py-3 pr-3 text-xs text-muted-foreground">
                      {r.time ? new Date(r.time * 1000).toLocaleString() : "—"}
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex justify-end gap-1">
                        <IconBtn
                          title="Unlock"
                          disabled={busy === r.fingerprint}
                          onClick={() => doUnlock(r.fingerprint)}
                        >
                          <Unlock className="h-3.5 w-3.5" />
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="h-fit rounded-2xl border border-red-400/20 bg-card/60 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-display text-base font-bold">
          <Lock className="h-4 w-4 text-red-400" /> Lock a device
        </h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Manually block a device fingerprint. The license worker rejects locked devices at its next
          server access (ban checks may be cached for 60 seconds).
        </p>
        <label className="text-xs text-muted-foreground">Device fingerprint</label>
        <Input
          value={newFp}
          onChange={(e) => setNewFp(e.target.value)}
          placeholder="paste fingerprint"
          className="mt-1 mb-3 font-mono text-xs"
        />
        <label className="text-xs text-muted-foreground">Reason (optional)</label>
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="abuse / sharing / …"
          className="mt-1 mb-3"
        />
        <Button
          onClick={doAdd}
          disabled={busy === "add"}
          className="w-full"
          style={{ background: "var(--gradient-primary)" }}
        >
          {busy === "add" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lock className="mr-2 h-4 w-4" />
          )}
          Lock device
        </Button>
      </div>
    </div>
  );
}

// ----- Config panel -----

async function readGeneratorSettings(signal: AbortSignal) {
  const rows = await readOwnerConfig(
    ["Maintenance", "RateLimit", "KeyDurationHours", "IPWhitelist", "Update"],
    signal,
  );
  const rate = rows.RateLimit;
  const update = rows.Update;
  if (
    (rows.Maintenance != null && typeof rows.Maintenance !== "boolean") ||
    (rows.KeyDurationHours != null &&
      (!Number.isSafeInteger(rows.KeyDurationHours) || Number(rows.KeyDurationHours) < 1)) ||
    (rate != null &&
      (typeof rate !== "object" ||
        Array.isArray(rate) ||
        typeof (rate as { enabled?: unknown }).enabled !== "boolean")) ||
    (rows.IPWhitelist != null &&
      (!Array.isArray(rows.IPWhitelist) ||
        rows.IPWhitelist.some((v: unknown) => typeof v !== "string"))) ||
    (update != null && (typeof update !== "object" || Array.isArray(update)))
  )
    throw new Error("Invalid saved generator settings.");
  return rows;
}

function ConfigPanel() {
  const resource = useOwnerResource(readGeneratorSettings);
  const snapshot = useRef<Record<string, unknown>>({});
  const [cfg, setCfg] = useState<DgConfig | null>(null);
  const [upd, setUpd] = useState<AppUpdate | null>(null);
  const [newIP, setNewIP] = useState("");
  const [hours, setHours] = useState("24");
  const { saving: busy, error, run } = useOwnerMutation();
  useEffect(() => {
    if (!resource.data) return;
    const rows = resource.data;
    snapshot.current = rows;
    setCfg({
      Maintenance: (rows.Maintenance ?? false) as boolean,
      RateLimit: { enabled: false, ...((rows.RateLimit as object) ?? {}) },
      KeyDurationHours: Number(rows.KeyDurationHours ?? 24),
      IPWhitelist: (rows.IPWhitelist ?? []) as string[],
    });
    setHours(String(rows.KeyDurationHours ?? 24));
    setUpd({ ...DEFAULT_APP_UPDATE, ...((rows.Update as object) ?? {}) });
  }, [resource.data]);
  const save = (id: string, value: unknown, message = "Saved") =>
    run(async (signal) => {
      await saveOwnerSetting("app_config", id, value, snapshot.current[id], signal);
      snapshot.current = { ...snapshot.current, [id]: value };
      setCfg((previous) =>
        previous && id in previous ? ({ ...previous, [id]: value } as DgConfig) : previous,
      );
      toast.success(message);
    });
  const saveUpdate = () => {
    if (!upd) return;
    if (!Number.isSafeInteger(upd.VersionCode) || upd.VersionCode < 0)
      return toast.error("Use a non-negative whole version code.");
    void save("Update", upd, "Update settings saved");
  };
  const setU = <K extends keyof AppUpdate>(k: K, v: AppUpdate[K]) =>
    setUpd((p) => (p ? { ...p, [k]: v } : p));
  if (resource.error)
    return (
      <div role="alert">
        <p>{resource.error}</p>
        <Button onClick={resource.reload}>Retry generator settings</Button>
      </div>
    );
  if (resource.loading || !cfg) return <p role="status">Loading generator settings…</p>;
  const toggleMaintenance = () =>
    save("Maintenance", !cfg.Maintenance, cfg.Maintenance ? "Maintenance OFF" : "Maintenance ON");
  const toggleRate = () => save("RateLimit", { ...cfg.RateLimit, enabled: !cfg.RateLimit.enabled });
  const saveHours = () => {
    const n = Number(hours);
    if (!Number.isSafeInteger(n) || n < 1)
      return toast.error("Use a positive whole number of hours.");
    void save("KeyDurationHours", n);
  };
  const addIP = async () => {
    const ip = newIP.trim();
    if (!ip) return;
    if (cfg.IPWhitelist.includes(ip)) return toast.error("Already in list");
    await save("IPWhitelist", [...cfg.IPWhitelist, ip]);
  };
  const removeIP = (ip: string) =>
    save(
      "IPWhitelist",
      cfg.IPWhitelist.filter((x) => x !== ip),
    );

  return (
    <fieldset disabled={busy} className="min-w-0 grid gap-4 lg:grid-cols-2">
      <legend className="sr-only">Generator and app update settings</legend>
      {error && (
        <p role="alert" className="break-words text-destructive lg:col-span-2">
          {error}
        </p>
      )}
      <div className="rounded-2xl border border-border bg-card/60 p-5">
        <h3 className="mb-4 font-display text-lg font-bold">Switches</h3>

        <Toggle
          label="Maintenance mode"
          desc="Blocks /generate-key with 503."
          on={cfg.Maintenance}
          onClick={toggleMaintenance}
          disabled={busy}
          warn
        />
        <div className="my-3 h-px bg-border/50" />
        <Toggle
          label="Rate limiting"
          desc="Throttle key generation per IP."
          on={cfg.RateLimit.enabled}
          onClick={toggleRate}
          disabled={busy}
        />

        <div className="my-5 h-px bg-border/50" />

        <label htmlFor="owner-key-duration" className="text-sm font-semibold">
          Key duration (hours)
        </label>
        <p className="mb-2 text-xs text-muted-foreground">
          Default lifetime for newly generated keys.
        </p>
        <div className="flex gap-2">
          <Input
            id="owner-key-duration"
            type="number"
            min="1"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
          />
          <Button
            onClick={saveHours}
            disabled={busy}
            style={{ background: "var(--gradient-primary)" }}
          >
            Save
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 p-5">
        <h3 className="mb-1 font-display text-lg font-bold">IP whitelist</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          IPs bypass rate limits. Empty = no whitelist.
        </p>
        <div className="flex gap-2">
          <Input
            placeholder="1.2.3.4"
            aria-label="IP whitelist address"
            value={newIP}
            onChange={(e) => setNewIP(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addIP()}
          />
          <Button onClick={addIP} disabled={busy} aria-label="Add IP whitelist address">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <ul className="mt-4 space-y-1.5">
          {cfg.IPWhitelist.length === 0 && (
            <li className="text-xs text-muted-foreground">No IPs whitelisted.</li>
          )}
          {cfg.IPWhitelist.map((ip) => (
            <li
              key={ip}
              className="flex items-center justify-between rounded-md border border-border px-3 py-1.5 text-sm"
            >
              <span className="font-mono">{ip}</span>
              <button
                onClick={() => removeIP(ip)}
                aria-label={`Remove ${ip} from IP whitelist`}
                className="text-muted-foreground hover:text-red-400"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {upd && (
        <div className="rounded-2xl border border-border bg-card/60 p-5 lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <ArrowUpCircle className="h-5 w-5 text-primary-ink" />
            <h3 className="font-display text-lg font-bold">App Update System</h3>
          </div>

          <Toggle
            label="Force update enabled"
            desc="When on, the app prompts users to update."
            on={upd.Enabled}
            onClick={() => setU("Enabled", !upd.Enabled)}
            disabled={busy}
            warn
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Labeled label="Target version code">
              <Input
                type="number"
                min="0"
                value={String(upd.VersionCode)}
                onChange={(e) => setU("VersionCode", parseInt(e.target.value) || 0)}
              />
            </Labeled>
            <Labeled label="Version name">
              <Input
                value={upd.VersionName}
                onChange={(e) => setU("VersionName", e.target.value)}
                placeholder="1.12.58"
              />
            </Labeled>
            <Labeled label="Dialog title">
              <Input
                value={upd.Title}
                onChange={(e) => setU("Title", e.target.value)}
                placeholder="Update Available"
              />
            </Labeled>
            <Labeled label="Dialog subtitle">
              <Input
                value={upd.Subtitle}
                onChange={(e) => setU("Subtitle", e.target.value)}
                placeholder="v4.5 • Critical Patch"
              />
            </Labeled>
          </div>

          <div className="mt-4">
            <Labeled label="What's new (use • for bullets)">
              <textarea
                value={upd.WhatsNew}
                onChange={(e) => setU("WhatsNew", e.target.value)}
                rows={4}
                placeholder={"• Upgrading game servers\n• Fixing login issues"}
                className="w-full resize-y rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
              />
            </Labeled>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Labeled label="Update URL">
              <Input
                value={upd.UpdateUrl}
                onChange={(e) => setU("UpdateUrl", e.target.value)}
                placeholder="https://..."
              />
            </Labeled>
            <Labeled label="Button text">
              <Input
                value={upd.BtnText}
                onChange={(e) => setU("BtnText", e.target.value)}
                placeholder="UPDATE"
              />
            </Labeled>
          </div>

          <div className="mt-5 flex justify-end">
            <Button
              onClick={saveUpdate}
              disabled={busy}
              style={{ background: "var(--gradient-primary)" }}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save update settings"}
            </Button>
          </div>
        </div>
      )}
    </fieldset>
  );
}

function Labeled({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Toggle({
  label,
  desc,
  on,
  onClick,
  disabled,
  warn,
}: {
  label: string;
  desc: string;
  on: boolean;
  onClick: () => void;
  disabled?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-sm font-semibold">
          {warn && on && <AlertTriangle className="h-4 w-4 text-amber-400" />}
          {label}
        </div>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-label={label}
        aria-checked={on}
        onClick={onClick}
        disabled={disabled}
        className="touch-target relative inline-flex h-11 w-11 shrink-0 items-center justify-center disabled:opacity-50"
      >
        <span
          className={`relative block h-6 w-11 rounded-full transition ${on ? "bg-primary" : "bg-muted"}`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${on ? "left-5" : "left-0.5"}`}
          />
        </span>
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
    try {
      setLogs(await listGenerationLogs(200));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    reload();
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? logs.filter(
        (l) =>
          l.key.toLowerCase().includes(q) ||
          l.ip.toLowerCase().includes(q) ||
          l.fingerprint.toLowerCase().includes(q),
      )
    : logs;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search key / IP / fingerprint"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-primary-ink" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">No logs.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">When</th>
                <th className="py-2 pr-3">Key</th>
                <th className="py-2 pr-3">IP</th>
                <th className="py-2 pr-3">Fingerprint</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-t border-border/40">
                  <td className="py-2 pr-3 text-xs text-muted-foreground">
                    {l.time ? new Date(l.time * 1000).toLocaleString() : "—"}
                  </td>
                  <td className="py-2 pr-3 font-mono text-primary-ink">{l.key}</td>
                  <td className="py-2 pr-3 font-mono text-xs">{l.ip || "—"}</td>
                  <td className="py-2 pr-3 font-mono text-xs text-muted-foreground">
                    {l.fingerprint ? l.fingerprint.slice(0, 16) + "…" : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ============================================================
// App tab — legacy login dialog + links + API. DEX controls use the DEX tab.
// Supabase-backed app configuration. Mobile-friendly.
// ============================================================
const AX_INPUT =
  "w-full rounded-lg bg-background/70 border border-border px-3 py-2 text-sm outline-none focus:border-primary";
const AX_BTN =
  "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-primary-foreground";
const AX_GHOST =
  "inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:border-primary";
const AX_CARD = "rounded-2xl border border-border bg-card/60 backdrop-blur p-4 sm:p-5 space-y-4";
const AX_HEAD = "flex items-center gap-2 text-base sm:text-lg font-semibold text-primary-ink";

function AxField(props: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  placeholder?: string;
  secret?: boolean;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{props.label}</span>
      <input
        type={props.secret ? "password" : "text"}
        className={AX_INPUT}
        value={props.value || ""}
        placeholder={props.placeholder}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}

function AppExtrasPanel() {
  return (
    <div className="space-y-6">
      <AxAppConfig />
    </div>
  );
}

/* ---- App Config (in-app dialog + app links + API) ---- */
async function readLegacyAppSettings(signal: AbortSignal) {
  const rows = await readOwnerConfig(
    ["Title", "Subtitle", "TutorialUrl", "Texts", "Links", "Api"],
    signal,
  );
  for (const id of ["Title", "Subtitle", "TutorialUrl"])
    if (rows[id] != null && typeof rows[id] !== "string")
      throw new Error("Invalid saved app settings.");
  for (const id of ["Texts", "Links", "Api"])
    if (
      rows[id] != null &&
      (typeof rows[id] !== "object" ||
        Array.isArray(rows[id]) ||
        Object.values(rows[id] as object).some((v) => typeof v !== "string"))
    )
      throw new Error("Invalid saved app settings.");
  return rows;
}

function AxAppConfig() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [tutorial, setTutorial] = useState("");
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [links, setLinks] = useState<Record<string, string>>({});
  const [api, setApi] = useState<Record<string, string>>({});
  const resource = useOwnerResource(readLegacyAppSettings);
  const snapshot = useRef<Record<string, unknown>>({});
  const { saving: busy, error, run } = useOwnerMutation();
  useEffect(() => {
    if (!resource.data) return;
    const rows = resource.data;
    snapshot.current = rows;
    setTitle((rows.Title ?? "") as string);
    setSubtitle((rows.Subtitle ?? "") as string);
    setTutorial((rows.TutorialUrl ?? "") as string);
    setTexts((rows.Texts ?? {}) as Record<string, string>);
    setLinks((rows.Links ?? {}) as Record<string, string>);
    setApi((rows.Api ?? {}) as Record<string, string>);
  }, [resource.data]);

  const link = (k: string) => links[k] || "";
  const setLink = (k: string, v: string) => setLinks((p) => ({ ...p, [k]: v }));
  const setText = (k: string, v: string) => setTexts((p) => ({ ...p, [k]: v }));
  const setApiF = (k: string, v: string) => setApi((p) => ({ ...p, [k]: v }));

  const save = () =>
    run(async (signal) => {
      let confirmed = 0;
      try {
        for (const [id, value] of Object.entries({
          Title: title,
          Subtitle: subtitle,
          TutorialUrl: tutorial,
          Texts: texts,
          Links: links,
          Api: api,
        })) {
          await saveOwnerSetting("app_config", id, value, snapshot.current[id], signal);
          snapshot.current = { ...snapshot.current, [id]: value };
          confirmed++;
        }
        toast.success("App config saved");
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Save was not confirmed.";
        throw new Error(
          `${message} ${confirmed} of 6 setting saves confirmed. Your draft is retained; check saved values before retrying.`,
        );
      }
    });
  if (resource.error)
    return (
      <div role="alert">
        <p>{resource.error}</p>
        <Button onClick={resource.reload}>Retry app settings</Button>
      </div>
    );
  if (resource.loading) return <p role="status">Loading app settings…</p>;

  return (
    <fieldset disabled={busy} className={`min-w-0 ${AX_CARD}`}>
      <legend className="sr-only">App configuration</legend>
      {error && (
        <p role="alert" className="break-words text-destructive">
          {error}
        </p>
      )}
      <div className={AX_HEAD}>
        <Settings2 className="h-5 w-5" /> App Config{" "}
        <span className="text-xs sm:text-sm text-muted-foreground">(in-app dialog)</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AxField label="Dialog Title" value={title} onChange={setTitle} />
        <AxField label="Dialog Subtitle" value={subtitle} onChange={setSubtitle} />
        <AxField
          label="Tutorial URL"
          value={tutorial}
          onChange={setTutorial}
          placeholder="https://..."
        />
        <AxField
          label="Get-Key Button Text"
          value={texts.BtnKey || ""}
          onChange={(v) => setText("BtnKey", v)}
        />
        <AxField
          label="Tutorial Button Text"
          value={texts.BtnTutorial || ""}
          onChange={(v) => setText("BtnTutorial", v)}
        />
      </div>
      <div className="flex items-center gap-2 pt-2 text-xs font-semibold text-primary-ink/80">
        <Link2 className="h-4 w-4" /> App Links
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AxField
          label="Get Key"
          value={link("GetKey")}
          onChange={(v) => setLink("GetKey", v)}
          placeholder="https://..."
        />
        <AxField
          label="Admin (Telegram)"
          value={link("Admin")}
          onChange={(v) => setLink("Admin", v)}
        />
        <AxField label="Info Link" value={link("Info")} onChange={(v) => setLink("Info", v)} />
        <AxField
          label="Info Text"
          value={link("InfoText")}
          onChange={(v) => setLink("InfoText", v)}
        />
        <AxField
          label="Instagram"
          value={link("Instagram")}
          onChange={(v) => setLink("Instagram", v)}
        />
        <AxField
          label="Telegram"
          value={link("Telegram")}
          onChange={(v) => setLink("Telegram", v)}
        />
        <AxField label="YouTube" value={link("Youtube")} onChange={(v) => setLink("Youtube", v)} />
        <AxField
          label="WhatsApp"
          value={link("Whatsapp")}
          onChange={(v) => setLink("Whatsapp", v)}
        />
      </div>
      <div className="pt-2 text-xs font-semibold text-primary-ink/80">Generator API</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <AxField
          label="API Base URL"
          value={api.BaseUrl || ""}
          onChange={(v) => setApiF("BaseUrl", v)}
        />
        <AxField
          label="API Token"
          secret
          value={api.Token || ""}
          onChange={(v) => setApiF("Token", v)}
        />
        <AxField
          label="Dest Base"
          value={api.DestBase || ""}
          onChange={(v) => setApiF("DestBase", v)}
        />
      </div>
      <button
        type="button"
        className={AX_BTN}
        style={{ background: "var(--gradient-primary)" }}
        disabled={busy}
        onClick={save}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
        App Config
      </button>
    </fieldset>
  );
}
