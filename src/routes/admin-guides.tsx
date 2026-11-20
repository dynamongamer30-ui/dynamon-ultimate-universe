import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, BookOpen, Loader2, RefreshCw, Save } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { OwnerGate } from "@/components/OwnerGate";
import { supabase } from "@/integrations/supabase/client";
import { saveOwnerSetting } from "@/lib/ownerSettings";
import { HELP_TOPICS } from "@/lib/helpTopics";
import { toast } from "sonner";

const fallback={schema:1,categories:[
{id:"download",title:"Download & Installation",guideIds:["start","downloads"]},
{id:"activation",title:"Get Key / Activation",guideIds:["keys","phoenix","history"]},
{id:"usage",title:"Settings & Usage",guideIds:["accounts","discovery","compare","preferences","notifications"]},
{id:"troubleshooting",title:"Errors & Troubleshooting",guideIds:["campaigns","troubleshooting"]},
],guides:HELP_TOPICS};
type Catalog=typeof fallback;
export const Route=createFileRoute("/admin-guides")({ssr:false,head:()=>({meta:[{title:"Guide Manager — Admin"},{name:"robots",content:"noindex, nofollow"}]}),component:RouteView});
function RouteView(){const [mounted,setMounted]=useState(false);useEffect(()=>setMounted(true),[]);if(!mounted)return null;return <OwnerGate><GuideManager/></OwnerGate>}
function validate(raw:string):Catalog{const value=JSON.parse(raw) as any;if(value?.schema!==1||!Array.isArray(value.categories)||!Array.isArray(value.guides))throw new Error("Expected schema 1 with categories and guides arrays.");const ids=new Set<string>();for(const g of value.guides){if(!g||typeof g.id!=="string"||!/^[a-z0-9_-]{1,64}$/i.test(g.id)||ids.has(g.id)||typeof g.title!=="string"||!g.title.trim()||!Array.isArray(g.steps)||!g.steps.length||!g.steps.every((s:unknown)=>typeof s==="string"&&s.length<=2000)||typeof g.link!=="string"||!/^\/[a-z0-9/_-]*$/i.test(g.link))throw new Error("A guide has invalid fields. IDs must be unique; links must be internal paths.");ids.add(g.id)}for(const c of value.categories){if(!c||typeof c.id!=="string"||typeof c.title!=="string"||!Array.isArray(c.guideIds)||!c.guideIds.every((id:unknown)=>typeof id==="string"&&ids.has(id)))throw new Error("A category has invalid fields or references a missing guide.")}return value as Catalog}
function GuideManager(){
 const [raw,setRaw]=useState(JSON.stringify(fallback,null,2)),[expected,setExpected]=useState<unknown>(undefined),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const load=async()=>{setLoading(true);setError("");const {data,error}=await supabase.from("site_settings").select("value").eq("key","bot_guides").maybeSingle();if(error){setError("Could not read saved guide catalog. Check owner permissions.");setLoading(false);return}const value=data?.value??fallback;setExpected(data?.value);setRaw(JSON.stringify(value,null,2));setLoading(false)};
 useEffect(()=>{void load()},[]);
 const save=async()=>{let value:Catalog;try{value=validate(raw)}catch(e){toast.error(e instanceof Error?e.message:"Invalid guide catalog");return}setSaving(true);try{await saveOwnerSetting("site_settings","bot_guides",value,expected,AbortSignal.timeout(10000));setExpected(value);setRaw(JSON.stringify(value,null,2));toast.success("Guide catalog published. Bot cache refreshes within about one minute.")}catch(e){toast.error(e instanceof Error?e.message:"Could not save guide catalog")}finally{setSaving(false)}};
 return <PageShell><Link to="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4"/>Back to dashboard</Link>
 <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500/15 text-blue-300"><BookOpen className="h-5 w-5"/></span><div><h1 className="font-display text-2xl font-extrabold">Guide Manager</h1><p className="text-sm text-muted-foreground">Edit the official guide catalog consumed by the Telegram bot.</p></div></div><button onClick={()=>void load()} disabled={loading||saving} className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><RefreshCw className="h-4 w-4"/>Reload</button></header>
 {error&&<p role="alert" className="mb-3 rounded-xl border border-red-500/30 p-3 text-sm text-red-300">{error}</p>}
 <div className="rounded-2xl border border-border bg-card/50 p-4"><div className="mb-3 flex items-center justify-between gap-2"><label htmlFor="guide-json" className="text-sm font-semibold">Guide catalog JSON</label><span className="text-xs text-muted-foreground">Schema 1</span></div><textarea id="guide-json" spellCheck={false} value={raw} onChange={e=>setRaw(e.target.value)} disabled={loading||saving} rows={28} className="w-full rounded-xl border border-border bg-background p-3 font-mono text-xs leading-5 outline-none focus:border-blue-400"/><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="max-w-xl text-xs text-muted-foreground">Each guide needs a unique ID, title, one or more steps and an internal website path. Category guideIds must refer to existing guides. Changes publish to the public bot guide API.</p><button onClick={()=>void save()} disabled={loading||saving} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50">{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Publish catalog</button></div></div>
 </PageShell>
}
