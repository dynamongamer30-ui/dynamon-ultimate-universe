import { Client } from "pg";
import { createRemoteJWKSet, jwtVerify } from "jose";

interface Env {
  HYPERDRIVE: { connectionString: string };
  NEON_AUTH_BASE_URL: string;
  ALLOWED_ORIGINS: string;
}

type ApiUser = { sub: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG = /^[a-z0-9][a-z0-9-]{0,63}$/;
const JWKS = createRemoteJWKSet(new URL("https://ep-proud-bread-azzu2cee.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth/.well-known/jwks.json"));

function response(request: Request, env: Env, data: unknown, status = 200): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "vary": "Origin",
  });
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGINS.split(",").map((item) => item.trim());
  if (origin && allowed.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("access-control-allow-headers", "Authorization, Content-Type");
    headers.set("access-control-allow-methods", "GET, POST, OPTIONS");
  }
  return new Response(status === 204 ? null : JSON.stringify(data), { status, headers });
}

async function authenticate(request: Request, env: Env): Promise<ApiUser | null> {
  const header = request.headers.get("Authorization") ?? "";
  const match = /^Bearer\s+([^\s]+)$/i.exec(header);
  if (!match) return null;
  try {
    const { payload } = await jwtVerify(match[1], JWKS, {
      issuer: env.NEON_AUTH_BASE_URL,
      requiredClaims: ["sub", "iss", "exp"],
      clockTolerance: 5,
    });
    if (typeof payload.sub !== "string" || !UUID.test(payload.sub)) return null;
    return { sub: payload.sub };
  } catch {
    return null;
  }
}

async function readBody(request: Request): Promise<{ slug: string; enabled: boolean } | null> {
  const length = Number(request.headers.get("Content-Length") ?? "0");
  if (length > 2048) return null;
  const raw = await request.text();
  if (raw.length > 2048) return null;
  try {
    const body = JSON.parse(raw) as { slug?: unknown; enabled?: unknown };
    if (typeof body.slug !== "string" || !SLUG.test(body.slug) || typeof body.enabled !== "boolean") return null;
    return { slug: body.slug, enabled: body.enabled };
  } catch {
    return null;
  }
}

async function query<T>(env: Env, text: string, values: unknown[]): Promise<T | null> {
  const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
  await client.connect();
  try {
    const result = await client.query<{ data: T }>(text, values);
    return result.rows[0]?.data ?? null;
  } finally {
    await client.end();
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const allowed = env.ALLOWED_ORIGINS.split(",").map((item) => item.trim());
    if (origin && !allowed.includes(origin)) return response(request, env, { error: "origin_not_allowed" }, 403);
    if (request.method === "OPTIONS") return response(request, env, null, 204);
    if (url.pathname === "/health" && request.method === "GET") {
      return response(request, env, { status: "ok", service: "neon-migration-test" });
    }

    const user = await authenticate(request, env);
    if (!user) return response(request, env, { error: "unauthorized" }, 401);

    try {
      if (url.pathname === "/api/profile" && request.method === "GET") {
        const data = await query(env, "SELECT migration.neon_api_profile_v1($1::uuid) AS data", [user.sub]);
        return data ? response(request, env, data) : response(request, env, { error: "profile_not_found" }, 404);
      }
      if (url.pathname === "/api/favorites" && request.method === "GET") {
        const data = await query(env, "SELECT migration.neon_api_favorites_v1($1::uuid) AS data", [user.sub]);
        return response(request, env, data ?? []);
      }
      if (url.pathname === "/api/favorites" && request.method === "POST") {
        const body = await readBody(request);
        if (!body) return response(request, env, { error: "invalid_request" }, 400);
        const data = await query(env, "SELECT migration.neon_api_set_favorite_v1($1::uuid, $2::text, $3::boolean) AS data", [user.sub, body.slug, body.enabled]);
        return response(request, env, data ?? { enabled: body.enabled });
      }
      if (url.pathname === "/api/likes" && request.method === "GET") {
        const data = await query(env, "SELECT migration.neon_api_likes_v1($1::uuid) AS data", [user.sub]);
        return response(request, env, data ?? []);
      }
      if (url.pathname === "/api/likes" && request.method === "POST") {
        const body = await readBody(request);
        if (!body) return response(request, env, { error: "invalid_request" }, 400);
        const data = await query(env, "SELECT migration.neon_api_set_like_v1($1::uuid, $2::text, $3::boolean) AS data", [user.sub, body.slug, body.enabled]);
        return response(request, env, data ?? { enabled: body.enabled });
      }
      if (url.pathname === "/api/progress" && request.method === "GET") {
        const data = await query(env, "SELECT migration.neon_api_progress_v1($1::uuid) AS data", [user.sub]);
        return response(request, env, data ?? {});
      }
      if (url.pathname === "/api/check-in" && request.method === "POST") {
        const data = await query(env, "SELECT migration.neon_api_check_in_v1($1::uuid) AS data", [user.sub]);
        return response(request, env, data ?? {});
      }
      return response(request, env, { error: "not_found" }, 404);
    } catch (error) {
      console.error(JSON.stringify({
        service: "neon-migration-test",
        path: url.pathname,
        error: error instanceof Error ? error.name : "unknown",
      }));
      return response(request, env, { error: "request_failed" }, 500);
    }
  },
};
