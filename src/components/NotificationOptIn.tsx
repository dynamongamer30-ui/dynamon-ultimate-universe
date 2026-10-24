import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { User } from "@supabase/supabase-js";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Mail, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { playClick, playSuccess } from "@/lib/sound";
import { useDialogFocus } from "@/hooks/useDialogFocus";

import { OPEN_UPDATE_PREFERENCES } from "@/lib/updatePreferences";

export function NotificationOptIn() {
  const { user } = useAuth();
  return user ? <AccountPreferences key={user.id} user={user} /> : null;
}

function AccountPreferences({ user }: { user: User }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [request, setRequest] = useState(0);
  const [loadState, setLoadState] = useState<"ready" | "loading" | "error">("ready");
  const readController = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const active = useRef(true);
  const skip = () => {
    if (locked.current) return;
    readController.current?.abort();
    try {
      sessionStorage.setItem(`notif-skipped:${user.id}`, "1");
    } catch {
      /* Dismiss for this render. */
    }
    setOpen(false);
  };
  const dialogRef = useDialogFocus(open, skip);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (busy) dialogRef.current?.focus();
  }, [busy, dialogRef]);

  useEffect(() => {
    const show = () => {
      if (locked.current) return;
      setError(false);
      setLoadState("loading");
      setOpen(true);
      setRequest((value) => value + 1);
    };
    window.addEventListener(OPEN_UPDATE_PREFERENCES, show);
    return () => window.removeEventListener(OPEN_UPDATE_PREFERENCES, show);
  }, []);

  useEffect(() => {
    const manual = request > 0;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const controller = new AbortController();
    readController.current = controller;
    try {
      if (!manual && sessionStorage.getItem(`notif-skipped:${user.id}`)) return;
    } catch {
      /* Optional storage. */
    }
    const deadline = setTimeout(() => controller.abort(), 10_000);
    (async () => {
      const { data, error } = await supabase
        .from("notification_prefs")
        .select("asked_at,email_opt_in,push_opt_in")
        .eq("user_id", user.id)
        .abortSignal(controller.signal)
        .maybeSingle()
        .retry(false);
      clearTimeout(deadline);
      if (cancelled) return;
      if (error) {
        if (manual) setLoadState("error");
        return;
      }
      if (controller.signal.aborted) return;
      setEmail(data?.email_opt_in ?? true);
      setPush(data?.push_opt_in ?? true);
      setLoadState("ready");
      if (!manual && !data?.asked_at) {
        const skipKey = `notif-skipped:${user.id}`;
        let skipped = false;
        try {
          skipped = !!sessionStorage.getItem(skipKey);
        } catch {
          /* Optional storage. */
        }
        if (!skipped)
          timer = setTimeout(() => {
            if (!cancelled) setOpen(true);
          }, 1500);
      }
    })().catch(() => {
      clearTimeout(deadline);
      if (!cancelled && manual) setLoadState("error");
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [user.id, request]);

  const save = async () => {
    if (locked.current || loadState !== "ready") return;
    locked.current = true;
    setBusy(true);
    setError(false);
    try {
      if (email && !user.email) throw new Error("Account email unavailable");
      if (push && typeof window !== "undefined" && "Notification" in window) {
        try {
          if (Notification.permission === "default") await Notification.requestPermission();
        } catch {
          /* ignore */
        }
      }
      if (!active.current) return;

      if (email && user.email) {
        const { data, error: subscriberError } = await supabase
          .from("mod_subscribers")
          .upsert({ user_id: user.id, email: user.email })
          .select("user_id");
        if (subscriberError || !data?.some((row) => row.user_id === user.id))
          throw subscriberError ?? new Error("Subscription not confirmed");
      } else if (!email) {
        const { error: subscriberError } = await supabase
          .from("mod_subscribers")
          .delete()
          .eq("user_id", user.id);
        if (subscriberError) throw subscriberError;
        if (!active.current) return;
        const readController = new AbortController();
        const readDeadline = setTimeout(() => readController.abort(), 10_000);
        try {
          const { data: remaining, error: readError } = await supabase
            .from("mod_subscribers")
            .select("user_id")
            .eq("user_id", user.id)
            .abortSignal(readController.signal)
            .maybeSingle()
            .retry(false);
          if (readError || remaining) throw readError ?? new Error("Unsubscribe not confirmed");
        } finally {
          clearTimeout(readDeadline);
        }
      }
      if (!active.current) return;
      // Mark the prompt complete only after the subscription step is confirmed.
      const { data, error: prefsError } = await supabase
        .from("notification_prefs")
        .upsert({
          user_id: user.id,
          email_opt_in: email,
          push_opt_in: push,
          asked_at: new Date().toISOString(),
        })
        .select("user_id");
      if (prefsError || !data?.some((row) => row.user_id === user.id))
        throw prefsError ?? new Error("Preferences not confirmed");
      if (!active.current) return;
      playSuccess();
      toast.success("Preferences saved");
      setOpen(false);
    } catch {
      if (active.current) setError(true);
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };

  return typeof document === "undefined"
    ? null
    : createPortal(
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="modal-frame fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm"
              onClick={skip}
            >
              <motion.div
                ref={dialogRef}
                initial={{ scale: 0.94, y: 20, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.94, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-busy={busy || loadState === "loading"}
                aria-labelledby="notification-opt-in-title"
                tabIndex={-1}
                className="modal-panel relative w-full max-w-md rounded-3xl glass shadow-elev"
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={skip}
                  className="touch-target absolute right-3 top-3 grid place-items-center rounded-full border border-border bg-background/60 text-muted-foreground hover:text-foreground disabled:opacity-60"
                  aria-label="Close notification preferences"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="p-5 pt-14 sm:p-7 sm:pt-14">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-primary">
                    <Sparkles className="h-3 w-3" /> Stay in the loop
                  </span>
                  <h2
                    id="notification-opt-in-title"
                    className="mt-4 font-display text-2xl font-extrabold"
                  >
                    Get notified on new mods
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Choose your update preferences. Save to confirm your choices.
                  </p>
                  {loadState === "loading" && (
                    <p role="status" className="mt-4 text-sm">
                      Loading saved preferences…
                    </p>
                  )}
                  {loadState === "error" && (
                    <div className="mt-4 space-y-2">
                      <p role="alert">
                        Could not load your saved preferences. Retry to view your choices.
                      </p>
                      <button
                        type="button"
                        className="touch-target rounded-full border border-border px-4 py-2"
                        onClick={() => {
                          setLoadState("loading");
                          setRequest((value) => value + 1);
                        }}
                      >
                        Retry loading preferences
                      </button>
                    </div>
                  )}
                  <fieldset
                    hidden={loadState !== "ready"}
                    disabled={busy || loadState !== "ready"}
                    className="mt-6 min-w-0 space-y-3"
                  >
                    <legend className="sr-only">Update preferences</legend>
                    <Toggle
                      icon={<Mail className="h-4 w-4" />}
                      label="Email me on new mod drops"
                      value={email}
                      onChange={setEmail}
                      hint="Sent to the email on your account"
                    />
                    <Toggle
                      icon={<Bell className="h-4 w-4" />}
                      label="Browser notification preference"
                      value={push}
                      onChange={setPush}
                      hint="Saves your preference; browser delivery is not enabled."
                    />
                  </fieldset>
                  {error && (
                    <p role="alert" className="mt-4 text-sm text-rose-300">
                      Could not finish saving. Some changes may already be saved. Your choices are
                      still here; retry to finish.
                    </p>
                  )}
                  <div className="mt-7 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={skip}
                      className="touch-target flex-1 rounded-full border border-border bg-card/60 px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      Maybe later
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        save();
                      }}
                      disabled={busy || loadState !== "ready"}
                      className="flex-[1.4] rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      {busy ? "Saving…" : "Save preferences"}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      );
}

function Toggle({
  icon,
  label,
  value,
  onChange,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      aria-pressed={value}
      className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${value ? "border-primary/50 bg-primary/10" : "border-border bg-card/60"}`}
    >
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl ${value ? "text-primary-foreground" : "text-muted-foreground bg-background/60"}`}
        style={value ? { background: "var(--gradient-primary)" } : undefined}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <span
        className={`h-5 w-9 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}
      >
        <span
          className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : ""}`}
        />
      </span>
    </button>
  );
}
