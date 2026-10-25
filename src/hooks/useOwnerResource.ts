import { useEffect, useRef, useState } from "react";

export function useOwnerResource<T>(read: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const pending = useRef(false);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    pending.current = true;
    const deadline = setTimeout(() => controller.abort(), 10000);
    void read(controller.signal)
      .then((value) => {
        if (active && !controller.signal.aborted) {
          setData(value);
          setError(null);
        } else if (active)
          setError("The lookup timed out. Retry to confirm the current saved values.");
      })
      .catch(() => {
        if (active) setError("Could not load the saved values. Retry before making changes.");
      })
      .finally(() => {
        clearTimeout(deadline);
        if (active) {
          pending.current = false;
          setLoading(false);
        }
      });
    return () => {
      active = false;
      clearTimeout(deadline);
      controller.abort();
    };
  }, [read, revision]);
  const reload = () => {
    if (pending.current) return;
    pending.current = true;
    setLoading(true);
    setRevision((value) => value + 1);
  };
  return { data, setData, loading, error, reload };
}
