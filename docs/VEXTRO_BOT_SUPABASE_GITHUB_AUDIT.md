# VEXTRO BOT — GitHub + Supabase Integration Audit

**Audit date:** 2026-11-23  
**Repository:** `dynamongamer30-ui/dynamon-ultimate-universe`  
**Supabase project:** `dfxcpxzylyycrirtnkof`  
**Branch:** `feat/vextro-bot-supabase-integration`  
**Audit mode:** Read-only inspection. No production database writes, migrations, key reads, or deployments were performed.

## Executive result

The repository named by the user as the “ultimate … web repo” is identified with high confidence as `dynamongamer30-ui/dynamon-ultimate-universe`: its tracked `supabase/config.toml` points to the exact Supabase project reference above. The repository connection has admin/push permission. A separate integration branch has been created; `main` was not changed.

The website and Supabase are already connected, and the database already contains Telegram-bot tables and a working website-side link-approval RPC. The current VEXTRO BOT source package, however, is still SQLite-only: it has no Supabase SDK/client, no bot-side link service, and its onboarding message explicitly says website linking is not enabled. The integration is therefore not complete.

**Do not run `supabase db push` or apply the old Telegram-link migration as-is.** The tracked migration and live production schema differ, and the repository's existing audit records a larger migration-history divergence.

## 1. GitHub repository

- Repository is public, default branch is `main`, and the connected GitHub account has admin, maintain, push and pull permissions.
- The recursive Git tree returned 279 tracked files.
- The repository contains a TanStack Start / React / TypeScript website, Supabase client/types, Supabase SQL migrations, Cloudflare Worker sources, and one GitHub Actions workflow.
- Only `main` was listed as an existing branch before this audit. A separate branch, `feat/vextro-bot-supabase-integration`, was created for isolated work.
- GitHub rulesets endpoint returned an empty list. The branch-protection endpoint returned 403 to the connector, so branch protection could not be verified; do not assume it is disabled.
- No latest GitHub release was found.
- Latest observed main commit: `5ba19a7b756c411d5372cf0e9165151962e485da` (2026-11-22).
- Latest workflow run observed for that commit: run 74, completed successfully. The job installed locked pnpm dependencies, ran `pnpm check`, and ran `pnpm build`.
- Current `.github/workflows/ci.yml` does not run Vitest, Playwright, lint, or a bot build. It uses Node 22 and validates the website only.
- GitHub's repository code-search index is not available through the connected search endpoint. The repository tree and targeted source files were inspected directly.

### Repository integration gaps

1. The current VEXTRO BOT package is not tracked in this repository. The delivered bot archive is a separate Node/Telegraf project using SQLite.
2. The bot package has no `@supabase/supabase-js` dependency or Supabase client.
3. `WEBSITE_API_BASE_URL` and `WEBSITE_API_TOKEN` exist in bot configuration but are not used by any service.
4. Bot onboarding currently tells users that website linking will be enabled after the website API is configured.
5. The generated website Supabase types in `src/integrations/supabase/types.ts` are behind the live database schema: the live-generated types include `bot_users`, `bot_account_links`, `bot_link_requests`, `bot_support_tickets`, `bot_guides`, `dgbot_*` tables and `approve_bot_link`, while the tracked file does not include those bot entities.
6. The website's bot guide endpoint reads `site_settings.key = 'bot_guides'`; that key currently has no row, so the endpoint serves its built-in fallback catalog until the Owner publishes a catalog.
7. The website and bot must remain separate runtime deployments: the website is a Cloudflare/TanStack Worker application, while the Telegram bot requires a persistent Node process for polling and background workers.

## 2. Supabase project

- Project reference: `dfxcpxzylyycrirtnkof`.
- Project status: active/healthy.
- Region: `ap-southeast-2`.
- PostgreSQL major version: 17.
- The tracked `supabase/config.toml` contains the same project reference, confirming the repository/project pairing.
- The project has the expected Supabase extensions, including `pg_cron`, `pgcrypto`, `pg_net`, and `pg_stat_statements`.
- Two Edge Functions are currently listed: `website-campaign` and `oneoff-logo-cleanup`. There is no VEXTRO BOT Edge Function. A separate Node process is the appropriate runtime.

