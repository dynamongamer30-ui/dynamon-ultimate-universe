import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { d as playClick } from "./useSiteSettings-BztHUruL.mjs";
import { F as KeyRound } from "../_libs/lucide-react.mjs";
import { t as GEN_WORKER_URL } from "./dgWorker-i6XEWvUe.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/UnlockKeyButton-DX-Q4cpR.js
var import_jsx_runtime = require_jsx_runtime();
function UnlockKeyButton({ variant = "primary", label = "Get Free Key", className = "" }) {
	const onClick = () => {
		playClick();
		const url = GEN_WORKER_URL ? `${GEN_WORKER_URL}/start` : "/generator";
		window.location.assign(url);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
		onClick,
		className: `press inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold transition-[filter] hover:brightness-110 ${variant === "primary" ? "bg-primary text-primary-foreground glow-primary" : "border border-primary/40 bg-card text-primary hover:border-primary hover:bg-primary/10"} ${className}`,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" }), label]
	});
}
//#endregion
export { UnlockKeyButton as t };
