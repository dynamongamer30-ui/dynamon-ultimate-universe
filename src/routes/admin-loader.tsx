import { useOwnerResource } from "@/hooks/useOwnerResource";
import { useOwnerMutation } from "@/hooks/useOwnerMutation";
import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Loader2,
  RefreshCw,
  Upload,
  Ban,
  KeyRound,
  ShieldCheck,
  AlertTriangle,
  X,
  Trash2,
  FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminKey,
  setAdminKey,
  listDevices,
  uploadPayload,
  banDevice,
  unbanDevice,
  type UploadPayloadArgs,
} from "@/lib/dgWorker";
import { listBannedDevices } from "@/lib/dgData";
import { useConfirm } from "@/hooks/useConfirm";

export const Route = createFileRoute("/admin-loader")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "OTA Loader — Dynamon Universe" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LoaderGate,
});

// ---------- Owner gate (Google login) ----------

function LoaderGate() {
  return (
    <OwnerGate>
      <LoaderShell />
    </OwnerGate>
  );
}

// ---------- Admin Key (worker X-Admin) gate ----------

function LoaderShell() {
  const { user } = useAuth();
  const [adminKey, setKey] = useState<string>(getAdminKey());

  const saveKey = (k: string) => {
    if (!setAdminKey(k)) {
      toast.error("Could not save the admin key in this browser session.");
      return;
    }
    setKey(k);
    toast.success("Admin key saved for this session");
  };

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">OTA Loader</h1>
          <p className="text-sm text-muted-foreground">
            Manage current build, payloads, and device bans via the License Worker.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
        </div>
      </div>

      <AdminKeyCard current={adminKey} onSave={saveKey} />

      {adminKey ? (
        <div className="mt-6 grid gap-6">
          <DevicesPanel onAuthFail={() => setKey("")} />
          <UploadPayloadPanel onAuthFail={() => setKey("")} />
          <BanPanel onAuthFail={() => setKey("")} />
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 text-sm text-amber-200">
          <AlertTriangle className="mb-2 h-5 w-5" />
          Enter the License Worker admin key above to enable actions. The key is stored only in this
          browser session (sessionStorage).
        </div>
      )}
    </PageShell>
  );
}

