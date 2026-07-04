import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { _ as useGamification, g as useAuth } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { V as Flame, j as Lock, s as Trophy, t as Zap } from "../_libs/lucide-react.mjs";
import { a as StreakBadge, r as PageShell, t as LevelBadge } from "./PageShell-CQ5VKW-E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/achievements-DK1QYkk7.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var tierStyle = {
	bronze: "from-amber-700 to-amber-500",
	silver: "from-slate-400 to-slate-200",
	gold: "from-amber-400 to-yellow-200",
	platinum: "from-cyan-300 to-violet-300",
	diamond: "from-sky-300 to-fuchsia-300"
};
function AchievementsPage() {
	const { user } = useAuth();
	const { achievements, xp, streak } = useGamification();
	const [list, setList] = (0, import_react.useState)([]);
	(0, import_react.useEffect)(() => {
		(async () => {
			const { data } = await supabase.from("achievements").select("*").order("xp_reward");
			setList(data ?? []);
		})();
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "edge-light rounded-2xl glass p-8 sm:p-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-amber-300",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "h-3.5 w-3.5" }), " Progression"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl",
				children: "Trainer achievements"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-2xl text-muted-foreground",
				children: "Earn XP, level up, keep your streak, unlock badges."
			})
		]
	}), !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-10 text-center text-muted-foreground",
		children: "Sign in to track your progress."
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-8 grid gap-4 md:grid-cols-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelBadge, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreakBadge, {})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3",
			children: list.map((a, i) => {
				const owned = achievements.includes(a.key);
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
					initial: {
						opacity: 0,
						y: 12
					},
					animate: {
						opacity: 1,
						y: 0
					},
					transition: { delay: i * .03 },
					className: `relative overflow-hidden rounded-3xl border p-5 ${owned ? "border-amber-400/40 bg-amber-500/5" : "border-border bg-card/40"}`,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: `absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${tierStyle[a.tier] ?? "from-primary to-primary"} opacity-${owned ? "30" : "5"} blur-2xl`,
							"aria-hidden": true
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative flex items-start justify-between",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: `grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${tierStyle[a.tier] ?? "from-primary to-primary"} ${owned ? "" : "grayscale opacity-50"}`,
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xl",
									children: a.icon ?? "🏆"
								})
							}), !owned && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "h-4 w-4 text-muted-foreground" })]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "relative mt-3 font-display text-lg font-bold",
							children: a.name
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "relative mt-1 text-sm text-muted-foreground",
							children: a.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative mt-3 flex items-center justify-between text-xs",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "inline-flex items-center gap-1 text-amber-300",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3 w-3" }),
									" +",
									a.xp_reward,
									" XP"
								]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "uppercase tracking-widest text-muted-foreground",
								children: a.tier
							})]
						})
					]
				}, a.key);
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-8 text-center text-xs text-muted-foreground",
			children: [
				achievements.length,
				" / ",
				list.length,
				" unlocked · Lv ",
				xp.level,
				" · ",
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "inline h-3 w-3 text-orange-400" }),
				" ",
				streak.current,
				"d streak"
			]
		})
	] })] });
}
//#endregion
export { AchievementsPage as component };
