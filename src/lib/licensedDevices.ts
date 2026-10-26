import type { ActivatedUser, ValidKey } from "./dgData";

/** Current key bindings and expiry, rather than historical login rows, define this list. */
export function licensedDevices(
  users: ActivatedUser[],
  keys: ValidKey[],
  now: number,
): ActivatedUser[] {
  const byDevice = new Map<string, ValidKey[]>();
  for (const key of keys) {
    if (
      !key.device ||
      key.device === "null" ||
      key.status !== "active" ||
      !Number.isFinite(key.expiry) ||
      key.expiry < 0 ||
      (key.expiry > 0 && key.expiry <= now)
    )
      continue;
    const group = byDevice.get(key.device) ?? [];
    group.push(key);
    byDevice.set(key.device, group);
  }
  return users.flatMap((row) => {
    const group = byDevice.get(row.fingerprint);
    if (!group?.length) return [];
    const current = group.find((key) => key.key === (row.Key ?? row.key)) ?? group[0];
    return [{ ...row, Key: current.key, key: current.key, expiry: current.expiry }];
  });
}
