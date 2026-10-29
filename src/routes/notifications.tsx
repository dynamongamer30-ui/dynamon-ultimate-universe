import { NotificationDetail } from "@/components/NotificationDetail";
import type { AppNotification } from "@/lib/notifications";
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, BellOff, Check } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationBody } from "@/components/NotificationBody";
import { Skeleton } from "@/components/Skeleton";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notifications — Dynamon Universe" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: NotificationsPage,
});

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationsPage() {
  const { user } = useAuth();
  const { items, readIds, loading, error, refresh, markAllRead, markOneRead, sender } =
    useNotifications();
  const [opened, setOpened] = useState<AppNotification | null>(null);
  const unreadCount = items.filter((n) => !readIds.has(n.id)).length;
  const [filter, setFilter] = useState<"all" | "rewards" | "updates">("all");
  const visibleItems = items.filter(
    (n) => filter === "all" || (filter === "rewards" ? !!n.reward_kind : !n.reward_kind),
  );

  // Snapshot which notifications were unread when the page opened, so they keep
  // their "new" highlight during this visit even after we mark them read.
  const [unreadOnArrival, setUnreadOnArrival] = useState<Set<string>>(new Set());
  const snapshotted = useRef(false);
  useEffect(() => {
    snapshotted.current = false;
    setUnreadOnArrival(new Set());
    setFilter("all");
  }, [user?.id]);

  // Auto-mark everything read once the list has loaded — no button needed.
  useEffect(() => {
    if (!user || loading || error || snapshotted.current) return;
    snapshotted.current = true;
    setUnreadOnArrival(new Set(items.filter((n) => !readIds.has(n.id)).map((n) => n.id)));
    // Opening the inbox must not acknowledge messages.
  }, [user, loading, error, items, readIds, markAllRead]);

  return (
    <PageShell>
      <NotificationDetail notification={opened} onClose={() => setOpened(null)} />
      <header
        aria-labelledby="notifications-title"
        className="route-hero edge-light rounded-2xl glass p-8 sm:p-12"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary-ink">
              <Bell className="h-3.5 w-3.5" /> Inbox
            </p>
            <h1
              id="notifications-title"
              className="mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl"
            >
              Notifications
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Announcements and updates from the Dynamon Universe team.
              {unreadCount > 0 && (
                <span className="ml-2 font-semibold text-primary-ink">{unreadCount} new</span>
              )}
            </p>
          </div>
        </div>
      </header>

      {user && !loading && !error && items.length > 0 && (
        <div role="group" aria-label="Filter notifications" className="mt-6 flex flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["rewards", "Rewards"],
              ["updates", "Updates"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`touch-target rounded-full border px-4 py-2 text-sm font-semibold ${filter === value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {!user ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary-ink hover:underline">
            Sign in
          </Link>{" "}
          to view your notifications.
        </div>
      ) : error ? (
        <div role="alert" className="mt-8 rounded-2xl border border-border bg-card p-6">
          <p>Could not load your notifications.</p>
          <button
            type="button"
            onClick={() => refresh()}
            className="touch-target mt-3 text-primary-ink underline"
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className="mt-8 space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-2xl border border-border bg-card/40 p-5"
            >
              <Skeleton className="h-9 w-9 shrink-0" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="mt-2 h-3 w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : visibleItems.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border bg-card/30 p-12 text-center">
          <span
            className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary-ink"
            style={{ boxShadow: "var(--shadow-glow)" }}
          >
            <BellOff className="h-6 w-6" />
          </span>
          <p className="text-muted-foreground">
            {items.length === 0
              ? "No notifications yet. Check back soon."
              : `No ${filter} in this inbox.`}
          </p>
        </div>
      ) : (
        <ul aria-label="Notifications" className="notification-list mt-8 space-y-3">
          {visibleItems.map((n) => {
            const unread = unreadOnArrival.has(n.id);
            return (
              <li
                key={n.id}
                className={`notification-card surface-l1 rounded-2xl border p-5 transition-colors ${unread ? "border-primary/40 bg-primary/5" : ""}`}
              >
                <div className="flex items-start gap-3">
                  {sender ? (
                    <img
                      src={
                        sender.custom_avatar_url || sender.avatar_url || "/dynamon-gamer-avatar.png"
                      }
                      onError={(event) => {
                        if (event.currentTarget.getAttribute("src") !== "/dynamon-gamer-avatar.png")
                          event.currentTarget.src = "/dynamon-gamer-avatar.png";
                      }}
                      alt=""
                      className="mt-0.5 h-9 w-9 shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <span
                      className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${unread ? "text-primary-foreground" : "bg-card text-muted-foreground"}`}
                      style={unread ? { background: "var(--gradient-primary)" } : undefined}
                      aria-hidden
                    >
                      {unread ? <Bell className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                    </span>
                  )}
                  <div className="notification-copy min-w-0 flex-1">
                    {sender && (
                      <p className="text-xs font-semibold text-primary-ink">
                        {sender.display_name || "Dynamon Gamer 07"}
                      </p>
                    )}
                    <div className="notification-heading flex items-start justify-between gap-3">
                      <h2 className="notification-copy min-w-0 font-display text-lg font-bold">
                        {n.title}
                      </h2>
                      <time
                        dateTime={n.created_at}
                        className="notification-date shrink-0 text-right text-xs text-muted-foreground"
                      >
                        {fmt(n.created_at)}
                      </time>
                    </div>
                    <p className="notification-copy mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      <NotificationBody text={n.body} />
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setOpened(n);
                        void markOneRead(n.id);
                      }}
                      className="touch-target mt-3 rounded-lg border border-border px-4 py-2 text-sm font-semibold"
                    >
                      Open notification
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </PageShell>
  );
}