function AdminKeyCard({ current, onSave }: { current: string; onSave: (k: string) => void }) {
  const [v, setV] = useState(current);
  useEffect(() => {
    setV(current);
  }, [current]);

  return (
    <div className="rounded-2xl border border-primary/20 bg-card/60 p-5 glow-primary">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary-ink" />
        <h3 className="font-display text-base font-bold">License Worker admin key</h3>
        {current && (
          <span className="ml-auto rounded-full border border-green-400/40 px-2 py-0.5 text-xs text-green-300">
            Saved
          </span>
        )}
      </div>
      <p className="mt-1 mb-3 text-xs text-muted-foreground">
        Sent as <code className="font-mono">X-Admin</code> on every Worker call. Session-only.
      </p>
      <div className="flex gap-2">
        <Input
          type="password"
          aria-label="License Worker admin key"
          placeholder="Paste admin key"
          value={v}
          onChange={(e) => setV(e.target.value)}
        />
        <Button
          onClick={() => onSave(v.trim())}
          disabled={!v.trim()}
          style={{ background: "var(--gradient-primary)" }}
        >
          Save
        </Button>
        {current && (
          <Button variant="outline" aria-label="Clear admin key" onClick={() => onSave("")}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ---------- 1) Devices ----------

function DevicesPanel(_props: { onAuthFail: () => void }) {
  const resource = useOwnerResource(useCallback((signal: AbortSignal) => listDevices(signal), []));
  const data = resource.data,
    loading = resource.loading,
    reload = resource.reload;

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Current build & devices</h3>
          {data && (
            <p className="text-xs text-muted-foreground">
              Current build:{" "}
              <span className="font-mono text-primary-ink">
                {String(data.current_build ?? "—")}
              </span>
              {" · "}
              {data.presence_disabled
                ? "Live tracking disabled"
                : `${data.active?.length ?? 0} active`}
            </p>
          )}
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

      {resource.error ? (
        <p role="alert" className="break-words text-sm text-destructive">
          {resource.error} Use Refresh to retry.
        </p>
      ) : !data ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary-ink" />
        </div>
      ) : data.active.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          {data.presence_disabled
            ? "Live device tracking is disabled to avoid heartbeat traffic. This does not mean nobody is playing."
            : "No active devices."}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="py-2 pr-3">Fingerprint</th>
                <th className="py-2 pr-3">Build</th>
                <th className="py-2 pr-3">Last seen</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.active.map((d, i) => {
                const last = d.last_seen ?? d.lastSeen ?? d.time ?? d.ts;
                const build = d.build ?? d.current_build ?? "—";
                const status = String(d.status ?? "active");
                return (
                  <tr key={`${d.fp}-${i}`} className="border-t border-border/40">
                    <td className="py-2 pr-3 font-mono text-xs">{d.fp}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{String(build)}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {formatMaybeTime(last)}
                    </td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full border border-green-400/40 px-2 py-0.5 text-xs text-green-300">
                        {status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function formatMaybeTime(v: unknown): string {
  if (v == null) return "—";
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return String(v);
  const ms = n > 1e12 ? n : n * 1000;
  return new Date(ms).toLocaleString();
}

// ---------- 2) Upload payload ----------

function UploadPayloadPanel({ onAuthFail }: { onAuthFail: () => void }) {
  const [form, setForm] = useState<UploadPayloadArgs>({
    build: "",
    ct_b64: "",
    iv_b64: "",
    sig_b64: "",
    key_b64: "",
    ct_sha: "",
    protocol: 2,
    issued: "",
    min_client: 3,
    meta_sig_b64: "",
  });
  const mutation = useOwnerMutation();
  const busy = mutation.saving;
  const fileRevision = useRef(0);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  const upd = (k: keyof UploadPayloadArgs, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const readFileTo = async (k: keyof UploadPayloadArgs, file: File) => {
    const revision = ++fileRevision.current;
    let text: string;
    try {
      text = (await file.text()).trim();
    } catch {
      if (active.current) toast.error("Could not read this file. Your draft is unchanged.");
      return;
    }
    if (!active.current || revision !== fileRevision.current || busy) return;
    if (file.name.toLowerCase().endsWith(".json")) {
      try {
        const payload = JSON.parse(text) as Partial<Record<keyof UploadPayloadArgs, unknown>>;
        const fields: (keyof UploadPayloadArgs)[] = [
          "build",
          "ct_b64",
          "iv_b64",
          "sig_b64",
          "key_b64",
          "ct_sha",
          "protocol",
          "issued",
          "min_client",
          "meta_sig_b64",
        ];
        const missing = fields.filter(
          (field) => payload[field] == null || String(payload[field]).trim() === "",
        );
        if (missing.length > 0) {
          toast.error(`Invalid payload bundle — missing ${missing.join(", ")}`);
          return;
        }
        setForm((current) => ({
          ...current,
          build: String(payload.build),
          ct_b64: String(payload.ct_b64),
          iv_b64: String(payload.iv_b64),
          sig_b64: String(payload.sig_b64),
          key_b64: String(payload.key_b64),
          ct_sha: String(payload.ct_sha),
          protocol: Number(payload.protocol),
          issued: Number(payload.issued),
          min_client: Number(payload.min_client),
          meta_sig_b64: String(payload.meta_sig_b64),
        }));
        toast.success(`Loaded payload bundle ${file.name}`);
        return;
      } catch {
        toast.error(`${file.name} is not valid JSON`);
        return;
      }
    }
    upd(k, text);
    toast.success(`Loaded ${file.name} into ${k}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const k of Object.keys(form) as (keyof UploadPayloadArgs)[]) {
      if (!String(form[k]).trim()) return toast.error(`Missing ${k}`);
    }
    await mutation.run(async (signal) => {
      try {
        const r = await uploadPayload(form, signal);
        toast.success(`Uploaded build ${form.build}`);
        void r;
      } catch (err) {
        const msg = (err as Error).message;
        if (/401|403|unauthor|forbidden/i.test(msg)) {
          toast.error("Admin key rejected — re-enter it");
          onAuthFail();
        }
        throw err;
      }
    });
  };

  const field = ({
    k,
    label,
    rows = 3,
  }: {
    k: keyof UploadPayloadArgs;
    label: string;
    rows?: number;
  }) => (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        <label className="inline-flex cursor-pointer items-center gap-1 text-xs text-muted-foreground hover:text-primary-ink">
          <FileUp className="h-3 w-3" /> Load file
          <input
            type="file"
            aria-label={`Load ${label}`}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void readFileTo(k, file);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <Textarea
        aria-label={label}
        rows={rows}
        value={String(form[k])}
        onChange={(e) => upd(k, e.target.value)}
        className="font-mono text-xs"
      />
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <h3 className="mb-1 font-display text-lg font-bold">Upload OTA payload</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Pushes a new encrypted build to <code className="font-mono">/admin/upload-payload</code>.
      </p>

      {mutation.error && (
        <p role="alert" className="mb-4 break-words text-sm text-destructive">
          {mutation.error}
        </p>
      )}
      <form onSubmit={submit}>
        <fieldset disabled={busy} aria-busy={busy} className="grid min-w-0 gap-4">
          <legend className="sr-only">OTA payload upload</legend>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Build</label>
            <Input
              className="mt-1"
              placeholder="e.g. 42 or 1.2.3"
              aria-label="Payload build"
              value={String(form.build)}
              onChange={(e) => upd("build", e.target.value)}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {field({ k: "ct_b64", label: "ct_b64 (ciphertext)", rows: 4 })}
            {field({ k: "iv_b64", label: "iv_b64", rows: 4 })}
            {field({ k: "sig_b64", label: "sig_b64", rows: 4 })}
            {field({ k: "key_b64", label: "key_b64", rows: 4 })}
          </div>
          {field({ k: "ct_sha", label: "ct_sha (hex)", rows: 2 })}
          {field({ k: "meta_sig_b64", label: "Metadata signature (meta_sig_b64)", rows: 2 })}
          <div className="grid gap-4 sm:grid-cols-3">
            {field({ k: "protocol", label: "Protocol (2)", rows: 1 })}
            {field({ k: "min_client", label: "Minimum client (3)", rows: 1 })}
            {field({ k: "issued", label: "Issued (Unix seconds)", rows: 1 })}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={busy} style={{ background: "var(--gradient-primary)" }}>
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload payload
            </Button>
          </div>
        </fieldset>
      </form>
    </div>
  );
}

// ---------- 3) Ban manager ----------

function BanPanel({ onAuthFail }: { onAuthFail: () => void }) {
  const confirm = useConfirm();
  const confirming = useRef(false);
  const [banFp, setBanFp] = useState("");
  const [banReason, setBanReason] = useState("");
  const [unbanFp, setUnbanFp] = useState("");
  const mutation = useOwnerMutation();
  const busy = mutation.saving;
  const resource = useOwnerResource(
    useCallback((signal: AbortSignal) => listBannedDevices(signal), []),
  );
  const banned = resource.data ?? [],
    loading = resource.loading,
    reload = resource.reload;
  const handleErr = (e: unknown) => {
    const msg = (e as Error).message;
    if (/401|403|unauthor|forbidden/i.test(msg)) {
      toast.error("Admin key rejected — re-enter it");
      onAuthFail();
    } else toast.error(msg);
  };

  const doBan = async (e: React.FormEvent) => {
    e.preventDefault();
    const fp = banFp.trim();
    const reason = banReason.trim();
    if (!fp || !reason) return toast.error("Fingerprint and reason are required");
    if (busy || confirming.current) return;
    confirming.current = true;
    try {
      if (
        !(await confirm({
          title: "Ban device",
          description: `Ban device\n${fp}\nReason: ${reason}`,
          confirmText: "Ban",
          danger: true,
        }))
      )
        return;
      await mutation.run(async (signal) => {
        try {
          await banDevice(fp, reason, signal);
          toast.success("Banned");
          setBanFp("");
          setBanReason("");
          reload();
        } catch (e2) {
          handleErr(e2);
          throw e2;
        }
      });
    } finally {
      confirming.current = false;
    }
  };

  const doUnban = async (fp: string) => {
    if (!fp) return;
    if (busy || confirming.current) return;
    confirming.current = true;
    try {
      if (
        !(await confirm({
          title: "Unban device",
          description: `Unban ${fp}?`,
          confirmText: "Unban",
        }))
      )
        return;
      await mutation.run(async (signal) => {
        try {
          await unbanDevice(fp, signal);
          toast.success("Unbanned");
          setUnbanFp("");
          reload();
        } catch (e) {
          handleErr(e);
          throw e;
        }
      });
    } finally {
      confirming.current = false;
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">Ban manager</h3>
          <p className="text-xs text-muted-foreground">Block or restore device fingerprints.</p>
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

      {mutation.error && (
        <p role="alert" className="mb-4 break-words text-sm text-destructive">
          {mutation.error}
        </p>
      )}
      <fieldset disabled={busy} aria-busy={busy} className="grid min-w-0 gap-4 md:grid-cols-2">
        <legend className="sr-only">Device ban management</legend>
        <form onSubmit={doBan} className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-red-200">
            <Ban className="h-4 w-4" />
            Ban device
          </h4>
          <Input
            placeholder="Fingerprint"
            aria-label="Device fingerprint"
            value={banFp}
            onChange={(e) => setBanFp(e.target.value)}
            className="mb-2 font-mono text-xs"
          />
          <Input
            placeholder="Reason"
            aria-label="Ban reason"
            value={banReason}
            onChange={(e) => setBanReason(e.target.value)}
            className="mb-3"
          />
          <Button type="submit" disabled={busy} className="w-full bg-red-500 hover:bg-red-600">
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Ban className="mr-2 h-4 w-4" />
            )}
            Ban
          </Button>
        </form>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            doUnban(unbanFp.trim());
          }}
          className="rounded-xl border border-green-400/20 bg-green-400/5 p-4"
        >
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-200">
            <ShieldCheck className="h-4 w-4" />
            Unban device
          </h4>
          <Input
            placeholder="Fingerprint"
            aria-label="Device fingerprint"
            value={unbanFp}
            onChange={(e) => setUnbanFp(e.target.value)}
            className="mb-3 font-mono text-xs"
          />
          <Button type="submit" disabled={busy} className="w-full bg-green-600 hover:bg-green-700">
            {busy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="mr-2 h-4 w-4" />
            )}
            Unban
          </Button>
        </form>
      </fieldset>

      <div className="mt-6">
        <h4 className="mb-2 text-sm font-bold">Banned devices</h4>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-primary-ink" />
          </div>
        ) : banned.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No banned devices.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3">Fingerprint</th>
                  <th className="py-2 pr-3">Reason</th>
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {banned.map((b) => (
                  <tr key={b.fingerprint} className="border-t border-border/40">
                    <td className="py-2 pr-3 font-mono text-xs">{b.fingerprint}</td>
                    <td className="py-2 pr-3 text-xs">{b.reason || "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {formatMaybeTime(b.time)}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      <button
                        onClick={() => doUnban(b.fingerprint)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-md border border-green-400/40 px-2 py-1 text-xs text-green-300 hover:bg-green-400/10 disabled:opacity-50"
                      >
                        <X className="h-3 w-3" />
                        Unban
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
