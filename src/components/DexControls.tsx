import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getConfigNode, setConfigNode } from "@/lib/dgData";
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
  ["speed","Speed"],["setCoins","Set coins"],["setDust","Set dust"],["items","Inventory edits"],["party","Party size"],["teamEditor","Team stats"],["autoWorld","Auto World"],["autoGrind","Arena automation"],
  ["unlock","All unlock categories"],["unlockMons","Collection entries"],["unlockSkins","Skin unlocks"],["unlockEmotes","Emote unlocks"],["unlockAvatars","Avatar unlocks"],
];

export function DexControls() {
  const [locks,setLocks] = useState<Record<string,boolean>>({});
  const [brand,setBrand] = useState<Brand>(DEFAULT_BRAND);
  const [loading,setLoading] = useState(true);
  const [busy,setBusy] = useState(false);
  const [failed,setFailed] = useState(false);
  useEffect(() => {
    let active=true;
    Promise.all([getConfigNode<Record<string,boolean>>("FeatureLocks"),getConfigNode<Brand>("DexBranding")])
      .then(([l,b]) => {
        if (!active) return;
        if (l && typeof l === "object" && !Array.isArray(l)) setLocks(Object.fromEntries(Object.entries(l).filter(([,v])=>typeof v==="boolean")));
        if (b && typeof b.name === "string" && Array.isArray(b.links)) {
          setBrand({name:b.name,edition:typeof b.edition==="string"?b.edition:"Royal Void",links:b.links.filter(x=>x && typeof x.title==="string" && typeof x.url==="string").map(x=>({...x,icon:x.icon||"globe"})).slice(0,12)});
        }
      }).catch(e => {if(active){setFailed(true);toast.error(e instanceof Error?e.message:"Could not load DEX settings");}})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  async function saveLocks() {
    setBusy(true);
    try {await setConfigNode("FeatureLocks",locks);toast.success("Locks saved. Applied when the game next loads its payload.");}
    catch(e){toast.error(e instanceof Error?e.message:"Save failed");}
    finally{setBusy(false);}
  }
  async function saveBrand() {
    if (!brand.name.trim() || brand.name.length>80) return toast.error("Brand name must contain 1–80 characters.");
    for(const link of brand.links) {
      try {const u=new URL(link.url);if(u.protocol!=="https:"||!HOSTS.has(u.hostname.toLowerCase()))throw Error();}
      catch{return toast.error(`Unsupported HTTPS link: ${link.title}`);}
    }
    setBusy(true);
    try {await setConfigNode("DexBranding",brand);toast.success("Branding saved. Requires the updated Worker and DEX; applied at next game launch.");}
    catch(e){toast.error(e instanceof Error?e.message:"Save failed");}
    finally{setBusy(false);}
  }
  if(loading)return <p>Loading DEX settings…</p>;
  if(failed)return <p>Could not read DEX settings. Reload this page before editing.</p>;
  return <div className="space-y-6">
    <DexThemes />
    <section className="rounded-2xl border border-border bg-card/60 p-5">
      <h2 className="text-xl font-bold">Royal Void feature access</h2>
      <p className="my-3 text-sm text-muted-foreground">Checked means locked. Changes apply on the next game launch; there are no heartbeats or background configuration requests.</p>
      <div className="grid gap-3 sm:grid-cols-2">{CONTROLS.map(([key,label])=><label key={key} className="flex items-center gap-3"><input type="checkbox" checked={locks[key]===true} disabled={busy} onChange={e=>setLocks({...locks,[key]:e.target.checked})}/><span>{label}</span></label>)}</div>
      <Button className="mt-4" disabled={busy} onClick={saveLocks}>Save feature locks</Button>
    </section>
    <section className="rounded-2xl border border-border bg-card/60 p-5">
      <h2 className="text-xl font-bold">DEX branding and community links</h2>
      <p className="my-3 text-sm text-muted-foreground">Requires the matching updated NativePayloadLoader and dg Worker. Logos and fonts remain APK assets. Numeric limits and new gameplay hooks still require a signed payload update.</p>
      <label className="block">Brand name<Input maxLength={80} value={brand.name} disabled={busy} onChange={e=>setBrand({...brand,name:e.target.value})}/></label>
      <div className="my-4 space-y-4">{brand.links.map((link,i)=><div key={i} className="grid gap-2 sm:grid-cols-3"><Input aria-label={`Link ${i+1} title`} maxLength={60} disabled={busy} value={link.title} onChange={e=>setBrand({...brand,links:brand.links.map((v,j)=>j===i?{...v,title:e.target.value}:v)})}/><Input aria-label={`Link ${i+1} URL`} className="sm:col-span-2" disabled={busy} value={link.url} onChange={e=>setBrand({...brand,links:brand.links.map((v,j)=>j===i?{...v,url:e.target.value}:v)})}/></div>)}</div>
      <Button disabled={busy} onClick={saveBrand}>Save DEX branding and links</Button>
    </section>
  </div>;
}
