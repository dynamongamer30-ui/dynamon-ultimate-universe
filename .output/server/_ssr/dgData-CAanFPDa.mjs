import { o as __toESM } from "../_runtime.mjs";
import { t as supabase } from "./client-DryyybeH.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/react+tanstack__react-query.mjs";
import { n as cn } from "./button-DRsC1qZi.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/dgData-CAanFPDa.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Input = import_react.forwardRef(({ className, type, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		type,
		className: cn("flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Input.displayName = "Input";
/**
* DG data layer — Supabase-backed (replaces the old Firebase Realtime DB).
*
* Single source of truth shared by:
*   - Cloudflare Workers (Generator + License) — via the service-role key
*   - Android app — through the Workers only
*   - This web admin — as the signed-in owner (RLS enforced)
*
* Storage model (matches the Workers' Firebase-compat shim exactly):
*   Every former Firebase node is ONE row: (id text primary key, data jsonb).
*   e.g. ValidKeys/DG-AB12CD  ->  table valid_keys, row id "DG-AB12CD",
*   fields live inside the `data` jsonb column.
*
* Node shapes are part of the wire contract — do NOT rename fields or change
* time units. All KEY times are UNIX SECONDS (matching the Workers/app).
*/
async function selectAll(table) {
	const { data, error } = await supabase.from(table).select("id,data");
	if (error) throw new Error(error.message);
	return data ?? [];
}
async function selectOne(table, id) {
	const { data, error } = await supabase.from(table).select("data").eq("id", id).maybeSingle();
	if (error) throw new Error(error.message);
	return data?.data ?? null;
}
async function upsertRow(table, id, data) {
	const { error } = await supabase.from(table).upsert({
		id,
		data
	}, { onConflict: "id" });
	if (error) throw new Error(error.message);
}
/** Merge-patch a jsonb row (read-modify-write, matching the Workers' fbPatch). */
async function patchRow(table, id, patch) {
	await upsertRow(table, id, {
		...await selectOne(table, id) ?? {},
		...patch
	});
}
async function deleteRow(table, id) {
	const { error } = await supabase.from(table).delete().eq("id", id);
	if (error) throw new Error(error.message);
}
function toValidKey(id, v) {
	return {
		key: id,
		status: v?.status ?? "active",
		expiry: Number(v?.expiry ?? 0),
		durationHours: Number(v?.durationHours ?? 0),
		activated: Boolean(v?.activated),
		device: v?.device ?? null,
		date: Number(v?.date ?? 0),
		fingerprint: String(v?.fingerprint ?? ""),
		sourceIP: String(v?.sourceIP ?? ""),
		source: v?.source ?? "web"
	};
}
/**
* Subscribe to ValidKeys with an initial fetch + Supabase Realtime updates.
* Returns an unsubscribe fn (same contract as the old Firebase onValue).
*/
function listKeys(cb) {
	let cancelled = false;
	const load = async () => {
		try {
			const rows = await selectAll("valid_keys");
			if (!cancelled) cb(rows.map((r) => toValidKey(r.id, r.data)));
		} catch {
			if (!cancelled) cb([]);
		}
	};
	load();
	const channel = supabase.channel("valid_keys_changes").on("postgres_changes", {
		event: "*",
		schema: "public",
		table: "valid_keys"
	}, () => {
		load();
	}).subscribe();
	return () => {
		cancelled = true;
		supabase.removeChannel(channel);
	};
}
async function revokeKey(key) {
	await patchRow("valid_keys", key, { status: "revoked" });
}
async function unrevokeKey(key) {
	await patchRow("valid_keys", key, { status: "active" });
}
async function deleteKey(key) {
	await deleteRow("valid_keys", key);
}
/** Add `hours` to expiry (unix seconds) and durationHours. */
async function extendKey(key, hours) {
	const cur = await selectOne("valid_keys", key) ?? {};
	const nowSec = nowSeconds();
	await patchRow("valid_keys", key, {
		expiry: (Number(cur.expiry ?? 0) > nowSec ? Number(cur.expiry) : nowSec) + Math.floor(hours * 3600),
		durationHours: Number(cur.durationHours ?? 0) + hours
	});
}
async function keyExists(key) {
	return await selectOne("valid_keys", key) !== null;
}
/** Create a manual key (owner-added). Returns the allocated key id. */
async function createManualKey(prefix, hours) {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	const rand = () => {
		let s = "";
		for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * 32)];
		return s;
	};
	const clean = (prefix || "DG").trim().toUpperCase();
	let key = "";
	for (let i = 0; i < 10; i++) {
		const cand = `${clean}-${rand()}`;
		if (!await keyExists(cand)) {
			key = cand;
			break;
		}
	}
	if (!key) throw new Error("Could not allocate a unique key");
	const now = nowSeconds();
	await upsertRow("valid_keys", key, {
		status: "active",
		expiry: now + Math.floor(hours * 3600),
		durationHours: hours,
		activated: false,
		device: null,
		date: now,
		fingerprint: "",
		sourceIP: "",
		source: "admin"
	});
	return key;
}
async function getConfig() {
	const [maint, rate, dur, wl] = await Promise.all([
		selectOne("app_config", "Maintenance"),
		selectOne("app_config", "RateLimit"),
		selectOne("app_config", "KeyDurationHours"),
		selectOne("app_config", "IPWhitelist")
	]);
	const maintVal = maint;
	const durVal = dur;
	const wlVal = wl;
	return {
		Maintenance: Boolean(maintVal ?? false),
		RateLimit: { enabled: Boolean(rate?.enabled ?? false) },
		KeyDurationHours: Number(durVal ?? 24),
		IPWhitelist: Array.isArray(wlVal) ? wlVal : []
	};
}
async function setMaintenance(on) {
	await upsertRow("app_config", "Maintenance", on);
}
async function setRateLimitEnabled(on) {
	await upsertRow("app_config", "RateLimit", { enabled: on });
}
async function setKeyDurationHours(n) {
	await upsertRow("app_config", "KeyDurationHours", Math.max(1, Math.floor(n)));
}
async function setIPWhitelist(ips) {
	await upsertRow("app_config", "IPWhitelist", ips);
}
async function listGenerationLogs(n = 200) {
	return (await selectAll("generation_logs")).map((r) => ({
		id: r.id,
		key: String(r.data?.key ?? ""),
		ip: String(r.data?.ip ?? ""),
		fingerprint: String(r.data?.fingerprint ?? ""),
		time: Number(r.data?.time ?? 0)
	})).sort((a, b) => b.time - a.time).slice(0, n);
}
async function listBannedDevices() {
	return (await selectAll("banned_devices")).map((r) => {
		const timeSec = Number(r.data?.time ?? 0);
		const atMs = Number(r.data?.at ?? 0);
		return {
			fingerprint: r.id,
			reason: String(r.data?.reason ?? ""),
			time: timeSec > 0 ? timeSec : atMs > 0 ? Math.floor(atMs / 1e3) : 0
		};
	});
}
var nowSeconds = () => Math.floor(Date.now() / 1e3);
//#endregion
export { getConfig as a, listKeys as c, setIPWhitelist as d, setKeyDurationHours as f, unrevokeKey as h, extendKey as i, nowSeconds as l, setRateLimitEnabled as m, createManualKey as n, listBannedDevices as o, setMaintenance as p, deleteKey as r, listGenerationLogs as s, Input as t, revokeKey as u };
