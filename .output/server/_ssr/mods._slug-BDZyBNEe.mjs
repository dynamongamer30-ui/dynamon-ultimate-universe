import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mods._slug-BDZyBNEe.js
var import_jsx_runtime = require_jsx_runtime();
var SplitNotFoundComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PageShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
	className: "py-20 text-center",
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
			className: "font-display text-3xl font-bold",
			children: "Mod not found"
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "mt-2 text-muted-foreground",
			children: "It might have been renamed or removed."
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/mods",
			className: "mt-6 inline-block text-primary hover:underline",
			children: "Back to all mods"
		})
	]
}) });
//#endregion
export { SplitNotFoundComponent as notFoundComponent };
