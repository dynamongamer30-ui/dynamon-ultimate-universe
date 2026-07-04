import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "./useAuth";
import {
  listNotifications,
  listMyReadIds,
  markRead,
  type AppNotification,
} from "@/lib/notifications";

/**
 * Loads notifications + the current user's read receipts (logged-in only).
 * Exposes the unread count and helpers to mark items read.
 */
export function useNotifications() {
  const { user } = useAuth();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setReadIds(new Set());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, reads] = await Promise.all([listNotifications(), listMyReadIds()]);
      setItems(list);
      setReadIds(new Set(reads));
    } catch {
      // Fail quietly in the UI; owner tooling surfaces real errors.
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const unread = useMemo(
    () => items.filter((n) => !readIds.has(n.id)),
    [items, readIds],
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;
    const unreadIds = unread.map((n) => n.id);
    if (unreadIds.length === 0) return;
    // Optimistic update
    setReadIds((prev) => {
      const next = new Set(prev);
      unreadIds.forEach((id) => next.add(id));
      return next;
    });
    try {
      await markRead(unreadIds, user.id);
    } catch {
      refresh();
    }
  }, [user, unread, refresh]);

  const markOneRead = useCallback(
    async (id: string) => {
      if (!user || readIds.has(id)) return;
      setReadIds((prev) => new Set(prev).add(id));
      try {
        await markRead([id], user.id);
      } catch {
        refresh();
      }
    },
    [user, readIds, refresh],
  );

  return {
    items,
    readIds,
    unreadCount: unread.length,
    loading,
    refresh,
    markAllRead,
    markOneRead,
  };
}
