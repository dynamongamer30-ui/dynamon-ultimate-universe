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

async function selectAll(table: string): Promise<Row[]> {
  const { data, error } = await supabase.from(table as never).select("id,data");
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as Row[];
}

async function selectOne(table: string, id: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase.from(table as never).select("data").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { data?: Record<string, unknown> } | null)?.data ?? null;
}

async function upsertRow(table: string, id: string, data: unknown): Promise<void> {
  const { error } = await supabase.from(table as never).upsert({ id, data } as never, { onConflict: "id" });
  if (error) throw new Error(error.message);
}

/** Merge-patch a jsonb row (read-modify-write, matching the Workers' fbPatch). */
async function patchRow(table: string, id: string, patch: Record<string, unknown>): Promise<void> {
  const cur = (await selectOne(table, id)) ?? {};
  await upsertRow(table, id, { ...cur, ...patch });
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table as never).delete().eq("id", id);
  if (error) throw new Error(error.message);
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
export function listKeys(cb: (keys: ValidKey[]) => void): () => void {
  let cancelled = false;

  const load = async () => {
    try {
      const rows = await selectAll("valid_keys");
      if (!cancelled) cb(rows.map((r) => toValidKey(r.id, r.data)));
    } catch {
      if (!cancelled) cb([]);
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
    void supabase.removeChannel(channel);
  };
}

export async function revokeKey(key: string): Promise<void> {
  await patchRow("valid_keys", key, { status: "revoked" });
}
export async function unrevokeKey(key: string): Promise<void> {
  await patchRow("valid_keys", key, { status: "active" });
}
export async function deleteKey(key: string): Promise<void> {
  await deleteRow("valid_keys", key);
}

/** Add `hours` to expiry (unix seconds) and durationHours. */
export async function extendKey(key: string, hours: number): Promise<void> {
  const cur = (await selectOne("valid_keys", key)) ?? {};
  const nowSec = nowSeconds();
  const baseExpiry = Number(cur.expiry ?? 0) > nowSec ? Number(cur.expiry) : nowSec;
  await patchRow("valid_keys", key, {
    expiry: baseExpiry + Math.floor(hours * 3600),
    durationHours: Number(cur.durationHours ?? 0) + hours,
  });
}

export async function keyExists(key: string): Promise<boolean> {
  return (await selectOne("valid_keys", key)) !== null;
}

/** Create a manual key (owner-added). Returns the allocated key id. */
export async function createManualKey(prefix: string, hours: number): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const rand = () => {
    let s = "";
    for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };
  const clean = (prefix || "DG").trim().toUpperCase();

  let key = "";
  for (let i = 0; i < 10; i++) {
    const cand = `${clean}-${rand()}`;
    if (!(await keyExists(cand))) {
      key = cand;
      break;
    }
  }
  if (!key) throw new Error("Could not allocate a unique key");

  const now = nowSeconds();
  await upsertRow("valid_keys", key, {
    status: "active",
    expiry: now + Math.floor(hours * 3600),
    durationHours: hours,
    activated: false,
    device: null,
    date: now,
    fingerprint: "",
    sourceIP: "",
    source: "admin",
  });
  return key;
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

export async function listBannedDevices(): Promise<BannedDevice[]> {
  const rows = await selectAll("banned_devices");
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

export async function listActivatedUsers(): Promise<ActivatedUser[]> {
  const rows = await selectAll("activated_users");
  return rows.map((r) => ({ fingerprint: r.id, ...(r.data ?? {}) }));
}

// ---------- Misc helpers ----------

export const nowSeconds = () => Math.floor(Date.now() / 1000);
