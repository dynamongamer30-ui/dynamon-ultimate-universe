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
            className="fixed inset-0 overlay-scrim grid place-items-center bg-black/70 px-4"
            onClick={() => setOpen(false)}>
            <motion.div ref={dialogRef} initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog" aria-modal="true" aria-labelledby={headingId} tabIndex={-1}
              className="report-dialog overlay-surface w-full max-w-md rounded-3xl p-6 shadow-elev">
              <div className="flex items-start justify-between">
                <div>
                  <h3 id={headingId} className="font-display text-lg font-bold">Report this {targetType}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Owner will review it within 24h.</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} aria-label="Close report dialog" className="grid h-8 w-8 place-items-center rounded-full border border-border"><X className="h-4 w-4" /></button>
              </div>
              <ThemedSelect
                value={reason}
                onValueChange={setReason}
                ariaLabel="Report reason"
                className="mt-4 h-auto w-full rounded-xl py-2.5 text-sm"
                options={[
                  { value: "spam", label: "Spam or promotion" },
                  { value: "abuse", label: "Abusive / harassment" },
                  { value: "nsfw", label: "NSFW or inappropriate" },
                  { value: "misinformation", label: "Misleading info" },
                  { value: "other", label: "Other" },
                ]}
              />
              <label htmlFor={detailsId} className="sr-only">Additional report details</label>
              <textarea id={detailsId} name="details" value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add context (optional)" rows={3} maxLength={500}
                className="mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <div className="mt-4 flex gap-2">
                <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
                <button onClick={submit} disabled={busy}
                  className="flex-1 rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60"
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
