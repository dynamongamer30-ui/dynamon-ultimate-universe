import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { AppNotification } from "@/lib/notifications";

type DailyKey = { id: string; key: string; claimed: boolean; expires_at: string };
type UnclaimedPass = { id: string; claim_deadline: string };

const looseRpc = supabase.rpc as unknown as (
  fn: string,
) => Promise<{ data: unknown; error: unknown }>;

/**
 * Renders nothing unless this specific notification is a reward the
 * signed-in user actually won AND hasn't claimed yet (checked against the
 * live claim-deadline state, not just "did they win"). Non-winners, and
 * winners who already claimed, see no button. Tapping it goes to /rewards,
 * where the real claim action (with its own busy/error states) lives —
 * kept in one place rather than duplicated here.
 */
export function NotificationClaim({ notification }: { notification: AppNotification }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dailyKey, setDailyKey] = useState<DailyKey | null>(null);
  const [pass, setPass] = useState<UnclaimedPass | null>(null);

  useEffect(() => {
    if (!user || !notification.reward_kind) return;
    if (notification.reward_kind === "vip_key") {
      looseRpc("my_daily_key").then(({ data }) => {
        setDailyKey((data as DailyKey[] | null)?.[0] ?? null);
      });
    } else if (notification.reward_kind === "phoenix_pass") {
      looseRpc("my_unclaimed_phoenix_pass").then(({ data }) => {
        setPass((data as UnclaimedPass[] | null)?.[0] ?? null);
      });
    }
  }, [user, notification.reward_kind]);

  if (!notification.reward_kind || !notification.reward_ref) return null;

  const claimable =
    (notification.reward_kind === "vip_key" && dailyKey && !dailyKey.claimed && dailyKey.key === notification.reward_ref) ||
    (notification.reward_kind === "phoenix_pass" && pass && pass.id === notification.reward_ref);

  if (!claimable) return null;

  return (
    <button
      onClick={(e) => {
        e.preventDefault(); e.stopPropagation();
        navigate({ to: "/rewards" });
      }}
      className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-xs font-bold text-black"
    >
      <ExternalLink className="h-3.5 w-3.5" /> Claim
    </button>
  );
}
