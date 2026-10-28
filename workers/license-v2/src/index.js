import { ownerKeyAction } from "./owner-keys.js";
import { checkAppPolicy } from "./app-policy.js";
// Royal Void V2 isolated staging API.
// Create a NEW Worker named royal-void-v2.
// Do not replace dg, generator or the website Worker.

const VERSION = "v2-staging-20261017";
const te = new TextEncoder();

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });

const now = () => Math.floor(Date.now() / 1000);

const b64 = (bytes) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

const bytes = (str) =>
  Uint8Array.from(
    atob(
      str
        .replace(/-/g, "+")
        .replace(/_/g, "/")
        .padEnd(Math.ceil(str.length / 4) * 4, "="),
    ),
    (c) => c.charCodeAt(0),
  );

const hex = (data) => Array.from(data, (x) => x.toString(16).padStart(2, "0")).join("");

const ready = (env) =>
  ["SUPABASE_URL", "SUPABASE_SERVICE_KEY", "LICENSE_HMAC_PEPPER", "SESSION_SIGNING_SECRET"].every(
    (k) => typeof env[k] === "string" && env[k].length >= 16,
  );

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );

  return new Uint8Array(await crypto.subtle.sign("HMAC", key, te.encode(message)));
}

async function tokenSign(secret, purpose, payload) {
  const part = b64(te.encode(JSON.stringify(payload)));
  return part + "." + b64(await hmac(secret, purpose + "." + part));
}

async function tokenRead(secret, purpose, input) {
  if (typeof input !== "string" || input.length > 5000) return null;

  const parts = input.split(".");
  if (parts.length !== 2) return null;

  try {
    const key = await crypto.subtle.importKey(
      "raw",
      te.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      bytes(parts[1]),
      te.encode(purpose + "." + parts[0]),
    );

    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(bytes(parts[0])));

    if (!Number.isInteger(payload.exp) || payload.exp <= now() || payload.exp > now() + 660) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function requestBody(req) {
  if (Number(req.headers.get("content-length") || 0) > 8192) {
    throw Error("size");
  }

  if (!/^application\/json(?:\s*;|$)/i.test(req.headers.get("content-type") || "")) {
    throw Error("content-type");
  }

  const s = await req.text();
  if (s.length > 8192) throw Error("size");

  const v = JSON.parse(s);

  if (v === null || Array.isArray(v) || typeof v !== "object") {
    throw Error("json");
  }

  return v;
}

async function verifyProof(spki, sig, message) {
  if (
    typeof spki !== "string" ||
    spki.length < 80 ||
    spki.length > 4096 ||
    typeof sig !== "string" ||
    sig.length > 200
  ) {
    return null;
  }

  try {
    const der = bytes(spki);

    const publicKey = await crypto.subtle.importKey(
      "spki",
      der,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"],
    );

    // Signature must be a 64-byte P1363 r||s value.
    if (bytes(sig).length !== 64) return null;

    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      publicKey,
      bytes(sig),
      te.encode(message),
    );

    if (!ok) return null;

    return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", der)));
  } catch {
    return null;
  }
}

async function rpc(env, name, payload) {
  const base = env.SUPABASE_URL.replace(/\/+$/, "");

  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base)) {
    throw Error("Supabase URL not configured");
  }

  const r = await fetch(base + "/rest/v1/rpc/" + name, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: env.SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(6500),
  });

  if (!r.ok) {
    throw Error("Supabase RPC unavailable: " + r.status);
  }

  const rows = await r.json();

  return Array.isArray(rows) ? rows[0] || null : null;
}

async function challenge(env) {
  const nonce = crypto.getRandomValues(new Uint8Array(24));
  const t = now();

  return json({
    challenge: await tokenSign(env.SESSION_SIGNING_SECRET, "RV2:challenge", {
      aud: "device-proof",
      nonce: b64(nonce),
      iat: t,
      exp: t + 90,
    }),
    expires_in: 90,
    algorithm: "P-256-SHA256-P1363",
  });
}

async function activate(req, env) {
  const b = await requestBody(req);
  const policy = await checkAppPolicy(env, b.client_version_code);
  if (policy) return json({ error: policy.error }, policy.status);

  const license = typeof b.license_key === "string" ? b.license_key.trim().toUpperCase() : "";

  if (!/^[A-Z0-9-]{8,128}$/.test(license)) {
    return json({ error: "Invalid license or device" }, 401);
  }

  const c = await tokenRead(env.SESSION_SIGNING_SECRET, "RV2:challenge", b.challenge);

  if (!c || c.aud !== "device-proof") {
    return json({ error: "Invalid or expired challenge" }, 401);
  }

  const thumb = await verifyProof(
    b.public_key_spki,
    b.signature,
    "RV2-ACTIVATE\n" + b.challenge + "\n" + license,
  );

  if (!thumb) {
    return json({ error: "Device signature invalid" }, 401);
  }

  const keyHash = hex(await hmac(env.LICENSE_HMAC_PEPPER, "rv-v2:license:v1:" + license));

  let row = await rpc(env, "rv2_claim_device", {
    p_key_hmac: keyHash,
    p_thumbprint: thumb,
    p_public_key_spki: b.public_key_spki,
  });

  if (!row?.license_id && /^(?:DG|VIP|DGVIP)-[A-Z0-9]{6,16}$/.test(license)) {
    row = await rpc(env, "rv2_claim_existing_key", {
      p_key: license,
      p_key_hmac: keyHash,
      p_thumbprint: thumb,
      p_public_key_spki: b.public_key_spki,
    });
  }

  if (!row?.license_id || !Number.isInteger(row.lease_version)) {
    return json({ error: "Invalid license or device" }, 401);
  }

  return issueLease(env, row.license_id, thumb, row.lease_version, row.license_expiry);
}

