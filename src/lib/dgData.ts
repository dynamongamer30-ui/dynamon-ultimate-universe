/**
 * DG data layer — Supabase-backed (replaces the old Firebase Realtime DB).
 *
 * Single source of truth shared by:
 *   - Cloudflare Workers (Generator + License) — via the service-role key
 *   - Android app — through the Workers only
 *   - This web admin — as the signed-in owner (RLS enforced)
 *
 * Storage model (matches the Workers' Firebase-compat shim exactly):
 *   Every former Firebase node is ONE row: (id text primary key, data jsonb).
 *   e.g. ValidKeys/DG-AB12CD  ->  table valid_keys, row id "DG-AB12CD",
 *   fields live inside the `data` jsonb column.
 *
 * Node shapes are part of the wire contract — do NOT rename fields or change
 * time units. All KEY times are UNIX SECONDS (matching the Workers/app).
 */

import { supabase } from "@/integrations/supabase/client";
import { extendedKeyData } from "@/lib/dgKeyPolicy";

// ---------- Types (wire contract, unchanged) ----------

export interface ValidKey {
  key: string; // row id, e.g. "DG-AB12CD"
  status: "active" | "revoked";
  expiry: number; // unix seconds
  durationHours: number;
  activated: boolean;
  device: string | null;
  date: number; // unix seconds (created)
  fingerprint: string;
  sourceIP: string;
  source: "web" | string;
}

export interface DgConfig {
  Maintenance: boolean;
  RateLimit: { enabled: boolean };
  KeyDurationHours: number;
  IPWhitelist: string[];
}

/** App Update System — mirrors the former Firebase `Config/Update` node.
 *  The Android app reads these fields verbatim, so names/casing must not change. */
export interface AppUpdate {
  Enabled: boolean;
  VersionCode: number;
  VersionName: string;
  Title: string;
  Subtitle: string;
  WhatsNew: string;
  UpdateUrl: string;
  BtnText: string;
}

export interface GenerationLog {
  id: string;
  key: string;
  ip: string;
  fingerprint: string;
  time: number; // unix seconds
}

export interface AccessToken {
  token: string;
  used: boolean;
  createdAt: number; // ms
}

export interface BannedDevice {
  fingerprint: string;
  reason: string;
  time: number; // unix seconds
}

export interface ActivatedUser {
  fingerprint: string;
  [k: string]: unknown;
}

// ---------- Low-level (id, data) helpers ----------

type Row = { id: string; data: Record<string, unknown> };

async function selectAll(table: string, signal?: AbortSignal): Promise<Row[]> {
  const { data, error } = await supabase
    .from(table as never)
    .select("id,data")
    .abortSignal(signal ?? AbortSignal.timeout(10000))
    .retry(false);
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error("Invalid management lookup response");
  return data as unknown as Row[];
}

async function selectOne(table: string, id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from(table as never)
    .select("data")
    .eq("id", id)
    .abortSignal(AbortSignal.timeout(10000))
    .retry(false)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { data?: Record<string, unknown> } | null)?.data ?? null;
}

async function upsertRow(table: string, id: string, data: unknown): Promise<void> {
  const { data: confirmed, error } = await supabase
    .from(table as never)
    .upsert({ id, data } as never, { onConflict: "id" })
    .select("id")
    .abortSignal(AbortSignal.timeout(10000))
    .retry(false);
  if (error) throw new Error(error.message);
  if (!Array.isArray(confirmed) || !confirmed.some((row: { id?: unknown }) => row.id === id))
    throw new Error("Save was not confirmed. Refresh the saved entry before trying again.");
}

/** Conditional write prevents an open editor from overwriting newer data. */
export async function compareConfigNode(
  id: string,
  value: unknown,
  expected: unknown,
): Promise<void> {
  await compareRow("app_config", id, value, expected);
}

