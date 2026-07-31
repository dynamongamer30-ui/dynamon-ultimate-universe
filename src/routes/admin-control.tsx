import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Shield, Save, Loader2, Eye, EyeOff, Star, ArrowLeft, Settings2, Megaphone, Link2, Image as ImageIcon, Box, KeyRound, Trash2, Upload, Plus, User } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { ThemedSelect } from "@/components/ThemedSelect";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, DEFAULT_BRANDING, DEFAULT_ANNOUNCEMENT, DEFAULT_SOCIALS, type SiteBranding, type Announcement, type Socials, type ModOverride } from "@/hooks/useSiteSettings";
import { useProfile } from "@/hooks/useProfile";
import { useConfirm } from "@/hooks/useConfirm";
import { mods as baseMods } from "@/lib/mods";
import { Cipher } from "@/lib/cipher";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-control")({
  ssr: false,
  head: () => ({ meta: [{ title: "Control Panel — Dynamon Universe" }] }),
  component: ControlRoute,
});

function ControlRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <OwnerGate><ControlPanel /></OwnerGate>;
}

type Tab = "branding" | "announcement" | "socials" | "featured" | "mods" | "security" | "avatars";

function ControlPanel() {
  const { branding, announcement, socials, overrides, refresh } = useSiteSettings();
  const [tab, setTab] = useState<Tab>("branding");


  const tabs: { id: Tab; label: string; icon: typeof Settings2 }[] = [
    { id: "branding", label: "Branding & Hero", icon: Settings2 },
    { id: "announcement", label: "Announcement", icon: Megaphone },
    { id: "socials", label: "Socials", icon: Link2 },
    { id: "featured", label: "Featured Mod", icon: Star },
    { id: "mods", label: "Mods Editor", icon: Box },
    { id: "security", label: "Unlock Timing", icon: Shield },
    { id: "avatars", label: "Avatars", icon: ImageIcon },
  ];

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <Link to="/admin" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
        <Link to="/admin-keys" className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/20">
          <KeyRound className="h-3.5 w-3.5" /> Key System
        </Link>
      </div>
      <header className="mt-4 edge-light rounded-2xl glass p-6 sm:p-10">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <Shield className="h-3.5 w-3.5" /> Owner Control Panel
        </p>
        <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">Edit everything, live.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tune branding, swap socials, push announcements and edit any field on every mod. Changes appear instantly across the site.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t.id ? "text-primary-foreground glow-primary" : "border border-border bg-card/60 text-muted-foreground hover:text-foreground"}`}
            style={tab === t.id ? { background: "var(--gradient-primary)" } : undefined}>
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "branding" && <BrandingEditor initial={branding} onSaved={refresh} />}
        {tab === "announcement" && <AnnouncementEditor initial={announcement} onSaved={refresh} />}
        {tab === "socials" && <SocialsEditor initial={socials} onSaved={refresh} />}
        {tab === "featured" && <FeaturedEditor onSaved={refresh} />}
        {tab === "mods" && <ModsEditor overrides={overrides} onSaved={refresh} />}
        {tab === "security" && <><SecurityEditor /><AccountsEditor /></>}
        {tab === "avatars" && <AvatarsEditor />}
        
      </div>
    </PageShell>
  );
}

// ---------- Generic settings save helper ----------
async function saveSetting(key: string, value: unknown) {
  const { error } = await supabase.from("site_settings").upsert({ key, value: value as never });
  if (error) { toast.error(error.message); return false; }
  toast.success("Saved");
  return true;
}

// app_config uses a different shape (id/data) than site_settings (key/value) —
// this is where redeem_secure_session reads {timer, minTimer} from at runtime.
async function saveAppConfig(id: string, data: unknown) {
  const { error } = await supabase.from("app_config").upsert({ id, data: data as never });
  if (error) { toast.error(error.message); return false; }
  toast.success("Saved");
  return true;
}

// ---------- Avatars ----------
type AvatarRow = {
  id: string;
  url: string;
  gender: "male" | "female";
  label: string | null;
  active: boolean;
  sort_order: number;
};

