import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { m as useSearch } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { C as RefreshCw, F as KeyRound, N as LoaderCircle, Z as Copy, g as ShieldCheck, p as Sparkles, q as ExternalLink } from "../_libs/lucide-react.mjs";
import { r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { a as generateKey, i as checkToken, l as startGate, n as TURNSTILE_SITE_KEY } from "./dgWorker-i6XEWvUe.mjs";
import { t as getFingerprint } from "./fingerprint-PAPTh6Nt.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/generator-DxHQA8sy.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var TURNSTILE_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
function loadTurnstile() {
	return new Promise((resolve, reject) => {
		if (window.turnstile) return resolve();
		const existing = document.querySelector(`script[src="${TURNSTILE_SRC}"]`);
		if (existing) {
			existing.addEventListener("load", () => resolve(), { once: true });
			existing.addEventListener("error", () => reject(/* @__PURE__ */ new Error("turnstile_load_failed")), { once: true });
			return;
		}
		const s = document.createElement("script");
		s.src = TURNSTILE_SRC;
		s.async = true;
		s.defer = true;
		s.onload = () => resolve();
		s.onerror = () => reject(/* @__PURE__ */ new Error("turnstile_load_failed"));
		document.head.appendChild(s);
	});
}
function Particles() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		"aria-hidden": true,
		className: "pointer-events-none fixed inset-0 -z-10 overflow-hidden",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute -top-32 -left-24 h-[480px] w-[480px] rounded-full bg-amber-500/20 blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute top-1/3 right-0 h-[420px] w-[420px] rounded-full bg-orange-500/15 blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute bottom-0 left-1/3 h-[360px] w-[360px] rounded-full bg-yellow-400/10 blur-3xl" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(251,191,36,0.08),transparent_60%)]" })
		]
	});
}
function Orb({ pulse }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative mx-auto h-28 w-28",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: `absolute inset-0 rounded-full bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 ${pulse ? "animate-pulse" : ""}`,
			style: { boxShadow: "0 0 80px 10px rgba(251,191,36,0.45)" }
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "absolute inset-3 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-10 w-10 text-amber-300" })
		})]
	});
}
var REASON_TEXT = {
	not_found: "This access link is invalid.",
	missing: "Access link is missing.",
	used: "This link was already used.",
	expired: "Link expired (10 minute limit). Please get a new one.",
	invalid_token: "Access link is invalid.",
	token_used: "This link was already used.",
	token_expired: "Link expired. Please get a new one."
};
function reasonMessage(reason) {
	if (!reason) return "Link invalid.";
	return REASON_TEXT[reason] || "Link invalid.";
}
function GeneratorPage() {
	const ref = useSearch({ from: "/generator" }).ref;
	const [phase, setPhase] = (0, import_react.useState)({ kind: "loading" });
	const [turnstileToken, setTurnstileToken] = (0, import_react.useState)("");
	const [fingerprint, setFingerprint] = (0, import_react.useState)("");
	const [submitting, setSubmitting] = (0, import_react.useState)(false);
	const widgetRef = (0, import_react.useRef)(null);
	const widgetIdRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		let cancelled = false;
		(async () => {
			if (!ref) {
				setPhase({
					kind: "invalid",
					reason: "missing"
				});
				return;
			}
			setPhase({ kind: "loading" });
			const res = await checkToken(ref);
			if (cancelled) return;
			if (!res.valid) {
				setPhase({
					kind: "invalid",
					reason: res.reason || "not_found"
				});
				return;
			}
			setPhase({ kind: "ready" });
		})();
		return () => {
			cancelled = true;
		};
	}, [ref]);
	(0, import_react.useEffect)(() => {
		if (phase.kind !== "ready") return;
		getFingerprint().then(setFingerprint).catch(() => toast.error("Could not compute device fingerprint"));
	}, [phase.kind]);
	(0, import_react.useEffect)(() => {
		if (phase.kind !== "ready") return;
		let cancelled = false;
		loadTurnstile().then(() => {
			if (cancelled || !widgetRef.current || !window.turnstile) return;
			widgetRef.current.innerHTML = "";
			widgetIdRef.current = window.turnstile.render(widgetRef.current, {
				sitekey: TURNSTILE_SITE_KEY,
				theme: "dark",
				callback: (token) => setTurnstileToken(token),
				"error-callback": () => {
					setTurnstileToken("");
					toast.error("Captcha error — please retry");
				},
				"expired-callback": () => {
					setTurnstileToken("");
				}
			});
		}).catch(() => toast.error("Failed to load captcha"));
		return () => {
			cancelled = true;
		};
	}, [phase.kind]);
	const resetTurnstile = (0, import_react.useCallback)(() => {
		setTurnstileToken("");
		if (window.turnstile && widgetIdRef.current) try {
			window.turnstile.reset(widgetIdRef.current);
		} catch {}
	}, []);
	const onGenerate = async () => {
		if (!ref || !turnstileToken || !fingerprint) return;
		setSubmitting(true);
		const res = await generateKey({
			accessToken: ref,
			turnstileToken,
			fingerprint
		});
		setSubmitting(false);
		if (res.ok) {
			setPhase({
				kind: "success",
				key: res.key,
				remaining: res.remaining,
				hours: 24
			});
			toast.success("Key generated!");
			resetTurnstile();
			return;
		}
		const err = res.error;
		switch (err) {
			case "maintenance":
				toast.error("Generator is under maintenance, try later");
				break;
			case "captcha_failed":
				toast.error("Captcha failed — please try again");
				resetTurnstile();
				break;
			case "rate_limited":
				toast.error(`Limit reached. Try again in ${res.resetInMinutes ?? "a few"} minutes`);
				break;
			case "invalid_token":
			case "token_used":
			case "token_expired":
				toast.error("Link invalid — please get a new key");
				setPhase({
					kind: "invalid",
					reason: err
				});
				break;
			default:
				toast.error("Something went wrong, retry");
				resetTurnstile();
				break;
		}
	};
	const copyKey = async (k) => {
		try {
			await navigator.clipboard.writeText(k);
			toast.success("Key copied to clipboard");
		} catch {
			toast.error("Could not copy");
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Particles, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-xl py-8",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "rounded-2xl border border-amber-500/20 bg-black/40 p-8 backdrop-blur-xl shadow-[0_0_60px_-10px_rgba(251,191,36,0.25)]",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-6 flex flex-col items-center gap-3 text-center",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Orb, { pulse: phase.kind === "loading" || submitting }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent",
							children: "Get Your Access Key"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-amber-100/70",
							children: "Verify you're human to claim your one-time Dynamon Universe key."
						})
					]
				}),
				phase.kind === "loading" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center gap-3 py-10 text-amber-200/80",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-6 w-6 animate-spin" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Validating your access link…" })]
				}),
				phase.kind === "invalid" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center gap-4 py-6 text-center",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-lg text-amber-100",
						children: reasonMessage(phase.reason)
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						onClick: () => window.location.assign(startGate()),
						className: "bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "mr-2 h-4 w-4" }), "Get a New Key"]
					})]
				}),
				phase.kind === "ready" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center gap-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1 text-xs text-amber-200",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-3.5 w-3.5" }), "Link verified — complete the captcha"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							ref: widgetRef,
							className: "min-h-[70px]"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-amber-100/50",
							children: ["Device: ", fingerprint ? `${fingerprint.slice(0, 10)}…` : "computing…"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							onClick: onGenerate,
							disabled: !turnstileToken || !fingerprint || submitting,
							className: "w-full bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400 disabled:opacity-50",
							children: submitting ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }), "Generating…"] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "mr-2 h-4 w-4" }), "Generate Key"] })
						})
					]
				}),
				phase.kind === "success" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center gap-5 py-2",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-xs text-amber-200",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-3.5 w-3.5" }),
								phase.remaining,
								" key",
								phase.remaining === 1 ? "" : "s",
								" remaining today"
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: () => copyKey(phase.key),
							className: "group w-full rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-5 text-center transition hover:border-amber-400/60",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-mono text-3xl tracking-widest text-amber-200 group-hover:text-amber-100",
								children: phase.key
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "mt-2 inline-flex items-center gap-1 text-xs text-amber-100/60",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "h-3 w-3" }), "Tap to copy"]
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
							className: "text-sm text-amber-100/70",
							children: [
								"Valid for ",
								phase.hours,
								" hours from first activation."
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex w-full flex-col gap-2 sm:flex-row",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									onClick: () => copyKey(phase.key),
									variant: "outline",
									className: "flex-1 border-amber-500/30 text-amber-100 hover:bg-amber-500/10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Copy, { className: "mr-2 h-4 w-4" }), "Copy Key"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									onClick: () => window.location.assign(startGate()),
									variant: "outline",
									className: "flex-1 border-amber-500/30 text-amber-100 hover:bg-amber-500/10",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RefreshCw, { className: "mr-2 h-4 w-4" }), "Get Another"]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
									onClick: () => window.open("https://dynamonsworld.com", "_blank"),
									className: "flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-black hover:from-amber-400 hover:to-orange-400",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ExternalLink, { className: "mr-2 h-4 w-4" }), "Open App"]
								})
							]
						})
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-4 text-center text-xs text-amber-100/40",
			children: "One key per device. Sharing keys may result in a ban."
		})]
	})] });
}
//#endregion
export { GeneratorPage as component };
