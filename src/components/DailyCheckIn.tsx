import { useEffect } from "react";
import { useGamification } from "@/hooks/useGamification";
import { useAuth } from "@/hooks/useAuth";

/** One in-flight check per account; the provider records only server-confirmed completion. */
export function DailyCheckIn() {
  const { user } = useAuth();
  const { checkIn } = useGamification();
  const id = user?.id;
  useEffect(() => {
    if (!id) return;
    let timer: ReturnType<typeof setTimeout>;
    const attempt = () => {
      void checkIn();
      const now = new Date();
      const nextDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1);
      timer = setTimeout(attempt, Math.max(1000, nextDay - now.getTime() + 50));
    };
    attempt();
    return () => clearTimeout(timer);
  }, [id, checkIn]);
  return null;
}
