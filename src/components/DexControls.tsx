import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getConfigNode, compareConfigNode } from "@/lib/dgData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DexThemes } from "@/components/DexThemes";

type Brand = { name: string; edition: string; links: { title: string; url: string; icon: string }[] };
const DEFAULT_BRAND: Brand = {
  name: "Dynamon Gamer", edition: "Royal Void", links: [
    {title:"YouTube",url:"https://youtube.com/@dynamongamer07",icon:"play"},
    {title:"WhatsApp",url:"https://whatsapp.com/channel/0029VbBdAcZ05MUmgk8cQP05",icon:"chat"},
    {title:"Instagram",url:"https://www.instagram.com/stoicist_zayen",icon:"camera"},
    {title:"Telegram",url:"https://t.me/dynamonsworld07",icon:"send"},
    {title:"Website",url:"https://dynamongamer.space/",icon:"globe"},
  ],
};
const HOSTS = new Set(["dynamongamer.space","www.dynamongamer.space","generator.dynamongamer30.workers.dev","youtube.com","www.youtube.com","youtu.be","t.me","telegram.me","whatsapp.com","www.whatsapp.com","instagram.com","www.instagram.com","mega.nz","www.mega.nz"]);
const CONTROLS: [string,string][] = [
  ["app","Block game payload loading"],["mods","Block all mod access"],
  ["god","God mode"],["oneHit","One-hit damage"],["crit","Critical hits"],["statusImmune","Status immunity"],["noCD","No cooldowns"],["alwaysCatch","Always catch"],
  ["botMatch","Bot matchmaking"],["winTrophy","Win state"],["noTrophyLoss","No trophy loss"],
  ["fullheal","Full-heal potions"],["pvpcd","Arena item cooldown"],["itemtimer","Item wait"],["turnreset","Refill items each turn"],["items5","Five items per turn"],["nicklen","Longer nicknames"],["nickval","Name validation"],["statcap","Stat cap override"],["shopfix","Shop compatibility"],["maxdef","Defense cap override"],
  ["speed","Speed"],["setCoins","Set coins"],["setDust","Set dust"],["items","Inventory edits"],["party","Party size"],["teamEditor","Team stats"],["skins","Skin editor and reset"],["autoWorld","Auto World"],["autoGrind","Arena automation"],
  ["unlock","All unlock categories"],["unlockMons","Collection entries"],["unlockSkins","Skin unlocks"],["unlockEmotes","Emote unlocks"],["unlockAvatars","Avatar unlocks"],
];