### Existing bot data and tables

The live database already has these bot-related tables:

- `bot_users`
- `bot_account_links`
- `bot_link_requests`
- `bot_support_tickets`
- `bot_support_messages`
- `bot_guides`
- `dgbot_alerts`, `dgbot_allowlist`, `dgbot_audit_log`, `dgbot_backup_runs`, `dgbot_bans`, `dgbot_group_help_handoffs`, `dgbot_guide_keywords`, `dgbot_guides`, `dgbot_moderation_rules`, `dgbot_pending_claims`, `dgbot_posts`, `dgbot_review_queue`, and `dgbot_user_state`.

Read-only aggregate counts observed during this audit:

| Record category | Count |
|---|---:|
| `bot_users` | 2 |
| Active `bot_account_links` | 1 |
| Consumed `bot_link_requests` | 1 |
| Pending, unexpired link requests | 0 |
| Support tickets / messages | 0 / 0 |
| Published `bot_guides` rows | 0 |
| Non-deleted `dgbot_posts` | 0 |
| `dgbot_backup_runs` records | 203 |
| Non-deleted `dgbot_bans` | 0 |

No personal row contents were retrieved for this report.

### Database access control

- The bot-related tables inspected have RLS enabled.
- These bot tables have no direct `anon` or `authenticated` table privileges; their table grants are limited to `service_role`.
- This is appropriate for a server-only bot integration. The Supabase secret/service-role credential must never enter browser code, the public website bundle, a Git commit, or Telegram messages.
- `site_settings` has a public SELECT policy and authenticated Owner-only insert/update/delete policies. The `bot_guides` key is currently absent.
- The `approve_bot_link(text)` RPC is executable by `authenticated` and `service_role`, not `anon`.

### Existing account-link flow

The live schema contains:

- `bot_link_requests(token_hash, telegram_id, created_at, expires_at, consumed_at, user_id)`.
- `bot_account_links(user_id, telegram_id, linked_at, unlink_eligible_at, unlinked_at)`.
- `approve_bot_link(p_token text)`.

The live `approve_bot_link` function:
- Requires an authenticated website user.
- Validates token length and hashes the supplied token with SHA-256.
- Rejects missing, expired, and already-consumed tokens.
- Prevents an active website account from linking a second Telegram account.
- Prevents an active Telegram account from linking a second website account.
- Inserts the link and marks the request consumed in one transaction.

The active partial unique indexes on `bot_account_links` enforce one active link per website user and per Telegram ID. This is a sound foundation for VEXTRO BOT.

### Critical website/database mismatch

The tracked `supabase/migrations/20261120100000_telegram_account_linking.sql` describes a different link design using `bot_account_link_handoffs`, `create_bot_link_handoff`, `consume_bot_link_handoff`, `get_bot_account_link`, and unlink RPCs.

The live database instead has `bot_link_requests` and `approve_bot_link`. The live database does not have `bot_account_link_handoffs`, `bot_account_link_events`, `create_bot_link_handoff`, `get_bot_account_link`, or `unlink_bot_account_from_telegram`.

Do not apply the tracked migration over the current production schema. First reconcile the migration history and decide which live contract is authoritative.

### Existing website admin account-link page is currently broken

`src/routes/admin-account-links.tsx` directly selects `bot_account_links` and `bot_account_link_events` from the browser client.

- Live `bot_account_links` is service-role-only and has no authenticated Owner read grant/policy.
- Live `bot_account_link_events` does not exist.

Therefore the page's parallel read fails even though one active account link exists. Replace this with a narrowly scoped Owner-checked server RPC or server endpoint after a reviewed migration; do not grant broad browser access to link records.

### Guide catalog mismatch

- The live `bot_guides` table exists but has zero published rows.
- The website's guide manager and `/api/bot/guides` route use `site_settings.key = 'bot_guides'`.
- That settings key is currently absent, so the API returns the hard-coded fallback catalog.
- Choose one canonical catalog store and adapt both the website manager and bot reader to it. Avoid maintaining two independently editable guide stores.

## 3. Security advisor and performance findings

Current advisor results observed:

