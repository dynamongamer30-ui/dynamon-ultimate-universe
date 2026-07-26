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
  seed_rating_points: number | null;
  seed_rating_count: number | null;
  downloads_absolute: number | null;
  likes_absolute: number | null;
  real_downloads: number;
  download_url: string | null;
  /** AES-encrypted MEGA download link (encrypted with VITE_CIPHER_KEY). */
  mega_enc: string | null;
  /** AES-encrypted shortener/earn-link (e.g. followyou.me), shown before the unlock page (encrypted with VITE_CIPHER_KEY). */
  follow_enc: string | null;
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

function applyOverride(
  mod: Mod,
  o: ModOverride | undefined,
  realLikes: number,
  realRatingSum: number,
  realRatingCount: number,
): Mod {
  if (!o) {
    // No admin override row at all — still fold in real likes/ratings.
    const combinedRating = realRatingCount > 0
      ? realRatingSum / realRatingCount
      : mod.baseRating;
    return {
      ...mod,
      baseLikes: Math.max(0, mod.baseLikes + realLikes),
      baseRating: combinedRating,
      ratingCount: realRatingCount,
    };
  }

  // Downloads = the owner's "set to" seed (or the mod's built-in default)
  // + REAL completed downloads (mod_overrides.real_downloads, incremented
  // server-side by redeem_secure_session on every genuine unlock).
  const downloadsSeed = o.downloads_absolute != null ? o.downloads_absolute : mod.downloads;
  const downloads = Math.max(0, downloadsSeed + (o.real_downloads || 0));

  // Likes = the owner's "set to" seed + REAL per-user likes from mod_likes.
  // Set it to 1000, then every genuine like a user gives adds 1 on top.
  const likesSeed = o.likes_absolute != null ? o.likes_absolute : mod.baseLikes;
  const baseLikes = Math.max(0, likesSeed + realLikes);

  // Rating = weighted blend of the owner's seed (points/count) and real
  // reviews. Set seed to 1000 points / 200 votes (avg 5.0), then every real
  // review adds its stars to the points and 1 to the count — the seed never
  // gets dropped or overwritten, it just keeps getting diluted by real data.
  const seedPoints = o.seed_rating_points ?? (o.rating != null ? o.rating * 200 : mod.baseRating * 200);
  const seedCount = o.seed_rating_count ?? 200;
  const totalPoints = seedPoints + realRatingSum;
  const totalCount = seedCount + realRatingCount;
  const combinedRating = totalCount > 0 ? totalPoints / totalCount : mod.baseRating;
  const combinedCount = totalCount;

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
    baseRating: combinedRating,
    ratingCount: combinedCount,
  };
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [branding, setBranding] = useState<SiteBranding>(DEFAULT_BRANDING);
  const [announcement, setAnnouncement] = useState<Announcement>(DEFAULT_ANNOUNCEMENT);
  const [socials, setSocials] = useState<Socials>(DEFAULT_SOCIALS);
  const [overrides, setOverrides] = useState<Record<string, ModOverride>>({});
  const [featuredSlug, setFeaturedSlug] = useState<string | null>(null);
  const [realLikes, setRealLikes] = useState<Record<string, number>>({});
  const [realRatings, setRealRatings] = useState<Record<string, { sum: number; count: number }>>({});

  const refresh = async () => {
    const [{ data: settings }, { data: ov }, { data: likeRows }, { data: ratingRows }] = await Promise.all([
      supabase.from("site_settings").select("key, value"),
      supabase.from("mod_overrides").select("*"),
      supabase.from("mod_likes").select("mod_slug"),
      supabase.from("comments").select("mod_slug, rating").not("rating", "is", null),
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

    // Real per-mod like counts — one row per user per mod in mod_likes.
    const likeCounts: Record<string, number> = {};
    (likeRows ?? []).forEach((r: { mod_slug: string }) => {
      likeCounts[r.mod_slug] = (likeCounts[r.mod_slug] || 0) + 1;
    });
    setRealLikes(likeCounts);

    // Real per-mod rating aggregates — top-level reviews only (replies
    // have rating: null, already filtered by the .not("rating","is",null)).
    const ratingAgg: Record<string, { sum: number; count: number }> = {};
    (ratingRows ?? []).forEach((r: { mod_slug: string; rating: number }) => {
      const cur = ratingAgg[r.mod_slug] || { sum: 0, count: 0 };
      cur.sum += r.rating;
      cur.count += 1;
      ratingAgg[r.mod_slug] = cur;
    });
    setRealRatings(ratingAgg);

    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const { mods, allMods } = useMemo(() => {
    const merged = baseMods.map((m) => {
      const rl = realLikes[m.slug] || 0;
      const rr = realRatings[m.slug] || { sum: 0, count: 0 };
      return applyOverride(m, overrides[m.slug], rl, rr.sum, rr.count);
    });
    // Re-order to put featured first
    const fSlug = featuredSlug;
    const ordered = fSlug
      ? [...merged].sort((a, b) => (a.slug === fSlug ? -1 : b.slug === fSlug ? 1 : 0))
      : merged;
    const visible = ordered.filter((m) => !overrides[m.slug]?.hidden);
    return { mods: visible, allMods: ordered };
  }, [overrides, featuredSlug, realLikes, realRatings]);

  return (
    <C.Provider value={{ loading, branding, announcement, socials, overrides, mods, allMods, refresh }}>
      {children}
    </C.Provider>
  );
}

export const useSiteSettings = () => useContext(C);
