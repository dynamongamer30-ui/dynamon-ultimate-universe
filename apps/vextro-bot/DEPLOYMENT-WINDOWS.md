# VEXTRO BOT — Windows deployment

## Requirements
- Windows 10/11 x64
- Node.js 26 or newer (64-bit)
- A Telegram bot token from BotFather
- Supabase project URL and service-role key
- Owner Telegram numeric ID
- Numeric Telegram channel/group IDs; the bot must be able to inspect membership (make it an administrator in both required chats)
- Public website URL and required invite links for private chats

## Install
1. Extract this folder to a permanent path such as C:\VEXTRO-BOT.
2. Run INSTALL.bat. It installs production dependencies from the included lockfile and creates .env from .env.example.
3. Open .env in Notepad and fill every required setting. Do not share the file or commit it.
4. Set REQUIRED_CHANNEL_ID and REQUIRED_GROUP_ID exactly. For private invite links, set REQUIRED_CHANNEL_URL and REQUIRED_GROUP_URL.
5. Set WEBSITE_URL to the existing website origin. Do not paste a service-role key into the website/browser.
6. Optionally set BACKUP_PASSPHRASE to a unique random secret of at least 16 characters. Without it, encrypted backup/restore stays disabled.
7. Save .env and run START.bat.

## Verify
- In Telegram, send /start to the bot as a normal user and as the configured Owner.
- Test both required memberships, account-linking, support tickets, guides, and Owner menu.
- Test broadcasts only with a small authorized test audience first.
- Verify a backup completes and passes integrity verification before relying on restore.
- Scheduled publishing uses OWNER_TIMEZONE (default Asia/Kolkata).

## Security
- Keep .env private. The Supabase service-role key grants elevated database access.
- Do not expose the bot port; this runtime uses Telegram long polling.
- Use a dedicated Windows account with restricted filesystem permissions.
- Back up .env separately in a secure password manager. The encrypted application backup intentionally does not contain secrets.
- Use a process supervisor or Windows Task Scheduler for unattended restart. START.bat is an interactive foreground process.
- Hosting deployment, offsite backups and automatic deployment/rollback require provider-specific HTTPS webhook endpoints; they are not configured by this package.
- CI tests and compilation do not prove that your live Telegram credentials, membership permissions, host or webhook integrations work.
