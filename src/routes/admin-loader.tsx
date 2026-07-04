import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Shield, Loader2, RefreshCw, Upload, Ban, ShieldCheck, LogOut, KeyRound,
  AlertTriangle, X, Trash2, FileUp,
} from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  getAdminKey, setAdminKey,
  listDevices, uploadPayload, banDevice, unbanDevice,
  type ListDevicesResult, type UploadPayloadArgs,
} from "@/lib/dgWorker";
import {
  onAdminAuthChanged, signInAdmin, signOutAdmin, listBannedDevices,
  type BannedDevice,
} from "@/lib/dgFirebase";
import type { User } from "firebase/auth";

export const Route = createFileRoute("/admin-loader")({
  ssr: false,
  head: () => ({ meta: [{ title: "OTA Loader — Dynamon Universe" }] }),
  component: LoaderGate,
});

// ---------- Firebase admin sign-in gate ----------

function LoaderGate() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => onAdminAuthChanged((u) => { setUser(u); setReady(true); }), []);

  if (!ready) {
    return (
      <PageShell>
        <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      </PageShell>
    );
  }
  if (!user) return <SignInScreen />;
  return <LoaderShell user={user} />;
}

function SignInScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try { await signInAdmin(email, password); toast.success("Signed in"); }
    catch (err) { toast.error((err as Error).message || "Sign-in failed"); }
    finally { setBusy(false); }
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-md py-16">
        <div className="rounded-2xl border border-primary/20 bg-card/60 p-8 backdrop-blur-xl glow-primary">
          <div className="mb-6 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
              <Shield className="h-7 w-7" />
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold">OTA Loader</h1>
            <p className="mt-1 text-sm text-muted-foreground">Sign in with your Firebase admin account.</p>
          </div>
          <form onSubmit={submit} className="space-y-3">
            <Input type="email" placeholder="admin@email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" disabled={busy} className="w-full" style={{ background: "var(--gradient-primary)" }}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Sign in
            </Button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}

// ---------- Admin Key (worker X-Admin) gate ----------

function LoaderShell({ user }: { user: User }) {
  const [adminKey, setKey] = useState<string>(getAdminKey());

  const saveKey = (k: string) => {
    setAdminKey(k);
    setKey(k);
    toast.success("Admin key saved for this session");
  };

  return (
    <PageShell>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">OTA Loader</h1>
          <p className="text-sm text-muted-foreground">Manage current build, payloads, and device bans via the License Worker.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-muted-foreground sm:inline">{user.email}</span>
          <Button variant="outline" size="sm" onClick={() => signOutAdmin()}>
            <LogOut className="mr-2 h-4 w-4" />Sign out
          </Button>
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
          Enter the License Worker admin key above to enable actions. The key is stored only in this browser session (sessionStorage).
        </div>
      )}
    </PageShell>
  );
}

function AdminKeyCard({ current, onSave }: { current: string; onSave: (k: string) => void }) {
  const [v, setV] = useState(current);
  useEffect(() => { setV(current); }, [current]);

  return (
    <div className="rounded-2xl border border-primary/20 bg-card/60 p-5 glow-primary">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-primary" />
        <h3 className="font-display text-base font-bold">License Worker admin key</h3>
        {current && <span className="ml-auto rounded-full border border-green-400/40 px-2 py-0.5 text-[11px] text-green-300">Saved</span>}
      </div>
      <p className="mt-1 mb-3 text-xs text-muted-foreground">Sent as <code className="font-mono">X-Admin</code> on every Worker call. Session-only.</p>
      <div className="flex gap-2">
        <Input type="password" placeholder="Paste admin key" value={v} onChange={(e) => setV(e.target.value)} />
        <Button onClick={() => onSave(v.trim())} disabled={!v.trim()} style={{ background: "var(--gradient-primary)" }}>Save</Button>
        {current && <Button variant="outline" onClick={() => onSave("")}><Trash2 className="h-4 w-4" /></Button>}
      </div>
    </div>
  );
}

// ---------- 1) Devices ----------