function AvatarsEditor() {
  const { profile, refresh: refreshProfile } = useProfile();
  const confirm = useConfirm();
  const [rows, setRows] = useState<AvatarRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [customUrl, setCustomUrl] = useState("");
  const [savingCustom, setSavingCustom] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("avatar_pool").select("*").order("sort_order");
    if (error) toast.error(error.message);
    setRows((data ?? []) as AvatarRow[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { setCustomUrl(profile?.custom_avatar_url ?? ""); }, [profile?.custom_avatar_url]);

  const upload = async (file: File, gender: "male" | "female") => {
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${gender}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: false });
    if (upErr) { toast.error(upErr.message); setUploading(false); return; }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: insErr } = await supabase.from("avatar_pool").insert({
      url: pub.publicUrl,
      gender,
      active: true,
      sort_order: rows.length,
    } as never);
    if (insErr) toast.error(insErr.message); else { toast.success("Avatar added"); load(); }
    setUploading(false);
  };

  const updateRow = async (id: string, patch: Partial<AvatarRow>) => {
    const { error } = await supabase.from("avatar_pool").update(patch as never).eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const removeRow = async (id: string) => {
    if (!(await confirm({
      title: "Remove avatar",
      description: "Remove this avatar from the pool?",
      confirmText: "Remove",
      danger: true,
    }))) return;
    const { error } = await supabase.from("avatar_pool").delete().eq("id", id);
    if (error) toast.error(error.message); else load();
  };

  const saveCustomPfp = async () => {
    if (!profile) return;
    setSavingCustom(true);
    const { error } = await supabase.from("profiles").update({ custom_avatar_url: customUrl || null } as never).eq("id", profile.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); refreshProfile(); }
    setSavingCustom(false);
  };

  return (
    <div className="space-y-6">
      <Card title="My profile picture" desc="A custom image just for your account — separate from the shared picker below. Leave blank to use the regular avatar picker on your profile instead.">
        <Field label="Custom avatar URL">
          <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} className={inp} placeholder="https://…" />
        </Field>
        <div className="mt-3 flex items-center gap-3">
          {customUrl && <img src={customUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-primary/40" />}
          <button onClick={saveCustomPfp} disabled={savingCustom}
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}>
            {savingCustom ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />} Save
          </button>
        </div>
      </Card>

      <Card title="Avatar pool" desc="These show up in the picker every user sees, and next to their comments. Upload images (they're stored in your Supabase project, not on an external host) or edit URLs directly.">
        <div className="flex flex-wrap gap-3">
          <UploadButton label="Add male avatar" uploading={uploading} onFile={(f) => upload(f, "male")} />
          <UploadButton label="Add female avatar" uploading={uploading} onFile={(f) => upload(f, "female")} />
        </div>

        {loading ? (
          <Loader2 className="mt-6 h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-3">
                <img src={r.url} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <input value={r.url} onChange={(e) => setRows((prev) => prev.map((x) => x.id === r.id ? { ...x, url: e.target.value } : x))}
                    onBlur={(e) => updateRow(r.id, { url: e.target.value })}
                    className="w-full truncate rounded-lg border border-border bg-background/60 px-2 py-1 text-xs outline-none focus:border-primary" />
                  <div className="flex items-center gap-2 text-xs">
                    <span className="capitalize text-muted-foreground">{r.gender}</span>
                    <button onClick={() => updateRow(r.id, { active: !r.active })}
                      className={`rounded-full px-2 py-0.5 font-semibold ${r.active ? "bg-emerald-500/15 text-emerald-400" : "bg-white/5 text-muted-foreground"}`}>
                      {r.active ? "Active" : "Hidden"}
                    </button>
                  </div>
                </div>
                <button onClick={() => removeRow(r.id)} className="shrink-0 rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No avatars yet — upload some above.</p>}
          </div>
        )}
      </Card>
    </div>
  );
}

