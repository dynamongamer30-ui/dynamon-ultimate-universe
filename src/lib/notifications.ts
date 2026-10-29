import { featureRpc } from "./featureRpc";
/**
 * Notifications data layer — Supabase-backed.
 *
 * Two tables (see the SQL migration in the project setup):
 *   - notifications        : one row per announcement the owner sends
 *   - notification_reads    : (notification_id, user_id) marking a read
 *
 * Visibility: any authenticated user can read notifications; only the owner
 * (profiles.is_owner = true) can create or delete them. Each user manages
 * only their own read receipts.
 */

import { supabase } from "@/integrations/supabase/client";

// Keep Supabase as the receiver so its client methods retain their `this` binding.

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  created_at: string; // ISO timestamp
  reward_kind: "vip_key" | "phoenix_pass" | "trainer_dg_key" | "trainer_vip_key" | null;
  reward_ref: string | null;
  burn_after_read: boolean;
  source_kind?: "manual" | "automated";
  target_user_id?: string | null;
}

export interface SenderProfile {
  display_name: string | null;
  avatar_url: string | null;
  custom_avatar_url: string | null;
}

/** All notifications on this site come from the single owner account, so we
 * fetch their public profile once and show it as the sender everywhere. */
export async function getSenderProfile(signal?: AbortSignal): Promise<SenderProfile | null> {
  const { data, error } = await supabase
    .from("public_profiles")
    .select("display_name, avatar_url, custom_avatar_url")
    .eq("is_owner", true)
    .abortSignal(signal ?? AbortSignal.timeout(10000))
    .maybeSingle()
    .retry(false);
  if (error || !data) return null;
  return data as SenderProfile;
}

export async function listNotifications(signal?: AbortSignal): Promise<AppNotification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select(
      "id,title,body,created_at,reward_kind,reward_ref,burn_after_read,source_kind,target_user_id",
    )
    .order("created_at", { ascending: false })
    .abortSignal(signal ?? AbortSignal.timeout(10000))
    .retry(false);
  if (error) throw new Error(error.message);
  if (
    !Array.isArray(data) ||
    data.some(
      (row) =>
        !row ||
        typeof row.id !== "string" ||
        typeof row.title !== "string" ||
        typeof row.body !== "string" ||
        !Number.isFinite(Date.parse(row.created_at)),
    )
  )
    throw new Error("Invalid notification response");
  return data as AppNotification[];
}

/** Ids of notifications the current user has already read. */
export async function listMyReadIds(signal?: AbortSignal): Promise<string[]> {
  const { data, error } = await supabase
    .from("notification_reads")
    .select("notification_id")
    .abortSignal(signal ?? AbortSignal.timeout(10000))
    .retry(false);
  if (error) throw new Error(error.message);
  if (!Array.isArray(data) || data.some((row) => typeof row?.notification_id !== "string"))
    throw new Error("Invalid notification read response");
  return data.map((r: { notification_id: string }) => r.notification_id);
}

export async function markRead(ids: string[], userId: string): Promise<void> {
  if (ids.length === 0) return;
  void userId;
  for (let offset = 0; offset < ids.length; offset += 100) {
    const result = await featureRpc<{ ok: boolean }>("website_acknowledge_notification", {
      p_ids: ids.slice(offset, offset + 100),
    });
    if (result?.ok !== true) throw new Error("Acknowledgement not confirmed");
  }
}

export async function createNotification(
  title: string,
  body: string,
  signal?: AbortSignal,
  id?: string,
): Promise<AppNotification> {
  const { data, error } = await supabase
    .from("notifications")
    .insert({ title, body, ...(id ? { id } : {}) })
    .select(
      "id,title,body,created_at,reward_kind,reward_ref,burn_after_read,source_kind,target_user_id",
    )
    .abortSignal(signal ?? AbortSignal.timeout(10000))
    .maybeSingle()
    .retry(false);
  if (error) throw new Error(error.message);
  if (
    signal?.aborted ||
    !data ||
    typeof data.id !== "string" ||
    (id && data.id !== id) ||
    data.title !== title ||
    data.body !== body
  )
    throw new Error(
      "Notification creation was not confirmed. Check the sent list before sending again.",
    );
  return data as AppNotification;
}

export async function updateNotification(
  id: string,
  title: string,
  body: string,
  signal?: AbortSignal,
): Promise<AppNotification> {
  const { data, error } = await supabase
    .from("notifications")
    .update({ title, body })
    .eq("id", id)
    .select(
      "id,title,body,created_at,reward_kind,reward_ref,burn_after_read,source_kind,target_user_id",
    )
    .abortSignal(signal ?? AbortSignal.timeout(10000))
    .maybeSingle()
    .retry(false);
  if (error) throw new Error(error.message);
  if (signal?.aborted || !data || data.id !== id || data.title !== title || data.body !== body)
    throw new Error("Notification update was not confirmed. Your draft is retained.");
  return data as AppNotification;
}

export async function deleteNotification(id: string, signal?: AbortSignal): Promise<void> {
  const { data, error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", id)
    .select("id")
    .abortSignal(signal ?? AbortSignal.timeout(10000))
    .maybeSingle()
    .retry(false);
  if (error) throw new Error(error.message);
  if (signal?.aborted || data?.id !== id)
    throw new Error(
      "Notification removal was not confirmed. Refresh the sent list to check its status.",
    );
}
