# Tesla campaign claim reliability — 24 October 2026

The campaign page keeps its existing behavior: an authenticated arrival automatically calls `claim_campaign_pass('tesla')`; signed-out visitors use the sign-in handoff. The former component retained attempted/result state across account changes, awaited an unbounded untyped RPC, accepted incomplete success payloads, and offered no usable recovery after an uncertain response.

## Account and request behavior

The page now mounts a separate session for each user ID, with a render-time identity guard and disposal cancellation. Previous-account results cannot replace the current result or emit a late success toast. Sign-out removes the result. Same-account auth refresh objects, focus and reconnect events do not restart the automatic claim. The automatic attempt is queued after effect setup settles and starts once for that mounted account; there is no claim-on-error loop.

RPC calls use generated types, a ten-second abort deadline and explicit SDK `retry(false)`. A synchronous pending guard suppresses overlapping manual checks; a request generation guard rejects late responses. Uncertain transport, timeout or malformed responses say **Claim not confirmed**, with **Check Rewards** and an explicit **Check claim again** action. That check can confirm a completed claim or complete one that did not commit. Browser abort does not establish server rollback.

A new success requires `ok: true`, a nonempty pass reference and a parseable future expiry. Optional campaign counters are shown only when they are valid positive integers with count no greater than the cap. Recognized already-claimed responses remain valid without expiry because the existing server's unique-violation branch can omit it. Their text directs users to Rewards for current availability; an expired recorded date is not described as an active pass. Sold-out, inactive and unauthenticated acknowledgments are terminal states with a Rewards link, rather than automatic retries. Recovery, sign-in and success actions meet the 44-pixel target convention.

## Existing server contract verified without claims

The repository definition locks the campaign row, checks the caller's existing claim before creating a pass and records a unique `(campaign_slug, user_id)` pair. An explicit repeat can therefore return `already_claimed`. This differs from the targetless Trainer Rank claim contract, which can advance another eligible level.

Read-only production metadata confirms `claim_campaign_pass(p_campaign_slug text) -> jsonb`, caller use, campaign-row locking, the existing-claim response and authenticated execute access. The production body has different indentation but matches the reviewed repository body after whitespace normalization: MD5 `0dbc6b1ff3d0077a68f36ab420661e2c`. The per-account campaign unique constraint is validated, nondeferrable and backed by a valid index. This is contract verification, not a concurrency/load test. No production campaign award RPC was invoked, and no function/grant/policy, cap, eligibility rule, draw or user/campaign row was changed.

## Sign-in and validation limits

The existing `dg_after_auth=/claim/tesla` handoff remains. If optional session storage is blocked, navigation to `/auth` still works; automatic return is not guaranteed, and the existing Auth page falls back to `/mods`. The local fixture simulates an authenticated completed profile and checks the return route. It does not perform Google OAuth, prove Google-provider eligibility or certify a fresh real account/device flow.

All 52 distinct local browser cases are validated across Chrome phone/tablet/desktop and WebKit: twelve campaign cases plus one signed-out four-route case per project. The full 5.7-minute matrix passed 48 cases; four handoff assertions rejected the router's inherited empty search parameters even though the return and success UI worked. The assertion now checks the pathname. All four corrected handoff cases pass in a focused 33.5-second repeat, including the one-claim request count. Passing unrelated cases were not rerun. The fixture's successful expiry is relative to the test date, avoiding a fixed-date expiry failure. Both runs remain under `tesla-local` and `tesla-handoff-repeat` in the external audit directory.

Coverage includes one automatic claim across same-account auth refresh/focus/reconnect, explicit recovery with duplicate-click suppression, stalled/late responses, account switch/sign-out isolation, malformed success, optional counter validation, terminal server denials, expired prior claims, synthetic sign-in return and blocked optional return storage. Recovery actions fit 320/1440-pixel layouts and meet the 44-pixel target convention; the narrow fixture screenshot was reviewed. TypeScript, production build and all 31 Node tests pass. Lint has zero errors and the same 12 baseline warnings. Generated sitemap output was restored. Public rollout verification follows.

All synthetic campaign sessions, acknowledgments and calls are localhost-only, with Supabase HTTP traffic intercepted. Production browser checks must use fresh signed-out contexts: opening this route in an authenticated production browser intentionally can award a pass. No real campaign claim, pass, key, clipboard value or protected row is used for QA. Development tagger hydration warnings and the existing Firefox Windows launch limit remain documented.

Full Phase 19 remains open for Trainer Rank state, durable reward/download recovery, broader expiry/concurrency handling and fresh authorized mutation/OAuth/device gates.

## Application and public rollout verified

Application commit `ff660bc17941fbca5ae580fe19640a02d36c176b`, tree `9f81c903321620dc0fd88bae6c02d5e36ca97394`, is on main. Automatic Cloudflare build `e635a309-963a-476f-8318-54bd930fd6be` succeeded. Deployment `d4ffdfa6-9f59-455a-aa2f-ff8dd4d61df5`, version `330c7de4-a0ed-4f44-9f61-77f98e21e8ac`, serves 100%.

Four fresh live signed-out checks pass in 43.4 seconds across Chrome phone/tablet/desktop and WebKit. Each visits `/claim`, a Trainer Rank claim URL, a synthetic granted-key URL and `/claim/tesla`. They verify visible headings, document fit, no exposed supplied key, no signed-out Claim now button, no runtime exception and no claim/redeem RPC. Logs/screenshots use `tesla-live-public` in the external audit directory. No authenticated production campaign visit or award was used for QA. This client increment is delivered; the remaining Phase 19 scope and real OAuth/device gates above stay open.
