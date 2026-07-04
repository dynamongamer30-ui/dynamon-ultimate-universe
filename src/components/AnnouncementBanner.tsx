import { useSiteSettings } from "@/hooks/useSiteSettings";
import { Megaphone, X } from "lucide-react";
import { useEffect, useState } from "react";

export function AnnouncementBanner() {
  const { announcement } = useSiteSettings();
  const [dismissed, setDismissed] = useState(false);
  const key = `announce:${announcement.message}`;

  useEffect(() => {
    if (typeof window !== "undefined") setDismissed(localStorage.getItem(key) === "1");
  }, [key]);

  if (!announcement.enabled || !announcement.message || dismissed) return null;
  const tone = announcement.tone === "warning"
    ? "from-amber-500/30 to-orange-500/20 border-amber-400/40 text-amber-100"
    : announcement.tone === "success"
    ? "from-emerald-500/25 to-teal-500/15 border-emerald-400/40 text-emerald-100"
    : "from-primary/30 to-accent/20 border-primary/40 text-foreground";

  return (
    <div className={`relative z-40 border-b bg-gradient-to-r px-4 py-2.5 text-center text-sm font-medium ${tone}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-center gap-2">
        <Megaphone className="h-4 w-4 shrink-0" />
        {announcement.href ? (
          <a href={announcement.href} target="_blank" rel="noreferrer" className="hover:underline">
            {announcement.message}
          </a>
        ) : <span>{announcement.message}</span>}
        <button
          onClick={() => { localStorage.setItem(key, "1"); setDismissed(true); }}
          className="ml-2 grid h-6 w-6 place-items-center rounded-full hover:bg-white/10"
          aria-label="Dismiss"
        ><X className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}
