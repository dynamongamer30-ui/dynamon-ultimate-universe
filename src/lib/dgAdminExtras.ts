```ts
/**
 * DG admin extras — feature-parity data layer for the legacy Firebase admin panel.
 * Backed by the SAME Supabase tables + owner-only RLS the Workers use.
 * Covers: access-token generation, rate-limit inspection/unblock,
 * feature locks, and key rotate / reduce / device-unbind.
 *
 * PATH: src/lib/dgAdminExtras.ts
 */
import { supabase } from "@/integrations/supabase/client";
import { extendKey, getConfigNode, setConfigNode, nowSeconds } from "@/lib/dgData";

type Json = Record<string, unknown>;

// ---- low-level KV helpers (id + jsonb "data"), mirrors dgData ----
async function selectAll(table: string): Promise<Array<{ id: string; data: Json }>> {
  const { data, error } = await supabase.from(table as never).select("id,data");
  if (error) throw error;
  return (data as unknown as Array<{ id: string; data: Json }>) ?? [];
}
async function selectOne(table: string, id: string): Promise<Json | null> {
  const { data, error } = await supabase.from(table as never).select("data").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as { data: Json } | null)?.data ?? null;
}
async function upsertRow(table: string, id: string, data: Json): Promise<void> {
  const { error } = await supabase.from(table as never).upsert({ id, data } as never, { onConflict: "id" });
  if (error) throw error;
}
async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await supabase.from(table as never).delete().eq("id", id);
  if (error) throw error;
}
async function patchRow(table: string, id: string, patch: Json): Promise<void> {
  const cur = (await selectOne(table, id)) ?? {};
  await upsertRow(table, id, { ...cur, ...patch });
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const rand = (n: number) =>
  Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

// ============================================================
// #1 Access-token generation (feeds the Generator worker flow)
// ============================================================
export interface AccessToken { token: string; url: string; }
export async function generateAccessTokens(qty: number, prefix = "ref"): Promise<AccessToken[]> {
  const n = Math.max(1, Math.min(500, Math.floor(qty) || 1));
  const p = (prefix || "ref").trim().replace(/[^A-Za-z0-9_-]/g, "") || "ref";
  const base = window.location.origin + "/generator.html";
  const out: AccessToken[] = [];
  for (let i = 0; i < n; i++) {
    let token = "";
    for (let a = 0; a < 12; a++) {
      const cand = p + "_" + Math.random().toString(36).slice(2, 8) + Date.now().toString(36) + i.toString(36);
      if (!(await selectOne("access_tokens", cand))) { token = cand; break; }
    }
    if (!token) throw new Error("could not allocate a unique access token");
    await upsertRow("access_tokens", token, { createdAt: nowSeconds(), createdBy: "admin", used: false });
    out.push({ token, url: base + "?ref=" + encodeURIComponent(token) });
  }
  return out;
}
export interface AccessTokenRow { token: string; used: boolean; createdAt: number | null; }
export async function listAccessTokensFull(): Promise<AccessTokenRow[]> {
  const rows = await selectAll("access_tokens");
  return rows
    .map((r) => ({ token: r.id, used: Boolean(r.data?.used), createdAt: (r.data?.createdAt as number) ?? null }))
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}
export async function deleteAccessToken(token: string): Promise<void> { await deleteRow("access_tokens", token); }

// ============================================================
// #2 Rate limits — inspect + unblock IP
// ============================================================
export interface RateLimitRow { id: string; ip: string; count: number; data: Json; }
function ipFromKey(key: string): string {
  return key.replace(/^rl[:_]?/i, "").replace(/_/g, ".");
}
export async function listRateLimited(): Promise<RateLimitRow[]> {
  const rows = await selectAll("rate_limits");
  return rows.map((r) => {
    const d = r.data ?? {};
    const hits = Array.isArray((d as Json).hits) ? ((d as Json).hits as unknown[]).length
      : typeof (d as Json).count === "number" ? ((d as Json).count as number) : 0;
    return { id: r.id, ip: ipFromKey(r.id), count: hits, data: d };
  }).sort((a, b) => b.count - a.count);
}
export async function rateLimitedCount(): Promise<number> { return (await listRateLimited()).length; }
export async function unblockIP(ipOrKey: string): Promise<number> {
  const raw = ipOrKey.trim();
  const key = raw.replace(/[.:]/g, "_");
  const rows = await selectAll("rate_limits");
  const targets = rows.filter((r) => r.id === raw || r.id === key || r.id.includes(key) || r.id.includes(raw));
  for (const t of targets) await deleteRow("rate_limits", t.id);
  return targets.length;
}

// ============================================================
// #3 Feature locks (Config/FeatureLocks map: feature -> locked bool)
// ============================================================
export async function getFeatureLocks(): Promise<Record<string, boolean>> {
  const node = (await getConfigNode("FeatureLocks")) as Record<string, boolean> | null;
  return node ?? {};
}
export async function setFeatureLock(name: string, locked: boolean): Promise<void> {
  const cur = await getFeatureLocks();
  cur[name] = locked;
  await setConfigNode("FeatureLocks", cur);
}

// ============================================================
// #7 Key tools — rotate / reduce / unbind device
// ============================================================
export async function reduceKey(key: string, hours: number): Promise<void> {
  // reuse extendKey with a negative delta so expiry math stays identical
  await extendKey(key, -Math.abs(hours));
}
export async function unbindKeyDevice(key: string): Promise<number> {
  await patchRow("valid_keys", key, { deviceId: null, boundDevice: null, fingerprint: null, fp: null });
  const users = await selectAll("activated_users");
  const bound = users.filter((u) => {
    const d = u.data ?? {};
    return d.Key === key || d.key === key;
  });
  for (const b of bound) await deleteRow("activated_users", b.id);
  return bound.length;
}
export async function rotateKey(oldKey: string): Promise<string> {
  const data = await selectOne("valid_keys", oldKey);
  if (!data) throw new Error("key not found");
  const isVip = /^(vip-|dgvip_)/i.test(oldKey);
  const prefix = oldKey.includes("-") ? oldKey.split("-")[0] : (isVip ? "VIP" : "DG");
  const newKey = prefix + "-" + rand(6);
  await upsertRow("valid_keys", newKey, { ...data, rotatedFrom: oldKey, rotatedAt: nowSeconds() });
  await deleteRow("valid_keys", oldKey);
  for (const table of ["activated_users", "banned_devices"]) {
    const rows = await selectAll(table);
    for (const r of rows) {
      const d = r.data ?? {};
      if (d.Key === oldKey || d.key === oldKey) {
        await patchRow(table, r.id, { Key: newKey, key: newKey });
      }
    }
  }
  return newKey;
}
```
