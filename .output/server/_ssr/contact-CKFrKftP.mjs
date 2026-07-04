import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { d as playClick, m as playSuccess } from "./useSiteSettings-BztHUruL.mjs";
import { k as Mail, y as Send } from "../_libs/lucide-react.mjs";
import { i as SocialStrip, r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/contact-CKFrKftP.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Contact() {
	const [form, setForm] = (0, import_react.useState)({
		name: "",
		email: "",
		message: ""
	});
	const submit = (e) => {
		e.preventDefault();
		if (!form.message.trim()) return;
		playSuccess();
		toast.success("Message sent — we'll reply on your favorite channel.");
		setForm({
			name: "",
			email: "",
			message: ""
		});
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "grid gap-10 lg:grid-cols-[1fr_1.2fr]",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "inline-block h-px w-8 bg-primary",
					"aria-hidden": true
				}), "Get in touch"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-5xl",
				children: "Let's talk Dynamons."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-4 leading-relaxed text-muted-foreground text-pretty",
				children: "Found a bug in a build? Want an edition we haven't made yet? Making content and looking to collab? This inbox is read by the same people who test the mods — not a support bot. Tell us the edition, your device, and what happened, and we'll get you a real answer. For the fastest replies, ping us on WhatsApp or Telegram."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-6",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SocialStrip, { variant: "compact" })
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
			onSubmit: submit,
			className: "edge-light rounded-2xl glass p-6 sm:p-8",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid gap-4 sm:grid-cols-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						required: true,
						value: form.name,
						onChange: (e) => setForm({
							...form,
							name: e.target.value
						}),
						placeholder: "Your name",
						className: "rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						required: true,
						type: "email",
						value: form.email,
						onChange: (e) => setForm({
							...form,
							email: e.target.value
						}),
						placeholder: "Your email",
						className: "rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
					required: true,
					rows: 6,
					value: form.message,
					onChange: (e) => setForm({
						...form,
						message: e.target.value
					}),
					placeholder: "How can we help?",
					className: "mt-4 w-full resize-none rounded-xl border border-border bg-background/60 px-4 py-3 text-sm outline-none focus:border-primary"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "submit",
					onMouseDown: playClick,
					className: "press mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-bold text-primary-foreground glow-primary transition-[filter] hover:brightness-110",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, { className: "h-4 w-4" }), " Send message"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3 w-3" }), " Or email hello@dynamon.universe"]
				})
			]
		})]
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "mt-16",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SocialStrip, {})
	})] });
}
//#endregion
export { Contact as component };
