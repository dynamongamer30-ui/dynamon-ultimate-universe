import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

/**
 * After the owner OAuth round-trip the browser lands on "/" (the public
 * redirect_uri). OwnerGate is no longer mounted there, so its return-to
 * effect never fires. This top-level effect picks up the stored path and
 * bounces the authenticated user back to the admin area they came from.
 */
const RETURN_KEY = "owner_gate_return_to";

export function OwnerReturnRedirect() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading || !user || typeof window === "undefined") return;
    const back = sessionStorage.getItem(RETURN_KEY);
    if (!back) return;
    sessionStorage.removeItem(RETURN_KEY);
    if (back !== window.location.pathname) navigate({ to: back });
  }, [user, loading, navigate]);
  return null;
}
