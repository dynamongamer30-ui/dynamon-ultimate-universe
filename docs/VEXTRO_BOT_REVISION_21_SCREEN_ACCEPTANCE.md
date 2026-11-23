# VEXTRO BOT — Revision 21 Screen Acceptance Map

Status: implementation traceability map for the Telegram-native bot bundle.
Design sign-off: dark/professional presentation; Telegram inline-button navigation; Owner-only administration; English, Hindi (Roman), Vietnamese; consistent Back/Home/Cancel; confirmation for destructive actions.

**Counting clarification:** “21” is the revision identifier. The approved UI scope is 50 screens (13 user, 24 Owner administration, 13 shared interaction), not a separate 21-item review set. The full original numbered screen-by-screen transcript is not present in the repository, so this file is a traceability reconstruction from the approved scope and implemented runtime. It does not claim to reproduce unavailable historical wording verbatim.

## User screens (01–13)

| ID | Screen | Runtime entry / acceptance |
|---|---|---|
| 01 | Welcome | /start; personalized welcome and language-aware inline menu |
| 02 | Membership verification | channel + group join controls, Verify action, live membership check |
| 03 | Language selection | English, Hindi (Roman), Vietnamese; persists preference |
| 04 | Website account linking | one-time link token; website approval RPC is authoritative |
| 05 | Main user menu | Account, Language, Guides, Rules, Support, Tickets, Membership, Help, About |
| 06 | My Account | linked/unlinked status, link creation and unlink eligibility |
| 07 | Guides | published guide browsing, search and media |
| 08 | Rules | published rules and required community guidance |
| 09 | Membership | current channel/group membership status and recheck |
| 10 | Support | create ticket with category and subject |
| 11 | Ticket conversation | user replies and media attachments in active ticket |
| 12 | Language settings | change persisted language |
| 13 | Help / About | command help, bot information and navigation home |

## Owner administration screens (14–37)

These are Owner-gated Telegram screens. Each must reject non-Owner callbacks and commands.

| ID | Screen | Runtime entry / acceptance |
|---|---|---|
| 14 | Owner access gate | owner identity check before any privileged action |
| 15 | Owner dashboard | /admin_menu; links to all administration modules |
| 16 | User management | list, search, paginate, inspect and restrict users |
| 17 | User profile | Telegram identity, language, last-seen and account-link status |
| 18 | Broadcast manager | list jobs and inspect delivery state |
| 19 | Audience selector | membership-aware audience snapshot |
| 20 | Broadcast editor | draft, edit, format and preview broadcast |
| 21 | Broadcast results | sent/failed counts, progress and reconciliation |
| 22 | Message / post manager | channel post drafts and published posts |
| 23 | Universal message editor | text, formatting, media and HTTPS buttons |
| 24 | Post preview and publishing | preview, publish, multi-destination and schedule actions |
| 25 | Guide manager | list, search, create and edit guides |
| 26 | Guide editor | localized text, media and buttons |
| 27 | Guide review queue | review, publish, archive and keyword workflows |
| 28 | Support inbox | search and list active tickets |
| 29 | Ticket administration | reply, internal note, priority, close and reopen |
| 30 | Membership administration | configure required channel/group and diagnose membership |
| 31 | Moderation rules | blocked phrases/domains and allowlist management |
| 32 | Moderation actions | warn, mute/unmute, ban/unban and event review |
| 33 | Schedule manager | scheduled posts, leases, retries and cancellation |
| 34 | Analytics dashboard | users, active users, links, tickets, posts and broadcast metrics |
| 35 | Security and audit | recent privileged actions, restrictions and audit trail |
| 36 | Backup and restore | encrypted backup inventory, verification, restore and safety backup |
| 37 | Settings, health, logs, maintenance and updates | runtime configuration, health checks, redacted logs, maintenance and Owner-approved release workflow |

## Shared interaction screens (38–50)

| ID | Screen | Runtime entry / acceptance |
|---|---|---|
| 38 | Navigation shell | consistent Home/Back/Cancel navigation |
| 39 | Confirmation dialog | explicit confirmation for destructive or irreversible actions |
| 40 | Form validation | required fields, length limits and actionable errors |
| 41 | Search | scoped search for users, tickets, guides, posts and audit events |
| 42 | Pagination | bounded page navigation and empty-state handling |
| 43 | Media attachment picker | photos, videos, documents, animation, audio and voice |
| 44 | Media preview | Owner preview before publication or reply |
| 45 | Delivery progress | queued, sending, sent, failed and retry-after states |
| 46 | Scheduling and timezone | Owner timezone input and UTC persistence |
| 47 | Error and recovery | safe user-facing error, logging and retry path |
| 48 | Loading / empty states | clear feedback when data is loading or unavailable |
| 49 | Localization and accessibility | language-aware labels, concise controls and readable text |
| 50 | Health / QA / release status | health diagnostics, acceptance checks and release readiness |

## Cross-screen sign-off requirements

- All Owner screens enforce the configured Owner Telegram ID server-side; hiding buttons is not authorization.
- User account-link approval continues to use the existing website RPC. Never write website-owned link rows directly.
- Membership is checked against both required Telegram destinations; Telegram administrator permissions are required for moderation and service-message cleanup.
- Broadcasts require preview and explicit Owner confirmation; uncertain sends require reconciliation rather than blind duplicate retry.
- Scheduled operations use Owner timezone (default Asia/Kolkata) and persist UTC timestamps.
- Backups are encrypted before leaving the process; restore creates a safety backup and preserves website-owned account-link and guide data.
- All dynamic content is escaped/length-limited for Telegram; errors are logged with secrets redacted.
- Telegram client appearance is controlled by Telegram; the bot cannot force dark mode. The approved dark visual standard applies to authored message hierarchy, not a client theme override.

## Verification status

The CI workflow must type-check, run unit tests, compile production JavaScript and package source, tests, configuration template, lockfile, runtime build and this acceptance map. A passing CI run is not a live Telegram acceptance test. Live acceptance still requires the real Owner token, membership destinations, service permissions and hosting environment.
