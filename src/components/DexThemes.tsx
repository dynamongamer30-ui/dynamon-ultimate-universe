import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getConfigNode, setConfigNode } from "@/lib/dgData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const THEMES = [
  {id:"dark",label:"Dark / Royal Void",primary:"#7C3AED",deep:"#4A168F",highlight:"#CBB5FF"},
  {id:"fire",label:"Fire",primary:"#F97316",deep:"#7F1D1D",highlight:"#FFBA88"},
  {id:"thunder",label:"Thunder",primary:"#38BDF8",deep:"#1E3A8A",highlight:"#A1DBFF"},
  {id:"water",label:"Water",primary:"#22D3EE",deep:"#0E5364",highlight:"#9AEEF7"},
  {id:"earth",label:"Earth",primary:"#84CC16",deep:"#354513",highlight:"#D2EE99"},
  {id:"diamond",label:"Diamond",primary:"#E0E7FF",deep:"#35445C",highlight:"#EEF1FF"},
  {id:"gold",label:"Gold",primary:"#FDE047",deep:"#694008",highlight:"#FFE99A"},
  {id:"spirit",label:"Spirit",primary:"#E9D5FF",deep:"#312E81",highlight:"#F1DFFF"},
] as const;
type ThemeId = typeof THEMES[number]["id"];
const COLOR_KEYS = ["background","panel","card","primary","deep","highlight","text","muted","border","input","success","error"] as const;
type ColorKey = typeof COLOR_KEYS[number];
type Palette = Partial<Record<ColorKey,string>>;
type ThemeConfig = {schema:1;defaultTheme:ThemeId;enabledThemes:ThemeId[];palettes:Partial<Record<ThemeId,Palette>>};
const IDS: ThemeId[] = THEMES.map(t=>t.id);
const isId = (id: unknown): id is ThemeId => typeof id === "string" && IDS.some(value=>value===id);
const isColor = (value: unknown): value is string => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value);
const DEFAULT: ThemeConfig = {schema:1,defaultTheme:"dark",enabledThemes:[...IDS],palettes:{}};
function normalize(value: unknown): ThemeConfig {
  if(!value || typeof value!=="object" || Array.isArray(value)) return DEFAULT;
  const v=value as Record<string,unknown>;
  if(v.schema!==1)return DEFAULT;
  const enabled=Array.isArray(v.enabledThemes)?IDS.filter(id=>v.enabledThemes instanceof Array && v.enabledThemes.includes(id)):[...IDS];
  if(!enabled.length)enabled.push("dark");
  const palettes:ThemeConfig["palettes"]={};
  const raw=v.palettes;
  if(raw && typeof raw==="object" && !Array.isArray(raw)) {
    for(const id of IDS) {
      const source=(raw as Record<string,unknown>)[id];
      if(!source || typeof source!=="object" || Array.isArray(source))continue;
      const palette:Palette={};
      for(const key of COLOR_KEYS){const color=(source as Record<string,unknown>)[key];if(isColor(color))palette[key]=color.toUpperCase();}
      if(Object.keys(palette).length)palettes[id]=palette;
    }
  }
  return {schema:1,defaultTheme:isId(v.defaultTheme)&&enabled.includes(v.defaultTheme)?v.defaultTheme:enabled[0],enabledThemes:enabled,palettes};
}

