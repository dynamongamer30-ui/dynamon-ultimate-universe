import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { Shield, Send, Trash2, Loader2, Mail, AlertTriangle, Bell, KeyRound } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { ThemedSelect } from "@/components/ThemedSelect";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useConfirm } from "@/hooks/useConfirm";
import { mods } from "@/lib/mods";
import { toast } from "sonner";
import { useOwnerDashboard, type OwnerReport as Report } from "@/hooks/useOwnerDashboard";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Owner Dashboard — Dynamon Universe" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRoute,
});

function AdminRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  return (
    <OwnerGate>
      <AdminPage />
    </OwnerGate>
  );
}

function AdminPage() {
  const { user } = useAuth();
  const confirm = useConfirm();
  const {
    reports,
    stats,
    subscribers: totalSubs,
    loading,
    error: loadError,
    retry,
    updateReport,
  } = useOwnerDashboard(user?.id);
  const pending = useRef(new Set<string>());
  const [busyReports, setBusyReports] = useState(new Set<string>());
  const [blastMod, setBlastMod] = useState(mods[0].slug);
  const [blastSubject, setBlastSubject] = useState("");
  const [blastBody, setBlastBody] = useState("");
  const [sending, setSending] = useState(false);
  const identity = useRef(user?.id);
  const requests = useRef(new Set<AbortController>());
  useEffect(() => {
    identity.current = user?.id;
    const activeRequests = requests.current;
    return () => {
      identity.current = undefined;
      for (const request of activeRequests) request.abort();
    };
  }, [user?.id]);
  const live = () => !!user?.id && identity.current === user.id;

  const updateStatus = async (
    id: string,
    status: "resolved" | "dismissed",
    signal: AbortSignal,
  ) => {
    if (!live()) return;
    const { data, error } = await supabase
      .from("reports")
      .update({ status })
      .eq("id", id)
      .select("id,status")
      .abortSignal(signal)
      .maybeSingle()
      .retry(false);
    if (error || data?.id !== id || data.status !== status)
      throw new Error(
        "Could not confirm the report update. Refresh the queue before trying again.",
      );
    if (!live()) return;
    updateReport(id, status);
    const { error: logError } = await supabase
      .from("moderation_log")
      .insert({
        actor_id: user!.id,
        action: `report_${status}`,
        target_type: "report",
        target_id: id,
      })
      .abortSignal(signal)
      .retry(false);
    if (logError && live())
      toast.error("Report updated, but its audit entry could not be confirmed.");
  };

  const runReportAction = async (
    id: string,
    action: (signal: () => AbortSignal) => Promise<void>,
  ) => {
    if (loading || loadError || pending.current.has(id) || !live()) return;
    const controller = new AbortController();
    requests.current.add(controller);
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const signal = () => {
      deadline ??= setTimeout(() => controller.abort(), 10000);
      return controller.signal;
    };
    pending.current.add(id);
    setBusyReports(new Set(pending.current));
    try {
      await action(signal);
    } catch (error) {
      if (live())
        toast.error(
          error instanceof Error
            ? error.message
            : "Could not confirm this action. Refresh the queue.",
        );
    } finally {
      clearTimeout(deadline);
      requests.current.delete(controller);
      pending.current.delete(id);
      setBusyReports(new Set(pending.current));
    }
  };

  const resolve = (id: string, status: "resolved" | "dismissed") =>
    runReportAction(id, (signal) => updateStatus(id, status, signal()));

  const deleteTarget = (r: Report) =>
    runReportAction(r.id, async (signal) => {
      if (r.target_type !== "comment") return;
      if (
        !(await confirm({
          title: "Delete content",
          description: `Delete this ${r.target_type}? This cannot be undone.`,
          confirmText: "Delete",
          danger: true,
        }))
      )
        return;
      if (!live()) return;
      if (r.target_type === "comment") {
        const { data, error } = await supabase
          .from("comments")
          .delete()
          .eq("id", r.target_id)
          .select("id")
          .abortSignal(signal())
          .maybeSingle()
          .retry(false);
        if (error || data?.id !== r.target_id)
          throw new Error(
            "Content removal was not confirmed. The report remains open; refresh before trying again.",
          );
      }
      if (!live()) return;
      const { error: auditError } = await supabase
        .from("moderation_log")
        .insert({
          actor_id: user!.id,
          action: "content_removed",
          target_type: r.target_type,
          target_id: r.target_id,
          details: `via report ${r.id}`,
        })
        .abortSignal(signal())
        .retry(false);
      if (auditError && live())
        toast.error("Content removed, but the audit entry could not be confirmed.");
      await updateStatus(r.id, "resolved", signal());
      if (live()) toast.success("Content removed and report resolved");
    });

  const sendBlast = async () => {
    if (loading || loadError || sending || !live()) return;
    const subject = blastSubject.trim();
    const body = blastBody.trim();
    if (!subject || !body) {
      toast.error("Subject and body required");
      return;
    }
    if (subject.length > 120) {
      toast.error("Subject too long (max 120)");
      return;
    }
    if (body.length > 5000) {
      toast.error("Body too long (max 5000)");
      return;
    }
    setSending(true);
    const recipients = totalSubs;
    const { error } = await supabase
      .from("broadcasts")
      .insert({
        author_id: user!.id,
        mod_slug: blastMod,
        subject,
        body,
        recipient_count: recipients,
      })
      .retry(false);
    if (!live()) return;
    if (error) {
      toast.error(error.message);
      setSending(false);
      return;
    }
    await supabase
      .from("moderation_log")
      .insert({
        actor_id: user!.id,
        action: "broadcast_queued",
        target_type: "mod",
        target_id: blastMod,
        details: `${recipients} recipients · ${subject}`,
      })
      .retry(false);
    if (!live()) return;
    setSending(false);
    setBlastSubject("");
    setBlastBody("");
    toast.success(`Broadcast queued for ${recipients} subscriber${recipients === 1 ? "" : "s"}`, {
      description: "Queue entry saved. Email delivery has not been confirmed.",
    });
  };

  return (
    <PageShell>
      <header className="route-hero edge-light rounded-2xl glass p-8 sm:p-12">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <Shield className="h-3.5 w-3.5" /> Owner Console
        </p>
        <h1 className="mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl">
          Dashboard
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Moderate the community and notify trainers about new builds.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/admin-keys"
            className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-5 py-2.5 text-sm font-semibold text-amber-200 hover:bg-amber-400/20"
          >
            <KeyRound className="h-4 w-4" /> Key system &amp; DEX
          </Link>
          <Link
            to="/admin-control"
            className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Shield className="h-4 w-4" /> Open Control Panel
          </Link>
          <Link
            to="/admin-notifications"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold transition-colors hover:border-primary/40 hover:text-primary"
          >
            <Bell className="h-4 w-4" /> Send Notifications
          </Link>
        </div>
      </header>

      <section
        aria-label="Dashboard totals"
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Stat label="Trainers" value={loading || loadError ? null : stats.users} />
        <Stat label="Reviews" value={loading || loadError ? null : stats.comments} />
        <Stat label="Favorites" value={loading || loadError ? null : stats.favorites} />
        <Stat
          label="Open in latest 50"
          value={loading || loadError ? null : stats.reports}
          accent={!loadError && !loading && stats.reports > 0}
        />
      </section>

      {loading && (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Loading dashboard data…
        </p>
      )}
      {loadError && (
        <div role="alert" className="mt-4 rounded-xl border border-border p-4">
          <p>
            Dashboard data could not be confirmed. Counts and actions are unavailable until the
            lookup succeeds.
          </p>
          <button
            type="button"
            className="touch-target mt-2 rounded-lg border border-border px-4 py-2"
            onClick={retry}
          >
            Retry dashboard lookup
          </button>
        </div>
      )}

      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="min-w-0 edge-light rounded-2xl glass p-6">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <Mail className="h-5 w-5" /> Broadcast new release
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {loading || loadError
              ? "Subscriber count unavailable until the dashboard loads."
              : `Queue an update for ${totalSubs} subscription records. Delivery is not confirmed here.`}
          </p>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Mod
          </label>
          <ThemedSelect
            value={blastMod}
            onValueChange={setBlastMod}
            ariaLabel="Select mod"
            className="mt-1 h-auto w-full rounded-xl py-2.5 text-sm"
            options={mods.map((m) => ({ value: m.slug, label: `${m.name} — v${m.version}` }))}
          />
          <label htmlFor="broadcast-subject" className="mt-3 block text-sm font-medium">
            Subject
          </label>
          <input
            id="broadcast-subject"
            maxLength={120}
            value={blastSubject}
            onChange={(e) => setBlastSubject(e.target.value)}
            placeholder="Subject"
            className="mt-3 w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <label htmlFor="broadcast-body" className="mt-3 block text-sm font-medium">
            Message
          </label>
          <textarea
            id="broadcast-body"
            value={blastBody}
            onChange={(e) => setBlastBody(e.target.value)}
            placeholder="Message body…"
            rows={6}
            maxLength={2000}
            className="mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={sendBlast}
            disabled={sending || loading || loadError}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Queue broadcast
          </button>
        </div>

        <div className="min-w-0 edge-light rounded-2xl glass p-6">
          <h2 className="font-display text-xl font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" /> Reports queue
          </h2>
          <div className="mt-4 space-y-3 max-h-[520px] overflow-auto">
            {!loading && !loadError && reports.length === 0 && (
              <p className="text-sm text-muted-foreground">No reports yet.</p>
            )}
            {reports.map((r) => (
              <div
                key={r.id}
                className={`rounded-2xl border p-4 ${r.status === "open" ? "border-amber-400/30 bg-amber-500/5" : "border-border bg-background/40 opacity-70"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2 text-xs">
                  <span className="font-bold uppercase tracking-widest text-amber-300">
                    {r.reason}
                  </span>
                  <span className="text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {r.target_type} · <code className="text-xs">{r.target_id.slice(0, 8)}</code>
                </p>
                {r.details && (
                  <p className="mt-2 whitespace-pre-line break-words text-sm [overflow-wrap:anywhere]">
                    {r.details}
                  </p>
                )}
                {r.status === "open" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {r.target_type === "comment" && (
                      <button
                        disabled={loading || loadError || busyReports.has(r.id)}
                        onClick={() => deleteTarget(r)}
                        className="touch-target inline-flex items-center gap-1 rounded-full border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                      >
                        <Trash2 className="h-3 w-3" /> Remove content
                      </button>
                    )}
                    <button
                      disabled={loading || loadError || busyReports.has(r.id)}
                      onClick={() => resolve(r.id, "dismissed")}
                      className="touch-target rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
                {r.status !== "open" && (
                  <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
                    · {r.status}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | null; accent?: boolean }) {
  return (
    <div
      className={`edge-light rounded-2xl glass p-6 text-center ${accent ? "ring-2 ring-amber-400/50" : ""}`}
    >
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-gradient">
        {value === null ? "—" : value}
      </p>
    </div>
  );
}
