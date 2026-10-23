import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { Flag, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ThemedSelect } from "@/components/ThemedSelect";
import { useDialogFocus } from "@/hooks/useDialogFocus";

export function ReportButton({
  targetType,
  targetId,
  label = "Report",
}: {
  targetType: "comment" | "mod" | "profile";
  targetId: string;
  label?: string;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const locked = useRef(false);
  const active = useRef(true);
  const doneRef = useRef<HTMLButtonElement>(null);
  const headingId = `report-${targetType}-${targetId}-title`;
  const detailsId = `report-${targetType}-${targetId}-details`;
  const descriptionId = `report-${targetType}-${targetId}-description`;
  const close = () => {
    if (locked.current) return;
    setOpen(false);
    setReason("spam");
    setDetails("");
    setResult("idle");
    setErrorMessage("");
  };
  const dialogRef = useDialogFocus(open, close);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);

  useEffect(() => {
    if (busy) dialogRef.current?.focus();
    else if (result === "success") doneRef.current?.focus();
  }, [busy, result, dialogRef]);

  const submit = async () => {
    if (locked.current || result === "success") return;
    if (!user) {
      toast.error("Sign in to report");
      return;
    }
    locked.current = true;
    setBusy(true);
    setResult("idle");
    setErrorMessage("");
    try {
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details || null,
      });
      if (error) throw error;
      if (!active.current) return;
      setResult("success");
      toast.success("Report submitted — thank you", { id: `report-${targetType}-${targetId}` });
    } catch {
      if (!active.current) return;
      setResult("error");
      setErrorMessage(
        "We could not submit your report. Your details are still here. Please try again.",
      );
    } finally {
      locked.current = false;
      if (active.current) setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={(event) => {
          if (locked.current) return;
          event.currentTarget.focus();
          setOpen(true);
          setResult("idle");
        }}
        aria-haspopup="dialog"
        className="touch-target inline-flex items-center gap-1 rounded-lg px-2 text-xs text-muted-foreground hover:text-rose-400"
      >
        <Flag className="h-3 w-3" /> {label}
      </button>
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="modal-frame fixed inset-0 overlay-scrim grid place-items-center"
                onClick={close}
              >
                <motion.div
                  ref={dialogRef}
                  initial={{ scale: 0.94, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.94, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  role="dialog"
                  aria-modal="true"
                  aria-busy={busy}
                  aria-labelledby={headingId}
                  aria-describedby={descriptionId}
                  tabIndex={-1}
                  className="report-dialog modal-panel overlay-surface w-full max-w-md rounded-[var(--radius-command)] p-5 sm:p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                        <Flag className="h-5 w-5" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <h3 id={headingId} className="font-display text-lg font-bold">
                          Report this {targetType}
                        </h3>
                        <p
                          id={descriptionId}
                          className="mt-1 text-xs leading-relaxed text-muted-foreground"
                        >
                          Choose a reason and add context to help the moderation team review your
                          report.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={close}
                      disabled={busy}
                      aria-label="Close report dialog"
                      className="touch-target grid shrink-0 place-items-center rounded-xl border border-border bg-background/30 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  {!user && (
                    <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/5 p-3 text-sm text-amber-200">
                      You can review the form now. Sign in before submitting so the moderation team
                      can follow up safely.
                    </p>
                  )}
                  {result === "success" ? (
                    <div
                      role="status"
                      className="mt-6 rounded-2xl border border-emerald-400/30 bg-emerald-400/5 p-6 text-center"
                    >
                      <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-300" />
                      <h4 className="mt-3 font-display text-lg font-bold">Report received</h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Thank you. The moderation team has the details.
                      </p>
                      <button
                        ref={doneRef}
                        type="button"
                        onClick={close}
                        className="touch-target mt-4 inline-flex items-center justify-center rounded-xl border border-border px-5 py-2.5 text-sm font-semibold hover:bg-card/60"
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <>
                      <ThemedSelect
                        value={reason}
                        disabled={busy}
                        onValueChange={setReason}
                        ariaLabel="Report reason"
                        contentClassName="z-[calc(var(--z-modal)+1)]"
                        className="mt-5 h-11 w-full rounded-xl border-border/80 bg-background/45 px-3 text-sm"
                        options={[
                          { value: "spam", label: "Spam or promotion" },
                          { value: "abuse", label: "Abusive / harassment" },
                          { value: "nsfw", label: "NSFW or inappropriate" },
                          { value: "misinformation", label: "Misleading info" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                      <label htmlFor={detailsId} className="sr-only">
                        Additional report details
                      </label>
                      <textarea
                        id={detailsId}
                        name="details"
                        value={details}
                        disabled={busy}
                        onChange={(e) => setDetails(e.target.value)}
                        placeholder="Add context (optional)"
                        rows={4}
                        maxLength={500}
                        className="mt-3 min-h-28 w-full resize-y rounded-xl border border-border/80 bg-background/45 px-3 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
                      />
                      {result === "error" && (
                        <p
                          role="alert"
                          className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/5 p-3 text-sm text-rose-200"
                        >
                          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{" "}
                          {errorMessage || "We could not submit this report. Please try again."}
                        </p>
                      )}
                      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <button
                          type="button"
                          onClick={close}
                          disabled={busy}
                          className="touch-target order-2 inline-flex min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-border bg-background/25 px-4 py-2.5 text-sm font-semibold transition-colors hover:border-primary/45 hover:bg-background/45 disabled:opacity-50 sm:order-1"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={submit}
                          disabled={busy}
                          aria-busy={busy}
                          className="touch-target order-1 inline-flex min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--interactive-glow)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:order-2"
                          style={{ background: "var(--gradient-primary)" }}
                        >
                          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                          {busy ? "Sending…" : result === "error" ? "Try again" : "Submit report"}
                        </button>
                      </div>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}
