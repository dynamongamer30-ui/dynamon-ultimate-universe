# Subscription preference reliability — phase 18 increment

## Client behavior

The first-time update-preference dialog is keyed to the signed-in account. Superseded initial reads are canceled and guarded; the read has a ten-second deadline and no automatic retries. A session dismissal is checked before reading preferences, so it does not trigger another preference read on reload. An initial read failure stays closed rather than treating unavailable data as consent to show a prompt.

Saving uses an immediate pending lock, disables choices and dismissal controls, and routes Escape/backdrop/close through the same pending guard. Focus stays in the dialog while every control is disabled. Rendering through a body portal avoids ancestor stacking contexts; the panel retains vertical scrolling at short viewport heights. Failure preserves choices and explains that a partial change may already have been saved. No server error details are exposed.

The subscription step runs before notification_prefs completion. Subscribe requires a matching current-user ID in the returned upsert result. Unsubscribe verifies that the caller's row is absent after DELETE, including a bounded verification read; a silent zero-row DELETE cannot be reported as success while the row remains. Only then is asked_at written with the choices, and that preference upsert must also return the current-user ID. These are still two client writes, not an atomic transaction: if the second fails, the first may persist. Retry reconciles the selected subscription state again before marking completion.

Existing opt-in defaults and saved push_opt_in intent are preserved. The browser permission request is made only when the selected preference is enabled and permission is still default; denied permission is not described as enabled delivery. Source review found no push subscription/transport setup. Copy now says browser delivery is not enabled and removes weekly/instant-delivery promises. Tests stub the browser permission API locally; no real browser permission is granted or production subscription changed during QA.

## Production authorization gap

Read-only production catalog inspection confirmed RLS enabled and existing authenticated table grants. mod_subscribers has INSERT-own and SELECT-self-or-owner policies, with no UPDATE/DELETE policy. The client can detect this failure but cannot grant missing row access. Exact proposed own-row policies and rollback are in [SUBSCRIPTIONS-SECURITY-REVIEW.md](./SUBSCRIPTIONS-SECURITY-REVIEW.md). They remain unapplied until explicit approval. Existing grants, policies, owner rules, native sources and assets are unchanged by this client increment.

## Validation

The first four desktop behavior checks pass. An initial TypeScript check caught abortSignal placed after maybeSingle; moving it before the terminal response-shape method resolves the type error. Final TypeScript, build, 30 Node tests and zero-error lint pass with the 12 existing Fast Refresh warnings. All 32 subscription/account-cache checks pass across Chrome phone/tablet/desktop and WebKit iPhone in 3.3 minutes. Coverage includes held/double submit, all dismissal paths during pending, permission-call count, rejected/empty confirmations, partial preference failure/retry, zero-row unsubscribe with remaining row, already-absent unsubscribe, initial-read failure, session dismissal, shared reads and sign-out. All writes and identity data are local intercepted fixtures. Phone failure screenshots were reviewed; development tagger hydration warnings and the existing Firefox runtime limitation remain recorded. Final responsive/signed-out checks and rollout follow.

Final local responsive/public sweep passes 8/8 across the four browser projects in 2.0 minutes (subscriptions-layout-public.log), including dialog error/action bounds and reachability from 320x568 through 1920x1080, Escape dismissal after failure and signed-out isolation from preference/subscriber reads. The 32 prior behavior/cache checks remain passing. Source is unchanged after those source gates; final test-only formatting lint has zero errors and 12 existing warnings. The exact policy proposal is prepared and unapplied; the following production rollout contains client changes and documentation only.

## Production rollout — 24 October 2026

Client commit 128b95eb4c8c5283ff2a59a06a9458f277ce6763, tree f18e33a98e097fe1b5b546eae817f2c2d01d5c3e. Automatic Cloudflare build 40171f2b-a222-4068-8469-04cc122e35ec succeeded. Deployment 27b07042-7863-4ef1-8f07-7c51689fc4fa, version 477069a1-3f4f-45ef-ac91-a4312997935f, serves 100%.

All four live signed-out account-route checks pass across Chrome phone/tablet/desktop and WebKit iPhone in 37.8 seconds (subscriptions-live-public.log). Fresh phone/desktop inspection confirms the recovery copy in the delivered JavaScript, zero console/runtime errors, correct width and the visible Google action. Each auth sample makes exactly three public settings/overrides/statistics GETs; there are no preference, subscriber, profile or avatar reads/writes while signed out. No real notification permission, preference or subscription was changed. Local fixtures remain the evidence for pending, failure and save correctness.

The client increment is deployed. The reviewed own-row UPDATE/DELETE policy fix is still PREPARED, NOT APPLIED, awaiting explicit authorization. Subscription retries against an existing row and actual unsubscribe cannot be certified working under the current missing policies. Applying definitions changes future access, not stored records; no production data will be inserted/deleted as a test. Broader Phase 18 preference-management entry and real mutation/device/OAuth gates remain separate work.
