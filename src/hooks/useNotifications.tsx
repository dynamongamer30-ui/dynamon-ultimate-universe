import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import {
  listNotifications,
  listMyReadIds,
  markRead,
  getSenderProfile,
  type AppNotification,
} from "@/lib/notifications";

type Inbox = { list: AppNotification[]; reads: string[] };

async function boundedRead<T>(signal: AbortSignal, read: (signal: AbortSignal) => Promise<T>) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal.addEventListener("abort", abort, { once: true });
  if (signal.aborted) controller.abort();
  const deadline = setTimeout(abort, 10000);
  try {
    return await read(controller.signal);
  } finally {
    clearTimeout(deadline);
    signal.removeEventListener("abort", abort);
    controller.abort();
  }
}

/** One account-scoped inbox shared by the header and notification center. */
export function useNotifications() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["notifications", userId],
    enabled: !!userId,
    queryFn: ({ signal }): Promise<Inbox> =>
      boundedRead(signal, async (requestSignal) => {
        const [list, reads] = await Promise.all([
          listNotifications(requestSignal),
          listMyReadIds(requestSignal),
        ]);
        return { list, reads };
      }),
    staleTime: 60_000,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const senderQuery = useQuery({
    queryKey: ["notification-sender"],
    enabled: !!userId,
    queryFn: ({ signal }) => boundedRead(signal, getSenderProfile),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const data = userId ? query.data : undefined;
  const readIds = useMemo(() => new Set(data?.reads ?? []), [data?.reads]);
  const items = useMemo(
    () => (data?.list ?? []).filter((n) => !n.burn_after_read || !readIds.has(n.id)),
    [data?.list, readIds],
  );
  const unread = useMemo(() => items.filter((n) => !readIds.has(n.id)), [items, readIds]);
  const refresh = useCallback(async () => {
    if (userId)
      await client.invalidateQueries({ queryKey: ["notifications", userId], exact: true });
  }, [client, userId]);
  const saveReads = useCallback(
    async (ids: string[]) => {
      if (!userId || !ids.length) return;
      const key = ["notifications", userId] as const;
      await client.cancelQueries({ queryKey: key, exact: true });
      const previous = client.getQueryData<Inbox>(key);
      if (!previous) return;
      const newIds = ids.filter((id) => !previous.reads.includes(id));
      if (!newIds.length) return;
      client.setQueryData<Inbox>(key, {
        ...previous,
        reads: [...new Set([...previous.reads, ...newIds])],
      });
      try {
        await markRead(newIds, userId);
        toast.dismiss(`notification-read:${userId}`);
        if (client.getQueryState(key)) {
          client.setQueryData<Inbox>(
            key,
            (current) =>
              current && { ...current, reads: [...new Set([...current.reads, ...newIds])] },
          );
        }
      } catch {
        toast.error("Could not mark notifications as read. Please try again.", {
          id: `notification-read:${userId}`,
        });
        // Preserve other successful read actions; refetch server truth on failure.
        if (client.getQueryState(key)) {
          client.setQueryData<Inbox>(
            key,
            (current) =>
              current && {
                ...current,
                reads: current.reads.filter(
                  (id) => !newIds.includes(id) || previous.reads.includes(id),
                ),
              },
          );
          await client.invalidateQueries({ queryKey: key, exact: true });
        }
      }
    },
    [client, userId],
  );
  const markAllRead = useCallback(() => saveReads(unread.map((n) => n.id)), [saveReads, unread]);
  const markOneRead = useCallback(
    async (id: string) => {
      if (!readIds.has(id)) await saveReads([id]);
    },
    [readIds, saveReads],
  );
  return {
    items,
    readIds,
    unreadCount: unread.length,
    loading: !!userId && query.isPending,
    error: query.error?.message ?? null,
    sender: userId ? (senderQuery.data ?? null) : null,
    refresh,
    markAllRead,
    markOneRead,
  };
}
