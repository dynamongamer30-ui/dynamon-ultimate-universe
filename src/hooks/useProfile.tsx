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

/**
 * A profile row is created for every new account by the `handle_new_user`
 * trigger, so a row existing is NOT the same as onboarding being finished.
 * Google sign-in only supplies a display name and a picture, and historically
 * left username and gender empty. Onboarding counts as complete only when
 * every field the profile form requires has a value.
 */
export function isProfileComplete(profile: Profile | null | undefined): boolean {
  if (!profile) return false;
  return (
    !!profile.username?.trim() &&
    !!profile.display_name?.trim() &&
    !!profile.gender &&
    !!profile.avatar_url?.trim()
  );
}

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
  const profile = userId ? (query.data ?? null) : null;
  return {
    profile,
    /**
     * Derived, not a database column. `/auth` sends a signed-in visitor to
     * `/mods` only when this is true, so an account that never finished setup
     * is always routed back to the profile step — including the 559 accounts
     * that already have a partially filled row.
     */
    complete: isProfileComplete(profile),
    loading: !!userId && query.isPending,
    loaded: !!userId && query.data !== undefined,
    error: query.error,
    refresh,
  };
}
