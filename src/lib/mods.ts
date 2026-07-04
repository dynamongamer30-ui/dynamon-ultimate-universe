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
    tagline: "The flagship build. x10 inferno damage, a fire-typed mega menu, and a reborn passive that revives you mid-battle.",
    version: "1.9.43",
    size: "124 MB",
    updated: "2026-06-26",
    image: fire,
    element: "fire",
    features: ["Inferno damage x10", "Reborn passive", "Unlimited souls", "Fire-typed mega menu"],
    description: "Our most-downloaded build, and for good reason. Fire Phoenix layers a x10 inferno damage multiplier over the latest base game, then adds a reborn passive that pulls you back from defeat once per battle. The floating mega-menu lets you dial damage, defense, and capture rate independently, per match — so you can go full inferno for boss runs or dial it back for a fair-feeling grind. Clean injection, no ads, no watermarks.",
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
    tagline: "The competitive trainer's build. Slashed cooldowns, a predictive lightning AI, and a PvP HUD that reads incoming hits.",
    version: "1.9.43",
    size: "119 MB",
    updated: "2026-06-22",
    image: thunder,
    element: "thunder",
    features: ["Reduced cooldowns", "Lightning auto-AI", "PvP visual cues", "Unlocked skins"],
    description: "Thunder Arena Pro is built for one thing: making you a better fighter. The AI opponent predicts dodge windows and punishes lazy patterns, cooldowns are cut so you can chain skills the way top players do, and the custom PvP HUD overlays crisp visual cues for every incoming hit. Use it as a combo lab, a reaction trainer, or just the most electric way to play offline. All arena skins come unlocked.",
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
    tagline: "Never stop for a recharge again. Infinite energy, stacking wave-combo multipliers, and every map open from minute one.",
    version: "1.9.42",
    size: "121 MB",
    updated: "2026-06-20",
    image: water,
    element: "water",
    features: ["Infinite energy", "Wave-combo multiplier", "Tide mega-menu", "All maps unlocked"],
    description: "Tide Sovereign removes the single biggest friction in Dynamons World: waiting on energy. With infinite energy you play at your pace, not a timer's. The wave-combo system stacks a damage multiplier every time you chain water skills without taking a hit — learn the rhythm and even late-game bosses fall fast. Every map is unlocked from the start, the tide mega-menu stays out of your way, and there are zero ads or popups anywhere in the build.",
    youtubeId: "",
    changelog: [
      { version: "1.9.42", date: "2026-06-20", notes: ["Wave-combo multiplier added", "Energy regen tuned"] },
    ],
    downloads: 189704, baseLikes: 13880, baseRating: 4.8,
  },
  {
    slug: "diamond-collector",
    name: "Diamond Collector Edition",
    tagline: "The full roster on day one. Every dynamon, every legendary skin, max evolutions, and a permanent diamond shield.",
    version: "1.9.42",
    size: "131 MB",
    updated: "2026-06-19",
    image: diamond,
    element: "diamond",
    features: ["All dynamons unlocked", "Legendary skins", "Diamond shield", "Cloud-save friendly"],
    description: "Diamond Collector is the completionist's shortcut and the creator's toolkit. Every dynamon in the game is unlocked from your first launch — including legendaries, their full skin packs, and max-level evolutions — so you can build any team composition instantly. The permanent diamond shield keeps showcase battles clean, and the build is cloud-save friendly, meaning your collection follows your account. If you record content or theory-craft teams, this is your edition.",
    youtubeId: "",
    changelog: [
      { version: "1.9.42", date: "2026-06-19", notes: ["Full legendary skin pack", "Diamond shield rebalanced"] },
    ],
    downloads: 172930, baseLikes: 12110, baseRating: 4.7,
  },
  {
    slug: "gold-phoenix",
    name: "Gold Phoenix Edition",
    tagline: "Play like royalty. Infinite gold, every shop unlocked, and royal aura buffs that carry into every fight.",
    version: "1.9.42",
    size: "118 MB",
    updated: "2026-06-15",
    image: gold,
    element: "gold",
    features: ["Infinite gold", "Royal aura buffs", "Gold-typed menu", "All shops unlocked"],
    description: "Gold Phoenix erases the grind economy entirely. Infinite gold means every shop item, upgrade, and consumable is effectively free — and since every shop is unlocked from the start, nothing is gated behind progression. The royal aura system adds passive buffs that scale with how much gold you're holding (which is always: a lot). It's a clean injection on the latest base build for trainers who want the full game without the wallet pressure.",
    youtubeId: "",
    changelog: [
      { version: "1.9.42", date: "2026-06-15", notes: ["Royal aura buff added", "Shop unlock pass refreshed"] },
    ],
    downloads: 158420, baseLikes: 11240, baseRating: 4.7,
  },
  {
    slug: "earth-titan",
    name: "Earth Titan Edition",
    tagline: "The tank build. A stone-armor passive that shrugs off damage and gravity attacks that flatten boss fights.",
    version: "1.9.41",
    size: "115 MB",
    updated: "2026-06-08",
    image: earth,
    element: "earth",
    features: ["Stone-armor passive", "Gravity damage", "All maps unlocked", "Earth-typed menu"],
    description: "Earth Titan flips the usual glass-cannon formula: instead of hitting harder, you become nearly impossible to bring down. The stone-armor passive cuts incoming damage on every hit, letting you out-sustain fights that would end other builds. Gravity attacks add crowd control that turns chaotic boss phases into slow, manageable ones. With every map unlocked and the earth-typed menu handling the fine-tuning, it's the most relaxed way to clear the hardest content in the game.",
    youtubeId: "",
    changelog: [
      { version: "1.9.41", date: "2026-06-08", notes: ["Stone-armor passive added", "Gravity damage tuned"] },
    ],
    downloads: 132590, baseLikes: 9420, baseRating: 4.6,
  },
  {
    slug: "spirit-fox",
    name: "Spirit Fox Edition",
    tagline: "The high-skill ceiling build. Phase through attacks on a timed dodge and chain multi-tail combos that reward precision.",
    version: "1.9.41",
    size: "112 MB",
    updated: "2026-06-04",
    image: spirit,
    element: "spirit",
    features: ["Phase dodge", "Multi-tail combo", "Spirit-typed unlocks", "Ad-free"],
    description: "Spirit Fox is the edition that respects your reflexes. Nothing here plays the game for you — the phase dodge only works if you time it, and multi-tail combos only chain if you earn them. Master both and you'll move through fights like something untouchable. Every spirit-typed dynamon comes unlocked so you can build around the playstyle immediately, and the whole build is completely ad-free. The lowest download count on the site, and the most loyal players.",
    youtubeId: "",
    changelog: [
      { version: "1.9.41", date: "2026-06-04", notes: ["Phase dodge window added", "Multi-tail combo unlock"] },
    ],
    downloads: 118470, baseLikes: 8910, baseRating: 4.7,
  },
  {
    slug: "dark-eclipse",
    name: "Dark Eclipse Edition",
    tagline: "The forbidden build. x8 shadow damage, a night-mode arena, and every dark-typed dynamon unlocked from the start.",
    version: "1.9.41",
    size: "117 MB",
    updated: "2026-05-30",
    image: dark,
    element: "dark",
    features: ["Shadow damage x8", "Night-mode arena", "Forbidden menu", "Unlocked dark types"],
    description: "Dark Eclipse reworks the game's whole atmosphere, not just its numbers. The night-mode arena re-lights every stage in shadow, the x8 shadow damage multiplier makes dark-typed skills the strongest in the build, and the forbidden menu exposes toggles the other editions keep hidden. Every dark-typed dynamon is unlocked from your first battle. It's the moodiest, most distinct way to experience Dynamons World — for trainers who like their game a shade darker.",
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
