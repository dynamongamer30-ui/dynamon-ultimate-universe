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
export const LICENSE_WORKER_URL = (import.meta.env.VITE_LICENSE_WORKER_URL || "").replace(
  /\/+$/,
  "",
);
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
export function setAdminKey(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (key) window.sessionStorage.setItem(ADMIN_KEY_STORAGE, key);
    else window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    return getAdminKey() === key;
  } catch {
    return false;
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
  unavailable?: boolean;
}

export async function checkToken(ref: string, signal?: AbortSignal): Promise<CheckTokenResult> {
  try {
    const res = await fetch(`${GEN_WORKER_URL}/check-token?ref=${encodeURIComponent(ref)}`, {
      method: "GET",
      signal,
    });
    if (!res.ok) return { valid: false, unavailable: true };
    const body: unknown = await res.json();
    if (
      !body ||
      typeof body !== "object" ||
      !("valid" in body) ||
      typeof body.valid !== "boolean" ||
      ("reason" in body && typeof body.reason !== "string")
    )
      return { valid: false, unavailable: true };
    return { valid: body.valid, reason: "reason" in body ? (body.reason as string) : undefined };
  } catch {
    return { valid: false, unavailable: true };
  }
}

export interface GenerateKeyArgs {
  accessToken: string;
  turnstileToken: string;
  fingerprint: string;
}
export type GenerateKeyResult =
  | { ok: true; key: string; remaining: number | null }
  | { ok: false; error: string; resetInMinutes?: number; status?: number; uncertain?: boolean };

export async function generateKey(
  args: GenerateKeyArgs,
  signal?: AbortSignal,
): Promise<GenerateKeyResult> {
  let res: Response;
  try {
    res = await fetch(`${GEN_WORKER_URL}/generate-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal,
      body: JSON.stringify({
        accessToken: args.accessToken,
        turnstileToken: args.turnstileToken,
        fingerprint: args.fingerprint,
      }),
    });
  } catch {
    return { ok: false, error: "generation_unconfirmed", uncertain: true };
  }

  const value: unknown = await res.json().catch(() => null);
  const body = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  if (res.ok && body.ok !== false && typeof body.key === "string" && body.key.trim()) {
    return {
      ok: true,
      key: body.key,
      remaining:
        typeof body.remaining === "number" &&
        Number.isSafeInteger(body.remaining) &&
        body.remaining >= 0
          ? body.remaining
          : null,
    };
  }

  const confirmedErrors = [
    "maintenance",
    "captcha_failed",
    "rate_limited",
    "invalid_token",
    "token_used",
    "token_expired",
    "missing_fields",
    "bad_request",
  ];
  if (typeof body.error !== "string" || !confirmedErrors.includes(body.error))
    return { ok: false, status: res.status, error: "generation_unconfirmed", uncertain: true };
  return {
    ok: false,
    status: res.status,
    error: body.error,
    resetInMinutes:
      typeof body.resetInMinutes === "number" &&
      Number.isSafeInteger(body.resetInMinutes) &&
      body.resetInMinutes >= 0
        ? body.resetInMinutes
        : undefined,
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
  const signal = init.signal
    ? AbortSignal.any([init.signal, AbortSignal.timeout(10000)])
    : AbortSignal.timeout(10000);
  return fetch(`${LICENSE_WORKER_URL}${path}`, { ...init, headers, signal });
}

async function adminJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await adminFetch(path, init);
  const body = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    throw new Error(
      body && typeof body === "object" && typeof body.error === "string"
        ? body.error
        : `http_${res.status}`,
    );
  }
  if (init.method === "POST" && (!body || (body as { ok?: unknown }).ok !== true))
    throw new Error("Change was not confirmed. Check the current state before trying again.");
  return body as T;
}

export interface UploadPayloadArgs {
  build: string | number;
  ct_b64: string;
  iv_b64: string;
  sig_b64: string;
  key_b64: string;
  ct_sha: string;
  protocol: number | string;
  issued: number | string;
  min_client: number | string;
  meta_sig_b64: string;
}

export function normalizeSignedPayload(args: UploadPayloadArgs): UploadPayloadArgs {
  const protocol = Number(args.protocol);
  const issued = Number(args.issued);
  const minClient = Number(args.min_client);
  if (
    protocol !== 2 ||
    minClient !== 3 ||
    !Number.isSafeInteger(issued) ||
    issued <= 0 ||
    issued > Math.floor(Date.now() / 1000) + 300 ||
    typeof args.meta_sig_b64 !== "string" ||
    !args.meta_sig_b64.trim()
  ) {
    throw new Error(
      "Royal Void 0.3 requires a freshly signed protocol-2 bundle with min_client 3, issued and meta_sig_b64. Use the owner payload tool.",
    );
  }
  return { ...args, protocol, issued, min_client: minClient };
}

export async function uploadPayload(
  args: UploadPayloadArgs,
  signal?: AbortSignal,
): Promise<{ ok: boolean }> {
  return adminJson("/admin/upload-payload", {
    method: "POST",
    signal,
    body: JSON.stringify(normalizeSignedPayload(args)),
  });
}

export async function banDevice(
  fp: string,
  reason: string,
  signal?: AbortSignal,
): Promise<{ ok: boolean }> {
  return adminJson("/admin/ban", {
    method: "POST",
    body: JSON.stringify({ fp, reason }),
    signal,
  });
}

export async function unbanDevice(fp: string, signal?: AbortSignal): Promise<{ ok: boolean }> {
  return adminJson("/admin/unban", {
    method: "POST",
    body: JSON.stringify({ fp }),
    signal,
  });
}

export interface ActiveDevice {
  fp: string;
  [k: string]: unknown;
}
export interface ListDevicesResult {
  current_build: string | number;
  active: ActiveDevice[];
  presence_disabled?: boolean;
}

export async function listDevices(signal?: AbortSignal): Promise<ListDevicesResult> {
  const value = await adminJson<ListDevicesResult>("/admin/list", { method: "GET", signal });
  if (
    !value ||
    !Array.isArray(value.active) ||
    value.active.some((row) => typeof row?.fp !== "string") ||
    !["string", "number"].includes(typeof value.current_build)
  )
    throw new Error("Device response was not valid. Refresh to try again.");
  return value;
}
