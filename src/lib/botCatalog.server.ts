import { mods } from "./mods";
import { buildBotCatalog } from "./botCatalog";

export async function botCatalogResponse() {
  try {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key || key.startsWith("sb_secret_"))
      throw new Error("Public configuration unavailable");
    const query = new URL("/rest/v1/mod_overrides", url);
    query.searchParams.set("select", "slug,hidden,name,version,size,updated_date,changelog");
    const response = await fetch(query, {
      headers: {
        apikey: key,
        ...(!key.startsWith("sb_publishable_") ? { Authorization: `Bearer ${key}` } : {}),
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Published catalog unavailable");
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error("Invalid catalog response");
    return Response.json(
      { ...buildBotCatalog(mods, rows), fetchedAt: new Date().toISOString() },
      {
        headers: { "Cache-Control": "public, max-age=60, s-maxage=60", "X-Robots-Tag": "noindex" },
      },
    );
  } catch {
    return Response.json(
      { error: "catalog_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "30" } },
    );
  }
}
