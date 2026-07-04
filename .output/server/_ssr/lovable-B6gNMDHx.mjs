import { t as supabase } from "./client-DryyybeH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/lovable-B6gNMDHx.js
var lovable = { auth: { signInWithOAuth: async (provider, opts) => {
	const supaProvider = provider === "microsoft" ? "azure" : provider;
	const { data, error } = await supabase.auth.signInWithOAuth({
		provider: supaProvider,
		options: {
			redirectTo: opts?.redirect_uri ?? window.location.origin + "/auth",
			queryParams: opts?.extraParams
		}
	});
	if (error) return {
		error,
		redirected: false
	};
	return {
		redirected: true,
		data
	};
} } };
//#endregion
export { lovable as t };