function UploadButton({ label, uploading, onFile }: { label: string; uploading: boolean; onFile: (f: File) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
      <button onClick={() => ref.current?.click()} disabled={uploading}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-2 text-sm font-semibold text-foreground hover:bg-card disabled:opacity-60">
        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} {label}
      </button>
    </>
  );
}
const DEFAULT_SECURITY = { timer: 900, minTimer: 45 };
type SecurityConfig = { timer: number; minTimer: number };

function AccountsEditor() {
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [inactive30d, setInactive30d] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: cfg }, { data: stats }] = await Promise.all([
      supabase.from("app_config").select("data").eq("id", "AccountDeletion").maybeSingle(),
      (supabase as unknown as { rpc: (fn: string) => Promise<{ data: { total_users: number; inactive_30d: number }[] | null }> })
        .rpc("admin_account_stats"),
    ]);
    const d = cfg?.data as { enabled?: boolean } | undefined;
    setEnabled(d?.enabled !== false);
    const row = stats?.[0];
    setTotalUsers(row?.total_users ?? null);
    setInactive30d(row?.inactive_30d ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <Card title="Accounts"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Card>;

  return (
    <Card
      title="Accounts"
      desc="Signed-up users, and whether inactive accounts (30+ days with no visit or sign-in) get auto-deleted."
    >
      <Grid>
        <Field label="Total signed-up users">
          <div className={`${inp} flex items-center font-mono text-lg font-bold text-primary`}>{totalUsers}</div>
        </Field>
        <Field label="Inactive 30+ days (would be deleted)">
          <div className={`${inp} flex items-center font-mono text-lg font-bold ${inactive30d ? "text-amber-400" : "text-muted-foreground"}`}>{inactive30d}</div>
        </Field>
      </Grid>

      <label className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-border bg-card/40 p-4">
        <div>
          <p className="text-sm font-semibold">Auto-delete inactive accounts</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            When on, accounts with no visit or sign-in for 30 days are removed automatically every night.
            Turn this off before going offline for a while so no one's data gets deleted while you're away.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => setEnabled((v) => !v)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? "bg-primary" : "bg-border"}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
        </button>
      </label>

      <SaveRow
        saving={saving}
        onReset={load}
        onSave={async () => {
          setSaving(true);
          await saveAppConfig("AccountDeletion", { enabled });
          setSaving(false);
          toast.success(enabled ? "Auto-deletion is ON" : "Auto-deletion is PAUSED");
        }}
      />
    </Card>
  );
}

function SecurityEditor() {
  const [v, setV] = useState<SecurityConfig>(DEFAULT_SECURITY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("app_config").select("data").eq("id", "Security").maybeSingle().then(({ data }) => {
      const d = data?.data as Partial<SecurityConfig> | undefined;
      if (d) setV({ ...DEFAULT_SECURITY, ...d });
      setLoading(false);
    });
  }, []);

  if (loading) return <Card title="Unlock timing"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></Card>;

  return (
    <Card
      title="Unlock timing"
      desc="Controls the /unlock page for every mod. Minimum = shortest time a real user can take to reach the page (below this, it's flagged as fake and rejected). Maximum = how long a session token stays valid before it expires."
    >
      <Grid>
        <Field label="Minimum time (seconds)">
          <input
            type="number"
            min={0}
            value={v.minTimer}
            onChange={(e) => setV({ ...v, minTimer: Number(e.target.value) })}
            className={inp}
          />
        </Field>
        <Field label="Maximum time (seconds)">
          <input
            type="number"
            min={0}
            value={v.timer}
            onChange={(e) => setV({ ...v, timer: Number(e.target.value) })}
            className={inp}
          />
        </Field>
      </Grid>
      {v.minTimer >= v.timer && (
        <p className="text-xs font-semibold text-red-400">Minimum must be less than maximum, or every session will fail.</p>
      )}
      <SaveRow
        saving={saving}
        onReset={() => setV(DEFAULT_SECURITY)}
        onSave={async () => {
          if (v.minTimer >= v.timer) { toast.error("Minimum must be less than maximum."); return; }
          setSaving(true);
          await saveAppConfig("Security", v);
          setSaving(false);
        }}
      />
    </Card>
  );
}

