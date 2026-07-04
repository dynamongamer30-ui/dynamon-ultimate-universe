import { t as index } from "../_libs/fingerprintjs__fingerprintjs.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/fingerprint-PAPTh6Nt.js
/**
* Stable visitor fingerprint via FingerprintJS (open-source).
* Must match the value sent to the Generator Worker's /generate-key endpoint.
*/
var _agent = null;
var _cached = null;
async function getFingerprint() {
	if (_cached) return _cached;
	if (typeof window === "undefined") return "";
	if (!_agent) _agent = index.load();
	_cached = (await (await _agent).get()).visitorId;
	return _cached;
}
//#endregion
export { getFingerprint as t };
