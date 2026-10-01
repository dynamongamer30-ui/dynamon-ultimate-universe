import { Link } from "@tanstack/react-router";
import type { ReactElement } from "react";
import { Feather, Gift, KeyRound, ArrowRight } from "lucide-react";
import type { AppNotification } from "@/lib/notifications";

/**
 * Renders nothing unless this specific notification carries a real reward
 * (checked against `reward_kind`/`reward_ref` on the row itself). Never
 * fires any RPC just from being rendered — it's a plain link to /claim,
 * which is the ONLY place a claim action actually happens. This is
 * deliberate: an earlier version called the claim-check RPC inline here
 * and it crashed the app the moment a winning notification was in view.
 */
export function NotificationClaim({ notification }: { notification: AppNotification }) {
  const { reward_kind, reward_ref } = notification;
  if (!reward_kind) return null;

  let to: { kind: "granted_key" | "phoenix_pass" | "daily_key"; ref: string; label: string; icon: ReactElement; text: string } | null = null;

  if (reward_kind === "trainer_dg_key" && reward_ref) {
    to = { kind: "granted_key", ref: reward_ref, label: "DG Key", icon: <KeyRound className="h-3.5 w-3.5" />, text: "View your key" };
  } else if (reward_kind === "trainer_vip_key" && reward_ref) {
    to = { kind: "granted_key", ref: reward_ref, label: "VIP Key", icon: <KeyRound className="h-3.5 w-3.5" />, text: "View your key" };
  } else if (reward_kind === "phoenix_pass" && reward_ref) {
    // Has a ref: an unclaimed daily-giveaway pass still waiting to be claimed.
    to = { kind: "phoenix_pass", ref: reward_ref, label: "", icon: <Feather className="h-3.5 w-3.5" />, text: "Claim your pass" };
  } else if (reward_kind === "vip_key" && reward_ref) {
    // Legacy label for the Daily Key giveaway (unclaimed until acted on).
    to = { kind: "daily_key", ref: reward_ref, label: "", icon: <Gift className="h-3.5 w-3.5" />, text: "Claim your key" };
  }

  if (!to) return null;

  return (
    <Link
      to="/claim"
      search={{ kind: to.kind, ref: to.ref, label: to.label }}
      onClick={(e) => e.stopPropagation()}
      className="press mt-3 inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-4 py-2 text-xs font-bold text-primary transition hover:bg-primary/10"
    >
      {to.icon} {to.text} <ArrowRight className="h-3 w-3" />
    </Link>
  );
}
