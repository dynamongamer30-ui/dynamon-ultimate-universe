const encoder = new TextEncoder();
const cookieName = "__Host-dg-campaign-browser";
const decode = (value) =>
  JSON.parse(
    new TextDecoder().decode(
      Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0)),
    ),
  );
const encode = (value) =>
  btoa(String.fromCharCode(...encoder.encode(JSON.stringify(value))))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
async function sign(secret, domain, value) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(domain + ":" + value))),
  )
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
async function pack(secret, domain, payload) {
  const value = encode(payload);
  return value + "." + (await sign(secret, domain, value));
}
async function unpack(secret, domain, token) {
  try {
    const [value, mac] = String(token || "").split(".");
    if (!equal(await sign(secret, domain, value), mac)) return null;
    const p = decode(value);
    return p.exp > Date.now() ? p : null;
  } catch {
    return null;
  }
}

/** Dependency injected for replay, verification and rate-limit regression tests. */
export function createCampaignHandler(env, requestFetch = fetch) {
  const origin = env.SITE_ORIGIN || "https://dynamongamer.com";
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const service = env.SUPABASE_SERVICE_ROLE_KEY;
  const secret = env.CAMPAIGN_COOKIE_SECRET || service;
  const result = (body, status = 200, cookie) =>
    Response.json(body, {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        ...(cookie
          ? {
              "Set-Cookie": `${cookieName}=${cookie}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax`,
            }
          : {}),
      },
    });
  const serviceHeaders = () => ({
    apikey: service,
    ...(!service.startsWith("sb_") ? { Authorization: `Bearer ${service}` } : {}),
  });
  async function rpc(name, args) {
    const r = await requestFetch(`${base}/rest/v1/rpc/${name}`, {
      method: "POST",
      headers: { ...serviceHeaders(), "content-type": "application/json" },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) throw Error("server_unavailable");
    return r.json();
  }
  return async function handle(request) {
    try {
      const url = new URL(request.url);
      const slug = url.searchParams.get("campaign");
      if (!slug || !/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug))
        return result({ error: "invalid_campaign" }, 400);
      if (!base.startsWith("https://") || !service || !secret)
        return result({ error: "not_configured" }, 503);
      if (request.method === "GET")
        return result({
          campaign: await rpc("website_campaign_status", { p_slug: slug }),
          enabled: !!env.TURNSTILE_SECRET_KEY && !!env.CAMPAIGN_PROXY_SECRET,
        });
      if (request.method !== "POST") return result({ error: "method_not_allowed" }, 405);
      if (request.headers.get("Origin") !== origin) return result({ error: "origin_denied" }, 403);
      if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || ""))
        return result({ error: "invalid_content_type" }, 415);
      const text = await request.text();
      if (encoder.encode(text).length > 8192) return result({ error: "request_too_large" }, 413);
      const stamp = request.headers.get("x-dg-proxy-time");
      const proxyIp = request.headers.get("x-forwarded-for") || "unknown";
      if (
        !env.CAMPAIGN_PROXY_SECRET ||
        !stamp ||
        !Number.isFinite(Number(stamp)) ||
        Math.abs(Date.now() - Number(stamp)) > 30000
      )
        return result({ error: "proxy_required" }, 403);
      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(env.CAMPAIGN_PROXY_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );
      const payload = ["proxy", stamp, slug, proxyIp, text].join("\n");
      const proof = Array.from(
        new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))),
      )
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      if (!equal(proof, request.headers.get("x-dg-proxy-proof")))
        return result({ error: "proxy_required" }, 403);
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        return result({ error: "invalid_request" }, 400);
      }
      const authorization = request.headers.get("Authorization");
      if (!authorization?.startsWith("Bearer ")) return result({ error: "sign_in_required" }, 401);
      const auth = await requestFetch(`${base}/auth/v1/user`, {
        headers: { apikey: service, Authorization: authorization },
        signal: AbortSignal.timeout(8000),
      });
      if (!auth.ok) return result({ error: "sign_in_required" }, 401);
      const user = await auth.json();
      if (!user?.id || !user.email_confirmed_at)
        return result({ error: "verified_account_required" }, 403);
      const rawCookie = (request.headers.get("Cookie") || "")
        .split(";")
        .map((v) => v.trim())
        .find((v) => v.startsWith(cookieName + "="))
        ?.slice(cookieName.length + 1);
      const browser = await unpack(secret, "browser", rawCookie);
      if (body.action === "prepare") {
        if (!env.TURNSTILE_SECRET_KEY) return result({ error: "verification_unavailable" }, 503);
        const identity = browser || { id: crypto.randomUUID(), exp: Date.now() + 31536000000 };
        const signed = browser ? undefined : await pack(secret, "browser", identity);
        const intent = await pack(secret, "intent", {
          user: user.id,
          campaign: slug,
          browser: identity.id,
          nonce: crypto.randomUUID(),
          exp: Date.now() + 300000,
        });
        return result({ intent }, 200, signed);
      }
      if (body.action !== "claim") return result({ error: "invalid_action" }, 400);
      const intent = await unpack(secret, "intent", body.intent);
      if (
        !browser ||
        !intent ||
        intent.user !== user.id ||
        intent.campaign !== slug ||
        intent.browser !== browser.id
      )
        return result({ error: "verification_expired" }, 403);
      const browserHash = await sign(secret, "browser-id", browser.id);
      const ip = request.headers.get("x-forwarded-for") || "unknown";
      const ipHash = await sign(secret, "campaign-ip", ip);
      if (
        !(await rpc("website_campaign_rate", {
          p_user: user.id,
          p_browser: browserHash,
          p_ip: ipHash,
        }))
      )
        return result({ error: "rate_limited" }, 429);
      if (!env.TURNSTILE_SECRET_KEY) return result({ error: "verification_unavailable" }, 503);
      if (typeof body.token !== "string" || !body.token || body.token.length > 2048)
        return result({ error: "verification_required" }, 400);
      const verify = await requestFetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        {
          method: "POST",
          body: new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: body.token }),
          signal: AbortSignal.timeout(10000),
        },
      );
      if (!verify.ok) return result({ error: "verification_unavailable" }, 503);
      const checked = await verify.json();
      if (
        !checked.success ||
        checked.hostname !== new URL(origin).hostname ||
        checked.action !== "phoenix_claim"
      )
        return result({ error: "verification_failed" }, 403);
      return result(
        await rpc("website_claim_campaign", {
          p_user: user.id,
          p_slug: slug,
          p_browser: browserHash,
        }),
      );
    } catch {
      return result({ error: "server_unavailable" }, 503);
    }
  };
}
