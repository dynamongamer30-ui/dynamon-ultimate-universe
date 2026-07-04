//#region node_modules/.nitro/vite/services/ssr/assets/dgWorker-i6XEWvUe.js
/**
* DG Worker clients.
*
* - Generator Worker base URL: import.meta.env.VITE_GEN_WORKER_URL
*   Endpoints: /start, /check-token, /generate-key
* - License Worker base URL:   import.meta.env.VITE_LICENSE_WORKER_URL
*   Endpoints: /admin/upload-payload, /admin/ban, /admin/unban, /admin/list
*
* The License Worker admin key is NEVER bundled. The owner types it once on
* the admin Loader page; we keep it in sessionStorage under "dg_admin_key".
*/
var GEN_WORKER_URL = "https://generator.dynamongamer30.workers.dev".replace(/\/+$/, "");
var LICENSE_WORKER_URL = "https://dg.dynamongamer30.workers.dev".replace(/\/+$/, "");
var TURNSTILE_SITE_KEY = "0x4AAAAAACvwLjfvQPoyvVFE";
var ADMIN_KEY_STORAGE = "dg_admin_key";
function getAdminKey() {
	if (typeof window === "undefined") return "";
	try {
		return window.sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
	} catch {
		return "";
	}
}
function setAdminKey(key) {
	if (typeof window === "undefined") return;
	try {
		if (key) window.sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
		else window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
	} catch {}
}
function requireAdminKey() {
	const k = getAdminKey();
	if (!k) throw new Error("Admin key not set. Open the Loader page and enter it.");
	return k;
}
/** URL to assign window.location to in order to start the gate flow. */
function startGate() {
	return `${GEN_WORKER_URL}/start`;
}
async function checkToken(ref) {
	try {
		const body = await (await fetch(`${GEN_WORKER_URL}/check-token?ref=${encodeURIComponent(ref)}`, { method: "GET" })).json().catch(() => ({}));
		return {
			valid: Boolean(body.valid),
			reason: body.reason
		};
	} catch (e) {
		return {
			valid: false,
			reason: e.message || "network_error"
		};
	}
}
async function generateKey(args) {
	let res;
	try {
		res = await fetch(`${GEN_WORKER_URL}/generate-key`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				accessToken: args.accessToken,
				turnstileToken: args.turnstileToken,
				fingerprint: args.fingerprint
			})
		});
	} catch (e) {
		return {
			ok: false,
			error: e.message || "network_error"
		};
	}
	const body = await res.json().catch(() => ({}));
	if (res.ok && body.key) return {
		ok: true,
		key: String(body.key),
		remaining: Number(body.remaining ?? 0)
	};
	return {
		ok: false,
		status: res.status,
		error: String(body.error ?? `http_${res.status}`),
		resetInMinutes: typeof body.resetInMinutes === "number" ? body.resetInMinutes : void 0
	};
}
async function adminFetch(path, init = {}) {
	const headers = new Headers(init.headers || {});
	headers.set("X-Admin", requireAdminKey());
	if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
	return fetch(`${LICENSE_WORKER_URL}${path}`, {
		...init,
		headers
	});
}
async function adminJson(path, init = {}) {
	const res = await adminFetch(path, init);
	const body = await res.json().catch(() => ({}));
	if (!res.ok) throw new Error(body.error || `http_${res.status}`);
	return body;
}
async function uploadPayload(args) {
	return adminJson("/admin/upload-payload", {
		method: "POST",
		body: JSON.stringify(args)
	});
}
async function banDevice(fp, reason) {
	return adminJson("/admin/ban", {
		method: "POST",
		body: JSON.stringify({
			fp,
			reason
		})
	});
}
async function unbanDevice(fp) {
	return adminJson("/admin/unban", {
		method: "POST",
		body: JSON.stringify({ fp })
	});
}
async function listDevices() {
	return adminJson("/admin/list", { method: "GET" });
}
//#endregion
export { generateKey as a, setAdminKey as c, uploadPayload as d, checkToken as i, startGate as l, TURNSTILE_SITE_KEY as n, getAdminKey as o, banDevice as r, listDevices as s, GEN_WORKER_URL as t, unbanDevice as u };
