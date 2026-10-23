import type { Element } from "./mods";

export type DiscoverySort = "latest" | "popular" | "downloads" | "likes" | "newest";
export type DiscoverySearch = {
  q?: string;
  sort?: DiscoverySort;
  elements?: string;
  rating?: number;
  version?: string;
};

export const DISCOVERY_ELEMENTS: Element[] = [
  "dark",
  "fire",
  "thunder",
  "water",
  "earth",
  "diamond",
  "gold",
  "spirit",
];

export const DISCOVERY_BADGES: Record<DiscoverySort, string> = {
  latest: "Latest version",
  popular: "Most popular",
  downloads: "Most downloaded",
  likes: "Most liked",
  newest: "Recently updated",
};

/** Keep shared URLs bounded and predictable without rejecting the whole route. */
export function normalizeDiscoverySearch(raw: Record<string, unknown>): DiscoverySearch {
  const result: DiscoverySearch = {};
  // Preserve trailing spaces while typing multi-word searches.
  if (typeof raw.q === "string" && raw.q) result.q = raw.q.slice(0, 200);
  if (
    typeof raw.sort === "string" &&
    raw.sort !== "latest" &&
    Object.hasOwn(DISCOVERY_BADGES, raw.sort)
  )
    result.sort = raw.sort as DiscoverySort;
  if (typeof raw.elements === "string") {
    const requested = new Set(raw.elements.slice(0, 200).split(","));
    const elements = DISCOVERY_ELEMENTS.filter((element) => requested.has(element));
    if (elements.length) result.elements = elements.join(",");
  }
  const rating =
    typeof raw.rating === "string" || typeof raw.rating === "number" ? Number(raw.rating) : 0;
  if ([4, 4.5, 4.7, 4.9].includes(rating)) result.rating = rating;
  if (
    typeof raw.version === "string" &&
    raw.version &&
    raw.version !== "all" &&
    raw.version.length <= 80 &&
    [...raw.version].every(
      (character) => character.charCodeAt(0) >= 32 && character.charCodeAt(0) !== 127,
    )
  )
    result.version = raw.version;
  // TanStack merges validated search with the input search object. Explicit
  // undefined values overwrite invalid known keys while serializing compactly.
  return {
    q: result.q,
    sort: result.sort,
    elements: result.elements,
    rating: result.rating,
    version: result.version,
  };
}
