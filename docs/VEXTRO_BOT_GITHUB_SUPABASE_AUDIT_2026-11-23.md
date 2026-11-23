# VEXTRO BOT — GitHub and Supabase Integration Audit

**Audit date:** 2026-11-23  
**Repository:** `dynamongamer30-ui/dynamon-ultimate-universe`  
**Audited branch:** `main`  
**Supabase project:** `dfxcpxzylyycrtnkof`  
**Scope:** read-only inspection. No production SQL, data, secrets, or deployment settings were changed.

## Executive result

The connected GitHub repository is the Dynamon Ultimate Universe **website**, not a tracked VEXTRO BOT application repository. Its current source tree contains no bot runtime package. A Library deployment guide exists, but it explicitly states that it is not the application source and that the application source archive was not available when the guide was prepared.

The production Supabase project already contains bot-related tables and functions. The correct next step is to implement the bot against the live schema and reconcile migration drift; do not create duplicate tables or apply the untracked migration history blindly.

## GitHub main audit

- Default branch: `main`.
- Current main tree: 308 entries.
- Tracked SQL migrations: 67.
- Website stack: TanStack Start, React, TypeScript, Supabase JS, pnpm.
- Current website CI uses Node.js 22, runs the website type-check and Cloudflare build.
- No VEXTRO BOT package, bot-specific CI job, or tracked bot application source was found in this repository tree.
- The repository's current branch search returned `main` and `feat/vextro-bot-supabase-integration`. No new branch was created during this audit. The connected GitHub actions available in this session do not expose a branch-delete operation, so the non-main branch could not be deleted here.

## Supabase production audit

- Project status: active/healthy.
- PostgreSQL: 17.
- Migration ledger: 103 records.
- Public tables with `bot_*` prefix: `bot_users`, `bot_account_links`, `bot_link_requests`, `bot_guides`, `bot_support_tickets`, `bot_support_messages`.
- Legacy bot tables with `dgbot_*` prefix also exist for guides, moderation, bans, posts, audit, backup runs, user state, and other existing features.
- Bot tables have RLS enabled. Direct table privileges inspected for the six `bot_*` tables are granted to `service_role`; no direct `anon` or `authenticated` table grants were found. The advisor's no-policy findings are therefore informational for those service-only tables, not proof of public table access.
- Health advisor: 0 findings.
- Security advisor: 27 RLS-enabled/no-policy findings; 30 authenticated-executable SECURITY DEFINER warnings; 1 leaked-password-protection warning.
- Performance advisor: 1 unindexed foreign key finding and 19 unused-index informational findings.

### Live bot schema observed

| Table | Key fields |
|---|---|
| `bot_users` | `telegram_id`, `language`, `created_at`, `updated_at` |
| `bot_account_links` | `id`, `user_id`, `telegram_id`, `linked_at`, `unlink_eligible_at`, `unlinked_at` |
| `bot_link_requests` | `token_hash`, `telegram_id`, `created_at`, `expires_at`, `consumed_at`, `user_id` |
| `bot_guides` | `id`, `title`, `published`, `deleted`, `data`, `updated_at` |
| `bot_support_tickets` | `id`, `telegram_id`, `category`, `subject`, `status`, `priority`, timestamps |
| `bot_support_messages` | `id`, `ticket_id`, `sender_type`, `sender_telegram_id`, `body`, `internal_note`, `created_at` |

All six tables are RLS-enabled and service-role-only at the direct table privilege layer. Bot runtime code must keep the Supabase service-role key server-side and never place it in website/browser code, public GitHub files, Telegram messages, or logs.

## Account-link flow — verified mismatch

The website route `src/routes/telegram.link.tsx` calls `public.approve_bot_link(p_token)`. The live function:

1. Requires a signed-in website user via `auth.uid()`.
2. Hashes the submitted token with SHA-256.
3. Looks up and locks the matching `bot_link_requests` row.
4. Rejects invalid, expired, or consumed tokens.
5. Rejects an already-linked website account or Telegram account.
6. Creates the active `bot_account_links` row and consumes the request.

