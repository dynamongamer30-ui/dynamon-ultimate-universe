# Telegram campaign claims

The website signs the existing same-origin campaign proxy requests, validates the Supabase user and Turnstile server-side, and issues a 30-minute opaque handoff. Only its SHA-256 hash reaches the database. The existing bot confirms the destination website profile, verifies both official memberships, and redeems through a dedicated credential. Reward allocation and uniqueness are transactional.

The additive migration preserves existing campaigns, receipts, passes, account data, branding, and settings. Campaign deletion is archival: it closes the public link and unfinished claims without deleting awarded rewards. Legacy redemption RPC execution is revoked to prevent bypassing Telegram verification.

## Bot activation

Install the supplied code-only bot update in the existing bot folder, preserving `.env`, `DB_PATH`, `data/`, and tutorial assets. Run `node upgrade-backup.js` before starting. Keep `.env.claims` private. The existing bot must be administrator in its configured channel and group. It announces readiness only after checking those permissions; new website handoffs remain disabled until it is ready. Run one polling process.

The bot's new `campaign_pending_claims` SQLite table stores token hashes and pending confirmation state. No existing tutorial or language rows are rewritten. Membership events trigger immediate checks, while bounded background retries recover missed events and restarts. Telegram may require first-time users to press Start.

## Validation

Run `npm run check`, `npm run build`, and the campaign gateway/proxy, private-cache, Telegram campaign, appearance, and theme tests. Playwright campaign tests cover all nine themes on phone and desktop. Logo tests cover empty mobile MIME values, successful publication and failed publication without false success. The bot's tests verify callback size limits, restart recovery, native green styling, and preservation of saved multilingual content.

Claims cannot guarantee one physical person: uniqueness applies per campaign to website and numeric Telegram accounts. Internal anti-abuse rules are not shown in public copy.
