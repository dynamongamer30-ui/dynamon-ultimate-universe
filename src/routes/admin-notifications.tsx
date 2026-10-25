import { useOwnerResource } from "@/hooks/useOwnerResource";
import { useOwnerMutation } from "@/hooks/useOwnerMutation";
import { useConfirm } from "@/hooks/useConfirm";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Bell, Send, Trash2, Loader2, ArrowLeft, Pencil, Check, X } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import {
  listNotifications,
  createNotification,
  updateNotification,
  deleteNotification,
  type AppNotification,
} from "@/lib/notifications";
import { toast } from "sonner";

export const Route = createFileRoute("/admin-notifications")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Notifications — Dynamon Universe Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminNotificationsRoute,
});

function AdminNotificationsRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <OwnerGate>
      <AdminNotifications />
    </OwnerGate>
  );
}

function AdminNotifications() {
  const resource = useOwnerResource(
    useCallback((signal: AbortSignal) => listNotifications(signal), []),
  );
  const items = resource.data ?? [];
  const loading = resource.loading;
  const mutation = useOwnerMutation();
  const sending = mutation.saving,
    savingEdit = mutation.saving;
  const confirm = useConfirm();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [draftId, setDraftId] = useState(() => crypto.randomUUID());
  const [uncertain, setUncertain] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editBody, setEditBody] = useState("");
  const cancelEdit = () => {
    if (mutation.saving) return;
    setEditingId(null);
    setEditTitle("");
    setEditBody("");
  };
  const send = () =>
    mutation.run(async (signal) => {
      if (!title.trim() || !body.trim()) throw new Error("Add a title and message first.");
      if (uncertain || resource.loading || resource.error) return;
      try {
        const result = await createNotification(title.trim(), body.trim(), signal, draftId);
        resource.setData((current) => [
          result,
          ...(current ?? []).filter((row) => row.id !== result.id),
        ]);
        setTitle("");
        setBody("");
        setDraftId(crypto.randomUUID());
        toast.success("Notification created");
      } catch (error) {
        setUncertain(true);
        throw error;
      }
    });
  const checkSent = () =>
    mutation.run(async (signal) => {
      const rows = await listNotifications(signal);
      if (signal.aborted) return;
      resource.setData(rows);
      if (rows.some((row) => row.id === draftId)) {
        setTitle("");
        setBody("");
        setDraftId(crypto.randomUUID());
        toast.success("Notification confirmed in sent list");
      }
      setUncertain(false);
    });
  const remove = async (id: string) => {
    if (
      mutation.saving ||
      !(await confirm({
        title: "Delete notification",
        description: "Remove this notification from the shared list?",
        confirmText: "Delete",
        danger: true,
      }))
    )
      return;
    await mutation.run(async (signal) => {
      await deleteNotification(id, signal);
      resource.setData((rows) => (rows ?? []).filter((row) => row.id !== id));
      toast.success("Notification deleted");
    });
  };
  const startEdit = (row: AppNotification) => {
    if (mutation.saving) return;
    setEditingId(row.id);
    setEditTitle(row.title);
    setEditBody(row.body);
  };
  const saveEdit = (id: string) =>
    mutation.run(async (signal) => {
      if (!editTitle.trim() || !editBody.trim()) throw new Error("Add a title and message first.");
      const result = await updateNotification(id, editTitle.trim(), editBody.trim(), signal);
      resource.setData((rows) => (rows ?? []).map((row) => (row.id === id ? result : row)));
      setEditingId(null);
      toast.success("Notification updated");
    });

  return (
    <PageShell>
      <Link
        to="/admin"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </Link>

      <header className="mb-8 flex items-center gap-3">
        <span
          className="grid h-11 w-11 place-items-center rounded-2xl text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Bell className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold">Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Send announcements to all signed-in users.
          </p>
        </div>
      </header>

      {mutation.error && (
        <p role="alert" className="mb-4 break-words text-sm text-destructive">
          {mutation.error}
        </p>
      )}
      {resource.error && (
        <div role="alert" className="mb-4">
          <p>{resource.error}</p>
          <button
            className="touch-target rounded-xl border border-border px-4"
            onClick={resource.reload}
            disabled={loading}
          >
            Retry sent notifications
          </button>
        </div>
      )}
      {uncertain && (
        <div className="mb-4">
          <p role="status">
            Creation needs confirmation. Check the sent list before sending again.
          </p>
          <button
            className="touch-target rounded-xl border border-border px-4"
            disabled={sending}
            onClick={() => void checkSent()}
          >
            Check sent notifications
          </button>
        </div>
      )}
      <fieldset
        disabled={mutation.saving}
        aria-busy={mutation.saving}
        className="grid min-w-0 gap-6 lg:grid-cols-[1fr_1.2fr]"
      >
        <legend className="sr-only">Notification management</legend>
        {/* Compose */}
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-4 font-display text-lg font-bold">Compose</h2>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Title
            </span>
            <input
              value={title}
              disabled={uncertain || !!resource.error || loading}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              aria-label="Notification title"
              placeholder="e.g. New mod dropped!"
              className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Message
            </span>
            <textarea
              value={body}
              disabled={uncertain || !!resource.error || loading}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={1000}
              aria-label="Notification message"
              placeholder="Write your announcement…"
              className="w-full resize-y rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="mt-5 flex justify-end">
            <button
              onClick={send}
              disabled={sending || uncertain || loading || !!resource.error}
              className="press inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-60"
              style={{ background: "var(--gradient-primary)" }}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send notification
            </button>
          </div>
        </div>

        {/* Sent list */}
        <div className="rounded-2xl border border-border bg-card/60 p-5">
          <h2 className="mb-4 font-display text-lg font-bold">
            Sent ({resource.error ? "unavailable" : items.length})
          </h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : resource.error ? (
            <p className="text-sm">Sent notifications are unavailable.</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((n) => (
                <li key={n.id} className="rounded-xl border border-border p-4">
                  {editingId === n.id ? (
                    <div className="space-y-3">
                      <input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        aria-label="Edit notification title"
                        maxLength={120}
                        placeholder="Title"
                        className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                      />
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        aria-label="Edit notification message"
                        rows={4}
                        maxLength={1000}
                        placeholder="Message"
                        className="w-full resize-y rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={cancelEdit}
                          className="press inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" /> Cancel
                        </button>
                        <button
                          onClick={() => saveEdit(n.id)}
                          disabled={savingEdit}
                          className="press inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-primary-foreground disabled:opacity-60"
                          style={{ background: "var(--gradient-primary)" }}
                        >
                          {savingEdit ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{n.title}</p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm text-muted-foreground">
                          {n.body}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-wide text-muted-foreground/70">
                          {new Date(n.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          onClick={() => startEdit(n)}
                          aria-label="Edit notification"
                          className="press grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:border-primary/50 hover:text-primary-ink"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => remove(n.id)}
                          aria-label="Delete notification"
                          className="press grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:border-rose-400/50 hover:text-rose-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </fieldset>
    </PageShell>
  );
}
