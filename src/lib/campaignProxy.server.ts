export async function campaignProxy(
  request: Request,
  env: Record<string, unknown> = {},
): Promise<Response | null> {
  const url = new URL(request.url);
  if (!url.pathname.startsWith("/api/phoenix/")) return null;
  const slug = url.pathname.slice("/api/phoenix/".length);
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(slug))
    return Response.json({ error: "invalid_campaign" }, { status: 400, headers });
  if (!["GET", "POST"].includes(request.method))
    return Response.json({ error: "method_not_allowed" }, { status: 405, headers });
  if (request.method === "POST" && request.headers.get("origin") !== url.origin)
    return Response.json({ error: "origin_denied" }, { status: 403, headers });
  if (Number(request.headers.get("content-length") || 0) > 8192)
    return Response.json({ error: "request_too_large" }, { status: 413, headers });
  const base = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return Response.json({ error: "not_configured" }, { status: 503, headers });
  const body = request.method === "POST" ? await request.text() : undefined;
  if (body && new TextEncoder().encode(body).length > 8192)
    return Response.json({ error: "request_too_large" }, { status: 413, headers });
  const proxySecret = String(env.CAMPAIGN_PROXY_SECRET || process.env.CAMPAIGN_PROXY_SECRET || "");
  if (request.method === "POST" && proxySecret.length < 32)
    return Response.json({ error: "verification_unavailable" }, { status: 503, headers });
  const forwarded = new Headers({ apikey: key, Origin: url.origin });
  for (const name of ["authorization", "content-type", "cookie"]) {
    const value = request.headers.get(name);
    if (value) forwarded.set(name, value);
  }
  // Never trust a browser-supplied X-Forwarded-For. Cloudflare supplies CF-Connecting-IP.
  const ip = request.headers.get("cf-connecting-ip") || "unknown";
  forwarded.set("x-forwarded-for", ip);
  if (request.method === "POST") {
    const stamp = String(Date.now());
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(proxySecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const message = ["proxy", stamp, slug, ip, body || ""].join("\n");
    const proof = Array.from(
      new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(message))),
    )
      .map((n) => n.toString(16).padStart(2, "0"))
      .join("");
    forwarded.set("x-dg-proxy-time", stamp);
    forwarded.set("x-dg-proxy-proof", proof);
  }
  try {
    const response = await fetch(
      `${base}/functions/v1/website-campaign?campaign=${encodeURIComponent(slug)}`,
      { method: request.method, headers: forwarded, body, signal: AbortSignal.timeout(20000) },
    );
    const output = new Headers(headers);
    output.set("Content-Type", "application/json");
    const cookie = response.headers.get("set-cookie");
    if (cookie) output.set("Set-Cookie", cookie);
    if (response.status === 429) output.set("Retry-After", "600");
    return new Response(response.body, { status: response.status, headers: output });
  } catch {
    return Response.json({ error: "server_unavailable" }, { status: 503, headers });
  }
}
