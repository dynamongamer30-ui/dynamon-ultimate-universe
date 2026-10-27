import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { useAutosave } from "@/hooks/useAutosave";
import {
  Shield,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Star,
  ArrowLeft,
  Settings2,
  Megaphone,
  Link2,
  Image as ImageIcon,
  Box,
  KeyRound,
  Feather,
  Send,
} from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { ThemedSelect } from "@/components/ThemedSelect";
import { supabase } from "@/integrations/supabase/client";
import { saveOwnerSetting, writeOwnerMod } from "@/lib/ownerSettings";
import {
  useSiteSettings,
  DEFAULT_BRANDING,
  DEFAULT_ANNOUNCEMENT,
  DEFAULT_SOCIALS,
  type SiteBranding,
  type Announcement,
  type Socials,
  type ModOverride,
} from "@/hooks/useSiteSettings";
import { OwnerAvatarsEditor } from "@/components/OwnerAvatarsEditor";
import { OwnerAccountsEditor, OwnerTimingEditor } from "@/components/OwnerConfigurationEditors";
import { useConfirm } from "@/hooks/useConfirm";
import { mods as baseMods } from "@/lib/mods";
import { Cipher } from "@/lib/cipher";
import { toast } from "sonner";
import { WebsiteAppearanceEditor } from "@/components/WebsiteAppearanceEditor";
import { useOwnerMutation } from "@/hooks/useOwnerMutation";

export const Route = createFileRoute("/admin-control")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Control Panel — Dynamon Universe" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ControlRoute,
});

function ControlRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <OwnerGate>
      <ControlPanel />
    </OwnerGate>
  );
}

type Tab =
  | "appearance"
  | "dex"
  | "branding"
  | "announcement"
  | "socials"
  | "featured"
  | "mods"
  | "security"
  | "avatars"
  | "rewards";

function ControlPanel() {
  const { branding, announcement, socials, overrides, refresh, loading, error } = useSiteSettings();
  const [tab, setTab] = useState<Tab>("branding");

  const tabs: { id: Tab; label: string; icon: typeof Settings2 }[] = [
    { id: "appearance", label: "Website themes", icon: Eye },
    { id: "dex", label: "Royal Void DEX", icon: Shield },
    { id: "branding", label: "Branding & Hero", icon: Settings2 },
    { id: "announcement", label: "Announcement", icon: Megaphone },
    { id: "socials", label: "Socials", icon: Link2 },
    { id: "featured", label: "Featured Mod", icon: Star },
    { id: "mods", label: "Mods Editor", icon: Box },
    { id: "security", label: "Unlock Timing", icon: Shield },
    { id: "avatars", label: "Avatars", icon: ImageIcon },
    { id: "rewards", label: "Rewards", icon: Feather },
  ];

  return (
    <PageShell>
      <div className="flex items-center justify-between gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Link>
      </div>
      <header className="mt-4 edge-light rounded-2xl glass p-6 sm:p-10">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-ink">
          <Shield className="h-3.5 w-3.5" /> Owner Control Panel
        </p>
        <h1 className="mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
          Edit everything, live.
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tune branding, swap socials, push announcements and edit any field on every mod. Changes
          appear instantly across the site.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`touch-target inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === t.id ? "text-primary-foreground glow-primary" : "border border-border bg-card/60 text-muted-foreground hover:text-foreground"}`}
            style={tab === t.id ? { background: "var(--gradient-primary)" } : undefined}
          >
            <t.icon className="h-4 w-4" /> {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <p
            role="status"
            className="rounded-2xl border border-border bg-card p-6 text-muted-foreground"
          >
            Loading site configuration…
          </p>
        ) : error ? (
          <div role="alert" className="rounded-2xl border border-border bg-card p-6">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => refresh()}
              className="touch-target mt-3 text-primary-ink underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {tab === "appearance" && <WebsiteAppearanceEditor />}
            {tab === "dex" && (
              <div className="rounded-2xl border border-border bg-card/60 p-5">
                <h2 className="text-xl font-bold">DEX controls have moved</h2>
                <p className="my-3 text-sm text-muted-foreground">
                  Manage feature locks, themes, branding and community links in Key system → Royal
                  Void DEX.
                </p>
                <Link to="/admin-keys" className="text-primary-ink underline">
                  Open Key system
                </Link>
              </div>
            )}
            {tab === "branding" && (
              <BrandingEditor initial={branding} onSaved={() => void refresh(true)} />
            )}
            {tab === "announcement" && (
              <AnnouncementEditor initial={announcement} onSaved={refresh} />
            )}
            {tab === "socials" && <SocialsEditor initial={socials} onSaved={refresh} />}
            {tab === "featured" && <FeaturedEditor onSaved={refresh} />}
            {tab === "mods" && <ModsEditor overrides={overrides} onSaved={refresh} />}
            {tab === "security" && (
              <>
                <OwnerTimingEditor />
                <OwnerAccountsEditor />
              </>
            )}
            {tab === "avatars" && <OwnerAvatarsEditor />}
            {tab === "rewards" && <RewardsEditor />}
          </>
        )}
      </div>
    </PageShell>
  );
}

