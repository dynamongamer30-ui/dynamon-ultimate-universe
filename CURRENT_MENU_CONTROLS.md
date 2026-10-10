# Current Royal Void / Thunder menu: control map

Reviewed 10 October 2026. This describes the supplied Java source, supporting DEX/build material and the decrypted active signed runtime. The installed patched host activity was not supplied and Android gameplay was not independently tested. Prepared repairs are distinguished from unchanged live behavior. The old Mod.zip is historical reference, not today's loader.

## Launcher and shared controls

- Floating launcher: tap opens the panel; drag repositions and snaps to an edge, saving normalized coordinates. Compact mode uses an edge handle. Long press opens four actions: Open menu, Stop all automation, Expand launcher/Collapse to edge handle, Retry game loading. Retry invokes the native payload loader when present.
- Panel header can be dragged within screen bounds. Close and Android Back hide the menu. Opening/hiding controls backdrop capture, ambient glow, focus and keyboard dismissal.
- Navigation expands/collapses and selects Home, Battle, Arena, Items, Unlock, Team, Skins, Advanced, Settings (Command centre), Community. Page scroll positions are saved.
- Search matches feature title, description and category across the catalogue, replacing page content while a query exists. It does not search inventory quantities or every page action. Clear the query to return to page content.
- Long press a feature card adds/removes it from local Favorites, shown on Home. Tap its switch sends `flag(key,value)`. Runtime readiness and app/mod/individual locks affect availability; the payload must enforce them too.
- GAME CONNECTED reflects snapshot readiness. Preview mode uses sample data. Loader errors appear as notices. Snapshot polling is approximately 1.2 seconds with the panel visible and 4 seconds hidden; this is local WebView communication.
- Commands are deduplicated while pending. Successful commands update feedback/state; rejected commands show errors. Numeric dialogs have Apply and Cancel; confirmation dialogs have Continue and Cancel. Numeric input must parse as a whole number; final bounds depend on runtime validation.

## Home

- Dashboard shows coins, dust and current speed.
- Edit coins & dust opens two inputs. Apply submits `coins(value)` and `dust(value)` separately, so these are not one atomic operation.
- Open command centre navigates to Settings.
- Speed slider updates its label during dragging and submits `speed(value)` on release. Min/max/step come from signed menu configuration, with reviewed 0.1–8/0.1 fallback before it arrives. The speed card explains animation gains and Arena timer/desync risks; speed remains the user choice.
- Auto World displays map, progress, bosses, quests, elapsed/remaining time and IDLE/RUNNING/PAUSED status. Start sets `autoWorld=true`; Pause/Resume sends `pause(kind=world,value)`; Stop & restore sets it false. Pausing is available when automation is active. Exact route/battle behavior lives in the game payload.
- Favorites are the same feature cards and switches as their original pages.

## Battle, Arena and Advanced feature switches

FeatureRegistry starts with all 19 reviewed controls and validates a schema-1 catalogue from the signed payload (up to 128 unique feature keys). Labels/descriptions/categories can change without recompiling the Java menu. The decrypted current payload contains these 19 switches. The catalogue is verified; actual gameplay effects are not independently device-tested.

| Page | Key | Reference label | Intended catalogue meaning |
|---|---|---|---|
| Battle | god | God mode | Protect active team from damage |
| Battle | oneHit | One-hit damage | Defeat active enemy quickly |
| Battle | crit | Critical hits | Force critical ability hits |
| Battle | statusImmune | Status immunity | Protection from sickness/hypnosis |
| Battle | noCD | No cooldowns | Keep ability cards ready |
| Battle | alwaysCatch | Always catch | Catch helper |
| Arena | botMatch | Bot matchmaking | Arena opponent hook |
| Arena | winTrophy | Win bot matches | Numeric result 0 for bot wins; OFF/real results preserved |
| Arena | noTrophyLoss | No trophy loss | Trophy-loss protection |
| Advanced | fullheal | Full-heal potions | Potion healing hook |
| Advanced | pvpcd | Faster arena items | Arena item timing hook |
| Advanced | itemtimer | No item wait | Item wait hook |
| Advanced | turnreset | Refill items each turn | Per-turn item reset hook |
| Advanced | items5 | Five items per turn | Item-use limit hook |
| Advanced | nicklen | Longer nicknames | Name-length hook |
| Advanced | nickval | Name validation | Name-validation hook |
| Advanced | statcap | Stat cap override | Stat cap hook |
| Advanced | shopfix | Shop compatibility | Permanently ON; OFF/import/reset requests normalize to ON |
| Advanced | maxdef | Defense cap override | Defense cap hook |

Arena also has Auto Grind: Start sets `autoGrind=true`, Pause/Resume sends `pause(kind=grind,value)`, Stop & restore sets it false. The card displays runtime progress/status. The Java layer sends commands; it does not itself implement battle logic.

## Items

