/** 
 * FingerprintJS visitor fingerprint for generator/licensing workflows.
 * Kept separate from the durable download-session ID because browser
 * fingerprints can drift between page loads.
 */
import FingerprintJS, { type Agent } from "@fingerprintjs/fingerprintjs";

let _agent: Promise<Agent> | null = null;
let _cached: string | null = null;

export async function getFingerprint(): Promise<string> {
  if (_cached) return _cached;
  if (typeof window === "undefined") return "";
  if (!_agent) _agent = FingerprintJS.load();
  const agent = await _agent;
  const result = await agent.get();
  _cached = result.visitorId;
  return _cached;
}

const DOWNLOAD_DEVICE_ID_KEY = "dg_download_device_id_v1";
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Stable first-party browser-profile ID for secure download sessions.
 * Generated once and persisted in same-origin localStorage so session
 * creation and redemption use the same value across reloads and tabs.
 * Authentication and the one-time server token remain mandatory; this is
 * not a hardware identifier or an authentication secret.
 */
export function getDownloadDeviceId(): string {
  if (typeof window === "undefined") return "";
  try {
    const storage = window.localStorage;
    const existing = storage.getItem(DOWNLOAD_DEVICE_ID_KEY);
    if (existing && UUID_V4_RE.test(existing)) return existing;

    const cryptoApi = window.crypto;
    if (!cryptoApi?.getRandomValues) return "";
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
    const id = [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20),
    ].join("-");
    storage.setItem(DOWNLOAD_DEVICE_ID_KEY, id);
    return id;
  } catch {
    // Do not fall back to a changing fingerprint if storage is blocked.
    return "";
  }
}
