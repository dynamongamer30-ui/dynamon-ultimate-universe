import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Shield, Send, Trash2, Loader2, Mail, AlertTriangle } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { mods } from "@/lib/mods";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Owner Dashboard — Dynamon Universe" }] }),
  component: AdminRoute,
});

function AdminRoute() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;
  return <OwnerGate><AdminPage /></OwnerGate>;
}

type Report = { id: string; reporter_id: string; target_type: string; target_id: string; reason: string; details: string | null; status: string; created_at: string };
type Subscriber = { user_id: string; email: string };

function AdminPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ users: 0, comments: 0, favorites: 0, reports: 0 });
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [blastMod, setBlastMod] = useState(mods[0].slug);
  const [blastSubject, setBlastSubject] = useState("");
  const [blastBody, setBlastBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: rep }, { count: usersCount }, { count: commentsCount }, { count: favCount }, { data: subsData }] = await Promise.all([
        supabase.from("reports").select("*").order("created_at", { ascending: false }).limit(50),
        supabase.from("profiles").select("*", { count: "exact", head: true }),
        supabase.from("comments").select("*", { count: "exact", head: true }),
        supabase.from("favorites").select("*", { count: "exact", head: true }),
        supabase.from("mod_subscribers").select("user_id, email"),
      ]);
      setReports((rep ?? []) as Report[]);
      setStats({
        users: usersCount ?? 0,
        comments: commentsCount ?? 0,
        favorites: favCount ?? 0,
        reports: (rep ?? []).filter((r: Report) => r.status === "open").length,
      });
      setSubs((subsData ?? []) as unknown as Subscriber[]);
    })();
  }, []);

  const resolve = async (id: string, status: "resolved" | "dismissed") => {
    await supabase.from("reports").update({ status }).eq("id", id);
    await (supabase.from as any)("moderation_log").insert({
      actor_id: user!.id, action: `report_${status}`, target_type: "report", target_id: id,
    });
    setReports((prev) => prev.map((r) => r.id === id ? { ...r, status } : r));
  };

  const deleteTarget = async (r: Report) => {
    if (!confirm(`Delete this ${r.target_type}?`)) return;
    if (r.target_type === "comment") {
      await supabase.from("comments").delete().eq("id", r.target_id);
    }
    await (supabase.from as any)("moderation_log").insert({
      actor_id: user!.id, action: "content_removed", target_type: r.target_type, target_id: r.target_id,
      details: `via report ${r.id}`,
    });
    await resolve(r.id, "resolved");
    toast.success("Content removed");
  };

  const sendBlast = async () => {
    const subject = blastSubject.trim();
    const body = blastBody.trim();
    if (!subject || !body) { toast.error("Subject and body required"); return; }
    if (subject.length > 120) { toast.error("Subject too long (max 120)"); return; }
    if (body.length > 5000) { toast.error("Body too long (max 5000)"); return; }
    setSending(true);
    const recipients = subs.length;
    const { error } = await (supabase.from as any)("broadcasts").insert({
      author_id: user!.id, mod_slug: blastMod, subject, body, recipients,
    });
    if (error) { toast.error(error.message); setSending(false); return; }
    await (supabase.from as any)("moderation_log").insert({
      actor_id: user!.id, action: "broadcast_queued", target_type: "mod", target_id: blastMod,
      details: `${recipients} recipients · ${subject}`,
    });
    setSending(false);
    setBlastSubject(""); setBlastBody("");
    toast.success(`Broadcast queued for ${recipients} subscriber${recipients === 1 ? "" : "s"}`, {
      description: "Configure Resend in an edge function to deliver real emails.",
    });
  };


  const totalSubs = subs.length;

  return (
    <PageShell>
      <header className="rounded-3xl glass p-8 sm:p-12">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300">
          <Shield className="h-3.5 w-3.5" /> Owner Console
        </p>
        <h1 className="mt-3 font-display text-4xl font-extrabold sm:text-5xl">Dashboard</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">Moderate the community and notify trainers about new builds.</p>
        <Link to="/admin-control" className="mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary" style={{ background: "var(--gradient-primary)" }}>
          <Shield className="h-4 w-4" /> Open Control Panel
        </Link>
      </header>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Trainers" value={stats.users} />
        <Stat label="Reviews" value={stats.comments} />
        <Stat label="Favorites" value={stats.favorites} />
        <Stat label="Open reports" value={stats.reports} accent={stats.reports > 0} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl glass p-6">
          <h3 className="font-display text-xl font-bold flex items-center gap-2"><Mail className="h-5 w-5" /> Broadcast new release</h3>
          <p className="mt-1 text-sm text-muted-foreground">Notify all {totalSubs} email-opted-in trainers about a new mod build.</p>
          <label className="mt-4 block text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mod</label>
          <select value={blastMod} onChange={(e) => setBlastMod(e.target.value)}
            className="mt-1 w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm">
            {mods.map((m) => (
              <option key={m.slug} value={m.slug}>{m.name} — v{m.version}</option>
            ))}
          </select>
          <input value={blastSubject} onChange={(e) => setBlastSubject(e.target.value)} placeholder="Subject"
            className="mt-3 w-full rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <textarea value={blastBody} onChange={(e) => setBlastBody(e.target.value)} placeholder="Message body…" rows={6} maxLength={2000}
            className="mt-3 w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2.5 text-sm outline-none focus:border-primary" />
          <button onClick={sendBlast} disabled={sending}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60"
            style={{ background: "var(--gradient-primary)" }}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Queue broadcast
          </button>
        </div>

        <div className="rounded-3xl glass p-6">
          <h3 className="font-display text-xl font-bold flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-400" /> Reports queue</h3>
          <div className="mt-4 space-y-3 max-h-[520px] overflow-auto">
            {reports.length === 0 && <p className="text-sm text-muted-foreground">No reports yet.</p>}
            {reports.map((r) => (
              <div key={r.id} className={`rounded-2xl border p-4 ${r.status === "open" ? "border-amber-400/30 bg-amber-500/5" : "border-border bg-background/40 opacity-70"}`}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-widest text-amber-300">{r.reason}</span>
                  <span className="text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.target_type} · <code className="text-[10px]">{r.target_id.slice(0, 8)}</code></p>
                {r.details && <p className="mt-2 whitespace-pre-line text-sm">{r.details}</p>}
                {r.status === "open" && (
                  <div className="mt-3 flex gap-2">
                    <button onClick={() => deleteTarget(r)} className="inline-flex items-center gap-1 rounded-full border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">
                      <Trash2 className="h-3 w-3" /> Remove content
                    </button>
                    <button onClick={() => resolve(r.id, "dismissed")} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground">Dismiss</button>
                  </div>
                )}
                {r.status !== "open" && <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">· {r.status}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-3xl glass p-6 text-center ${accent ? "ring-2 ring-amber-400/50" : ""}`}>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl font-extrabold text-gradient">{value}</p>
    </div>
  );
}