// ---------- Branding ----------
function BrandingEditor({ initial, onSaved }: { initial: SiteBranding; onSaved: () => void }) {
  const [v, setV] = useState<SiteBranding>(initial);
  const [saving, setSaving] = useState(false);
  const f = <K extends keyof SiteBranding>(k: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value } as SiteBranding);
  return (
    <Card title="Branding & Hero copy" desc="Site identity, hero headline, subtitle and CTAs.">
      <Grid>
        <Field label="Site name"><input value={v.siteName} onChange={f("siteName")} className={inp} /></Field>
        <Field label="Site tagline (for meta)"><input value={v.siteTagline} onChange={f("siteTagline")} className={inp} /></Field>
        <Field label="Hero eyebrow"><input value={v.heroEyebrow} onChange={f("heroEyebrow")} className={inp} /></Field>
        <Field label="Hero title (before highlight)"><input value={v.heroTitle} onChange={f("heroTitle")} className={inp} /></Field>
        <Field label="Hero highlight (gradient word)"><input value={v.heroHighlight} onChange={f("heroHighlight")} className={inp} /></Field>
        <Field label="Primary CTA label"><input value={v.primaryCta} onChange={f("primaryCta")} className={inp} /></Field>
        <Field label="Secondary CTA label"><input value={v.secondaryCta} onChange={f("secondaryCta")} className={inp} /></Field>
        <Field label="Active trainers stat"><input value={v.activeTrainers} onChange={f("activeTrainers")} className={inp} /></Field>
        <Field label="Average rating stat"><input value={v.avgRating} onChange={f("avgRating")} className={inp} /></Field>
      </Grid>
      <Field label="Hero subtitle">
        <textarea value={v.heroSubtitle} onChange={f("heroSubtitle")} rows={3} className={inp} />
      </Field>
      <SaveRow saving={saving} onReset={() => setV(DEFAULT_BRANDING)}
        onSave={async () => { setSaving(true); if (await saveSetting("branding", v)) onSaved(); setSaving(false); }} />
    </Card>
  );
}

// ---------- Announcement ----------
function AnnouncementEditor({ initial, onSaved }: { initial: Announcement; onSaved: () => void }) {
  const [v, setV] = useState<Announcement>(initial);
  const [saving, setSaving] = useState(false);
  return (
    <Card title="Top announcement bar" desc="Show a global banner above every page. Use it for new drops, maintenance or events.">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={v.enabled} onChange={(e) => setV({ ...v, enabled: e.target.checked })} /> Enabled
      </label>
      <Field label="Message"><input value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} className={inp} placeholder="New Fire Phoenix v2.0 just dropped — tap to view" /></Field>
      <Field label="Link (optional)"><input value={v.href} onChange={(e) => setV({ ...v, href: e.target.value })} className={inp} placeholder="/mods/fire-phoenix" /></Field>
      <Field label="Tone">
        <ThemedSelect
          value={v.tone}
          onValueChange={(val) => setV({ ...v, tone: val as Announcement["tone"] })}
          ariaLabel="Announcement tone"
          className={`${inp} h-auto`}
          options={[
            { value: "info", label: "Info (primary)" },
            { value: "success", label: "Success (green)" },
            { value: "warning", label: "Warning (amber)" },
          ]}
        />
      </Field>
      <SaveRow saving={saving} onReset={() => setV(DEFAULT_ANNOUNCEMENT)}
        onSave={async () => { setSaving(true); if (await saveSetting("announcement", v)) onSaved(); setSaving(false); }} />
    </Card>
  );
}