async function compareRow(
  table: string,
  id: string,
  value: unknown,
  expected: unknown,
): Promise<void> {
  if (expected === null) {
    const { data, error } = await supabase
      .from(table as never)
      .insert({ id, data: value } as never)
      .select("id")
      .abortSignal(AbortSignal.timeout(10000))
      .retry(false);
    if (error)
      throw new Error(
        error.code === "23505"
          ? "Settings changed elsewhere. Reload before saving."
          : error.message,
      );
    if (!Array.isArray(data) || !data.some((row: { id?: unknown }) => row.id === id))
      throw new Error("Settings save was not confirmed. Reload before trying again.");
    return;
  }
  const { data, error } = await supabase
    .from(table as never)
    .update({ data: value } as never)
    .eq("id", id)
    .eq("data", JSON.stringify(expected))
    .select("id")
    .abortSignal(AbortSignal.timeout(10000))
    .retry(false);
  if (error) throw new Error(error.message);
  if (!data?.length)
    throw new Error("Data changed elsewhere or access was denied. Reload before saving.");
}

/** Merge only into an existing, unchanged row; never recreate a deleted key. */
async function patchRow(table: string, id: string, patch: Record<string, unknown>): Promise<void> {
  const cur = await selectOne(table, id);
  if (!cur) throw new Error("This entry no longer exists. Reload the page.");
  await compareRow(table, id, { ...cur, ...patch }, cur);
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { data, error } = await supabase
    .from(table as never)
    .delete()
    .eq("id", id)
    .select("id")
    .abortSignal(AbortSignal.timeout(10000))
    .retry(false);
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || !data.some((row: { id?: unknown }) => row.id === id))
    throw new Error("Removal was not confirmed. Reload before trying again.");
}

// ---------- ValidKeys ----------

function toValidKey(id: string, v: Record<string, unknown>): ValidKey {
  return {
    key: id,
    status: (v?.status as ValidKey["status"]) ?? "active",
    expiry: Number(v?.expiry ?? 0),
    durationHours: Number(v?.durationHours ?? 0),
    activated: Boolean(v?.activated),
    device: (v?.device as string | null) ?? null,
    date: Number(v?.date ?? 0),
    fingerprint: String(v?.fingerprint ?? ""),
    sourceIP: String(v?.sourceIP ?? ""),
    source: (v?.source as string) ?? "web",
  };
}

/**
 * Subscribe to ValidKeys with an initial fetch + Supabase Realtime updates.
 * Returns an unsubscribe fn (same contract as the old Firebase onValue).
 */
export function listKeys(
  cb: (keys: ValidKey[]) => void,
  onError?: (error: Error) => void,
): () => void {
  let cancelled = false;
  let running = false;
  let dirty = false;
  let controller: AbortController | undefined;

  const load = async () => {
    if (cancelled) return;
    if (running) {
      dirty = true;
      return;
    }
    running = true;
    dirty = false;
    controller = new AbortController();
    const deadline = setTimeout(() => controller?.abort(), 10000);
    try {
      const { data, error } = await supabase
        .from("valid_keys")
        .select("id,data")
        .abortSignal(controller.signal)
        .retry(false);
      if (error || !Array.isArray(data))
        throw new Error(error?.message || "Invalid key lookup response");
      const rows = data as unknown as Row[];
      if (!cancelled && !dirty) cb(rows.map((r) => toValidKey(r.id, r.data)));
    } catch (error) {
      if (!cancelled && !dirty)
        onError?.(error instanceof Error ? error : new Error("Could not load keys"));
    } finally {
      clearTimeout(deadline);
      running = false;
      if (!cancelled && dirty) void load();
    }
  };

  void load();

  const channel = supabase
    .channel("valid_keys_changes")
    .on("postgres_changes", { event: "*", schema: "public", table: "valid_keys" }, () => {
      void load();
    })
    .subscribe();

  return () => {
    cancelled = true;
    controller?.abort();
    void supabase.removeChannel(channel);
  };
}

