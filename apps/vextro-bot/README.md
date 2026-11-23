# VEXTRO BOT

Node.js 26 + TypeScript + Telegraf Telegram bot runtime. Uses the existing Supabase production schema and the website's verified account-linking RPC. The Owner interface is Telegram-native and Owner-only.

## Runtime

- Install: `npm ci`
- Type-check: `npm run typecheck`
- Tests: `npm test`
- Build: `npm run build`
- Start: `npm start`

Run from this directory. The production entry point is `dist/index.js`. The start script caps the V8 heap at 256 MB for KataBump's small free-tier memory allocation. `dotenv/config` loads a root `.env` file; use `.env.example` as the template. Blank optional entries in that template are treated as unset.

## Required environment

`BOT_TOKEN`, `OWNER_TELEGRAM_ID`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `WEBSITE_URL`, `REQUIRED_CHANNEL_ID`, and `REQUIRED_GROUP_ID`.

Optional settings include `OWNER_TIMEZONE` (defaults to `Asia/Kolkata`; all scheduled times are interpreted in this zone and stored in UTC), `PUBLISH_CHANNEL_ID`, `BOT_PUBLIC_USERNAME`, `BACKUP_PASSPHRASE`, `BACKUP_BUCKET`, `BACKUP_INTERVAL_HOURS`, `BACKUP_RETENTION_DAYS`, `BACKUP_OFFSITE_URL`, `BACKUP_OFFSITE_TOKEN`, `GITHUB_REPOSITORY`, `DEPLOY_WEBHOOK_URL`, `DEPLOY_WEBHOOK_SECRET`, and `UPDATE_CHECK_INTERVAL_HOURS`. See `.env.example`. Never commit a real secret or put the Supabase service-role key in a browser bundle.

## Implemented modules

- Onboarding, required channel+group membership verification with join links, membership diagnostics, English/Hindi Roman/Vietnamese language selection and user menu.
- Website account linking using a 256-bit one-time token; only SHA-256 is stored and the existing website `approve_bot_link(text)` RPC remains authoritative.
- User profiles with Telegram name/username and throttled last-seen tracking, access restrictions, language administration and active-user analytics.
- Support ticket creation (one active ticket per user, enforced by a database unique index), category, conversation history, user photo/video/document/audio/voice attachments copied into the Owner private chat with Telegram message references stored in SQL, Owner text/media replies, internal notes, priority, search, close and reopen.
- Multilingual guide editor, media/buttons, publish/archive, keyword and review-queue workflows; published guides are available to users.
- Channel post drafts, editing, previews, photo/video/document/animation attachments, HTTPS buttons, publishing and Owner-timezone scheduled publishing.
- Persistent broadcasts with membership-verified audience snapshot, Owner confirmation, preview/test, Owner-timezone scheduling, pause/resume/cancel, delivery queue, retry-after handling, retry, progress/status reporting and Owner reconciliation of uncertain deliveries to avoid automatic duplicate sends.
- Group moderation rules, host allowlist, blocked phrase/domain enforcement, rate/repeat spam checks, warnings, timed restrictions, group ban/unban and moderation analytics.
- Expanded Owner control center across users, support, broadcasts, posts, guides, moderation, membership, schedules, analytics, security/audit, backups, settings, health/logs, maintenance and updates.
- Encrypted AES-256-GCM application-data backups, SHA-256 integrity checks, primary archive delivery to the Owner private Telegram chat, Telegram file/message references in SQL, private Supabase Storage as a secondary restore copy, 30-day Supabase retention, scheduled backups, restore with a safety backup, and optional offsite HTTPS copy. Telegram chat archives are not automatically pruned because the Bot API cannot delete older messages beyond its deletion window; the Owner manages those chat copies. Website-owned account-link requests, active website account links, and website guide records are preserved rather than overwritten during bot restore.
- GitHub release checks, Owner approval records, deployment webhook requests and rollback webhook requests.
- Restart recovery for in-flight queue work and stale scheduled-post leases.

## Important integration boundaries

- The bot is compatible with the verified live schema. New VEXTRO queue, moderation, backup, settings and update tables/functions are additive Supabase migrations under `supabase/migrations/`. Do not bulk-push the repository's older migration history; production and repository histories have existing drift.
- Backup encryption is disabled until `BACKUP_PASSPHRASE` is configured. Offsite copies require a custom HTTPS endpoint and token; it must accept the encrypted bytes and return JSON containing the matching `sha256`.
- Release checks and Owner approvals work independently. Automatic installation/rollback requires a custom hosting webhook implementing `action: deploy` and `action: rollback`. No provider-specific webhook is wired by default; do not assume deployment works until the host endpoint is configured and tested.
- Telegram moderation restrictions require the bot to be an administrator with the relevant group permissions. If Telegram rejects a moderation action, the failure is logged and shown to the Owner.
- Account unlink is available through `/unlink` and the Telegram Account menu after the 15-day eligibility date. The bot uses the service-role-only `unlink_bot_account_from_telegram` RPC, which enforces eligibility atomically and records an audit event. Before eligibility, the bot reports the exact date and makes no database change. Backup restore skips website-owned account-link and guide tables to preserve the website's authority and unlink eligibility.
- The legacy backup writer previously recorded repeated failures. The VEXTRO encrypted backup engine uses its own artifact table and private storage bucket; configure the passphrase before relying on it.
- CI verifies TypeScript, Vitest and the production build. CI is not proof of live Telegram token, membership, hosting or webhook acceptance.
