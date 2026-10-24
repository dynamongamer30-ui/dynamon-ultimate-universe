# Trainer Rank client state — 24 October 2026

The achievements route previously fetched the rank catalog and caller progress sequentially through unguarded component state. Account changes could leave old progress visible, failed/empty data could leave permanent skeletons or implied level-zero status, and finishing daily check-in did not refresh rank eligibility. The existing progress RPC returns no row after the last configured rank, so an empty response alone does not prove completion.

## Queries and confirmed eligibility

The ladder is now an account-keyed component with a shared public catalog query and an account/streak-keyed private query. Catalog data is fresh for 60 seconds; private data has zero cache retention after unmount and is stale on return, so leaving for the claim page and returning fetches current progress. Same-account auth objects, focus and reconnect do not trigger repeated lookups. Both sources use typed SDK builders, ten-second request deadlines, cancellation and disabled SDK/query retries. There is no polling loop.

A pathname guard also prevents a transient remount of the previous outlet from starting a rank request on the claim page. A soft-navigation fixture exposed three progress requests for initial view/claim/return before that guard; the corrected flow has exactly two, with the public catalog still fetched once. Returning refreshes the changed rank without invoking an award.

Private lookup waits until daily check-in settles. A successful confirmed streak changes the query key, refreshing eligibility after check-in recovery or UTC-day changes. The Claim link requires a confirmed check-in, a successful current progress result and a matching configured next rank. During an error, refresh, mismatch or pending check-in, no stale claim link is exposed. The server still makes the award decision through the unchanged claim endpoint.

The public catalog requires contiguous positive ranks, nonnegative integer thresholds/quantities and supported reward kinds. Progress needs a single valid row with its next rank and acknowledged eligibility. Catalog and progress thresholds/reward kind/quantity must match before personalized ladder status is rendered. Independent error/retry controls preserve healthy source data: catalog errors can retain a proven current-rank summary; private errors retain generic reward cards without fabricating Claimed/Claim links. An empty catalog has an explicit configuration state.

When the progress RPC returns no row, the client makes a caller-filtered SELECT of `user_trainer_progress.current_level`. Only a valid own-row level equal to the final catalog rank produces the all-claimed state. Missing/denied/malformed proof is an error; an incomplete level with no next-row response is a configuration mismatch. Neither is treated as completion.

## Existing server behavior and authorization

`my_trainer_progress()` is not a strictly read-only RPC: it can insert the caller's default progress row with ON CONFLICT DO NOTHING. This existing behavior is preserved, and no real account's RPC is invoked for QA. The fallback own-row SELECT does not award or initialize progress. No claim, pass, XP or achievement is created by the new component itself.

Read-only production metadata confirms the function signature/shape, caller use, default initialization and authenticated execute access. Its whitespace-normalized body matches the repository definition: MD5 `3943c868c48ffc42784dff3728b8057d`. The existing progress table has RLS enabled, authenticated SELECT and `trainer_progress_read_own` using `(user_id = auth.uid())`. The client also supplies its user-ID filter. No definition, policy, grant, stored progress or reward rule changes are part of this increment.

## Layout and validation

The rank cards wrap rewards/actions at narrow widths, keep locked state beside the rank title and expose a descriptive Claim action with a 44-pixel target. Narrow screenshot review also found the existing achievements heading spilling out of its card despite a passing document-width check. The heading now scales down on narrow screens, and focused checks include its own text bounds.

All 56 distinct local cases are validated across Chrome phone/tablet/desktop and WebKit through the main matrix and focused repeats. The main 52-case matrix passed 50 cases in 5.2 minutes; one phone status selector was ambiguous while skeletons were visible, and one signed-out public startup/settings check timed out. The next focused run passed all eight layout/public repeats in 1.5 minutes, including the selector repair and heading-bound checks, but exposed an unnecessary request in all four newly added claim-return cases. After the pathname guard, all twelve return/account/auth-refresh regression cases pass in 1.1 minutes. The new narrow screenshot was visually reviewed. Passing unrelated data-state cases were not rerun without cause. All attempts are retained under `trainer-local-final`, `trainer-focused` and `trainer-return` in the external audit directory.

Coverage includes independent source errors/retry, empty catalog, malformed progress, final-rank proof/failure/mismatch, old-account and stalled responses, check-in gating/recovery refresh, shared public caching, claim-return freshness and 320/1440-pixel layouts. The first development attempt was interrupted to correct SDK chain order: cancellation/retry modifiers must precede `maybeSingle()` in this installed typed builder. The waiting-status fixture now also waits for its held request before releasing it. Final source gates and public rollout follow.

Final TypeScript, production build and lint pass with zero errors and the same 12 existing Fast Refresh warnings. All 31 Node tests pass. Generated sitemap output was restored. Public rollout verification follows.

All synthetic progress, check-in and completion data is localhost-only with Supabase HTTP traffic intercepted. Real production browser checks remain signed out. No real rank/claim/key/pass/progression record is read or changed for QA. Fixture passes do not certify server concurrency, real OAuth or device behavior. Existing development tagger hydration warnings and Firefox's Windows executable launch limitation remain recorded.

## Remaining project scope

Trainer Rank client state is one Phase 19 increment. Broader progression response ordering/expiry, durable reward/download receipts and authorized live mutation/OAuth/device checks remain. The 37-entry roadmap currently has 15 entries marked Partial (including capacity certification), a generator phase pending broader work and an APK/device gate blocked; other verified baseline/increment labels are not final certification. Remaining work also spans owner controls, efficiency/performance/quota evidence, accessibility/visual/SEO/PWA coverage and final hardening/reporting. Phase numbers do not measure percentage completion.
