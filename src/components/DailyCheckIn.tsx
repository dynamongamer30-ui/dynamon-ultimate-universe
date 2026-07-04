import { useEffect } from "react";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/hooks/useAuth";

/** Invisible component: triggers daily streak check-in when a user is signed in. */
export function DailyCheckIn() {
  const { user } = useAuth();
  const { checkIn } = useGamification();
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    const key = `streak-checkin:${user.id}:${new Date().toISOString().slice(0, 10)}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    checkIn();
  }, [user, checkIn]);
  return null;
}
