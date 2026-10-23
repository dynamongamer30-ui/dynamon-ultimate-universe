import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type UsernameStatus = "idle" | "checking" | "ok" | "taken" | "invalid" | "error";

export function useUsernameAvailability(value: string, currentUsername?: string | null) {
  const { user } = useAuth();
  const name = value.trim();
  const unchanged = !!name && name === currentUsername?.trim();
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([user?.id, name, revision]);
  const [result, setResult] = useState<{ key: string; status: UsernameStatus } | null>(null);
  const local: UsernameStatus | null =
    !name || unchanged ? "idle" : !/^[a-zA-Z0-9_]{3,24}$/.test(name) ? "invalid" : null;

  useEffect(() => {
    if (local) return;
    let active = true;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      const deadline = setTimeout(() => controller.abort(), 10_000);
      try {
        const { data, error } = await supabase
          .rpc("username_available", { _username: name })
          .abortSignal(controller.signal);
        if (active)
          setResult({
            key,
            status: error || typeof data !== "boolean" ? "error" : data ? "ok" : "taken",
          });
      } catch {
        if (active) setResult({ key, status: "error" });
      } finally {
        clearTimeout(deadline);
      }
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [key, local, name]);

  // Never expose a previous name's "available" result, even before the effect runs.
  const status = local ?? (result?.key === key ? result.status : "checking");
  return {
    status,
    canSubmit: unchanged || status === "ok",
    retry: () => setRevision((previous) => previous + 1),
  };
}
