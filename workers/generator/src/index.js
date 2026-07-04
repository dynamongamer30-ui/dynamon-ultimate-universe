/**
 * Dynamon Universe — Generator Worker (Supabase-backed, Firebase removed).
 *
 * Deploy with Wrangler. Required secrets/vars (see wrangler.toml):
 *   SUPABASE_URL           - https://<project>.supabase.co
 *   SUPABASE_SERVICE_KEY   - service-role key (server-side ONLY, never bundled)
 *   TURNSTILE_SECRET_KEY   - Cloudflare Turnstile secret
 *   EARNLINKS_TOKEN        - shortener API token
 *
 * Storage model (MUST match the Supabase migration + web admin panel):
 *   Every former Firebase node is ONE row (id text primary key, data jsonb).
 *   Firebase path "/Table/id" -> table TABLE_MAP[Table], row id = id, value = data.
 *
 * Routes:
 *   GET  /start         -> create gate token, redirect through shortener
 *   GET  /init/:nonce   -> validate gate, mint access token, redirect to page
 *   GET  /check-token   -> validate a ?ref access token
 *   POST /generate-key  -> verify captcha + rate limit, mint a ValidKey
 */

const EARNLINKS_BASE = "https://earnlinks.in/api";
const DEST_BASE = "https://jobustecher.letest25.co/geio.php?grey=";
const GENERATOR_PAGE = "https://dynamongamer.space/generator";
const ALLOWED_ORIGINS = [
  "https://dynamongamer.space",
  "https://project--c17e7d12-bb63-4ccb-a821-5b86fff3a795.lovable.app",
  "https://id-preview--c17e7d12-bb63-4ccb-a821-5b86fff3a795.lovable.app",
];
let CURRENT_ORIGIN = ALLOWED_ORIGINS[0];
function pickOrigin(request) {
  const o = request.headers.get("Origin");
  CURRENT_ORIGIN = ALLOWED_ORIGINS.includes(o) ? o : ALLOWED_ORIGINS[0];
}

const TOKEN_TTL_MS = 10 * 60 * 1000;
const RATE_WINDOW_MS = 2 * 60 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

/* ---------- Supabase REST shim (drop-in for the old Firebase fb* helpers) ---------- */
const TABLE_MAP = {
  ValidKeys: "valid_keys",
  Config: "app_config",
  AccessTokens: "access_tokens",
  GateTokens: "gate_tokens",
  WorkerInitRate: "worker_init_rate",
  RateLimits: "rate_limits",
  GenerationLogs: "generation_logs",
  SecureSessions: "secure_sessions",
};
function sbParse(path) {
  const seg = String(path).split("/").filter(Boolean);
  const table = TABLE_MAP[seg[0]] || seg[0].toLowerCase();
  const id = seg.slice(1).join("__");
  return { table, id };
}
function sbHeaders(env, extra) {
  return Object.assign(
    {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: "Bearer " + env.SUPABASE_SERVICE_KEY,
      "Content-Type": "application/json",
    },
    extra || {},
  );
}
function sbBase(env, table) {
  return env.SUPABASE_URL.replace(/\/+$/, "") + "/rest/v1/" + table;
}
async function fbGet(path, env) {
  const p = sbParse(path);
  if (!p.id) {
    const r = await fetch(sbBase(env, p.table) + "?select=id,data", { headers: sbHeaders(env) });
    if (!r.ok) return null;
    const rows = await r.json();
    if (!rows.length) return null;
    const out = {};
    for (const row of rows) out[row.id] = row.data;
    return out;
  }
  const r = await fetch(
    sbBase(env, p.table) + "?id=eq." + encodeURIComponent(p.id) + "&select=data",
    { headers: sbHeaders(env) },
  );
  if (!r.ok) return null;
  const rows = await r.json();
  return rows.length ? rows[0].data : null;
}
async function fbPut(path, env, body) {
  const p = sbParse(path);
  const rowId = p.id || Date.now() + "_" + Math.random().toString(36).slice(2, 8);
  return fetch(sbBase(env, p.table), {
    method: "POST",
    headers: sbHeaders(env, { Prefer: "resolution=merge-duplicates,return=minimal" }),
    body: JSON.stringify({ id: rowId, data: body }),
  });
}
async function fbPatch(path, env, body) {
  const cur = await fbGet(path, env);
  const merged =
    cur && typeof cur === "object" && !Array.isArray(cur) ? Object.assign({}, cur, body) : body;
  return fbPut(path, env, merged);
}