export async function revokeKey(key: string): Promise<void> {
  const expected = await selectOne("valid_keys", key);
  if (!expected) throw new Error("This key no longer exists. Refresh the list.");
  await ownerKeyAction("revoke", key, undefined, expected);
}
export async function unrevokeKey(key: string): Promise<void> {
  const expected = await selectOne("valid_keys", key);
  await ownerKeyAction("unrevoke", key, undefined, expected);
}
export async function deleteKey(key: string): Promise<void> {
  const expected = await selectOne("valid_keys", key);
  await ownerKeyAction("delete", key, undefined, expected);
}

/** Add `hours` to expiry (unix seconds) and durationHours. */
export async function extendKey(key: string, hours: number): Promise<void> {
  const cur = await selectOne("valid_keys", key);
  if (!cur) throw new Error("This key no longer exists.");
  extendedKeyData(cur, hours, nowSeconds());
  await ownerKeyAction("extend", key, hours, cur);
}

export async function keyExists(key: string): Promise<boolean> {
  return (await selectOne("valid_keys", key)) !== null;
}

/** Owner JWT stays separate from server issuer/HMAC secrets. */
async function ownerKeyAction(action: string, key: string, hours?: number, expected?: unknown) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Sign in as the owner before changing keys.");
  const response = await fetch("https://royal-void-v2.dynamongamer30.workers.dev/v2/admin/keys", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: "Bearer " + session.access_token,
    },
    body: JSON.stringify({ action, key, hours, expected, requestId: crypto.randomUUID() }),
    signal: AbortSignal.timeout(20000),
  });
  const result = await response.json();
  if (!response.ok || result.ok !== true || result.key !== key)
    throw new Error(result.error || "Key action was not confirmed. Refresh before trying again.");
}

export async function createManualKey(prefix: string, hours: number): Promise<string> {
  if (!Number.isInteger(hours) || hours < 0 || hours > 87600)
    throw new Error("Enter 0–87600 whole hours; 0 means lifetime.");
  if (!["DG", "VIP"].includes(prefix)) throw new Error("Invalid key prefix.");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = crypto.getRandomValues(new Uint8Array(6));
  const key =
    prefix + "-" + Array.from(random, (byte) => alphabet[byte % alphabet.length]).join("");
  await ownerKeyAction("create", key, hours);
  return key;
}

export async function repairKey(key: string): Promise<void> {
  const expected = await selectOne("valid_keys", key);
  if (!expected) throw new Error("This key no longer exists. Refresh the list.");
  await ownerKeyAction("repair", key, undefined, expected);
}

// ---------- Config (each Config child = its own app_config row) ----------

export async function getConfig(): Promise<DgConfig> {
  const [maint, rate, dur, wl] = await Promise.all([
    selectOne("app_config", "Maintenance"),
    selectOne("app_config", "RateLimit"),
    selectOne("app_config", "KeyDurationHours"),
    selectOne("app_config", "IPWhitelist"),
  ]);
  // These rows store scalars/arrays directly as the jsonb value, so they come
  // back as the raw value (not wrapped in an object).
  const maintVal = maint as unknown;
  const durVal = dur as unknown;
  const wlVal = wl as unknown;
  return {
    Maintenance: Boolean(maintVal ?? false),
    RateLimit: { enabled: Boolean((rate as { enabled?: boolean } | null)?.enabled ?? false) },
    KeyDurationHours: Number(durVal ?? 24),
    IPWhitelist: Array.isArray(wlVal) ? (wlVal as string[]) : [],
  };
}

export async function setMaintenance(on: boolean): Promise<void> {
  await upsertRow("app_config", "Maintenance", on);
}
export async function setRateLimitEnabled(on: boolean): Promise<void> {
  await upsertRow("app_config", "RateLimit", { enabled: on });
}
export async function setKeyDurationHours(n: number): Promise<void> {
  await upsertRow("app_config", "KeyDurationHours", Math.max(1, Math.floor(n)));
}
export async function setIPWhitelist(ips: string[]): Promise<void> {
  await upsertRow("app_config", "IPWhitelist", ips);
}

/** Read/write arbitrary Config children (used by the Control panel). */
export async function getConfigNode<T = unknown>(id: string): Promise<T | null> {
  return (await selectOne("app_config", id)) as unknown as T | null;
}
export async function setConfigNode(id: string, value: unknown): Promise<void> {
  await upsertRow("app_config", id, value);
}