// ---------- Generic settings save helper ----------
function useSettingSave(key: string) {
  const { savedSettings } = useSiteSettings();
  const snapshot = useRef(savedSettings[key]);
  return async (value: unknown, signal: AbortSignal) => {
    await saveOwnerSetting("site_settings", key, value, snapshot.current, signal);
    snapshot.current = value;
    toast.success("Saved");
  };
}

// ---------- Branding ----------
function BrandingEditor({ initial, onSaved }: { initial: SiteBranding; onSaved: () => void }) {
  const saveSetting = useSettingSave("branding");
  const [v, setV] = useState<SiteBranding>(initial);

  const autosave = useAutosave({
    value: v,
    ready: true,
    validate: (value) =>
      [value.logoUrl, value.faviconUrl, value.previewImageUrl].every((url) =>
        /^(https:\/\/|\/(?!\/))/.test(url),
      )
        ? null
        : "Use HTTPS image URLs or paths starting with /.",
    save: async (value) => {
      await saveSetting(value, AbortSignal.timeout(10000));
      onSaved();
    },
  });
  const f =
    <K extends keyof SiteBranding>(k: K) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setV({ ...v, [k]: e.target.value } as SiteBranding);
  return (
    <Card
      saving={autosave.saving}
      error={autosave.error}
      title="Branding & Hero copy"
      desc="Site identity, hero headline, subtitle and CTAs."
    >
      <p role="status" className="text-sm text-muted-foreground">
        {autosave.status} · Changes save automatically.
      </p>
      <Grid>
        <Field label="Circular brand image URL">
          <input
            aria-label="Circular brand image URL"
            value={v.logoUrl}
            onChange={f("logoUrl")}
            placeholder="https://… or /image.png"
            className={inp}
          />
        </Field>
        <Field label="Site name">
          <input value={v.siteName} onChange={f("siteName")} className={inp} />
        </Field>
        <Field label="Website icon URL (browser and search)">
          <input
            value={v.faviconUrl}
            onChange={f("faviconUrl")}
            className={inp}
            placeholder="https://… or /image.png"
          />
        </Field>
        <Field label="Website share preview image URL">
          <input
            value={v.previewImageUrl}
            onChange={f("previewImageUrl")}
            className={inp}
            placeholder="https://… or /image.png"
          />
        </Field>
        <Field label="Site tagline (for meta)">
          <input value={v.siteTagline} onChange={f("siteTagline")} className={inp} />
        </Field>
        <Field label="Hero eyebrow">
          <input value={v.heroEyebrow} onChange={f("heroEyebrow")} className={inp} />
        </Field>
        <Field label="Hero title (before highlight)">
          <input value={v.heroTitle} onChange={f("heroTitle")} className={inp} />
        </Field>
        <Field label="Hero highlight (gradient word)">
          <input value={v.heroHighlight} onChange={f("heroHighlight")} className={inp} />
        </Field>
        <Field label="Primary CTA label">
          <input value={v.primaryCta} onChange={f("primaryCta")} className={inp} />
        </Field>
        <Field label="Secondary CTA label">
          <input value={v.secondaryCta} onChange={f("secondaryCta")} className={inp} />
        </Field>
        <Field label="Active trainers stat">
          <input value={v.activeTrainers} onChange={f("activeTrainers")} className={inp} />
        </Field>
        <Field label="Average rating stat">
          <input value={v.avgRating} onChange={f("avgRating")} className={inp} />
        </Field>
      </Grid>
      <Field label="Hero subtitle">
        <textarea value={v.heroSubtitle} onChange={f("heroSubtitle")} rows={3} className={inp} />
      </Field>
      <SaveRow
        saving={autosave.saving}
        onReset={() => setV(DEFAULT_BRANDING)}
        onSave={() => void autosave.saveNow()}
      />
    </Card>
  );
}

