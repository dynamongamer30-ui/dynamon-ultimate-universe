import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Download, X, Smartphone } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PWAInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem("pwa-dismissed")) return;
    } catch {
      /* Storage is optional. */
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      clearTimeout(timer);
      timer = setTimeout(() => setShow(true), 4000);
    };
    const installed = () => {
      clearTimeout(timer);
      setShow(false);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", installed);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installed);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      await deferred.userChoice;
    } catch {
      /* A browser can withdraw install eligibility while the prompt is open. */
    } finally {
      setShow(false);
      setDeferred(null);
    }
  };

  const dismiss = () => {
    setShow(false);
    try {
      sessionStorage.setItem("pwa-dismissed", "1");
    } catch {
      /* Already dismissed for this render. */
    }
  };

  return (
    <AnimatePresence>
      {show && deferred && (
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 30 }}
          className="fixed bottom-4 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl glass p-4 shadow-elev"
        >
          <div className="flex items-center gap-3">
            <span
              className="grid h-10 w-10 place-items-center rounded-xl text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Smartphone className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Install Dynamon Universe</p>
              <p className="text-xs text-muted-foreground">One-tap launch from your home screen.</p>
            </div>
            <button
              onClick={install}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-foreground glow-primary"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Download className="h-3.5 w-3.5" /> Install
            </button>
            <button
              onClick={dismiss}
              className="grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
