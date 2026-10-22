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
