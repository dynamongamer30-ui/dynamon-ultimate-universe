const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Release dates are calendar values. Locale/time-zone defaults must not change SSR text. */
export function formatReleaseDate(value: string, monthOnly = false): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  const month = MONTHS[date.getUTCMonth()];
  return monthOnly
    ? `${month} ${date.getUTCFullYear()}`
    : `${month} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}