// ---------- Socials ----------
function SocialsEditor({ initial, onSaved }: { initial: Socials; onSaved: () => void }) {
  const [v, setV] = useState<Socials>(initial);
  const [saving, setSaving] = useState(false);
  return (
    <Card title="Social channels" desc="Update these any time — every page reflects the change instantly.">
      <Grid>
        <Field label="WhatsApp"><input value={v.whatsapp} onChange={(e) => setV({ ...v, whatsapp: e.target.value })} className={inp} /></Field>
        <Field label="YouTube"><input value={v.youtube} onChange={(e) => setV({ ...v, youtube: e.target.value })} className={inp} /></Field>
        <Field label="Instagram"><input value={v.instagram} onChange={(e) => setV({ ...v, instagram: e.target.value })} className={inp} /></Field>
        <Field label="Telegram"><input value={v.telegram} onChange={(e) => setV({ ...v, telegram: e.target.value })} className={inp} /></Field>
      </Grid>
      <SaveRow saving={saving} onReset={() => setV(DEFAULT_SOCIALS)}
        onSave={async () => { setSaving(true); if (await saveSetting("socials", v)) onSaved(); setSaving(false); }} />
    </Card>
  );
}

// ---------- Featured ----------
function FeaturedEditor({ onSaved }: { onSaved: () => void }) {
  const [slug, setSlug] = useState<string>("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    supabase.from("site_settings").select("value").eq("key", "featured").maybeSingle().then(({ data }) => {
      const v = data?.value as { slug?: string } | undefined;
      setSlug(v?.slug ?? "");
    });
  }, []);
  return (
    <Card title="Featured mod" desc="Pinned to the top of the vault and shown as the hero card.">
      <Field label="Mod">
        <ThemedSelect
          value={slug === "" ? "__auto__" : slug}
          onValueChange={(val) => setSlug(val === "__auto__" ? "" : val)}
          ariaLabel="Featured mod"
          className={`${inp} h-auto`}
          options={[
            { value: "__auto__", label: "— auto (top by popularity) —" },
            ...baseMods.map((m) => ({ value: m.slug, label: m.name })),
          ]}
        />
      </Field>
      <SaveRow saving={saving} onReset={() => setSlug("")}
        onSave={async () => { setSaving(true); if (await saveSetting("featured", { slug })) onSaved(); setSaving(false); }} />
    </Card>
  );
}

