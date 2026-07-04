import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { $ as CircleX, J as Download, M as LockOpen, N as LoaderCircle, U as FingerprintPattern, X as Cpu, d as Timer, dt as ArrowLeft, g as ShieldCheck, j as Lock, tt as CircleCheck } from "../_libs/lucide-react.mjs";
import { t as getFingerprint } from "./fingerprint-PAPTh6Nt.mjs";
import { t as confetti_module_default } from "../_libs/canvas-confetti.mjs";
import { t as require_crypto_js } from "../_libs/crypto-js.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/unlock-B1NMhf8q.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var import_crypto_js = /* @__PURE__ */ __toESM(require_crypto_js());
var AES_KEY = "dynamongamer-2026-best-modder";
var Cipher = {
	encrypt(text) {
		return import_crypto_js.default.AES.encrypt(text, AES_KEY).toString();
	},
	decrypt(ct) {
		return import_crypto_js.default.AES.decrypt(ct, AES_KEY).toString(import_crypto_js.default.enc.Utf8);
	}
};
var INITIAL_STAGES = [
	{
		id: 0,
		title: "Initialize Secure Channel",
		Icon: Lock,
		status: "pending"
	},
	{
		id: 1,
		title: "Fetch Security Config",
		Icon: Timer,
		status: "pending"
	},
	{
		id: 2,
		title: "Verify Session Token",
		Icon: ShieldCheck,
		status: "pending"
	},
	{
		id: 3,
		title: "Check Device Fingerprint",
		Icon: FingerprintPattern,
		status: "pending"
	},
	{
		id: 4,
		title: "Validate Timestamp",
		Icon: Cpu,
		status: "pending"
	},
	{
		id: 5,
		title: "Decrypt Payload",
		Icon: LockOpen,
		status: "pending"
	}
];
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function mapRedeemError(code) {
	switch (code) {
		case "not_found": return "Session token not found.";
		case "already_used": return "This download link was already used.";
		case "fingerprint_mismatch": return "Device mismatch. Start the download on the same device.";
		case "version_mismatch": return "Session version mismatch. Please try again.";
		case "expired": return "Session expired. Please start again.";
		case "too_fast": return "Verification too fast. Please complete all steps.";
		case "no_link": return "No download link available for this session.";
		case "invalid_token": return "Invalid session token.";
		case "invalid_fingerprint": return "Could not verify this device.";
		default: return "Verification failed. Please try again.";
	}
}
function MatrixRain() {
	const ref = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		const c = ref.current;
		if (!c) return;
		const ctx = c.getContext("2d");
		if (!ctx) return;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		let w = c.width = window.innerWidth;
		let h = c.height = window.innerHeight;
		const chars = "アァカサタナハマヤラワ0123456789ABCDEF$#@*+=<>".split("");
		const fontSize = 14;
		let columns = Math.floor(w / fontSize);
		let drops = Array(columns).fill(1);
		const onResize = () => {
			w = c.width = window.innerWidth;
			h = c.height = window.innerHeight;
			columns = Math.floor(w / fontSize);
			drops = Array(columns).fill(1);
		};
		window.addEventListener("resize", onResize);
		let raf = 0;
		const draw = () => {
			ctx.fillStyle = "rgba(0,0,0,0.08)";
			ctx.fillRect(0, 0, w, h);
			ctx.fillStyle = "rgba(255,69,0,0.35)";
			ctx.font = `${fontSize}px monospace`;
			for (let i = 0; i < drops.length; i++) {
				const text = chars[Math.floor(Math.random() * chars.length)];
				ctx.fillText(text, i * fontSize, drops[i] * fontSize);
				if (drops[i] * fontSize > h && Math.random() > .975) drops[i] = 0;
				drops[i]++;
			}
			raf = requestAnimationFrame(draw);
		};
		raf = requestAnimationFrame(draw);
		return () => {
			cancelAnimationFrame(raf);
			window.removeEventListener("resize", onResize);
		};
	}, []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("canvas", {
		ref,
		className: "pointer-events-none fixed inset-0 -z-10 opacity-60"
	});
}
function ProgressRing({ pct }) {
	const size = 84;
	const stroke = 6;
	const r = (size - stroke) / 2;
	const c = 2 * Math.PI * r;
	const offset = c - pct / 100 * c;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative",
		style: {
			width: size,
			height: size
		},
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
			width: size,
			height: size,
			className: "-rotate-90",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: size / 2,
				cy: size / 2,
				r,
				stroke: "rgba(255,255,255,0.08)",
				strokeWidth: stroke,
				fill: "none"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", {
				cx: size / 2,
				cy: size / 2,
				r,
				stroke: "#FF4500",
				strokeWidth: stroke,
				fill: "none",
				strokeDasharray: c,
				strokeDashoffset: offset,
				strokeLinecap: "round",
				style: {
					filter: "drop-shadow(0 0 8px rgba(255,69,0,0.7))",
					transition: "stroke-dashoffset 400ms ease"
				}
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "absolute inset-0 grid place-items-center font-mono text-sm font-bold text-orange-400",
			children: [Math.round(pct), "%"]
		})]
	});
}
function UnlockPage() {
	const [stages, setStages] = (0, import_react.useState)(INITIAL_STAGES);
	const [done, setDone] = (0, import_react.useState)(false);
	const [downloadUrl, setDownloadUrl] = (0, import_react.useState)(null);
	const [fatalError, setFatalError] = (0, import_react.useState)(null);
	const ran = (0, import_react.useRef)(false);
	const pct = stages.filter((s) => s.status === "done").length / stages.length * 100;
	(0, import_react.useEffect)(() => {
		if (ran.current) return;
		ran.current = true;
		run();
	}, []);
	const setStage = (id, patch) => setStages((prev) => prev.map((s) => s.id === id ? {
		...s,
		...patch
	} : s));
	async function runStage(id, fn) {
		setStage(id, { status: "running" });
		await sleep(420 + Math.random() * 180);
		try {
			const r = await fn();
			setStage(id, { status: "done" });
			return r;
		} catch (e) {
			const msg = e instanceof Error ? e.message : String(e);
			setStage(id, {
				status: "error",
				message: msg
			});
			throw e;
		}
	}
	async function run() {
		try {
			const token = await runStage(0, async () => {
				const raw = typeof window !== "undefined" ? localStorage.getItem("dg_token") : null;
				if (!raw) throw new Error("No session token found.");
				let decoded = "";
				try {
					decoded = Cipher.decrypt(raw);
				} catch {
					decoded = raw;
				}
				if (!decoded) throw new Error("Failed to read session token.");
				if (!UUID_RE.test(decoded)) throw new Error("Invalid session token format.");
				return decoded;
			});
			const fingerprint = await runStage(1, async () => {
				const fp = await getFingerprint();
				if (!fp) throw new Error("Could not compute device fingerprint.");
				return fp;
			});
			const version = new URLSearchParams(window.location.search).get("v");
			let redeemed = null;
			await runStage(2, async () => {
				const { data, error } = await supabase.rpc("redeem_secure_session", {
					p_token: token,
					p_fingerprint: fingerprint,
					p_version: version
				});
				if (error) throw new Error("Secure channel error. Please try again.");
				redeemed = data;
				if (!redeemed || !redeemed.ok) throw new Error(mapRedeemError(redeemed?.error));
			});
			await runStage(3, async () => {});
			await runStage(4, async () => {});
			const url = await runStage(5, async () => {
				const r = redeemed;
				let out = r.link || "";
				if (r.encrypted && out) try {
					out = Cipher.decrypt(out);
				} catch (e) {
					throw new Error(`Cipher error: ${e instanceof Error ? e.message : "unknown"}`);
				}
				if (!out) throw new Error("No download link available.");
				return out;
			});
			try {
				localStorage.removeItem("dg_token");
			} catch {}
			setDownloadUrl(url);
			setDone(true);
			if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) confetti_module_default({
				particleCount: 140,
				spread: 80,
				origin: { y: .6 },
				colors: [
					"#FF4500",
					"#F59E0B",
					"#FBBF24",
					"#FFFFFF"
				]
			});
			setTimeout(() => {
				window.location.href = url;
			}, 2e3);
		} catch (e) {
			setFatalError(e instanceof Error ? e.message : String(e));
		}
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative min-h-screen overflow-hidden bg-[#080808] text-white",
		style: { fontFamily: "'DM Sans', system-ui, sans-serif" },
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MatrixRain, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "pointer-events-none fixed inset-0 -z-10",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-orange-600/20 blur-[120px]" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-1/3 -right-32 h-[460px] w-[460px] rounded-full bg-amber-500/15 blur-[140px]" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -bottom-32 left-1/4 h-[420px] w-[420px] rounded-full bg-orange-500/10 blur-[150px]" })
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "relative mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-5 py-12",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "w-full rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_-30px_rgba(255,69,0,0.45)] backdrop-blur-xl sm:p-8",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "mb-6 h-1.5 w-full overflow-hidden rounded-full bg-white/5",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-500",
								style: {
									width: `${pct}%`,
									boxShadow: "0 0 18px rgba(255,69,0,0.55)"
								}
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mb-6 flex items-center gap-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ProgressRing, { pct }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "min-w-0",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-2xl font-bold tracking-tight text-white sm:text-[1.6rem]",
									style: { fontFamily: "'Space Grotesk', system-ui, sans-serif" },
									children: "Secure Verification"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-sm text-white/60",
									children: "Verifying your download session…"
								})]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
							className: "space-y-2.5",
							children: stages.map((s) => {
								const I = s.Icon;
								return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
									className: "flex items-start gap-3 rounded-xl border border-white/5 bg-black/30 px-3.5 py-3",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-orange-500/10 text-orange-400 ring-1 ring-orange-500/20",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(I, { className: "h-4 w-4" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "min-w-0 flex-1",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-center justify-between gap-2",
											children: [
												/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
													className: "text-sm font-medium text-white/90",
													children: s.title
												}),
												s.status === "running" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin text-orange-400" }),
												s.status === "done" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, {
													className: "h-4 w-4",
													style: { color: "#22C55E" }
												}),
												s.status === "error" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleX, {
													className: "h-4 w-4",
													style: { color: "#EF4444" }
												}),
												s.status === "pending" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "h-2 w-2 rounded-full bg-white/20" })
											]
										}), s.status === "error" && s.message && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
											className: "mt-1 text-xs text-red-400",
											children: s.message
										})]
									})]
								}, s.id);
							})
						}),
						done && downloadUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-base font-semibold text-emerald-400",
									children: "Verification Complete!"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-white/60",
									children: "Redirecting to download in 2 seconds…"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
									href: downloadUrl,
									className: "mt-3 inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-black shadow-[0_10px_30px_-10px_rgba(255,69,0,0.8)] transition hover:brightness-110",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }), " Download Now"]
								})
							]
						}),
						fatalError && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "mt-6 rounded-xl border border-red-500/30 bg-red-500/5 p-4 text-center",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-sm font-semibold text-red-400",
									children: "Verification failed"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "mt-1 text-xs text-white/60",
									children: fatalError
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
									to: "/",
									className: "mt-3 inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:bg-white/10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowLeft, { className: "h-3.5 w-3.5" }), " Return Home"]
								})
							]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-6 text-center text-[11px] text-white/30",
					children: "Protected session • Single-use token • Device-bound"
				})]
			})
		]
	});
}
//#endregion
export { UnlockPage as component };
