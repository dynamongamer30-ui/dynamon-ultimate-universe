import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link, p as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as useGamification, c as formatCount, d as playClick, f as playHover, g as useAuth, m as playSuccess, p as playSoft, s as elementTheme } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { J as Download, T as MessageSquare, f as Star, l as TrendingUp, z as Heart } from "../_libs/lucide-react.mjs";
import { t as FavoriteButton } from "./FavoriteButton-mWjx10mE.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ModCard-DHGFddOX.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useLocalState(key, initial) {
	const [value, setValue] = (0, import_react.useState)(initial);
	const [hydrated, setHydrated] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		try {
			const raw = localStorage.getItem(key);
			if (raw != null) setValue(JSON.parse(raw));
		} catch {}
		setHydrated(true);
	}, [key]);
	(0, import_react.useEffect)(() => {
		if (!hydrated) return;
		try {
			localStorage.setItem(key, JSON.stringify(value));
		} catch {}
	}, [
		key,
		value,
		hydrated
	]);
	return [
		value,
		setValue,
		hydrated
	];
}
function ModCard({ mod, index = 0, featured = false }) {
	const { user } = useAuth();
	const navigate = useNavigate();
	const { award, grant } = useGamification();
	const theme = elementTheme[mod.element];
	const [localLikes, setLocalLikes] = useLocalState(`mod:${mod.slug}:likes`, 0);
	const [liked, setLiked] = useLocalState(`mod:${mod.slug}:liked`, false);
	const [extraDl, setExtraDl] = useLocalState(`mod:${mod.slug}:dl`, 0);
	const totalLikes = mod.baseLikes + localLikes;
	const totalDownloads = mod.downloads + extraDl;
	const cardRef = (0, import_react.useRef)(null);
	const [tilt, setTilt] = (0, import_react.useState)({
		rx: 0,
		ry: 0
	});
	const [hovered, setHovered] = (0, import_react.useState)(false);
	const onPointerMove = (e) => {
		const el = cardRef.current;
		if (!el || window.matchMedia("(pointer: coarse)").matches) return;
		const rect = el.getBoundingClientRect();
		const x = (e.clientX - rect.left) / rect.width - .5;
		const y = (e.clientY - rect.top) / rect.height - .5;
		setTilt({
			rx: -y * 4,
			ry: x * 4
		});
	};
	const onPointerLeave = () => {
		setTilt({
			rx: 0,
			ry: 0
		});
		setHovered(false);
	};
	const toggleLike = () => {
		if (!user) {
			navigate({ to: "/auth" });
			return;
		}
		const newLiked = !liked;
		setLiked(newLiked);
		setLocalLikes((n) => newLiked ? n + 1 : Math.max(0, n - 1));
		playSoft();
		if (newLiked) {
			award(3, "Liked");
			grant("first_like");
		}
	};
	const handleGet = (e) => {
		if (!user) {
			e.preventDefault();
			navigate({ to: "/auth" });
			return;
		}
		playSuccess();
		setExtraDl((n) => n + 1);
		award(10, "Downloaded");
		grant("first_download");
		toast.success(`${mod.name} — download starting`, { description: "Build access is delivered through our community channels for safety." });
	};
	const share = async () => {
		playClick();
		const url = `${window.location.origin}/mods/${mod.slug}`;
		try {
			if (navigator.share) await navigator.share({
				title: mod.name,
				url
			});
			else {
				await navigator.clipboard.writeText(url);
				toast.success("Link copied");
			}
		} catch {}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.article, {
		ref: cardRef,
		initial: {
			opacity: 0,
			y: 30
		},
		whileInView: {
			opacity: 1,
			y: 0
		},
		viewport: {
			once: true,
			margin: "-50px"
		},
		transition: {
			type: "spring",
			stiffness: 100,
			damping: 18,
			delay: index * .05
		},
		onPointerMove,
		onPointerEnter: () => {
			setHovered(true);
			playHover();
		},
		onPointerLeave,
		className: "edge-light group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
		style: {
			transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
			transition: hovered ? "box-shadow 0.3s" : "transform 0.5s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.3s",
			boxShadow: hovered ? theme.glow : "var(--shadow-card)"
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/mods/$slug",
			params: { slug: mod.slug },
			onMouseDown: playClick,
			className: "relative block aspect-[16/9] overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "absolute inset-0 z-10 opacity-30 mix-blend-overlay transition-opacity duration-300 group-hover:opacity-55",
					style: { background: theme.gradient }
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: mod.image,
					alt: mod.name,
					loading: "lazy",
					width: 1024,
					height: 1024,
					className: "h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-x-0 bottom-0 z-10 h-1/2 bg-gradient-to-t from-card to-transparent" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `absolute left-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${theme.chip}`,
					children: theme.label
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute right-4 top-4 z-20 flex items-center gap-1.5",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-bold backdrop-blur-sm",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Star, { className: "h-3 w-3 fill-gold text-gold" }), mod.baseRating.toFixed(1)]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "rounded-md bg-background/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-primary backdrop-blur-sm",
						children: ["v", mod.version]
					})]
				}),
				featured && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "absolute bottom-4 left-4 z-20 inline-flex items-center gap-1.5 rounded-md bg-primary px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-3 w-3" }), " Most popular"]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative flex flex-1 flex-col p-5 sm:p-6",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
					to: "/mods/$slug",
					params: { slug: mod.slug },
					onMouseDown: playClick,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-display text-xl font-extrabold uppercase leading-tight tracking-tight transition-colors hover:text-primary",
						children: mod.name
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-1.5 text-sm leading-relaxed text-muted-foreground",
					children: mod.tagline
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-4 flex flex-wrap gap-1.5",
					children: mod.features.slice(0, 3).map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "rounded-md border border-border bg-secondary px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground",
						children: f
					}, f))
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 flex divide-x divide-border rounded-xl border border-border bg-background/50 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Downloads",
							value: formatCount(totalDownloads)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: "Likes",
							value: formatCount(totalLikes)
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Stat, {
							label: mod.ratingCount ? "Reviews" : "Rating",
							value: mod.ratingCount ? formatCount(mod.ratingCount) : mod.baseRating.toFixed(1)
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-auto flex items-center gap-2 pt-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to: "/mods/$slug",
							params: { slug: mod.slug },
							onClick: handleGet,
							className: "press inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-[filter] hover:brightness-110 glow-primary",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4 shrink-0" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "truncate",
								children: user ? "Download" : "Sign in to download"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: toggleLike,
							"aria-label": liked ? "Unlike" : "Like",
							"aria-pressed": liked,
							className: `press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border transition-colors ${liked ? "border-rose-400/50 bg-rose-400/10 text-rose-400" : "border-border bg-secondary text-muted-foreground hover:text-foreground"}`,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: `h-4 w-4 ${liked ? "fill-rose-400" : ""}` })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FavoriteButton, { slug: mod.slug }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/mods/$slug",
							params: { slug: mod.slug },
							hash: "comments",
							"aria-label": "Comments",
							onMouseDown: playClick,
							className: "press hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground sm:flex",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageSquare, { className: "h-4 w-4" })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: share,
							"aria-label": "Share",
							className: "press flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShareIcon, {})
						})
					]
				})
			]
		})]
	});
}
function Stat({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex-1 px-2 py-2.5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-sm font-bold",
			children: value
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground",
			children: label
		})]
	});
}
function ShareIcon() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 24 24",
		className: "h-4 w-4",
		fill: "none",
		stroke: "currentColor",
		strokeWidth: "2",
		strokeLinecap: "round",
		strokeLinejoin: "round",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "18",
				cy: "5",
				r: "3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "6",
				cy: "12",
				r: "3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: "18",
				cy: "19",
				r: "3"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "8.59",
				y1: "13.51",
				x2: "15.42",
				y2: "17.49"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", {
				x1: "15.41",
				y1: "6.51",
				x2: "8.59",
				y2: "10.49"
			})
		]
	});
}
//#endregion
export { ModCard as t };
