# Compatibility and release map

## Protected integrations

* Website → Supabase: existing project, Google PKCE identity, profiles, community, settings, rewards and owner RLS.
* Website → generator: `/start`, `/check-token?ref=`, `/generate-key`; native gate/deep-link semantics preserved.
* APK → dg: config, payload, key verification, device licensing and existing compatibility responses. Source includes GET `/payload`, POST `/check`, POST `/heartbeat`, POST `/tamper`, GET `/config`, POST `/verify-key`; owner routes upload-payload, ban, unban, list. Inventory is source-based; live source equivalence remains unproven.
* generator → royal-void-v2: existing `V2_API` service binding and issuer secret. Preserve request/response/signing contracts.
* dg: existing DG KV and dynamon-mods R2 bindings; do not change namespaces or objects.
* royal-void-v2: existing Supabase, signing and HMAC bindings. No native or backend deployment in baseline repair.

R21 reference verified through connected GitHub release metadata: `dw140-r21-rage-root-compatible-v7`, target `ef21c9fc6d433b1dc929c6dc51bf928d253f84e9`, published 17 October 2026, versionCode 50. Native release notes explicitly say NOT DEVICE VERIFIED. Older experimental releases are not the reference. No binaries, signing material or gameplay files were downloaded or changed.

## Deployment

Cloudflare website script: `dynamon-ultimate-universe`, script tag `c4e996f3609841159d8a0b905815148c`. Both apex domains attach to this Worker. Main trigger `71eee318-3211-412f-9ba2-fc8f7c6a2390` runs `pnpm run build` then `npx wrangler deploy -c .output/server/wrangler.json`. Non-main trigger uploads versions only; do not use it for this task.

Baseline production deployment: `dac2b082-69d5-48d1-8439-3a34756e754b`, version `7bfb4d1e-6dc9-4e26-905b-cf774b710643`, 100%, 18 October 2026. Verified main build `53f49c7e-cb2f-45f6-9b2e-05f1dd2fdd08` succeeded for `fe983a93`. Later script modified timestamps can represent non-production version uploads, not live activation.

Before each commit: inspect diff, TypeScript, lint, Node tests, production build, affected browser tests, credentials scan, route inventory, native/Worker/schema impact. Main only; no PR, force push or feature branch.

After push: query builds by Worker TAG (not name), filter the result to status, outcome and commit SHA before logging; build metadata can contain environment values. Check active deployment versions and live public routes, console/network errors and affected UI. Do not treat a successful Git commit as a deployment.

Rollback: use a normal revert commit against the last accepted main change, rerun the same gates, push to main and verify Cloudflare deployment. For an immediate runtime incident the known prior Cloudflare version is available; preserve bindings and assets and verify rollout before resuming. Never force push, delete data or blindly upload the local Worker source. Local builds generate a default Worker name unless the deployment environment supplies its configured identity; do not deploy that generated name manually.

## Request budget

No new heartbeat, background write or presence loop is authorized. Supabase remains production authority. Current traffic and account-plan utilization have not been measured, so quota phase is incomplete.

Illustrative 250 concurrent clients × 8 hours: 120,000 calls/day at once per minute, 24,000 at once per five minutes, 250 for one startup per client. Double population doubles these counts. Add website, retry and auth traffic. Cloudflare currently documents 100,000 requests/day on Workers Free; the once-per-minute case alone exceeds that. Safe degradation should affect decorative work and cacheable public reads, never licensing/authentication. See [official limits](https://developers.cloudflare.com/workers/platform/limits/).

Review grants with [Supabase function security guidance](https://supabase.com/docs/guides/database/functions) and the [advisor explanation](https://supabase.com/docs/guides/observability/advisors?lint=0029_authenticated_security_definer_function_executable). No authorization changes are included in baseline repair.
