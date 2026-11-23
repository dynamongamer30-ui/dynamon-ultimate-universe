# VEXTRO BOT runtime

This is the first tracked bot runtime package, built against the live Supabase schema inspected on 2026-11-23. It intentionally does not apply or modify database migrations.

## Requirements

- Node.js 26+
- A Telegram bot token
- Owner Telegram numeric ID
- Supabase project URL and **service-role** key
- Website base URL (the deployed website origin)
- Required channel and group chat IDs; bot must be able to query membership in both

## Setup

```powershell
Copy-Item .env.example .env
# Edit .env locally. Never commit .env.
npm install
npm run typecheck
npm run build
npm start
```

For development: `npm run dev`.

## Current implemented handlers

- `/start`: register user in live `bot_users`, verify both membership requirements, show user menu.
- `/language` and language buttons: persist `en`, `hi`, or `vi`.
- `/account`: read active website link.
- `/link`: generate a 256-bit one-time token, store only its SHA-256 hash in live `bot_link_requests`, and send the existing website `/telegram/link?token=` URL. The website's live `approve_bot_link(text)` RPC consumes it.
- `/support Subject\nMessage`: create ticket and first message using live support tables.
- `/admin`: server-side Owner Telegram ID check and registered-user count.

## Live schema compatibility

The package uses only verified live table and column names for `bot_users`, `bot_account_links`, `bot_link_requests`, `bot_support_tickets`, and `bot_support_messages`. It does not call the uninstalled handoff RPC from the un-applied migration.

## Deliberate safety boundaries

- Service-role key is server-only.
- Membership verification fails closed if either required chat cannot be checked.
- No unlink operation is exposed yet: the live project has no verified Telegram-side unlink RPC, and direct updates would bypass the 15-day unlink eligibility/audit rule.
- Website URL, token, Owner ID and chat IDs must be supplied in local environment configuration.
- This runtime has not yet been built against installed dependencies or tested with a real Telegram bot token. Do not run a second polling process using a token already active elsewhere.