// ---------- Announcement ----------
function AnnouncementEditor({ initial, onSaved }: { initial: Announcement; onSaved: () => void }) {
  const saveSetting = useSettingSave("announcement");
  const [v, setV] = useState<Announcement>(initial);
  const { saving, error, run } = useOwnerMutation();
  return (
    <Card
      saving={saving}
      error={error}
      title="Top announcement bar"
      desc="Show a global banner above every page. Use it for new drops, maintenance or events."
    >
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={v.enabled}
          onChange={(e) => setV({ ...v, enabled: e.target.checked })}
        />{" "}
        Enabled
      </label>
      <Field label="Message">
        <input
          value={v.message}
          onChange={(e) => setV({ ...v, message: e.target.value })}
          className={inp}
          placeholder="New Fire Phoenix v2.0 just dropped — tap to view"
        />
      </Field>
      <Field label="Link (optional)">
        <input
          value={v.href}
          onChange={(e) => setV({ ...v, href: e.target.value })}
          className={inp}
          placeholder="/mods/fire-phoenix"
        />
      </Field>
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
      <SaveRow
        saving={saving}
        onReset={() => setV(DEFAULT_ANNOUNCEMENT)}
        onSave={() =>
          void run(async (signal) => {
            await saveSetting(v, signal);
            onSaved();
          })
        }
      />
    </Card>
  );
}

// ---------- Socials ----------
function SocialsEditor({ initial, onSaved }: { initial: Socials; onSaved: () => void }) {
  const saveSetting = useSettingSave("socials");
  const [v, setV] = useState<Socials>(initial);
  const { saving, error, run } = useOwnerMutation();
  return (
    <Card
      saving={saving}
      error={error}
      title="Social channels"
      desc="Update these any time — every page reflects the change instantly."
    >
      <Grid>
        <Field label="WhatsApp">
          <input
            value={v.whatsapp}
            onChange={(e) => setV({ ...v, whatsapp: e.target.value })}
            className={inp}
          />
        </Field>
        <Field label="YouTube">
          <input
            value={v.youtube}
            onChange={(e) => setV({ ...v, youtube: e.target.value })}
            className={inp}
          />
        </Field>
        <Field label="Instagram">
          <input
            value={v.instagram}
            onChange={(e) => setV({ ...v, instagram: e.target.value })}
            className={inp}
          />
        </Field>
        <Field label="Telegram">
          <input
            value={v.telegram}
            onChange={(e) => setV({ ...v, telegram: e.target.value })}
            className={inp}
          />
        </Field>
      </Grid>
      <SaveRow
        saving={saving}
        onReset={() => setV(DEFAULT_SOCIALS)}
        onSave={() =>
          void run(async (signal) => {
            await saveSetting(v, signal);
            onSaved();
          })
        }
      />
    </Card>
  );
}

// ---------- Featured ----------
function FeaturedEditor({ onSaved }: { onSaved: () => void }) {
  const saveSetting = useSettingSave("featured");
  const { featuredSlug } = useSiteSettings();
  const [slug, setSlug] = useState(featuredSlug ?? "");
  const { saving, error, run } = useOwnerMutation();
  return (
    <Card
      saving={saving}
      error={error}
      title="Featured mod"
      desc="Pinned to the top of the vault and shown as the hero card."
    >
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
      <SaveRow
        saving={saving}
        onReset={() => setSlug("")}
        onSave={() =>
          void run(async (signal) => {
            await saveSetting({ slug }, signal);
            onSaved();
          })
        }
      />
    </Card>
  );
}

// ---------- Mods editor ----------
function ModsEditor({
  overrides,
  onSaved,
}: {
  overrides: Record<string, ModOverride>;
  onSaved: () => void;
}) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      {baseMods.map((m) => {
        const o = overrides[m.slug];
        const isOpen = openSlug === m.slug;
        return (
          <div key={m.slug} className="overflow-hidden rounded-2xl glass">
            <button
              onClick={() => setOpenSlug(isOpen ? null : m.slug)}
              className="flex w-full items-center gap-3 p-4 text-left hover:bg-card/40"
            >
              <img src={m.image} alt="" className="h-12 w-12 rounded-lg object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{o?.name || m.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  v{o?.version || m.version} · {m.element}
                </p>
              </div>
              {o?.hidden ? (
                <EyeOff className="h-4 w-4 text-rose-300" />
              ) : (
                <Eye className="h-4 w-4 text-emerald-300" />
              )}
              {o?.featured && <Star className="h-4 w-4 text-amber-300" />}
            </button>
            {isOpen && <ModRowEditor slug={m.slug} existing={o} onSaved={onSaved} />}
          </div>
        );
      })}
    </div>
  );
}

