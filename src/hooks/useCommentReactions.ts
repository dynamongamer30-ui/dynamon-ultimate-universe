import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { readCommunityRows } from "@/lib/communityReads";

export type ReactionKey = "fire" | "water" | "thunder" | "leaf" | "spirit";
export type ReactionRow = { user_id: string; reaction: ReactionKey };
type BatchRow = ReactionRow & { comment_id: string };

export function useCommentReactions(ids: string[], enabled: boolean) {
  const { user } = useAuth();
  const client = useQueryClient();
  const commentIds = [...new Set(ids)].sort();
  const queryKey = ["comment-reactions", user?.id ?? "public", commentIds] as const;
  const query = useQuery({
    queryKey,
    enabled: enabled && commentIds.length > 0,
    staleTime: 60_000,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }) =>
      readCommunityRows<BatchRow>(async (from, to) => {
        const result = await supabase
          .from("comment_reactions")
          .select("comment_id, user_id, reaction")
          .in("comment_id", commentIds)
          .order("comment_id")
          .order("user_id")
          .order("reaction")
          .range(from, to)
          .abortSignal(signal);
        return { data: result.data as BatchRow[] | null, error: result.error };
      }),
  });
  const update = (commentId: string, change: (rows: ReactionRow[]) => ReactionRow[]) => {
    client.setQueryData<BatchRow[]>(queryKey, (previous) => {
      if (!previous) return previous;
      const mine = previous.filter((row) => row.comment_id === commentId);
      const rest = previous.filter((row) => row.comment_id !== commentId);
      return [...rest, ...change(mine).map((row) => ({ ...row, comment_id: commentId }))];
    });
  };
  return {
    rows: query.data ?? [],
    loading: query.isPending || query.isFetching,
    error: query.isError,
    retry: () => query.refetch(),
    update,
  };
}
