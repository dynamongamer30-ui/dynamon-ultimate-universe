# VEXTRO BOT Revision 21 — implementation status

Last updated: 2026-11-23  
Repository: `dynamongamer30-ui/dynamon-ultimate-universe`  
Branch: `main`  
Runtime: Node.js 26, TypeScript, Telegraf, Supabase

## Implemented in the current runtime

- Owner-only access control, Telegram-native user and Owner menus, localized English/Hindi-Roman/Vietnamese flows, welcome editor and help.
- Required channel+group membership gate, Owner-editable membership chat IDs, membership diagnostics, and transient-state cleanup when users leave the required group.
- Website account linking through the existing `approve_bot_link(text)` RPC with one-time random tokens and SHA-256 token storage. No direct account-link table bypass.
- User profile with last-seen and active-user metrics, language management, access ban/unban, language/status filters, pagination, and membership-aware broadcast audience.
- Support ticket lifecycle: create, category, user conversation, Owner reply, internal notes, priority, search, close/reopen and Owner notifications.
- Guide/rules manager: localized content, photo/video/document/animation media, buttons, publish/archive, keywords, search and review queue. Required guide route links are populated.
- Universal channel post editor: drafts, edit, HTML/MarkdownV2/plain formatting, media attachments, HTTPS buttons, preview, publish, scheduled publish, cancel and retry.
- Persistent broadcast queue: draft/edit/format/preview/test, audience verification, explicit Owner confirmation, schedule, pause/resume/cancel, retries, retry-after handling, results and completion notifications.
- Moderation: blocked phrase/domain rules, allowlist add/edit/remove, rate/repeat spam controls, warnings, timed group mute/unmute, ban/unban, and audit records.
- Localized user menus with Home navigation, Owner dashboard and command directory, recent-activity user views, analytics, redacted runtime log viewer, audit search, runtime membership settings, maintenance controls and health monitor.
- Encrypted AES-256-GCM backups with scrypt-derived keys, random salt/IV, SHA-256 integrity, private Supabase Storage, retention, optional HTTPS offsite copy, restore with a pre-restore safety backup, automatic safety-row recovery after a partial restore error, and explicit preservation of website-owned account-link requests, active links and guide content.
- Release checks, Owner approval, pre-deployment safety backup, optional deployment webhook, post-deployment health validation, rollback request and safety backup.
- Restart recovery for persistent broadcast queue work and stale scheduled-post leases.
- Owner timezone scheduling: local `YYYY-MM-DD HH:mm` is interpreted in `OWNER_TIMEZONE` (default `Asia/Kolkata`) and persisted as UTC.

## Supabase changes

Twelve additive VEXTRO migrations are present in `supabase/migrations/` and applied to project `dfxcpxzylyycrirtnkof`. They add queue, settings, moderation, backup, restore, update-approval and broadcast-formatting structures. Existing website tables and the verified account-link RPC were preserved.

The historical migration drift between the website repository and production remains unresolved. Do not run a bulk migration push or replay the older repository migration history against production.

## Verification

- Latest VEXTRO BOT CI run: `45135614743` — dependency install, TypeScript type-check, Vitest tests and production build passed.
- Backup encryption and Owner-timezone conversion have unit tests.
- Production Supabase migrations were applied and schema was inspected. All 21 restorable backup tables passed empty-row restore-function checks; website-owned account-link and guide tables are intentionally skipped and protected by the restore RPC.
- No live Telegram polling test or KataBump deployment has been performed in this session. CI does not prove the live bot token, membership permissions, channel publishing or hosting integration.

## Configuration still required before live operation

- `BOT_TOKEN`, `OWNER_TELEGRAM_ID`, Supabase URL/service-role key, website URL, required channel and numeric group IDs.
- `BACKUP_PASSPHRASE` (at least 16 characters) before encrypted backup scheduling or restore can be used.
- `BACKUP_OFFSITE_URL` and `BACKUP_OFFSITE_TOKEN` together for verified offsite copies.
- `PUBLISH_CHANNEL_ID` for channel publishing.
- A custom HTTPS deployment webhook and secret for automated hosting deploy/rollback. No provider-specific webhook is configured by default.

## Remaining acceptance work / known boundaries

- Run live Telegram tests with the Owner's host secrets: onboarding, both membership checks, account-link approval, ticket flow, media publishing, broadcasts, moderation permissions, backups and restart recovery.
- Code-level mapping for all 50 approved user, Owner and shared screen flows is complete. Live Telegram acceptance remains pending. Telegram controls the user's light/dark theme; a bot cannot force the client's dark theme.
- Validate the custom hosting webhook against the actual hosting provider before enabling automated deployment or rollback.
- Configure and test the offsite backup receiver before relying on offsite retention.
- Account unlink remains intentionally unavailable because the live 15-day eligibility rule has no verified unlink RPC; direct database mutation is not permitted.
- The legacy `dgbot_backup_runs` writer previously recorded repeated `db_400` failures. The new encrypted backup engine is separate and remains inactive until its passphrase is configured.
- The old non-main Git branch has not been deleted; the connected GitHub toolset exposes no branch-delete operation. No new branch was created.

## Explicit scope exclusions

- No CSV/JSON import/export module.
- No separate disaster-recovery or hosting-migration module.
