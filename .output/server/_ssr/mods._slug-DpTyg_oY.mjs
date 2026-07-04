import { g as notFound, l as lazyRouteComponent, u as createFileRoute } from "../_libs/@tanstack/react-router+[...].mjs";
import { l as getMod } from "./useSiteSettings-BztHUruL.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/mods._slug-DpTyg_oY.js
var $$splitComponentImporter = () => import("./mods._slug-BxmSs1mp.mjs");
var $$splitErrorComponentImporter = () => import("./mods._slug-Do5s7n7u.mjs");
var $$splitNotFoundComponentImporter = () => import("./mods._slug-BDZyBNEe.mjs");
var Route = createFileRoute("/mods/$slug")({
	loader: ({ params }) => {
		const mod = getMod(params.slug);
		if (!mod) throw notFound();
		return { mod };
	},
	head: ({ loaderData }) => ({ meta: loaderData ? [
		{ title: `${loaderData.mod.name} — Dynamon Universe` },
		{
			name: "description",
			content: loaderData.mod.tagline
		},
		{
			property: "og:title",
			content: `${loaderData.mod.name} — Dynamon Universe`
		},
		{
			property: "og:description",
			content: loaderData.mod.tagline
		},
		{
			property: "og:image",
			content: loaderData.mod.image
		},
		{
			property: "twitter:image",
			content: loaderData.mod.image
		}
	] : [] }),
	notFoundComponent: lazyRouteComponent($$splitNotFoundComponentImporter, "notFoundComponent"),
	errorComponent: lazyRouteComponent($$splitErrorComponentImporter, "errorComponent"),
	component: lazyRouteComponent($$splitComponentImporter, "component")
});
//#endregion
export { Route as t };
