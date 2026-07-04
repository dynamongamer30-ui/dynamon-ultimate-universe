import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { p as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { _ as useGamification, g as useAuth, p as playSoft } from "./useSiteSettings-BztHUruL.mjs";
import { t as motion } from "../_libs/motion.mjs";
import { ot as Bookmark } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/FavoriteButton-mWjx10mE.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useFavorites() {
	const { user } = useAuth();
	const [slugs, setSlugs] = (0, import_react.useState)([]);
	const [loading, setLoading] = (0, import_react.useState)(true);
	const refresh = (0, import_react.useCallback)(async () => {
		if (!user) {
			setSlugs([]);
			setLoading(false);
			return;
		}
		setLoading(true);
		const { data } = await supabase.from("favorites").select("mod_slug").eq("user_id", user.id);
		setSlugs((data ?? []).map((r) => r.mod_slug));
		setLoading(false);
	}, [user]);
	(0, import_react.useEffect)(() => {
		refresh();
	}, [refresh]);
	return {
		slugs,
		loading,
		refresh,
		toggle: (0, import_react.useCallback)(async (slug) => {
			if (!user) return false;
			if (slugs.includes(slug)) {
				setSlugs((p) => p.filter((s) => s !== slug));
				await supabase.from("favorites").delete().eq("user_id", user.id).eq("mod_slug", slug);
				return false;
			}
			setSlugs((p) => [...p, slug]);
			await supabase.from("favorites").insert({
				user_id: user.id,
				mod_slug: slug
			});
			return true;
		}, [user, slugs]),
		has: (s) => slugs.includes(s)
	};
}
function FavoriteButton({ slug, className = "" }) {
	const { user } = useAuth();
	const { has, toggle, slugs } = useFavorites();
	const { award, grant } = useGamification();
	const navigate = useNavigate();
	const fav = has(slug);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.button, {
		whileTap: { scale: .9 },
		onClick: async () => {
			if (!user) {
				navigate({ to: "/auth" });
				return;
			}
			playSoft();
			if (await toggle(slug)) {
				toast.success("Saved to your vault");
				award(5, "Bookmarked");
				if (slugs.length + 1 >= 5) grant("collector");
			}
		},
		"aria-label": fav ? "Remove bookmark" : "Bookmark",
		className: `grid h-10 w-10 place-items-center rounded-full border border-border bg-card/60 transition-colors ${fav ? "text-amber-300 border-amber-400/40" : "text-muted-foreground hover:text-foreground"} ${className}`,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bookmark, { className: `h-4 w-4 ${fav ? "fill-amber-300" : ""}` })
	});
}
//#endregion
export { FavoriteButton as t };
