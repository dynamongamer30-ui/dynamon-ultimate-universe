# Native engagement concurrency validation — 25 October 2026

Seven simultaneous-session scenarios pass against an isolated native PostgreSQL 18.6 cluster. This advances the earlier [engagement recovery review](ENGAGEMENT-RECOVERY.md) from locking analysis and single-connection SQL tests to executed lock-wait tests. No application, Worker, production SQL, award amount or permission change is included.

## Harness and safeguards

`tests/integration/engagement-postgres.test.mjs` is an opt-in suite, separate from the default Node glob. It requires trusted PostgreSQL binaries via `ENGAGEMENT_PG_BIN`, creates a fresh directory and cluster, selects an unused loopback port and connects only to `127.0.0.1` with a synthetic fixture owner. It does not accept a database URL, external hostname, existing data directory or production credentials. Inherited `PG*` environment settings are removed. Before schema creation it verifies that the server's data directory and port match the newly created fixture cluster.

The fixture uses local trust authentication for synthetic data only, does not register a service and leaves existing PostgreSQL services untouched. The server is stopped in `finally`; synthetic database files and logs are retained for audit. Windows child processes use hidden windows. The initial diagnostic run exposed inherited pipe handles from the detached server after `pg_ctl` exited. The wrapper now waits for that controller's exit and releases its pipes; `psql` continues to wait for complete output. No initial diagnostic run is counted as a pass.

`tests/fixtures/engagement-sql.mjs` shares the same canonical schema/function setup between the native and existing PGlite tests. It retains the minimal local auth/action/catalog doubles, real XP/badge/ledger DDL, deployed function bodies, approved helper/direct-write revocations and engagement access. The existing twelve PGlite contract cases are unchanged. No database package is added.

Example PowerShell command using the runtime verified on this machine:

```powershell
$env:ENGAGEMENT_PG_BIN='C:/Program Files/PostgreSQL/18/bin'
$env:ENGAGEMENT_PG_ARTIFACTS='C:/Users/yugva/.codex/tmp/royal-void-audit/native-postgres'
node --test tests/integration/engagement-postgres.test.mjs
```

Absent `ENGAGEMENT_PG_BIN` means an explicit skipped suite, never a concurrency pass. The artifact root is optional; its default is the operating system's temporary directory. Only newly created fixture clusters are started/stopped. The suite intentionally provides no option to run against an existing service.

## Executed scenarios

Each competing call uses an independent `psql` connection. Tests hold the first transaction open at an explicit output barrier and query `pg_stat_activity` to require a real `Lock` wait before releasing it; they do not infer concurrency merely from `Promise.all`.

| Scenario | Observed result |
| --- | --- |
| Same account/event/target, first transaction commits | Second caller waits, then returns `awarded:false`; one event, one badge and 27 XP |
| Different targets, existing XP row | Second caller waits; both base increments survive; one first-like badge and 29 XP |
| Different targets, first XP row created concurrently | Unique-row insertion/transaction ordering preserves both increments and one badge; 29 XP |
| First event transaction rolls back | Waiting caller proceeds as the first valid award; one event/badge and 27 XP |
| Different accounts | Second account completes before the first transaction is released; each gets its own event/badge/XP |
| Waiting call reaches server statement timeout | Its event and XP work roll back; a fresh call awards once and a repeat awards nothing |
| Committed acknowledgement discarded | A fresh connection sees the durable duplicate and does not award again |

The native run passes in 16.5 seconds: Node reports eight passing tests comprising the parent plus seven scenarios, with zero failures/skips. Evidence: `engagement-postgres-native-final.log`; retained fixture `native-postgres/dg-engagement-pg-Jqxe65` in the external audit directory. A separate `pg_ctl status` check confirms no fixture server remains running. The initial interrupted log is retained separately. Shared-fixture PGlite tests also pass after extraction.

## Production alignment and remaining limits

Fresh read-only production metadata still matches all three reviewed body hashes: engagement `a292243a2cb3bc3f807e34f1b4d5ec0a`, XP helper `e4c8856692a46f7718ebb389aa80e033`, badge helper `c28b1bd8e7b0e9f0ce06793a542d9b53`; default isolation remains Read Committed. Production reports PostgreSQL **17.6**; the available native runtime is **18.6**. These are genuine multi-connection tests of the same function bodies, but they are not exact-version, full-schema, Supabase HTTP/OAuth or real-device tests. No production award function or private row was accessed for this validation.

A server statement timeout is also different from a browser abort or lost HTTP receipt: a disconnected client cannot infer rollback from these tests. Trusted service/direct writers, deployment-specific isolation overrides, sustained load, arbitrary deadlock schedules, client receipt recovery and cross-tab/device freshness remain outside this matrix. The rating badge mapping and bonus-driven level threshold findings remain separate rule/backfill decisions. Phase 19 therefore remains partial; these passing scenarios narrow its concurrency uncertainty without certifying every progression path.

All 43 default Node tests, TypeScript/build, formatting and lint pass after shared-fixture extraction (zero lint errors/twelve baseline warnings). Generated sitemap output was restored. Application source is unchanged, so existing local browser scopes were not repeated; deployment verification is recorded after publication. Test-only source publication uses existing main and the established automatic Cloudflare build, with no independent Worker deployment.
