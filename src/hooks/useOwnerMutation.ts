import { useEffect, useRef, useState } from "react";

export function useOwnerMutation() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  const active = useRef(true);
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      request.current?.abort();
    };
  }, []);
  const run = async (action: (signal: AbortSignal) => Promise<void>) => {
    if (locked.current || !active.current) return;
    locked.current = true;
    setSaving(true);
    setError(null);
    const controller = new AbortController();
    request.current = controller;
    const deadline = setTimeout(() => controller.abort(), 10000);
    try {
      await action(controller.signal);
    } catch (cause) {
      if (active.current)
        setError(
          controller.signal.aborted
            ? "The change could not be confirmed. Check the saved value before trying again. Your draft is retained."
            : cause instanceof Error
              ? cause.message
              : "The change could not be confirmed. Your draft is retained.",
        );
    } finally {
      clearTimeout(deadline);
      request.current = null;
      locked.current = false;
      if (active.current) setSaving(false);
    }
  };
  return { saving, error, run };
}
