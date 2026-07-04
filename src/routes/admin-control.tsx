import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Save, Loader2, Eye, EyeOff, Star, ArrowLeft, Settings2, Megaphone, Link2, Image as ImageIcon, Box, KeyRound } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { supabase } from "@/integrations/supabase/client";
import { useSiteSettings, DEFAULT_BRANDING, DEFAULT_ANNOUNCEMENT, DEFAULT_SOCIALS, type SiteBranding, type Announcement, type Socials, type ModOverride } from "@/hooks/useSiteSettings";
import { mods as baseMods } from "@/lib/mods";
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

type Tab = "branding" | "announcement" | "socials" | "featured" | "mods";

function ControlPanel() {
  const { branding, announcement, socials, overrides, refresh } = useSiteSettings();
  const [tab, setTab] = useState<Tab>("branding");


  const tabs: { id: Tab; label: string; icon: typeof Settings2 }[] = [
    { id: "branding", label: "Branding & Hero", icon: Settings2 },
    { id: "announcement", label: "Announcement", icon: Megaphone },
    { id: "socials", label: "Socials", icon: Link2 },
    { id: "featured", label: "Featured Mod", icon: Star },
    { id: "mods", label: "Mods Editor", icon: Box },
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
        <select value={v.tone} onChange={(e) => setV({ ...v, tone: e.target.value as Announcement["tone"] })} className={inp}>
          <option value="info">Info (primary)</option>
          <option value="success">Success (green)</option>
          <option value="warning">Warning (amber)</option>
        </select>
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
        <select value={slug} onChange={(e) => setSlug(e.target.value)} className={inp}>
          <option value="">— auto (top by popularity) —</option>
          {baseMods.map((m) => <option key={m.slug} value={m.slug}>{m.name}</option>)}
        </select>
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
    downloads_boost: existing?.downloads_boost ?? 0,
    likes_boost: existing?.likes_boost ?? 0,
    downloads_absolute: (existing?.downloads_absolute ?? "") as number | "",
    likes_absolute: (existing?.likes_absolute ?? "") as number | "",
    rating: existing?.rating ?? ("" as number | ""),
    rating_count: (existing?.rating_count ?? "") as number | "",
    download_url: existing?.download_url ?? "",
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
      downloads_boost: Number(v.downloads_boost) || 0,
      likes_boost: Number(v.likes_boost) || 0,
      downloads_absolute: v.downloads_absolute === "" ? null : Number(v.downloads_absolute),
      likes_absolute: v.likes_absolute === "" ? null : Number(v.likes_absolute),
      rating: v.rating === "" ? null : Number(v.rating),
      rating_count: v.rating_count === "" ? null : Number(v.rating_count),
      download_url: v.download_url || null,
      hidden: v.hidden,
      featured: v.featured,
    };
    const { error } = await supabase.from("mod_overrides").upsert(payload as never);
    if (error) toast.error(error.message); else { toast.success("Mod saved"); onSaved(); }
    setSaving(false);
  };

  const clear = async () => {
    if (!confirm("Reset this mod to defaults?")) return;
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
        <Field label={`Set downloads to (live total auto-increments from here)`}><input type="number" min="0" value={v.downloads_absolute} onChange={(e) => setV({ ...v, downloads_absolute: e.target.value === "" ? "" : Number(e.target.value) })} className={inp} placeholder={String(base.downloads)} /></Field>
        <Field label="Downloads boost (+/-)"><input type="number" value={v.downloads_boost} onChange={(e) => setV({ ...v, downloads_boost: Number(e.target.value) })} className={inp} /></Field>
        <Field label={`Set likes to (live total auto-increments)`}><input type="number" min="0" value={v.likes_absolute} onChange={(e) => setV({ ...v, likes_absolute: e.target.value === "" ? "" : Number(e.target.value) })} className={inp} placeholder={String(base.baseLikes)} /></Field>
        <Field label="Likes boost (+/-)"><input type="number" value={v.likes_boost} onChange={(e) => setV({ ...v, likes_boost: Number(e.target.value) })} className={inp} /></Field>
        <Field label={`Rating (0–5, default: ${base.baseRating})`}><input type="number" step="0.1" min="0" max="5" value={v.rating} onChange={(e) => setV({ ...v, rating: e.target.value === "" ? "" : Number(e.target.value) })} className={inp} /></Field>
        <Field label="Number of ratings / reviews"><input type="number" min="0" value={v.rating_count} onChange={(e) => setV({ ...v, rating_count: e.target.value === "" ? "" : Number(e.target.value) })} className={inp} placeholder="e.g. 1240" /></Field>
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
