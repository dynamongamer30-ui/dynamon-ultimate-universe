# Engagement recovery and transaction review — 25 October 2026

Phase 19 remains partial. This increment verifies the existing durable event ledger and transaction behavior, fixes historical-event XP confirmation, and separates source-based concurrency conclusions from tests that need a real multi-connection database. It introduces no production migration, new award path, replay worker, polling or permission change.

## Production contract inspected read-only

The three deployed function bodies match the canonical migration sources after whitespace normalization:

| Function | Body MD5 | Source |
| --- | --- | --- |
| `record_engagement(text,text)` | `a292243a2cb3bc3f807e34f1b4d5ec0a` | `20261002095000_validate_engagement_targets.sql` |
| `award_xp_internal(uuid,integer)` | `e4c8856692a46f7718ebb389aa80e033` | `20261002094500_harden_engagement_rewards.sql` |
| `grant_achievement_internal(uuid,text)` | `c28b1bd8e7b0e9f0ce06793a542d9b53` | `20261002094500_harden_engagement_rewards.sql` |

All three use `SECURITY DEFINER` with `search_path=public`. Metadata confirms primary keys on XP `(user_id)`, badges `(user_id,achievement_key)` and engagement events `(user_id,event_key,target_key)`, their foreign keys, event whitelist check and enabled RLS. There are no non-internal triggers on those three tables. The database default is `read committed`; request-specific isolation overrides were not exercised.

Anonymous callers cannot execute these functions. Authenticated callers can execute `record_engagement`, but neither internal helper nor either legacy XP/badge RPC. The ledger has an authenticated own-row SELECT policy. Function-source inventory found only the reviewed engagement/internal helpers and the inaccessible legacy reward functions as public-schema writers/callers matching these progression paths. This is a source inventory, not an assertion that trusted service/direct SQL writers cannot exist.

Only definitions, privileges, constraints and public catalog existence flags were inspected. No production engagement, award, key, claim or spending function was invoked. No private user XP, badge, ledger row or license key was read.

## Durable receipt and rollback findings

The existing ledger is already a durable **record of a committed event identity**. The unique account/event/target tuple and `ON CONFLICT DO NOTHING` prevent repeat XP for that tuple. Base XP and badge work run inside the same statement transaction as insertion of that ledger row. A downstream failure rolls back the new receipt and XP together. A lost HTTP acknowledgement is not proof that the transaction rolled back.

A receipt is not a stored per-event XP delta, response payload or transaction status endpoint. Historical action backfills deliberately inserted ledger rows without awarding XP. Ledger presence can therefore mean “previously recorded/ineligible for another award,” not “this user received this many XP from this request.” Current XP remains a separate snapshot.

Action/catalog validation runs **before** the duplicate-event check. If the user removes a favorite after a committed award, replaying the RPC rejects the missing action even though its durable receipt remains. An own-row ledger SELECT can still find it. An absent receipt while an earlier transaction is unresolved does not prove a permanent failure. No automatic award replay or durable client outbox is introduced by this review. A safe future recovery UI should use bounded own-row receipt/current-XP reads, keep “unknown” explicit and avoid treating absence as permission to grant.

## Historical-event client fix

`20261002096000_backfill_engagement_events.sql` can create an event for an existing action without creating a `user_xp` row. The duplicate branch returns `{xp:0,level:1,leveled_up:false,awarded:false}` for that account. The preceding client release accepted the receipt but rejected the subsequent missing XP row, showing an unnecessary confirmation error.

The client now accepts a successful missing-row XP lookup as the existing zero-XP default **only when `awarded` is false**. A newly awarded receipt still requires a valid current XP row, since the server creates it in the award transaction. Lookup errors and malformed totals remain failures. No success/level-up toast is manufactured for a historical duplicate. The original account/revision guards, ten-second deadline, no SDK retries and lookup-only recovery remain intact. No extra request is added.

## Concurrency review and limits

For two calls with the **same** tuple, the unique ledger constraint arbitrates insertion; the losing `ON CONFLICT DO NOTHING` call takes the duplicate branch. For different tuples belonging to the **same account**, `award_xp_internal` performs `UPDATE user_xp SET xp=user_xp.xp+...`. PostgreSQL waits for a concurrent updater and applies the increment to the updated row under Read Committed; the row lock lasts until the transaction ends. The badge helper runs after that update and within the same transaction. Consequently, the helper's check-then-insert cannot by itself be cited as a demonstrated race between these reviewed `record_engagement` paths: they already acquire the same account XP row lock first. This is an inference from the verified call order and [PostgreSQL update/isolation behavior](https://www.postgresql.org/docs/current/transaction-iso.html) and [row-lock lifetime](https://www.postgresql.org/docs/current/explicit-locking.html).

