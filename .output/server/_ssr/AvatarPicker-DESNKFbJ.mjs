import { o as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { p as playSoft } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { rt as Check } from "../_libs/lucide-react.mjs";
import { s as avatars } from "./PageShell-CQ5VKW-E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AvatarPicker-DESNKFbJ.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function AvatarPicker({ value, onChange, gender }) {
	const [style, setStyle] = (0, import_react.useState)("trainer");
	const list = avatars.filter((a) => {
		if (a.style !== style) return false;
		if (gender === "male" || gender === "female") return a.gender === gender;
		return true;
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-3",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "inline-flex rounded-full border border-border bg-card/60 p-1 text-xs font-semibold",
			children: ["trainer", "anime"].map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => {
					setStyle(s);
					playSoft();
				},
				className: `rounded-full px-4 py-1.5 capitalize transition-colors ${style === s ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`,
				style: style === s ? { background: "var(--gradient-primary)" } : void 0,
				children: s === "trainer" ? "Trainer style" : "Anime style"
			}, s))
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid grid-cols-4 gap-3 sm:grid-cols-5",
			children: list.map((a) => {
				const selected = value === a.id;
				return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					type: "button",
					onClick: () => {
						onChange(a.id);
						playSoft();
					},
					className: `group relative aspect-square overflow-hidden rounded-2xl border-2 transition-all ${selected ? "border-primary ring-2 ring-primary/40 scale-[1.03]" : "border-border hover:border-primary/40"}`,
					"aria-pressed": selected,
					"aria-label": a.label,
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: a.url,
							alt: a.label,
							className: "h-full w-full object-cover transition-transform group-hover:scale-110",
							loading: "lazy",
							width: 256,
							height: 256
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "absolute inset-x-0 bottom-1 truncate px-2 text-[10px] font-semibold uppercase tracking-wider text-white/90",
							children: a.label
						}),
						selected && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
							initial: { scale: 0 },
							animate: { scale: 1 },
							className: "absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full text-primary-foreground",
							style: { background: "var(--gradient-primary)" },
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-3.5 w-3.5" })
						})
					]
				}, a.id);
			})
		})]
	});
}
//#endregion
export { AvatarPicker as t };