export function DexControls() {
  const [locks,setLocks] = useState<Record<string,boolean>>({});
  const [brand,setBrand] = useState<Brand>(DEFAULT_BRAND);
  const lockSnapshot = useRef<unknown>(null);
  const brandSnapshot = useRef<unknown>(null);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [failed,setFailed] = useState(false);
  useEffect(() => {
    let active=true;
    Promise.all([getConfigNode<Record<string,boolean>>("FeatureLocks"),getConfigNode<Brand>("DexBranding")])
      .then(([l,b]) => {
        if (!active) return;
        lockSnapshot.current = l; brandSnapshot.current = b;
        if (l && typeof l === "object" && !Array.isArray(l)) setLocks(Object.fromEntries(Object.entries(l).filter(([,v])=>typeof v==="boolean")));
        if (b && typeof b.name === "string" && Array.isArray(b.links)) {
          setBrand({name:b.name,edition:typeof b.edition==="string"?b.edition:"Royal Void",links:b.links.filter(x=>x && typeof x.title==="string" && typeof x.url==="string").map(x=>({...x,icon:x.icon||"globe"})).slice(0,8)});
        }
      }).catch(e => {if(active){setFailed(true);toast.error(e instanceof Error?e.message:"Could not load DEX settings");}})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  async function saveLocks() {
    setBusy(true);
    try {await compareConfigNode("FeatureLocks",locks,lockSnapshot.current);lockSnapshot.current=locks;toast.success("Locks saved. Applied when the game next loads its payload.");}
    catch(e){toast.error(e instanceof Error?e.message:"Save failed");}
    finally{setBusy(false);}
  }
  async function saveBrand() {
    if (!brand.name.trim() || brand.name.length>80) return toast.error("Brand name must contain 1–80 characters.");
    for(const link of brand.links) {
      if (!link.title.trim() || link.title.length > 60) return toast.error("Each link needs a title of 1–60 characters.");
      try {const u=new URL(link.url);if(u.protocol!=="https:"||u.username||u.password||!HOSTS.has(u.hostname.toLowerCase()))throw Error();}
      catch{return toast.error(`Unsupported HTTPS link: ${link.title}`);}
    }
    setBusy(true);
    try {await compareConfigNode("DexBranding",brand,brandSnapshot.current);brandSnapshot.current=brand;toast.success("Branding saved. Requires the updated Worker and DEX; applied at next game launch.");}
    catch(e){toast.error(e instanceof Error?e.message:"Save failed");}
    finally{setBusy(false);}
  }
  if(loading)return <p>Loading DEX settings…</p>;
  if(failed)return <p>Could not read DEX settings. Reload this page before editing.</p>;
  return <div className="space-y-6">
    <DexThemes />
    <section className="rounded-2xl border border-border bg-card/60 p-5">
      <h2 className="text-xl font-bold">Royal Void feature access ({CONTROLS.length} controls)</h2>
      <p className="my-3 text-sm text-muted-foreground">Checked means locked. Changes apply on the next game launch; there are no heartbeats or background configuration requests.</p>
      <div className="grid gap-3 sm:grid-cols-2">{CONTROLS.map(([key,label])=><label key={key} className="flex items-center gap-3"><input type="checkbox" checked={locks[key]===true} disabled={busy} onChange={e=>setLocks({...locks,[key]:e.target.checked})}/><span>{label}</span></label>)}</div>
      <p className="mt-4 text-xs text-muted-foreground">Locking a required feature also prevents dependent automation. Unlock-all respects every category lock. Backup restore respects feature locks. Locks prevent future actions; they do not remove items already granted.</p>
      <Button className="mt-4" disabled={busy} onClick={saveLocks}>Save feature locks</Button>
    </section>
    <section className="rounded-2xl border border-border bg-card/60 p-5">
      <h2 className="text-xl font-bold">DEX branding and community links</h2>
      <p className="my-3 text-sm text-muted-foreground">Requires the matching updated NativePayloadLoader and dg Worker. Logos and fonts remain APK assets. The current DEX displays up to eight community links. Numeric limits and new gameplay hooks still require a signed payload update.</p>
      <label className="block">Menu header name<Input maxLength={80} value={brand.name} disabled={busy} onChange={e=>setBrand({...brand,name:e.target.value})}/></label>
      <div className="my-4 space-y-4">{brand.links.map((link,i)=><div key={i} className="space-y-2 rounded-xl border border-border p-3">
        <Input aria-label={`Link ${i+1} title`} maxLength={60} disabled={busy} value={link.title} onChange={e=>setBrand({...brand,links:brand.links.map((v,j)=>j===i?{...v,title:e.target.value}:v)})}/>
        <Input aria-label={`Link ${i+1} URL`} disabled={busy} value={link.url} onChange={e=>setBrand({...brand,links:brand.links.map((v,j)=>j===i?{...v,url:e.target.value}:v)})}/>
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm">Icon <select className="rounded border border-border bg-card p-2" aria-label={`Link ${i+1} icon`} disabled={busy} value={link.icon} onChange={e=>setBrand({...brand,links:brand.links.map((v,j)=>j===i?{...v,icon:e.target.value}:v)})}>
            {[...new Set(["globe","play","chat","camera","send",link.icon])].map(icon=><option key={icon} value={icon}>{icon}</option>)}
          </select></label>
          <Button variant="outline" disabled={busy} onClick={()=>setBrand({...brand,links:brand.links.filter((_,j)=>j!==i)})}>Remove link</Button>
        </div>
      </div>)}</div>
      <Button className="mb-4 mr-3" variant="outline" disabled={busy || brand.links.length>=8} onClick={()=>setBrand({...brand,links:[...brand.links,{title:"",url:"",icon:"globe"}]})}>Add community link</Button>
      <Button disabled={busy} onClick={saveBrand}>Save DEX branding and links</Button>
    </section>
  </div>;
}

