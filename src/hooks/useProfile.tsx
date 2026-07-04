import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  gender: "male" | "female" | "other" | null;
  avatar_url: string | null;
  is_owner: boolean;
};

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) { setProfile(null); setLoading(false); return; }
    setLoading(true);
    // Use security-definer RPC so private columns (gender) stay locked down
    // at the column-grant level for other authenticated users.
    const { data } = await supabase.rpc("get_my_profile");
    const row = Array.isArray(data) ? data[0] : data;
    setProfile((row as Profile | null) ?? null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, loading, refresh };
}