This is a usable existing contract for the bot: generate a high-entropy raw token, store only its SHA-256 hash in `bot_link_requests`, send the raw token in the website URL, and confirm completion by checking the active link row from server-side bot code.

**Do not apply** `supabase/migrations/20261120100000_telegram_account_linking.sql` as-is. It describes a different `bot_account_link_handoffs` / `consume_bot_link_handoff` architecture, while production uses `bot_link_requests` / `approve_bot_link`. It also declares a `created_at` field on `bot_account_links` that is absent from the live table; `CREATE TABLE IF NOT EXISTS` would not add that missing field to an existing table. This is a concrete migration/source mismatch.

The live `bot_account_links.unlink_eligible_at` default is 15 days after linking. Bot-side unlink must enforce that timestamp atomically and must not bypass it.

## Migration drift — current comparison

Comparing the 67 migration files on GitHub `main` with the 103 production migration ledger entries by version and migration name:

- 26 exact version matches.
- 19 same-name migrations with different timestamps.
- 22 repository-only migrations.
- 58 production-only migrations.

This supersedes older migration counts recorded in the historical section of `AUDIT.md`. **Do not run `supabase db push` or apply the full migration folder against production.** Recover/reconcile original SQL and verify each intended change before any migration operation.

Production includes bot-related migration ledger entries not represented by matching files on `main`, including the bot user, broadcast queue, account linking, notification reads, support center, admin roles, runtime settings, catalog, and guides migrations. The exact live schema—not migration names alone—must drive the adapter.

## Required implementation sequence

1. Add the actual VEXTRO BOT runtime source and bot-specific CI on `main`; do not create another branch.
2. Use the live `bot_*` schema for user language, account links, guides, and support; inspect the production broadcast/runtime/catalog schema before using it.
3. Implement the existing `bot_link_requests` + `approve_bot_link` contract. Do not introduce a parallel handoff system.
4. Keep service-role access strictly server-side. Keep owner authorization in bot middleware using the configured Telegram Owner ID; do not trust a client-supplied role or add admin roles.
5. Add tests for token expiry/replay, duplicate account linking, unlink eligibility, membership checks, ticket persistence, owner authorization, and restart recovery.
6. Reconcile all migration drift before any production schema write.
7. Verify the bot build and tests in GitHub Actions, then perform controlled Telegram and hosting acceptance tests. Do not start a second polling process with the existing bot token.

## Not verified in this audit

- No live Telegram API calls or bot process were started.
- No service-role secret was read or exposed.
- No Supabase schema or data was modified.
- No KataBump deployment was attempted.
- The actual bot application source and its runtime package scripts were not present in the inspected website repository or the located deployment guide.


## Additional legacy bot runtime audit — 2026-11-23

- The live project contains 13 legacy `dgbot_*` tables in addition to the newer `bot_*` tables. They cover guides, keywords, allowlist, moderation rules, audit events, bans, posts, group help handoffs, review queue, alerts, backup runs, pending claims, and user state. All inspected `dgbot_*` tables have RLS enabled; the earlier grants review showed service-role access rather than direct anon/authenticated access.
- Estimated row counts showed `dgbot_backup_runs` populated (212 estimated rows), while the other legacy `dgbot_*` tables were empty at the time of inspection.
- Exact aggregate query of `dgbot_backup_runs`: all 212 recorded runs had `status='failed'`, `trigger='scheduled'`, and `error_code='db_400'`. The latest recorded finish was 2026-11-23 06:06:35 UTC.
- The production `cron.job` list contains no backup job. The two deployed Supabase Edge Functions are unrelated maintenance/campaign functions; no backup Edge Function was found. Repository code search did not locate a writer for `dgbot_backup_runs`.
- Root cause is not yet established. `db_400` is only the stored application error code, not enough to infer whether the failure is an invalid REST request, schema mismatch, authentication issue, or another HTTP 400. Do not enable a new scheduler or mark backups healthy until the external/legacy writer and its request/response logs are identified.
- No backup records, cron jobs, production rows, schemas, or functions were modified during this investigation.
