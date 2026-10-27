import { useCallback, useEffect, useRef, useState } from "react";

/** One write at a time. Failed/uncertain writes pause until an explicit retry. */
export function useAutosave<T>({
  value,
  ready,
  save,
  validate,
  baseline,
}: {
  value: T;
  ready: boolean;
  save: (value: T) => Promise<void>;
  validate?: (value: T) => string | null;
  baseline?: T;
}) {
  const [status, setStatus] = useState("Loading…");
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const committed = useRef<string | null>(null);
  const running = useRef(false);
  const paused = useRef(false);
  const active = useRef(true);
  const latest = useRef({ value, ready, save, validate });
  latest.current = { value, ready, save, validate };
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const flush = useCallback(async () => {
    const current = latest.current;
    if (!current.ready || running.current) return;
    const json = JSON.stringify(current.value);
    if (committed.current === json) return;
    const invalid = current.validate?.(current.value);
    if (invalid) {
      if (active.current) {
        setStatus("Needs attention");
        setError(invalid);
      }
      return;
    }
    running.current = true;
    if (active.current) {
      setStatus("Saving…");
      setError(null);
    }
    try {
      await current.save(current.value);
      committed.current = json;
      paused.current = false;
      if (active.current) setStatus("Saved");
    } catch (cause) {
      paused.current = true;
      if (active.current) {
        setStatus("Not saved");
        setError(
          cause instanceof Error
            ? cause.message
            : "Save was not confirmed. Reload saved settings before retrying.",
        );
      }
    } finally {
      running.current = false;
      if (active.current) setRevision((n) => n + 1);
      else if (!paused.current && committed.current !== JSON.stringify(latest.current.value))
        void flush();
    }
  }, []);
  useEffect(
    () => () => {
      if (
        !paused.current &&
        committed.current !== null &&
        committed.current !== JSON.stringify(latest.current.value)
      )
        void flush();
    },
    [flush],
  );
  useEffect(() => {
    if (!ready) {
      committed.current = null;
      paused.current = false;
      setStatus("Loading…");
      setError(null);
      return;
    }
    const json = JSON.stringify(value);
    if (committed.current === null) {
      committed.current = JSON.stringify(baseline ?? value);
      setStatus("Saved");
      return;
    }
    if (committed.current === json || running.current || paused.current) return;
    setStatus("Unsaved changes");
    const timer = setTimeout(() => void flush(), 800);
    return () => clearTimeout(timer);
  }, [value, ready, revision, flush, baseline]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (ready && committed.current !== JSON.stringify(latest.current.value)) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [ready]);
  return { status, error, saveNow: flush, saving: status === "Saving…" };
}
