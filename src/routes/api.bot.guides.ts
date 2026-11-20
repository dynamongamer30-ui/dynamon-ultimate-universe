import { createFileRoute } from "@tanstack/react-router";
import { HELP_TOPICS } from "@/lib/helpTopics";

const fallback = {
  schema: 1,
  categories: [
    { id: "download", title: "Download & Installation", guideIds: ["start", "downloads"] },
    { id: "activation", title: "Get Key / Activation", guideIds: ["keys", "phoenix", "history"] },
    { id: "usage", title: "Settings & Usage", guideIds: ["accounts", "discovery", "compare", "preferences", "notifications"] },
    { id: "troubleshooting", title: "Errors & Troubleshooting", guideIds: ["campaigns", "troubleshooting"] },
  ],
  guides: HELP_TOPICS,
};

function validCatalog(value: unknown): value is typeof fallback {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.schema !== 1 || !Array.isArray(v.categories) || !Array.isArray(v.guides)) return false;
  const guides = v.guides as unknown[];
  const ids = new Set<string>();
  for (const item of guides) {
    if (!item || typeof item !== "object") return false;
    const g = item as Record<string, unknown>;
    if (typeof g.id !== "string" || !/^[a-z0-9_-]{1,64}$/i.test(g.id) || ids.has(g.id) ||
      typeof g.title !== "string" || !g.title.trim() || !Array.isArray(g.steps) ||
      !g.steps.length || !g.steps.every(s => typeof s === "string" && s.length <= 2000) ||
      typeof g.link !== "string" || !/^\/[a-z0-9/_-]*$/i.test(g.link)) return false;
    ids.add(g.id);
  }
  return (v.categories as unknown[]).every(item => {
    if (!item || typeof item !== "object") return false;
    const c = item as Record<string, unknown>;
    return typeof c.id === "string" && /^[a-z0-9_-]{1,64}$/i.test(c.id) &&
      typeof c.title === "string" && !!c.title.trim() && Array.isArray(c.guideIds) &&
      c.guideIds.every(id => typeof id === "string" && ids.has(id));
  });
}

async function loadPublishedCatalog() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || key.startsWith("sb_secret_")) return fallback;
  try {
    const endpoint = new URL("/rest/v1/site_settings", url);
    endpoint.searchParams.set("select", "value");
    endpoint.searchParams.set("key", "eq.bot_guides");
    const response = await fetch(endpoint, {
      headers: { apikey: key, ...(!key.startsWith("sb_publishable_") ? { Authorization: `Bearer ${key}` } : {}) },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return fallback;
    const rows: unknown = await response.json();
    if (!Array.isArray(rows) || !rows.length) return fallback;
    const value = (rows[0] as Record<string, unknown>).value;
    return validCatalog(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export const Route = createFileRoute("/api/bot/guides")({
  server: {
    handlers: {
      GET: async () => {
        const catalog = await loadPublishedCatalog();
        return Response.json({
          ...catalog,
          source: "official-website",
          updatedAt: new Date().toISOString(),
        }, {
          headers: {
            "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
            "Content-Type": "application/json; charset=utf-8",
          },
        });
      },
    },
  },
});
