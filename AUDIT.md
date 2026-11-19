# Current infrastructure status — 2026-11-20

> This status update supersedes earlier point-in-time findings in the historical audit below. It records the current GitHub `main`, Supabase production, and Cloudflare production state.

## GitHub and deployment source reconciliation

- The website repository now has a main-only CI workflow. Latest run: **101/101 tests passed**, TypeScript check passed, and the Cloudflare application build passed. No branch or staging environment was created.
- `workers/generator/src/index.js` was synchronized from the active production Generator Worker. The source now includes the V2 license registration path that had been present in Cloudflare but missing from GitHub. `workers/generator/wrangler.toml` now declares the production `V2_API` service binding and required secret names.
- `workers/license-v2/src/index.js` now calls the legacy-key bridge only when the regular V2 claim has no license and the key format is eligible. The source and production Worker were reconciled.
- `workers/license-v2/wrangler.toml` now documents the existing production Worker name, compatibility date, public `SUPABASE_URL`, and secret bindings.
- Website HSTS source was aligned in `src/server.ts` and `public/_headers` with the Cloudflare zone policy: 180-day max-age, without `includeSubDomains`. The currently deployed website Worker bundle still contains the previous one-year `includeSubDomains` value; redeploy the website Worker from `main` to apply the source correction.
- The Container app's main-branch release workflow now requires its own `RV_CONTAINER_KEYSTORE_BASE64`, `RV_CONTAINER_KEYSTORE_PASSWORD`, `RV_CONTAINER_KEY_ALIAS`, and `RV_CONTAINER_KEY_PASSWORD` secrets; its latest run stopped safely because they are absent.
- LSPosed build workflows use the separate `RV_KEYSTORE_BASE64`, `RV_KEYSTORE_PASSWORD`, `RV_KEY_ALIAS`, and `RV_KEY_PASSWORD` secrets. The experimental build workflows are manual-only and refuse temporary signing certificates.
- The invalid duplicate `build-lsposed.yml` workflow was archived under `docs/legacy-workflows/` and replaced with a manual-only retirement notice. The R19 signing-continuity workflow is also manual-only.
- R18-pinned and R19-persistent signing workflows expect different certificate fingerprints; never reuse a key between them without confirming the target app's expected fingerprint.
- `Dynamon-Gamer-Bot` stores its application source in release ZIP archives rather than a normal tracked source tree. The root README was reviewed, but the archive's application code has not been fully audited.

## Supabase production

- Production migration ledger: **92** records. GitHub `supabase/migrations`: **62** SQL files. Reconciliation: **23 exact matches**, **17 same-name/different-timestamp**, **52 production-only**, **22 repo-only**. Do not run `supabase db push` until the original missing migration SQL is recovered.
- The existing source `supabase/reward_license_bridge.sql` was reviewed and applied as migration `20261119223925_royal_void_v2_claim_existing_key`; the matching migration file is committed on `main`.
- The new `rv2_claim_existing_key` function is SECURITY INVOKER, has an empty search path, and is executable only by `service_role`. An invalid-key probe returned no rows; no real customer key was activated during verification.
- The five `rv_v2` tables remain inaccessible directly to `anon` and `authenticated`. The five V2 RPCs are service-role-only.
- Latest advisors: health **0 findings**; security: 14 RLS-enabled/no-policy informational findings, 31 authenticated-executable SECURITY DEFINER warnings, and 1 leaked-password-protection warning; performance: 21 unused-index informational findings. The 14 no-policy tables have no direct `anon` or `authenticated` table privileges. No anonymous execution was found for the flagged SECURITY DEFINER functions.
- Current identity-provider records show Google only. The leaked-password advisory should be revisited if password sign-in is ever enabled.

## Cloudflare production