export function DexThemes() {
  const [config,setConfig]=useState<ThemeConfig>(DEFAULT);
  const [selected,setSelected]=useState<ThemeId>("dark");
  const [loading,setLoading]=useState(true);
  const [failed,setFailed]=useState(false);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    let active=true;
    getConfigNode<unknown>("DexThemes").then(value=>{if(active)setConfig(normalize(value));})
      .catch(error=>{if(active){setFailed(true);toast.error(error instanceof Error?error.message:"Could not load DEX themes");}})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  function toggle(id:ThemeId,on:boolean) {
    const enabled=on?IDS.filter(value=>value===id||config.enabledThemes.includes(value)):config.enabledThemes.filter(value=>value!==id);
    if(!enabled.length){toast.error("Keep at least one theme available.");return;}
    setConfig({...config,enabledThemes:enabled,defaultTheme:enabled.includes(config.defaultTheme)?config.defaultTheme:enabled[0]});
  }
  function changeColor(key:ColorKey,value:string) {
    const palette={...config.palettes[selected]};
    if(value.trim())palette[key]=value.trim();else delete palette[key];
    setConfig({...config,palettes:{...config.palettes,[selected]:palette}});
  }
  async function save() {
    for(const id of IDS)for(const key of COLOR_KEYS){const color=config.palettes[id]?.[key];if(color!==undefined&&!isColor(color)){toast.error(`${id}: ${key} must use #RRGGBB or be empty.`);return;}}
    setBusy(true);
    try{await setConfigNode("DexThemes",normalize(config));toast.success("Themes saved. Applied at the next game launch with the updated Worker and DEX.");}
    catch(error){toast.error(error instanceof Error?error.message:"Could not save themes");}
    finally{setBusy(false);}
  }
  if(loading)return <p>Loading DEX themes…</p>;
  if(failed)return <p>Could not load DEX themes. Reload before editing.</p>;
  const theme=THEMES.find(t=>t.id===selected)!;
  return <section className="rounded-2xl border border-border bg-card/60 p-5">
    <h2 className="text-xl font-bold">Royal Void themes</h2>
    <p className="my-3 text-sm text-muted-foreground">Enable themes and choose the default for new users. Existing users keep their selected theme while it remains enabled. Changes arrive at game startup; switching themes sends no network requests.</p>
    <div className="grid gap-3 sm:grid-cols-2">{THEMES.map(t=><label key={t.id} className="flex items-center gap-3"><input type="checkbox" checked={config.enabledThemes.includes(t.id)} disabled={busy} onChange={e=>toggle(t.id,e.target.checked)}/><span className="h-3 w-3 rounded-full" style={{background:t.primary}} aria-hidden="true"/><span>{t.label}</span></label>)}</div>
    <label className="mt-5 block">Default theme
      <select className="mt-2 w-full rounded-xl border border-border bg-card p-3" value={config.defaultTheme} disabled={busy} onChange={e=>{if(isId(e.target.value))setConfig({...config,defaultTheme:e.target.value});}}>
        {THEMES.filter(t=>config.enabledThemes.includes(t.id)).map(t=><option key={t.id} value={t.id}>{t.label}</option>)}
      </select>
    </label>
    <details className="mt-5">
      <summary className="cursor-pointer font-semibold">Optional palette overrides</summary>
      <p className="my-3 text-sm text-muted-foreground">Empty fields use the built-in palette. The menu rejects palettes with unreadable text and falls back to that theme’s built-in colours.</p>
      <select aria-label="Theme to edit" className="mb-4 w-full rounded-xl border border-border bg-card p-3" value={selected} disabled={busy} onChange={e=>{if(isId(e.target.value))setSelected(e.target.value);}}>{THEMES.map(t=><option key={t.id} value={t.id}>{t.label}</option>)}</select>
      <div className="grid gap-3 sm:grid-cols-2">{COLOR_KEYS.map(key=><label key={key} className="block capitalize">{key}<Input aria-label={`${theme.label} ${key}`} maxLength={7} disabled={busy} value={config.palettes[selected]?.[key]??""} placeholder={key==="primary"?theme.primary:key==="deep"?theme.deep:key==="highlight"?theme.highlight:"Built-in colour"} onChange={e=>changeColor(key,e.target.value)}/></label>)}</div>
      <Button className="mt-4" variant="outline" disabled={busy} onClick={()=>{const palettes={...config.palettes};delete palettes[selected];setConfig({...config,palettes});}}>Reset {theme.label} palette</Button>
    </details>
    <p className="my-4 text-sm text-muted-foreground">Logos are APK assets: assets/royal_void/images/themes/dark.png, fire.png, thunder.png, water.png, earth.png, diamond.png, gold.png and spirit.png. Missing files use the existing logo.</p>
    <Button disabled={busy} onClick={save}>Save DEX themes</Button>
  </section>;
}
