import dark from "@/assets/mods/dark.jpg";
import fire from "@/assets/mods/fire.jpg";
import thunder from "@/assets/mods/thunder.jpg";
import water from "@/assets/mods/water.jpg";
import earth from "@/assets/mods/earth.jpg";
import diamond from "@/assets/mods/diamond.jpg";
import gold from "@/assets/mods/gold.jpg";
import spirit from "@/assets/mods/spirit.jpg";

export type Element =
  | "dark" | "fire" | "thunder" | "water" | "earth" | "diamond" | "gold" | "spirit";

export type Mod = {
  slug: string;
  name: string;
  tagline: string;
  version: string;
  size: string;
  updated: string;
  image: string;
  element: Element;
  features: string[];
  description: string;
  /** YouTube video ID for the gameplay trailer (empty = coming soon tile) */
  youtubeId: string;
  changelog: { version: string; date: string; notes: string[] }[];
  downloads: number;
  baseLikes: number;
  baseRating: number;
  ratingCount?: number;
};

/** Element-specific accent classes used across the UI */
export const elementTheme: Record<Element, {
  label: string;
  gradient: string;          // CSS gradient for borders / overlays
  glow: string;              // boxShadow accent
  text: string;              // tailwind text-color class
  ring: string;              // tailwind ring color class
  chip: string;              // background + text for badges
}> = {
  dark:    { label: "Dark",    gradient: "linear-gradient(135deg,#7c3aed,#1e1b4b)",     glow: "0 0 60px -10px #8b5cf6", text: "text-violet-300", ring: "ring-violet-400/40", chip: "bg-violet-500/15 text-violet-300 border-violet-400/30" },
  fire:    { label: "Fire",    gradient: "linear-gradient(135deg,#f97316,#7f1d1d)",     glow: "0 0 60px -10px #fb923c", text: "text-orange-300", ring: "ring-orange-400/40", chip: "bg-orange-500/15 text-orange-300 border-orange-400/30" },
  thunder: { label: "Thunder", gradient: "linear-gradient(135deg,#38bdf8,#1e3a8a)",     glow: "0 0 60px -10px #60a5fa", text: "text-sky-300",    ring: "ring-sky-400/40",    chip: "bg-sky-500/15 text-sky-300 border-sky-400/30" },
  water:   { label: "Water",   gradient: "linear-gradient(135deg,#22d3ee,#0e7490)",     glow: "0 0 60px -10px #22d3ee", text: "text-cyan-300",   ring: "ring-cyan-400/40",   chip: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30" },
  earth:   { label: "Earth",   gradient: "linear-gradient(135deg,#84cc16,#3f2a0a)",     glow: "0 0 60px -10px #a3e635", text: "text-lime-300",   ring: "ring-lime-400/40",   chip: "bg-lime-500/15 text-lime-300 border-lime-400/30" },
  diamond: { label: "Diamond", gradient: "linear-gradient(135deg,#e0e7ff,#64748b)",     glow: "0 0 60px -10px #c7d2fe", text: "text-indigo-200", ring: "ring-indigo-300/40", chip: "bg-indigo-500/15 text-indigo-200 border-indigo-300/30" },
  gold:    { label: "Gold",    gradient: "linear-gradient(135deg,#fde047,#92400e)",     glow: "0 0 60px -10px #facc15", text: "text-amber-300",  ring: "ring-amber-400/40",  chip: "bg-amber-500/15 text-amber-300 border-amber-400/30" },
  spirit:  { label: "Spirit",  gradient: "linear-gradient(135deg,#e9d5ff,#312e81)",     glow: "0 0 60px -10px #ddd6fe", text: "text-fuchsia-200",ring: "ring-fuchsia-300/40",chip: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-300/30" },
};

export const mods: Mod[] = [
  {
    slug: "fire-phoenix",
    name: "Fire Phoenix Edition",
    tagline: "Inferno-tier damage, fire-typed mega menu and reborn-on-defeat passive.",
    version: "1.9.43",
    size: "124 MB",
    updated: "2026-06-26",
    image: fire,
    element: "fire",
    features: ["Inferno damage x10", "Reborn passive", "Unlimited souls", "Fire-typed mega menu"],
    description: "Built for trainers who like to set the arena ablaze. A polished injection on the latest base build with a floating mega-menu so you can dial damage, defense and capture rate per match.",
    youtubeId: "",
    changelog: [
      { version: "1.9.43", date: "2026-06-26", notes: ["Mega-menu redesigned with elemental tabs", "Fixed crash on Volcano stage", "Reborn passive cooldown tuned"] },
      { version: "1.9.41", date: "2026-06-12", notes: ["Initial Fire Phoenix build", "Inferno damage multiplier"] },
    ],
    downloads: 312840, baseLikes: 22480, baseRating: 4.9,
  },
  {
    slug: "thunder-arena",
    name: "Thunder Arena Pro",
    tagline: "PvP-tuned build with electrified cooldowns and lightning auto-AI.",
    version: "1.9.43",
    size: "119 MB",
    updated: "2026-06-22",
    image: thunder,
    element: "thunder",
    features: ["Reduced cooldowns", "Lightning auto-AI", "PvP visual cues", "Unlocked skins"],
    description: "Thunder Arena Pro is tuned for competitive offline play. Smarter AI, lower cooldowns and crisp visual cues for incoming hits — ideal for practicing combos.",
    youtubeId: "",
    changelog: [
      { version: "1.9.43", date: "2026-06-22", notes: ["AI predicts dodge windows", "New PvP HUD overlay"] },
      { version: "1.9.40", date: "2026-05-30", notes: ["Cooldown reduction baseline"] },
    ],
    downloads: 248110, baseLikes: 17420, baseRating: 4.8,
  },
  {
    slug: "water-tide",
    name: "Tide Sovereign Edition",
    tagline: "Hydro mega-menu with infinite energy and ocean-typed power-ups.",
    version: "1.9.42",
    size: "121 MB",
    updated: "2026-06-20",
    image: water,
    element: "water",
    features: ["Infinite energy", "Wave-combo multiplier", "Tide mega-menu", "All maps unlocked"],
    description: "Surf through every stage with the Tide Sovereign Edition. Infinite energy, wave-combo multipliers and a clean menu — no ads, no popups.",
    youtubeId: "",
    changelog: [
      { version: "1.9.42", date: "2026-06-20", notes: ["Wave-combo multiplier added", "Energy regen tuned"] },
    ],
    downloads: 189704, baseLikes: 13880, baseRating: 4.8,
  },
  {
    slug: "diamond-collector",
    name: "Diamond Collector Edition",
    tagline: "All dynamons unlocked, legendary skins and a permanent diamond shield.",
    version: "1.9.42",
    size: "131 MB",
    updated: "2026-06-19",
    image: diamond,
    element: "diamond",
    features: ["All dynamons unlocked", "Legendary skins", "Diamond shield", "Cloud-save friendly"],
    description: "Diamond Collector gives you the full roster on day one — including legendary skins, max-level evolutions and a permanent diamond shield. Perfect for showcase battles and creator content.",
    youtubeId: "",
    changelog: [
      { version: "1.9.42", date: "2026-06-19", notes: ["Full legendary skin pack", "Diamond shield rebalanced"] },
    ],
    downloads: 172930, baseLikes: 12110, baseRating: 4.7,
  },
  {
    slug: "gold-phoenix",
    name: "Gold Phoenix Edition",
    tagline: "Infinite gold, royal aura buffs and golden-typed mega menu.",
    version: "1.9.42",
    size: "118 MB",
    updated: "2026-06-15",
    image: gold,
    element: "gold",
    features: ["Infinite gold", "Royal aura buffs", "Gold-typed menu", "All shops unlocked"],
    description: "The Gold Phoenix Edition is for trainers who want to play like royalty. Infinite gold, royal aura buffs and every shop unlocked. A clean injection on the latest build.",
    youtubeId: "",
    changelog: [
      { version: "1.9.42", date: "2026-06-15", notes: ["Royal aura buff added", "Shop unlock pass refreshed"] },
    ],
    downloads: 158420, baseLikes: 11240, baseRating: 4.7,
  },
  {
    slug: "earth-titan",
    name: "Earth Titan Edition",
    tagline: "Stone-armor passive, gravity damage and earth-typed mega menu.",
    version: "1.9.41",
    size: "115 MB",
    updated: "2026-06-08",
    image: earth,
    element: "earth",
    features: ["Stone-armor passive", "Gravity damage", "All maps unlocked", "Earth-typed menu"],
    description: "Tank everything with the Earth Titan Edition. Stone-armor passive reduces incoming damage and gravity attacks make boss fights a breeze.",
    youtubeId: "",
    changelog: [
      { version: "1.9.41", date: "2026-06-08", notes: ["Stone-armor passive added", "Gravity damage tuned"] },
    ],
    downloads: 132590, baseLikes: 9420, baseRating: 4.6,
  },
  {
    slug: "spirit-fox",
    name: "Spirit Fox Edition",
    tagline: "Phase-through hits, multi-tail combo and spirit-typed unlocks.",
    version: "1.9.41",
    size: "112 MB",
    updated: "2026-06-04",
    image: spirit,
    element: "spirit",
    features: ["Phase dodge", "Multi-tail combo", "Spirit-typed unlocks", "Ad-free"],
    description: "The Spirit Fox Edition is fast, ethereal and built for high-skill players. Phase through hits, chain multi-tail combos and unlock every spirit-typed dynamon.",
    youtubeId: "",
    changelog: [
      { version: "1.9.41", date: "2026-06-04", notes: ["Phase dodge window added", "Multi-tail combo unlock"] },
    ],
    downloads: 118470, baseLikes: 8910, baseRating: 4.7,
  },
  {
    slug: "dark-eclipse",
    name: "Dark Eclipse Edition",
    tagline: "Shadow damage, night-mode arena and forbidden mega menu.",
    version: "1.9.41",
    size: "117 MB",
    updated: "2026-05-30",
    image: dark,
    element: "dark",
    features: ["Shadow damage x8", "Night-mode arena", "Forbidden menu", "Unlocked dark types"],
    description: "Dark Eclipse is the forbidden build. Shadow damage, a night-mode arena and every dark-typed dynamon unlocked from the start. For trainers who like a darker game.",
    youtubeId: "",
    changelog: [
      { version: "1.9.41", date: "2026-05-30", notes: ["Shadow damage rebalanced", "Night-mode arena added"] },
    ],
    downloads: 104320, baseLikes: 8120, baseRating: 4.6,
  },
];

export const getMod = (slug: string) => mods.find((m) => m.slug === slug);
export const totalDownloads = mods.reduce((s, m) => s + m.downloads, 0);

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}