- `dynamongamer.com`: TLS 1.2 minimum, HTTPS redirects, 180-day HSTS without subdomain preload, and Cloudflare Managed Free WAF ruleset active.
- `dynamongamer.space`: HTTPS and redirect to `.com`; no managed WAF entrypoint because it is configured as a redirect domain.
- Both zones remain on SSL Full, not Full (strict), pending confirmation that origin `66.223.49.89` is correct and has a valid origin certificate.
- The production `royal-void-v2` Worker is on version 10 at 100% traffic. Its modules match GitHub `main`; existing bindings were preserved. `workers.dev` is enabled and preview URLs are disabled.
- The active `dg` Worker source matches GitHub `main`.
- The active Generator Worker source matches GitHub `main`, but its deployed version has no explicit compatibility date while `workers/generator/wrangler.toml` declares `2026-05-15`. Resolve this before a future redeploy; do not change the runtime date blindly.
- The website Worker uses the `ASSETS` binding and `CAMPAIGN_PROXY_SECRET`. Its HSTS source fix is committed but still needs a production redeploy.
- The suspiciously named managed response ruleset was not attached to an active phase entrypoint; it was left untouched. Worker observability and Logpush remain disabled. No DNS records, origin settings, secret values, or R2 access settings were changed in this continuation.

## Owner actions still required

1. **GitHub:** add the correct dedicated Container app signing identity as `RV_CONTAINER_KEYSTORE_BASE64`, `RV_CONTAINER_KEYSTORE_PASSWORD`, `RV_CONTAINER_KEY_ALIAS`, and `RV_CONTAINER_KEY_PASSWORD`. Separately add the LSPosed signing identity as `RV_KEYSTORE_BASE64`, `RV_KEYSTORE_PASSWORD`, `RV_KEY_ALIAS`, and `RV_KEY_PASSWORD` only after confirming its expected certificate. The R18-pinned and R19-persistent workflows expect different fingerprints.
2. **GitHub:** provide or extract the Dynamon Gamer Bot source archive into a tracked source tree if a full code audit is required.
3. **Supabase:** recover and provide the original SQL files for the 52 production-only migration records, especially the original Royal Void V2 schema migrations. Do not reconstruct or blank-fill them.
4. **Cloudflare:** enable account 2FA; confirm the origin IP and certificate; redeploy the website Worker from GitHub `main`; resolve the Generator compatibility-date mismatch before its next deployment.
5. **Production acceptance:** perform Google sign-in, profile loading, download/license redemption, campaign/reward claim, and `.space` redirect checks using real user flows. These were not simulated with customer credentials.

---