function ModRowEditor({
  slug,
  existing,
  onSaved,
}: {
  slug: string;
  existing?: ModOverride;
  onSaved: () => void;
}) {
  const base = baseMods.find((m) => m.slug === slug)!;
  const snapshot = useRef(existing);
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
  const { saving, error, run } = useOwnerMutation();
  const confirming = useRef(false);

  const save = () =>
    run(async (signal) => {
      let changelog: unknown = null;
      if (v.changelog.trim()) {
        try {
          changelog = JSON.parse(v.changelog);
        } catch {
          throw new Error("Changelog JSON is invalid. Your draft is retained.");
        }
      }
      if (
        changelog !== null &&
        (!Array.isArray(changelog) ||
          !changelog.every(
            (entry) =>
              entry &&
              typeof entry.version === "string" &&
              typeof entry.date === "string" &&
              Array.isArray(entry.notes) &&
              entry.notes.every((note: unknown) => typeof note === "string"),
          ))
      )
        throw new Error(
          "Changelog must be a list of versions, dates and note lists. Your draft is retained.",
        );
      const features = v.features
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
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
      for (const key of [
        "downloads_absolute",
        "likes_absolute",
        "seed_rating_count",
        "seed_review_likes",
      ] as const) {
        const count = payload[key];
        if (count !== null && (!Number.isSafeInteger(count) || count < 0))
          throw new Error("Counts must be non-negative whole numbers. Your draft is retained.");
      }
      if (
        payload.seed_rating_points !== null &&
        (!Number.isFinite(payload.seed_rating_points) || payload.seed_rating_points < 0)
      )
        throw new Error("Rating points must be a non-negative number. Your draft is retained.");
      await writeOwnerMod(
        slug,
        payload,
        snapshot.current as unknown as Record<string, unknown> | undefined,
        signal,
      );
      toast.success("Mod saved");
      onSaved();
    });

  const clear = async () => {
    if (saving || confirming.current) return;
    confirming.current = true;
    try {
      if (
        !(await confirm({
          title: "Reset mod",
          description: "Reset this mod to defaults?",
          confirmText: "Reset",
          danger: true,
        }))
      )
        return;
      await run(async (signal) => {
        await writeOwnerMod(
          slug,
          null,
          snapshot.current as unknown as Record<string, unknown> | undefined,
          signal,
        );
        toast.success("Reset");
        onSaved();
      });
    } finally {
      confirming.current = false;
    }
  };

  return (
    <fieldset
      disabled={saving}
      aria-busy={saving}
      className="min-w-0 border-t border-border/60 bg-background/30 p-5"
    >
      <legend className="sr-only">Edit {base.name}</legend>
      {error && (
        <p role="alert" className="mb-4 break-words text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="mb-3 flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.hidden}
            onChange={(e) => setV({ ...v, hidden: e.target.checked })}
          />{" "}
          Hide from site
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={v.featured}
            onChange={(e) => setV({ ...v, featured: e.target.checked })}
          />{" "}
          Mark featured
        </label>
      </div>
      <Grid>
        <Field label={`Name (default: ${base.name})`}>
          <input
            value={v.name}
            onChange={(e) => setV({ ...v, name: e.target.value })}
            className={inp}
            placeholder={base.name}
          />
        </Field>
        <Field label={`Version (default: ${base.version})`}>
          <input
            value={v.version}
            onChange={(e) => setV({ ...v, version: e.target.value })}
            className={inp}
            placeholder={base.version}
          />
        </Field>
        <Field label={`Size (default: ${base.size})`}>
          <input
            value={v.size}
            onChange={(e) => setV({ ...v, size: e.target.value })}
            className={inp}
            placeholder={base.size}
          />
        </Field>
        <Field label={`Updated date`}>
          <input
            value={v.updated_date}
            onChange={(e) => setV({ ...v, updated_date: e.target.value })}
            className={inp}
            placeholder={base.updated}
          />
        </Field>
        <Field label="YouTube video ID">
          <input
            value={v.youtube_id}
            onChange={(e) => setV({ ...v, youtube_id: e.target.value })}
            className={inp}
            placeholder="dQw4w9WgXcQ"
          />
        </Field>
        <Field label="Download URL">
          <input
            value={v.download_url}
            onChange={(e) => setV({ ...v, download_url: e.target.value })}
            className={inp}
            placeholder="https://…"
          />
        </Field>
        <Field label="MEGA link (encrypted on save)">
          <input
            value={v.mega}
            onChange={(e) => setV({ ...v, mega: e.target.value })}
            className={inp}
            placeholder="https://mega.nz/file/…"
          />
        </Field>
        <Field label="Shortener / earn link (e.g. followyou.me — shown before the unlock page)">
          <input
            value={v.follow}
            onChange={(e) => setV({ ...v, follow: e.target.value })}
            className={inp}
            placeholder="https://followyou.me/…"
          />
        </Field>
        <Field label={`Set downloads (real completed downloads add on top)`}>
          <input
            type="number"
            min="0"
            value={v.downloads_absolute}
            onChange={(e) =>
              setV({
                ...v,
                downloads_absolute: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            className={inp}
            placeholder={String(base.downloads)}
          />
        </Field>
        <Field label={`Set likes (real user likes add on top)`}>
          <input
            type="number"
            min="0"
            value={v.likes_absolute}
            onChange={(e) =>
              setV({ ...v, likes_absolute: e.target.value === "" ? "" : Number(e.target.value) })
            }
            className={inp}
            placeholder={String(base.baseLikes)}
          />
        </Field>
        <Field label={`Set rating points (e.g. 1000 = your baseline "score")`}>
          <input
            type="number"
            min="0"
            value={v.seed_rating_points}
            onChange={(e) =>
              setV({
                ...v,
                seed_rating_points: e.target.value === "" ? "" : Number(e.target.value),
              })
            }
            className={inp}
            placeholder="1000"
          />
        </Field>
        <Field label={`Set rating votes (e.g. 200 = your baseline "voter count")`}>
          <input
            type="number"
            min="0"
            value={v.seed_rating_count}
            onChange={(e) =>
              setV({ ...v, seed_rating_count: e.target.value === "" ? "" : Number(e.target.value) })
            }
            className={inp}
            placeholder="200"
          />
        </Field>
        <Field label={`Set review likes (real likes on reviews add on top)`}>
          <input
            type="number"
            min="0"
            value={v.seed_review_likes}
            onChange={(e) =>
              setV({ ...v, seed_review_likes: e.target.value === "" ? "" : Number(e.target.value) })
            }
            className={inp}
            placeholder="0"
          />
        </Field>
      </Grid>
      {v.seed_rating_points !== "" &&
        v.seed_rating_count !== "" &&
        Number(v.seed_rating_count) > 0 && (
          <p className="text-xs text-muted-foreground">
            Baseline average:{" "}
            <span className="font-semibold text-foreground">
              {(Number(v.seed_rating_points) / Number(v.seed_rating_count)).toFixed(2)}
            </span>{" "}
            ★ — real reviews add their stars to the points and 1 to the votes, so this dilutes
            naturally as people rate. It never gets overwritten.
          </p>
        )}
      <Grid>
        {existing && (
          <Field label="Real downloads so far (read-only)">
            <div className={`${inp} flex items-center opacity-70`}>
              {existing.real_downloads ?? 0}
            </div>
          </Field>
        )}
      </Grid>
      <Field label={`Tagline (default: ${base.tagline})`}>
        <input
          value={v.tagline}
          onChange={(e) => setV({ ...v, tagline: e.target.value })}
          className={inp}
          placeholder={base.tagline}
        />
      </Field>
      <Field label="Description">
        <textarea
          value={v.description}
          onChange={(e) => setV({ ...v, description: e.target.value })}
          rows={4}
          className={inp}
          placeholder={base.description}
        />
      </Field>
      <Field label="Features (one per line)">
        <textarea
          value={v.features}
          onChange={(e) => setV({ ...v, features: e.target.value })}
          rows={4}
          className={inp}
          placeholder={base.features.join("\n")}
        />
      </Field>
      <Field label="Changelog (JSON: [{version,date,notes:[]}])">
        <textarea
          value={v.changelog}
          onChange={(e) => setV({ ...v, changelog: e.target.value })}
          rows={6}
          className={`${inp} font-mono text-xs`}
          placeholder={JSON.stringify(base.changelog, null, 2)}
        />
      </Field>
      <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
        <button
          onClick={clear}
          className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-rose-300"
        >
          Reset to defaults
        </button>
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60"
          style={{ background: "var(--gradient-primary)" }}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{" "}
          Save mod
        </button>
      </div>
    </fieldset>
  );
}

// ---------- Shared primitives ----------
/** Decrypt stored ciphertext for editing; returns "" if empty or key mismatch. */
function safeDecrypt(ct?: string | null): string {
  if (!ct) return "";
  try {
    return Cipher.decrypt(ct) || "";
  } catch {
    return "";
  }
}
const inp =
  "w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary";

function RewardsEditor() {
  const [email, setEmail] = useState("");
  const { saving: busy, error: grantError, run } = useOwnerMutation();
  const [uncertain, setUncertain] = useState(false);
  const [lastGrant, setLastGrant] = useState<{ email: string; at: string } | null>(null);
  const grant = () => {
    if (uncertain || busy) return;
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error("Enter a user's email first.");
      return;
    }
    void run(async (signal) => {
      let result: unknown;
      try {
        const { data, error } = await supabase
          .rpc("admin_grant_phoenix_pass" as never, { p_email: trimmed } as never)
          .abortSignal(signal)
          .retry(false);
        if (error) {
          if (["42501", "PGRST301", "PGRST302"].includes(error.code))
            throw new Error("Owner access was denied. Sign in again before granting a pass.");
          setUncertain(true);
          throw new Error(
            "Grant outcome was not confirmed. Check the recipient's pass and notification before trying again.",
          );
        }
        result = data;
      } catch (cause) {
        if (!(cause instanceof Error && cause.message.startsWith("Owner access")))
          setUncertain(true);
        throw cause;
      }
      const res = result as { ok?: boolean; error?: string } | null;
      if (signal.aborted || typeof res?.ok !== "boolean") {
        setUncertain(true);
        throw new Error(
          "Grant outcome was not confirmed. Check the recipient's pass and notification before trying again.",
        );
      }
      if (!res.ok) {
        const errors: Record<string, string> = {
          user_not_found:
            "No signed-up user with that email. Check the address they used to sign in.",
          not_owner: "Only the owner account can grant rewards.",
        };
        throw new Error(
          errors[res.error ?? ""] ?? "The server declined the grant. Your email draft is retained.",
        );
      }
      toast.success(`Phoenix Pass grant confirmed for ${trimmed}`);
      setLastGrant({ email: trimmed, at: new Date().toLocaleString() });
      setEmail("");
    });
  };

  return (
    <Card
      saving={busy}
      error={grantError}
      title="Grant Phoenix Pass"
      desc="Instantly gives any signed-in user a Phoenix Pass — auto-claimed, no 24h wait, active for 30 days, exactly like a normal claimed pass. They'll get a notification too."
    >
      <Field label="User's email (must already be signed up)">
        <div className="flex gap-2">
          <input
            type="email"
            aria-label="Reward recipient email"
            disabled={uncertain || busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") grant();
            }}
            placeholder="user@example.com"
            className={inp}
          />
          <button
            onClick={grant}
            disabled={busy || uncertain}
            className="press inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}{" "}
            Grant
          </button>
        </div>
      </Field>
      {lastGrant && (
        <p className="mt-3 text-xs text-muted-foreground">
          Last granted: <span className="font-semibold text-foreground">{lastGrant.email}</span> at{" "}
          {lastGrant.at}
        </p>
      )}
    </Card>
  );
}
function Card({
  title,
  desc,
  children,
  saving = false,
  error,
}: {
  title: string;
  desc?: string;
  children: React.ReactNode;
  saving?: boolean;
  error?: string | null;
}) {
  return (
    <section className="edge-light rounded-2xl glass p-6 sm:p-8">
      <h2 className="font-display text-xl font-bold flex items-center gap-2">
        <ImageIcon className="h-5 w-5 text-primary-ink" />
        {title}
      </h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      {error && (
        <p role="alert" className="mt-4 break-words text-sm text-destructive">
          {error}
        </p>
      )}
      <fieldset disabled={saving} aria-busy={saving} className="mt-6 min-w-0 space-y-4">
        <legend className="sr-only">{title} settings</legend>
        {children}
      </fieldset>
    </section>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>;
}
function SaveRow({
  saving,
  onSave,
  onReset,
}: {
  saving: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="mt-4 flex justify-end gap-2">
      <button
        onClick={onReset}
        disabled={saving}
        className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        Reset defaults
      </button>
      <button
        onClick={onSave}
        disabled={saving}
        className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60"
        style={{ background: "var(--gradient-primary)" }}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
      </button>
    </div>
  );
}