function DevicesPanel({ onAuthFail }: { onAuthFail: () => void }) {
  const [data, setData] = useState<ListDevicesResult | null>(null);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      const r = await listDevices();
      setData(r);
    } catch (e) {
      const msg = (e as Error).message;
      if (/401|403|unauthor|forbidden/i.test(msg)) { toast.error("Admin key rejected — re-enter it"); onAuthFail(); }
      else toast.error(msg);
    } finally { setLoading(false); }
  };
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold">Current build & devices</h3>
          {data && (
            <p className="text-xs text-muted-foreground">
              Current build: <span className="font-mono text-primary">{String(data.current_build ?? "—")}</span>
              {" · "}{data.active?.length ?? 0} active
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {!data ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : data.active.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No active devices.</p>
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
                    <td className="py-2 pr-3 font-mono text-[11px]">{d.fp}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{String(build)}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{formatMaybeTime(last)}</td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full border border-green-400/40 px-2 py-0.5 text-[11px] text-green-300">{status}</span>
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
    build: "", ct_b64: "", iv_b64: "", sig_b64: "", key_b64: "", ct_sha: "",
  });
  const [busy, setBusy] = useState(false);

  const upd = (k: keyof UploadPayloadArgs, v: string) => setForm(f => ({ ...f, [k]: v }));

  const readFileTo = async (k: keyof UploadPayloadArgs, file: File) => {
    const text = (await file.text()).trim();
    upd(k, text);
    toast.success(`Loaded ${file.name} into ${k}`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    for (const k of Object.keys(form) as (keyof UploadPayloadArgs)[]) {
      if (!String(form[k]).trim()) return toast.error(`Missing ${k}`);
    }
    setBusy(true);
    try {
      const r = await uploadPayload(form);
      toast.success(`Uploaded build ${form.build}`);
      console.log("uploadPayload response", r);
    } catch (err) {
      const msg = (err as Error).message;
      if (/401|403|unauthor|forbidden/i.test(msg)) { toast.error("Admin key rejected — re-enter it"); onAuthFail(); }
      else toast.error(msg);
    } finally { setBusy(false); }
  };

  const Field = ({ k, label, rows = 3 }: { k: keyof UploadPayloadArgs; label: string; rows?: number }) => (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
        <label className="inline-flex cursor-pointer items-center gap-1 text-[11px] text-muted-foreground hover:text-primary">
          <FileUp className="h-3 w-3" /> Load file
          <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && readFileTo(k, e.target.files[0])} />
        </label>
      </div>
      <Textarea rows={rows} value={String(form[k])} onChange={(e) => upd(k, e.target.value)} className="font-mono text-xs" />
    </div>
  );

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <h3 className="mb-1 font-display text-lg font-bold">Upload OTA payload</h3>
      <p className="mb-4 text-xs text-muted-foreground">Pushes a new encrypted build to <code className="font-mono">/admin/upload-payload</code>.</p>

      <form onSubmit={submit} className="grid gap-4">
        <div>
          <label className="text-xs font-semibold text-muted-foreground">Build</label>
          <Input className="mt-1" placeholder="e.g. 42 or 1.2.3" value={String(form.build)} onChange={(e) => upd("build", e.target.value)} />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field k="ct_b64" label="ct_b64 (ciphertext)" rows={4} />
          <Field k="iv_b64" label="iv_b64" rows={4} />
          <Field k="sig_b64" label="sig_b64" rows={4} />
          <Field k="key_b64" label="key_b64" rows={4} />
        </div>
        <Field k="ct_sha" label="ct_sha (hex)" rows={2} />

        <div className="flex justify-end">
          <Button type="submit" disabled={busy} style={{ background: "var(--gradient-primary)" }}>
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload payload
          </Button>
        </div>
      </form>
    </div>
  );
}

// ---------- 3) Ban manager ----------

function BanPanel({ onAuthFail }: { onAuthFail: () => void }) {
  const [banFp, setBanFp] = useState("");
  const [banReason, setBanReason] = useState("");
  const [unbanFp, setUnbanFp] = useState("");
  const [busy, setBusy] = useState(false);
  const [banned, setBanned] = useState<BannedDevice[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = async () => {
    setLoading(true);
    try { setBanned(await listBannedDevices()); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const handleErr = (e: unknown) => {
    const msg = (e as Error).message;
    if (/401|403|unauthor|forbidden/i.test(msg)) { toast.error("Admin key rejected — re-enter it"); onAuthFail(); }
    else toast.error(msg);
  };

  const doBan = async (e: React.FormEvent) => {
    e.preventDefault();
    const fp = banFp.trim();
    const reason = banReason.trim();
    if (!fp || !reason) return toast.error("Fingerprint and reason are required");
    if (!window.confirm(`Ban device\n${fp}\nReason: ${reason}?`)) return;
    setBusy(true);
    try { await banDevice(fp, reason); toast.success("Banned"); setBanFp(""); setBanReason(""); await reload(); }
    catch (e2) { handleErr(e2); }
    finally { setBusy(false); }
  };

  const doUnban = async (fp: string) => {
    if (!fp) return;
    if (!window.confirm(`Unban ${fp}?`)) return;
    setBusy(true);
    try { await unbanDevice(fp); toast.success("Unbanned"); setUnbanFp(""); await reload(); }
    catch (e) { handleErr(e); }
    finally { setBusy(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg font-bold">Ban manager</h3>
          <p className="text-xs text-muted-foreground">Block or restore device fingerprints.</p>
        </div>
        <Button variant="outline" size="sm" onClick={reload} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <form onSubmit={doBan} className="rounded-xl border border-red-400/20 bg-red-400/5 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-red-200"><Ban className="h-4 w-4" />Ban device</h4>
          <Input placeholder="Fingerprint" value={banFp} onChange={(e) => setBanFp(e.target.value)} className="mb-2 font-mono text-xs" />
          <Input placeholder="Reason" value={banReason} onChange={(e) => setBanReason(e.target.value)} className="mb-3" />
          <Button type="submit" disabled={busy} className="w-full bg-red-500 hover:bg-red-600">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Ban className="mr-2 h-4 w-4" />}Ban
          </Button>
        </form>

        <form onSubmit={(e) => { e.preventDefault(); doUnban(unbanFp.trim()); }} className="rounded-xl border border-green-400/20 bg-green-400/5 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-green-200"><ShieldCheck className="h-4 w-4" />Unban device</h4>
          <Input placeholder="Fingerprint" value={unbanFp} onChange={(e) => setUnbanFp(e.target.value)} className="mb-3 font-mono text-xs" />
          <Button type="submit" disabled={busy} className="w-full bg-green-600 hover:bg-green-700">
            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}Unban
          </Button>
        </form>
      </div>

      <div className="mt-6">
        <h4 className="mb-2 text-sm font-bold">Banned devices</h4>
        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
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
                    <td className="py-2 pr-3 font-mono text-[11px]">{b.fingerprint}</td>
                    <td className="py-2 pr-3 text-xs">{b.reason || "—"}</td>
                    <td className="py-2 pr-3 text-xs text-muted-foreground">{formatMaybeTime(b.time)}</td>
                    <td className="py-2 pr-3 text-right">
                      <button onClick={() => doUnban(b.fingerprint)} disabled={busy}
                        className="inline-flex items-center gap-1 rounded-md border border-green-400/40 px-2 py-1 text-[11px] text-green-300 hover:bg-green-400/10 disabled:opacity-50">
                        <X className="h-3 w-3" />Unban
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
