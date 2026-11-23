export function parseOwnerDateTime(input: string, timeZone: string): Date {
  const value = input.trim();
  if (/[zZ]$|[+-]\d{2}:\d{2}$/.test(value)) {
    const absolute = new Date(value);
    if (!Number.isFinite(absolute.getTime())) throw new Error("Invalid date/time");
    return absolute;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) throw new Error("Use YYYY-MM-DD HH:mm in the Owner timezone, or provide an ISO timestamp with an explicit offset");
  const [year, month, day, hour, minute, second] = match.slice(1).map((x) => Number(x ?? 0));
  const target = Date.UTC(year!, month! - 1, day!, hour!, minute!, second!);
  const check = new Date(target);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month! - 1 || check.getUTCDate() !== day ||
      check.getUTCHours() !== hour || check.getUTCMinutes() !== minute || check.getUTCSeconds() !== second) {
    throw new Error("Invalid calendar date/time");
  }
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23"
  });
  let candidate = target;
  for (let i = 0; i < 4; i++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
    const localAsUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day),
      Number(parts.hour), Number(parts.minute), Number(parts.second));
    candidate += target - localAsUtc;
  }
  const finalParts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map((part) => [part.type, part.value]));
  if (Number(finalParts.year) !== year || Number(finalParts.month) !== month || Number(finalParts.day) !== day ||
      Number(finalParts.hour) !== hour || Number(finalParts.minute) !== minute || Number(finalParts.second) !== second) {
    throw new Error("This local time does not exist in the Owner timezone because of a daylight-saving transition");
  }
  return new Date(candidate);
}
export function formatOwnerDateTime(value: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone, dateStyle: "medium", timeStyle: "short", timeZoneName: "short"
  }).format(typeof value === "string" ? new Date(value) : value);
}