function randomAlphaNum(len) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  let out = "";
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length];
  return out;
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": CURRENT_ORIGIN,
    Vary: "Origin",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() },
  });
}

async function handleStart(request, env) {
  const gate = crypto.randomUUID();
  const nonce = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
  const now = Date.now();

  await fbPut(`/GateTokens/${gate}`, env, { createdAt: now, used: false });

  const initUrl = new URL(request.url);
  initUrl.pathname = `/init/${nonce}`;
  initUrl.searchParams.set("gate", gate);

  try {
    const apiUrl = `${EARNLINKS_BASE}?api=${env.EARNLINKS_TOKEN}&url=${encodeURIComponent(
      initUrl.toString(),
    )}&t=${Date.now()}`;
    const res = await fetch(apiUrl);
    const data = await res.json();
    const shortUrl = data.shortenedUrl || data.shorturl || initUrl.toString();
    const token = shortUrl.substring(shortUrl.lastIndexOf("/") + 1);
    const finalUrl = token && token !== shortUrl ? DEST_BASE + token : shortUrl;
    return Response.redirect(finalUrl, 302);
  } catch (e) {
    return Response.redirect(initUrl.toString(), 302);
  }
}

async function handleInit(request, env) {
  const url = new URL(request.url);
  const gate = url.searchParams.get("gate");
  if (!gate) return new Response("Access denied. Use the proper link.", { status: 403 });

  const gateData = await fbGet(`/GateTokens/${gate}`, env);
  if (!gateData) return new Response("Invalid or expired gate.", { status: 403 });
  if (gateData.used === true)
    return new Response("This link has already been used.", { status: 403 });
  if (Date.now() - gateData.createdAt > TOKEN_TTL_MS)
    return new Response("Gate token expired.", { status: 403 });

  await fbPatch(`/GateTokens/${gate}`, env, { used: true });

  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const ipKey = ip.replace(/[.:]/g, "_");
  const initRate = (await fbGet(`/WorkerInitRate/${ipKey}`, env)) || { count: 0, resetAt: 0 };
  const now = Date.now();
  if (initRate.resetAt > now && initRate.count >= 20) {
    return new Response(null, { status: 429 });
  }
  await fbPut(`/WorkerInitRate/${ipKey}`, env, {
    count: initRate.resetAt > now ? initRate.count + 1 : 1,
    resetAt: initRate.resetAt > now ? initRate.resetAt : now + 60 * 60 * 1000,
  });

  const token = crypto.randomUUID();
  await fbPut(`/AccessTokens/${token}`, env, { createdAt: now, used: false, ip });

  return Response.redirect(`${GENERATOR_PAGE}?ref=${token}`, 302);
}

async function handleCheckToken(request, env) {
  const url = new URL(request.url);
  const token = url.searchParams.get("ref") || "";
  if (!token) return json({ valid: false, reason: "missing" });
  const data = await fbGet(`/AccessTokens/${token}`, env);
  if (!data) return json({ valid: false, reason: "not_found" });
  if (data.used === true) return json({ valid: false, reason: "used" });
  if (Date.now() - data.createdAt > TOKEN_TTL_MS) return json({ valid: false, reason: "expired" });
  return json({ valid: true });
}

