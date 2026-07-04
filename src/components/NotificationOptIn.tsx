import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Mail, X, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { playClick, playSuccess } from "@/lib/sound";

export function NotificationOptIn() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("notification_prefs").select("asked_at").eq("user_id", user.id).maybeSingle();
      if (!cancelled && !data?.asked_at) {
        const skipKey = `notif-skipped:${user.id}`;
        const skipped = typeof window !== "undefined" && sessionStorage.getItem(skipKey);
        if (!skipped) setTimeout(() => setOpen(true), 1500);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const save = async () => {
    if (!user) return;
    setBusy(true);
    try {
      if (push && typeof window !== "undefined" && "Notification" in window) {
        try { await Notification.requestPermission(); } catch { /* ignore */ }
      }
      await supabase.from("notification_prefs").upsert({
        user_id: user.id,
        email_opt_in: email,
        push_opt_in: push,
        asked_at: new Date().toISOString(),
      });
      if (email && user.email) {
        await supabase.from("mod_subscribers").upsert({ user_id: user.id, email: user.email });
      } else if (!email) {
        await supabase.from("mod_subscribers").delete().eq("user_id", user.id);
      }
      playSuccess();
      toast.success("Preferences saved — we'll keep you in the loop");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally { setBusy(false); }
  };

  const skip = () => {
    if (user) sessionStorage.setItem(`notif-skipped:${user.id}`, "1");
    setOpen(false);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm px-4"
          onClick={skip}
        >
          <motion.div
            initial={{ scale: 0.94, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl glass shadow-elev"
          >
            <button onClick={skip} className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground hover:text-foreground" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
            <div className="relative p-7">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary">
                <Sparkles className="h-3 w-3" /> Stay in the loop
              </span>
              <h2 className="mt-4 font-display text-2xl font-extrabold">Get notified on new mods</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We drop fresh Dynamons World builds every week. Pick how you want to hear about them.
              </p>
              <div className="mt-6 space-y-3">
                <Toggle icon={<Mail className="h-4 w-4" />} label="Email me on new mod drops" value={email} onChange={setEmail} hint="Sent to the email on your account" />
                <Toggle icon={<Bell className="h-4 w-4" />} label="Browser push notifications" value={push} onChange={setPush} hint="Instant on this device" />
              </div>
              <div className="mt-7 flex gap-2">
                <button onClick={skip} className="flex-1 rounded-full border border-border bg-card/60 px-4 py-2.5 text-sm font-semibold">
                  Maybe later
                </button>
                <button
                  onClick={() => { playClick(); save(); }}
                  disabled={busy}
                  className="flex-[1.4] rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {busy ? "Saving…" : "Enable updates"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Toggle({ icon, label, value, onChange, hint }: { icon: React.ReactNode; label: string; value: boolean; onChange: (v: boolean) => void; hint: string }) {
  return (
    <button onClick={() => onChange(!value)} className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${value ? "border-primary/50 bg-primary/10" : "border-border bg-card/60"}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-xl ${value ? "text-primary-foreground" : "text-muted-foreground bg-background/60"}`} style={value ? { background: "var(--gradient-primary)" } : undefined}>
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <span className={`h-5 w-9 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`}>
        <span className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : ""}`} />
      </span>
    </button>
  );
}
