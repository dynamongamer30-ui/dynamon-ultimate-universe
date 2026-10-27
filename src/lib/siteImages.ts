let cached: { at: number; branding: Record<string, unknown> } | undefined;
export async function siteImageResponse(request: Request): Promise<Response | null> {
  const path = new URL(request.url).pathname;
  if (!["/site-icon", "/site-preview"].includes(path)) return null;
  let branding = cached?.branding ?? {};
  if (!cached || Date.now() - cached.at > 30000) {
    try {
      const base = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const key =
        import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
      const response = await fetch(base + "/rest/v1/site_settings?key=eq.branding&select=value", {
        headers: { apikey: key },
        signal: AbortSignal.timeout(4000),
      });
      if (!response.ok) throw Error("Image settings unavailable");
      const rows = await response.json();
      branding = rows[0]?.value && typeof rows[0].value === "object" ? rows[0].value : {};
      cached = { at: Date.now(), branding };
    } catch {
      /* Use the last confirmed branding or bundled default. */
    }
  }
  const raw = branding[path === "/site-icon" ? "faviconUrl" : "previewImageUrl"];
  let target = new URL("/dynamon-gamer-avatar.png", request.url);
  if (typeof raw === "string" && /^(https:\/\/|\/(?!\/))/.test(raw)) {
    try {
      const candidate = new URL(raw, request.url);
      if (
        !candidate.username &&
        !candidate.password &&
        !["/site-icon", "/site-preview"].includes(candidate.pathname)
      )
        target = candidate;
    } catch {
      /* Keep the default. */
    }
  }
  return new Response(null, {
    status: 302,
    headers: {
      Location: target.href,
      "Cache-Control": "no-cache, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
