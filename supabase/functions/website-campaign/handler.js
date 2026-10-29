const encoder = new TextEncoder();
async function hash(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))))
    .map((n) => n.toString(16).padStart(2, "0"))
    .join("");
}
function equal(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/** Dependency injected for replay, verification and rate-limit regression tests. */
export function createCampaignHandler(env, requestFetch = fetch) {
  const origin = env.SITE_ORIGIN || "https://dynamongamer.com";
  const base = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const service = env.SUPABASE_SERVICE_ROLE_KEY;

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
      if (!base.startsWith("https://") || !service) return result({ error: "not_configured" }, 503);
      if (request.method === "GET") {
        const config = await rpc("website_telegram_claim", { p_action: "config" });
        return result({
          campaign: await rpc("website_campaign_status", { p_slug: slug }),
          enabled:
            !!env.TURNSTILE_SECRET_KEY && !!env.CAMPAIGN_PROXY_SECRET && config.ready === true,
        });
      }
      if (request.method !== "POST") return result({ error: "method_not_allowed" }, 405);
      // The bot credential can only operate this campaign handoff API.
      const credential = request.headers.get("x-claim-bot-secret");
      if (credential) {
        if (credential.length < 32 || credential.length > 256)
          return result({ error: "unauthorized" }, 401);
        const config = await rpc("website_telegram_claim", { p_action: "config" });
        if (!equal(await hash(credential), config.secret_hash))
          return result({ error: "unauthorized" }, 401);
        const text = await request.text();
        if (encoder.encode(text).length > 4096) return result({ error: "request_too_large" }, 413);
        const body = JSON.parse(text);
        if (body.action === "heartbeat")
          return result(
            await rpc("website_telegram_claim", { p_action: "heartbeat", p_slug: body.username }),
          );
        if (
          !["inspect", "confirm", "redeem"].includes(body.action) ||
          !/^[a-f0-9]{64}$/.test(body.hash) ||
          !Number.isSafeInteger(body.telegram) ||
          body.telegram <= 0
        )
          return result({ error: "invalid_request" }, 400);
        // Only this trusted bot checks both memberships immediately before redeeming.
        if (body.action === "redeem" && body.memberships_verified !== true)
          return result({ error: "membership_required" }, 403);
        const outcome = await rpc("website_telegram_claim", {
          p_action: body.action,
          p_hash: body.hash,
          p_telegram: body.telegram,
        });
        return result(outcome, outcome.error ? 409 : 200);
      }
      if (request.headers.get("Origin") !== origin) return result({ error: "origin_denied" }, 403);
      if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || ""))
        return result({ error: "invalid_content_type" }, 415);
      const text = await request.text();
      if (encoder.encode(text).length > 8192) return result({ error: "request_too_large" }, 413);
      const stamp = request.headers.get("x-dg-proxy-time");
      const proxyIp = request.headers.get("x-dg-proxy-ip") || "unknown";
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
      if (body.action === "status")
        return result(
          await rpc("website_telegram_claim", {
            p_action: "status",
            p_user: user.id,
            p_slug: slug,
          }),
        );
      if (!["prepare", "claim"].includes(body.action))
        return result({ error: "invalid_action" }, 400);
      const config = await rpc("website_telegram_claim", { p_action: "config" });
      if (!config.ready || !config.username)
        return result({ error: "verification_unavailable" }, 503);
      if (body.action === "prepare") return result({ intent: crypto.randomUUID() });
      const ownerDemo = await rpc("website_is_demo_owner", { p_user: user.id });
      const rate =
        ownerDemo === true ||
        (await rpc("website_campaign_rate", {
          p_user: user.id,
          p_browser: await hash("user:" + user.id),
          p_ip: await hash("ip:" + proxyIp),
        }));
      if (!rate) return result({ error: "rate_limited" }, 429);
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
      const handoff = Array.from(crypto.getRandomValues(new Uint8Array(24)))
        .map((n) => n.toString(16).padStart(2, "0"))
        .join("");
      const outcome = await rpc("website_telegram_claim", {
        p_action: "create",
        p_user: user.id,
        p_slug: slug,
        p_hash: await hash(handoff),
      });
      if (outcome.error) return result(outcome, 409);
      return result({
        ok: true,
        telegram_url: `https://t.me/${config.username}?start=pass_${handoff}`,
      });
    } catch {
      return result({ error: "server_unavailable" }, 503);
    }
  };
}