- Security: 27 RLS-enabled/no-policy informational findings.
- Security: 30 authenticated-executable SECURITY DEFINER function warnings.
- Security: 1 leaked-password-protection warning.
- Health: 0 findings.
- Performance: 20 unused-index informational findings and an unindexed foreign-key finding on `dgbot_group_help_handoffs.guide_id`.

The no-policy finding is not automatically a vulnerability: the bot tables inspected are service-role-only, so ordinary API roles cannot access them directly. The SECURITY DEFINER warnings also require per-function review rather than blanket revocation. The inspected Owner functions include explicit Owner checks; `approve_bot_link` is authenticated-user-scoped. No anonymous execution was found for the authenticated-executable SECURITY DEFINER set in this inspection.

Leaked-password protection should be reviewed in Supabase Auth settings. This audit did not change Auth settings.

## 4. Migration-history drift — production safety blocker

The existing repository `AUDIT.md` records substantial migration divergence: 92 production migration records versus 65 tracked SQL files at its last reconciliation, including production-only, repo-only, and timestamp-mismatch entries. The current live migration ledger still contains bot migration records whose matching SQL files are not present in the tracked migration tree.

The tracked old Telegram-link migration also conflicts with the live link schema described above.

**No migrations were applied. Do not run `supabase db push` until the missing original migration sources and timestamp mismatches are reconciled.** Do not reconstruct missing historical migrations from guessed SQL. New bot-specific additive migrations must be generated and reviewed separately after the ledger is reconciled.

## 5. VEXTRO BOT source audit

The current bot archive is version 0.5.0 and uses:

- Node.js >= 26
- TypeScript
- Telegraf
- SQLite / better-sqlite3
- Drizzle ORM
- Zod, Pino, Vitest

It contains working foundations for onboarding, membership checks, support tickets, content, broadcast queues, channel publishing, scheduling, moderation, workflows, privacy, backups, and Owner tools. However:

- Persistence is local SQLite only.
- No Supabase client is installed.
- No service uses the website API configuration.
- Website account linking is a placeholder, not an implemented flow.
- There is no automated integration test against the live Supabase contract.
- The full TypeScript build and full Vitest suite have not yet been verified in the available build environment.
- The archive integrity was verified, but that is not a production acceptance test.

## 6. Integration design

1. Keep the website deployed on its current Cloudflare/TanStack runtime.
2. Add the VEXTRO BOT source to this repository under a separate app directory and deploy it as a persistent Node 26 process on KataBump.
3. Keep SQLite for the bot's local queues, schedules, drafts and recovery state, preserving the approved stack. Use Supabase as the shared website identity/link integration and as the canonical store for shared website-linked records.
4. Add a server-only Supabase client using a dedicated Supabase secret key (preferred) or the legacy service-role key during transition. Load it from KataBump environment variables only.
5. Implement the existing live link contract: bot generates a cryptographically random one-time token, stores only its SHA-256 hash in `bot_link_requests`, and sends the website approval URL. The website continues to approve through `approve_bot_link`. Bot then synchronizes the active `bot_account_links` record to its local account view.
6. Reconcile unlink behavior before exposing an `/unlink` command; no live Telegram unlink RPC was found.
7. Use one canonical guide catalog and test the website's published-guide API against the bot.
8. Reconcile production migration history before applying any new database migration.
9. Add a separate Node 26 CI job for the bot with dependency install, type-check, tests, build, and migration/schema contract tests. Keep the existing website Node 22 job independent.

## 7. Work not performed in this audit

- No Supabase schema, data, Auth, keys, Edge Functions, or project settings were changed.
- No GitHub `main` files were changed.
- No secrets were read, printed, or committed.
- No Telegram API calls or real bot messages were sent.
- No KataBump deployment or production smoke test was performed.
- Branch protection could not be read due connector permission error.

## Release gate

VEXTRO BOT is not yet Supabase/GitHub production-ready. Acceptance requires the bot source tracked on the integration branch, live Supabase contract tests, website link flow verification, Owner-only access verification, all bot unit/integration tests, CI green for both website and bot, KataBump deployment with secrets configured, and a real Telegram end-to-end test.