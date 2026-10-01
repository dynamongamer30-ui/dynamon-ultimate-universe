/**
 * Deploy freshness guard.
 *
 * Vite gives every JS/CSS file a content hash, so a new deploy never
 * overwrites an old file's content under the same name — that part is
 * already safe. The one real risk is a tab that has been open since
 * BEFORE a deploy: its HTML still references the old file names, and
 * once Cloudflare's old build is cleaned up those requests start
 * failing. Left alone, that shows the user a blank screen or a click
 * that silently does nothing, with no clear reason why.
 *
 * This listens for that specific failure and reloads the tab once,
 * automatically, to pick up the new deploy — no user action needed.
 * A sessionStorage flag stops it from looping if a reload doesn't
 * help (e.g. the person is offline).
 */

const RELOAD_GUARD_KEY = "__dg_reload_once";
export const STALE_CHUNK_PATTERN =
  /Failed to fetch dynamically imported module|Loading chunk|Importing a module script failed|dynamically imported module/i;

export function reloadOnce() {
  try {
    if (sessionStorage.getItem(RELOAD_GUARD_KEY)) return;
    sessionStorage.setItem(RELOAD_GUARD_KEY, "1");
  } catch {
    // sessionStorage unavailable (private mode etc.) — still safe to reload once.
  }
  window.location.reload();
}

export function installDeployFreshnessGuard() {
  if (typeof window === "undefined") return;

  window.addEventListener("error", (e) => {
    if (STALE_CHUNK_PATTERN.test(e?.message || "")) reloadOnce();
  });
  window.addEventListener("unhandledrejection", (e) => {
    const reason = (e as PromiseRejectionEvent)?.reason;
    const msg = typeof reason === "string" ? reason : reason?.message || "";
    if (STALE_CHUNK_PATTERN.test(msg)) reloadOnce();
  });
}

// Install immediately on module load (not gated behind a React effect) so the
// window-level net is up before any route chunk has a chance to fail during
// the very first navigation.
installDeployFreshnessGuard();
