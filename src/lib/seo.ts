export const SITE_URL = "https://dynamongamer.space";
export const SITE_NAME = "Dynamon Gamer";

/** Absolute canonical URL for a given path (e.g. "/mods/fire-phoenix"). */
export function canonicalUrl(path: string): string {
  return SITE_URL + (path.startsWith("/") ? path : `/${path}`);
}

/** Link + meta entries for a canonical URL + matching og:url. Spread into head(). */
export function canonicalHead(path: string) {
  const url = canonicalUrl(path);
  return {
    links: [{ rel: "canonical", href: url }],
    meta: [{ property: "og:url", content: url }],
  };
}

/** Meta entry to keep a private/utility page out of search results entirely. */
export const noIndexMeta = { name: "robots", content: "noindex, nofollow" };

/** JSON-LD <script> entry for head()'s `scripts` array. */
export function jsonLdScript(data: Record<string, unknown>) {
  return { type: "application/ld+json", children: JSON.stringify(data) };
}

export function organizationJsonLd() {
  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: ["Dynamon Gamer Space", "Dynamon Gamer 07"],
    url: SITE_URL,
  });
}

export function websiteJsonLd() {
  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/mods?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  });
}

/** SoftwareApplication schema for a mod detail page — eligible for rich results. */
export function softwareAppJsonLd(mod: {
  name: string; slug: string; tagline: string; image: string;
  rating?: number; ratingCount?: number; downloads?: number; version?: string;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: mod.name,
    description: mod.tagline,
    image: mod.image,
    url: canonicalUrl(`/mods/${mod.slug}`),
    applicationCategory: "GameApplication",
    operatingSystem: "Android",
    ...(mod.version ? { softwareVersion: mod.version } : {}),
  };
  if (mod.rating && mod.ratingCount) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: mod.rating,
      ratingCount: mod.ratingCount,
    };
  }
  return jsonLdScript(data);
}
