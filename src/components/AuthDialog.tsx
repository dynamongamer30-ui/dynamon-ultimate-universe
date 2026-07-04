// Legacy modal kept as a thin wrapper for any imports — now redirects to /auth.
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";

type Props = { open: boolean; onClose: () => void; reason?: string };

export function AuthDialog({ open, onClose }: Props) {
  const navigate = useNavigate();
  useEffect(() => {
    if (open) { onClose(); navigate({ to: "/auth" }); }
  }, [open, onClose, navigate]);
  return null;
}
