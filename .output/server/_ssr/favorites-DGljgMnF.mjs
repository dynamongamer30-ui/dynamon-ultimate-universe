import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { f as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { g as useAuth, u as mods } from "./useSiteSettings-BztHUruL.mjs";
import { z as Heart } from "../_libs/lucide-react.mjs";
import { r as PageShell } from "./PageShell-CQ5VKW-E.mjs";
import { t as ModCard } from "./ModCard-DHGFddOX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/favorites-DGljgMnF.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function FavoritesPage() {
	const { user } = useAuth();
	const [slugs, setSlugs] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	(0, import_react.useEffect)(() => {
		if (!user) {
			setLoading(false);
			return;
		}
		(async () => {
			const { data } = await supabase.from("favorites").select("mod_slug").eq("user_id", user.id);
			setSlugs((data ?? []).map((r) => r.mod_slug));
			setLoading(false);
		})();
	}, [user]);
	const favs = mods.filter((m) => slugs.includes(m.slug));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PageShell, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
		className: "edge-light rounded-2xl glass p-8 sm:p-12",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-rose-300",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Heart, { className: "h-3.5 w-3.5 fill-rose-400" }), " Your Vault"]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-3 font-display text-4xl font-black uppercase tracking-tight sm:text-5xl",
				children: "My favorites"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-3 max-w-2xl text-muted-foreground",
				children: "Bookmarked mods you've saved for later."
			})
		]
	}), !user ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
			to: "/auth",
			className: "font-semibold text-primary hover:underline",
			children: "Sign in"
		}), " to start saving mods."]
	}) : loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
		className: "mt-10 text-center text-sm text-muted-foreground",
		children: "Loading…"
	}) : favs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "mt-10 rounded-3xl border border-dashed border-border bg-card/30 p-10 text-center text-muted-foreground",
		children: "No favorites yet. Tap the heart on any mod to save it here."
	}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", {
		className: "mt-8 grid gap-6 sm:grid-cols-2 xl:grid-cols-3",
		children: favs.map((m, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ModCard, {
			mod: m,
			index: i
		}, m.slug))
	})] });
}
//#endregion
export { FavoritesPage as component };
