# Owner key system and Royal Void controls

Open the owner profile menu → Key system (between Owner dashboard and Control panel).
The owner dashboard also links here. `/admin-keys` remains protected by OwnerGate and Supabase RLS.
The old Control panel DEX tab now points here instead of maintaining a second editor.

## Pages

- Keys: create DG/VIP keys, extend, revoke/unrevoke, delete and search by key/device/IP. Zero duration creates lifetime access. Other timers begin at the first successful game login. Unused keys display “Starts at first login”; bound expiry=0 means lifetime. Bulk failures are reported.
- Devices: existing activation records and device bans. No online-presence polling was added.
- Royal Void DEX: 35 feature locks, eight themes, palette overrides, menu header name and up to eight community links (the current native display limit).
- Config: existing generator maintenance, duration and rate-limit settings.
- App: existing login-dialog configuration and signed encrypted payload upload. Login dialog branding and native menu branding are separate consumers; edit each in its labelled editor.

## DEX lock contract: app_config / FeatureLocks

A boolean `true` means locked. Unknown boolean keys are retained when editing.

- Global: `app`, `mods` — Worker blocks new payload access.
- Battle: `god`, `oneHit`, `crit`, `statusImmune`, `noCD`, `alwaysCatch`.
- Arena: `botMatch`, `winTrophy`, `noTrophyLoss`, `autoGrind`.
- Advanced: `fullheal`, `pvpcd`, `itemtimer`, `turnreset`, `items5`, `nicklen`, `nickval`, `statcap`, `shopfix`, `maxdef`.
- Commands: `speed`, `setCoins`, `setDust`, `items`, `party`, `teamEditor`, `skins`, `autoWorld`.
- Unlocks: `unlock` (umbrella), `unlockMons`, `unlockSkins`, `unlockEmotes`, `unlockAvatars`.

These keys already have checks in the current signed native game adapter. The `skins` control covers skin configuration and reset, independently of the skin-unlock category. Automation checks its required feature locks. Profiles, combined unlock and portable restore validate relevant locks before mutation. Stop controls remain available. Locks prevent future actions; they do not remove previously granted game inventory.

## Delivery

The website writes Supabase `app_config` rows as the signed-in owner:

- `FeatureLocks`: startup access/feature lock snapshot.
- `DexBranding`: `name`, existing `edition`, and `links[{title,url,icon}]`.
- `DexThemes`: `schema:1`, `defaultTheme`, `enabledThemes`, `palettes`.

The deployed `dg` Worker reads these on successful startup access. Its combined appearance read supplies branding and themes to NativePayloadLoader; the DEX supplies locks to the signed JavaScript adapter. The current themed DEX already supports these settings. This website change requires no DEX rebuild or new payload upload.

There are no new game heartbeats, presence writes or configuration polling. Changes arrive at the next full game launch; bans may additionally be cached for 60 seconds. An already running offline session cannot be remotely stopped by these startup settings.

Theme/logo selection is local after startup. Logo PNGs and fonts remain APK assets. Existing selected themes are preserved while enabled; the configured default applies otherwise. Numeric gameplay limits, new hooks and new native UI features still need the corresponding signed payload or DEX source update. Do not advertise arbitrary new features as remotely implemented by adding a config key alone.

## Saving and validation

DEX settings use a conditional JSONB update against the loaded value. A stale editor must reload instead of overwriting a newer save. A missing settings row is inserted; uniqueness conflicts are reported. Key mutations require an existing row and detect intervening changes. Lifetime keys cannot accidentally become finite through Extend. Manual keys use cryptographic randomness and insert-only creation.

The existing database RLS policies, Worker bindings, admin secret and signed payload are preserved. This change does not create an alternate login or put credentials into the DEX.

Run `node tests/key-admin.test.mjs` with Node 22.13+ / Node 24 for key timing, conflict handling and key creation tests. Run the normal TypeScript check and website build. The separate Royal Void bridge tests cover runtime locks; this web repository does not package those tests into an APK.