- Set all consumables: numeric dialog (initial 99), then confirmation, then `allItems(value)`.
- Inventory filter matches item titles without case sensitivity. At most 60 rows display; refine the filter for larger inventories.
- Each row shows icon, name and quantity. Edit opens numeric input and sends `item(id,label,value)`.
- Inventory is obtained through `items`; successful edits trigger refreshed display.

## Unlock

- Unlock all supported categories confirms, then sends `unlockAll`. Prepared Java now confirms adding missing playable Dynamons; the unchanged live runtime still has the collection-only failure described in the repair notes.
- Separate Mons, Skins, Emotes, Avatars and Worlds buttons confirm, then send `unlock(kind)`.
- Before the repair, Mons changed collection entries and did not add playable monsters. Prepared Java labels this All playable Dynamons; its matching prepared payload adds missing owned monsters at level 1. This is not deployed yet and does not validate purchases. Refresh the relevant game screen after changes.

## Team

- Party size buttons 3, 4 and 5 send `party(value)` and highlight current snapshot selection.
- Scan team & enemy sends `scan`, returning monster cards and a scan token.
- Each card shows side/name/current and maximum HP. HP, ATK, DEF and AIM edit buttons open numeric dialogs and send `stat(token,index,stat,value)`.
- Scan again after changing battles/monsters; a stale token must not edit a different monster.

## Skins

- Pack folder input defaults to `mypack`. Load manifest reads the existing Supabase skin-pack storage manifest.
- Monster IDs/names are collected, sorted, and preselected from current enabled selection when the pack matches.
- Each visible row has icon/name/selection. Row selection is pending until saved. At most 60 rows display, while Apply all uses the complete loaded list.
- Save selected sends `skinConfig(pack,manifest,enabled)` for selected IDs. Apply all sends the same command with every ID. Restore original sends `resetSkins`.
- Changes apply after restarting the game; storage errors are reported. This is separate from the original game's Firebase account subsystem.

## Settings / Command centre

- Theme choices: Dark, Fire, Thunder, Water, Earth, Diamond, Gold and Spirit, subject to enabled-theme configuration. Each row has logo, swatches and selected indicator. Tap saves the device preference and rebuilds menu/launcher appearance, preserving panel position/scroll. Selecting the already active theme does nothing.
- Export all settings calls `exportControls`, combines runtime controls with local interface preferences and opens Android's document picker. JSON format `dg-royal-void-profile`, schema 1, default name `Dynamon-Gamer-Controls.json`, maximum 1 MiB.
- Import and restore all settings opens a document picker, validates format/schema/controls, asks confirmation, calls `restoreControls`, then restores local preferences/theme/sounds/launcher and redraws. Currency/inventory can change. Automation stays stopped until started. Cancellation makes no restore request.
- Haptic feedback (default on), Interface sounds (on), Subtle 3D depth (on), Ambient glow (on), Reduced motion (off): local switches. Sounds prepares audio; glow immediately adjusts visibility. Preferences persist on device.
- Glass opacity slider: 65–100%, default 86%; updates locally during dragging.
- Sound volume slider: 0–60%, default 22%; saves locally, with feedback on release.
- Panel size slider: height 60–95%, default 78%; resizes while dragging.
- Toggle compact edge launcher saves launcher mode.
- Stop all automation sends `stopAll`; it is also in launcher quick actions.

## Community

- Branding/logo comes from configured appearance. Up to eight valid configured HTTPS community links are shown as icon/button rows and opened with Android ACTION_VIEW. URLs with user information or missing hosts are rejected.
- If branding links are unavailable, a loading/connection explanation is displayed. If no application can open a link, an error notice is shown.
- Footer shows Royal Void version 0.3.0 and Open Sans typography.

## Limits and architecture

The reference configuration sets speed 0.1–8 in 0.1 steps; currency 0–999999999; item quantities 0–999999; party size 3–5; stats 0–1000000. These values are also present in the decrypted active signed menu configuration. Runtime command ceilings must be updated together with UI limits for a future range change.

classes6 is the AIDE-built key/login dialog. classes7 is the Termux/R8-built native menu plus signed split loader. Login writes Worker/Supabase verification state; loader validates payload signature/metadata, checks device/license state, decrypts, and starts the protected index/game runtime. Original Firebase game UID/account operations remain separate. No Shopify is involved.

The supplied MainActivity is the original baseline and has no mod attach calls. Intended integration uses DGDialog(Activity) and ModEntry.attachWithLoader(Activity, initialized WebView). Installed hook placement, AndroidManifest wiring, gameplay effects remain unverified on Android; the active signed runtime itself has now been inspected. Gameplay fixes have been prepared and code-tested, but no payload upload, database change, production deployment or Android installation has been performed.


Current prepared revision: bot matchmaking locks during any active match and releases after cleanup; other controls remain available. Full-heal gates Arena heal spray slots/text/timer and consumes stock normally. Unlock All includes current worlds and active variants without completing story quests. Scan results alone remain scan-dependent; your team is cyan and enemy cards coral with a subtle static outline/glow. Native UI changes require rebuilding classes7.dex, in addition to publishing the new payload. Live real-player action acceptance and freeze resolution remain unverified.
