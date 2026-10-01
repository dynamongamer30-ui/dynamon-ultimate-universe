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

export const GEN_WORKER_URL = (import.meta.env.VITE_GEN_WORKER_URL || "").replace(/\/+$/, "");
export const LICENSE_WORKER_URL = (import.meta.env.VITE_LICENSE_WORKER_URL || "").replace(/\/+$/, "");
export const TURNSTILE_SITE_KEY = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string) || "";

// ---------- Admin key (per-tab, sessionStorage) ----------

const ADMIN_KEY_STORAGE = "dg_admin_key";

export function getAdminKey(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.sessionStorage.getItem(ADMIN_KEY_STORAGE) || "";
  } catch {
    return "";
  }
}
export function setAdminKey(key: string): void {
  if (typeof window === "undefined") return;
  try {
    if (key) window.sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
    else window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
  } catch {
    /* ignore */
  }
}
export function requireAdminKey(): string {
  const k = getAdminKey();
  if (!k) throw new Error("Admin key not set. Open the Loader page and enter it.");
  return k;
}

// =====================================================================
// GENERATOR WORKER
// =====================================================================

/** URL to assign window.location to in order to start the gate flow. */
export function startGate(): string {
  return `${GEN_WORKER_URL}/start`;
}

export interface CheckTokenResult {
  valid: boolean;
  reason?: string;
}

export async function checkToken(ref: string): Promise<CheckTokenResult> {
  try {
    const res = await fetch(`${GEN_WORKER_URL}/check-token?ref=${encodeURIComponent(ref)}`, {
      method: "GET",
    });
    const body = (await res.json().catch(() => ({}))) as Partial<CheckTokenResult>;
    return { valid: Boolean(body.valid), reason: body.reason };
  } catch (e) {
    return { valid: false, reason: (e as Error).message || "network_error" };
  }
}

export interface GenerateKeyArgs {
  accessToken: string;
  turnstileToken: string;
  fingerprint: string;
}
export type GenerateKeyResult =
  | { ok: true; key: string; remaining: number }
  | { ok: false; error: string; resetInMinutes?: number; status?: number };

export async function generateKey(args: GenerateKeyArgs): Promise<GenerateKeyResult> {
  let res: Response;
  try {
    res = await fetch(`${GEN_WORKER_URL}/generate-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: args.accessToken,
        turnstileToken: args.turnstileToken,
        fingerprint: args.fingerprint,
      }),
    });
  } catch (e) {
    return { ok: false, error: (e as Error).message || "network_error" };
  }

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (res.ok && body.key) {
    return {
      ok: true,
      key: String(body.key),
      remaining: Number(body.remaining ?? 0),
    };
  }

  return {
    ok: false,
    status: res.status,
    error: String(body.error ?? `http_${res.status}`),
    resetInMinutes:
      typeof body.resetInMinutes === "number" ? (body.resetInMinutes as number) : undefined,
  };
}

// =====================================================================
// LICENSE WORKER (admin)
// =====================================================================

async function adminFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  headers.set("X-Admin", requireAdminKey());
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${LICENSE_WORKER_URL}${path}`, { ...init, headers });
}

async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init);
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error((body as { error?: string }).error || `http_${res.status}`);
  }
  return body as T;
}

export interface UploadPayloadArgs {
  build: string | number;
  ct_b64: string;
  iv_b64: string;
  sig_b64: string;
  key_b64: string;
  ct_sha: string;
}

export async function uploadPayload(args: UploadPayloadArgs): Promise<{ ok: boolean }> {
  return adminJson("/admin/upload-payload", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

export async function banDevice(fp: string, reason: string): Promise<{ ok: boolean }> {
  return adminJson("/admin/ban", {
    method: "POST",
    body: JSON.stringify({ fp, reason }),
  });
}

export async function unbanDevice(fp: string): Promise<{ ok: boolean }> {
  return adminJson("/admin/unban", {
    method: "POST",
    body: JSON.stringify({ fp }),
  });
}

export interface ActiveDevice {
  fp: string;
  [k: string]: unknown;
}
export interface ListDevicesResult {
  current_build: string | number;
  active: ActiveDevice[];
}

export async function listDevices(): Promise<ListDevicesResult> {
  return adminJson<ListDevicesResult>("/admin/list", { method: "GET" });
}
