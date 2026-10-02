import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ThemedSelect } from "@/components/ThemedSelect";
import { useDialogFocus } from "@/hooks/useDialogFocus";

export function ReportButton({ targetType, targetId, label = "Report" }: { targetType: "comment" | "mod" | "profile"; targetId: string; label?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const headingId = `report-${targetType}-${targetId}-title`;
  const detailsId = `report-${targetType}-${targetId}-details`;
  const dialogRef = useDialogFocus(open, () => setOpen(false));

  const submit = async () => {
    if (!user) { toast.error("Sign in to report"); return; }
    setBusy(true);
    const { error } = await supabase.from("reports").insert({
      reporter_id: user.id, target_type: targetType, target_id: targetId, reason, details: details || null,
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Report submitted — thank you");
    setOpen(false); setDetails("");
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400">
        <Flag className="h-3 w-3" /> {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="modal-frame fixed inset-0 overlay-scrim grid place-items-center bg-black/70"
            onClick={() => setOpen(false)}>
            <motion.div ref={dialogRef} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1}
              className="report-dialog modal-panel overlay-surface w-full max-w-md rounded-3xl p-5 shadow-elev sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/30 bg-primary/10 text-primary">
                    <Flag className="h-5 w-5" aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <h3 id={headingId} className="font-display text-lg font-bold">Report this {targetType}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Owner will review it within 24h.</p>
                  </div>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close report dialog" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-border bg-background/30 text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <ThemedSelect
                value={reason}
                onValueChange={setReason}
                ariaLabel="Report reason"
                className="mt-5 h-11 w-full rounded-xl border-border/80 bg-background/45 px-3 text-sm"
                options={[
                  { value: "spam", label: "Spam or promotion" },
                  { value: "abuse", label: "Abusive / harassment" },
                  { value: "nsfw", label: "NSFW or inappropriate" },
                  { value: "misinformation", label: "Misleading info" },
                  { value: "other", label: "Other" },
                ]}
              />
              <label htmlFor={detailsId} className="sr-only">Additional report details</label>
              <textarea id={detailsId} name="details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add context (optional)" rows={4} maxLength={500}
                className="mt-3 min-h-28 w-full resize-y rounded-xl border border-border/80 bg-background/45 px-3 py-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary" />
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button type="button" onClick={() => setOpen(false)} className="order-2 inline-flex h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-xl border border-border bg-background/25 px-4 text-sm font-semibold transition-colors hover:border-primary/45 hover:bg-background/45 sm:order-1">Cancel</button>
                <button onClick={submit} disabled={busy}
                  className="order-1 inline-flex h-11 min-w-0 items-center justify-center whitespace-nowrap rounded-xl px-4 text-sm font-semibold text-primary-foreground shadow-[var(--interactive-glow)] transition-[filter,transform] hover:brightness-110 active:scale-[0.98] disabled:cursor-wait disabled:opacity-60 sm:order-2"
                  style={{ background: "var(--gradient-primary)" }}>
                  {busy ? "Sending…" : "Submit report"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
