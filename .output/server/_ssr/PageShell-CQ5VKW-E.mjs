import { o as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence } from "../_libs/framer-motion.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { a as useRouterState, f as Link, h as useRouter, p as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { _ as useGamification, d as playClick, g as useAuth, p as playSoft, u as mods, v as useSiteSettings, y as xpToNext } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { A as LogOut, D as Menu, E as MessageCircle, I as Instagram, R as House, V as Flame, Y as Crown, _ as Settings, a as User, b as Search, dt as ArrowLeft, g as ShieldCheck, h as Shield, n as Youtube, p as Sparkles, r as X, s as Trophy, t as Zap, y as Send, z as Heart } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/PageShell-CQ5VKW-E.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useProfile() {
	const { user } = useAuth();
	const [profile, setProfile] = (0, import_react.useState)(null);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const refresh = (0, import_react.useCallback)(async () => {
		if (!user) {
			setProfile(null);
			setLoading(false);
			return;
		}
		setLoading(true);
		const { data } = await supabase.rpc("get_my_profile");
		const row = Array.isArray(data) ? data[0] : data;
		setProfile(row ?? null);
		setLoading(false);
	}, [user]);
	(0, import_react.useEffect)(() => {
		refresh();
	}, [refresh]);
	return {
		profile,
		loading,
		refresh
	};
}
var avatars = [
	{
		id: "m1",
		url: "/assets/m1-CmX34rYw.jpg",
		label: "Storm Trainer",
		gender: "male",
		style: "trainer"
	},
	{
		id: "m2",
		url: "/assets/m2-OdlY0n7O.jpg",
		label: "Frost Trainer",
		gender: "male",
		style: "trainer"
	},
	{
		id: "m3",
		url: "/assets/m3-CA0BalRS.jpg",
		label: "Ember Trainer",
		gender: "male",
		style: "trainer"
	},
	{
		id: "m4",
		url: "/assets/m4-Bk0FhE8X.jpg",
		label: "Leaf Druid",
		gender: "male",
		style: "trainer"
	},
	{
		id: "m5",
		url: "/assets/m5-LqUeZiT3.jpg",
		label: "Shadow Rogue",
		gender: "male",
		style: "trainer"
	},
	{
		id: "m6",
		url: "/assets/m6-BeOzYhe5.jpg",
		label: "Gold Knight",
		gender: "male",
		style: "trainer"
	},
	{
		id: "m7",
		url: "/assets/m7-BzYEJoIq.jpg",
		label: "Earth Warden",
		gender: "male",
		style: "trainer"
	},
	{
		id: "m8",
		url: "/assets/m8-DbZJGgB9.jpg",
		label: "Tide Caller",
		gender: "male",
		style: "trainer"
	},
	{
		id: "m9",
		url: "/assets/m9-BQ6cy3kj.jpg",
		label: "Diamond Lord",
		gender: "male",
		style: "trainer"
	},
	{
		id: "m10",
		url: "/assets/m10-BxvKYq3y.jpg",
		label: "Spirit Walker",
		gender: "male",
		style: "trainer"
	},
	{
		id: "f1",
		url: "/assets/f1-fk6WMsZp.jpg",
		label: "Storm Trainer",
		gender: "female",
		style: "trainer"
	},
	{
		id: "f2",
		url: "/assets/f2-QOEpM3oR.jpg",
		label: "Frost Trainer",
		gender: "female",
		style: "trainer"
	},
	{
		id: "f3",
		url: "/assets/f3-B9on5--K.jpg",
		label: "Ember Trainer",
		gender: "female",
		style: "trainer"
	},
	{
		id: "f4",
		url: "/assets/f4-DbuPAYhh.jpg",
		label: "Leaf Druid",
		gender: "female",
		style: "trainer"
	},
	{
		id: "f5",
		url: "/assets/f5-2HLb1NHe.jpg",
		label: "Shadow Rogue",
		gender: "female",
		style: "trainer"
	},
	{
		id: "f6",
		url: "/assets/f6-BAPc7U_2.jpg",
		label: "Gold Queen",
		gender: "female",
		style: "trainer"
	},
	{
		id: "f7",
		url: "/assets/f7-BepwRB9A.jpg",
		label: "Earth Warden",
		gender: "female",
		style: "trainer"
	},
	{
		id: "f8",
		url: "/assets/f8-CuEmv_vG.jpg",
		label: "Tide Caller",
		gender: "female",
		style: "trainer"
	},
	{
		id: "f9",
		url: "/assets/f9-DajBqzpb.jpg",
		label: "Diamond Lady",
		gender: "female",
		style: "trainer"
	},
	{
		id: "f10",
		url: "/assets/f10-BEc29XMy.jpg",
		label: "Spirit Walker",
		gender: "female",
		style: "trainer"
	},
	{
		id: "ab1",
		url: "/assets/ab1-Cmi5VDs_.jpg",
		label: "Ember Ace",
		gender: "male",
		style: "anime"
	},
	{
		id: "ab2",
		url: "/assets/ab2-vwS5e1Jl.jpg",
		label: "Tide Knight",
		gender: "male",
		style: "anime"
	},
	{
		id: "ab3",
		url: "/assets/ab3-BUjMZ8gx.jpg",
		label: "Volt Striker",
		gender: "male",
		style: "anime"
	},
	{
		id: "ab4",
		url: "/assets/ab4-t8WZNk4U.jpg",
		label: "Verdant Sage",
		gender: "male",
		style: "anime"
	},
	{
		id: "ab5",
		url: "/assets/ab5-m9jRJ6VJ.jpg",
		label: "Void Hunter",
		gender: "male",
		style: "anime"
	},
	{
		id: "ab6",
		url: "/assets/ab6-BschmfIr.jpg",
		label: "Frost Prince",
		gender: "male",
		style: "anime"
	},
	{
		id: "ab7",
		url: "/assets/ab7-d9x8wsN7.jpg",
		label: "Solar King",
		gender: "male",
		style: "anime"
	},
	{
		id: "ab8",
		url: "/assets/ab8-CIugN9mD.jpg",
		label: "Crystal Mage",
		gender: "male",
		style: "anime"
	},
	{
		id: "ab9",
		url: "/assets/ab9-BEQFe-X0.jpg",
		label: "Astral Spirit",
		gender: "male",
		style: "anime"
	},
	{
		id: "ab10",
		url: "/assets/ab10-Cd3rwTMo.jpg",
		label: "Wild Ranger",
		gender: "male",
		style: "anime"
	},
	{
		id: "ag1",
		url: "/assets/ag1-DG7pnv8N.jpg",
		label: "Ember Maiden",
		gender: "female",
		style: "anime"
	},
	{
		id: "ag2",
		url: "/assets/ag2-DgdO5Ji5.jpg",
		label: "Tide Princess",
		gender: "female",
		style: "anime"
	},
	{
		id: "ag3",
		url: "/assets/ag3-BgFcks7_.jpg",
		label: "Volt Idol",
		gender: "female",
		style: "anime"
	},
	{
		id: "ag4",
		url: "/assets/ag4-Bkuv1ozq.jpg",
		label: "Verdant Nymph",
		gender: "female",
		style: "anime"
	},
	{
		id: "ag5",
		url: "/assets/ag5-BEjQuSHh.jpg",
		label: "Void Witch",
		gender: "female",
		style: "anime"
	},
	{
		id: "ag6",
		url: "/assets/ag6-B-rxUP3j.jpg",
		label: "Frost Maiden",
		gender: "female",
		style: "anime"
	},
	{
		id: "ag7",
		url: "/assets/ag7-BOCfeG_8.jpg",
		label: "Solar Queen",
		gender: "female",
		style: "anime"
	},
	{
		id: "ag8",
		url: "/assets/ag8-DRNCDjlP.jpg",
		label: "Crystal Sage",
		gender: "female",
		style: "anime"
	},
	{
		id: "ag9",
		url: "/assets/ag9-B07S76bf.jpg",
		label: "Astral Muse",
		gender: "female",
		style: "anime"
	},
	{
		id: "ag10",
		url: "/assets/ag10-CGj3nepX.jpg",
		label: "Wild Ranger",
		gender: "female",
		style: "anime"
	}
];
var getAvatarById = (id) => id ? avatars.find((a) => a.id === id) : void 0;
var getAvatarUrl = (id) => getAvatarById(id)?.url;
var SIZES = {
	xs: {
		pad: "px-1.5 py-0.5",
		text: "text-[9px]",
		icon: "h-2.5 w-2.5"
	},
	sm: {
		pad: "px-2 py-0.5",
		text: "text-[10px]",
		icon: "h-3 w-3"
	},
	md: {
		pad: "px-2.5 py-1",
		text: "text-xs",
		icon: "h-3.5 w-3.5"
	},
	lg: {
		pad: "px-3 py-1.5",
		text: "text-sm",
		icon: "h-4 w-4"
	}
};
function OwnerBadge({ size = "sm", label = "OWNER" }) {
	const s = SIZES[size];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.span, {
		initial: {
			scale: .85,
			opacity: 0
		},
		animate: {
			scale: 1,
			opacity: 1
		},
		className: `relative inline-flex items-center gap-1 rounded-full font-extrabold uppercase tracking-wider text-amber-50 ${s.pad} ${s.text}`,
		style: {
			background: "linear-gradient(135deg, #f59e0b 0%, #fbbf24 35%, #f97316 65%, #d97706 100%)",
			boxShadow: "0 0 16px rgba(251,191,36,0.55), inset 0 1px 0 rgba(255,255,255,0.35)"
		},
		"aria-label": "Verified owner",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Crown, { className: `${s.icon} drop-shadow` }),
			label,
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
				"aria-hidden": true,
				className: "pointer-events-none absolute inset-0 rounded-full",
				style: { boxShadow: "0 0 0 0 rgba(251,191,36,0.6)" },
				animate: { boxShadow: ["0 0 0 0 rgba(251,191,36,0.55)", "0 0 0 8px rgba(251,191,36,0)"] },
				transition: {
					duration: 1.8,
					repeat: Infinity,
					ease: "easeOut"
				}
			})
		]
	});
}
function VerifiedFounderChip() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
		className: "inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-amber-300",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-3.5 w-3.5" }), " Verified Founder"]
	});
}
function LevelBadge({ compact = false }) {
	const { xp } = useGamification();
	const { level, base, next, progress } = xpToNext(xp.xp);
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-3 w-3" }),
			" Lv ",
			level
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card/60 p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "grid h-9 w-9 place-items-center rounded-xl text-primary-foreground",
					style: { background: "var(--gradient-primary)" },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-4 w-4" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-[10px] uppercase tracking-widest text-muted-foreground",
					children: "Trainer Level"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "font-display text-xl font-bold",
					children: ["Lv ", level]
				})] })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground",
				children: [
					xp.xp - base,
					" / ",
					next - base,
					" XP"
				]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "mt-3 h-2 overflow-hidden rounded-full bg-background/60",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				initial: { width: 0 },
				animate: { width: `${progress * 100}%` },
				transition: { duration: .8 },
				className: "h-full rounded-full",
				style: { background: "var(--gradient-primary)" }
			})
		})]
	});
}
function StreakBadge({ compact = false }) {
	const { streak } = useGamification();
	if (compact) return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "inline-flex items-center gap-1.5 rounded-full border border-orange-400/40 bg-orange-500/10 px-2.5 py-1 text-[11px] font-bold text-orange-300",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-3 w-3" }),
			" ",
			streak.current,
			"d"
		]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-orange-400/30 bg-orange-500/5 p-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
				animate: { scale: [
					1,
					1.1,
					1
				] },
				transition: {
					duration: 2,
					repeat: Infinity
				},
				className: "grid h-9 w-9 place-items-center rounded-xl text-orange-100",
				style: { background: "linear-gradient(135deg,#f97316,#dc2626)" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Flame, { className: "h-4 w-4" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[10px] uppercase tracking-widest text-muted-foreground",
				children: "Daily Streak"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "font-display text-xl font-bold",
				children: [streak.current, " days"]
			})] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
			className: "mt-3 text-xs text-muted-foreground",
			children: [
				"Longest: ",
				streak.longest,
				" days · Come back tomorrow!"
			]
		})]
	});
}
var nav = [
	{
		to: "/",
		label: "Home"
	},
	{
		to: "/mods",
		label: "Mods"
	},
	{
		to: "/about",
		label: "About"
	},
	{
		to: "/contact",
		label: "Contact"
	}
];
function Header() {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [searchOpen, setSearchOpen] = (0, import_react.useState)(false);
	const [q, setQ] = (0, import_react.useState)("");
	const navigate = useNavigate();
	const { user, signOut } = useAuth();
	const { profile } = useProfile();
	const { xp, streak } = useGamification();
	const [menuOpen, setMenuOpen] = (0, import_react.useState)(false);
	const menuRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const onClick = (e) => {
			if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
		};
		document.addEventListener("mousedown", onClick);
		return () => document.removeEventListener("mousedown", onClick);
	}, []);
	const results = q.trim() ? mods.filter((m) => (m.name + " " + m.tagline + " " + m.features.join(" ") + " " + m.element).toLowerCase().includes(q.toLowerCase())) : [];
	const avatarUrl = getAvatarUrl(profile?.avatar_url);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "sticky top-0 z-50 border-b border-border/60 backdrop-blur-xl bg-background/70",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/",
						onMouseDown: playClick,
						className: "flex items-center gap-2 min-w-0",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.span, {
							initial: {
								rotate: -20,
								scale: .6,
								opacity: 0
							},
							animate: {
								rotate: 0,
								scale: 1,
								opacity: 1
							},
							className: "relative grid h-10 w-10 shrink-0 place-items-center rounded-xl",
							style: { background: "var(--gradient-primary)" },
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5 text-primary-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute inset-0 rounded-xl animate-pulse-glow" })]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "hidden truncate font-display text-lg font-bold sm:inline sm:text-xl",
							children: ["Dynamon ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-gradient",
								children: "Universe"
							})]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
						className: "hidden items-center gap-1 lg:flex",
						children: nav.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: n.to,
							onMouseDown: playClick,
							className: "relative rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground [&.active]:bg-card/60",
							activeProps: { className: "active" },
							activeOptions: { exact: n.to === "/" },
							children: n.label
						}, n.to))
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [
							user && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "hidden items-center gap-2 md:flex",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LevelBadge, { compact: true }), streak.current > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StreakBadge, { compact: true })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									setSearchOpen((v) => !v);
									playClick();
								},
								"aria-label": "Search",
								className: "press grid h-10 w-10 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "h-4 w-4" })
							}),
							user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								ref: menuRef,
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: () => setMenuOpen((v) => !v),
									className: `relative grid h-10 w-10 place-items-center overflow-hidden rounded-full text-primary-foreground ${profile?.is_owner ? "ring-2 ring-amber-400/70" : "ring-2 ring-primary/40"}`,
									style: !avatarUrl ? { background: "var(--gradient-violet)" } : void 0,
									"aria-label": "Account",
									children: [avatarUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: avatarUrl,
										alt: "",
										className: "h-full w-full object-cover"
									}) : (profile?.display_name?.[0] ?? user.email?.[0] ?? "T").toUpperCase(), profile?.is_owner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full text-[8px] font-extrabold text-amber-50",
										style: {
											background: "linear-gradient(135deg,#f59e0b,#f97316)",
											boxShadow: "0 0 8px rgba(251,191,36,0.7)"
										},
										children: "★"
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: menuOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
									initial: {
										opacity: 0,
										y: -6
									},
									animate: {
										opacity: 1,
										y: 0
									},
									exit: {
										opacity: 0,
										y: -6
									},
									className: "absolute right-0 mt-2 w-72 overflow-hidden rounded-2xl glass shadow-elev",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center gap-3 border-b border-border/60 px-4 py-3",
											children: [avatarUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
												src: avatarUrl,
												alt: "",
												className: `h-10 w-10 rounded-full object-cover ${profile?.is_owner ? "ring-2 ring-amber-400/70" : "ring-2 ring-primary/40"}`
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "flex items-center gap-1.5",
													children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
														className: "truncate text-sm font-semibold",
														children: profile?.display_name ?? "Trainer"
													}), profile?.is_owner && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(OwnerBadge, { size: "xs" })]
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "truncate text-xs text-muted-foreground",
													children: ["@", profile?.username ?? user.email]
												})]
											})]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/profile",
											onClick: () => setMenuOpen(false),
											className: "flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-card/60",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "h-4 w-4" }), " Edit profile"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/favorites",
											onClick: () => setMenuOpen(false),
											className: "flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-card/60",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: "h-4 w-4" }), " My favorites"]
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/achievements",
											onClick: () => setMenuOpen(false),
											className: "flex w-full items-center gap-2 px-4 py-3 text-left text-sm hover:bg-card/60",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trophy, { className: "h-4 w-4" }),
												" Achievements · Lv ",
												xp.level
											]
										}),
										profile?.is_owner && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/admin",
											onClick: () => setMenuOpen(false),
											className: "flex w-full items-center gap-2 border-t border-border/60 px-4 py-3 text-left text-sm text-amber-300 hover:bg-card/60",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }), " Owner dashboard"]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/admin-control",
											onClick: () => setMenuOpen(false),
											className: "flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-amber-300 hover:bg-card/60",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Settings, { className: "h-4 w-4" }), " Control panel"]
										})] }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
											onClick: async () => {
												setMenuOpen(false);
												await signOut();
											},
											className: "flex w-full items-center gap-2 border-t border-border/60 px-4 py-3 text-left text-sm hover:bg-card/60",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogOut, { className: "h-4 w-4" }), " Sign out"]
										})
									]
								}) })]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: "/auth",
								onMouseDown: playClick,
								className: "press hidden items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground glow-primary transition-[filter] hover:brightness-110 sm:inline-flex",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4" }), " Sign in"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
								onClick: () => {
									setOpen((v) => !v);
									playClick();
								},
								className: "grid h-10 w-10 place-items-center rounded-xl border border-border lg:hidden",
								"aria-label": "Toggle menu",
								children: open ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-5 w-5" })
							})
						]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: searchOpen && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				initial: {
					opacity: 0,
					height: 0
				},
				animate: {
					opacity: 1,
					height: "auto"
				},
				exit: {
					opacity: 0,
					height: 0
				},
				className: "overflow-hidden border-t border-border/60 bg-background/95",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mx-auto max-w-3xl px-4 py-4 sm:px-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "relative",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								autoFocus: true,
								value: q,
								onChange: (e) => setQ(e.target.value),
								placeholder: "Search mods, elements, features…",
								className: "w-full rounded-xl border border-border bg-card/60 py-3 pl-11 pr-4 text-sm outline-none focus:border-primary"
							})]
						}),
						results.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-3 max-h-72 space-y-1 overflow-auto rounded-xl border border-border bg-card/40 p-2",
							children: results.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								onClick: () => {
									setSearchOpen(false);
									setQ("");
									navigate({
										to: "/mods/$slug",
										params: { slug: m.slug }
									});
								},
								className: "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-card",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
									src: m.image,
									alt: "",
									className: "h-9 w-9 rounded-lg object-cover"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "min-w-0",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate font-semibold",
										children: m.name
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "truncate text-xs text-muted-foreground",
										children: m.tagline
									})]
								})]
							}) }, m.slug))
						}),
						q && results.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "mt-3 px-2 text-sm text-muted-foreground",
							children: [
								"No mods match \"",
								q,
								"\"."
							]
						})
					]
				})
			}) }),
			open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
				initial: {
					opacity: 0,
					y: -8
				},
				animate: {
					opacity: 1,
					y: 0
				},
				className: "border-t border-border/60 bg-background/95 lg:hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col gap-1 px-4 py-3",
					children: [nav.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: n.to,
						onClick: () => setOpen(false),
						className: "rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-card hover:text-foreground",
						children: n.label
					}, n.to)), !user && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/auth",
						onClick: () => setOpen(false),
						className: "mt-2 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground",
						style: { background: "var(--gradient-primary)" },
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-4 w-4" }), " Sign in"]
					})]
				})
			})
		]
	});
}
function useSocials() {
	const { socials } = useSiteSettings();
	return [
		{
			label: "WhatsApp",
			href: socials.whatsapp,
			Icon: MessageCircle,
			color: "oklch(0.78 0.17 155)"
		},
		{
			label: "YouTube",
			href: socials.youtube,
			Icon: Youtube,
			color: "oklch(0.65 0.24 27)"
		},
		{
			label: "Instagram",
			href: socials.instagram,
			Icon: Instagram,
			color: "oklch(0.62 0.22 0)"
		},
		{
			label: "Telegram",
			href: socials.telegram,
			Icon: Send,
			color: "oklch(0.7 0.16 240)"
		}
	];
}
function SocialStrip({ variant = "full" }) {
	const SOCIALS = useSocials();
	if (variant === "compact") return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center gap-2",
		children: SOCIALS.map(({ label, href, Icon, color }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href,
			target: "_blank",
			rel: "noreferrer noopener",
			onMouseDown: playSoft,
			"aria-label": label,
			className: "grid h-9 w-9 place-items-center rounded-full border border-border bg-card/60 text-muted-foreground transition-all hover:scale-110 hover:text-foreground",
			style: { ["--c"]: color },
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" })
		}, label))
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "relative overflow-hidden rounded-3xl glass p-6 sm:p-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs font-semibold uppercase tracking-[0.2em] text-primary",
						children: "Join the Universe"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mt-2 text-2xl font-bold sm:text-3xl",
						children: "Get drops, guides & weekly mod news"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted-foreground",
						children: "Follow Dynamon Gamer — every new mod is announced first on these channels."
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex flex-wrap gap-3",
				children: SOCIALS.map(({ label, href, Icon }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.a, {
					href,
					target: "_blank",
					rel: "noreferrer noopener",
					onMouseDown: playSoft,
					whileHover: { y: -3 },
					whileTap: { scale: .95 },
					className: "group flex items-center gap-2 rounded-full border border-border bg-card/70 px-4 py-2 text-sm font-medium transition-colors hover:border-primary/50 hover:text-primary",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: label })]
				}, label))
			})]
		})
	});
}
function Footer() {
	const SOCIALS = useSocials();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("footer", {
		className: "mt-24 border-t border-border/60 bg-background/60",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SocialStrip, {}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-12 grid gap-10 sm:grid-cols-2 md:grid-cols-[2fr_1fr_1fr_1.2fr]",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "grid h-9 w-9 place-items-center rounded-lg",
								style: { background: "var(--gradient-primary)" },
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4 text-primary-foreground" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "font-display text-lg font-bold",
								children: "Dynamon Universe"
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 max-w-sm text-sm text-muted-foreground",
							children: "A fan-made hub dedicated only to Dynamons World modded builds. Crafted with care by Dynamon Gamer for the community of trainers."
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold text-foreground",
							children: "Explore"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-4 space-y-2.5 text-sm text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/",
									className: "transition-colors hover:text-primary",
									children: "Home"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/mods",
									className: "transition-colors hover:text-primary",
									children: "All Mods"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/about",
									className: "transition-colors hover:text-primary",
									children: "About us"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/contact",
									className: "transition-colors hover:text-primary",
									children: "Contact"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/auth",
									className: "transition-colors hover:text-primary",
									children: "Sign in"
								}) })
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold text-foreground",
							children: "Legal"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ul", {
							className: "mt-4 space-y-2.5 text-sm text-muted-foreground",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/disclaimer",
									className: "transition-colors hover:text-primary",
									children: "Disclaimer"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/disclaimer",
									hash: "legal",
									className: "transition-colors hover:text-primary",
									children: "Terms of use"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/disclaimer",
									hash: "privacy",
									className: "transition-colors hover:text-primary",
									children: "Privacy policy"
								}) }),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
									to: "/disclaimer",
									hash: "dmca",
									className: "transition-colors hover:text-primary",
									children: "DMCA"
								}) })
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm font-semibold text-foreground",
							children: "Community"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "mt-4 space-y-2.5 text-sm",
							children: SOCIALS.map(({ label, href, Icon }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
								href,
								target: "_blank",
								rel: "noreferrer noopener",
								className: "group inline-flex items-center gap-2.5 text-muted-foreground transition-colors hover:text-primary",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "grid h-7 w-7 place-items-center rounded-lg border border-border bg-card/60 transition-colors group-hover:border-primary/40 group-hover:text-primary",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3.5 w-3.5" })
								}), label]
							}) }, label))
						})] })
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-10 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
						"© ",
						(/* @__PURE__ */ new Date()).getFullYear(),
						" Dynamon Universe. Not affiliated with the official developers of Dynamons World."
					] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "All trademarks belong to their respective owners." })]
				})
			]
		})
	});
}
/** Smooth back + home pills shown on every page (hidden on the home route). */
function BackHome() {
	const router = useRouter();
	if (useRouterState({ select: (s) => s.location.pathname }) === "/") return null;
	const goBack = () => {
		playClick();
		if (window.history.length > 1) router.history.back();
		else router.navigate({ to: "/" });
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		initial: {
			opacity: 0,
			y: -6
		},
		animate: {
			opacity: 1,
			y: 0
		},
		transition: { duration: .35 },
		className: "mb-6 flex items-center gap-2",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
			onClick: goBack,
			className: "group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3.5 py-2 text-xs font-semibold text-muted-foreground backdrop-blur transition-all hover:border-primary/40 hover:text-foreground hover:shadow-[0_0_24px_-6px_var(--primary)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" }), "Back"]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/",
			onMouseDown: playClick,
			className: "group inline-flex items-center gap-1.5 rounded-full border border-border bg-card/60 px-3.5 py-2 text-xs font-semibold text-muted-foreground backdrop-blur transition-all hover:border-primary/40 hover:text-foreground hover:shadow-[0_0_24px_-6px_var(--primary)]",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(House, { className: "h-3.5 w-3.5" }), "Home"]
		})]
	});
}
function PageShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "min-h-screen",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Header, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BackHome, {}), children]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Footer, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				theme: "dark",
				position: "bottom-right"
			})
		]
	});
}
//#endregion
export { StreakBadge as a, getAvatarUrl as c, SocialStrip as i, useProfile as l, OwnerBadge as n, VerifiedFounderChip as o, PageShell as r, avatars as s, LevelBadge as t };
