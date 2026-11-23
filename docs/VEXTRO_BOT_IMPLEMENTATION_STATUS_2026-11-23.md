# VEXTRO BOT implementation status — 2026-11-23

## Repository policy
- Work is committed directly to `main`.
- No new branches are created.
- The connected GitHub actions do not provide branch deletion; the existing non-main branch is not deleted by this implementation work.

## Source added
The website repository previously contained no actual bot runtime package. The first tracked runtime foundation is now at `apps/vextro-bot/`.

Files added:
- `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`
- `src/config.ts`: strict environment validation
- `src/supabase.ts`: server-only Supabase service-role client
- `src/security.ts`: 256-bit URL-safe one-time token generation and SHA-256 hashing
- `src/index.ts`: Telegraf polling runtime, membership gate, language preferences, website linking, support ticket creation and follow-up, Owner ticket list/detail/reply/close commands, published-guide reads, Owner post draft/edit/preview/publish/remove commands using verified `dgbot_posts`, read-only analytics/backup/audit commands, moderation-rule CRUD, and Owner dashboard\n- `vitest.config.ts`: standalone bot test config, isolated from the website Vite configuration
- `tests/config.test.ts`, `tests/security.test.ts`
- `README.md`: setup and verified-live-schema contract

CI:
- `.github/workflows/vextro-bot-ci.yml` runs on Node.js 26 for changes to the bot package.
- Checks type-check, Vitest, and TypeScript build.

## Verified production contracts used
- `bot_users(telegram_id, language, created_at, updated_at)`
- `bot_account_links(telegram_id, linked_at, unlink_eligible_at, unlinked_at, user_id)`
- `bot_link_requests(token_hash, telegram_id, created_at, expires_at, consumed_at, user_id)`
- `bot_support_tickets(id, telegram_id, category, subject, status, priority, created_at, updated_at)`
- `bot_support_messages(id, ticket_id, sender_type, sender_telegram_id, body, internal_note, created_at)`
- Website approval RPC: `approve_bot_link(p_token text)`

The bot inserts only the SHA-256 token hash into `bot_link_requests`; the website approval route consumes the raw one-time token using the existing `approve_bot_link` RPC.

## Important gaps and blockers
- GitHub Actions run [45122961656](https://github.com/dynamongamer30-ui/dynamon-ultimate-universe/actions/runs/45122961656) completed successfully on Node.js 26 for commit `a10fe45f7397e0d560da82550e4e7ec9b6579e72`: type-check, Vitest, and TypeScript build all passed. The earlier [45122696913](https://github.com/dynamongamer30-ui/dynamon-ultimate-universe/actions/runs/45122696913) run also passed. The earlier [45122124830](https://github.com/dynamongamer30-ui/dynamon-ultimate-universe/actions/runs/45122124830) run also passed for the foundation.
- No Telegram token was used; no live bot polling or Telegram membership test was run.
- No KataBump deployment was attempted.
- No production Supabase migration, schema, or row was modified.
- Support, guide, and Owner text-post handlers are implemented against verified live table columns and constraints. Post publishing requires the optional `PUBLISH_CHANNEL_ID` setting and channel permissions. The runtime has not yet implemented the complete universal media/button editor or scheduled content queue. Moderation rule records can be managed, but incoming group-message enforcement and progressive warning/restriction workflows are not enabled. The live `bot_guides` table currently has no published guide rows, so users will see an empty-state message until content is published.\n- Telegram-side unlink is intentionally not exposed. The live project has no verified Telegram unlink RPC; direct updates would bypass the 15-day eligibility rule and audit behavior.
- The live `dgbot_backup_runs` table contains 212 scheduled attempts, all failed with `db_400`. No matching production cron job, deployed backup Edge Function, or writer in the current repo was found. The error's root cause is unknown; do not activate a replacement scheduler until the legacy/external writer is traced. See the detailed GitHub/Supabase audit.\n- The current implementation is a runtime foundation, not all approved Revision 21 modules. Broadcasts, channel publishing, scheduling, workflow automation, advanced Owner screens, analytics, encrypted backup/restore, privacy workflows, anti-spam, maintenance mode, release/update management, and operational recovery still require implementation.
- Website URL, Telegram credentials, Owner ID, and required group/channel IDs must be set in KataBump's secret/environment manager. Never commit real secrets.
- Website API/domain and KataBump hosting capabilities still require verification before production deployment.

## Safety
Do not run a second polling process with the same Telegram token while another instance is active. Do not apply the historical migration folder wholesale; production migration drift remains unresolved. Do not run `supabase db push` until every intended migration has been reconciled against the live schema.
