import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as formatCount, d as playClick, f as playHover, g as useAuth, h as totalDownloads, s as elementTheme, u as mods } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { f as Star, h as Shield, i as Users, l as TrendingUp, nt as ChevronRight, p as Sparkles, t as Zap, ut as ArrowRight } from "../_libs/lucide-react.mjs";
import { r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as ModCard } from "./ModCard-DHGFddOX.mjs";
import { t as UnlockKeyButton } from "./UnlockKeyButton-DX-Q4cpR.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-_aApgOfb.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ForYouRail() {
	const { user } = useAuth();
	const [elements, setElements] = (0, import_react.useState)([]);
	const [loaded, setLoaded] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!user) {
			setLoaded(true);
			return;
		}
		let cancelled = false;
		(async () => {
			const [{ data: likes }, { data: favs }, { data: prefs }] = await Promise.all([
				supabase.from("mod_likes").select("mod_slug").eq("user_id", user.id),
				supabase.from("favorites").select("mod_slug").eq("user_id", user.id),
				supabase.from("user_preferences").select("favorite_elements").eq("user_id", user.id).maybeSingle()
			]);
			if (cancelled) return;
			const inferred = [...(likes ?? []).map((r) => r.mod_slug), ...(favs ?? []).map((r) => r.mod_slug)].map((s) => mods.find((m) => m.slug === s)?.element).filter((e) => !!e);
			const stated = prefs?.favorite_elements ?? [];
			const uniq = Array.from(/* @__PURE__ */ new Set([...stated, ...inferred]));
			setElements(uniq);
			setLoaded(true);
		})();
		return () => {
			cancelled = true;
		};
	}, [user]);
	if (!user || !loaded) return null;
	const scored = mods.map((m) => ({
		mod: m,
		score: (elements.includes(m.element) ? 1e3 : 0) + m.downloads / 1e3
	})).sort((a, b) => b.score - a.score).slice(0, 4);
	if (elements.length === 0) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "mt-16",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-end justify-between",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-primary",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }), " For You"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-2 font-display text-2xl font-extrabold sm:text-3xl",
					children: "Picks based on your taste"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-1 text-sm text-muted-foreground",
					children: [
						"Recommended from ",
						elements.slice(0, 3).join(", "),
						" affinity."
					]
				})
			] })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4",
			children: scored.map((s, i) => {
				const t = elementTheme[s.mod.element];
				return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					initial: {
						opacity: 0,
						y: 16
					},
					whileInView: {
						opacity: 1,
						y: 0
					},
					viewport: { once: true },
					transition: { delay: i * .05 },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/mods/$slug",
						params: { slug: s.mod.slug },
						className: "group relative block overflow-hidden rounded-2xl glass",
						style: { boxShadow: t.glow },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: s.mod.image,
							alt: s.mod.name,
							loading: "lazy",
							className: "aspect-[4/3] w-full object-cover transition-transform group-hover:scale-105"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "absolute inset-x-0 bottom-0 bg-gradient-to-t from-card to-transparent p-3",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-[10px] uppercase tracking-widest text-primary",
								children: t.label
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-display text-sm font-bold leading-tight",
								children: s.mod.name
							})]
						})]
					})
				}, s.mod.slug);
			})
		})]
	});
}
var hero_default = "/assets/hero-DLX2dXcx.jpg";
var spring = {
	type: "spring",
	stiffness: 120,
	damping: 20
};
function Index() {
	const sorted = [...mods].sort((a, b) => b.downloads * .6 + b.baseLikes * 4 - (a.downloads * .6 + a.baseLikes * 4));
	const top = sorted[0];
	const latestVersion = mods.reduce((v, m) => m.version > v ? m.version : v, "0");
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "relative pt-6 sm:pt-12 lg:pt-16",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid gap-12 lg:grid-cols-[1.25fr_1fr] lg:items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.p, {
						initial: {
							opacity: 0,
							y: 12
						},
						animate: {
							opacity: 1,
							y: 0
						},
						transition: spring,
						className: "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "inline-block h-px w-8 bg-primary",
							"aria-hidden": true
						}), "Only Dynamons World"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.h1, {
						initial: {
							opacity: 0,
							y: 24
						},
						animate: {
							opacity: 1,
							y: 0
						},
						transition: {
							...spring,
							delay: .06
						},
						className: "mt-6 font-display text-5xl font-black uppercase leading-[0.95] tracking-tight text-balance sm:text-6xl lg:text-7xl xl:text-8xl",
						children: [
							"The mod",
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-gradient",
								children: "vault."
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.p, {
						initial: {
							opacity: 0,
							y: 20
						},
						animate: {
							opacity: 1,
							y: 0
						},
						transition: {
							...spring,
							delay: .12
						},
						className: "mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg text-pretty",
						children: "Eight hand-crafted Dynamons World builds. Clean injections, real community ratings, weekly drops. No other games, no clutter — just Dynamons."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							y: 20
						},
						animate: {
							opacity: 1,
							y: 0
						},
						transition: {
							...spring,
							delay: .18
						},
						className: "mt-8 flex flex-wrap items-center gap-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UnlockKeyButton, { label: "Get Free Key" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/mods",
							onMouseDown: playClick,
							onMouseEnter: playHover,
							className: "press group inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-semibold transition-colors hover:border-primary/50 hover:text-primary",
							children: ["Browse the vault", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronRight, { className: "h-4 w-4 transition-transform group-hover:translate-x-1" })]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							y: 20
						},
						animate: {
							opacity: 1,
							y: 0
						},
						transition: {
							...spring,
							delay: .24
						},
						className: "mt-10 flex divide-x divide-border border-y border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStat, {
								value: `${formatCount(totalDownloads)}+`,
								label: "Downloads"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStat, {
								value: `${mods.length}`,
								label: "Editions"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeroStat, {
								value: `v${latestVersion}`,
								label: "Latest build"
							})
						]
					})
				] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
					initial: {
						opacity: 0,
						scale: .94,
						rotate: 1
					},
					animate: {
						opacity: 1,
						scale: 1,
						rotate: 0
					},
					transition: {
						...spring,
						delay: .1
					},
					className: "relative mx-auto w-full max-w-md",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/mods/$slug",
						params: { slug: top.slug },
						onMouseDown: playClick,
						onMouseEnter: playHover,
						className: "edge-light group relative block overflow-hidden rounded-2xl border border-border bg-card shadow-elev transition-transform duration-300 hover:-translate-y-1.5",
						style: { boxShadow: elementTheme[top.element].glow },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative aspect-[4/3] overflow-hidden",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
								src: hero_default,
								alt: `${top.name} key art`,
								width: 1536,
								height: 1024,
								className: "h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-card to-transparent" })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative p-5",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between gap-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-primary-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-3 w-3" }), " No.1 this week"]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
										className: "inline-flex items-center gap-1 text-xs font-semibold text-gold",
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3.5 w-3.5 fill-gold" }),
											" ",
											top.baseRating.toFixed(1)
										]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-3 font-display text-2xl font-extrabold uppercase tracking-tight",
									children: top.name
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "mt-1 flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
										className: "text-xs text-muted-foreground",
										children: [
											"v",
											top.version,
											" · ",
											formatCount(top.downloads),
											"+ downloads"
										]
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4 text-primary transition-transform group-hover:translate-x-1" })]
								})
							]
						})]
					})
				})]
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "mt-14 overflow-hidden border-y border-border py-3",
			"aria-hidden": true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "animate-ticker flex w-max items-center gap-8 whitespace-nowrap",
				children: [...mods, ...mods].map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
					className: "inline-flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: elementTheme[m.element].text,
						children: "◆"
					}), m.name]
				}, `${m.slug}-${i}`))
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3",
			children: [
				{
					Icon: Shield,
					title: "Clean injection",
					text: "No ads, no popups, no extras. Just the game, better."
				},
				{
					Icon: Zap,
					title: "Weekly drops",
					text: "Mods refreshed within days of every official update."
				},
				{
					Icon: Users,
					title: "Community-first",
					text: "Real ratings and reviews from real trainers."
				}
			].map(({ Icon, title, text }, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					y: 16
				},
				whileInView: {
					opacity: 1,
					y: 0
				},
				viewport: { once: true },
				transition: {
					...spring,
					delay: i * .08
				},
				className: "group bg-card p-6 transition-colors hover:bg-secondary",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex h-10 w-10 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mt-4 font-display text-base font-extrabold uppercase tracking-tight",
						children: title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1.5 text-sm leading-relaxed text-muted-foreground",
						children: text
					})
				]
			}, title))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "mt-20",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-end justify-between gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "inline-block h-px w-8 bg-primary",
								"aria-hidden": true
							}), "The vault"]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h2", {
							className: "mt-3 font-display text-3xl font-black uppercase tracking-tight sm:text-5xl",
							children: [
								"Most popular",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", { className: "sm:hidden" }),
								" this week"
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/mods",
						onMouseDown: playClick,
						onMouseEnter: playHover,
						className: "group hidden shrink-0 items-center gap-2 text-sm font-bold uppercase tracking-wider text-primary sm:inline-flex",
						children: ["View all", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4 transition-transform group-hover:translate-x-1" })]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-10 grid gap-6 sm:grid-cols-2",
					children: sorted.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModCard, {
						mod: m,
						index: i,
						featured: i === 0
					}, m.slug))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-8 sm:hidden",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/mods",
						onMouseDown: playClick,
						className: "press flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 py-3 text-sm font-bold uppercase tracking-wider",
						children: ["View all mods ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowRight, { className: "h-4 w-4" })]
					})
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ForYouRail, {})
	] });
}
function HeroStat({ value, label }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex-1 px-4 py-4 first:pl-0 sm:px-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "font-display text-2xl font-black tracking-tight sm:text-3xl",
			children: value
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground",
			children: label
		})]
	});
}
//#endregion
export { Index as component };
