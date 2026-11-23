import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from "node:crypto";
import { db } from "./supabase.js";
import { config } from "./config.js";

const bucket = config.BACKUP_BUCKET;
const passphrase = config.BACKUP_PASSPHRASE;
const retentionDays = config.BACKUP_RETENTION_DAYS;
const backupTables: Array<{ name: string; conflict: string }> = [
  { name: "bot_users", conflict: "telegram_id" },
  { name: "bot_link_requests", conflict: "token_hash" },
  { name: "bot_account_links", conflict: "id" },
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
  { name: "vextro_scheduled_posts", conflict: "id" }
];
type Envelope = { version: 1; algorithm: "aes-256-gcm"; salt: string; iv: string; tag: string; ciphertext: string };
type Snapshot = { format: "vextro-bot-backup"; version: 1; createdAt: string; tables: Record<string, Record<string, unknown>[]> };

function requirePassphrase() {
  if (!passphrase || passphrase.length < 16) throw new Error("BACKUP_PASSPHRASE must be configured with at least 16 characters");
  return passphrase;
}
function encrypt(plain: Buffer): Buffer {
  const salt = randomBytes(16), iv = randomBytes(12);
  const key = scryptSync(requirePassphrase(), salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const envelope: Envelope = { version: 1, algorithm: "aes-256-gcm", salt: salt.toString("hex"), iv: iv.toString("hex"), tag: cipher.getAuthTag().toString("hex"), ciphertext: ciphertext.toString("base64") };
  return Buffer.from(JSON.stringify(envelope));
}
function decrypt(raw: Buffer): Buffer {
  const envelope = JSON.parse(raw.toString("utf8")) as Envelope;
  if (envelope.version !== 1 || envelope.algorithm !== "aes-256-gcm") throw new Error("Unsupported backup format");
  const key = scryptSync(requirePassphrase(), Buffer.from(envelope.salt, "hex"), 32);
  const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(envelope.iv, "hex"));
  decipher.setAuthTag(Buffer.from(envelope.tag, "hex"));
  return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, "base64")), decipher.final()]);
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
  const encrypted = encrypt(Buffer.from(JSON.stringify(snapshot)));
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
  const verification = await verifyBackup(String(data.id));
  if (!verification.valid) throw new Error("Uploaded backup did not pass integrity/decryption verification");
  await db.from("vextro_backup_artifacts").update({ verified_at: new Date().toISOString() }).eq("id", data.id);
  await pruneBackups();
  return data;
}
export async function readBackup(id: string) {
  const { data: metadata, error } = await db.from("vextro_backup_artifacts").select("id,storage_path,sha256,bytes").eq("id", id).maybeSingle();
  if (error || !metadata) throw error ?? new Error("Backup artifact not found");
  const { data: blob, error: downloadError } = await db.storage.from(bucket).download(metadata.storage_path);
  if (downloadError || !blob) throw downloadError ?? new Error("Backup download failed");
  const encrypted = Buffer.from(await blob.arrayBuffer());
  const actual = createHash("sha256").update(encrypted).digest("hex");
  if (actual !== metadata.sha256 || encrypted.byteLength !== Number(metadata.bytes)) throw new Error("Backup integrity check failed");
  const snapshot = JSON.parse(decrypt(encrypted).toString("utf8")) as Snapshot;
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
export async function restoreBackup(id: string, restoredBy: number) {
  // Never delete live rows. Upsert restores backed-up records while retaining newer unrelated rows.
  const { snapshot } = await readBackup(id);
  await createBackup(restoredBy);
  const restored: Record<string, number> = {};
  for (const table of backupTables) {
    const rows = snapshot.tables[table.name] ?? [];
    for (let i = 0; i < rows.length; i += 500) {
      const { error } = await (db as any).from(table.name).upsert(rows.slice(i, i + 500), { onConflict: table.conflict });
      if (error) throw new Error(`Restore failed at ${table.name}: ${error.message}`);
    }
    restored[table.name] = rows.length;
  }
  return restored;
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
  const { data, error } = await db.from("vextro_backup_artifacts").select("id,bytes,created_at,verified_at,expires_at").order("created_at", { ascending: false }).limit(20);
  if (error) throw error;
  return data ?? [];
}
export function startBackupScheduler(ownerId: number, intervalHours: number) {
  let stopped = false;
  const run = async () => {
    if (stopped) return;
    try {
      const { data } = await db.from("vextro_backup_artifacts").select("created_at").order("created_at", { ascending: false }).limit(1).maybeSingle();
      const due = !data || Date.now() - new Date(data.created_at).getTime() >= intervalHours * 3600_000;
      if (due) await createBackup(ownerId);
    } catch (error) {
      console.error("VEXTRO encrypted backup scheduler failed", error);
    }
  };
  void run();
  const timer = setInterval(() => void run(), Math.min(intervalHours * 3600_000, 60 * 60_000));
  return () => { stopped = true; clearInterval(timer); };
}
