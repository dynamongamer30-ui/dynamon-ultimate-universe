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

// The generated Supabase types don't yet include these new tables, so we use
// an untyped accessor. NOTE: we must call `supabase.from(...)` with `supabase`
// as the receiver — extracting the method into a standalone variable loses its
// `this` binding and throws "Cannot read properties of undefined (reading 'rest')".
const db = (table: string): any => (supabase as any).from(table);

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  created_at: string; // ISO timestamp
}

export async function listNotifications(): Promise<AppNotification[]> {
  const { data, error } = await db("notifications")
    .select("id,title,body,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as AppNotification[];
}

/** Ids of notifications the current user has already read. */
export async function listMyReadIds(): Promise<string[]> {
  const { data, error } = await db("notification_reads").select("notification_id");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: { notification_id: string }) => r.notification_id);
}

export async function markRead(ids: string[], userId: string): Promise<void> {
  if (ids.length === 0) return;
  const rows = ids.map((notification_id) => ({ notification_id, user_id: userId }));
  const { error } = await db("notification_reads").upsert(rows, {
    onConflict: "notification_id,user_id",
  });
  if (error) throw new Error(error.message);
}

export async function createNotification(title: string, body: string): Promise<void> {
  const { error } = await db("notifications").insert({ title, body });
  if (error) throw new Error(error.message);
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await db("notifications").delete().eq("id", id);
  if (error) throw new Error(error.message);
}