The functions default to `VOLATILE`; PostgreSQL gives their successive internal queries fresh snapshots, as described in the [function volatility documentation](https://www.postgresql.org/docs/current/xfunc-volatility.html). The initial old-level SELECT occurs before the XP update lock, so receipt-level `leveled_up` can describe a comparison to an older snapshot. The client uses its confirmed current total for visible level feedback. No lost-XP or duplicate-badge concurrency defect has been demonstrated by this review, and no speculative production lock/schema change is justified.

The local PGlite engine is [single connection](https://pglite.dev/docs/multi-tab-worker). Sequential replay and rollback tests are real SQL execution but **not** simultaneous backend sessions. Genuine lock blocking, first-row races, cancellation/commit ambiguity, service-writer interference, deadlock/serialization behavior and cross-device UI freshness still require an isolated multi-connection PostgreSQL environment and/or authorized account/device checks. Existing client queuing coordinates only one provider lifetime; it does not synchronize tabs or survive reload as an outbox.

## Award-rule findings retained for separate review

- The rating path requests `first_review`, absent from both the canonical badge seed and the inspected public catalog; `first_comment` exists. The helper returns false for an unknown badge. This release does not invent a replacement or change which action earns a badge.
- Level badge checks use equality against the initial engagement row (`level=5` or `10`) before badge bonus XP is reflected. Bonus-driven crossings and skipped thresholds need an explicit award-rule/backfill decision, rather than a silent UI or migration change.
- Historical backfill receipts and a lost receipt after an action removal require nuanced recovery messaging; they do not justify unconditional award retries.

## Validation

`tests/engagement-database.test.mjs` loads canonical XP/badge/ledger SQL and deployed function bodies into the existing development-only PGlite dependency. Action/catalog tables and the auth identity function are minimal local fixtures. The harness applies the approved internal-helper/direct-write revocations and current engagement RPC access. It does not reproduce the entire production schema or run production reset/backfill migrations against the service.

Twelve database tests cover body identity, lost acknowledgement replay, own-row receipt visibility after action removal, toggle farming prevention, independent event/account identities, pre-write action/catalog/auth checks, pre-bonus receipt versus final XP, one-time collector bonus, forced downstream rollback, explicit outer rollback, historical backfill and denial of direct client XP/badge/ledger writes. All 43 Node tests pass, including these twelve. TypeScript and production build pass; lint reports zero errors and twelve existing warnings. Generated sitemap output was restored. All 32 local confirmation browser cases pass in 3.9 minutes across Chrome phone/tablet/desktop and WebKit, including historical missing-row success and newly awarded missing-row failure. The 320-pixel recovery screenshot was reviewed; existing 320/1440 overflow and 44-pixel retry-target checks pass. Public-route and rollout results are recorded below when complete.

Four fresh local signed-out public-route checks also pass in 52.9 seconds across phone/tablet/desktop/WebKit, asserting no private progression reads or mutations. Artifacts are `engagement-database.log`, `engagement-recovery-{check,node,lint,build}.log`, `engagement-recovery-local{.log,-results}` and `engagement-recovery-public-local{.log,-results}` in the external audit directory. Synthetic browser identities/writes remain localhost-only with all Supabase HTTP intercepted. The PGlite database is ephemeral and local; no new package or production database dependency was added. Firefox's Windows executable launch limitation and development tagger hydration warnings remain documented. Rollback is a reviewed inverse source commit on existing main, followed by the usual gates/deployment checks; it requires no database rollback.

## Production rollout

Application commit `d69bd1b37d2600cc33053eae195cbf6b2472f62b` is published to existing main. Cloudflare build `45c2c0cf-7cf0-4fdf-bff0-ac0e7663b505` succeeded; deployment `c41b6257-a03b-405e-a93f-9742153c7a63` serves version `5633fef8-2a4d-4e69-a132-30bea67da5ae` at 100%. Four fresh signed-out live phone/tablet/desktop/WebKit checks pass in 52.1 seconds without private progression reads or mutations (`engagement-recovery-live.log` and `engagement-recovery-live-results`). These are public production checks; synthetic historical-event/new-award behavior is validated locally, not by creating production events. The application increment passes its implemented gates; Phase 19 remains partial for the listed rule/recovery and real-session/device gates.

## Subsequent native concurrency evidence

An installed PostgreSQL 18.6 runtime was subsequently found and verified. Seven isolated native multi-connection scenarios now pass, including observed lock waits, commit/rollback, simultaneous first-row insertion, account independence and server statement timeout. See [NATIVE-CONCURRENCY.md](NATIVE-CONCURRENCY.md). This supersedes the earlier lack of a native concurrency harness for those scenarios. Production is PostgreSQL 17.6; exact-version/full-service/device and broader recovery/rule gates remain. No backend function or application behavior changed in that test-only increment.
