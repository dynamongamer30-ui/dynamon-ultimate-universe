import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Inbox, Loader2, RefreshCw, Send } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Ticket = { id:string; ticket_number:string; telegram_id:number; category:string; subject:string; status:string; created_at:string; last_message_at:string };
type Message = { id:string; sender_type:string; body:string; created_at:string };

export const Route = createFileRoute("/admin-support")({
  ssr:false,
  head:()=>({meta:[{title:"Support Inbox — Dynamon Universe Admin"},{name:"robots",content:"noindex, nofollow"}]}),
  component:AdminSupportRoute,
});
function AdminSupportRoute(){
  const [mounted,setMounted]=useState(false);
  useEffect(()=>setMounted(true),[]);
  if(!mounted)return null;
  return <OwnerGate><AdminSupport /></OwnerGate>;
}
function AdminSupport(){
  const [tickets,setTickets]=useState<Ticket[]>([]);
  const [selected,setSelected]=useState<Ticket|null>(null);
  const [messages,setMessages]=useState<Message[]>([]);
  const [reply,setReply]=useState("");
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const load=useCallback(async()=>{
    setLoading(true);setError(null);
    const {data,error}=await (supabase as any).from("bot_support_tickets")
      .select("id,ticket_number,telegram_id,category,subject,status,created_at,last_message_at")
      .order("last_message_at",{ascending:false}).limit(100);
    if(error){setError("Support inbox is unavailable. Confirm the support migration is applied and owner access is configured.");setLoading(false);return;}
    const rows=(data??[]) as Ticket[];setTickets(rows);
    setSelected(current=>current?rows.find(t=>t.id===current.id)??null:rows[0]??null);
    setLoading(false);
  },[]);
  useEffect(()=>{void load();},[load]);
  useEffect(()=>{
    let active=true;
    async function read(){
      if(!selected){setMessages([]);return;}
      const {data,error}=await (supabase as any).from("bot_support_messages")
        .select("id,sender_type,body,created_at").eq("ticket_id",selected.id).eq("internal_note",false)
        .order("created_at",{ascending:true}).limit(100);
      if(!active)return;
      if(error){toast.error("Could not load this ticket conversation.");return;}
      setMessages((data??[]) as Message[]);
    }
    void read();
    return()=>{active=false;};
  },[selected?.id]);
  const sendReply=async()=>{
    if(!selected||!reply.trim()||busy)return;
    setBusy(true);
    const {error}=await (supabase as any).from("bot_support_messages").insert({
      ticket_id:selected.id,sender_type:"admin",body:reply.trim(),internal_note:false,
    });
    if(error){toast.error("Reply could not be saved. Check owner permissions.");setBusy(false);return;}
    const {error:updateError}=await (supabase as any).from("bot_support_tickets").update({
      status:"waiting_user",last_message_at:new Date().toISOString(),updated_at:new Date().toISOString(),
    }).eq("id",selected.id);
    setReply("");await load();
    if(updateError)toast.error("Reply saved, but ticket status could not be updated.");
    else toast.success("Reply saved to ticket. The user will see it in the bot ticket history.");
    const {data}=await (supabase as any).from("bot_support_messages").select("id,sender_type,body,created_at").eq("ticket_id",selected.id).eq("internal_note",false).order("created_at",{ascending:true}).limit(100);
    setMessages((data??[]) as Message[]);setBusy(false);
  };
  const updateStatus=async(status:"in_progress"|"resolved"|"closed")=>{
    if(!selected||busy)return;setBusy(true);
    const {error}=await (supabase as any).from("bot_support_tickets").update({status,closed_at:status==="closed"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",selected.id);
    if(error)toast.error("Could not update ticket status.");else toast.success("Ticket marked "+status.replace("_"," "));
    await load();setBusy(false);
  };
  return <PageShell>
    <Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4"/>Back to dashboard</Link>
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-300"><Inbox className="h-5 w-5"/></span><div><h1 className="font-display text-2xl font-extrabold">Support Inbox</h1><p className="text-sm text-muted-foreground">Review Telegram tickets and reply as the support team.</p></div></div>
      <button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm"><RefreshCw className="h-4 w-4"/>Refresh</button>
    </header>
    {error&&<div role="alert" className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm">{error}</div>}
    <div className="grid gap-5 lg:grid-cols-[minmax(260px,0.8fr)_minmax(0,1.5fr)]">
      <aside className="rounded-2xl border border-border bg-card/50 p-3">
        <h2 className="px-2 py-2 text-sm font-bold">Tickets ({tickets.length})</h2>
        {loading?<p className="p-3 text-sm text-muted-foreground">Loading…</p>:tickets.length===0?<p className="p-3 text-sm text-muted-foreground">No tickets found.</p>:<ul className="max-h-[70vh] space-y-2 overflow-auto">{tickets.map(t=><li key={t.id}><button onClick={()=>setSelected(t)} aria-pressed={selected?.id===t.id} className={`w-full rounded-xl border p-3 text-left ${selected?.id===t.id?"border-blue-400/60 bg-blue-500/10":"border-border hover:bg-muted/40"}`}><span className="flex items-center justify-between gap-2 text-xs"><strong>{t.ticket_number}</strong><span className="text-muted-foreground">{t.status.replace("_"," ")}</span></span><span className="mt-1 block truncate text-sm font-semibold">{t.subject}</span><span className="mt-1 block text-xs text-muted-foreground">{t.category} · Telegram {t.telegram_id}</span></button></li>)}</ul>}
      </aside>
      <section className="min-w-0 rounded-2xl border border-border bg-card/50 p-4">
        {!selected?<p className="text-sm text-muted-foreground">Choose a ticket to view its conversation.</p>:<>
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4"><div><p className="text-xs font-semibold text-blue-300">{selected.ticket_number} · {selected.status.replace("_"," ")}</p><h2 className="mt-1 text-lg font-bold">{selected.subject}</h2><p className="text-xs text-muted-foreground">Telegram ID {selected.telegram_id} · {selected.category}</p></div><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={()=>void updateStatus("in_progress")} className="rounded-lg border border-blue-400/40 px-3 py-2 text-xs font-semibold text-blue-300">In progress</button><button disabled={busy} onClick={()=>void updateStatus("resolved")} className="rounded-lg border border-green-500/40 px-3 py-2 text-xs font-semibold text-green-400">Resolve</button><button disabled={busy} onClick={()=>void updateStatus("closed")} className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400">Close</button></div></div>
          <div className="my-4 max-h-[48vh] space-y-3 overflow-auto">{messages.map(m=><article key={m.id} className={`rounded-xl border p-3 ${m.sender_type==="admin"?"border-blue-400/30 bg-blue-500/5":"border-border bg-background/40"}`}><p className="mb-1 text-xs font-semibold">{m.sender_type==="admin"?"Support team":m.sender_type==="system"?"System":"Customer"} · {new Date(m.created_at).toLocaleString()}</p><p className="whitespace-pre-wrap break-words text-sm">{m.body}</p></article>)}</div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reply to customer</label>
          <textarea value={reply} onChange={e=>setReply(e.target.value)} maxLength={4000} rows={4} placeholder="Write a support reply…" className="mt-2 w-full rounded-xl border border-border bg-background/60 p-3 text-sm outline-none focus:border-blue-400"/>
          <div className="mt-2 flex justify-end"><button disabled={busy||!reply.trim()||selected.status==="closed"} onClick={()=>void sendReply()} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{busy?<Loader2 className="h-4 w-4 animate-spin"/>:<Send className="h-4 w-4"/>}Save reply</button></div>
          <p className="mt-2 text-xs text-muted-foreground">Replies are saved to the ticket conversation. The bot displays them when the user opens the ticket; this page does not send a Telegram push notification.</p>
        </>}
      </section>
    </div>
  </PageShell>;
}
