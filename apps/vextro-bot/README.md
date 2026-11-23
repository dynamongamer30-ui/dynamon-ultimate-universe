# VEXTRO BOT runtime

The bot runtime lives in this website repository at `apps/vextro-bot/`. It is a server-side Node.js service and is not part of the browser bundle.

## Requirements

- Node.js 26+
- Telegram bot token
- Owner Telegram numeric ID
- Supabase project URL and **service-role** key
- Website base URL (deployed website origin)
- Required channel and group chat IDs; bot must be able to query membership in both

## Setup

```powershell
Copy-Item .env.example .env
# Edit .env locally. Never commit .env.
npm install
npm run typecheck
npm test
npm run build
npm start
```

For development: `npm run dev`.

## Current handlers

- `/start`: register the user in live `bot_users`, verify both membership requirements, and show the user menu.
- `/language` and language buttons: persist English (`en`), Hindi (`hi`), or Vietnamese (`vi`).
- `/account`: read the active website account link and unlink eligibility timestamp.
- `/link`: generate a 256-bit one-time token, store only its SHA-256 hash in live `bot_link_requests`, and send the existing website `/telegram/link?token=` URL. The website's live `approve_bot_link(text)` RPC consumes it.
- `/support Subject\nMessage`: create a support ticket and first message. Subsequent plain-text messages from the user are appended to their latest active ticket.
- Owner support commands: `/tickets`, `/ticket <uuid>`, `/reply <uuid> <message>`, and `/close_ticket <uuid>`. Every Owner command checks the configured Telegram ID server-side.
- `/guides`: list published, non-deleted rows from the live `bot_guides` table. Open a guide with its generated `/guide_<id>` command.
- `/admin`: Owner-only dashboard with registered-user and open-ticket counts.

## Live schema compatibility

The runtime uses verified live table/column names for `bot_users`, `bot_account_links`, `bot_link_requests`, `bot_guides`, `bot_support_tickets`, and `bot_support_messages`. It does not call the uninstalled handoff RPC from the un-applied migration.

## Safety boundaries and deployment status

- The Supabase service-role key is server-only and must be stored in the host's secret manager.
- Membership verification fails closed if either required chat cannot be checked.
- No unlink operation is exposed: the live project has no verified Telegram-side unlink RPC, and direct updates would bypass the 15-day unlink eligibility/audit rule.
- The live `bot_guides` table had no published guide rows during the 2026-11-23 schema check; the bot therefore returns a clear empty state until guides are published.
- Node.js 26 CI completed type-check, Vitest, and production TypeScript build successfully for commit `a4fe5c641e79f30e488d985a7c6fb20e65aa4c26`: [VEXTRO BOT CI](https://github.com/dynamongamer30-ui/dynamon-ultimate-universe/actions/runs/45122124830).
- CI success is not live acceptance. No Telegram token was used, no live polling/membership check was run, and no KataBump deployment was attempted.
- No production Supabase schema, migration, or row was changed.
- Do not run a second polling process with the same token while another instance is active.