async function handleGenerateKey(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad_request" }, 400);
  }

  const { accessToken, turnstileToken, fingerprint } = body || {};
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  if (!accessToken || !turnstileToken || !fingerprint) {
    return json({ ok: false, error: "missing_fields" }, 400);
  }

  const maintenance = await fbGet("/Config/Maintenance", env);
  if (maintenance === true) return json({ ok: false, error: "maintenance" }, 503);

  const tokenData = await fbGet(`/AccessTokens/${accessToken}`, env);
  if (!tokenData) return json({ ok: false, error: "invalid_token" }, 403);
  if (tokenData.used === true) return json({ ok: false, error: "token_used" }, 403);
  if (Date.now() - tokenData.createdAt > TOKEN_TTL_MS) {
    return json({ ok: false, error: "token_expired" }, 403);
  }

  // Verify Turnstile captcha.
  const tsForm = new FormData();
  tsForm.append("secret", env.TURNSTILE_SECRET_KEY);
  tsForm.append("response", turnstileToken);
  tsForm.append("remoteip", ip);
  const tsRes = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: tsForm,
  });
  const tsData = await tsRes.json();
  if (!tsData.success) return json({ ok: false, error: "captcha_failed" }, 403);

  // Rate limiting (per IP + fingerprint), unless whitelisted / disabled.
  const rateCfg = await fbGet("/Config/RateLimit", env);
  const rateLimitEnabled = !(rateCfg && rateCfg.enabled === false);
  const whitelist = (await fbGet("/Config/IPWhitelist", env)) || [];
  const isWhitelisted = Array.isArray(whitelist)
    ? whitelist.includes(ip)
    : Object.values(whitelist).includes(ip);
  const ipKey = ip.replace(/[.:]/g, "_");
  const combinedKey = `${ipKey}__${String(fingerprint).slice(0, 100)}`;
  const rateData = (await fbGet(`/RateLimits/${combinedKey}`, env)) || { timestamps: [] };
  const now = Date.now();
  let timestamps = (rateData.timestamps || []).filter((t) => now - t < RATE_WINDOW_MS);

  if (rateLimitEnabled && !isWhitelisted && timestamps.length >= RATE_LIMIT_MAX) {
    const resetIn = Math.ceil((timestamps[0] + RATE_WINDOW_MS - now) / 60000);
    return json({ ok: false, error: "rate_limited", resetInMinutes: resetIn }, 429);
  }

  // Mint the key. IMPORTANT: field shapes MUST match the web admin panel
  // (durationHours: number, activated: boolean) so the Keys tab renders it.
  const durationHoursCfg = await fbGet("/Config/KeyDurationHours", env);
  const durationHours =
    typeof durationHoursCfg === "number" && durationHoursCfg > 0 ? durationHoursCfg : 24;
  const key = "DG-" + randomAlphaNum(6);
  const nowSec = Math.floor(now / 1000);

  await fbPut(`/ValidKeys/${key}`, env, {
    status: "active",
    expiry: nowSec + durationHours * 3600,
    durationHours: durationHours, // number (was "24h" string — bug fixed)
    activated: false, // boolean, not yet activated (was `now` timestamp — bug fixed)
    device: null,
    date: nowSec, // unix seconds, matches admin `date`
    fingerprint: fingerprint,
    sourceIP: ip,
    source: "web",
  });

  await fbPatch(`/AccessTokens/${accessToken}`, env, { used: true });

  timestamps.push(now);
  await fbPut(`/RateLimits/${combinedKey}`, env, {
    count: timestamps.length,
    timestamps: timestamps,
    ip: ip,
    fingerprint: fingerprint,
    lastSeen: new Date(now).toISOString(),
  });

  // Generation log. Field shapes MUST match the admin Logs tab (key, time).
  const logId = `${now}_${randomAlphaNum(4)}`;
  await fbPut(`/GenerationLogs/${logId}`, env, {
    key: key,
    time: nowSec, // unix seconds, matches admin `time`
    ip: ip,
    fingerprint: fingerprint,
    result: "success",
  });

  return json({
    ok: true,
    key: key,
    remaining: Math.max(0, RATE_LIMIT_MAX - timestamps.length),
  });
}

export default {
  async fetch(request, env, ctx) {
    pickOrigin(request);
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }
    if (url.pathname === "/start") return handleStart(request, env);
    if (url.pathname.startsWith("/init")) return handleInit(request, env);
    if (url.pathname === "/check-token" && request.method === "GET")
      return handleCheckToken(request, env);
    if (url.pathname === "/generate-key" && request.method === "POST")
      return handleGenerateKey(request, env);
    return Response.redirect(GENERATOR_PAGE, 302);
  },
};
