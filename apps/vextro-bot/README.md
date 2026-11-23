# VEXTRO BOT

Node.js 26 + TypeScript + Telegraf Telegram bot runtime. Uses the existing Supabase production schema and the website's verified account-linking RPC. The Owner interface is Telegram-native and Owner-only.

## Runtime

- Install: `npm ci`
- Type-check: `npm run typecheck`
- Tests: `npm test`
- Build: `npm run build`
- Start: `npm start`

Run from this directory. The production entry point is `dist/index.js`.

## Required environment

`BOT_TOKEN`, `OWNER_TELEGRAM_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEBSITE_URL`, `REQUIRED_CHANNEL_ID`, and `REQUIRED_GROUP_ID`.

Optional settings include `PUBLISH_CHANNEL_ID`, `BOT_PUBLIC_USERNAME`, `BACKUP_PASSPHRASE`, `BACKUP_BUCKET`, `BACKUP_INTERVAL_HOURS`, `BACKUP_RETENTION_DAYS`, `BACKUP_OFFSITE_URL`, `BACKUP_OFFSITE_TOKEN`, `GITHUB_REPOSITORY`, `DEPLOY_WEBHOOK_URL`, `DEPLOY_WEBHOOK_SECRET`, and `UPDATE_CHECK_INTERVAL_HOURS`. See `.env.example`. Never commit a real secret or put the Supabase service-role key in a browser bundle.

## Implemented modules

- Onboarding, required channel+group membership verification, membership diagnostics, English/Hindi Roman/Vietnamese language selection and user menu.
- Website account linking using a 256-bit one-time token; only SHA-256 is stored and the existing website `approve_bot_link(text)` RPC remains authoritative.
- User profiles, access restrictions, language administration and user analytics.
- Support ticket creation, category, conversation history, user replies, Owner replies, internal notes, priority, search, close and reopen.
- Multilingual guide editor, media/buttons, publish/archive, keyword and review-queue workflows; published guides are available to users.
- Channel post drafts, editing, previews, photo/video/document/animation attachments, HTTPS buttons, publishing and scheduled publishing.
- Persistent broadcasts with audience snapshot, Owner confirmation, preview/test, schedule, pause/resume/cancel, delivery queue, retry-after handling, retry and results.
- Group moderation rules, host allowlist, blocked phrase/domain enforcement, rate/repeat spam checks, warnings, timed restrictions, group ban/unban and moderation analytics.
- Owner dashboard navigation, audit log/search, runtime settings, maintenance mode and health monitoring.
- Encrypted AES-256-GCM application-data backups, SHA-256 integrity checks, private Supabase Storage, retention, scheduled backups, restore with a safety backup, and optional offsite HTTPS copy.
- GitHub release checks, Owner approval records, deployment webhook requests and rollback webhook requests.
- Restart recovery for in-flight queue work and stale scheduled-post leases.

## Important integration boundaries

- The bot is compatible with the verified live schema. New VEXTRO queue, moderation, backup, settings and update tables/functions are additive Supabase migrations under `supabase/migrations/`. Do not bulk-push the repository's older migration history; production and repository histories have existing drift.
- Backup encryption is disabled until `BACKUP_PASSPHRASE` is configured. Offsite copies require a custom HTTPS endpoint and token; it must accept the encrypted bytes and return JSON containing the matching `sha256`.
- Release checks and Owner approvals work independently. Automatic installation/rollback requires a custom hosting webhook implementing `action: deploy` and `action: rollback`; KataBump's published docs describe manual file/SFTP deployment and do not document a deployment API. Do not assume the webhook exists until configured and tested.
- Telegram moderation restrictions require the bot to be an administrator with the relevant group permissions. If Telegram rejects a moderation action, the failure is logged and shown to the Owner.
- Account unlink is intentionally not implemented because no verified unlink RPC was found; direct table mutation would bypass the live 15-day unlink eligibility rule.
- The legacy backup writer previously recorded repeated failures. The VEXTRO encrypted backup engine uses its own artifact table and private storage bucket; configure the passphrase before relying on it.
- CI verifies TypeScript, Vitest and the production build. CI is not proof of live Telegram token, membership, hosting or webhook acceptance.
