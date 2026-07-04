import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, Check, CheckCheck } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { useAuth } from "@/hooks/useAuth";
import { useNotifications } from "@/hooks/useNotifications";

export const Route = createFileRoute("/notifications")({
  ssr: false,
  head: () => ({ meta: [{ title: "Notifications — Dynamon Universe" }] }),
  component: NotificationsPage,
});

function fmt(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

function NotificationsPage() {
  const { user } = useAuth();
  const { items, readIds, unreadCount, loading, markAllRead } = useNotifications();

  return (
    <PageShell>
      <header className="edge-light rounded-2xl glass p-8 sm:p-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-primary">
              <Bell className="h-3.5 w-3.5" /> Inbox
            </p>
            <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">Notifications</h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Announcements and updates from the Dynamon Universe team.
            </p>
          </div>
          {user && unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="press inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>
      </header>

      {!user ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
          <Link to="/auth" className="font-semibold text-primary hover:underline">Sign in</Link> to view your notifications.
        </div>
      ) : loading ? (
        <p className="mt-10 text-center text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground">
          No notifications yet. Check back soon.
        </div>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((n) => {
            const unread = !readIds.has(n.id);
            return (
              <li
                key={n.id}
                className={`rounded-2xl border p-5 transition-colors ${unread ? "border-primary/40 bg-primary/5" : "border-border bg-card/40"}`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${unread ? "text-primary-foreground" : "bg-card text-muted-foreground"}`}
                    style={unread ? { background: "var(--gradient-primary)" } : undefined}
                    aria-hidden
                  >
                    {unread ? <Bell className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-lg font-bold">{n.title}</h2>
                      <span className="shrink-0 text-xs text-muted-foreground">{fmt(n.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{n.body}</p>
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
