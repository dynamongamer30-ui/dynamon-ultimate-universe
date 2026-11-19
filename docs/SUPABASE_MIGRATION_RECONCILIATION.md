# Supabase production migration reconciliation

Last checked: 2026-11-19
Project: `dfxcpxzylyycrirtnkof`
Repository branch: `main`

## Current state

- Production migration history: **89 records**
- `supabase/migrations/` in `main`: **59 SQL files**
- Exact version matches: **20**
- Same migration name but different timestamp: **17**
- Production records with neither a matching version nor matching name in the repo: **52**
- Repo files with neither a matching version nor matching name in production: **22**

A matching name is only a candidate correspondence, not proof that the SQL contents are identical. Supabase's migration history table records version/name metadata; it does not retain the original SQL body. A repository-path lookup for an example missing production migration did not find the file in GitHub history.

## Do not do this

- Do not run `supabase db push` against production while this mismatch remains unresolved.
- Do not create empty placeholder SQL files for production-applied migrations.
- Do not run `migration repair` or edit `supabase_migrations.schema_migrations` based only on matching names.
- Do not replay old data migrations or seed/backfill migrations against production.
- Do not rename a migration file to a production version until the original SQL is recovered and compared.

Those shortcuts can make the ledger look aligned while leaving fresh environments with an incomplete or different schema, or replay destructive/backfill work.

## Same-name timestamp mismatches

These repo files have the same migration name as a production record but a different version. Recover the original production SQL or otherwise prove content equivalence before renaming or repairing:

| Production version | Production name | Repo version |
|---|---|---|
| 20260725174142 | create_secure_session | 20260729000000 |
| 20260801123702 | trainer_rank_ladder | 20260801120000 |
| 20260806031658 | admin_grant_phoenix_pass | 20260805150000 |
| 20261001090248 | report_moderation_notifications | 20261001150000 |
| 20261001090316 | backfill_recent_report_alerts | 20261001151000 |
| 20261001092155 | separate_ratings_and_comments | 20261001160000 |
| 20261002034145 | separate_mod_ratings | 20261002092000 |
| 20261002041231 | harden_engagement_rewards | 20261002094500 |
| 20261002041401 | validate_engagement_targets | 20261002095000 |
| 20261002041543 | revoke_legacy_reward_rpc_access | 20261002095500 |
| 20261002043025 | reset_non_owner_accounts_welcome_pass | 20261002100000 |
| 20261002043657 | burn_broadcast_notifications | 20261002103000 |
| 20261029024146 | website_reward_experience | 20261028185258 |
| 20261029025120 | website_notification_cleanup_schedule | 20261028234540 |
| 20261029074220 | telegram_campaign_claims | 20261029073347 |
| 20261029084253 | reuse_deleted_campaign_names | 20261029084113 |
| 20261029090105 | owner_campaign_demonstrations | 20261029085727 |

## Production records without a matching repo version or name

