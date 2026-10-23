import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseReactionCounts, type ReactionCounts, type ReactionRow } from "@/lib/reactionCounts";

export function useCommentReactions(ids: string[], enabled: boolean) {
  const { user } = useAuth();
  const client = useQueryClient();
  const commentIds = [...new Set(ids)].sort();
  const queryKey = ["comment-reaction-counts", user?.id ?? "public", commentIds] as const;
  const query = useQuery({
    queryKey,
    enabled: enabled && commentIds.length > 0,
    staleTime: 60_000,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    queryFn: async ({ signal }) => {
      if (commentIds.length > 10) throw new Error("Too many review reactions requested");
      const { data, error } = await supabase
        .rpc("get_review_reaction_counts", { p_comment_ids: commentIds }, { get: true })
        .abortSignal(signal);
      if (error) throw error;
      return parseReactionCounts(data, commentIds);
    },
  });
  const update = (commentId: string, change: (rows: ReactionRow[]) => ReactionRow[]) => {
    client.setQueryData<ReactionCounts[]>(queryKey, (previous) => {
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
    prepare: () => client.cancelQueries({ queryKey, exact: true }),
    update,
  };
}
