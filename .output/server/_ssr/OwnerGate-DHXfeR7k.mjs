import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { p as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { g as useAuth } from "./useSiteSettings-BztHUruL.mjs";
import { N as LoaderCircle, c as TriangleAlert, h as Shield } from "../_libs/lucide-react.mjs";
import { l as useProfile, r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as lovable } from "./lovable-B6gNMDHx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/OwnerGate-DHXfeR7k.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var RETURN_KEY = "owner_gate_return_to";
function OwnerGate({ children }) {
	const { user, loading: authLoading } = useAuth();
	const { profile, loading: profileLoading } = useProfile();
	const navigate = useNavigate();
	const [busy, setBusy] = (0, import_react.useState)(false);
	const [err, setErr] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		if (typeof window === "undefined") return;
		if (!user || !profile?.is_owner) return;
		const back = sessionStorage.getItem(RETURN_KEY);
		if (back && back !== window.location.pathname) {
			sessionStorage.removeItem(RETURN_KEY);
			navigate({ to: back });
		} else if (back) sessionStorage.removeItem(RETURN_KEY);
	}, [
		user,
		profile?.is_owner,
		navigate
	]);
	const signIn = async () => {
		setBusy(true);
		setErr(null);
		try {
			sessionStorage.setItem(RETURN_KEY, window.location.pathname);
			const result = await lovable.auth.signInWithOAuth("google", {
				redirect_uri: window.location.origin,
				extraParams: { prompt: "select_account" }
			});
			if (result.error) {
				setErr(result.error.message || "Google sign-in failed");
				sessionStorage.removeItem(RETURN_KEY);
				setBusy(false);
			}
		} catch (e) {
			setErr(e instanceof Error ? e.message : "Sign-in failed");
			sessionStorage.removeItem(RETURN_KEY);
			setBusy(false);
		}
	};
	if (authLoading || profileLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "text-center text-muted-foreground",
		children: "Loading…"
	}) });
	if (!user) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md rounded-3xl glass p-8 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground",
				style: { background: "linear-gradient(135deg,#f59e0b,#f97316)" },
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-7 w-7" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-5 font-display text-2xl font-extrabold",
				children: "Owner sign-in"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm text-muted-foreground",
				children: "The control panel is restricted to the site owner. Sign in with the owner Google account to continue."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: signIn,
				disabled: busy,
				className: "mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full border border-border bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition-transform hover:scale-[1.02] disabled:opacity-60",
				children: [busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GoogleIcon, {}), "Continue with Google"]
			}),
			err && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-4 inline-flex items-center gap-2 rounded-xl border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-3.5 w-3.5" }),
					" ",
					err
				]
			})
		]
	}) });
	if (!profile?.is_owner) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto max-w-md rounded-3xl glass p-8 text-center",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-rose-500/20 text-rose-300",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TriangleAlert, { className: "h-7 w-7" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-5 font-display text-2xl font-extrabold",
				children: "Not authorized"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "mt-2 text-sm text-muted-foreground",
				children: [
					"You're signed in as ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "font-semibold",
						children: user.email
					}),
					", but this area is owner-only. Sign out and sign in with the owner Google account."
				]
			})
		]
	}) });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children });
}
function GoogleIcon() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", {
		viewBox: "0 0 48 48",
		className: "h-4 w-4",
		"aria-hidden": true,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#FFC107",
				d: "M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#FF3D00",
				d: "M6.3 14.7l6.6 4.8C14.6 16 19 13 24 13c3 0 5.8 1.1 8 3l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#4CAF50",
				d: "M24 44c5.4 0 10.3-2.1 14-5.4l-6.5-5.3c-2 1.4-4.6 2.3-7.5 2.3-5.3 0-9.7-3.4-11.3-8L6 32.6C9.2 39 16.1 44 24 44z"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", {
				fill: "#1976D2",
				d: "M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.4l6.5 5.3C41.4 35.7 44 30.3 44 24c0-1.2-.1-2.3-.4-3.5z"
			})
		]
	});
}
//#endregion
export { OwnerGate as t };
