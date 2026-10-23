# Community database reads and pagination

Status: additive database functions and website integration deployed and read back. This record extends phase 16 and phase 25. It does not certify the remaining program phases.

## Request contract

- `get_review_page(p_slug text, p_page integer = 0)`: one SQL snapshot computes the full visible root-thread count, review-like total and rating count/sum, then returns at most ten root threads with their safe author fields and five chronological reply previews each. Owner threads precede other threads; owner threads use newest-first ordering, other threads use most likes then newest, and UUID breaks ties. Requested pages are clamped to the current last page. Only the selected bodies/authors/previews cross the network.
- `get_review_replies(p_parent uuid, p_after_time timestamptz = null, p_after_id uuid = null)`: returns at most five replies, a total and `hasMore`. The chronological cursor includes timestamp plus UUID, so equal timestamps do not skip or repeat replies. The parent must be a root review, and replies must belong to its mod. The interface preserves displayed replies on failure and offers an explicit retry.
- `get_public_mod_stats(p_slugs text[])`: at most 100 requested slugs, one aggregate row per distinct slug, including zero-activity slugs. Returns mod-like counts and rating count/sum, never voter identities. The provider requests the website's eight known slugs instead of downloading every like and rating.

All three are STABLE, SECURITY INVOKER functions with an empty search_path and schema-qualified relations. The migration revokes default PUBLIC execution only on these new endpoints and explicitly permits anon/authenticated/service_role. Existing tables, policies, table privileges, function privileges, award paths and account identities are not changed. No SECURITY DEFINER helper, new background polling, materialized counter cache or Worker endpoint is introduced.

Root pages are consistent within each response. Activity can reorder reviews between requests; no cross-request frozen ranking is claimed. Reply cursors remain chronological. Reactions retain the earlier shared visible-root query and bounded response ranges; reaction aggregates remain a separate optimization.

The read model is decoded before it replaces UI state. Counts, response sizes, parent/mod identity and timestamps are checked. Existing profiles may have null usernames/display names; the existing trainer fallbacks remain supported. The Reviews stat now counts root review threads, independently from the configured/blended rating-vote total. Likes retain the configured seed plus the complete real review-like total, including off-page replies. Optimistic changes apply only their local delta over the last aggregate, avoiding page-size-dependent totals.

## Production preflight and postflight

Verified active project: `dfxcpxzylyycrirtnkof`, PostgreSQL 17, ACTIVE_HEALTHY. Inspected the live comments, likes, reactions, ratings, indexes, read policies and `public_profiles` security-invoker view. The migration was first generated with Supabase CLI 2.122.0; its local timestamp was then aligned with the actual applied migration version `20261023152754`.

The policy fingerprint remained `2fb08bce89be8ead02e185b09364b649`; the existing table/view grant fingerprint remained `7f187293fdab720b7379d2b23baf8341`. Catalog postflight confirms all three functions have `prosecdef=false`, STABLE volatility and the pinned search path. Anonymous-role read-only SQL tests returned eight Thunder roots, an out-of-range page clamped to zero, one stats row and zero replies for a nonexistent parent. Direct anonymous REST reads also succeeded.

Security advisor checks after installation report no finding for any of these functions. Existing unrelated findings remain tracked by the project audit; this optimization does not broaden their scope. Official guidance: [database functions and invoker security](https://supabase.com/docs/guides/database/functions), [Supabase database advisors](https://supabase.com/docs/guides/database/database-linter).

## Measured live sample

For the current eight website mods, the previous public statistics reads returned 23 like rows and 42 rating rows: 2,482 response-body bytes in two requests. The aggregate endpoint returned eight rows: 629 bytes in one request, a 74.7% reduction for this response category. Every per-mod count and rating sum was compared against the original reads and matched. This is not a whole-page transfer or peak-capacity claim. The live review-page response contained eight roots, no replies and 4,812 bytes in one request.

## Verification and limitations

A pinned development-only PGlite 0.5.11 dependency executes the actual migration in local Postgres with synthetic data. Tests cover 1,005 root reviews, more than 2,000 ratings, more than 1,200 mod likes, globally ranked pages, exact final-page clamping, 13 replies sharing a timestamp, anonymous versus authenticated RLS, per-caller liked flags, denied table access, an unrelated role denied function access, private-column exclusion and invalid request bounds. PGlite/WASM assets are absent from the built deployment output.

Browser mutation tests use intercepted localhost requests and synthetic identities. They preserve denied/empty-write rollback, pending locks and reply drafts, and now exercise page denial/retry, reply denial/retry and cursor loading. They assert no raw comments snapshot is downloaded and preserve totals while changing pages. The initial broad run was 21/24: two public routes exposed the too-strict nullable-username decoder, and one write test matched both the exiting textarea and newly rendered reply. The decoder now preserves nullable names; the reply assertion targets the posted paragraph. No assertion was removed.

The next broad run was 26/28: the remaining WebKit public checks did not settle settings readiness in 15 seconds. A separate traced WebKit sample completed every settings/statistics request successfully on localhost and the deployed site; the failed evidence is retained. Configuration reads now have a ten-second abort deadline and always settle, and failed public totals retain prior counts without blocking successful configuration. Owner fixtures additionally deny the statistics endpoint while verifying that saved configuration can still load, edit and publish normally. Final focused validation passes 8/8 community/owner checks across all four projects, including actual review counts and failed-statistics isolation. The full WebKit public-route/navigation repeat passes 2/2. TypeScript, all 24 Node tests, lint (zero errors, 12 existing warnings) and production build pass. The earlier failed runs remain recorded; the broad run is not reported as 28/28. Website publication and live readback follow this checkpoint.

Recovery: the old website can continue operating with the new functions installed. If a website rollback is required, roll back the website first and retain the read-only endpoints. No production record rollback is needed. Any later removal of unused endpoints should be a separately reviewed schema migration.

## Website rollout and live readback

Code commit `5194cf8a8e659234e70eba05abace13d3ea85817`; tree `fcacff6a635b71a980edca56832b101f3c267e19`. Automatic Cloudflare build `6f977c20-0642-40e2-bc6a-680ff8244643` succeeded. Deployment `20b49c2b-22fc-44cd-9b7e-339e2dc25a56`, version `026c71ac-8e55-40ab-bde1-792de053e016`, serves 100%.

Live phone/desktop samples confirm the deployed bundle, eight actual review threads, correct panel bounds, no console/runtime errors, one review-page GET, one statistics GET, one shared reaction GET, and zero raw comment/rating/like/profile snapshots. All sampled Supabase traffic is GET; no production community mutation was made.

The production public run passed seven of eight tests, including every four-project route sweep. WebKit's separate navigation test timed out at page.goto while waiting for networkidle (30-second total test budget). The navigation test now waits for DOMContentLoaded and the existing explicit settings-ready flag, keeping every menu, search, Escape and focus assertion. Playwright's installed API reference discourages networkidle for test readiness. The focused live WebKit repeat passes in 9.7 seconds; the failed run is retained. The final four-project live navigation repeat passes 4/4 in 35.8 seconds. All four projects have passing route and navigation results; the original 7/8 run remains recorded.
