import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/useSiteSettings-BztHUruL.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Ctx = (0, import_react.createContext)({
	user: null,
	session: null,
	loading: true,
	signOut: async () => {}
});
function AuthProvider({ children }) {
	const [session, setSession] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
			setSession(s);
			setLoading(false);
		});
		(async () => {
			const { data } = await supabase.auth.getSession();
			if (data.session) {
				const { error } = await supabase.auth.getUser();
				if (error) {
					await supabase.auth.signOut();
					setSession(null);
					setLoading(false);
					return;
				}
			}
			setSession(data.session);
			setLoading(false);
		})();
		return () => sub.subscription.unsubscribe();
	}, []);
	const signOut = async () => {
		await supabase.auth.signOut();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ctx.Provider, {
		value: {
			user: session?.user ?? null,
			session,
			loading,
			signOut
		},
		children
	});
}
var useAuth = () => (0, import_react.useContext)(Ctx);
/**
* Unified premium feedback engine: Web Audio sound + haptic vibration.
* Zero external assets. Every interaction gets a precise, layered response.
*/
var ctx = null;
function getCtx() {
	if (typeof window === "undefined") return null;
	if (!ctx) try {
		ctx = new (window.AudioContext || window.webkitAudioContext)();
	} catch {
		return null;
	}
	if (ctx.state === "suspended") ctx.resume().catch(() => {});
	return ctx;
}
/** Haptic pulse — silently no-ops on unsupported devices (desktop, iOS Safari). */
function haptic(pattern = 8) {
	if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
	try {
		navigator.vibrate(pattern);
	} catch {}
}
function tone({ freq, duration = .08, type = "sine", gain = .05, glideTo, delay = 0 }) {
	const c = getCtx();
	if (!c) return;
	try {
		const t0 = c.currentTime + delay;
		const o = c.createOscillator();
		const g = c.createGain();
		o.type = type;
		o.frequency.setValueAtTime(freq, t0);
		if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
		g.gain.setValueAtTime(gain, t0);
		g.gain.exponentialRampToValueAtTime(1e-4, t0 + duration);
		o.connect(g).connect(c.destination);
		o.start(t0);
		o.stop(t0 + duration + .02);
	} catch {}
}
/** Primary press: crisp mechanical tick + short haptic */
var playClick = () => {
	tone({
		freq: 1800,
		duration: .03,
		type: "square",
		gain: .012
	});
	tone({
		freq: 640,
		duration: .06,
		type: "triangle",
		gain: .04
	});
	haptic(8);
};
/** Success: rising two-note chime + double haptic */
var playSuccess = () => {
	tone({
		freq: 660,
		duration: .09,
		gain: .05
	});
	tone({
		freq: 990,
		duration: .12,
		gain: .05,
		delay: .07
	});
	tone({
		freq: 1320,
		duration: .14,
		gain: .03,
		delay: .14
	});
	haptic([
		10,
		40,
		14
	]);
};
/** Soft: gentle low blip for secondary actions (like, hover-confirm) */
var playSoft = () => {
	tone({
		freq: 520,
		duration: .05,
		gain: .025
	});
	haptic(5);
};
/** Hover: near-subliminal high tick, no haptic (fires often) */
var playHover = () => {
	tone({
		freq: 2400,
		duration: .018,
		type: "sine",
		gain: .006
	});
};
var XP_LEVELS = (xp) => Math.max(1, Math.floor(Math.sqrt(xp / 50)) + 1);
var xpForLevel = (lvl) => 50 * (lvl - 1) ** 2;
var xpToNext = (xp) => {
	const l = XP_LEVELS(xp);
	const next = xpForLevel(l + 1);
	const base = xpForLevel(l);
	return {
		level: l,
		base,
		next,
		progress: Math.min(1, (xp - base) / Math.max(1, next - base))
	};
};
var GamificationCtx = (0, import_react.createContext)(null);
function GamificationProvider({ children }) {
	const { user } = useAuth();
	const [xp, setXP] = (0, import_react.useState)({
		xp: 0,
		level: 1
	});
	const [streak, setStreak] = (0, import_react.useState)({
		current: 0,
		longest: 0
	});
	const [achievements, setAchievements] = (0, import_react.useState)([]);
	const refresh = (0, import_react.useCallback)(async () => {
		if (!user) {
			setXP({
				xp: 0,
				level: 1
			});
			setStreak({
				current: 0,
				longest: 0
			});
			setAchievements([]);
			return;
		}
		const [{ data: x }, { data: s }, { data: a }] = await Promise.all([
			supabase.from("user_xp").select("xp, level").eq("user_id", user.id).maybeSingle(),
			supabase.from("user_streaks").select("current_streak, longest_streak").eq("user_id", user.id).maybeSingle(),
			supabase.from("user_achievements").select("achievement_key").eq("user_id", user.id)
		]);
		if (x) setXP({
			xp: x.xp,
			level: x.level
		});
		if (s) setStreak({
			current: s.current_streak,
			longest: s.longest_streak
		});
		if (a) setAchievements(a.map((r) => r.achievement_key));
	}, [user]);
	(0, import_react.useEffect)(() => {
		refresh();
	}, [refresh]);
	const grant = (0, import_react.useCallback)(async (key) => {
		if (!user) return;
		const { data } = await supabase.rpc("grant_achievement", { _key: key });
		if (data === true) {
			const { data: meta } = await supabase.from("achievements").select("name, xp_reward, tier").eq("key", key).maybeSingle();
			if (meta) {
				toast.success(`🏆 Achievement unlocked — ${meta.name}`, { description: `+${meta.xp_reward} XP · ${meta.tier}` });
				setAchievements((prev) => prev.includes(key) ? prev : [...prev, key]);
			}
			refresh();
		}
	}, [user, refresh]);
	const award = (0, import_react.useCallback)(async (amount, label) => {
		if (!user) return;
		const { data } = await supabase.rpc("award_xp", { _amount: amount });
		const row = data?.[0];
		if (row) {
			setXP({
				xp: row.xp,
				level: row.level
			});
			if (row.leveled_up) {
				toast.success(`⚡ Level up — you're now Level ${row.level}!`);
				if (row.level === 5) grant("level_5");
				if (row.level === 10) grant("level_10");
			} else if (label) toast(`+${amount} XP · ${label}`, { duration: 1500 });
		}
	}, [user, grant]);
	const checkIn = (0, import_react.useCallback)(async () => {
		if (!user) return;
		const { data } = await supabase.rpc("touch_streak");
		const row = data?.[0];
		if (row) {
			setStreak({
				current: row.current_streak,
				longest: row.longest_streak
			});
			if (row.incremented) {
				if (row.current_streak >= 30) grant("streak_30");
				else if (row.current_streak >= 7) grant("streak_7");
				else if (row.current_streak >= 3) grant("streak_3");
				if (row.current_streak === 1) grant("first_login");
			}
		}
	}, [user, grant]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GamificationCtx.Provider, {
		value: {
			xp,
			streak,
			achievements,
			refresh,
			award,
			grant,
			checkIn
		},
		children
	});
}
var NOOP = {
	xp: {
		xp: 0,
		level: 1
	},
	streak: {
		current: 0,
		longest: 0
	},
	achievements: [],
	refresh: async () => {},
	award: async () => {},
	grant: async () => {},
	checkIn: async () => {}
};
function useGamification() {
	return (0, import_react.useContext)(GamificationCtx) ?? NOOP;
}
var dark_default = "/assets/dark-DTEWBl3B.jpg";
var fire_default = "/assets/fire-C_NFMf4Z.jpg";
var thunder_default = "/assets/thunder-CHEgJy3j.jpg";
var water_default = "/assets/water-r_Youjiu.jpg";
var earth_default = "/assets/earth-lHNZv-th.jpg";
var diamond_default = "/assets/diamond-B68BqYGw.jpg";
var gold_default = "/assets/gold-BOvydcxD.jpg";
var spirit_default = "/assets/spirit-BhFyjKK7.jpg";
/** Element-specific accent classes used across the UI */
var elementTheme = {
	dark: {
		label: "Dark",
		gradient: "linear-gradient(135deg,#7c3aed,#1e1b4b)",
		glow: "0 0 60px -10px #8b5cf6",
		text: "text-violet-300",
		ring: "ring-violet-400/40",
		chip: "bg-violet-500/15 text-violet-300 border-violet-400/30"
	},
	fire: {
		label: "Fire",
		gradient: "linear-gradient(135deg,#f97316,#7f1d1d)",
		glow: "0 0 60px -10px #fb923c",
		text: "text-orange-300",
		ring: "ring-orange-400/40",
		chip: "bg-orange-500/15 text-orange-300 border-orange-400/30"
	},
	thunder: {
		label: "Thunder",
		gradient: "linear-gradient(135deg,#38bdf8,#1e3a8a)",
		glow: "0 0 60px -10px #60a5fa",
		text: "text-sky-300",
		ring: "ring-sky-400/40",
		chip: "bg-sky-500/15 text-sky-300 border-sky-400/30"
	},
	water: {
		label: "Water",
		gradient: "linear-gradient(135deg,#22d3ee,#0e7490)",
		glow: "0 0 60px -10px #22d3ee",
		text: "text-cyan-300",
		ring: "ring-cyan-400/40",
		chip: "bg-cyan-500/15 text-cyan-300 border-cyan-400/30"
	},
	earth: {
		label: "Earth",
		gradient: "linear-gradient(135deg,#84cc16,#3f2a0a)",
		glow: "0 0 60px -10px #a3e635",
		text: "text-lime-300",
		ring: "ring-lime-400/40",
		chip: "bg-lime-500/15 text-lime-300 border-lime-400/30"
	},
	diamond: {
		label: "Diamond",
		gradient: "linear-gradient(135deg,#e0e7ff,#64748b)",
		glow: "0 0 60px -10px #c7d2fe",
		text: "text-indigo-200",
		ring: "ring-indigo-300/40",
		chip: "bg-indigo-500/15 text-indigo-200 border-indigo-300/30"
	},
	gold: {
		label: "Gold",
		gradient: "linear-gradient(135deg,#fde047,#92400e)",
		glow: "0 0 60px -10px #facc15",
		text: "text-amber-300",
		ring: "ring-amber-400/40",
		chip: "bg-amber-500/15 text-amber-300 border-amber-400/30"
	},
	spirit: {
		label: "Spirit",
		gradient: "linear-gradient(135deg,#e9d5ff,#312e81)",
		glow: "0 0 60px -10px #ddd6fe",
		text: "text-fuchsia-200",
		ring: "ring-fuchsia-300/40",
		chip: "bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-300/30"
	}
};
var mods = [
	{
		slug: "fire-phoenix",
		name: "Fire Phoenix Edition",
		tagline: "The flagship build. x10 inferno damage, a fire-typed mega menu, and a reborn passive that revives you mid-battle.",
		version: "1.9.43",
		size: "124 MB",
		updated: "2026-06-26",
		image: fire_default,
		element: "fire",
		features: [
			"Inferno damage x10",
			"Reborn passive",
			"Unlimited souls",
			"Fire-typed mega menu"
		],
		description: "Our most-downloaded build, and for good reason. Fire Phoenix layers a x10 inferno damage multiplier over the latest base game, then adds a reborn passive that pulls you back from defeat once per battle. The floating mega-menu lets you dial damage, defense, and capture rate independently, per match — so you can go full inferno for boss runs or dial it back for a fair-feeling grind. Clean injection, no ads, no watermarks.",
		youtubeId: "",
		changelog: [{
			version: "1.9.43",
			date: "2026-06-26",
			notes: [
				"Mega-menu redesigned with elemental tabs",
				"Fixed crash on Volcano stage",
				"Reborn passive cooldown tuned"
			]
		}, {
			version: "1.9.41",
			date: "2026-06-12",
			notes: ["Initial Fire Phoenix build", "Inferno damage multiplier"]
		}],
		downloads: 312840,
		baseLikes: 22480,
		baseRating: 4.9
	},
	{
		slug: "thunder-arena",
		name: "Thunder Arena Pro",
		tagline: "The competitive trainer's build. Slashed cooldowns, a predictive lightning AI, and a PvP HUD that reads incoming hits.",
		version: "1.9.43",
		size: "119 MB",
		updated: "2026-06-22",
		image: thunder_default,
		element: "thunder",
		features: [
			"Reduced cooldowns",
			"Lightning auto-AI",
			"PvP visual cues",
			"Unlocked skins"
		],
		description: "Thunder Arena Pro is built for one thing: making you a better fighter. The AI opponent predicts dodge windows and punishes lazy patterns, cooldowns are cut so you can chain skills the way top players do, and the custom PvP HUD overlays crisp visual cues for every incoming hit. Use it as a combo lab, a reaction trainer, or just the most electric way to play offline. All arena skins come unlocked.",
		youtubeId: "",
		changelog: [{
			version: "1.9.43",
			date: "2026-06-22",
			notes: ["AI predicts dodge windows", "New PvP HUD overlay"]
		}, {
			version: "1.9.40",
			date: "2026-05-30",
			notes: ["Cooldown reduction baseline"]
		}],
		downloads: 248110,
		baseLikes: 17420,
		baseRating: 4.8
	},
	{
		slug: "water-tide",
		name: "Tide Sovereign Edition",
		tagline: "Never stop for a recharge again. Infinite energy, stacking wave-combo multipliers, and every map open from minute one.",
		version: "1.9.42",
		size: "121 MB",
		updated: "2026-06-20",
		image: water_default,
		element: "water",
		features: [
			"Infinite energy",
			"Wave-combo multiplier",
			"Tide mega-menu",
			"All maps unlocked"
		],
		description: "Tide Sovereign removes the single biggest friction in Dynamons World: waiting on energy. With infinite energy you play at your pace, not a timer's. The wave-combo system stacks a damage multiplier every time you chain water skills without taking a hit — learn the rhythm and even late-game bosses fall fast. Every map is unlocked from the start, the tide mega-menu stays out of your way, and there are zero ads or popups anywhere in the build.",
		youtubeId: "",
		changelog: [{
			version: "1.9.42",
			date: "2026-06-20",
			notes: ["Wave-combo multiplier added", "Energy regen tuned"]
		}],
		downloads: 189704,
		baseLikes: 13880,
		baseRating: 4.8
	},
	{
		slug: "diamond-collector",
		name: "Diamond Collector Edition",
		tagline: "The full roster on day one. Every dynamon, every legendary skin, max evolutions, and a permanent diamond shield.",
		version: "1.9.42",
		size: "131 MB",
		updated: "2026-06-19",
		image: diamond_default,
		element: "diamond",
		features: [
			"All dynamons unlocked",
			"Legendary skins",
			"Diamond shield",
			"Cloud-save friendly"
		],
		description: "Diamond Collector is the completionist's shortcut and the creator's toolkit. Every dynamon in the game is unlocked from your first launch — including legendaries, their full skin packs, and max-level evolutions — so you can build any team composition instantly. The permanent diamond shield keeps showcase battles clean, and the build is cloud-save friendly, meaning your collection follows your account. If you record content or theory-craft teams, this is your edition.",
		youtubeId: "",
		changelog: [{
			version: "1.9.42",
			date: "2026-06-19",
			notes: ["Full legendary skin pack", "Diamond shield rebalanced"]
		}],
		downloads: 172930,
		baseLikes: 12110,
		baseRating: 4.7
	},
	{
		slug: "gold-phoenix",
		name: "Gold Phoenix Edition",
		tagline: "Play like royalty. Infinite gold, every shop unlocked, and royal aura buffs that carry into every fight.",
		version: "1.9.42",
		size: "118 MB",
		updated: "2026-06-15",
		image: gold_default,
		element: "gold",
		features: [
			"Infinite gold",
			"Royal aura buffs",
			"Gold-typed menu",
			"All shops unlocked"
		],
		description: "Gold Phoenix erases the grind economy entirely. Infinite gold means every shop item, upgrade, and consumable is effectively free — and since every shop is unlocked from the start, nothing is gated behind progression. The royal aura system adds passive buffs that scale with how much gold you're holding (which is always: a lot). It's a clean injection on the latest base build for trainers who want the full game without the wallet pressure.",
		youtubeId: "",
		changelog: [{
			version: "1.9.42",
			date: "2026-06-15",
			notes: ["Royal aura buff added", "Shop unlock pass refreshed"]
		}],
		downloads: 158420,
		baseLikes: 11240,
		baseRating: 4.7
	},
	{
		slug: "earth-titan",
		name: "Earth Titan Edition",
		tagline: "The tank build. A stone-armor passive that shrugs off damage and gravity attacks that flatten boss fights.",
		version: "1.9.41",
		size: "115 MB",
		updated: "2026-06-08",
		image: earth_default,
		element: "earth",
		features: [
			"Stone-armor passive",
			"Gravity damage",
			"All maps unlocked",
			"Earth-typed menu"
		],
		description: "Earth Titan flips the usual glass-cannon formula: instead of hitting harder, you become nearly impossible to bring down. The stone-armor passive cuts incoming damage on every hit, letting you out-sustain fights that would end other builds. Gravity attacks add crowd control that turns chaotic boss phases into slow, manageable ones. With every map unlocked and the earth-typed menu handling the fine-tuning, it's the most relaxed way to clear the hardest content in the game.",
		youtubeId: "",
		changelog: [{
			version: "1.9.41",
			date: "2026-06-08",
			notes: ["Stone-armor passive added", "Gravity damage tuned"]
		}],
		downloads: 132590,
		baseLikes: 9420,
		baseRating: 4.6
	},
	{
		slug: "spirit-fox",
		name: "Spirit Fox Edition",
		tagline: "The high-skill ceiling build. Phase through attacks on a timed dodge and chain multi-tail combos that reward precision.",
		version: "1.9.41",
		size: "112 MB",
		updated: "2026-06-04",
		image: spirit_default,
		element: "spirit",
		features: [
			"Phase dodge",
			"Multi-tail combo",
			"Spirit-typed unlocks",
			"Ad-free"
		],
		description: "Spirit Fox is the edition that respects your reflexes. Nothing here plays the game for you — the phase dodge only works if you time it, and multi-tail combos only chain if you earn them. Master both and you'll move through fights like something untouchable. Every spirit-typed dynamon comes unlocked so you can build around the playstyle immediately, and the whole build is completely ad-free. The lowest download count on the site, and the most loyal players.",
		youtubeId: "",
		changelog: [{
			version: "1.9.41",
			date: "2026-06-04",
			notes: ["Phase dodge window added", "Multi-tail combo unlock"]
		}],
		downloads: 118470,
		baseLikes: 8910,
		baseRating: 4.7
	},
	{
		slug: "dark-eclipse",
		name: "Dark Eclipse Edition",
		tagline: "The forbidden build. x8 shadow damage, a night-mode arena, and every dark-typed dynamon unlocked from the start.",
		version: "1.9.41",
		size: "117 MB",
		updated: "2026-05-30",
		image: dark_default,
		element: "dark",
		features: [
			"Shadow damage x8",
			"Night-mode arena",
			"Forbidden menu",
			"Unlocked dark types"
		],
		description: "Dark Eclipse reworks the game's whole atmosphere, not just its numbers. The night-mode arena re-lights every stage in shadow, the x8 shadow damage multiplier makes dark-typed skills the strongest in the build, and the forbidden menu exposes toggles the other editions keep hidden. Every dark-typed dynamon is unlocked from your first battle. It's the moodiest, most distinct way to experience Dynamons World — for trainers who like their game a shade darker.",
		youtubeId: "",
		changelog: [{
			version: "1.9.41",
			date: "2026-05-30",
			notes: ["Shadow damage rebalanced", "Night-mode arena added"]
		}],
		downloads: 104320,
		baseLikes: 8120,
		baseRating: 4.6
	}
];
var getMod = (slug) => mods.find((m) => m.slug === slug);
var totalDownloads = mods.reduce((s, m) => s + m.downloads, 0);
function formatCount(n) {
	if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
	if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
	return n.toString();
}
var DEFAULT_BRANDING = {
	siteName: "Dynamon Universe",
	siteTagline: "Premium Dynamons World mod APK hub",
	heroEyebrow: "Only Dynamons World mods",
	heroTitle: "The premium",
	heroHighlight: "Dynamons World",
	heroSubtitle: "Hand-picked, lovingly crafted fan-made builds. Clean injections, real community ratings, and weekly drops — no clutter, no other games. Just Dynamons.",
	primaryCta: "Browse the mods",
	secondaryCta: "What is this?",
	activeTrainers: "20K+",
	avgRating: "4.9"
};
var DEFAULT_ANNOUNCEMENT = {
	enabled: false,
	message: "",
	href: "",
	tone: "info"
};
var DEFAULT_SOCIALS = {
	whatsapp: "https://whatsapp.com/channel/0029VbBdAcZ05MUmgk8cQP05",
	youtube: "https://youtube.com/@dynamongamer07",
	instagram: "https://www.instagram.com/stoicist_zayen",
	telegram: "https://t.me/dynamonsworld07"
};
var C = (0, import_react.createContext)({
	loading: true,
	branding: DEFAULT_BRANDING,
	announcement: DEFAULT_ANNOUNCEMENT,
	socials: DEFAULT_SOCIALS,
	overrides: {},
	mods,
	allMods: mods,
	refresh: async () => {}
});
function applyOverride(mod, o) {
	if (!o) return mod;
	const downloads = o.downloads_absolute != null ? Math.max(0, o.downloads_absolute + (o.downloads_boost || 0)) : Math.max(0, mod.downloads + (o.downloads_boost || 0));
	const baseLikes = o.likes_absolute != null ? Math.max(0, o.likes_absolute + (o.likes_boost || 0)) : Math.max(0, mod.baseLikes + (o.likes_boost || 0));
	return {
		...mod,
		name: o.name || mod.name,
		tagline: o.tagline || mod.tagline,
		description: o.description || mod.description,
		version: o.version || mod.version,
		size: o.size || mod.size,
		updated: o.updated_date || mod.updated,
		youtubeId: o.youtube_id ?? mod.youtubeId,
		features: o.features && o.features.length ? o.features : mod.features,
		changelog: o.changelog && o.changelog.length ? o.changelog : mod.changelog,
		downloads,
		baseLikes,
		baseRating: o.rating ?? mod.baseRating,
		ratingCount: o.rating_count ?? mod.ratingCount
	};
}
function SiteSettingsProvider({ children }) {
	const [loading, setLoading] = (0, import_react.useState)(true);
	const [branding, setBranding] = (0, import_react.useState)(DEFAULT_BRANDING);
	const [announcement, setAnnouncement] = (0, import_react.useState)(DEFAULT_ANNOUNCEMENT);
	const [socials, setSocials] = (0, import_react.useState)(DEFAULT_SOCIALS);
	const [overrides, setOverrides] = (0, import_react.useState)({});
	const [featuredSlug, setFeaturedSlug] = (0, import_react.useState)(null);
	const refresh = async () => {
		const [{ data: settings }, { data: ov }] = await Promise.all([supabase.from("site_settings").select("key, value"), supabase.from("mod_overrides").select("*")]);
		const map = /* @__PURE__ */ new Map();
		(settings ?? []).forEach((r) => map.set(r.key, r.value));
		setBranding({
			...DEFAULT_BRANDING,
			...map.get("branding")
		});
		setAnnouncement({
			...DEFAULT_ANNOUNCEMENT,
			...map.get("announcement")
		});
		setSocials({
			...DEFAULT_SOCIALS,
			...map.get("socials")
		});
		const f = map.get("featured");
		setFeaturedSlug(f?.slug ?? null);
		const overrideMap = {};
		(ov ?? []).forEach((r) => {
			overrideMap[r.slug] = r;
		});
		setOverrides(overrideMap);
		setLoading(false);
	};
	(0, import_react.useEffect)(() => {
		refresh();
	}, []);
	const { mods: mods$1, allMods } = (0, import_react.useMemo)(() => {
		const merged = mods.map((m) => applyOverride(m, overrides[m.slug]));
		const fSlug = featuredSlug;
		const ordered = fSlug ? [...merged].sort((a, b) => a.slug === fSlug ? -1 : b.slug === fSlug ? 1 : 0) : merged;
		return {
			mods: ordered.filter((m) => !overrides[m.slug]?.hidden),
			allMods: ordered
		};
	}, [overrides, featuredSlug]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(C.Provider, {
		value: {
			loading,
			branding,
			announcement,
			socials,
			overrides,
			mods: mods$1,
			allMods,
			refresh
		},
		children
	});
}
var useSiteSettings = () => (0, import_react.useContext)(C);
//#endregion
export { useGamification as _, GamificationProvider as a, formatCount as c, playClick as d, playHover as f, useAuth as g, totalDownloads as h, DEFAULT_SOCIALS as i, getMod as l, playSuccess as m, DEFAULT_ANNOUNCEMENT as n, SiteSettingsProvider as o, playSoft as p, DEFAULT_BRANDING as r, elementTheme as s, AuthProvider as t, mods as u, useSiteSettings as v, xpToNext as y };