| Area | Item | Detail | Status |
|---|---|---|---|
| Scope | Live database | Read-only inspection of Supabase project dfxcpxzylyycrirtnkof. No SQL writes or migration application performed in this session. | Verified |
| Scope | Repository | Reviewed the four existing SQL files in supabase/migrations/ and their GitHub commit diffs before preparing part 2. | Verified |
| Scope | Cloudflare | Read source modules for Workers generator, royal-void-v2, and dg. The unrelated diwali-bot-update Worker was not inspected. | Verified |
| Existing fix | Public RPC lockdown | supabase/migrations/20261110120000_lock_down_public_rpcs.sql: giveaway RPC, trigger-only functions, admin RPCs, and signed-in RPC grants/revokes. | File reviewed; live ACL effects verified below |
| Existing fix | Owner RPC lockdown | supabase/migrations/20261110130000_lock_down_owner_rpcs.sql: account purge, owner-only RPCs, signed-in notification/search RPCs, and website_is_demo_owner. | File reviewed; live ACL effects verified below |
| Existing fix | Orphan cleanup and dead code | supabase/migrations/20261110140000_cleanup_data_and_dead_code.sql: removes orphaned reward/key history and drops generate_access_keys; consolidates owner-check plumbing. | File reviewed; live effects verified below |
| Existing fix | Performance batch part 1 | supabase/migrations/20261110150000_performance_batch_part1.sql: 29 FK indexes and hourly cleanup-valid-keys schedule. | File reviewed; live effects verified below |
| Verified live fix | FK indexes | 29 *_fkey_idx indexes exist across public and rv_v2. | Verified by DB query |
| Verified live fix | Key cleanup cron | cleanup-valid-keys is active with schedule 7 * * * *. | Verified by DB query |
| Verified live fix | Orphaned giveaway rows | Count of vip_giveaway_winners rows without a matching valid_keys row is 0. | Verified by DB query |
| Verified live fix | Orphaned reward history | Count of website_reward_keys rows without a matching valid_keys row is 0. | Verified by DB query |
| Verified live fix | Dead generator function | public.generate_access_keys(integer,text,integer,text) is absent. | Verified by DB query |
| Verified live fix | Giveaway RPC ACL | anon and authenticated cannot execute public.run_phoenix_pass_giveaway(); service_role can. | Verified by DB query |
| Verified live fix | Account purge ACL | anon and authenticated cannot execute public.delete_inactive_accounts(); service_role can. | Verified by DB query |
| Verified live fix | Owner RPC ACL | anon cannot execute public.website_owner_automation(); authenticated and service_role can. | Verified by DB query |
| New fix prepared | RLS init-plan policy rewrite | supabase/migrations/20261110160000_rls_perf_part2.sql: one BEGIN/COMMIT transaction, 62 current policy definitions dropped and recreated; auth.uid() references wrapped as (select auth.uid()). | Committed; NOT applied to database |
| New fix prepared | Scope count | Supabase performance advisor returned 75 findings. Thirteen findings are dg_owner_all policies and are excluded. app_config policies are excluded. The remaining 62 distinct policy definitions were read from pg_policies before generating SQL. | Verified by advisor and DB query |
| New fix prepared | Policy preservation | For each of the 62 policies, preserved name, table, permissive/restrictive mode, role list, command, USING and WITH CHECK expressions, changing only auth.uid() call shape. | Generated from live definitions; NOT runtime-tested |
| Worker compatibility | generator | Source uses SUPABASE_SERVICE_KEY for direct Supabase REST table access; no RPC call found in source. | Verified by source inspection |
| Worker compatibility | dg | Source uses SUPABASE_SERVICE_KEY for direct Supabase REST table access, including app_config reads; no RPC call found in source. | Verified by source inspection |
| Worker compatibility | royal-void-v2 | Source calls dg_is_owner, rv2_admin_key_action, rv2_claim_device, rv2_check_lease, and rv2_issue_key. Calls are made with SUPABASE_SERVICE_KEY. | Verified by source inspection |
| Worker compatibility | RPC ACL comparison | Live ACLs: dg_is_owner is executable by authenticated and service_role, not anon; rv2_admin_key_action, rv2_claim_device, rv2_check_lease, and rv2_issue_key are executable by service_role only. No public-key/anon-only mismatch found for these Worker calls. | Verified by source and DB ACL query |
| Worker compatibility | Secret bindings | All three Workers have a secret named SUPABASE_SERVICE_KEY configured. Secret values were not read or exposed. | Verified by secret-name metadata |
| Worker compatibility | Runtime health | No production HTTP smoke tests or end-to-end Worker requests were executed. | Not verified |
| Bug / risk found | Public profile exposure | profiles_select_all has roles {public} and qual=true; this permits logged-out visitors to read every row exposed through that table. This is broader than profiles_public_safe_read. | Verified by pg_policies; decision pending |
| Bug / risk found | Duplicate owner authorization model | Thirteen dg_owner_all policies use a hardcoded lower(auth.jwt()->>'email') predicate; app_config_owner_all uses dg_is_owner(). | Verified by pg_policies; decision pending |
| Bug / risk found | Split policy design | notifications, site_settings, avatar_pool, and claim_campaigns have separate read/write policy paths; avatar_pool and claim_campaigns also have additional public/deny policies. | Verified by pg_policies; decision pending |
| Bug / risk found | Public SECURITY DEFINER functions | Security advisor reports seven anon-executable SECURITY DEFINER functions: create_secure_session, has_role, is_owner_user, redeem_access_key, redeem_secure_session, username_available, website_campaign_status. These are described as intentional in the existing migration, but their exposed behavior and rate limits still merit periodic review. | Advisor verified; security review open |
| Bug / risk found | Authenticated SECURITY DEFINER functions | Security advisor reports 32 authenticated-executable SECURITY DEFINER functions. Some are intentionally user-scoped or owner-checked; each remaining function body and caller path should be reviewed rather than treating the advisor warning alone as proof of exploitability. | Advisor verified; full function-by-function review open |
| Bug / risk found | Password breach protection | Supabase security advisor reports leaked-password protection disabled. | Advisor verified; enablement decision open |
| Bug / risk found | RLS-enabled tables without policies | Security advisor reports 14 RLS-enabled tables without policies across public and rv_v2. This denies ordinary API roles by default and may be intentional for service-only/internal tables; consumers and intended access paths need confirmation. | Advisor verified; intended access not verified |
| Bug / risk found | Multiple permissive policies | Performance advisor reports overlapping permissive policies, including on profiles, notifications, mod_overrides, site_settings, and several owner tables. Overlap can be intentional but requires review because permissive policies combine with OR semantics. | Advisor verified; full semantic review open |
| Pending decision | (a) profiles_select_all | Keep public read access to every profile row, or restrict/remove it and rely on profiles_public_safe_read plus self/owner access? | Owner decision required |
| Pending decision | (b) dg_owner_all vs dg_is_owner | Keep the 13 hardcoded-email dg_owner_all policies, or unify owner checks with dg_is_owner()? app_config_owner_all already uses dg_is_owner(). | Owner decision required |
| Pending decision | (c) Four split read/write tables | Keep separate read and write policies on notifications, site_settings, avatar_pool, and claim_campaigns, or merge where semantics permit? Preserve current behavior until decided. | Owner decision required |
| Excluded policy | app_config | No policy on app_config was included in the new migration. app_config_owner_all uses dg_is_owner(); dg_owner_all on this table is also excluded. | Intentionally untouched |
| Excluded policy | profiles_select_all | No change included in the new migration. Current roles are {public}; qual is true. | Intentionally untouched |
| Excluded policy | dg_owner_all | All 13 policies named dg_owner_all were excluded, including the one on app_config. | Intentionally untouched |
| Open | RLS migration execution | The new migration must be reviewed and run by the project owner through the normal controlled deployment process; it has not been applied here. Re-run performance advisor after applying to confirm findings. | Open |
| Open | Functional regression tests | Test owner/admin operations, profile reads/updates, comments/reactions, notifications, rewards, claims, reports, user preferences, and all affected API routes after the migration. | Not run |
| Open | Worker smoke tests | Exercise generator key generation, dg configuration reads, and V2 issue/claim/check/admin paths in a controlled environment. Static compatibility is not runtime availability. | Not run |
| Open | Four earlier migrations in migration history | GitHub contains all four files. Supabase migration history query ended at 20261029090105 and did not list the 2026111012xxxx through 2026111015xxxx files. Live DB state matches the key measurable effects above, but migration-history registration is not present in the queried history. | Verified discrepancy; reconciliation required |
| Open | interview.md naming | Request mentioned interview.md, while the explicit report instruction names AUDIT.md and the commit instruction asks for both files (migration and report). This audit uses the explicitly specified AUDIT.md filename. | Naming interpretation |
| What we know vs what we assumed | Existing migration contents | The four named SQL files and their statements were read from the repository; this is not inferred from commit messages. | Verified by code read |
| What we know vs what we assumed | Existing migrations live effects | Index count, cron schedule, orphan counts, dropped function existence, and selected RPC ACLs were queried from the live database. | Verified by DB query |
| What we know vs what we assumed | 75 RLS advisor findings | Count and finding names were returned by the live Supabase performance advisor. | Verified by advisor |
| What we know vs what we assumed | 62 candidate policy definitions | All 62 current policy definitions were read from pg_policies and matched against the distinct advisor finding pairs before SQL generation. | Verified by DB query |
| What we know vs what we assumed | RLS rewrite semantic equivalence | The SQL changes only auth.uid() evaluation shape and retains the retrieved policy structure; actual planner behavior and application behavior after execution have not been observed. | Inferred; not verified |
| What we know vs what we assumed | Worker RPC names and credentials path | Worker source code was read; secret-name metadata was checked without retrieving secret values; live database function ACLs were queried. | Verified by code and DB query |
| What we know vs what we assumed | Worker runtime success | No request was sent through production Worker routes and no live key-generation/license flow was executed. | Not verified |
| What we know vs what we assumed | Security impact of public profiles | The policy permits public row visibility under RLS; which profile columns are actually exposed depends on grants, API/view paths, and selected columns. Those application-level paths were not exhaustively tested. | Policy verified; complete exposure not verified |
| What we know vs what we assumed | Security intent of policy-free tables | RLS is enabled and no policies exist on the 14 advisor-listed tables; intended service-only use is inferred from names/architecture, not proven for every caller. | Not verified |
| What we know vs what we assumed | Whether four split policy pairs should merge | Current policy definitions were queried. Whether merging is desirable depends on app query patterns and intended policy semantics. | Not verified |