```text
20260707232612 valid_keys_auto_cleanup
20260708001554 valid_keys_cleanup_dg_vip_split
20260725181718 fix_site_settings_rls
20260726041817 real_downloads
20260726061936 part1_avatar_pool_seed_ratings_comment_rls
20260726061949 part1_avatar_storage_bucket
20260726062011 part1_secure_sessions_cleanup_cron
20260726062222 part2_get_my_profile_add_custom_avatar_v2
20260726144241 add_custom_avatar_to_public_profiles
20260726144346 access_keys_prefix_expiry_cleanup
20260726145459 valid_keys_pristine_unused_cleanup
20260726153730 valid_keys_web_only_10min_cleanup
20260726153933 consolidate_key_cleanup_single_function
20260730023252 vip_daily_giveaway
20260730023540 vip_giveaway_ist_and_broadcast_v2
20260730190332 delete_expired_keys_any_prefix_source
20260730190942 auto_delete_inactive_accounts
20260730191330 last_active_tracking
20260730192006 inactive_deletion_pause_toggle
20260730192135 admin_account_stats_rpc
20260731033209 allow_empty_body_rating_only_reviews
20260731035103 seed_review_likes_column
20260731035117 seed_review_likes
20260731113021 secure_session_check_by_version_not_slug
20260731115045 phoenix_pass_system
20260731191754 notification_reward_linking
20260801031932 cleanup_redundant_unclaimed_rewards_fn
20260801034635 notification_reads_add_update_policy
20260801123802 trainer_rank_fix_reward_kind_collision_v2
20260801123820 trainer_rank_fix_reward_kind_collision_v3_function
20260806060748 cleanup_stale_winner_notifications
20260930154259 enforce_one_rating_per_user_mod
20261001060416 enable_rls_trainer_levels
20261002041613 backfill_engagement_reward_events
20261003123251 dark_eclipse_passless_policy
20261003123317 dark_eclipse_policy_status_rpc
20261004164130 create_device_presence
20261004172403 create_device_xp_once
20261004183625 revoke_anon_admin_functions
20261004183633 revoke_authenticated_admin_functions
20261004183645 add_rls_policies_missing_tables
20261004183653 fix_public_profiles_view_security
20261004183719 revoke_remaining_sensitive_functions
20261005064058 fix_public_profiles_view_columns
20261008084058 create_skin_packs_bucket
20261017073024 royal_void_v2_shadow_licensing_schema_20261017
20261017095424 royal_void_v2_issue_key_rpc_service_only_20261017
20261025183208 restrict_browser_execution_of_scheduled_key_cleanup
20261026044335 allow_authenticated_owner_stats_execution
20261026130240 retain_only_current_licensed_device_information
20261027031137 owner_admin_key_dual_registration
20261028033557 dg_only_daily_and_trainer_key_issuance
```

## Repo files without a matching production version or name

```text
20260629172154_23da8e83-173c-4d0e-8b8e-4dbf3d213437.sql
20260629172423_cf3c7439-2682-41e0-ab7a-6259b5e06b1a.sql
20260629192341_f602d8a6-71ca-43bd-986f-5cdcb64d44de.sql
20260629193148_3dc48fdd-e6dd-45b6-98c0-2be453c770a8.sql
20260629200611_6c356a4a-3667-47e2-937c-f744b511ac32.sql
20260629204358_39ebcf95-2e23-455d-aa40-64c83cef2745.sql
20260629204429_9032c502-6b10-45ab-b025-adc8f9b0d020.sql
20260629204606_f88538b0-d073-48ea-bd19-f4b1148f3776.sql
20260629212133_872f6465-7103-4781-a5a2-170697152a33.sql
20260630163535_de94c0ca-f85f-41e5-bfba-86ca0b56739f.sql
20260704080000_auth_foundation.sql
20260704090000_dg_unified_backend.sql
20260704091000_dg_harden_functions.sql
20260704120000_fix_new_user_signup.sql
20260704130000_grant_dg_is_owner.sql
20260731120000_daily_key_claim.sql
20260731130000_phoenix_pass_claim.sql
20261002096000_backfill_engagement_events.sql
20261003190000_tesla_phoenix_pass_campaign.sql
20261003201000_raise_tesla_campaign_to_110.sql
20261004012000_compensate_zero_phoenix_pass_accounts.sql
20261110160000_rls_perf_part2.sql
```

## Safe recovery sequence

1. Recover original migration SQL from the authoritative source (the machine/repository that applied production migrations, deployment artifacts, or a trusted backup). Do not infer SQL from the migration name.
2. Compare each recovered SQL file with the repo candidate and classify exact matches, renamed versions, and migrations whose contents are still missing.
3. For missing source SQL, generate a schema-only baseline from the live database using the official Supabase CLI workflow, review it, and retain the data migrations separately. This requires a controlled CLI environment with production read access; it must not be approximated by a hand-written empty migration.
4. Validate the resulting migration set on a separate disposable database if the operator authorizes that workflow. This project owner has explicitly prohibited creating Supabase branches or test environments, so no such environment was created here.
5. Only after the exact history is recovered should the operator plan a production-safe migration ledger repair. Do not change the live ledger from this report alone.

## Recent production migrations already synced to main

The production security changes from this audit are stored as normal SQL migration files in this repository, including owner-flag hardening, role-check scoping, RLS auth-initplan optimisation, owner-policy consolidation, demo-owner RPC scoping, and the latest public-RPC/search-path hardening.
