/** Matches the Worker's activation timer: unbound keys have not started yet. */
export type KeyTiming = { device: string | null; expiry: number };

export function isKeyBound(key: KeyTiming): boolean {
  return !!key.device && key.device !== "null";
}

export function isKeyExpired(key: KeyTiming, nowSeconds: number): boolean {
  return isKeyBound(key) && key.expiry > 0 && key.expiry <= nowSeconds;
}

export function extendedKeyData(current: Record<string, unknown>, hours: number, now: number): Record<string, unknown> {
  if (!Number.isFinite(hours) || hours <= 0 || hours > 87600) throw new Error("Enter 1–87600 hours.");
  const duration = Number(current.durationHours ?? current.duration ?? 24);
  const expiry = Number(current.expiry ?? 0);
  const bound = isKeyBound({ device: current.device == null ? null : String(current.device), expiry });
  if (duration === 0 || (bound && expiry === 0)) throw new Error("This key already has lifetime access.");
  if (!Number.isFinite(duration) || duration < 0 || !Number.isFinite(expiry) || expiry < 0) {
    throw new Error("This key uses an unsupported duration. No changes were saved.");
  }
  return { ...current, durationHours: duration + hours, expiry: bound ? Math.max(expiry, now) + Math.floor(hours * 3600) : 0 };
}
