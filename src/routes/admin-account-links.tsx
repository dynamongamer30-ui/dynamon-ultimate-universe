import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, RefreshCw, Link2, Search, History } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { supabase } from "@/integrations/supabase/client";

type AccountLink={id:string;user_id:string;telegram_id:number;linked_at:string;unlink_eligible_at:string;unlinked_at:string|null};
type LinkEvent={id:number;user_id:string;telegram_id:number;event_type:string;details:Record<string,unknown>;created_at:string};
export const Route=createFileRoute("/admin-account-links")({
 ssr:false,
 head:()=>({meta:[{title:"Telegram Account Links — Admin"},{name:"robots",content:"noindex, nofollow"}]}),
 component:RouteView,
});
function RouteView(){const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);if(!mounted)return null;return <OwnerGate><AccountLinks/></OwnerGate>}
function AccountLinks(){
 const [rows,setRows]=useState<AccountLink[]>([]),[events,setEvents]=useState<LinkEvent[]>([]);
 const [query,setQuery]=useState(""),[showHistory,setShowHistory]=useState(false);
 const [loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{
  setLoading(true);setError("");
  const [linksResult,eventsResult]=await Promise.all([
   (supabase as any).from("bot_account_links").select("id,user_id,telegram_id,linked_at,unlink_eligible_at,unlinked_at").order("linked_at",{ascending:false}).limit(500),
   (supabase as any).from("bot_account_link_events").select("id,user_id,telegram_id,event_type,details,created_at").order("created_at",{ascending:false}).limit(100),
  ]);
  if(linksResult.error||eventsResult.error){setError("Account-link data is unavailable. Confirm the account-linking migration and owner read policies are applied.");setLoading(false);return}
  setRows((linksResult.data??[]) as AccountLink[]);setEvents((eventsResult.data??[]) as LinkEvent[]);setLoading(false);
 },[]);
 useEffect(()=>{void load()},[load]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return rows.filter(r=>!q||String(r.telegram_id).includes(q)||r.user_id.toLowerCase().includes(q))},[rows,query]);
 const active=rows.filter(r=>!r.unlinked_at).length;
 const exportCsv=()=>{const data=[["Telegram ID","Website User ID","Linked At","Unlink Eligible At","Unlinked At"],...filtered.map(r=>[r.telegram_id,r.user_id,r.linked_at,r.unlink_eligible_at,r.unlinked_at??""])];const csv=data.map(row=>row.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(",")).join("\n");const url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));const a=document.createElement("a");a.href=url;a.download="dynamon-account-links.csv";a.click();URL.revokeObjectURL(url)};
 return <PageShell>
  <Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4"/>Back to dashboard</Link>
  <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-300"><Link2 className="h-5 w-5"/></span><div><h1 className="font-display text-2xl font-extrabold">Telegram Account Links</h1><p className="text-sm text-muted-foreground">Read-only owner view of account connections and audit history.</p></div></div><div className="flex gap-2"><button onClick={()=>void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4"/>Refresh</button><button onClick={exportCsv} disabled={!filtered.length} className="rounded-lg border border-border px-3 py-2 text-sm">Export CSV</button></div></header>
  <div className="mb-5 grid grid-cols-2 gap-3"><div className="rounded-xl border border-border bg-card/50 p-4"><p className="text-xs text-muted-foreground">Total link records</p><p className="text-2xl font-bold">{rows.length}</p></div><div className="rounded-xl border border-border bg-card/50 p-4"><p className="text-xs text-muted-foreground">Active connections</p><p className="text-2xl font-bold text-green-400">{active}</p></div></div>
  <label className="mb-4 flex items-center gap-2 rounded-xl border border-border bg-card/50 px-3"><Search className="h-4 w-4 text-muted-foreground"/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search Telegram ID or website user ID" className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none"/></label>
  {error&&<p role="alert" className="mb-4 rounded-xl border border-red-500/30 p-3 text-sm text-red-300">{error}</p>}
  <div className="overflow-x-auto rounded-2xl border border-border"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-muted/40 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Telegram ID</th><th className="p-3">Website user ID</th><th className="p-3">Linked</th><th className="p-3">Unlink eligible</th><th className="p-3">State</th></tr></thead><tbody>{loading?<tr><td colSpan={5} className="p-5 text-muted-foreground">Loading…</td></tr>:filtered.length===0?<tr><td colSpan={5} className="p-5 text-muted-foreground">No matching links.</td></tr>:filtered.map(r=><tr key={r.id} className="border-t border-border"><td className="p-3 font-mono">{r.telegram_id}</td><td className="p-3 font-mono text-xs">{r.user_id}</td><td className="p-3">{new Date(r.linked_at).toLocaleString()}</td><td className="p-3">{new Date(r.unlink_eligible_at).toLocaleString()}</td><td className="p-3">{r.unlinked_at?<span className="text-muted-foreground">Unlinked</span>:<span className="text-green-400">Active</span>}</td></tr>)}</tbody></table></div>
  <section className="mt-6 rounded-2xl border border-border bg-card/50 p-4"><button onClick={()=>setShowHistory(v=>!v)} className="flex w-full items-center justify-between text-left font-semibold"><span className="flex items-center gap-2"><History className="h-4 w-4"/>Recent audit events ({events.length})</span><span className="text-xs text-muted-foreground">{showHistory?"Hide":"Show"}</span></button>{showHistory&&<div className="mt-4 space-y-2">{events.map(e=><article key={e.id} className="rounded-xl border border-border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{e.event_type.replace("_"," ")}</strong><time className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</time></div><p className="mt-1 text-xs text-muted-foreground">Telegram {e.telegram_id} · Website user {e.user_id}</p></article>)}</div>}</section>
  <p className="mt-4 text-xs text-muted-foreground">This page is read-only. Unlink actions remain subject to the enforced 15-day eligibility rule and the authenticated unlink flow.</p>
 </PageShell>
}
