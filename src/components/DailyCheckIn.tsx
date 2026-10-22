import { useEffect, useRef } from "react";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/hooks/useAuth";

/** Invisible component: triggers daily streak check-in when a user is signed in. */
export function DailyCheckIn() {
  const { user } = useAuth();
  const { checkIn } = useGamification();
  const attempted = useRef<string | null>(null);
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined") return;
    const key = `streak-checkin:${user.id}:${new Date().toISOString().slice(0, 10)}`;
    if (attempted.current === key) return;
    attempted.current = key;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* The mounted component still limits attempts when storage is unavailable. */
    }
    checkIn();
  }, [user, checkIn]);
  return null;
}
