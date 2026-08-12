export const SITE_URL = "https://dynamongamer.space";
export const SITE_NAME = "Dynamon Universe";
export const DEFAULT_SOCIAL_IMAGE = `${SITE_URL}/dynamon-gamer-avatar.png`;

export type SeoPage = {
  path: string;
  title: string;
  description: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

/** Absolute canonical URL for a public route. */
export function canonicalUrl(path: string): string {
  return SITE_URL + (path.startsWith("/") ? path : `/${path}`);
}

/** Normalizes local asset paths before using them in social and schema metadata. */
export function absoluteUrl(value: string): string {
  return value.startsWith("http") ? value : canonicalUrl(value);
}

/** Canonical, social, and index-control metadata for a public or utility route. */
export function pageSeoHead({ path, title, description, image = DEFAULT_SOCIAL_IMAGE, type = "website", noIndex = false }: SeoPage) {
  const url = canonicalUrl(path);
  const socialImage = absoluteUrl(image);
  return {
    links: [{ rel: "canonical", href: url }],
    meta: [
      { title },
      { name: "description", content: description },
      { name: "robots", content: noIndex ? "noindex, nofollow" : "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
      { property: "og:type", content: type },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:image", content: socialImage },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: socialImage },
    ],
  };
}

/** Backward-compatible canonical helper for existing routes. */
export function canonicalHead(path: string) {
  const url = canonicalUrl(path);
  return {
    links: [{ rel: "canonical", href: url }],
    meta: [{ property: "og:url", content: url }],
  };
}

/** Meta entry to keep private/utility pages out of search results entirely. */
export const noIndexMeta = { name: "robots", content: "noindex, nofollow" };

/** JSON-LD script entry for TanStack Start route heads. */
export function jsonLdScript(data: Record<string, unknown>) {
  return { type: "application/ld+json", children: JSON.stringify(data) };
}

export function organizationJsonLd() {
  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    alternateName: ["Dynamon Gamer", "Dynamon Gamer Space"],
    url: SITE_URL,
    logo: DEFAULT_SOCIAL_IMAGE,
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

export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  });
}

export function faqPageJsonLd(items: Array<{ question: string; answer: string }>) {
  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  });
}

export function itemListJsonLd(items: Array<{ name: string; path: string; image?: string }>) {
  return jsonLdScript({
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListOrder: "https://schema.org/ItemListOrderDescending",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: canonicalUrl(item.path),
      name: item.name,
      ...(item.image ? { image: absoluteUrl(item.image) } : {}),
    })),
  });
}

/** SoftwareApplication schema for an individual build detail page. */
export function softwareAppJsonLd(mod: {
  name: string; slug: string; tagline: string; image: string;
  rating?: number; ratingCount?: number; version?: string; updated?: string;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: mod.name,
    description: mod.tagline,
    image: absoluteUrl(mod.image),
    url: canonicalUrl(`/mods/${mod.slug}`),
    applicationCategory: "GameApplication",
    operatingSystem: "Android",
    ...(mod.version ? { softwareVersion: mod.version } : {}),
    ...(mod.updated ? { dateModified: mod.updated } : {}),
  };
  if (mod.rating && mod.ratingCount) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: mod.rating,
      ratingCount: mod.ratingCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return jsonLdScript(data);
}
