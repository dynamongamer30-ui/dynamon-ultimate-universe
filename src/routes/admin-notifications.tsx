import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Send, Trash2, Loader2, ArrowLeft } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import {
  listNotifications,
  createNotification,
  deleteNotification,
  type AppNotification,
} from "@/lib/notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-notifications")({
  ssr: false,
  head: () => ({ meta: [{ title: "Notifications — Dynamon Universe Admin" }] }),
  component: AdminNotificationsRoute,
});

function AdminNotificationsRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <OwnerGate><AdminNotifications /></OwnerGate>;
}

function AdminNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const reload = async () => {
    setLoading(true);
    try { setItems(await listNotifications()); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { reload(); }, []);

  const send = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Add a title and message first.");
      return;
    }
    setSending(true);
    try {
      await createNotification(title.trim(), body.trim());
      toast.success("Notification sent to all signed-in users");
      setTitle(""); setBody("");
      await reload();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSending(false); }
  };

  const remove = async (id: string) => {
    try { await deleteNotification(id); setItems((p) => p.filter((n) => n.id !== id)); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <PageShell>
      <Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <header className="mb-8 flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl text-primary-foreground" style={{ background: "var(--gradient-primary)" }}>
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Send announcements to all signed-in users.</p>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        {/* Compose */}
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-4 font-display text-lg font-bold">Compose</h2>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="e.g. New mod dropped!"
              className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Message</span>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Write your announcement…"
              className="w-full resize-y rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="mt-5 flex justify-end">
            <button
              onClick={send}
              disabled={sending}
              className="press inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Send notification
            </button>
          </div>
        </div>

        {/* Sent list */}
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-4 font-display text-lg font-bold">Sent ({items.length})</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((n) => (
                <li key={n.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{n.title}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{n.body}</p>
                      <p className="mt-2 text-[10px] uppercase tracking-wide text-muted-foreground/70">
                        {new Date(n.created_at).toLocaleString()}
                      </p>
                    </div>
                    <button
                      onClick={() => remove(n.id)}
                      aria-label="Delete notification"
                      className="press grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground hover:border-rose-400/50 hover:text-rose-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </PageShell>
  );
}
