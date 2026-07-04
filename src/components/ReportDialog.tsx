import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Flag, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function ReportButton({ targetType, targetId, label = "Report" }: { targetType: "comment" | "mod" | "profile"; targetId: string; label?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

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
      <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-rose-400">
        <Flag className="h-3 w-3" /> {label}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm px-4"
            onClick={() => setOpen(false)}>
            <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl glass p-6 shadow-elev">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold">Report this {targetType}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Owner will review it within 24h.</p>
                </div>
                <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-full border border-border"><X className="h-4 w-4" /></button>
              </div>
              <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-4 w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm">
                <option value="spam">Spam or promotion</option>
                <option value="abuse">Abusive / harassment</option>
                <option value="nsfw">NSFW or inappropriate</option>
                <option value="misinformation">Misleading info</option>
                <option value="other">Other</option>
              </select>
              <textarea value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Add context (optional)" rows={3} maxLength={500}
                className="mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary" />
              <div className="mt-4 flex gap-2">
                <button onClick={() => setOpen(false)} className="flex-1 rounded-full border border-border px-4 py-2 text-sm">Cancel</button>
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
