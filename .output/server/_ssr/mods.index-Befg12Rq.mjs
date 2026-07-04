import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { c as formatCount, h as totalDownloads, s as elementTheme, u as mods } from "./useSiteSettings-BztHUruL.mjs";
import { J as Download, Q as Clock, b as Search, f as Star, l as TrendingUp, p as Sparkles, z as Heart } from "../_libs/lucide-react.mjs";
import { r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as ModCard } from "./ModCard-DHGFddOX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mods.index-Befg12Rq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var ALL_ELEMENTS = [
	"dark",
	"fire",
	"thunder",
	"water",
	"earth",
	"diamond",
	"gold",
	"spirit"
];
function ModsPage() {
	const [q, setQ] = (0, import_react.useState)("");
	const [sort, setSort] = (0, import_react.useState)("popular");
	const [elements, setElements] = (0, import_react.useState)(/* @__PURE__ */ new Set());
	const [minRating, setMinRating] = (0, import_react.useState)(0);
	const [version, setVersion] = (0, import_react.useState)("all");
	const versions = (0, import_react.useMemo)(() => Array.from(new Set(mods.map((m) => m.version))).sort().reverse(), []);
	const filtered = (0, import_react.useMemo)(() => {
		const term = q.trim().toLowerCase();
		let list = mods.filter((m) => {
			if (term && !(m.name + " " + m.tagline + " " + m.features.join(" ")).toLowerCase().includes(term)) return false;
			if (elements.size > 0 && !elements.has(m.element)) return false;
			if (minRating > 0 && m.baseRating < minRating) return false;
			if (version !== "all" && m.version !== version) return false;
			return true;
		});
		list = [...list].sort((a, b) => {
			if (sort === "downloads") return b.downloads - a.downloads;
			if (sort === "likes") return b.baseLikes - a.baseLikes;
			if (sort === "newest") return +new Date(b.updated) - +new Date(a.updated);
			return b.downloads * .6 + b.baseLikes * 4 - (a.downloads * .6 + a.baseLikes * 4);
		});
		return list;
	}, [
		q,
		sort,
		elements,
		minRating,
		version
	]);
	const sorts = [
		{
			id: "popular",
			label: "Most Popular",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-3.5 w-3.5" })
		},
		{
			id: "downloads",
			label: "Most Downloaded",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-3.5 w-3.5" })
		},
		{
			id: "likes",
			label: "Most Liked",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: "h-3.5 w-3.5" })
		},
		{
			id: "newest",
			label: "Newest",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Clock, { className: "h-3.5 w-3.5" })
		}
	];
	const toggleElement = (el) => {
		setElements((prev) => {
			const next = new Set(prev);
			if (next.has(el)) next.delete(el);
			else next.add(el);
			return next;
		});
	};
	const activeFilters = elements.size + (minRating > 0 ? 1 : 0) + (version !== "all" ? 1 : 0);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "pt-4 sm:pt-8",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "inline-block h-px w-8 bg-primary",
					"aria-hidden": true
				}), "The vault"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-6xl",
				children: "All Dynamon mods"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 max-w-2xl leading-relaxed text-muted-foreground text-pretty",
				children: [
					"Every build below is fan-made and exclusively for Dynamons World. ",
					formatCount(totalDownloads),
					"+ downloads across all builds."
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mt-8 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: "Search mods, features…",
						className: "w-full rounded-lg border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none transition-colors focus:border-primary"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2",
					children: sorts.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setSort(s.id),
						className: `press inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${sort === s.id ? "border-primary/60 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:text-foreground"}`,
						children: [
							s.icon,
							" ",
							s.label
						]
					}, s.id))
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "edge-light mt-5 space-y-3 rounded-xl border border-border bg-card p-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }), " Element"]
					}), ALL_ELEMENTS.map((el) => {
						const active = elements.has(el);
						const t = elementTheme[el];
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => toggleElement(el),
							className: `rounded-md border px-3 py-1 text-[11px] font-bold uppercase tracking-widest transition-colors ${active ? t.chip : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`,
							children: t.label
						}, el);
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap items-center gap-3",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3 w-3" }), " Min rating"]
						}),
						[
							0,
							4,
							4.5,
							4.7,
							4.9
						].map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => setMinRating(r),
							className: `rounded-md border px-3 py-1 text-[11px] font-semibold transition-colors ${minRating === r ? "border-amber-400/50 bg-amber-500/10 text-amber-300" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`,
							children: r === 0 ? "Any" : `${r}+`
						}, r)),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-2 inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground",
							children: "Version"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
							value: version,
							onChange: (e) => setVersion(e.target.value),
							className: "rounded-md border border-border bg-secondary px-3 py-1 text-[11px] font-semibold outline-none focus:border-primary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
								value: "all",
								children: "All"
							}), versions.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("option", {
								value: v,
								children: ["v", v]
							}, v))]
						}),
						activeFilters > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => {
								setElements(/* @__PURE__ */ new Set());
								setMinRating(0);
								setVersion("all");
							},
							className: "ml-auto rounded-md px-3 py-1 text-[11px] font-semibold text-rose-300 hover:text-rose-200",
							children: [
								"Clear ",
								activeFilters,
								" filter",
								activeFilters > 1 ? "s" : ""
							]
						})
					]
				})]
			})
		]
	}), filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-12 rounded-3xl border border-dashed border-border bg-card/30 p-12 text-center text-muted-foreground",
		children: "No mods match your filters."
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3",
		children: filtered.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModCard, {
			mod: m,
			index: i,
			featured: i === 0 && sort !== "newest"
		}, m.slug))
	})] });
}
//#endregion
export { ModsPage as component };
