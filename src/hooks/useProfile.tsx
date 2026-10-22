import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  gender: "male" | "female" | "other" | null;
  avatar_url: string | null;
  is_owner: boolean;
  custom_avatar_url: string | null;
};

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id;
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["my-profile", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Keep private columns behind the existing current-user RPC and grants.
      const { data, error } = await supabase.rpc("get_my_profile");
      if (error) throw new Error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      return (row as Profile | null) ?? null;
    },
    staleTime: 60_000,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const refresh = useCallback(async () => {
    if (userId) await client.invalidateQueries({ queryKey: ["my-profile", userId], exact: true });
  }, [client, userId]);
  return {
    profile: userId ? (query.data ?? null) : null,
    loading: !!userId && query.isPending,
    error: query.error,
    refresh,
  };
}
