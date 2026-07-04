import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { mods as baseMods, type Mod } from "@/lib/mods";

export type SiteBranding = {
  siteName: string;
  siteTagline: string;
  heroEyebrow: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  activeTrainers: string;
  avgRating: string;
};

export type Announcement = {
  enabled: boolean;
  message: string;
  href: string;
  tone: "info" | "success" | "warning";
};

export type Socials = {
  whatsapp: string;
  youtube: string;
  instagram: string;
  telegram: string;
};

export type ModOverride = {
  slug: string;
  hidden: boolean;
  featured: boolean;
  name: string | null;
  tagline: string | null;
  description: string | null;
  version: string | null;
  size: string | null;
  updated_date: string | null;
  youtube_id: string | null;
  features: string[] | null;
  changelog: Mod["changelog"] | null;
  downloads_boost: number;
  likes_boost: number;
  rating: number | null;
  rating_count: number | null;
  downloads_absolute: number | null;
  likes_absolute: number | null;
  download_url: string | null;
};

export const DEFAULT_BRANDING: SiteBranding = {
  siteName: "Dynamon Universe",
  siteTagline: "Premium Dynamons World mod APK hub",
  heroEyebrow: "Only Dynamons World mods",
  heroTitle: "The premium",
  heroHighlight: "Dynamons World",
  heroSubtitle:
    "Hand-picked, lovingly crafted fan-made builds. Clean injections, real community ratings, and weekly drops — no clutter, no other games. Just Dynamons.",
  primaryCta: "Browse the mods",
  secondaryCta: "What is this?",
  activeTrainers: "20K+",
  avgRating: "4.9",
};

export const DEFAULT_ANNOUNCEMENT: Announcement = {
  enabled: false,
  message: "",
  href: "",
  tone: "info",
};

export const DEFAULT_SOCIALS: Socials = {
  whatsapp: "https://whatsapp.com/channel/0029VbBdAcZ05MUmgk8cQP05",
  youtube: "https://youtube.com/@dynamongamer07",
  instagram: "https://www.instagram.com/stoicist_zayen",
  telegram: "https://t.me/dynamonsworld07",
};

type Ctx = {
  loading: boolean;
  branding: SiteBranding;
  announcement: Announcement;
  socials: Socials;
  overrides: Record<string, ModOverride>;
  mods: Mod[]; // merged + visible
  allMods: Mod[]; // merged including hidden
  refresh: () => Promise<void>;
};

const C = createContext<Ctx>({
  loading: true,
  branding: DEFAULT_BRANDING,
  announcement: DEFAULT_ANNOUNCEMENT,
  socials: DEFAULT_SOCIALS,
  overrides: {},
  mods: baseMods,
  allMods: baseMods,
  refresh: async () => {},
});

function applyOverride(mod: Mod, o?: ModOverride): Mod {
  if (!o) return mod;
  const downloads =
    o.downloads_absolute != null
      ? Math.max(0, o.downloads_absolute + (o.downloads_boost || 0))
      : Math.max(0, mod.downloads + (o.downloads_boost || 0));
  const baseLikes =
    o.likes_absolute != null
      ? Math.max(0, o.likes_absolute + (o.likes_boost || 0))
      : Math.max(0, mod.baseLikes + (o.likes_boost || 0));
  return {
    ...mod,
    name: o.name || mod.name,
    tagline: o.tagline || mod.tagline,
    description: o.description || mod.description,
    version: o.version || mod.version,
    size: o.size || mod.size,
    updated: o.updated_date || mod.updated,
    youtubeId: o.youtube_id ?? mod.youtubeId,
    features: o.features && o.features.length ? o.features : mod.features,
    changelog: o.changelog && o.changelog.length ? o.changelog : mod.changelog,
    downloads,
    baseLikes,
    baseRating: o.rating ?? mod.baseRating,
    ratingCount: o.rating_count ?? mod.ratingCount,
  };
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<SiteBranding>(DEFAULT_BRANDING);
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  const [socials, setSocials] = useState<Socials>(DEFAULT_SOCIALS);
  const [overrides, setOverrides] = useState<Record<string, ModOverride>>({});
  const [featuredSlug, setFeaturedSlug] = useState<string | null>(null);

  const refresh = async () => {
    const [{ data: settings }, { data: ov }] = await Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("mod_overrides").select("*"),
    ]);
    const map = new Map<string, unknown>();
    (settings ?? []).forEach((r: { key: string; value: unknown }) => map.set(r.key, r.value));
    setBranding({ ...DEFAULT_BRANDING, ...(map.get("branding") as Partial<SiteBranding> | undefined) });
    setAnnouncement({ ...DEFAULT_ANNOUNCEMENT, ...(map.get("announcement") as Partial<Announcement> | undefined) });
    setSocials({ ...DEFAULT_SOCIALS, ...(map.get("socials") as Partial<Socials> | undefined) });
    const f = map.get("featured") as { slug?: string } | undefined;
    setFeaturedSlug(f?.slug ?? null);
    const overrideMap: Record<string, ModOverride> = {};
    (ov ?? []).forEach((r) => { overrideMap[r.slug as string] = r as unknown as ModOverride; });
    setOverrides(overrideMap);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const { mods, allMods } = useMemo(() => {
    const merged = baseMods.map((m) => applyOverride(m, overrides[m.slug]));
    // Re-order to put featured first
    const fSlug = featuredSlug;
    const ordered = fSlug
      ? [...merged].sort((a, b) => (a.slug === fSlug ? -1 : b.slug === fSlug ? 1 : 0))
      : merged;
    const visible = ordered.filter((m) => !overrides[m.slug]?.hidden);
    return { mods: visible, allMods: ordered };
  }, [overrides, featuredSlug]);

  return (
    <C.Provider value={{ loading, branding, announcement, socials, overrides, mods, allMods, refresh }}>
      {children}
    </C.Provider>
  );
}

export const useSiteSettings = () => useContext(C);
