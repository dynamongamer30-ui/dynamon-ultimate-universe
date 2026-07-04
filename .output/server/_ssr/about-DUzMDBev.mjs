import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { i as Users, p as Sparkles, z as Heart } from "../_libs/lucide-react.mjs";
import { i as SocialStrip, r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/about-DUzMDBev.js
var import_jsx_runtime = require_jsx_runtime();
function About() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "relative overflow-hidden edge-light rounded-2xl glass p-8 sm:p-14",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
					className: "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "inline-block h-px w-8 bg-primary",
						"aria-hidden": true
					}), "Our story"]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "mt-4 font-display text-4xl font-black uppercase tracking-tight text-balance sm:text-5xl",
					children: "Built by Dynamon fans, for Dynamon fans."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-5 max-w-2xl leading-relaxed text-muted-foreground text-pretty",
					children: "We grew up training, battling, and collecting in Dynamons World — and we got tired of hunting for mods on sketchy aggregator sites buried under popups, fake download buttons, and builds for a hundred games we didn't play. So we built the site we wanted: one focused vault, dedicated entirely to Dynamons World. Every edition is hand-tested on real devices before it ships, every changelog is honest, and every download is exactly what it says it is. That's the whole promise."
				})
			]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "mt-10 grid gap-6 sm:grid-cols-3",
			children: [
				{
					Icon: Sparkles,
					title: "Focused",
					text: "Only Dynamons World. One game, eight editions, zero clutter — we will never dilute the vault with other titles."
				},
				{
					Icon: Heart,
					title: "Crafted",
					text: "Every build is installed, played, and stress-tested on real devices before it goes live. If it crashes for us, it never ships to you."
				},
				{
					Icon: Users,
					title: "Community",
					text: "Ratings, reviews, and requests from trainers like you decide which editions we feature and what we build next."
				}
			].map(({ Icon, title, text }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "rounded-2xl glass p-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid h-10 w-10 place-items-center rounded-xl text-primary-foreground",
						style: { background: "var(--gradient-primary)" },
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "mt-4 font-display text-lg font-bold",
						children: title
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-1 text-sm text-muted-foreground",
						children: text
					})
				]
			}, title))
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
			className: "mt-16",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SocialStrip, {})
		})
	] });
}
//#endregion
export { About as component };
