const ALLOWED_ORIGINS = new Set([
  "https://dynamongamer.com",
  "https://www.dynamongamer.com",
  "https://dynamongamer.space",
  "https://www.dynamongamer.space",
]);

export async function ownerKeyAction(request, env) {
  const origin = request.headers.get("origin");
  const headers = {
    "content-type": "application/json",
    "cache-control": "private, no-store",
    vary: "Origin",
  };
  if (origin && !ALLOWED_ORIGINS.has(origin))
    return Response.json({ error: "Origin not allowed" }, { status: 403, headers });
  if (origin) headers["access-control-allow-origin"] = origin;
  headers["access-control-allow-methods"] = "POST, OPTIONS";
  headers["access-control-allow-headers"] = "authorization, content-type";
  const reply = (body, status = 200) => Response.json(body, { status, headers });
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (request.method !== "POST") return reply({ error: "Method not allowed" }, 405);
  const authorization = request.headers.get("authorization") || "";
  if (!/^Bearer [A-Za-z0-9_.-]{20,4096}$/.test(authorization))
    return reply({ error: "Owner sign-in required" }, 401);
  try {
    if (
      typeof env.LICENSE_HMAC_PEPPER !== "string" ||
      env.LICENSE_HMAC_PEPPER.length < 16 ||
      typeof env.SUPABASE_SERVICE_KEY !== "string" ||
      env.SUPABASE_SERVICE_KEY.length < 16
    )
      return reply({ error: "Service unavailable" }, 503);
    const base = String(env.SUPABASE_URL || "").replace(/\/+$/, "");
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(base))
      return reply({ error: "Service unavailable" }, 503);
    const authHeaders = { apikey: env.SUPABASE_SERVICE_KEY, Authorization: authorization };
    const userResponse = await fetch(base + "/auth/v1/user", {
      headers: authHeaders,
      signal: AbortSignal.timeout(5000),
    });
    if (!userResponse.ok) return reply({ error: "Owner sign-in required" }, 401);
    const user = await userResponse.json();
    if (!/^[0-9a-f-]{36}$/i.test(user.id || ""))
      return reply({ error: "Owner sign-in required" }, 401);
    const ownerResponse = await fetch(base + "/rest/v1/rpc/dg_is_owner", {
      method: "POST",
      headers: { ...authHeaders, "content-type": "application/json" },
      body: "{}",
      signal: AbortSignal.timeout(5000),
    });
    if (!ownerResponse.ok || (await ownerResponse.json()) !== true)
      return reply({ error: "Owner access required" }, 403);
    if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || ""))
      return reply({ error: "JSON required" }, 400);
    const raw = await request.text();
    if (raw.length > 16384) return reply({ error: "Request too large" }, 413);
    const body = JSON.parse(raw);
    if (
      !["create", "repair", "revoke", "unrevoke", "extend", "delete"].includes(body.action) ||
      !/^(DG|VIP|DGVIP)-[A-Z0-9]{6,16}$/.test(body.key || "") ||
      !/^[0-9a-f-]{36}$/i.test(body.requestId || "")
    )
      return reply({ error: "Invalid key action" }, 400);
    if (
      ["create", "extend"].includes(body.action) &&
      (!Number.isInteger(body.hours) || body.hours < 0 || body.hours > 87600)
    )
      return reply({ error: "Invalid duration" }, 400);
    const secret = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(env.LICENSE_HMAC_PEPPER),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const digest = await crypto.subtle.sign(
      "HMAC",
      secret,
      new TextEncoder().encode("rv-v2:license:v1:" + body.key),
    );
    const hash = Array.from(new Uint8Array(digest), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
    const result = await fetch(base + "/rest/v1/rpc/rv2_admin_key_action", {
      method: "POST",
      headers: { apikey: env.SUPABASE_SERVICE_KEY, "content-type": "application/json" },
      body: JSON.stringify({
        p_action: body.action,
        p_key: body.key,
        p_key_hmac: hash,
        p_hours: body.hours ?? null,
        p_expected: body.expected ?? null,
        p_actor: user.id,
        p_request_id: body.requestId,
      }),
      signal: AbortSignal.timeout(6500),
    });
    if (!result.ok) {
      const error = await result.json().catch(() => ({}));
      return reply(
        {
          error:
            result.status === 409 || error.code === "40001"
              ? "Key changed. Refresh before trying again."
              : error.code === "23505"
                ? "Key collision. Try again."
                : "Key action was not confirmed. Refresh the key list before trying again.",
        },
        result.status === 409 ? 409 : 400,
      );
    }
    const rows = await result.json();
    if (!Array.isArray(rows) || rows.length !== 1 || rows[0].key_id !== body.key)
      return reply({ error: "Key action was not confirmed. Refresh before trying again." }, 503);
    return reply({ ok: true, key: body.key });
  } catch {
    return reply(
      { error: "Key action was not confirmed. Refresh the key list before trying again." },
      503,
    );
  }
}
