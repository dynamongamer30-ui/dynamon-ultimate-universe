import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type OwnerReport = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};
const emptyStats = { users: 0, comments: 0, favorites: 0, reports: 0 };

export function useOwnerDashboard(userId?: string) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    userId,
    reports: [] as OwnerReport[],
    stats: emptyStats,
    subscribers: 0,
    loading: true,
    error: false,
  });
  useEffect(() => {
    const controller = new AbortController();
    let disposed = false;
    const deadline = setTimeout(() => controller.abort(), 10000);
    setState((old) => ({
      ...(old.userId === userId ? old : { userId, reports: [], stats: emptyStats, subscribers: 0 }),
      loading: true,
      error: false,
    }));
    void (async () => {
      try {
        if (!userId) throw new Error("owner_missing");
        const [reports, users, comments, favorites, subscribers] = await Promise.all([
          supabase
            .from("reports")
            .select("id,target_type,target_id,reason,details,status,created_at")
            .order("created_at", { ascending: false })
            .limit(50)
            .abortSignal(controller.signal)
            .retry(false),
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .abortSignal(controller.signal)
            .retry(false),
          supabase
            .from("comments")
            .select("id", { count: "exact", head: true })
            .abortSignal(controller.signal)
            .retry(false),
          supabase
            .from("favorites")
            .select("user_id", { count: "exact", head: true })
            .abortSignal(controller.signal)
            .retry(false),
          supabase
            .from("mod_subscribers")
            .select("user_id", { count: "exact", head: true })
            .abortSignal(controller.signal)
            .retry(false),
        ]);
        const totals = [users, comments, favorites, subscribers];
        if (
          reports.error ||
          !Array.isArray(reports.data) ||
          totals.some(
            (result) => result.error || !Number.isSafeInteger(result.count) || result.count! < 0,
          )
        )
          throw new Error("dashboard_unavailable");
        if (
          !reports.data.every(
            (row) =>
              row &&
              [
                row.id,
                row.target_type,
                row.target_id,
                row.reason,
                row.status,
                row.created_at,
              ].every((value) => typeof value === "string") &&
              (row.details === null || typeof row.details === "string"),
          )
        )
          throw new Error("reports_invalid");
        if (!disposed)
          setState({
            userId,
            reports: reports.data,
            stats: {
              users: users.count!,
              comments: comments.count!,
              favorites: favorites.count!,
              reports: reports.data.filter((row) => row.status === "open").length,
            },
            subscribers: subscribers.count!,
            loading: false,
            error: false,
          });
      } catch {
        if (!disposed) setState((old) => ({ ...old, loading: false, error: true }));
      } finally {
        clearTimeout(deadline);
      }
    })();
    return () => {
      disposed = true;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [userId, attempt]);
  const visible =
    state.userId === userId
      ? state
      : { userId, reports: [], stats: emptyStats, subscribers: 0, loading: true, error: false };
  return {
    ...visible,
    retry: () => setAttempt((value) => value + 1),
    updateReport: (id: string, status: string) =>
      setState((old) =>
        old.userId !== userId
          ? old
          : {
              ...old,
              reports: old.reports.map((row) => (row.id === id ? { ...row, status } : row)),
              stats: {
                ...old.stats,
                reports: old.reports.filter((row) => row.id !== id && row.status === "open").length,
              },
            },
      ),
  };
}