## Final remediation status — 2026-11-20 (supersedes earlier status above)

The latest fetched `main` is `556cba4`. The user’s later RLS/owner migrations were preserved by fast-forward, and the current live Supabase ledger confirms the project migration `20261119073907_harden_progression_and_download_sessions` plus user-authored migrations through `20261119195518` are applied. The previously missing source for `20261119195224_optimize_rls_auth_initplans` is now present in `main` and aligned with the live ledger. The owner-policy consolidation correlates with the multiple-permissive-policy advisor count falling from 102 to 66.

The applied project migration restricts progression-table access, tightens public-schema creation rights, and binds secure download sessions to the authenticated account and displayed version. Local PGlite regression tests cover anonymous denial, authenticated self-read, session ownership/version checks, and schema privileges. The source migration is committed under its live ledger version, avoiding an alternate replay ID.

Latest Supabase security advisor snapshot: 2 anon-callable and 32 authenticated-callable SECURITY DEFINER functions, 14 RLS-enabled/no-policy informational findings, and leaked-password protection disabled. Performance snapshot: 21 unused-index notices and 66 multiple-permissive-policy notices. Review these against intended caller behavior/workload; they do not automatically prove exposure and are not automatic instructions to revoke functions, remove indexes, or merge policies.

The live owner-flag reconciliation migration remains applied; it updates profile rows and records prior flags. This session did not execute it or inspect affected profiles/private audit rows. Its SQL embeds personal owner identifiers and its `<>` email comparison does not match NULL values; the affected accounts and NULL edge case remain unverified. Do not rerun this data migration.

Website changes polish header/catalog search, announcement tap targets, override-aware related-build versions, and version-bound unlock redemption. Dependencies were patched with pnpm workspace overrides. Final checks on the latest source passed: 101/101 tests, TypeScript, changed-file ESLint, Prettier, 9/9 Playwright checks across phone/tablet/desktop, and production build (`BUILD_EXIT=0`). Full repository lint still has unrelated errors in untouched files. Production and full dependency audits reported zero known advisories.

The recent user-added Monetag script and service-worker assets remain intact; their mutable third-party execution/privacy implications are documented in the detailed report. Tests mock the vendor domains and do not validate registration or vendor behavior. The Supabase CLI project ref matches production, but the deployed Cloudflare `SUPABASE_URL` binding value was not read; live Worker-to-database mapping and GitHub-to-Cloudflare auto-deploy remain unverified. No Cloudflare settings or deployment were changed. The `.com` `www` origin remains unresolved.


## Git delivery

The reviewed changes were committed and pushed to `main` as `f919a5b` (`fix: secure download sessions and polish search UI`). The remote `main` ref was verified at the pushed commit. No Cloudflare deployment or configuration change was made.