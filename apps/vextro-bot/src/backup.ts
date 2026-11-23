import { createHash, randomBytes } from "node:crypto";
import { decryptBackupPayload, encryptBackupPayload } from "./backup-crypto.js";
import { db } from "./supabase.js";
import { config } from "./config.js";

const bucket = config.BACKUP_BUCKET;
const passphrase = config.BACKUP_PASSPHRASE;
const retentionDays = config.BACKUP_RETENTION_DAYS;
const backupTables: Array<{ name: string; conflict: string }> = [
  { name: "bot_users", conflict: "telegram_id" },
  { name: "bot_account_links", conflict: "id" },
  { name: "bot_link_requests", conflict: "token_hash" },
  { name: "bot_guides", conflict: "id" },
  { name: "bot_support_tickets", conflict: "id" },
  { name: "bot_support_messages", conflict: "id" },
  { name: "dgbot_guides", conflict: "id" },
  { name: "dgbot_guide_keywords", conflict: "id" },
  { name: "dgbot_allowlist", conflict: "id" },
  { name: "dgbot_moderation_rules", conflict: "id" },
  { name: "dgbot_audit_log", conflict: "id" },
  { name: "dgbot_bans", conflict: "telegram_id" },
  { name: "dgbot_posts", conflict: "id" },
  { name: "dgbot_group_help_handoffs", conflict: "nonce" },
  { name: "dgbot_review_queue", conflict: "id" },
  { name: "dgbot_alerts", conflict: "alert_key" },
  { name: "dgbot_pending_claims", conflict: "nonce" },
  { name: "dgbot_user_state", conflict: "telegram_id" },
  { name: "vextro_broadcast_jobs", conflict: "id" },
  { name: "vextro_broadcast_recipients", conflict: "id" },
  { name: "vextro_scheduled_posts", conflict: "id" },
  { name: "vextro_runtime_settings", conflict: "key" },
  { name: "vextro_moderation_events", conflict: "id" },
  { name: "vextro_update_approvals", conflict: "tag" },
  { name: "vextro_moderation_events", conflict: "id" },
  { name: "vextro_update_approvals", conflict: "tag" },
  { name: "dgbot_backup_runs", conflict: "id" }
];
type Snapshot = { format: "vextro-bot-backup"; version: 1; createdAt: string; tables: Record<string, Record<string, unknown>[]> };

