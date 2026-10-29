export type Activity = { enabled: boolean; rows: { slug: string; version: string; at: number }[] };
export const event = "dg:browsing-changed";
const key = (id?: string) => `dg:browsing:v1:${id || "guest"}`;
export function read(id?: string): Activity {
  try {
    const v = JSON.parse(localStorage.getItem(key(id)) || "null");
    return {
      enabled: v?.enabled !== false,
      rows: Array.isArray(v?.rows)
        ? v.rows
            .filter(
              (r: Activity["rows"][number]) =>
                typeof r?.slug === "string" &&
                typeof r.version === "string" &&
                Number.isFinite(r.at),
            )
            .slice(0, 6)
        : [],
    };
  } catch {
    return { enabled: true, rows: [] };
  }
}
export function write(value: Activity, id?: string) {
  try {
    localStorage.setItem(key(id), JSON.stringify(value));
    window.dispatchEvent(new Event(event));
  } catch {
    /* optional device-local feature */
  }
}
export function clearBuildActivity(id: string) {
  try {
    localStorage.removeItem(key(id));
    window.dispatchEvent(new Event(event));
  } catch {
    /* storage unavailable */
  }
}
