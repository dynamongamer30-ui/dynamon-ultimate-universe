import { o as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence } from "../_libs/framer-motion.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime, t as QueryClientProvider } from "../_libs/react+tanstack__react-query.mjs";
import { c as Outlet, d as createRootRouteWithContext, f as Link, h as useRouter, i as HeadContent, l as lazyRouteComponent, p as useNavigate, r as Scripts, s as createRouter, u as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as useGamification, a as GamificationProvider, d as playClick, g as useAuth, m as playSuccess, o as SiteSettingsProvider, t as AuthProvider, v as useSiteSettings } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { J as Download, O as Megaphone, k as Mail, m as Smartphone, p as Sparkles, r as X, st as Bell } from "../_libs/lucide-react.mjs";
import { t as Route$17 } from "./mods._slug-DpTyg_oY.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-SAyYAinp.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-BAlCOB5n.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
/**
* Ember Field — cursor-reactive ambient background.
* A field of drifting ember particles connected by faint filaments.
* The pointer carries a soft heat glow: nearby embers accelerate,
* brighten, and get gently pulled toward the cursor before escaping.
* Single canvas, DPR-capped, respects prefers-reduced-motion.
*/
function AuroraBackground() {
	const canvasRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;
		const ctx = canvas.getContext("2d");
		if (!ctx) return;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		const isMobile = window.innerWidth < 640;
		const COUNT = reduced ? 0 : isMobile ? 34 : 90;
		const LINK_DIST = isMobile ? 90 : 130;
		let width = 0, height = 0, dpr = 1;
		const setSize = () => {
			dpr = Math.min(window.devicePixelRatio || 1, 2);
			width = window.innerWidth;
			height = window.innerHeight;
			canvas.width = width * dpr;
			canvas.height = height * dpr;
			canvas.style.width = `${width}px`;
			canvas.style.height = `${height}px`;
			ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
		};
		setSize();
		window.addEventListener("resize", setSize);
		let px = width / 2, py = height * .35;
		let tx = px, ty = py;
		let pointerActive = false;
		const onMove = (e) => {
			tx = e.clientX;
			ty = e.clientY;
			pointerActive = true;
		};
		const onLeave = () => {
			pointerActive = false;
		};
		window.addEventListener("pointermove", onMove, { passive: true });
		window.addEventListener("pointerleave", onLeave);
		const embers = Array.from({ length: COUNT }).map(() => ({
			x: Math.random() * width,
			y: Math.random() * height,
			vx: (Math.random() - .5) * .18,
			vy: -(Math.random() * .22 + .04),
			r: Math.random() * 1.8 + .7,
			warm: Math.random(),
			baseA: Math.random() * .4 + .15,
			heat: 0
		}));
		const emberColor = (warm, a) => {
			return `hsla(${18 + warm * 26}, 95%, ${58 + warm * 10}%, ${a})`;
		};
		let raf = 0;
		let t = 0;
		const loop = () => {
			t += .004;
			px += (tx - px) * .06;
			py += (ty - py) * .06;
			ctx.clearRect(0, 0, width, height);
			if (!reduced) {
				const glowA = pointerActive ? .1 : .05;
				const g1 = ctx.createRadialGradient(px, py, 0, px, py, isMobile ? 220 : 380);
				g1.addColorStop(0, `hsla(28, 95%, 58%, ${glowA})`);
				g1.addColorStop(.55, `hsla(20, 90%, 50%, ${glowA * .35})`);
				g1.addColorStop(1, "transparent");
				ctx.fillStyle = g1;
				ctx.fillRect(0, 0, width, height);
				const g2 = ctx.createRadialGradient(px, py, 0, px, py, 120);
				g2.addColorStop(0, `hsla(38, 100%, 65%, ${glowA * .6})`);
				g2.addColorStop(1, "transparent");
				ctx.fillStyle = g2;
				ctx.fillRect(0, 0, width, height);
			}
			const bx = width * (.85 + Math.sin(t * .7) * .03);
			const by = height * (.9 + Math.cos(t * .5) * .03);
			const bg = ctx.createRadialGradient(bx, by, 0, bx, by, Math.max(width, 500) * .4);
			bg.addColorStop(0, "hsla(24, 90%, 45%, 0.05)");
			bg.addColorStop(1, "transparent");
			ctx.fillStyle = bg;
			ctx.fillRect(0, 0, width, height);
			ctx.lineWidth = .6;
			for (let i = 0; i < embers.length; i++) for (let j = i + 1; j < embers.length; j++) {
				const a = embers[i], b = embers[j];
				const dx = a.x - b.x, dy = a.y - b.y;
				const d2 = dx * dx + dy * dy;
				if (d2 < LINK_DIST * LINK_DIST) {
					const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * .07 * (1 + (a.heat + b.heat) * 2);
					ctx.strokeStyle = `hsla(30, 90%, 60%, ${Math.min(alpha, .25)})`;
					ctx.beginPath();
					ctx.moveTo(a.x, a.y);
					ctx.lineTo(b.x, b.y);
					ctx.stroke();
				}
			}
			for (const p of embers) {
				const dx = px - p.x, dy = py - p.y;
				const dist = Math.hypot(dx, dy);
				const RADIUS = isMobile ? 160 : 240;
				if (dist < RADIUS && dist > 1) {
					const force = (RADIUS - dist) / RADIUS * .012;
					p.vx += dx / dist * force;
					p.vy += dy / dist * force;
					p.heat = Math.min(1, p.heat + .03);
				}
				p.heat *= .985;
				const sp = Math.hypot(p.vx, p.vy);
				const MAX = .9;
				if (sp > MAX) {
					p.vx = p.vx / sp * MAX;
					p.vy = p.vy / sp * MAX;
				}
				p.x += p.vx;
				p.y += p.vy;
				p.vy += -8e-4;
				p.vx *= .995;
				p.vy *= .995;
				if (p.y < -12) {
					p.y = height + 12;
					p.x = Math.random() * width;
					p.heat = 0;
				}
				if (p.x < -12) p.x = width + 12;
				if (p.x > width + 12) p.x = -12;
				const alpha = p.baseA + p.heat * .5;
				const r = p.r + p.heat * 1.6;
				const color = emberColor(p.warm, Math.min(alpha, .9));
				ctx.beginPath();
				ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
				ctx.fillStyle = color;
				ctx.shadowColor = color;
				ctx.shadowBlur = 8 + p.heat * 16;
				ctx.fill();
			}
			ctx.shadowBlur = 0;
			raf = requestAnimationFrame(loop);
		};
		if (!reduced) raf = requestAnimationFrame(loop);
		else {
			const g = ctx.createRadialGradient(width / 2, 0, 0, width / 2, 0, height * .8);
			g.addColorStop(0, "hsla(28, 90%, 50%, 0.07)");
			g.addColorStop(1, "transparent");
			ctx.fillStyle = g;
			ctx.fillRect(0, 0, width, height);
		}
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", setSize);
			window.removeEventListener("pointermove", onMove);
			window.removeEventListener("pointerleave", onLeave);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
		"aria-hidden": true,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
			ref: canvasRef,
			className: "absolute inset-0 h-full w-full"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute inset-0 opacity-[0.04]",
			style: {
				backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
				backgroundSize: "4px 4px"
			}
		})]
	});
}
/**
* Ember cursor — a precise dot with a spring-trailing ring.
* The ring expands with a hot ember glow over interactive elements
* and contracts sharply on press for mechanical feel.
* Hidden on touch / coarse pointers and for reduced motion.
*/
function AuroraCursor() {
	const dotRef = (0, import_react.useRef)(null);
	const ringRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const coarse = window.matchMedia("(pointer: coarse)").matches;
		const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
		if (coarse || reduced) return;
		const dot = dotRef.current;
		const ring = ringRef.current;
		if (!dot || !ring) return;
		let mx = window.innerWidth / 2, my = window.innerHeight / 2;
		let rx = mx, ry = my, vx = 0, vy = 0;
		let isHover = false;
		let isDown = false;
		let visible = false;
		const onMove = (e) => {
			mx = e.clientX;
			my = e.clientY;
			if (!visible) {
				visible = true;
				dot.style.opacity = "1";
				ring.style.opacity = "0.8";
			}
		};
		const hoverable = (target) => target?.closest("a,button,[role='button'],input,textarea,select,label,[data-cursor]");
		const onOver = (e) => {
			if (hoverable(e.target)) isHover = true;
		};
		const onOut = (e) => {
			if (hoverable(e.target)) isHover = false;
		};
		const onDown = () => {
			isDown = true;
		};
		const onUp = () => {
			isDown = false;
		};
		const onLeaveWindow = () => {
			visible = false;
			dot.style.opacity = "0";
			ring.style.opacity = "0";
		};
		window.addEventListener("pointermove", onMove, { passive: true });
		document.addEventListener("pointerover", onOver, true);
		document.addEventListener("pointerout", onOut, true);
		window.addEventListener("pointerdown", onDown);
		window.addEventListener("pointerup", onUp);
		document.documentElement.addEventListener("pointerleave", onLeaveWindow);
		let raf = 0;
		const loop = () => {
			const STIFF = .14;
			const DAMP = .72;
			vx = (vx + (mx - rx) * STIFF) * DAMP;
			vy = (vy + (my - ry) * STIFF) * DAMP;
			rx += vx;
			ry += vy;
			const scale = isDown ? .72 : isHover ? 1.55 : 1;
			dot.style.transform = `translate3d(${mx - 3}px, ${my - 3}px, 0) scale(${isDown ? .6 : 1})`;
			ring.style.transform = `translate3d(${rx - 19}px, ${ry - 19}px, 0) scale(${scale})`;
			ring.style.borderColor = isHover ? "oklch(0.76 0.17 50 / 0.9)" : "oklch(0.7 0.19 42 / 0.55)";
			ring.style.boxShadow = isHover ? "0 0 22px 2px oklch(0.7 0.19 42 / 0.35)" : "0 0 14px 0px oklch(0.7 0.19 42 / 0.18)";
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("pointermove", onMove);
			document.removeEventListener("pointerover", onOver, true);
			document.removeEventListener("pointerout", onOut, true);
			window.removeEventListener("pointerdown", onDown);
			window.removeEventListener("pointerup", onUp);
			document.documentElement.removeEventListener("pointerleave", onLeaveWindow);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: ringRef,
		className: "pointer-events-none fixed left-0 top-0 z-[61] hidden h-[38px] w-[38px] rounded-full border opacity-0 transition-opacity duration-300 md:block",
		"aria-hidden": true
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		ref: dotRef,
		className: "pointer-events-none fixed left-0 top-0 z-[62] hidden h-1.5 w-1.5 rounded-full opacity-0 transition-opacity duration-300 md:block",
		style: {
			background: "oklch(0.8 0.16 50)",
			boxShadow: "0 0 8px oklch(0.7 0.19 42 / 0.9)"
		},
		"aria-hidden": true
	})] });
}
function NotificationOptIn() {
	const { user } = useAuth();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [email, setEmail] = (0, import_react.useState)(true);
	const [push, setPush] = (0, import_react.useState)(true);
	const [busy, setBusy] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (!user) return;
		let cancelled = false;
		(async () => {
			const { data } = await supabase.from("notification_prefs").select("asked_at").eq("user_id", user.id).maybeSingle();
			if (!cancelled && !data?.asked_at) {
				const skipKey = `notif-skipped:${user.id}`;
				if (!(typeof window !== "undefined" && sessionStorage.getItem(skipKey))) setTimeout(() => setOpen(true), 1500);
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [user]);
	const save = async () => {
		if (!user) return;
		setBusy(true);
		try {
			if (push && typeof window !== "undefined" && "Notification" in window) try {
				await Notification.requestPermission();
			} catch {}
			await supabase.from("notification_prefs").upsert({
				user_id: user.id,
				email_opt_in: email,
				push_opt_in: push,
				asked_at: (/* @__PURE__ */ new Date()).toISOString()
			});
			if (email && user.email) await supabase.from("mod_subscribers").upsert({
				user_id: user.id,
				email: user.email
			});
			else if (!email) await supabase.from("mod_subscribers").delete().eq("user_id", user.id);
			playSuccess();
			toast.success("Preferences saved — we'll keep you in the loop");
			setOpen(false);
		} catch (e) {
			toast.error(e instanceof Error ? e.message : "Could not save");
		} finally {
			setBusy(false);
		}
	};
	const skip = () => {
		if (user) sessionStorage.setItem(`notif-skipped:${user.id}`, "1");
		setOpen(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: open && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		className: "fixed inset-0 z-[100] grid place-items-center bg-background/70 backdrop-blur-sm px-4",
		onClick: skip,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				scale: .94,
				y: 20,
				opacity: 0
			},
			animate: {
				scale: 1,
				y: 0,
				opacity: 1
			},
			exit: {
				scale: .94,
				opacity: 0
			},
			onClick: (e) => e.stopPropagation(),
			className: "relative w-full max-w-md overflow-hidden rounded-3xl glass shadow-elev",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				onClick: skip,
				className: "absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full border border-border bg-background/60 text-muted-foreground hover:text-foreground",
				"aria-label": "Close",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative p-7",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
						className: "inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-primary",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3 w-3" }), " Stay in the loop"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "mt-4 font-display text-2xl font-extrabold",
						children: "Get notified on new mods"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted-foreground",
						children: "We drop fresh Dynamons World builds every week. Pick how you want to hear about them."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-6 space-y-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-4 w-4" }),
							label: "Email me on new mod drops",
							value: email,
							onChange: setEmail,
							hint: "Sent to the email on your account"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toggle, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bell, { className: "h-4 w-4" }),
							label: "Browser push notifications",
							value: push,
							onChange: setPush,
							hint: "Instant on this device"
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mt-7 flex gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: skip,
							className: "flex-1 rounded-full border border-border bg-card/60 px-4 py-2.5 text-sm font-semibold",
							children: "Maybe later"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: () => {
								playClick();
								save();
							},
							disabled: busy,
							className: "flex-[1.4] rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground glow-primary disabled:opacity-60",
							style: { background: "var(--gradient-primary)" },
							children: busy ? "Saving…" : "Enable updates"
						})]
					})
				]
			})]
		})
	}) });
}
function Toggle({ icon, label, value, onChange, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick: () => onChange(!value),
		className: `flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-colors ${value ? "border-primary/50 bg-primary/10" : "border-border bg-card/60"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `grid h-9 w-9 place-items-center rounded-xl ${value ? "text-primary-foreground" : "text-muted-foreground bg-background/60"}`,
				style: value ? { background: "var(--gradient-primary)" } : void 0,
				children: icon
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "min-w-0 flex-1",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm font-semibold",
					children: label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: hint
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
				className: `h-5 w-9 rounded-full transition-colors ${value ? "bg-primary" : "bg-border"}`,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `block h-5 w-5 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : ""}` })
			})
		]
	});
}
function PWAInstall() {
	const [deferred, setDeferred] = (0, import_react.useState)(null);
	const [show, setShow] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		if (typeof window === "undefined") return;
		if (sessionStorage.getItem("pwa-dismissed")) return;
		const handler = (e) => {
			e.preventDefault();
			setDeferred(e);
			setTimeout(() => setShow(true), 4e3);
		};
		window.addEventListener("beforeinstallprompt", handler);
		return () => window.removeEventListener("beforeinstallprompt", handler);
	}, []);
	const install = async () => {
		if (!deferred) return;
		await deferred.prompt();
		await deferred.userChoice;
		setShow(false);
		setDeferred(null);
	};
	const dismiss = () => {
		setShow(false);
		sessionStorage.setItem("pwa-dismissed", "1");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: show && deferred && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		initial: {
			opacity: 0,
			y: 30
		},
		animate: {
			opacity: 1,
			y: 0
		},
		exit: {
			opacity: 0,
			y: 30
		},
		className: "fixed bottom-4 left-1/2 z-[90] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-2xl glass p-4 shadow-elev",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-3",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "grid h-10 w-10 place-items-center rounded-xl text-primary-foreground",
					style: { background: "var(--gradient-primary)" },
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Smartphone, { className: "h-5 w-5" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0 flex-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-sm font-semibold",
						children: "Install Dynamon Universe"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "One-tap launch from your home screen."
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: install,
					className: "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-primary-foreground glow-primary",
					style: { background: "var(--gradient-primary)" },
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-3.5 w-3.5" }), " Install"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: dismiss,
					className: "grid h-7 w-7 place-items-center rounded-full border border-border text-muted-foreground",
					"aria-label": "Dismiss",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
				})
			]
		})
	}) });
}
/** Invisible component: triggers daily streak check-in when a user is signed in. */
function DailyCheckIn() {
	const { user } = useAuth();
	const { checkIn } = useGamification();
	(0, import_react.useEffect)(() => {
		if (!user) return;
		if (typeof window === "undefined") return;
		const key = `streak-checkin:${user.id}:${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}`;
		if (sessionStorage.getItem(key)) return;
		sessionStorage.setItem(key, "1");
		checkIn();
	}, [user, checkIn]);
	return null;
}
function AnnouncementBanner() {
	const { announcement } = useSiteSettings();
	const [dismissed, setDismissed] = (0, import_react.useState)(false);
	const key = `announce:${announcement.message}`;
	(0, import_react.useEffect)(() => {
		if (typeof window !== "undefined") setDismissed(localStorage.getItem(key) === "1");
	}, [key]);
	if (!announcement.enabled || !announcement.message || dismissed) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: `relative z-40 border-b bg-gradient-to-r px-4 py-2.5 text-center text-sm font-medium ${announcement.tone === "warning" ? "from-amber-500/30 to-orange-500/20 border-amber-400/40 text-amber-100" : announcement.tone === "success" ? "from-emerald-500/25 to-teal-500/15 border-emerald-400/40 text-emerald-100" : "from-primary/30 to-accent/20 border-primary/40 text-foreground"}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mx-auto flex max-w-7xl items-center justify-center gap-2",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Megaphone, { className: "h-4 w-4 shrink-0" }),
				announcement.href ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
					href: announcement.href,
					target: "_blank",
					rel: "noreferrer",
					className: "hover:underline",
					children: announcement.message
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: announcement.message }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					onClick: () => {
						localStorage.setItem(key, "1");
						setDismissed(true);
					},
					className: "ml-2 grid h-6 w-6 place-items-center rounded-full hover:bg-white/10",
					"aria-label": "Dismiss",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
				})
			]
		})
	});
}
/**
* After the owner OAuth round-trip the browser lands on "/" (the public
* redirect_uri). OwnerGate is no longer mounted there, so its return-to
* effect never fires. This top-level effect picks up the stored path and
* bounces the authenticated user back to the admin area they came from.
*/
var RETURN_KEY = "owner_gate_return_to";
function OwnerReturnRedirect() {
	const { user, loading } = useAuth();
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (loading || !user || typeof window === "undefined") return;
		const back = sessionStorage.getItem(RETURN_KEY);
		if (!back) return;
		sessionStorage.removeItem(RETURN_KEY);
		if (back !== window.location.pathname) navigate({ to: back });
	}, [
		user,
		loading,
		navigate
	]);
	return null;
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "font-display text-7xl font-bold text-gradient",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold",
					children: "Lost in the Dynamon realm"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for has wandered off into the wild."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold text-primary-foreground glow-primary",
						style: { background: "var(--gradient-primary)" },
						children: "Return home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	const router = useRouter();
	const isSpaShellInvariant = typeof error?.message === "string" && error.message.includes("Expected to find a match below the root match");
	(0, import_react.useEffect)(() => {
		if (isSpaShellInvariant) {
			router.invalidate();
			reset();
			return;
		}
		console.error(error);
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [
		error,
		isSpaShellInvariant,
		router,
		reset
	]);
	if (isSpaShellInvariant) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight",
					children: "Something glitched"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Try refreshing the page."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold text-primary-foreground",
						style: { background: "var(--gradient-primary)" },
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-full border border-border px-4 py-2 text-sm",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$16 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "Dynamon Universe — Dynamons World Mod APK Hub" },
			{
				name: "description",
				content: "Dynamon Universe is a fan-made hub dedicated only to Dynamons World mod APKs. Premium builds, community ratings, and weekly drops."
			},
			{
				name: "author",
				content: "Dynamon Universe"
			},
			{
				name: "theme-color",
				content: "#121218"
			},
			{
				property: "og:title",
				content: "Dynamon Universe — Dynamons World Mod APK Hub"
			},
			{
				property: "og:description",
				content: "Premium fan-made Dynamons World mod builds with community ratings, reviews and weekly drops."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Inter:wght@400;500;600;700&display=swap"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$16.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(QueryClientProvider, {
		client: queryClient,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuthProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SiteSettingsProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(GamificationProvider, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuroraBackground, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AuroraCursor, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnnouncementBanner, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(OwnerReturnRedirect, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(NotificationOptIn, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(PWAInstall, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DailyCheckIn, {})
		] }) }) })
	});
}
var $$splitComponentImporter$15 = () => import("./unlock-B1NMhf8q.mjs");
var Route$15 = createFileRoute("/unlock")({
	ssr: false,
	head: () => ({ meta: [
		{ title: "Secure Verification — Dynamon Universe" },
		{
			name: "description",
			content: "Verifying your secure download session."
		},
		{
			name: "robots",
			content: "noindex,nofollow"
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$15, "component")
});
var $$splitComponentImporter$14 = () => import("./profile-BitHH5RA.mjs");
var Route$14 = createFileRoute("/profile")({
	ssr: false,
	head: () => ({ meta: [{ title: "My profile — Dynamon Universe" }, {
		name: "description",
		content: "Edit your trainer identity: display name, avatar and more."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$14, "component")
});
var $$splitComponentImporter$13 = () => import("./mods-Dd90NXwi.mjs");
var Route$13 = createFileRoute("/mods")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
var $$splitComponentImporter$12 = () => import("./generator-DxHQA8sy.mjs");
var head = () => ({ meta: [
	{ title: "Get Your Key — Dynamon Universe" },
	{
		name: "description",
		content: "Verify and claim your Dynamon Universe access key."
	},
	{
		name: "robots",
		content: "noindex"
	}
] });
var Route$12 = createFileRoute("/generator")({
	ssr: false,
	head,
	validateSearch: (s) => ({ ref: typeof s.ref === "string" ? s.ref : void 0 }),
	component: lazyRouteComponent($$splitComponentImporter$12, "component")
});
var $$splitComponentImporter$11 = () => import("./favorites-DGljgMnF.mjs");
var Route$11 = createFileRoute("/favorites")({
	ssr: false,
	head: () => ({ meta: [{ title: "My Favorites — Dynamon Universe" }] }),
	component: lazyRouteComponent($$splitComponentImporter$11, "component")
});
var $$splitComponentImporter$10 = () => import("./disclaimer-BFps4guS.mjs");
var Route$10 = createFileRoute("/disclaimer")({
	head: () => ({ meta: [{ title: "Disclaimer & Safety — Dynamon Universe" }, {
		name: "description",
		content: "Important legal, safety and DMCA information for Dynamon Universe — a fan-made Dynamons World community hub."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$10, "component")
});
var $$splitComponentImporter$9 = () => import("./contact-CKFrKftP.mjs");
var Route$9 = createFileRoute("/contact")({
	head: () => ({ meta: [
		{ title: "Contact — Dynamon Universe" },
		{
			name: "description",
			content: "Reach the Dynamon Universe team for collaborations, mod requests, or bug reports."
		},
		{
			property: "og:title",
			content: "Contact Dynamon Universe"
		},
		{
			property: "og:description",
			content: "Send a message to the Dynamon Universe team."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$9, "component")
});
var $$splitComponentImporter$8 = () => import("./auth-BZoWaiB8.mjs");
var Route$8 = createFileRoute("/auth")({
	ssr: false,
	head: () => ({ meta: [{ title: "Sign in — Dynamon Universe" }, {
		name: "description",
		content: "Create your trainer profile to download Dynamons World mods, leave reviews and join the community."
	}] }),
	component: lazyRouteComponent($$splitComponentImporter$8, "component")
});
var $$splitComponentImporter$7 = () => import("./admin-loader-CenuEK_G.mjs");
var Route$7 = createFileRoute("/admin-loader")({
	ssr: false,
	head: () => ({ meta: [{ title: "OTA Loader — Dynamon Universe" }] }),
	component: lazyRouteComponent($$splitComponentImporter$7, "component")
});
var $$splitComponentImporter$6 = () => import("./admin-keys-Do4ISc2L.mjs");
var Route$6 = createFileRoute("/admin-keys")({
	ssr: false,
	head: () => ({ meta: [{ title: "Key System — Dynamon Universe" }] }),
	component: lazyRouteComponent($$splitComponentImporter$6, "component")
});
var $$splitComponentImporter$5 = () => import("./admin-control-q-0Cv8J7.mjs");
var Route$5 = createFileRoute("/admin-control")({
	ssr: false,
	head: () => ({ meta: [{ title: "Control Panel — Dynamon Universe" }] }),
	component: lazyRouteComponent($$splitComponentImporter$5, "component")
});
var $$splitComponentImporter$4 = () => import("./admin-3FHrToxO.mjs");
var Route$4 = createFileRoute("/admin")({
	ssr: false,
	head: () => ({ meta: [{ title: "Owner Dashboard — Dynamon Universe" }] }),
	component: lazyRouteComponent($$splitComponentImporter$4, "component")
});
var $$splitComponentImporter$3 = () => import("./achievements-DK1QYkk7.mjs");
var Route$3 = createFileRoute("/achievements")({
	ssr: false,
	head: () => ({ meta: [{ title: "Achievements — Dynamon Universe" }] }),
	component: lazyRouteComponent($$splitComponentImporter$3, "component")
});
var $$splitComponentImporter$2 = () => import("./about-DUzMDBev.mjs");
var Route$2 = createFileRoute("/about")({
	head: () => ({ meta: [
		{ title: "About — Dynamon Universe" },
		{
			name: "description",
			content: "Dynamon Universe is a community-built hub focused only on Dynamons World mod APKs. Learn our story and values."
		},
		{
			property: "og:title",
			content: "About Dynamon Universe"
		},
		{
			property: "og:description",
			content: "Why we built the only Dynamons World-focused mod hub."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$2, "component")
});
var $$splitComponentImporter$1 = () => import("./routes-_aApgOfb.mjs");
var Route$1 = createFileRoute("/")({
	head: () => ({ meta: [
		{ title: "Dynamon Universe — Premium Dynamons World Mod APKs" },
		{
			name: "description",
			content: "The home of Dynamons World mod APKs. Carefully crafted fan-made builds, community-rated, with weekly drops."
		},
		{
			property: "og:title",
			content: "Dynamon Universe — Premium Dynamons World Mods"
		},
		{
			property: "og:description",
			content: "Carefully crafted fan-made Dynamons World mod builds, community-rated and updated weekly."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter$1, "component")
});
var $$splitComponentImporter = () => import("./mods.index-Befg12Rq.mjs");
var Route = createFileRoute("/mods/")({
	head: () => ({ meta: [
		{ title: "Mods — Dynamon Universe" },
		{
			name: "description",
			content: "All Dynamons World mod APK builds available on Dynamon Universe. Compare versions, features and ratings."
		},
		{
			property: "og:title",
			content: "All Dynamons World Mods — Dynamon Universe"
		},
		{
			property: "og:description",
			content: "Compare every fan-made Dynamons World mod build on Dynamon Universe."
		}
	] }),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
var UnlockRoute = Route$15.update({
	id: "/unlock",
	path: "/unlock",
	getParentRoute: () => Route$16
});
var ProfileRoute = Route$14.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => Route$16
});
var ModsRoute = Route$13.update({
	id: "/mods",
	path: "/mods",
	getParentRoute: () => Route$16
});
var GeneratorRoute = Route$12.update({
	id: "/generator",
	path: "/generator",
	getParentRoute: () => Route$16
});
var FavoritesRoute = Route$11.update({
	id: "/favorites",
	path: "/favorites",
	getParentRoute: () => Route$16
});
var DisclaimerRoute = Route$10.update({
	id: "/disclaimer",
	path: "/disclaimer",
	getParentRoute: () => Route$16
});
var ContactRoute = Route$9.update({
	id: "/contact",
	path: "/contact",
	getParentRoute: () => Route$16
});
var AuthRoute = Route$8.update({
	id: "/auth",
	path: "/auth",
	getParentRoute: () => Route$16
});
var AdminLoaderRoute = Route$7.update({
	id: "/admin-loader",
	path: "/admin-loader",
	getParentRoute: () => Route$16
});
var AdminKeysRoute = Route$6.update({
	id: "/admin-keys",
	path: "/admin-keys",
	getParentRoute: () => Route$16
});
var AdminControlRoute = Route$5.update({
	id: "/admin-control",
	path: "/admin-control",
	getParentRoute: () => Route$16
});
var AdminRoute = Route$4.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => Route$16
});
var AchievementsRoute = Route$3.update({
	id: "/achievements",
	path: "/achievements",
	getParentRoute: () => Route$16
});
var AboutRoute = Route$2.update({
	id: "/about",
	path: "/about",
	getParentRoute: () => Route$16
});
var IndexRoute = Route$1.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$16
});
var ModsIndexRoute = Route.update({
	id: "/",
	path: "/",
	getParentRoute: () => ModsRoute
});
var ModsRouteChildren = {
	ModsSlugRoute: Route$17.update({
		id: "/$slug",
		path: "/$slug",
		getParentRoute: () => ModsRoute
	}),
	ModsIndexRoute
};
var rootRouteChildren = {
	IndexRoute,
	AboutRoute,
	AchievementsRoute,
	AdminRoute,
	AdminControlRoute,
	AdminKeysRoute,
	AdminLoaderRoute,
	AuthRoute,
	ContactRoute,
	DisclaimerRoute,
	FavoritesRoute,
	GeneratorRoute,
	ModsRoute: ModsRoute._addFileChildren(ModsRouteChildren),
	ProfileRoute,
	UnlockRoute
};
var routeTree = Route$16._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
