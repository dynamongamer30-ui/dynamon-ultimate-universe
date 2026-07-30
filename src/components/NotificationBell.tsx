import { Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "motion/react";
import { Bell, Check } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { playClick } from "@/lib/sound";
import { useNotifications } from "@/hooks/useNotifications";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { items, readIds, unreadCount, markAllRead, markOneRead, sender } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const recent = items.slice(0, 6);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => { setOpen((v) => !v); playClick(); }}
        aria-label="Notifications"
        className="press relative grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="fixed inset-x-3 top-16 z-50 max-h-[80vh] w-auto overflow-hidden rounded-2xl glass shadow-elev sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-80"
          >
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Check className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
            </div>

            {recent.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No notifications yet.
              </div>
            ) : (
              <ul className="max-h-80 divide-y divide-border/40 overflow-auto">
                {recent.map((n) => {
                  const unread = !readIds.has(n.id);
                  return (
                    <li key={n.id} className={unread ? "bg-primary/5" : ""}>
                      <Link
                        to="/notifications"
                        onClick={() => { if (unread) markOneRead(n.id); setOpen(false); }}
                        className="block px-4 py-3 hover:bg-card/60"
                      >
                        <div className="flex items-start gap-2">
                          {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />}
                          <div className={`min-w-0 ${unread ? "" : "pl-4"}`}>
                            {sender && (
                              <div className="mb-1 flex items-center gap-1.5">
                                <img
                                  src={sender.custom_avatar_url || sender.avatar_url || "/favicon.ico"}
                                  alt=""
                                  className="h-4 w-4 shrink-0 rounded-full object-cover"
                                />
                                <span className="text-[11px] font-medium text-primary">
                                  {sender.display_name || "Dynamon Gamer 07"}
                                </span>
                              </div>
                            )}
                            <p className="truncate text-sm font-semibold">{n.title}</p>
                            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">{timeAgo(n.created_at)}</p>
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="block border-t border-border/60 px-4 py-3 text-center text-sm font-medium text-primary hover:bg-card/60"
            >
              View all notifications
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
