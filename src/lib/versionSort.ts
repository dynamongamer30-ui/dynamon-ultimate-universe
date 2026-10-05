/**
 * Version helpers so "1.13.33" correctly ranks above "1.9.43"
 * (plain text sorting gets this wrong).
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) =>
    String(v || "")
      .replace(/^v/i, "")
      .split(/[.\-+]/)
      .map((part) => parseInt(part, 10) || 0);
  const pa = parse(a);
  const pb = parse(b);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

type Rankable = { version: string; updated: string; downloads: number; baseLikes: number };

/**
 * Newest version first (1.13.33, then 1.13.32, then 1.13.31 ...).
 * Ties: most recently updated first, then most popular.
 */
export function sortByLatest<T extends Rankable>(list: T[]): T[] {
  const popularity = (m: Rankable) => m.downloads * 0.6 + m.baseLikes * 4;
  return [...list].sort(
    (a, b) =>
      compareVersions(b.version, a.version) ||
      +new Date(b.updated) - +new Date(a.updated) ||
      popularity(b) - popularity(a),
  );
}