// ---------- App Update System (Config/Update node) ----------

export const DEFAULT_APP_UPDATE: AppUpdate = {
  Enabled: false,
  VersionCode: 0,
  VersionName: "",
  Title: "Update Available",
  Subtitle: "",
  WhatsNew: "",
  UpdateUrl: "",
  BtnText: "UPDATE",
};

export async function getAppUpdate(): Promise<AppUpdate> {
  const row = await getConfigNode<Partial<AppUpdate>>("Update");
  return { ...DEFAULT_APP_UPDATE, ...(row ?? {}) };
}

export async function setAppUpdate(u: AppUpdate): Promise<void> {
  await setConfigNode("Update", u);
}

// ---------- Logs / read-only nodes ----------

export async function listGenerationLogs(n = 200): Promise<GenerationLog[]> {
  const rows = await selectAll("generation_logs");
  return rows
    .map((r) => ({
      id: r.id,
      key: String(r.data?.key ?? ""),
      ip: String(r.data?.ip ?? ""),
      fingerprint: String(r.data?.fingerprint ?? ""),
      time: Number(r.data?.time ?? 0),
    }))
    .sort((a, b) => b.time - a.time)
    .slice(0, n);
}

export async function listAccessTokens(): Promise<AccessToken[]> {
  const rows = await selectAll("access_tokens");
  return rows.map((r) => ({
    token: r.id,
    used: Boolean(r.data?.used),
    createdAt: Number(r.data?.createdAt ?? 0),
  }));
}

export async function listBannedDevices(signal?: AbortSignal): Promise<BannedDevice[]> {
  const rows = await selectAll("banned_devices", signal);
  return rows.map((r) => {
    // Prefer `time` (unix seconds). Fall back to legacy `at` (ms) if present.
    const timeSec = Number(r.data?.time ?? 0);
    const atMs = Number(r.data?.at ?? 0);
    return {
      fingerprint: r.id,
      reason: String(r.data?.reason ?? ""),
      time: timeSec > 0 ? timeSec : atMs > 0 ? Math.floor(atMs / 1000) : 0,
    };
  });
}

export async function listActivatedUsers(signal?: AbortSignal): Promise<ActivatedUser[]> {
  const rows = await selectAll("activated_users", signal);
  return rows.map((r) => ({ ...(r.data ?? {}), fingerprint: r.id, recordData: r.data }));
}

export async function readDeviceLicenseKeys(signal: AbortSignal): Promise<ValidKey[]> {
  return (await selectAll("valid_keys", signal)).map((row) => toValidKey(row.id, row.data));
}

/** Delete information only; keep key bindings and bans. Refuse a stale record snapshot. */
export async function deleteDeviceInformation(fingerprint: string, expected: unknown) {
  if (expected === undefined) throw new Error("Reload device records before deleting information.");
  const { data, error } = await supabase
    .from("activated_users")
    .delete()
    .eq("id", fingerprint)
    .eq("data", JSON.stringify(expected))
    .select("id")
    .abortSignal(AbortSignal.timeout(10000))
    .maybeSingle()
    .retry(false);
  if (error) throw new Error(error.message);
  if (data?.id !== fingerprint)
    throw new Error(
      "Device information changed or deletion was not confirmed. Refresh before trying again.",
    );
}

/** Lock (ban) a device fingerprint. Matches the worker's banned_devices shape. */
export async function banDevice(fingerprint: string, reason = "manual ban"): Promise<void> {
  const nowSec = nowSeconds();
  await upsertRow("banned_devices", fingerprint, {
    reason,
    time: nowSec,
    at: Date.now(),
    by: "owner-panel",
  });
}

/** Unlock (unban) a device fingerprint. */
export async function unbanDevice(fingerprint: string): Promise<void> {
  await deleteRow("banned_devices", fingerprint);
}

// ---------- Misc helpers ----------

export const nowSeconds = () => Math.floor(Date.now() / 1000);