async function issueLease(env, id, thumb, version, expiry) {
  let exp = now() + 600;

  if (expiry) {
    const serverExpiry = Math.floor(Date.parse(expiry) / 1000);

    if (!Number.isFinite(serverExpiry) || serverExpiry <= now()) {
      return json({ error: "License expired" }, 401);
    }

    exp = Math.min(exp, serverExpiry);
  }

  const lease = await tokenSign(env.SESSION_SIGNING_SECRET, "RV2:lease", {
    aud: "protected-menu",
    license_id: id,
    thumbprint: thumb,
    version,
    iat: now(),
    exp,
  });

  return json({
    lease,
    expires_at: exp,
    renew_after_seconds: 480,
  });
}

async function renew(req, env) {
  const b = await requestBody(req);
  const policy = await checkAppPolicy(env, b.client_version_code);
  if (policy) return json({ error: policy.error }, policy.status);

  const lease = await tokenRead(env.SESSION_SIGNING_SECRET, "RV2:lease", b.lease);

  const challengeToken = await tokenRead(env.SESSION_SIGNING_SECRET, "RV2:challenge", b.challenge);

  if (
    !lease ||
    lease.aud !== "protected-menu" ||
    !challengeToken ||
    challengeToken.aud !== "device-proof"
  ) {
    return json({ error: "Session expired" }, 401);
  }

  const thumb = await verifyProof(
    b.public_key_spki,
    b.signature,
    "RV2-RENEW\n" + b.challenge + "\n" + b.lease,
  );

  if (!thumb || thumb !== lease.thumbprint) {
    return json({ error: "Device signature invalid" }, 401);
  }

  const row = await rpc(env, "rv2_check_lease", {
    p_license_id: lease.license_id,
    p_thumbprint: thumb,
  });

  if (!row || row.lease_version !== lease.version) {
    return json({ error: "License revoked, banned or expired" }, 401);
  }

  return issueLease(env, lease.license_id, thumb, row.lease_version, row.license_expiry);
}

// Private server-to-server license registration.
// Only the Generator Worker should ever know V2_ISSUER_KEY.
// The key is stored as an HMAC in Supabase, never as plaintext.
async function issuerAllowed(req, env) {
  if (typeof env.V2_ISSUER_KEY !== "string" || env.V2_ISSUER_KEY.length < 32) {
    return false;
  }

  const supplied = req.headers.get("x-royalvoid-issuer-key") || "";
  if (supplied.length < 32 || supplied.length > 256) return false;

  const [expectedDigest, suppliedDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", te.encode(env.V2_ISSUER_KEY)),
    crypto.subtle.digest("SHA-256", te.encode(supplied)),
  ]);

  const expected = new Uint8Array(expectedDigest);
  const received = new Uint8Array(suppliedDigest);
  let difference = 0;

  for (let i = 0; i < expected.length; i++) {
    difference |= expected[i] ^ received[i];
  }

  return difference === 0;
}

async function issue(req, env) {
  if (typeof env.V2_ISSUER_KEY !== "string" || env.V2_ISSUER_KEY.length < 32) {
    return json({ error: "Issuer not configured" }, 503);
  }

  if (!(await issuerAllowed(req, env))) {
    return json({ error: "Not authorized" }, 403);
  }

  const body = await requestBody(req);

  const license = typeof body.license_key === "string" ? body.license_key.trim().toUpperCase() : "";

  const duration = body.duration_seconds;
  const expiry = body.expires_at_epoch;
  const currentTime = now();

  if (
    !/^[A-Z0-9-]{8,128}$/.test(license) ||
    !Number.isInteger(duration) ||
    duration < 60 ||
    duration > 604800 ||
    !Number.isSafeInteger(expiry) ||
    expiry <= currentTime ||
    expiry > currentTime + 604800
  ) {
    return json({ error: "Invalid issuance request" }, 400);
  }

  const keyHash = hex(await hmac(env.LICENSE_HMAC_PEPPER, "rv-v2:license:v1:" + license));

  const row = await rpc(env, "rv2_issue_key", {
    p_key_hmac: keyHash,
    p_duration_seconds: duration,
    p_expiry_epoch: expiry,
  });

  if (!row?.license_id) {
    return json({ error: "Issuance unavailable" }, 503);
  }

  return json({
    ok: true,
    registered: true,
    created: row.newly_created === true,
    license_id: row.license_id,
  });
}

export default {
  async fetch(req, env) {
    const path = new URL(req.url).pathname;
    if (path === "/v2/admin/keys") return ownerKeyAction(req, env);

    if (path === "/health" && req.method === "GET") {
      return json({
        service: "royal-void-v2-api",
        version: VERSION,
        status: "staging",
        configured: ready(env),
      });
    }

    if (!ready(env)) {
      return json({ error: "V2 licensing is not configured" }, 503);
    }

    try {
      if (path === "/v2/challenge" && req.method === "GET") {
        return await challenge(env);
      }

      if (path === "/v2/activate" && req.method === "POST") {
        return await activate(req, env);
      }

      if (path === "/v2/renew" && req.method === "POST") {
        return await renew(req, env);
      }

      if (path === "/v2/internal/issue" && req.method === "POST") {
        return await issue(req, env);
      }

      return json({ error: "Not found" }, 404);
    } catch (e) {
      if (e instanceof SyntaxError || ["size", "content-type", "json"].includes(e.message)) {
        return json({ error: "Invalid request" }, 400);
      }

      return json({ error: "Licensing service temporarily unavailable" }, 503);
    }
  },
};