function requirePassphrase() {
  if (!passphrase || passphrase.length < 16) throw new Error("BACKUP_PASSPHRASE must be configured with at least 16 characters");
  return passphrase;
}
async function collectTable(name: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await (db as any).from(name).select("*").range(from, from + 999);
    if (error) throw new Error(`Backup read failed for ${name}: ${error.message}`);
    rows.push(...((data ?? []) as Record<string, unknown>[]));
    if (!data || data.length < 1000) break;
  }
  return rows;
}
export async function createBackup(createdBy: number) {
  const tables: Snapshot["tables"] = {};
  for (const table of backupTables) tables[table.name] = await collectTable(table.name);
  const snapshot: Snapshot = { format: "vextro-bot-backup", version: 1, createdAt: new Date().toISOString(), tables };
  const encrypted = encryptBackupPayload(Buffer.from(JSON.stringify(snapshot)), requirePassphrase());
  const sha256 = createHash("sha256").update(encrypted).digest("hex");
  const path = `vextro/${new Date().toISOString().replace(/[:.]/g, "-")}-${randomBytes(4).toString("hex")}.vxb`;
  const { error: uploadError } = await db.storage.from(bucket).upload(path, encrypted, { contentType: "application/octet-stream", upsert: false });
  if (uploadError) throw new Error(`Backup upload failed: ${uploadError.message}`);
  const { data, error } = await db.from("vextro_backup_artifacts").insert({
    storage_path: path, format_version: 1, encryption: "aes-256-gcm", bytes: encrypted.byteLength,
    sha256, created_by: createdBy, expires_at: new Date(Date.now() + retentionDays * 86400_000).toISOString()
  }).select("id,storage_path,bytes,created_at").single();
  if (error || !data) {
    await db.storage.from(bucket).remove([path]);
    throw error ?? new Error("Backup metadata could not be saved");
  }
  if (config.BACKUP_OFFSITE_URL && config.BACKUP_OFFSITE_TOKEN) {
    try {
      const response = await fetch(config.BACKUP_OFFSITE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/octet-stream", Authorization: "Bearer " + config.BACKUP_OFFSITE_TOKEN, "X-Vextro-Backup-SHA256": sha256, "X-Vextro-Backup-Path": path },
        body: new Uint8Array(encrypted),
        signal: AbortSignal.timeout(30_000)
      });
      const receipt = response.ok ? await response.json() as { sha256?: string } : null;
      if (!response.ok || receipt?.sha256 !== sha256) throw new Error("Offsite endpoint did not return the matching SHA-256 receipt");
      await db.from("vextro_backup_artifacts").update({ offsite_url: config.BACKUP_OFFSITE_URL, offsite_verified_at: new Date().toISOString(), offsite_error: null }).eq("id", data.id);
    } catch (offsiteError) {
      const reason = offsiteError instanceof Error ? offsiteError.message.slice(0, 500) : "Offsite backup failed";
      await db.from("vextro_backup_artifacts").update({ offsite_url: config.BACKUP_OFFSITE_URL, offsite_error: reason }).eq("id", data.id);
    }
  }
  const verification = await verifyBackup(String(data.id));
  if (!verification.valid) throw new Error("Uploaded backup did not pass integrity/decryption verification");
  await db.from("vextro_backup_artifacts").update({ verified_at: new Date().toISOString() }).eq("id", data.id);
  await pruneBackups();
  const { data: completed, error: completedError } = await db.from("vextro_backup_artifacts")
    .select("id,storage_path,bytes,created_at,verified_at,offsite_url,offsite_verified_at,offsite_error").eq("id", data.id).single();
  if (completedError || !completed) throw completedError ?? new Error("Backup metadata verification failed");
  return completed;
}
export async function readBackup(id: string) {
  const { data: metadata, error } = await db.from("vextro_backup_artifacts").select("id,storage_path,sha256,bytes").eq("id", id).maybeSingle();
  if (error || !metadata) throw error ?? new Error("Backup artifact not found");
  const { data: blob, error: downloadError } = await db.storage.from(bucket).download(metadata.storage_path);
  if (downloadError || !blob) throw downloadError ?? new Error("Backup download failed");
  const encrypted = Buffer.from(await blob.arrayBuffer());
  const actual = createHash("sha256").update(encrypted).digest("hex");
  if (actual !== metadata.sha256 || encrypted.byteLength !== Number(metadata.bytes)) throw new Error("Backup integrity check failed");
  const snapshot = JSON.parse(decryptBackupPayload(encrypted, requirePassphrase()).toString("utf8")) as Snapshot;
  if (snapshot.format !== "vextro-bot-backup" || snapshot.version !== 1 || !snapshot.tables) throw new Error("Invalid backup payload");
  return { metadata, snapshot };
}
export async function verifyBackup(id: string) {
  try {
    const { metadata, snapshot } = await readBackup(id);
    return { valid: true, id: metadata.id, createdAt: snapshot.createdAt, tables: Object.keys(snapshot.tables).length };
  } catch (error) {
    return { valid: false, error: error instanceof Error ? error.message : "Verification failed" };
  }
}
async function applyBackupSnapshot(snapshot: Snapshot) {
  const restored: Record<string, number> = {};
  for (const table of backupTables) {
    const rows = snapshot.tables[table.name] ?? [];
    restored[table.name] = 0;
    for (let i = 0; i < rows.length; i += 500) {
      const { data, error } = await db.rpc("vextro_restore_table_rows", {
        p_table: table.name, p_conflict: table.conflict, p_rows: rows.slice(i, i + 500)
      });
      if (error) throw new Error("Restore failed at " + table.name + ": " + error.message);
      restored[table.name] += Number(data ?? 0);
    }
  }
  return restored;
}
export async function restoreBackup(id: string, restoredBy: number) {
  const { snapshot } = await readBackup(id);
  const safety = await createBackup(restoredBy);
  try {
    return await applyBackupSnapshot(snapshot);
  } catch (restoreError) {
    try {
      const { snapshot: safetySnapshot } = await readBackup(String(safety.id));
      await applyBackupSnapshot(safetySnapshot);
      throw new Error("Restore failed. Previous rows were recovered from safety backup " + safety.id +
        "; rows absent from the safety snapshot may remain. Original error: " + (restoreError instanceof Error ? restoreError.message : "unknown error"));
    } catch (recoveryError) {
      if (recoveryError instanceof Error && recoveryError.message.startsWith("Restore failed. Previous rows were recovered")) throw recoveryError;
      throw new Error("Restore failed and automatic safety recovery also failed. Safety backup " + safety.id +
        " is preserved. Restore error: " + (restoreError instanceof Error ? restoreError.message : "unknown error") +
        "; recovery error: " + (recoveryError instanceof Error ? recoveryError.message : "unknown error"));
    }
  }
}
export async function pruneBackups() {
  const { data, error } = await db.from("vextro_backup_artifacts").select("id,storage_path").lt("expires_at", new Date().toISOString()).limit(100);
  if (error) throw error;
  for (const item of data ?? []) {
    const { error: removeError } = await db.storage.from(bucket).remove([item.storage_path]);
    if (removeError) throw removeError;
    const { error: deleteError } = await db.from("vextro_backup_artifacts").delete().eq("id", item.id);
    if (deleteError) throw deleteError;
  }
}
export async function listBackups() {
  const { data, error } = await db.from("vextro_backup_artifacts").select("id,bytes,created_at,verified_at,expires_at,offsite_url,offsite_verified_at,offsite_error").order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return data ?? [];
}
export function startBackupScheduler(ownerId: number, intervalHours: number, notify?: (message: string) => Promise<unknown>) {
  let stopped = false;
  const run = async () => {
    if (stopped) return;
    try {
      const { data } = await db.from("vextro_backup_artifacts").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
      const due = !data || Date.now() - new Date(data.created_at).getTime() >= intervalHours * 3600_000;
      if (due) {
        const backup = await createBackup(ownerId);
        if (notify) await notify("Scheduled encrypted backup completed and verified. ID: " + backup.id + " | " + backup.bytes + " bytes | offsite: " + (backup.offsite_verified_at ? "verified" : backup.offsite_error ? "failed" : "not configured"));
      }
    } catch (error) {
      console.error("VEXTRO encrypted backup scheduler failed", error);
      if (notify) { try { await notify("VEXTRO scheduled backup failed: " + (error instanceof Error ? error.message : "unknown error")); } catch {} }
    }
  };
  void run();
  const timer = setInterval(() => void run(), Math.min(intervalHours * 3600_000, 60 * 60_000));
  return () => { stopped = true; clearInterval(timer); };
}