// ---------- Mods editor ----------
function ModsEditor({ overrides, onSaved }: { overrides: Record<string, ModOverride>; onSaved: () => void }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {baseMods.map((m) => {
        const o = overrides[m.slug];
        const isOpen = openSlug === m.slug;
        return (
          <div key={m.slug} className="overflow-hidden rounded-2xl glass">
            <button onClick={() => setOpenSlug(isOpen ? null : m.slug)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-card/40">
              <img src={m.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{o?.name || m.name}</p>
                <p className="truncate text-xs text-muted-foreground">v{o?.version || m.version} · {m.element}</p>
              </div>
              {o?.hidden ? <EyeOff className="h-4 w-4 text-rose-300" /> : <Eye className="h-4 w-4 text-emerald-300" />}
              {o?.featured && <Star className="h-4 w-4 text-amber-300" />}
            </button>
            {isOpen && <ModRowEditor slug={m.slug} existing={o} onSaved={onSaved} />}
          </div>
        );
      })}
    </div>
  );
}

function ModRowEditor({ slug, existing, onSaved }: { slug: string; existing?: ModOverride; onSaved: () => void }) {
  const base = baseMods.find((m) => m.slug === slug)!;
  const confirm = useConfirm();
  const [v, setV] = useState({
    name: existing?.name ?? "",
    tagline: existing?.tagline ?? "",
    description: existing?.description ?? "",
    version: existing?.version ?? "",
    size: existing?.size ?? "",
    updated_date: existing?.updated_date ?? "",
    youtube_id: existing?.youtube_id ?? "",
    features: (existing?.features ?? []).join("\n"),
    changelog: JSON.stringify(existing?.changelog ?? [], null, 2),
    downloads_absolute: (existing?.downloads_absolute ?? "") as number | "",
    likes_absolute: (existing?.likes_absolute ?? "") as number | "",
    seed_rating_points: (existing?.seed_rating_points ?? "") as number | "",
    seed_rating_count: (existing?.seed_rating_count ?? "") as number | "",
    seed_review_likes: (existing?.seed_review_likes ?? "") as number | "",
    download_url: existing?.download_url ?? "",
    // Decrypt stored ciphertext back to plaintext for editing. If the key
    // doesn't match or the value is empty, fall back to an empty field.
    mega: safeDecrypt(existing?.mega_enc),
    follow: safeDecrypt(existing?.follow_enc),
    hidden: existing?.hidden ?? false,
    featured: existing?.featured ?? false,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    let changelog: unknown = null;
    if (v.changelog.trim()) {
      try { changelog = JSON.parse(v.changelog); } catch { toast.error("Changelog JSON is invalid"); setSaving(false); return; }
    }
    const features = v.features.split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      slug,
      name: v.name || null,
      tagline: v.tagline || null,
      description: v.description || null,
      version: v.version || null,
      size: v.size || null,
      updated_date: v.updated_date || null,
      youtube_id: v.youtube_id || null,
      features: features.length ? features : null,
      changelog,
      downloads_absolute: v.downloads_absolute === "" ? null : Number(v.downloads_absolute),
      likes_absolute: v.likes_absolute === "" ? null : Number(v.likes_absolute),
      seed_rating_points: v.seed_rating_points === "" ? null : Number(v.seed_rating_points),
      seed_rating_count: v.seed_rating_count === "" ? null : Number(v.seed_rating_count),
      seed_review_likes: v.seed_review_likes === "" ? null : Number(v.seed_review_likes),
      download_url: v.download_url || null,
      // Encrypt the MEGA + Follow links so the ciphertext (not the raw URL) is
      // what's stored and shipped to the public site.
      mega_enc: v.mega.trim() ? Cipher.encrypt(v.mega.trim()) : null,
      follow_enc: v.follow.trim() ? Cipher.encrypt(v.follow.trim()) : null,
      hidden: v.hidden,
      featured: v.featured,
    };
    const { error } = await supabase.from("mod_overrides").upsert(payload as never);
    if (error) toast.error(error.message); else { toast.success("Mod saved"); onSaved(); }
    setSaving(false);
  };

  const clear = async () => {
    if (!(await confirm({
      title: "Reset mod",
      description: "Reset this mod to defaults?",
      confirmText: "Reset",
      danger: true,
    }))) return;
    await supabase.from("mod_overrides").delete().eq("slug", slug);
    toast.success("Reset");
    onSaved();
  };

  return (
    <div className="border-t border-border/60 bg-background/30 p-5">
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={v.hidden} onChange={(e) => setV({ ...v, hidden: e.target.checked })} /> Hide from site</label>
        <label className="inline-flex items-center gap-2"><input type="checkbox" checked={v.featured} onChange={(e) => setV({ ...v, featured: e.target.checked })} /> Mark featured</label>
      </div>
      <Grid>
        <Field label={`Name (default: ${base.name})`}><input value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} className={inp} placeholder={base.name} /></Field>
        <Field label={`Version (default: ${base.version})`}><input value={v.version} onChange={(e) => setV({ ...v, version: e.target.value })} className={inp} placeholder={base.version} /></Field>
        <Field label={`Size (default: ${base.size})`}><input value={v.size} onChange={(e) => setV({ ...v, size: e.target.value })} className={inp} placeholder={base.size} /></Field>
        <Field label={`Updated date`}><input value={v.updated_date} onChange={(e) => setV({ ...v, updated_date: e.target.value })} className={inp} placeholder={base.updated} /></Field>
        <Field label="YouTube video ID"><input value={v.youtube_id} onChange={(e) => setV({ ...v, youtube_id: e.target.value })} className={inp} placeholder="dQw4w9WgXcQ" /></Field>
        <Field label="Download URL"><input value={v.download_url} onChange={(e) => setV({ ...v, download_url: e.target.value })} className={inp} placeholder="https://…" /></Field>
        <Field label="MEGA link (encrypted on save)"><input value={v.mega} onChange={(e) => setV({ ...v, mega: e.target.value })} className={inp} placeholder="https://mega.nz/file/…" /></Field>
        <Field label="Shortener / earn link (e.g. followyou.me — shown before the unlock page)"><input value={v.follow} onChange={(e) => setV({ ...v, follow: e.target.value })} className={inp} placeholder="https://followyou.me/…" /></Field>
        <Field label={`Set downloads (real completed downloads add on top)`}><input type="number" min="0" value={v.downloads_absolute} onChange={(e) => setV({ ...v, downloads_absolute: e.target.value === "" ? "" : Number(e.target.value) })} className={inp} placeholder={String(base.downloads)} /></Field>
        <Field label={`Set likes (real user likes add on top)`}><input type="number" min="0" value={v.likes_absolute} onChange={(e) => setV({ ...v, likes_absolute: e.target.value === "" ? "" : Number(e.target.value) })} className={inp} placeholder={String(base.baseLikes)} /></Field>
        <Field label={`Set rating points (e.g. 1000 = your baseline "score")`}><input type="number" min="0" value={v.seed_rating_points} onChange={(e) => setV({ ...v, seed_rating_points: e.target.value === "" ? "" : Number(e.target.value) })} className={inp} placeholder="1000" /></Field>
        <Field label={`Set rating votes (e.g. 200 = your baseline "voter count")`}><input type="number" min="0" value={v.seed_rating_count} onChange={(e) => setV({ ...v, seed_rating_count: e.target.value === "" ? "" : Number(e.target.value) })} className={inp} placeholder="200" /></Field>
        <Field label={`Set review likes (real likes on reviews add on top)`}><input type="number" min="0" value={v.seed_review_likes} onChange={(e) => setV({ ...v, seed_review_likes: e.target.value === "" ? "" : Number(e.target.value) })} className={inp} placeholder="0" /></Field>
      </Grid>
      {v.seed_rating_points !== "" && v.seed_rating_count !== "" && Number(v.seed_rating_count) > 0 && (
        <p className="text-xs text-muted-foreground">
          Baseline average: <span className="font-semibold text-foreground">{(Number(v.seed_rating_points) / Number(v.seed_rating_count)).toFixed(2)}</span> ★
          — real reviews add their stars to the points and 1 to the votes, so this dilutes naturally as people rate. It never gets overwritten.
        </p>
      )}
      <Grid>
        {existing && (
          <Field label="Real downloads so far (read-only)">
            <div className={`${inp} flex items-center opacity-70`}>{existing.real_downloads ?? 0}</div>
          </Field>
        )}
      </Grid>
      <Field label={`Tagline (default: ${base.tagline})`}>
        <input value={v.tagline} onChange={(e) => setV({ ...v, tagline: e.target.value })} className={inp} placeholder={base.tagline} />
      </Field>
      <Field label="Description"><textarea value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} rows={4} className={inp} placeholder={base.description} /></Field>
      <Field label="Features (one per line)">
        <textarea value={v.features} onChange={(e) => setV({ ...v, features: e.target.value })} rows={4} className={inp} placeholder={base.features.join("\n")} />
      </Field>
      <Field label="Changelog (JSON: [{version,date,notes:[]}])">
        <textarea value={v.changelog} onChange={(e) => setV({ ...v, changelog: e.target.value })} rows={6} className={`${inp} font-mono text-xs`} placeholder={JSON.stringify(base.changelog, null, 2)} />
      </Field>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button onClick={clear} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-rose-300">Reset to defaults</button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save mod
        </button>
      </div>
    </div>
  );
}

// ---------- Shared primitives ----------
/** Decrypt stored ciphertext for editing; returns "" if empty or key mismatch. */
function safeDecrypt(ct?: string | null): string {
  if (!ct) return "";
  try { return Cipher.decrypt(ct) || ""; } catch { return ""; }
}
const inp = "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary";
function Card({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="edge-light rounded-2xl glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold flex items-center gap-2"><ImageIcon className="h-5 w-5 text-primary" />{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-6 space-y-4">{children}</div>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function SaveRow({ saving, onSave, onReset }: { saving: boolean; onSave: () => void; onReset: () => void }) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button onClick={onReset} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground">Reset defaults</button>
      <button onClick={onSave} disabled={saving} className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60" style={{ background: "var(--gradient-primary)" }}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
      </button>
    </div>
  );
}
