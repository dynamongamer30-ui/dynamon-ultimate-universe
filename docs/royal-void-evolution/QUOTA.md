# Operational request and quota report

Measured through Cloudflare's GraphQL `workersInvocationsAdaptive` dataset for 21 October 18:00 UTC through 22 October 18:00 UTC 2026 (21 October 23:30 through 22 October 23:30 Asia/Kolkata). Initial access hit an analytics rate limiter; a later bounded query succeeded. These are reported adaptive analytics totals for one window, not a capacity guarantee or a rolling average. Later rollout tests are outside this window.

| Worker | Reported requests | Reported errors | CPU p50 ms | CPU p99 ms |
| --- | ---: | ---: | ---: | ---: |
| dynamon-ultimate-universe | 1,848 | 0 | 4.217 | 159.960 |
| dg | 74 | 0 | 3.835 | 141.360 |
| generator | 15 | 0 | 3.902 | 16.981 |
| royal-void-v2 | 2 | 0 | 1.962 | 2.021 |
| Total reported | 1,939 | 0 | — | — |

Units verified by live GraphQL schema introspection: CPU quantiles are microseconds, converted to milliseconds here. Quantiles are sampled and must not be added or interpreted as per-request maximums. Zero reported invocation errors does not prove all application responses succeed. The high website/dg p99 deserves investigation; it does not justify disabling license checks. Account billing-plan, CPU allowance and all storage/database quotas remain unverified.

Workers Free currently documents 100,000 dynamic requests/day. The measured total is about 1.94% of that reference ceiling; the measured population and traffic are not assumed to equal the requested 250-user stress model. Static assets, database activity, bandwidth, retries and other account workloads require separate accounting. See [official limits](https://developers.cloudflare.com/workers/platform/limits/) and [analytics methodology](https://developers.cloudflare.com/workers/observability/metrics-and-analytics/).

| Hypothetical 8-hour simultaneous activity | 250 clients | 500 clients |
| --- | ---: | ---: |
| One startup call each | 250 | 500 |
| One call every five minutes | 24,000 | 48,000 |
| One call every minute | 120,000 | 240,000 |

The one-minute scenario exceeds the free request reference before website traffic. Preserve startup-driven verification; add no APK presence polling. Cache only safe public data and assets, deduplicate repeated reads and use bounded pagination. Core authentication, expiry and device licensing must remain authoritative.

Theme release request impact: switching all nine themes produces no added Supabase request and no write, verified in production browser tests. Global appearance piggybacks on the existing settings read. A deliberate owner publication writes one existing settings row then refreshes the existing bundle; previews and palette edits do not write. Approved grant remediation adds no recurring request or background job. Actual Supabase bandwidth/storage/auth utilization and KV/R2 operations remain pending; phase 33 is not certified.

## Account query sharing increment

Before: each mounted mod card invokes independent likes and favorites hooks; N cards cause N identical current-user likes reads and N identical favorites reads. Private profile reads also repeat per consumer. After: simultaneous consumers share one request per table/user or profile/user using the existing per-router TanStack Query client. A localhost browser fixture with all Supabase traffic intercepted confirms one likes read, one favorites read and one profile read for the full library. For eight cards, the two collection reads fall from an architectural expectation of 16 to a measured fixture count of 2 (87.5% fewer collection reads for that render). This is not a measured production-wide reduction or free-tier capacity guarantee.

No polling, subscriptions, schema changes or new backend requests. Active queries have a 60-second stale interval and no focus-triggered refetch or automatic retries; inactive account queries are immediately removed. User IDs partition cache keys, and signed-out UI consumes no account collection. An explicit refresh invalidates only that account's collection/profile query. Likes, favorites and profile writes retain existing Supabase paths and RLS; optimistic changes do not add speculative database writes. Site-wide aggregate likes/ratings reads and duplicate notification consumers remain separate optimization work.

## Verified Supabase storage snapshot — 23 October 2026 IST

The connected organization reports `plan: free`, `tier: tier_free`; the project remains ACTIVE_HEALTHY. Read-only SQL reports database size 23,080,083 bytes (23.08 decimal MB), including 3,162,112 bytes for public tables and indexes. Storage metadata reports 139 objects and 61,992,212 bytes (61.99 decimal MB). These measurements do not read object contents or private user records.

The [official Free-plan reference](https://supabase.com/pricing) lists 500 MB database size and 1 GB file storage. The snapshots are approximately 4.62% and 6.20% of those decimal reference amounts; provider metering and billable totals can differ from database/metadata snapshots. [Cached and uncached egress are separate allowances](https://supabase.com/docs/guides/platform/manage-your-usage/egress). No monthly egress, MAU or peak-concurrency totals are inferred from storage size. Capacity remains uncertified until those usage dimensions and peak request/CPU behavior are measured.

The owner published the intended initial website_appearance setting through the real owner UI: Royal Black default, all nine themes enabled, no custom palette overrides. SQL readback confirms the exact schema-1 JSON in the existing site_settings table. This intentional one-row insert plus settings refresh adds no recurring write or theme-switch request. No reward, account or key test rows were created.

## Notification query sharing increment

The header and inbox now share one account-keyed notification/read-receipt query. Simultaneous consumers require one notifications read and one receipts read rather than two of each. The public sender profile is shared for five minutes and only requested while signed in; signed-out shell fixtures confirm zero inbox, receipt or sender-profile reads. Active inbox data stays fresh for one minute, with no polling, focus refetch or automatic retries. Account inbox caches are discarded when inactive; sender cache contains only the existing public profile fields.

Read-state actions retain the existing RLS-backed upsert. Already-cached read IDs are removed from a requested batch before writing, preventing duplicate writes from stale callbacks. Failed writes roll back affected IDs and intentionally refetch server truth; this failure-only pair of reads is bounded and distinct from automatic write retries. All/Rewards/Updates filtering is local and adds zero requests. No reward-claim RPC, notification delivery, schema, grant or native contract change is introduced.

Retry clarification: disabling retries above refers to the TanStack Query layer. The installed Supabase PostgREST SDK retains its existing bounded retries for idempotent reads on network failure/503/520 (documented in its packaged source). This behavior is preserved. Successful-load request counts do not establish a zero-retry failure budget; no automatic write retry or polling has been added.

## Owner configuration loading/error increment

The existing four-read configuration bundle is unchanged. Loading/error state and editor gating add no request, row or background job. An explicit Retry repeats the same bundle. The isolated denied-read test confirms one settings read before that action and a second settings read after it. Existing Supabase SDK transient-read retries remain available. On a critical settings/overrides failure, previous values remain intact and owner editing is blocked; no fallback configuration is written automatically. No migration, grant, license rule or production branding write is part of this increment.
