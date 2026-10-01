/**
 * Stable visitor fingerprint via FingerprintJS (open-source).
 * Must match the value sent to the Generator Worker's /generate-key endpoint.
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
