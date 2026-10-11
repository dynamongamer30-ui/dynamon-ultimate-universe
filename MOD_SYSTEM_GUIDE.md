# Royal Void / Thunder: current mod system and owner handover

Updated 11 October 2026, using the owner's Asia/Kolkata date. This is the authoritative guide on the download branch. It describes reviewed deployed services, the supplied client, and prepared repairs separately. It contains no admin key, private signing key, AES key, service-role credential or user key records.

## 1. Current state: deployed, observed and prepared

| Layer | Evidence and current state | What is not established |
|---|---|---|
| Installed game | Owner screenshots show Royal Void 0.3.0 and current menu controls; 11 October supplied extracted mod manifest and classes.dex–classes4.dex for static auth review | Full APK, original signer, installed V2/V3 certificate and phone auth/server logs are unavailable; supplied V1 test certificate verifies against the mod manifest/four DEX files |
| Host activity | Original snippet and newly supplied mod classes.dex identify MainActivity; the supplied mod has DGDialog and ModEntry.attachWithLoader calls, with game WebView stored in z | Actual on-device lifecycle/callback execution is not verified; original baseline and modded DEX are different evidence |
| Login DEX | Supplied classes6.dex and android-dialog-fixed source describe the AIDE key dialog and periodic verification | Device behavior beyond the source/DEX evidence was not independently exercised |
| Menu DEX | Supplied classes7.dex and all 33 Java source files describe the native menu and split loader | The latest changed ModController has not been compiled into a replacement DEX here |
| Live payload | Read from Cloudflare R2 `active_payload`: build `royalvoid-unified-20261009-161600-427662`, both legacy client 3 and split client 4 | Neither variant has been replaced by this repair |
| Active split runtime | Decrypted and inspected for this review. Format DG-MOD-SPLIT-1, 34 edits, 118066 runtime characters, 19 feature catalogue entries | No actual Android gameplay session was run here |
| Prepared repair | Download branch contains the complete changed Java source, menu_fixes.js and corrected update_payload_once.py. The current template has 35 base edits plus five verified potion-site edits (40 final edits), with the complete repaired runtime | Prepared code is not proof that the owner's installed app or server payload was updated |
| Website | GitHub main has owner/admin controls and a loader-upload page. Reviewed loader form serializes the older flat client-3 bundle | That form is not a verified upload path for a dual-variant bundle |
| Backend records | Worker integrates Supabase keys, activation, bans, app configuration and skin storage | Original-game Firebase/Arena ranking and Google Play Games account/cloud saves are separate from the mod key backend |

The retained GitHub branches are main and royal-void-downloads-20261009. A third branch, free-tier-presence, remains because the connected GitHub tools expose no branch deletion operation. The owner authorized deleting other branches; do not claim that authorization alone completed deletion. Main has not been changed by the reviews or repairs described here.

The owner's platform correction is definitive: there is no Shopify integration in this project. Cloudflare, Supabase, GitHub, the website, and the original game's Firebase operations are the relevant systems.

## 2. How the layers connect

The original game runs through Cordova in a WebView. Java adds a native launcher/panel on top of the Activity. Feature buttons are not HTML elements: ModController builds Android views, GameBridge communicates with the local WebView, and the signed JavaScript runtime performs game actions through the game's Haxe registry. The original game engine/data/art remain APK assets.

The login and menu are separate DEX components. classes6 supplies DGDialog/key verification. classes7 supplies ModEntry, the native UI, NativePayloadLoader and crypto helpers. They do not directly invoke each other's classes in the supplied DEX method references. The login writes server state, and the loader's /check request uses that state to decide whether to release a payload key. Do not remove the login DEX merely because the native menu is visible.

The intended host integration uses DGDialog(Activity) and ModEntry.attachWithLoader(Activity, initialized WebView). The exact original Activity snippet confirms the WebView becomes available through Cordova `q.h().f()` and is stored in `z`. It also performs original-game Firebase initialization/UID work. Its `J()` evaluates `window.userUid || null`; `K(String)` schedules Firebase tasks using a UID. The obfuscated callback implementations were not included, so the exact Firebase function/response cannot be reconstructed from that snippet alone.

The expected public Java menu entrypoint is:

```text
com.dynamongamer.royalvoid.ModEntry.attachWithLoader(android.app.Activity, android.webkit.WebView)
```

Preserve that signature through R8. `attach(Activity,WebView)` attaches UI without starting the native loader; using it alone can leave the game bridge missing. `attach(Activity)` searches for a WebView, whereas explicit host-WebView attachment avoids selecting the wrong view. `preview(Activity)` uses sample data. It is for the preview app, not real gameplay.

The review has not inserted a hook into the original activity or changed its register count. Do not copy the old guide's exact hook-placement/register claim as if it were verified in the installed APK. Preserve original game code and existing login wiring; attach after the real WebView exists and on the Android UI thread. The package declared by the actual AndroidManifest is not established by the supplied original class name alone.

## 3. Current split boot sequence

The supplied update_index.py generates a split-loader index. It performs no network publication or signing and should not be confused with the payload updater. The old loader.js architecture is retired according to the owner.

1. index.html loads existing Cordova/support resources and defines the normal/protected boot functions.
2. It declares `__DG_SPLIT_INDEX_READY`, `__DG_INDEX_REVISION`, protected-mode query handling and `__DG_START_PROTECTED`.
3. Normal mode loads the local original `./dynamons_world.min.js` and calls lime.embed. This remains a usable normal-game path while the key dialog authorizes the mod.
4. NativePayloadLoader recognizes the local index and waits for the appropriate readiness/device state. It prefers Cordova device.uuid and has an ANDROID_ID fallback.
5. It fetches `/payload?client=4`. It validates build syntax, ciphertext SHA-256, protocol 2, min_client 4, positive issued time/future limit, ciphertext signature and metadata signature before authorizing the key.
6. POST `/check` sends fp, build and ctsha. The server considers ban/block status, login freshness, license/device/expiry, maintenance and locks.
7. For `no-login`, the Java source retries authorization with delays 3, 7, 10, 15 and 20 seconds, then reports that the existing key dialog must be completed. Other rejection reasons are surfaced without inventing a successful boot.
8. On success, Java receives the AES key plus featureLocks and optional brand/themes. Missing required lock/key data is treated as a server compatibility error. app/mods locks block mod boot.
9. It decrypts a DG-MOD-SPLIT-1 bundle. It hashes APK `assets/www/dynamons_world.min.js` and requires the signed original_sha256 to match before proceeding.
10. It reloads the local index with `?dg-protected=<token>` and transfers the bundle through evaluateJavascript chunks. The current Java transfer chunk size is 24000 characters.
11. Protected index reads the local original engine, validates sorted patch ranges, applies edits backwards, sets launch server/locks/config globals, evaluates the patched engine and runtime, calls lime.embed, then calls `__DG_INSTALL_NATIVE` and requires `__DG_NATIVE`.
12. A canvas watcher reports whether the game created a nonzero canvas; this is a rendering/startup signal, not a guarantee that every feature behaves correctly.

Changing the supplied original game file, local index, protected bundle or loader independently can break boot. A signature-valid bundle still fails when its original hash differs from the installed APK's local engine. Loader failures are not a reason to disable cryptographic checks. The loader zeros temporary key/plaintext byte arrays in a finally block; transient JSON/string copies are still needed for the WebView transfer, so this is not a claim of guaranteed secret erasure from all process memory.

Legacy client 3 instead receives a complete encrypted patched-engine/runtime payload. Preserve this variant when generating a new release. Client-3 and client-4 are protocol compatibility choices, not DEX numbers; classes6/classes7 name the injected components in the owner's APK.

## 4. Key dialog, settings checks and network timing

The AIDE-built dialog fetches /config for login-related settings such as maintenance/update/link information and submits /verify-key. Its device identifier uses ANDROID_ID; NativePayloadLoader prefers a Cordova UUID. Whether those identifiers resolve identically in the installed APK must be checked when diagnosing no-login/device mismatch. Do not assume identical fingerprints or assume the mismatch always occurs.

The dialog stores the entered/successful key in DG_Prefs saved_key and renews key verification approximately every ten minutes in the reviewed source. Expiry/rejection can bring back a dialog/ban screen; that code does not independently demonstrate termination of an already running WebView/runtime. The native menu's local snapshot loop runs about 1.2 seconds while visible and 4 seconds hidden. These evaluateJavascript calls are not HTTP presence requests.

The native split loader fetches payload/check at boot/retry rather than adding a periodic HTTP heartbeat. The live Worker's /heartbeat is a compatibility no-op, and untrusted /tamper reporting does not automatically ban a user. This does not mean the entire app has no periodic network activity: key verification and the original game's Firebase/cloud operations remain separate network paths.

PublicConfigClient is instantiated/closed by ModController but its load method is not invoked in the supplied startup path. It is not evidence of a running public-config polling loop. Branding/community data normally comes from the signed runtime snapshot and optional startup server override. Theme changes/local settings do not need a network call merely to redraw chrome.

## 5. Worker and private storage contract

License/payload service: `https://dg.dynamongamer30.workers.dev`. Generator service: `https://generator.dynamongamer30.workers.dev`. Supabase is accessed by the Worker for the mod records. Administrative secrets are owner/server values, not source assets.

The current upload route requires `format: DG-ACTIVE-PAYLOAD-1`, a shared build ID and both variants. Legacy has protocol 2/min_client 3; split has protocol 2/min_client 4. Each view has ciphertext, IV, ciphertext SHA, ciphertext signature, metadata signature, issued time and its own AES key. A flat old client-3 bundle is rejected by the deployed upload route with a unified-updater compatibility error.

The current R2 representation is a single private `active_payload` object. Its custom metadata declares DG-ACTIVE-PAYLOAD-2, shared build, legacy length, split offset/length, each variant's ciphertext SHA, and each AES key. The object body is public-view legacy JSON, a newline, then public-view split JSON. `readActive` reads metadata; `activeView` reads the relevant byte range with an ETag condition so a concurrent overwrite cannot mix metadata from one build with ciphertext from another. The reviewed object was 7167763 bytes.

Do not describe the retired separate `ct:<build>`, `key:<build>` and current_build storage design as current. The code retains a fallback for an older complete-object representation, but that is not evidence that the active object uses it. Keep the efficient split/range layout when publishing through the current Worker; direct ad hoc R2 rewrites can lose required custom metadata or alter request cost.

`/payload` serves the legacy public ciphertext view by default. `/payload?client=4` selects split. Neither public response should contain key_b64. `/check` gates an AES key using the fingerprint, recent login, license state and matching ciphertext digest. The same build serves two different ciphertext hashes; check must choose the matching variant, not assume only one hash exists.

FeatureLocks is an app_config row containing boolean lock keys. app/mods are global mod gates; unlock blocks unlock categories and individual unlockMons/unlockSkins/unlockEmotes/unlockAvatars can restrict them separately. FeatureRegistry catalogue keys, automation keys and owner policy keys overlap but are not the same list. Do not infer that nineteen visible feature cards represent all server-controllable functions.

The reviewed login grace is thirty minutes; the Worker normalizes seconds/milliseconds where its existing login code expects timestamps and rejects implausible future login times. A currently valid key does not itself prove a fresh login record or that the loader's fingerprint matches the dialog record. Review the specific rejection reason before changing UI code.

DexBranding config provides startup brand name/links; DexThemes provides schema/default/enabled palette information. Worker sanitation restricts supported theme IDs and color fields. HTTPS startup overrides are not part of the ECDSA-signed payload defaults. Java's fixed edition/version label is not a fully server-editable field just because a branding row contains an edition. Logos/fonts/sounds remain APK assets.

Supabase records reviewed include valid_keys, activated_users, banned_devices, suspicious_activity and app_config. Owner-auth RLS policies were reviewed for the website; a browser UI gate alone is not the database security rule. Public skin-pack storage is a separate bucket/manifest path. No Supabase schema change, user record migration or production setting change has been performed by the menu repairs here.

The website's owner login is described by the user as restricted to a particular Gmail. Actual enforcement belongs in the existing auth/owner/RLS code; do not place the private email or a service-role key in this public guide. Original-game Firebase user UID, trophy writes and cloud saves are not Supabase mod key records.

## 6. Owner website and upload compatibility

Main remains the website branch. The download branch contains mod deliverables and is not a replacement production website source tree. /admin-control contains DEX control/theme configuration; /admin-loader contains device/admin-key/payload controls. The reviewed TypeScript uploadPayload helper checks a flat protocol-2/min_client-3 payload; the form selects flat ciphertext/key/metadata fields and does not preserve a dual-variant object.

Therefore the last repair package's suggestion to upload its dual JSON through that existing form was incorrect. Use the corrected Python updater with `--upload` and the existing ADMIN_KEY, or a separately reviewed uploader that preserves the exact DG-ACTIVE-PAYLOAD-1 variants contract. The --bundle-out option remains useful for a private owner export; it is not proof the website form can consume that export.

Updating the website uploader is an outstanding compatibility task, not a change silently made in main. Do not write main or deploy the website as part of a documentation sync. The current admin/list presence response deliberately has presence_disabled/empty active data; an empty active list does not prove nobody uses the mod.

## 7. Payload-first repair and current original-game requirement

The repair tasks prepared fixes for unlock Mons, unlock all categories, one-time reward/shop ownership checks and party-button highlighting, followed by a separately validated patch table for the supplied original engine. It did not publish a new live payload or build/install a replacement classes7.dex. The owner must not be told the live game is fixed solely because source tests pass.

The current active split payload is signed for original-game SHA-256:

```text
044e46362e4a286ea279be3762c02d1934afdc682f539cb68dd194e74ec4b9cb
```

The earlier uploaded original JavaScript has SHA-256:

```text
b6f5470f21360435bc98c868bad208d79ab03493d045598a8f3924b099f818eb
```

Those bytes differ. Use the unmodified engine matching the APK you will install. The corrected updater now has separately validated patch tables for both hashes above: the active build's original and the earlier supplied original. It selects by SHA-256 and still refuses every unknown hash. Do not change its expected hash just to silence the error, patch a previous patched payload as though it were original, or assume offset compatibility because a version label looks the same.

`raw-project/tools/update_payload_once.py` contains the complete current split template/runtime, plus the repair and thirty-six sorted edits. It selects the validated edit table for one of the two supported original hashes, generates both variants from those engine bytes, and uses the existing pinned ECDSA private key, fresh AES keys/IVs and one shared new build. It has no undocumented import dependency on an edited old bootstrap file; its template is embedded in the Python file. Rebuilding that embedded snapshot is necessary for a future gameplay/runtime change.

After extracting the complete fixes ZIP and using Python with cryptography available:

```bash
python update_payload_once.py --original /path/to/current-apk/dynamons_world.min.js --signing-key /path/to/signing_key.pem --upload
```

The updater reads DG_ADMIN_KEY from the environment, then OWNER_ADMIN_KEY embedded in the private phone copy, then prompts if neither is set. A private export instead of publication is:

```bash
python update_payload_once.py --original /path/to/current-apk/dynamons_world.min.js --signing-key /path/to/signing_key.pem --bundle-out /path/to/private-fixed-payload.json
```

Choose exactly one of --upload and --bundle-out. The private export includes AES keys and must stay out of GitHub/APK/chat downloads. The public archive includes source and tools, not signing keys, ADMIN_KEY or a private upload bundle. No new signing key is generated. A failed request with an uncertain network outcome requires checking current_build before retrying rather than assuming publication definitely failed.

## 8. What the prepared gameplay repair does

The active unmodified adapter's Mons command first appends IDs to GameState._capturedMons, then invokes GameState.setString. In the inspected game, setString belongs to Persistence/storage adapters; GameState has no such method. The UI can therefore show an inflated/correct-looking Dynadex total and still report `This game version does not support setString`. That counter is a collection-history list, not the live owned-monster list.

The prepared menu_fixes.js wraps the current bridge/installer, preserving the existing runtime, automation, item, skin and other commands. Its Mons path checks locks, obtains existing owned IDs from getPlayerMons(true), constructs missing supported core.Mon instances at the current game maximum level, invokes addPlayerMon, and calls saveMonsData. Owned monsters below the current cap are upgraded through doLevelUp(false, missingLevels); existing instances, UIDs and duplicates are retained. Merged retired entries and sealed-door entities are excluded. Repeated unlocks do not duplicate already owned types.

The real saveMonsData persists MONS_DATA (owned instances, level/HP/UID/party/skin data) and CAPTURED_MONS together through the game's own Persistence layer. This repair does not rename Persistence to GameState or invent a missing API. Existing capture history is preserved; it is not cleared merely because an entry is not currently owned.

Unlock all prechecks Mons/Skins/Emotes/Avatars/Worlds category locks, then uses the repaired Mons and Worlds commands plus the existing other category commands. It is not an atomic transaction across all game categories. Failure is reported, including partial additions when a game save/event fails. New playable ownership is intentional behavior in the prepared repair, unlike the old collection-only implementation.

The two one-time reward guards inspected in the active game check isMonCatched. A collection-only unlock can make them skip an unowned devil/guardian_king/spirit_dragon or a canObtainOnlyOnce reward. The added edits replace only those guard calls with playerHasMon. An owned one-time monster remains protected from duplication. This does not add a global payment-validation bypass or replace every isMonCatched use in the game.

The two extra original-file edits are ranges 1894544–1894564 and 1894657–1894677, replacing `h.isMonCatched(t[1])` with `h.playerHasMon(t[1])`. They were mapped from the decrypted active legacy source back to the signed split's original offset space and checked against existing ranges. These specific offsets apply only to the active original hash. The supplied-engine table has separately located offsets and is selected only for its own exact SHA-256. JavaScript offsets are UTF-16 code units; Python prepare applies them using UTF-16 encoding rather than treating Python code-point indices as identical.

The party-size gameplay command already changes the real party. Its stale native highlight came from styling buttons only during teamPage rendering. The changed Java tracks each party button, updates selected state/text/background/accessibility labels on snapshots and successful confirmations, and clears the references when rendering another page. The repair bridge returns actual party count in the successful command value. Failed commands do not select the requested new size.

More party members do not guarantee more front-row artwork. The supplied game can display three front-row seats while extra party entries are reserves. Do not diagnose a three-monster screenshot as proof that a fourth/fifth party member was not saved. Use the snapshot and actual game party data as well as the UI.

## 9. Build and APK placement

The current repair archive contains all thirty-three Java files under src/com/dynamongamer/royalvoid. ModController.java is the changed Java file for this repair. The included build_dex.sh and proguard-rules.pro are the owner's supplied build files, unchanged. The ZIP does not include an already compiled new classes7.dex.

In the owner's existing Termux/JDK/Android/R8 setup, run `bash build_dex.sh` from the extracted package root. ANDROID_JAR and R8_JAR must point to the existing installed tools. The script emits dist/dex/classes.dex, not a file automatically named classes7.dex. The owner applies that output as the menu DEX using the existing APK injection/sign/install process. Build mappings are private diagnostics, not APK runtime assets.

The script compiles the supplied src tree; it does not patch MainActivity, merge/sign an APK, upload a payload, change Cloudflare or update Supabase. AIDE classes6 and Termux classes7 are different build steps. The AIDE preview application's manifest/activity are not a replacement for the original game's manifest/activity. Preserve the existing login DEX and original Cordova/game libraries.

Required runtime assets include the existing royal_void fonts/images/sounds; keep their paths compatible with the Java loaders. Optional theme artwork uses royal_void/images/themes/<id>.png with fallback to brand_logo.png. Do not claim eight owner-provided theme logo files are installed merely because ThemeManager knows eight IDs. Complete Android asset presence was not independently inspected in an installed APK.

The payload repair does not require a new index.html, classes6, game manifest, hook or skin pack. Rebuild classes7 for the Java highlight/label changes. Upload the new payload for gameplay/bridge behavior. Installing only one half leaves the other half's behavior unchanged.

## 10. Crypto and validation boundaries

AES-256-GCM uses a fresh 32-byte key and 12-byte IV per variant; ciphertext includes the authentication tag. ct_sha is SHA-256 of ciphertext. ECDSA is P-256/SHA-256; wire signatures are raw 64-byte r||s, base64 encoded. Java verifies both ciphertext and metadata signatures. Public pin:

```text
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBvmVi6bDPa9eUOBNsYKr+IQ3JW3rQPQpeWxhi/fTTuLIn8jtG3vDb1G2y9286BKW1GKs2zksU9Grw6eFMHF7Aw==
```

The metadata message is exactly UTF-8, with no trailing newline:

```text
DG-PAYLOAD-V2
{build}
{ct_sha}
{iv_b64}
{issued}
{min_client}
```

min_client is 3 for legacy and 4 for split. The public trust anchor is not an ADMIN_KEY, Supabase key or Cloudflare token. The existing private signing key matched this pin during the isolated signing checks. Do not publish that private key or generate a replacement without a separately reviewed client trust-anchor change.

Completed checks: reproduced the old setString failure; added/persisted owned monsters using isolated real game add/save functions; repeated unlock without duplicates; respected category locks; delegated unlock-all; party size 3→4→5→4→3 and rejected-party behavior; one-time reward ownership logic; runtime/updater syntax; Java parser; both variants' AES-GCM round trips and ECDSA ciphertext/metadata signature verification; wrong-original rejection; additional range non-overlap; GitHub source/archive blob hashes.

Actual active payload was read/decrypted, and the reward guards/add/save/ownership APIs were confirmed there. Native Android type checking, R8 compilation, APK installation and real gameplay verification were not completed. A Cloudflare execution sandbox refused dynamic code compilation; do not report that attempt as a successful full-game syntax/device test. No live payload publication was performed.

## 11. Troubleshooting without confusing layers

| Symptom | Relevant evidence/check | What not to infer |
|---|---|---|
| setString error when unlocking Mons | Old active command mutates history and calls a missing GameState method | A 353/353 counter proves 353 playable owned monsters |
| Shop skips one-time monster | Captured history may include the type even when not owned; inspect the two reward guards | This proves payment verification is the failure |
| Party highlight remains old | Confirm whether new Java was compiled/installed; compare response/snapshot count | Three front-row drawings imply party size never changed |
| Wrong original hash | Extract local engine from current APK and compare the signed expected hash | Same version label means same engine bytes |
| No-login | Complete existing dialog; inspect normalized fingerprint/login freshness | A visible launcher proves authorization succeeded |
| Bridge missing | Check attachWithLoader, local index, signed runtime installer and boot order | Missing features can be fixed only by adding Android views |
| Owner locks do not update during an existing session | Boot/check supplies launch configuration; no continuous native settings fetch | App_config write instantly modifies every already running client |
| Empty active list in admin | Presence polling is disabled by current contract | There are zero active users |
| Payload upload rejects flat JSON | Current route requires both variants; use corrected updater direct upload | Removing min_client/signatures is a valid repair |
| Skin selection not visible immediately | Selection saves first; restart applies asset substitutions | A pending check mark immediately changes sprites |
| Theme logo missing | Verify optional APK asset and brand-logo fallback | Eight theme IDs guarantee eight installed logos |
| Profile survives uninstall only in some location | Use SAF export to a document retained outside app-private data | SharedPreferences survives uninstall automatically |

## 12. Documentation and branch-sync rule after every task

The owner's standing instruction is to maintain this detailed guide, approximately the size of the previous 80 KB handover, after every completed mod task. Accuracy/completeness takes precedence over an exact byte count: do not pad, abbreviate code or preserve false statements merely to hit a number.

After a task, update the affected guide sections, status/evidence/limits, file placement and commands. Remove superseded claims, fill gaps from verified code/service observations, and record remaining unknowns as unknown. Distinguish planned/prepared/compiled/installed/deployed/device-tested states. Refresh the current-state table instead of endlessly appending contradictory history.

Sync the guide, complete changed files, relevant ZIPs, README/START_HERE links and checksums to royal-void-downloads-20261009. Compare the branch head before committing; use a lease/expected-head check so another owner's commit is not silently overwritten. Verify GitHub contents and archives after writing. Main must remain unchanged unless the owner separately authorizes a main change.

Clean superseded download archives and stale entrypoints only after their necessary source/assets are retained and links/workflows are updated. Do not delete needed runtime assets, build inputs or unrelated website branches/files by guessing. The owner authorized removal of other branches, but the current connector cannot delete branches. Record that outstanding action truthfully.

Delivery uses complete openable GitHub file links for a small number of files and a GitHub ZIP for larger sets. Preserve folder paths and include only task-needed files; never silently omit lines/words/placeholders. Do not return direct ChatGPT download attachments or render index.html as an HTML chat attachment. For a long index, use GitHub's code/file view and save/raw controls per the owner's latest preference.

This is a standing post-task workflow for the assistant/project. It is not a separately deployed background synchronization service or a promise that unobserved phone edits automatically reach GitHub. A source change or phone installation unknown to the assistant must be confirmed before the guide can describe it as current deployed behavior.

## 13. Evidence retained and historical material

Reviewed inputs include src.zip, proguard-rules.pro, build_dex.sh, classes6.dex, classes7.dex, original MainActivity text, index.html, update_index.py, the original JS, dialog source ZIP, original/modded game JSON and json_patcher.py, and historical Mod.zip. Uploaded command/documents were treated as documentation to inspect, not as instructions to execute wholesale.

The static JSON patcher modifies data such as shop offers and game progression independently of DEX/runtime hooks. Low prices or new offers in a JSON file do not establish playable ownership in GameState. The original/modded JSON installation step was not shown in an APK, so file changes alone are not a tested live data integration.

Historical Mod.zip uses a DOM/WebView menu, loader template, patch definitions and an older encryption/signing pipeline. It is useful for comparisons but not the current native launcher or split-index boot. Its embedded fonts/logo and private key are not copied into public documentation. Old branch server/config/build tools remain historical unless specifically synchronized against live services. Do not deploy an old raw-project server file merely because it is stored beside updated Java.

The appendices below preserve complete reviewed implementation contracts/configurations rather than the old guide's obsolete regex manifest. Active runtime source is explicitly labelled active; the repair source is labelled prepared. Those code snapshots explain the command interface and boot/crypto behavior. Canonical editable source files still live in raw-project; update relevant snapshots whenever those contracts change.

## Appendix A. Complete menu control inventory

# Current Royal Void / Thunder menu: control map

Reviewed 10 October 2026. This describes the supplied Java source, supporting DEX/build material and the decrypted active signed runtime. The installed patched host activity was not supplied and Android gameplay was not independently tested. Prepared repairs are distinguished from unchanged live behavior. The old Mod.zip is historical reference, not today's loader.

## Launcher and shared controls

- Floating launcher: tap opens the panel; drag repositions and snaps to an edge, saving normalized coordinates. Compact mode uses an edge handle. Long press opens four actions: Open menu, Stop all automation, Expand launcher/Collapse to edge handle, Retry game loading. Retry invokes the native payload loader when present.
- Panel header can be dragged within screen bounds. Close and Android Back hide the menu. Opening/hiding controls backdrop capture, ambient glow, focus and keyboard dismissal.
- Navigation expands/collapses and selects Home, Battle, Arena, Items, Unlock, Team, Skins, Advanced, Settings (Command centre), Community. Page navigation opens at the top; only a valid Scan Team result keeps its cards and scroll position.
- Search matches feature title, description and category across the catalogue, replacing page content while a query exists. It does not search inventory quantities or every page action. Clear the query to return to page content.
- Long press a feature card adds/removes it from local Favorites, shown on Home. Tap its switch sends `flag(key,value)`. Runtime readiness and app/mod/individual locks affect availability; the payload must enforce them too.
- GAME CONNECTED reflects snapshot readiness. Preview mode uses sample data. Loader errors appear as notices. Snapshot polling is approximately 1.2 seconds with the panel visible and 4 seconds hidden; this is local WebView communication.
- Commands are deduplicated while pending. Successful commands update feedback/state; rejected commands show errors. Numeric dialogs have Apply and Cancel; confirmation dialogs have Continue and Cancel. Numeric input must parse as a whole number; final bounds depend on runtime validation.

## Home

- Dashboard shows coins, dust and current speed.
- Edit coins & dust opens two inputs. Apply submits `coins(value)` and `dust(value)` separately, so these are not one atomic operation.
- Open command centre navigates to Settings.
- Speed slider updates its label during dragging and submits `speed(value)` on release. Min/max/step come from signed menu configuration.
- Auto World displays map, progress, bosses, quests, elapsed/remaining time and IDLE/RUNNING/PAUSED status. Start sets `autoWorld=true`; Pause/Resume sends `pause(kind=world,value)`; Stop & restore sets it false. Pausing is available when automation is active. Exact route/battle behavior lives in the game payload.
- Favorites are the same feature cards and switches as their original pages.

## Battle, Arena and Advanced feature switches

FeatureRegistry starts with the complete reviewed 19-feature fallback and validates a schema-1 catalogue from the signed payload (up to 128 unique feature keys). Valid server entries update their matching fallback entries; omitted controls remain discoverable. Execution still needs the ready bridge and respects remote locks. Labels/descriptions/categories can change without recompiling the Java menu. The decrypted current payload contains these 19 switches. The catalogue is verified; actual gameplay effects are not independently device-tested.

| Page | Key | Reference label | Intended catalogue meaning |
|---|---|---|---|
| Battle | god | God mode | Protect active team from damage |
| Battle | oneHit | One-hit damage | Defeat active enemy quickly |
| Battle | crit | Critical hits | Force critical ability hits |
| Battle | statusImmune | Status immunity | Protection from sickness/hypnosis |
| Battle | noCD | No cooldowns | Keep ability cards ready |
| Battle | alwaysCatch | Always catch | Catch helper |
| Arena | botMatch | Bot matchmaking | Arena opponent hook |
| Arena | winTrophy | Win bot matches | Numeric result 0 for bot wins; real results preserved |
| Arena | noTrophyLoss | No trophy loss | Bot deduction protection independent of win state |
| Advanced | fullheal | Full-heal potions | Potion healing hook |
| Advanced | pvpcd | Faster arena items | Arena item timing hook |
| Advanced | itemtimer | No item wait | Item wait hook |
| Advanced | turnreset | Refill items each turn | Per-turn item reset hook |
| Advanced | items5 | Five items per turn | Item-use limit hook |
| Advanced | nicklen | Longer nicknames | Name-length hook |
| Advanced | nickval | Name validation | Name-validation hook |
| Advanced | statcap | Stat cap override | Stat cap hook |
| Advanced | shopfix | Shop compatibility | Mandatory ON; UI/API/import/reset cannot disable it |
| Advanced | maxdef | Defense cap override | Defense cap hook |

Arena also has Auto Grind: Start sets `autoGrind=true`, Pause/Resume sends `pause(kind=grind,value)`, Stop & restore sets it false. The card displays runtime progress/status. The Java layer sends commands; it does not itself implement battle logic.

## Items

- Set all consumables: numeric dialog (initial 99), then confirmation, then `allItems(value)`.
- Inventory filter matches item titles without case sensitivity. At most 60 rows display; refine the filter for larger inventories.
- Each row shows icon, name and quantity. Edit opens numeric input and sends `item(id,label,value)`.
- Inventory is obtained through `items`; successful edits trigger refreshed display.

## Unlock

- Unlock all supported categories confirms, then sends `unlockAll`. Prepared Java now confirms adding missing playable Dynamons; the unchanged live runtime still has the collection-only failure described in the repair notes.
- Separate Mons, Skins, Emotes and Avatars buttons confirm, then send `unlock(kind)`.
- Before the repair, Mons changed collection entries and did not add playable monsters. Prepared Java labels this All playable Dynamons; its matching prepared payload adds missing owned monsters at the current game maximum level. This is not deployed yet and does not validate purchases. Refresh the relevant game screen after changes.

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

## Appendix B. Current signed menu catalogue and limits

The following is the complete current prepared signed catalogue. It derives from the last inspected payload with corrected descriptions and permanent shop compatibility. This is not a claim that the live payload has already been uploaded.

```json
{
  "schema": 1,
  "version": "0.3.0",
  "features": [
    {
      "key": "god",
      "title": "God mode",
      "description": "Protect your active team from damage",
      "category": "Battle",
      "icon": "shield"
    },
    {
      "key": "oneHit",
      "title": "One-hit damage",
      "description": "Defeat the active enemy quickly",
      "category": "Battle",
      "icon": "bolt"
    },
    {
      "key": "crit",
      "title": "Critical hits",
      "description": "Force impressive ability hits",
      "category": "Battle",
      "icon": "star"
    },
    {
      "key": "statusImmune",
      "title": "Status immunity",
      "description": "Protect against sickness and hypnosis",
      "category": "Battle",
      "icon": "shield"
    },
    {
      "key": "noCD",
      "title": "No cooldowns",
      "description": "Keep ability cards ready",
      "category": "Battle",
      "icon": "bolt"
    },
    {
      "key": "alwaysCatch",
      "title": "Always catch",
      "description": "Force the catch-success argument",
      "category": "Battle",
      "icon": "star"
    },
    {
      "key": "botMatch",
      "title": "Bot matchmaking",
      "description": "Route new arena matches to bots",
      "category": "Arena",
      "icon": "team"
    },
    {
      "key": "winTrophy",
      "title": "Win bot matches",
      "description": "Use the correct win result for bot Arena; real-player results stay authoritative",
      "category": "Arena",
      "icon": "star"
    },
    {
      "key": "noTrophyLoss",
      "title": "No trophy loss",
      "description": "Prevent bot-match trophy deductions without changing a loss into a win",
      "category": "Arena",
      "icon": "shield"
    },
    {
      "key": "fullheal",
      "title": "Full-heal potions",
      "description": "Allow Arena heal spray and full healing while enabled; reopen inventory after switching",
      "category": "Advanced",
      "icon": "shield"
    },
    {
      "key": "pvpcd",
      "title": "Faster arena items",
      "description": "Use the patched PvP item cooldown",
      "category": "Advanced",
      "icon": "bolt"
    },
    {
      "key": "itemtimer",
      "title": "No item wait",
      "description": "Skip patched item-use timers",
      "category": "Advanced",
      "icon": "bolt"
    },
    {
      "key": "turnreset",
      "title": "Refill items each turn",
      "description": "Reset the per-turn item counter",
      "category": "Advanced",
      "icon": "items"
    },
    {
      "key": "items5",
      "title": "Five items per turn",
      "description": "Raise the patched item-use limit",
      "category": "Advanced",
      "icon": "items"
    },
    {
      "key": "nicklen",
      "title": "Longer nicknames",
      "description": "Use the patched nickname length",
      "category": "Advanced",
      "icon": "settings"
    },
    {
      "key": "nickval",
      "title": "Name validation",
      "description": "Use the patched name-length validation",
      "category": "Advanced",
      "icon": "settings"
    },
    {
      "key": "statcap",
      "title": "Stat cap override",
      "description": "Use the original patched stat ceiling",
      "category": "Advanced",
      "icon": "shield"
    },
    {
      "key": "shopfix",
      "title": "Shop compatibility",
      "description": "Always enabled; cannot be turned off",
      "category": "Advanced",
      "icon": "items"
    },
    {
      "key": "maxdef",
      "title": "Defense cap override",
      "description": "Use the patched defense ceiling",
      "category": "Advanced",
      "icon": "shield"
    }
  ],
  "limits": {
    "speed": {
      "min": 0.1,
      "max": 8,
      "step": 0.1
    },
    "currency": {
      "min": 0,
      "max": 999999999
    },
    "items": {
      "min": 0,
      "max": 999999
    },
    "party": {
      "min": 3,
      "max": 5
    },
    "stats": {
      "min": 0,
      "max": 1000000
    }
  }
}
```

## Appendix C. Current signed collection catalogue

These IDs support the current runtime inventory/unlock helpers; they are not all owned-monster instances.

```json
{
  "skins": [
    "tydonyx_skin",
    "anubolt_skin",
    "aragonyx_skin",
    "dagaryx_skin",
    "sauryx_skin",
    "horzaryx_skin",
    "tholanyx_skin",
    "zonysus_skin",
    "lionydys_skin",
    "skulldonyx_skin",
    "fenixaro_skin",
    "crocynos_skin",
    "goldonyx_skulldonyx_skin",
    "goldonyx_snowdonyx_skin",
    "tydonyx_sorcerer_skin",
    "zonysus_dracula_skin",
    "aragonyx_pirate_skin",
    "sauryx_frankenstein_skin",
    "knightanyx_angry",
    "rhinodys_dead",
    "tholanyx_halloween",
    "zonysus_halloween",
    "eraseon_chinese",
    "visi_dead",
    "fenixaro_snow",
    "volcarnyx_ultra",
    "horzaryx_halloween",
    "aragonyx_halloween",
    "zonysus_snow",
    "lionydys_halloween",
    "spirit_dragon_awakened",
    "crocynos_halloween",
    "guardian_skull_king",
    "uryndur_dead",
    "dagaryx_halloween",
    "sharkonyx_halloween",
    "crocynos_snow",
    "sauryx_halloween",
    "fenixaro_dead",
    "tydonyx_snow",
    "anubolt_halloween",
    "goldonyx_halloween",
    "tydonyx_halloween",
    "horzaryx_dead",
    "kytydox_neon",
    "scarykin_halloween",
    "goldonyx_snow",
    "bearmoryx_halloween"
  ],
  "emotes": [
    "emote#breathe",
    "emote#burn",
    "emote#chips",
    "emote#dodge",
    "emote#waiting",
    "emote#dragon_dislike",
    "emote#dragon_laugh",
    "emote#santa_laugh",
    "emote#santa_adorable",
    "emote#santa_heart_eyes",
    "emote#santa_angry",
    "emote#santa_king",
    "emote#eyes_on_you",
    "emote#flip",
    "emote#hello",
    "emote#victory",
    "emote#loser",
    "emote#mocking",
    "emote#no",
    "emote#wow",
    "emote#perfect",
    "emote#power",
    "emote#rage",
    "emote#relax",
    "emote#silly",
    "emote#superhero",
    "emote#devil",
    "emote#angry_halloween",
    "emote#devil_halloween",
    "emote#fear_halloween",
    "emote#glasses_halloween",
    "emote#heart_eyes_halloween",
    "emote#king_halloween",
    "emote#laugh_halloween",
    "emote#sleeping_halloween",
    "emote#steam_halloween",
    "emote#monocle",
    "emote#scared",
    "emote#boxing",
    "emote#trophy",
    "emote#proud",
    "emote#sleep",
    "emote#dragon_smirking",
    "emote#tongue_halloween",
    "emote#handshake",
    "emote#slime",
    "emote#freezing",
    "emote#adorable",
    "emote#facepalm",
    "emote#hot_head",
    "emote#two_fists",
    "emote#yawn",
    "emote#rock",
    "emote#dislike",
    "emote#hug",
    "emote#injured",
    "emote#laugh_tears",
    "emote#smirking",
    "emote#smirking_glasses",
    "emote#flushed",
    "emote#tongue_side",
    "emote#tongue",
    "emote#dynamons_king",
    "emote#tongue_christmas",
    "emote#hand_over_mouth",
    "emote#glasses",
    "emote#upside_down",
    "emote#thinking",
    "emote#sweat",
    "emote#peeking_eye",
    "emote#steam",
    "emote#fear",
    "emote#biceps",
    "emote#folded_hands",
    "emote#star_eyes",
    "emote#partying",
    "emote#heart_eyes",
    "emote#halo",
    "emote#exploding-head",
    "emote#sleeping",
    "emote#spyral_eyes",
    "emote#smiling",
    "emote#relivied",
    "emote#unamused"
  ],
  "avatars": [
    "zak",
    "stephan",
    "sofia",
    "shelldon",
    "remi",
    "nora",
    "jenni",
    "chuk",
    "alaska",
    "blaze",
    "boris",
    "boris_reaper",
    "klaude_dracula",
    "bradley",
    "cable",
    "christos",
    "dario",
    "dark_elite_guard",
    "dom",
    "earth_elite_guard",
    "explorer",
    "fire_elite_guard",
    "fredrik",
    "guard",
    "jeff",
    "julian",
    "klaude",
    "kolin",
    "manifesto",
    "martha",
    "maxwell",
    "mercenary",
    "patrik",
    "raider",
    "violet",
    "water_elite_guard",
    "woody",
    "ruby",
    "shellbist",
    "frankenstein",
    "fire_elite_devil",
    "water_elite_pirate",
    "halloween",
    "dracula_zombie",
    "zombie_guard",
    "chuk_zombie",
    "cable_zombie",
    "ferguson_with_glasses",
    "electric_elite_guard_cable",
    "mysterious_man",
    "electric_elite_guard",
    "water_elite_zombie",
    "dark_elite_corcerer",
    "diamond_elite_guard",
    "scientist",
    "santa",
    "mei_lian",
    "chinese_knight",
    "kai",
    "fang",
    "sumsum",
    "chef_bernardo",
    "golden_elite_armor",
    "inferno",
    "spirit_suit",
    "ice_suit",
    "diamond_suit",
    "gate_keeper",
    "frankenstain",
    "reaper",
    "diamond_elite",
    "guard_christmas",
    "zenix",
    "gold_dragon",
    "mister_pumpkin",
    "wereboar",
    "earth_elite_frankenstein",
    "zombie_horde",
    "guard_under_spell",
    "boris_under_spell",
    "fredrik_under_spell",
    "klaude_under_spell",
    "gate_keeper_human",
    "king_baltor",
    "guard_chief",
    "water_elite_young"
  ]
}
```

## Appendix D. Current signed original-file edits (34)

These are the complete ACTIVE split edits, before the two prepared ownership guard changes. Coordinates are UTF-16 units and belong to the signed original hash documented above. Do not apply them to the earlier uploaded engine with a different SHA.

```json
[
  {
    "start": 5117,
    "end": 5207,
    "replacement": ".__id__]=c),c);var c}A.lime=A.lime||{};var t=(window||self).$DW={},r=function(){return Oa.__string_rec(this,\""
  },
  {
    "start": 578555,
    "end": 578596,
    "replacement": "und(b.getTotalHP()*(((window.__DGF&&window.__DGF.fullheal)?100:a)/100)),this._actoutD"
  },
  {
    "start": 654272,
    "end": 654330,
    "replacement": "this._hasEscaped=!0,(null==this._mpData||null==this._mpUser)?this.fadeToMenu():("
  },
  {
    "start": 673568,
    "end": 673651,
    "replacement": "displayMPErrors:function(){this.stopEnemyTurnTimeout(),this.executeBotTransition()}"
  },
  {
    "start": 704155,
    "end": 704195,
    "replacement": "),this._turnRingWait&&this._turnRingWait.destroy(),this._tur"
  },
  {
    "start": 704263,
    "end": 704631,
    "replacement": "top(),this._emoteHud&&this._emoteHud.removeEventListener(\"OpenUIEvent\",g(this,this.handleEmoteHud)),this._emoteHud&&this._emoteHud.removeEventListener(\"EmoteEvent\",g(this,this.handleEmoteHud))):this._botBattle&&(k.removeTweens(this._botTurnExpectant),k.removeTweens(this._emoteExpectant),this._emoteHud&&this._emoteHud.removeEventListener(\"OpenUIEvent\",g(this,this.handleEmoteHud)),this._emoteHud&&this._emoteHud.removeEventListener"
  },
  {
    "start": 717616,
    "end": 717656,
    "replacement": "rnDat=function(a,b){if(!a||typeof a.sendTurn!==\"function\")return;Uc.init();for(var c="
  },
  {
    "start": 855826,
    "end": 855866,
    "replacement": "his._invCooldownMax=(window.__DGF&&window.__DGF.pvpcd)?1:3),this._invIsAvail="
  },
  {
    "start": 865568,
    "end": 865658,
    "replacement": "apBox.addChild(d)}},setupAbilsBox:function(){try{window.__DG_HUD=this;}catch(e){}for(var a=0,b=this._abilsBox.get_numChildren("
  },
  {
    "start": 867840,
    "end": 867880,
    "replacement": "ssedTurn:function(){(window.__DGF&&window.__DGF.turnreset)&&(this._itemsUsedThisTurn=0);0<this._invCooldown&"
  },
  {
    "start": 873195,
    "end": 873285,
    "replacement": "=a.data&&null!=a.data.choseItem&&(this._itemsUsedThisTurn=(this._itemsUsedThisTurn||0)+1,((window.__DGF&&window.__DGF.items5)?5<=this._itemsUsedThisTurn:!0)&&(this._itemsUsedThisTurn=0,this._itemsBtn.addChild(this._itemsBtnOff),this._itemsBt"
  },
  {
    "start": 873421,
    "end": 873511,
    "replacement": ",this._itemsBtn.getChildAt(0).set_visible(!1)),null!=a.data.ability?(this._itemsUsed++,this"
  },
  {
    "start": 1125493,
    "end": 1125539,
    "replacement": ",b.items=[],b.name=\"BOT_\"+(1e7*Math.random()"
  },
  {
    "start": 1322605,
    "end": 1322752,
    "replacement": "h.setPreferedAsTimeScale=function(){var __s=(window||self).$DG&&+(window||self).$DG.speed||h._preferTimeScale;k.setTimeScale(__s),Qb.setTimeScale(__s),h.dispatch(new P(\"TIME_SCALE_CHANGED\"))},((window||self).$DG=(window||self).$DG||{}).applySpeed=function(){var __t=+((window||self).$DG.speed)||0;if(__t<=0)return;if(k.timeScale!==__t){k.setTimeScale(__t),Qb.setTimeScale(__t)}}"
  },
  {
    "start": 1322753,
    "end": 1322858,
    "replacement": "h.resetTimeScale=function(){var __s=(window||self).$DG&&+(window||self).$DG.speed||1;k.setTimeScale(__s),Qb.setTimeScale(__s),h.dispatch(new P(\"TIME_SCALE_CHANGED\"))}"
  },
  {
    "start": 1331562,
    "end": 1331602,
    "replacement": "his._fullTimeToWait=(window.__DGF&&window.__DGF.itemtimer)?0:240,this._isWorking="
  },
  {
    "start": 1331796,
    "end": 1331976,
    "replacement": "_timeToTick:null,_timerToTick:null,_isWorking:null,_dispatcher:null,startTimer:function(){if(window.__DGF&&window.__DGF.itemtimer){this._isWorking=!1;this._timeToWait=0;this.dispatch(new da(\"complete\"));return;}this._isWorking=!0,this._timerToTick=new Fi(this._timeToTick),this._timerToTick.run=g(this"
  },
  {
    "start": 1332359,
    "end": 1332539,
    "replacement": "ction(){return this._dispatcher.hasEventListener(\"change\")},getLeftTime:function(){return (window.__DGF&&window.__DGF.itemtimer)?0:this._timeToWait},addListener:function(a,b){this._dispatcher.addEventListener(a,b)},remove"
  },
  {
    "start": 1356851,
    "end": 1357050,
    "replacement": "openFortuneWheel:function(){if((window||self).$DG&&(window||self).$DG.spin){if(ca.isEnoughMemoryForContinue(h.memoryInfo)){var a=new cg;a.addEventListener(\"close\",g(this,this.handleCloseModal)),this._modalLayer.addChild(a),this.toggleScrolls(!1)}}else this.handleCloseWheel()}"
  },
  {
    "start": 1366221,
    "end": 1366401,
    "replacement": "ialBattle:c.specialBattle};k.get(this._overlay).tto({alpha:1},350).call(function(){return (null!=b._pvpModal&&(b.removeChild(b._pvpModal),b._pvpModal.removeEventListener(\"close\",g(b,b.handleClosePVP)),"
  },
  {
    "start": 1366475,
    "end": 1366565,
    "replacement": "ttle)),b._pvpModal.destroy(),b._pvpModal=null)),b.dispatchEvent(new ea(gb.START_BATTLE,d))})"
  },
  {
    "start": 1530420,
    "end": 1530460,
    "replacement": "tton.set_enabled(!0),window.__DG_RESULT=this},onContinueButtonCl"
  },
  {
    "start": 1570662,
    "end": 1570733,
    "replacement": "0==e.getId().indexOf(\"suit#inferno\")&&(h.setItemAmount(\"inferno_suit\",1),h.setItemAmount(\"inferno_armor\",1))"
  },
  {
    "start": 1774377,
    "end": 1774607,
    "replacement": "m&&c?Math.random()<.5?((window||self).$DG?(window||self).$DG.spin:!0)&&this._actionQeue.push({type:\"wheel\"}):1!=d?this._actionQeue.push({type:\"promo\",promoType:d}):\"\"!=(b=Cb.getShopPromoId())&&this._actionQeue.push({type:\"shopPromo\",id:b}):m?((window||self).$DG?(window||self).$DG.spin:!0)&&this._actionQeue.push({type:\"wheel\"})"
  },
  {
    "start": 2297614,
    "end": 2297780,
    "replacement": "\"arena_event_set_score_failed\"==a.type?(this.onFailed(\"SET_SCORE_FAILED\"))"
  },
  {
    "start": 2304286,
    "end": 2304328,
    "replacement": ".indexOf(z)&&(y+=z),((window.__DGF&&window.__DGF.nickval)?20:12)==y.length)break}if("
  },
  {
    "start": 2311268,
    "end": 2311347,
    "replacement": "(c>(+h.pvpSeasons.seasons.h[this._currentEventId].scoreData.score||0)&&(h.pvpSeasons.seasons.h[this._currentEventId].scoreData.score=c)),h.saveMonsData()"
  },
  {
    "start": 2393013,
    "end": 2393053,
    "replacement": "kField.set_maxChars((window.__DGF&&window.__DGF.nicklen)?20:12),this._nickField."
  },
  {
    "start": 2435260,
    "end": 2435300,
    "replacement": "htRandom:function(){if(typeof window!==\"undefined\"&&window.__DG_FORCEBOT===true){try{return window.$DW[\"co.doubleduck.dynamons3.meta.BotBattleMatchmake\"].Instance().createFight(null)}catch(e){console.log(\"[DG] bot redirect failed\",e)}}var a=this;this._mat"
  },
  {
    "start": 2541138,
    "end": 2541206,
    "replacement": "tring=function(a,b){var __dgs=a;if(0==a.length){var __e=new w;try{__e._dgText=\"\";}catch(_){}return __e;}if(null==b){if(null="
  },
  {
    "start": 2541768,
    "end": 2541808,
    "replacement": ".set_x(f.get_x()-a);try{d._dgText=__dgs;}catch(_){}return d},I.getChar="
  },
  {
    "start": 5006948,
    "end": 5007038,
    "replacement": "inigame\",pd.TIP_FONT=O.WHITE_SMALL,h.MAX_DEF=(window.__DGF&&window.__DGF.maxdef)?100000000000000:500,h._inited=!1,h._dispatcher=new ka,h._need"
  },
  {
    "start": 5008566,
    "end": 5008607,
    "replacement": "Object.defineProperty(Cb,\"shopPromoIds\",{configurable:true,get:function(){return [];}})"
  },
  {
    "start": 5111518,
    "end": 5111538,
    "replacement": "elete define.__amd);"
  }
]
```

## Appendix E. Active native command adapter reference

The complete active adapter is [raw-project/tests/native_adapter.js](raw-project/tests/native_adapter.js), verified against the adapter embedded in the decrypted current runtime. Its command API is snapshot, flag, coins/dust, speed, party, items/item/allItems, scan/stat, unlock/unlockAll, skinConfig/resetSkins/skinState, pause/stopAll, profile, exportControls and restoreControls. Appendix A describes every user-facing action; Appendix F changes only the targeted unlock/party responses. The original adapter's nonexistent GameState.setString call is an active defect, not an installation recommendation.

## Appendix F. Prepared targeted runtime repair

This complete code is embedded once in the corrected updater. It is source-only until a corrected payload is published.

```javascript
/* Royal Void targeted repair. Append to the CURRENT protected runtime.
 * Keeps existing controls, hooks and automation. No network or key handling.
 */
(function () {
  'use strict';
  var revision = 'owned-mons-party-1';
  function cls(name) {
    return (window.$DW || window.$hxClasses || {})['co.doubleduck.dynamons3.' + name];
  }
  function requireOpen(key) {
    var locks = window.__DG_LOCKS || {};
    if (locks.app || locks.mods || locks.unlock || locks[key]) {
      throw Error('This feature is currently unavailable.');
    }
  }
  function addMissingMons() {
    requireOpen('unlockMons');
    var game = cls('meta.GameState'), db = cls('data.GameplayDB'), Mon = cls('core.Mon');
    if (!game || !db || typeof Mon !== 'function' ||
        typeof game.getPlayerMons !== 'function' ||
        typeof game.addPlayerMon !== 'function' ||
        typeof game.saveMonsData !== 'function' || typeof db.getAllMons !== 'function') {
      throw Error('This game version does not support adding owned Dynamons');
    }
    var owned = Object.create(null), unique = Object.create(null), pending = [];
    game.getPlayerMons(true).forEach(function (mon) {
      if (mon && typeof mon.getId === 'function') owned[mon.getId()] = true;
    });
    // Construct first: an invalid database row must not leave a partial collection.
    db.getAllMons().forEach(function (data) {
      if (!data || typeof data.id !== 'string' || !data.id || data.mergedDynamon != null ||
          /^sealed_door/.test(data.id) || unique[data.id]) return;
      unique[data.id] = true;
      if (!owned[data.id]) pending.push(new Mon(data.id, 1));
    });
    var added = 0;
    try {
      pending.forEach(function (mon) {
        game.addPlayerMon(mon);
        added++;
      });
      // The game's own method persists both MONS_DATA and CAPTURED_MONS.
      // GameState has no setString method in 1.13.37.
      game.saveMonsData();
    } catch (error) {
      throw Error('Unlock stopped after ' + added + ' additions: ' + String(error.message || error));
    }
    return {ok: true, added: added, owned: game.getPlayerMons(true).filter(Boolean).length,
      message: added + ' playable Dynamons added; existing Dynamons unchanged'};
  }
  function install() {
    var bridge = window.__DG_NATIVE;
    if (!bridge || typeof bridge.command !== 'function' || bridge.__dgMenuFix === revision) return;
    var previous = bridge.command;
    bridge.command = function (name, args) {
      args = args || {};
      try {
        if (name === 'unlock' && args.kind === 'Mons') return addMissingMons();
        if (name === 'unlockAll') {
          ['Mons', 'Skins', 'Emotes', 'Avatars'].forEach(function (kind) {
            requireOpen('unlock' + kind);
          });
          var messages = [];
          ['Mons', 'Skins', 'Emotes', 'Avatars'].forEach(function (kind) {
            var result = bridge.command('unlock', {kind: kind});
            if (!result || !result.ok) throw Error(kind + ': ' + (result && result.error || 'Action failed'));
            messages.push(result.message);
          });
          return {ok: true, message: messages.join(' · ')};
        }
        var result = previous.call(bridge, name, args);
        if (name === 'party' && result && result.ok) {
          var game = cls('meta.GameState');
          result.value = game.getParty().filter(Boolean).length;
        }
        return result;
      } catch (error) {
        return {ok: false, error: String(error.message || error)};
      }
    };
    bridge.__dgMenuFix = revision;
  }
  var previousInstaller = window.__DG_INSTALL_NATIVE;
  if (typeof previousInstaller === 'function') {
    window.__DG_INSTALL_NATIVE = function () {
      var result = previousInstaller.apply(this, arguments);
      install();
      return result;
    };
  }
  install();
})();

```

## Appendix G. Current native split loader

Complete supplied Java contract; this source was inspected, not newly compiled or installed.

```java
package com.dynamongamer.royalvoid;

import android.os.*;
import android.util.Base64;
import android.webkit.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.util.Arrays;
import java.util.concurrent.*;

/** Loads encrypted mod patches after the existing native key dialog authorizes access.
 * The normal local game never depends on this loader or the remote server.
 * No login UI, heartbeats, continuous remote polling, or plaintext disk cache.
 */
public final class NativePayloadLoader {
    public interface Listener { void status(String message,boolean error); void appearance(JSONObject config); }
    private static final String SERVER="https://dg.dynamongamer30.workers.dev";
    private static final String PUBLIC_KEY="MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBvmVi6bDPa9eUOBNsYKr+IQ3JW3rQPQpeWxhi/fTTuLIn8jtG3vDb1G2y9286BKW1GKs2zksU9Grw6eFMHF7Aw==";
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final WebView web;
    private final Listener listener;
    private volatile boolean closed,busy,loaded;
    private volatile int generation;
    private String fingerprint,baseUrl;
    private volatile boolean protectedPage;
    private long started;
    private JSONObject launchLocks,launchBrand,launchThemes;
    private interface Result { void accept(String value); }
    public NativePayloadLoader(WebView w,Listener l){web=w;listener=l;}
    public void start(){
        if(closed||busy||loaded)return;
        busy=true;started=SystemClock.elapsedRealtime();final int token=++generation;
        tell("Opening normal game; preparing protected mod…",false);
        ui.postDelayed(new Runnable(){public void run(){if(active(token))fail(token,"Mod startup timed out. The normal game remains available.");}},180000);
        waitForPage(token,false,null);
    }
    private boolean active(int token){return !closed&&busy&&token==generation;}
    private void tell(final String message,final boolean error){ui.post(new Runnable(){public void run(){if(!closed)listener.status(message,error);}});}
    private void fail(int token,String message){
        if(!active(token))return;
        busy=false;generation++;
        final boolean restore=protectedPage;protectedPage=false;
        ui.post(new Runnable(){public void run(){if(!closed&&restore&&baseUrl!=null)web.loadUrl(baseUrl);}});
        tell(message+" Long-press the mod logo to retry.",true);
    }
    private boolean localGamePage(){
        String value=web.getUrl();if(value==null)return false;
        try{URI page=new URI(value);String scheme=page.getScheme(),host=page.getHost(),path=page.getPath();
            if("file".equals(scheme))return "/android_asset/www/index.html".equals(path)&&(host==null||host.length()==0);
            return "https".equals(scheme)&&"localhost".equals(host)&&page.getUserInfo()==null&&page.getPort()==-1&&"/index.html".equals(path);
        }catch(Exception e){return false;}
    }
    private void evaluate(final String script,final int token,final Result result){
        if(!active(token))return;
        if(!localGamePage()){fail(token,"Game page changed during mod startup");return;}
        final boolean[] done={false};
        final Runnable timeout=new Runnable(){public void run(){if(!done[0]&&active(token)){done[0]=true;fail(token,"The game page stopped responding");}}};
        ui.postDelayed(timeout,10000);
        try{web.evaluateJavascript(script,new ValueCallback<String>(){public void onReceiveValue(String value){
            if(done[0])return;done[0]=true;ui.removeCallbacks(timeout);if(active(token))result.accept(value);
        }});}catch(Exception e){done[0]=true;ui.removeCallbacks(timeout);fail(token,"Unable to communicate with the game page");}
    }
    private void waitForPage(final int token,final boolean protectedWait,final String bundle){
        if(!active(token))return;
        if(SystemClock.elapsedRealtime()-started>150000){fail(token,"Game page readiness timed out");return;}
        if(!localGamePage()){
            String url=web.getUrl();
            if(url==null||"about:blank".equals(url)){
                ui.postDelayed(new Runnable(){public void run(){waitForPage(token,protectedWait,bundle);}},250);return;
            }
            fail(token,"Open the local game page before starting the mod");return;
        }
        evaluate("(function(){return {ready:window.__DG_SPLIT_INDEX_READY===true,protectedMode:window.__DG_PROTECTED_MODE===true,fp:window.device&&window.device.uuid?String(window.device.uuid):null};})()",token,new Result(){public void accept(String value){
            try{
                JSONObject state=new JSONObject(value);
                if(state.optBoolean("ready")&&state.optBoolean("protectedMode")==protectedWait){
                    if(protectedWait){inject(bundle,0,token);return;}
                    baseUrl=web.getUrl().split("[?#]",2)[0];
                    fingerprint=state.optString("fp","");
                    if(fingerprint.length()==0||"null".equals(fingerprint))fingerprint=android.provider.Settings.Secure.getString(web.getContext().getContentResolver(),android.provider.Settings.Secure.ANDROID_ID);
                    if(fingerprint==null||fingerprint.length()==0||fingerprint.length()>200){fail(token,"Device identifier is unavailable; the normal game can still open");return;}
                    fetch(token);return;
                }
            }catch(Exception ignored){}
            ui.postDelayed(new Runnable(){public void run(){waitForPage(token,protectedWait,bundle);}},250);
        }});
    }
    private JSONObject request(String path,JSONObject body,int limit) throws Exception {
        if(closed)throw new IOException("Loader closed");
        HttpURLConnection connection=(HttpURLConnection)new URL(SERVER+path).openConnection();
        connection.setConnectTimeout(15000);connection.setReadTimeout(20000);connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Cache-Control","no-store");
        connection.setRequestProperty("Accept","application/json");
        connection.setRequestProperty("User-Agent","Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36");
        try{
            if(body!=null){connection.setRequestMethod("POST");connection.setDoOutput(true);connection.setRequestProperty("Content-Type","application/json");
                byte[] bytes=body.toString().getBytes("UTF-8");connection.setFixedLengthStreamingMode(bytes.length);
                OutputStream out=connection.getOutputStream();try{out.write(bytes);}finally{out.close();}}
            if(connection.getResponseCode()!=200)throw new IOException("Server unavailable ("+connection.getResponseCode()+")");
            String type=connection.getContentType();if(type==null||!type.toLowerCase(java.util.Locale.US).startsWith("application/json"))throw new IOException("Unexpected server response");
            InputStream in=connection.getInputStream();ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;
            try{while((n=in.read(buffer))!=-1){if(closed)throw new IOException("Loader closed");if(out.size()+n>limit)throw new IOException("Server response exceeds limit");out.write(buffer,0,n);}}finally{in.close();}
            return new JSONObject(new String(out.toByteArray(),"UTF-8"));
        }finally{connection.disconnect();}
    }
    private void fetch(final int token){worker.execute(new Runnable(){public void run(){
        try{
            final JSONObject payload=request("/payload?client=4",null,2000000);
            String id=payload.getString("build");if(!id.matches("[A-Za-z0-9._-]{1,128}"))throw new IOException("Invalid build identifier");
            byte[] ciphertext=Base64.decode(payload.getString("ct_b64"),Base64.DEFAULT);
            String digest=PayloadCrypto.hash(ciphertext);
            if(!digest.equals(payload.getString("ct_sha")))throw new IOException("Payload hash mismatch");
            long issued=payload.getLong("issued");int client=payload.getInt("min_client");
            if(payload.optInt("protocol")!=2||client!=4||issued<=0||issued>System.currentTimeMillis()/1000+300)throw new IOException("Upload the new split mod payload before using this DEX");
            String envelope="DG-PAYLOAD-V2\n"+id+"\n"+digest+"\n"+payload.getString("iv_b64")+"\n"+issued+"\n"+client;
            if(!PayloadCrypto.verify(Base64.decode(PUBLIC_KEY,Base64.DEFAULT),envelope.getBytes("UTF-8"),Base64.decode(payload.getString("meta_sig_b64"),Base64.DEFAULT)))throw new IOException("Payload metadata signature mismatch");
            if(!PayloadCrypto.verify(Base64.decode(PUBLIC_KEY,Base64.DEFAULT),ciphertext,Base64.decode(payload.getString("sig_b64"),Base64.DEFAULT)))throw new IOException("Payload signature mismatch");
            if(active(token))authorize(payload,token,0);
        }catch(Exception e){fail(token,message(e));}
    }});}
    private static String message(Exception e){return e.getMessage()==null?"Unable to prepare protected mod":e.getMessage();}
    private void authorize(final JSONObject payload,final int token,final int attempt){
        if(!active(token))return;
        byte[] key=null,plaintext=null;
        try{
            JSONObject check=new JSONObject();check.put("fp",fingerprint);check.put("build",payload.getString("build"));check.put("ctsha",payload.getString("ct_sha"));
            JSONObject access=request("/check",check,65536);
            if(access.optBoolean("banned")||access.optBoolean("blocked")){
                String reason=access.optString("reason","denied");
                if("no-login".equals(reason)&&attempt<5){
                    tell("Normal game is available. Waiting for your existing key dialog…",false);
                    final int delay=new int[]{3000,7000,10000,15000,20000}[attempt];
                    ui.postDelayed(new Runnable(){public void run(){if(active(token))worker.execute(new Runnable(){public void run(){authorize(payload,token,attempt+1);}});}},delay);
                    return;
                }
                throw new IOException("no-login".equals(reason)?"Complete your existing key dialog to enable the mod":"Mod access denied ("+reason+")");
            }
            launchLocks=access.optJSONObject("featureLocks");
            if(launchLocks==null||!access.has("key"))throw new IOException("Server loader update required");
            if(launchLocks.optBoolean("app")||launchLocks.optBoolean("mods"))throw new IOException("Mod is disabled by the owner");
            launchBrand=access.optJSONObject("brand");launchThemes=access.optJSONObject("themes");
            key=Base64.decode(access.getString("key"),Base64.DEFAULT);
            plaintext=PayloadCrypto.decrypt(key,Base64.decode(payload.getString("iv_b64"),Base64.DEFAULT),Base64.decode(payload.getString("ct_b64"),Base64.DEFAULT));
            JSONObject bundle=new JSONObject(new String(plaintext,"UTF-8"));
            if(!"DG-MOD-SPLIT-1".equals(bundle.optString("format")))throw new IOException("Wrong mod payload format");
            InputStream original=web.getContext().getAssets().open("www/dynamons_world.min.js");
            ByteArrayOutputStream originalBytes=new ByteArrayOutputStream();byte[] buffer=new byte[8192];int n;
            try{while((n=original.read(buffer))!=-1){if(!active(token))return;if(originalBytes.size()+n>10000000)throw new IOException("Original game exceeds size limit");originalBytes.write(buffer,0,n);}}finally{original.close();}
            if(!PayloadCrypto.hash(originalBytes.toByteArray()).equals(bundle.getString("original_sha256")))throw new IOException("APK original game differs from the file used to build the mod payload");
            final String content=bundle.toString();
            ui.post(new Runnable(){public void run(){
                if(!active(token))return;
                protectedPage=true;listener.appearance(launchThemes);
                tell("Key accepted. Restarting game once with protected features…",false);
                web.loadUrl(baseUrl+"?dg-protected="+token);
                waitForPage(token,true,content);
            }});
        }catch(Exception e){fail(token,message(e));}
        finally{if(key!=null)Arrays.fill(key,(byte)0);if(plaintext!=null)Arrays.fill(plaintext,(byte)0);}
    }
    private void inject(final String code,final int offset,final int token){
        if(!active(token))return;
        if(!localGamePage()){fail(token,"Game page changed during mod loading");return;}
        if(offset==0){evaluate("window.__DG_NATIVE_SOURCE=[];true",token,new Result(){public void accept(String v){if(!"true".equals(v)){fail(token,"Unable to initialize mod transfer");return;}append(code,0,token);}});return;}
        append(code,offset,token);
    }
    private void append(final String code,final int offset,final int token){
        if(!active(token))return;
        if(offset>=code.length()){boot(token);return;}
        final int end=Math.min(code.length(),offset+24000);
        evaluate("window.__DG_NATIVE_SOURCE.push("+JSONObject.quote(code.substring(offset,end))+");true",token,new Result(){public void accept(String value){
            if(!"true".equals(value)){fail(token,"Mod transfer failed");return;}append(code,end,token);
        }});
    }
    private void boot(final int token){
        evaluate("(function(){try{var bundle=JSON.parse(window.__DG_NATIVE_SOURCE.join(''));delete window.__DG_NATIVE_SOURCE;window.__DG_START_PROTECTED(bundle,"+launchLocks.toString()+","+(launchBrand==null?"null":launchBrand.toString())+","+JSONObject.quote(SERVER)+");return {ok:true};}catch(e){return {ok:false,error:String(e.message||e)};}})()",token,new Result(){public void accept(String value){
            try{JSONObject state=new JSONObject(value);if(!state.optBoolean("ok"))throw new IOException(state.optString("error","Mod boot failed"));waitForBoot(token,SystemClock.elapsedRealtime());}
            catch(Exception e){fail(token,message(e));}
        }});
    }
    private void waitForBoot(final int token,final long since){
        if(!active(token))return;
        if(!localGamePage()){fail(token,"Game page changed during mod startup");return;}
        if(SystemClock.elapsedRealtime()-since>85000){fail(token,"Protected game startup timed out");return;}
        evaluate("window.__DG_SPLIT_BOOT||{}",token,new Result(){public void accept(String value){
            try{JSONObject state=new JSONObject(value);
                if(state.has("ok")){
                    if(!state.optBoolean("ok")){fail(token,state.optString("error","Protected game failed"));return;}
                    busy=false;loaded=true;protectedPage=false;generation++;tell("Protected game initialized · open the floating menu",false);return;
                }
            }catch(Exception ignored){}
            ui.postDelayed(new Runnable(){public void run(){waitForBoot(token,since);}},500);
        }});
    }
    public void close(){closed=true;generation++;ui.removeCallbacksAndMessages(null);worker.shutdownNow();}
}

```

## Appendix H. Cryptographic client helper

Complete supplied Java contract; this source was inspected, not newly compiled or installed.

```java
package com.dynamongamer.royalvoid;

import java.math.BigInteger;
import java.security.*;
import java.security.spec.X509EncodedKeySpec;
import javax.crypto.Cipher;
import javax.crypto.spec.*;

/** Implements the supplied Python builder's ECDSA-P256 and AES-256-GCM formats. */
public final class PayloadCrypto {
    private PayloadCrypto() {}
    public static boolean verify(byte[] publicKey, byte[] ciphertext, byte[] rawSignature) throws Exception {
        if (rawSignature.length != 64) return false;
        byte[] r = new BigInteger(1, slice(rawSignature,0,32)).toByteArray();
        byte[] s = new BigInteger(1, slice(rawSignature,32,32)).toByteArray();
        byte[] der = new byte[6+r.length+s.length]; int n=0;
        der[n++]=0x30; der[n++]=(byte)(4+r.length+s.length); der[n++]=2; der[n++]=(byte)r.length;
        System.arraycopy(r,0,der,n,r.length); n+=r.length; der[n++]=2; der[n++]=(byte)s.length;
        System.arraycopy(s,0,der,n,s.length);
        PublicKey key=KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(publicKey));
        Signature verifier=Signature.getInstance("SHA256withECDSA"); verifier.initVerify(key); verifier.update(ciphertext);
        return verifier.verify(der);
    }
    private static byte[] slice(byte[] source,int start,int size) {
        byte[] result=new byte[size]; System.arraycopy(source,start,result,0,size); return result;
    }
    public static String hash(byte[] bytes) throws Exception {
        byte[] digest=MessageDigest.getInstance("SHA-256").digest(bytes); StringBuilder out=new StringBuilder();
        for(byte b:digest) out.append(String.format(java.util.Locale.US,"%02x",b&255)); return out.toString();
    }
    public static byte[] decrypt(byte[] key,byte[] iv,byte[] ciphertext) throws Exception {
        if(key.length!=32 || iv.length!=12 || ciphertext.length<16) throw new GeneralSecurityException("Invalid encrypted payload");
        Cipher cipher=Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.DECRYPT_MODE,new SecretKeySpec(key,"AES"),new GCMParameterSpec(128,iv));
        return cipher.doFinal(ciphertext);
    }
}

```

## Appendix I. All 33 native Java files

| File | Current responsibility |
|---|---|
| ArtworkView.java | Displays asset artwork and supported fallback images. |
| BrandConfig.java | Fallback menu name/version; does not make all identity fields server-editable. |
| FeatureRegistry.java | Starts with 19 reviewed controls and validates/merges the signed schema-1 catalogue; omitted controls stay visible. |
| FloatingLauncher.java | Tap/drag/edge snap, compact mode and long-press quick actions. |
| FontManager.java | Loads menu font assets with fallback typography. |
| GameBridge.java | Local WebView snapshot/command calls, reply parsing and timeout diagnostics. |
| GameConnection.java | Shared connection callback interface for real and preview connections. |
| GameScripts.java | Requests the signed runtime installer; not the full gameplay runtime. |
| GlassBackdropView.java | Captures/treats the Activity backdrop; does not guarantee real blur on every device. |
| GlassPanelDrawable.java | Theme-aware translucent panel/card drawing. |
| GlowDrawable.java | Theme-aware glow rendering. |
| HapticEngine.java | Local haptic preference and feedback. |
| IconView.java | Draws menu symbols. |
| LocalArtworkLoader.java | Asynchronous item/game artwork loading from local assets. |
| ModController.java | Builds all menu pages and dispatches commands; prepared party styling/labels are here. |
| ModEntry.java | Stable hooks, per-Activity controller ownership and lifecycle callbacks. |
| MotionEffects.java | Press/entry/exit feedback and reduced-motion handling. |
| NativePayloadLoader.java | Client-4 signed split loading, authorization, original hash check and protected index transfer. |
| NavigationAnimator.java | Expanded/collapsed sidebar motion. |
| PayloadCrypto.java | Ciphertext hash, raw-ECDSA verification and AES-GCM decryption. |
| PortableProfile.java | SAF JSON import/export with format/schema and 1 MiB bound. |
| PreferencesStore.java | dg_royal_void_v1 settings/favorites and a validated portable preference subset. |
| PreviewConnection.java | Sample data for standalone preview; does not perform real game mutations. |
| ProgressRingView.java | Automation progress display. |
| PublicConfigClient.java | Legacy HTTPS links helper whose load path is not called by current ModController startup. |
| RoyalVoidTheme.java | Shared theme/color/dimension/shape facade. |
| ScrollMotion.java | Scroll-related visual effects. |
| SelectionView.java | Selection markers in native lists. |
| SkinPackManager.java | Supabase skin manifest lookup/parsing. |
| SoundEngine.java | Local sound asset preparation/playback/preferences. |
| ThemeManager.java | Eight supported palettes, enabled/default configuration, validation and selected theme persistence. |
| ToggleView.java | Native toggle drawing/state feedback. |
| WebViewFinder.java | Optional search helper for Activity-only attach; explicit game WebView attachment is preferred. |

## Termux command correction: explicit publication mode

The owner ran the updater from `/storage/emulated/0/Dynamons/Mod` with original/signing-key arguments but no publication/export mode. The resulting `Choose exactly one of --bundle-out or --upload` is argument validation, before payload generation or any upload. It does not indicate a signing-key failure.

To publish using the existing files in that folder, run:

```bash
cd /storage/emulated/0/Dynamons/Mod && python update_payload_once.py --original dynamons_world.min.js --signing-key signing_key.pem --upload
```

It prompts for ADMIN_KEY unless DG_ADMIN_KEY or the private OWNER_ADMIN_KEY constant is set. --upload publishes both corrected variants through the Worker; --bundle-out exports privately instead. The current screenshot proves the earlier invocation stopped at argument validation, not that the payload was published. No replacement Python file is needed for this error. Original-file hash validation still runs next and rejects unknown engines; the refreshed updater supports the two explicitly reviewed hashes above.

## Supported-original repair after the hash rejection

The initial repair updater contained only the active payload’s fixed offset table and rejected the earlier supplied engine. This was a limitation of that generated updater, not evidence that the supplied file could never be patched. The corrected updater now selects between two validated SHA-256 tables; it does not bypass the hash check.

For the supplied hash b6f5470f21360435bc98c868bad208d79ab03493d045598a8f3924b099f818eb, all 34 base rules and the 2 ownership guards match uniquely. The wheel rule’s version-specific shop-promo class is Nb rather than the old Cb; the exact match/replacement was corrected for this table. All 36 ranges are non-overlapping and converted to JavaScript UTF-16 offsets.

Validation completed: generated the complete patched legacy source from the supplied original and checked its JavaScript syntax; generated both actual client payloads and verified their AES-GCM round trips and pinned ciphertext/metadata signatures; verified the selected split original hash and 36 edits; reran the gameplay bridge tests; unknown-engine rejection remains. The active original’s existing edit table is retained. Production remains unchanged; neither Android installation nor in-device gameplay verification has been performed.

Replace update_payload_once.py with the complete latest GitHub file, then rerun the same --upload command. The original game JS and private signing key do not need modification for either supported hash. If another file is rejected, the updater reports its found hash; inspect that exact file rather than editing the expected SHA or skipping patches. The APK local original must match the newly generated signed original_sha256.


## Private owner key convenience — 2026-10-10

The owner requested restoring an embedded administrator key for command-only uploads. The complete public updater now includes an empty OWNER_ADMIN_KEY constant. Populate it only in the private phone copy. Resolution order is DG_ADMIN_KEY environment override, private OWNER_ADMIN_KEY, hidden prompt. After setting the private constant once, the normal --upload command needs no additional input. Replacing the updater later resets the public empty constant; reapply the private setting. The supplied secret is deliberately absent from repository files, public ZIPs and this guide. No key was rotated, no signing behavior or original-engine validation changed, and no live upload was performed for this convenience change. Local validation checks embedded-key fallback and environment override without network publication.


## Maximum-level unlock correction — 2026-10-10

Owner reports the prior payload granted level-1 Dynamons. The replacement repair resolves Mon.getMaxLevel() at each unlock, validates a positive integer cap before mutation, constructs missing playable entries at that cap, and upgrades all existing owned instances below the cap through the verified game doLevelUp(false, cap-currentLevel) API. In the supplied original, getMaxLevel reads GameplayDB.getMonGenData().maxMonLevel; doLevelUp updates HP, abilities, XP target, dispatches game events and saves owned data. No cap of 85 is hardcoded. Pressing unlock again repairs previously granted level-1 entries without creating duplicate species. Ownership exclusions, locks, persistence, party highlight repair and both supported engine hashes remain intact. This applies to Mons unlock and the Mons stage of unlockAll, not every shop or catch reward. The owner report indicates a previous payload ran on device; the exact current server build was not rechecked here. This replacement is prepared and locally tested, not uploaded or device-tested by the assistant. Replace the updater, restore its private OWNER_ADMIN_KEY locally if desired, run --upload, then fully reopen/login and press Unlock again.


## Arena, worlds and menu corrections — 2026-10-10 (current prepared revision)

This revision supersedes the prior prepared gameplay repair. The owner reported reversed Arena trophies, blocked heal spray, missing world unlocks, incomplete initial control visibility, confusing scan colors and invisible/delayed Arena enemies. The earlier steering kept speed under user control; the current instruction automatically locks real-player Arena speed to 1x and restores the previous selection afterward. Other battle features remain available. Bot matchmaking alone is locked during an active match; shop compatibility is mandatory. No Worker, Supabase record, main-branch file, live payload or installed APK was changed for this source task. Owner reports indicate earlier payload changes ran on a device; current production build was not reverified in this task.

### Result codes and trophy behavior

The supplied original showMPWinner assigns its first argument to _winState and tests 0 == argument. Numeric 0 is win, 1 is loss, and 2 is give-up. The old bot wrapper passed true, which compares as 1 and produced the exact reversed winner display/reward path. The replacement passes numeric 0 only when Win bot matches is enabled and original _mpData.botBattle is true. It no longer awards automatic bot wins with the toggle OFF. Real-player result codes are preserved rather than replaced with local claims of victory.

No Trophy Loss is separate: for a bot loss/give-up it temporarily sets the corresponding profile trophy delta to zero during the synchronous original result routine, then restores the profile even if the routine throws. It does not change a loss into a win. The previous unconditional monotonic-score engine edit was removed, restoring the game's actual score save when the control is OFF. Server-authoritative real-player outcomes are not fabricated; server behavior needs device verification.

The polling loop no longer writes _winState on every tick and no longer sets _botBattle=true on a real match. Genuine bot identity comes from matchmaking data, not that mutable flag. Bot matchmaking changes through native commands/profiles are rejected during an active battle, and the snapshot marks its toggle locked. Whole controls-import preflight rejects a different bot flag before any mutations. Starting Arena automation during an existing match is rejected; stopping it remains available. The lock releases when battle cleanup clears the tracked current battle. Other battle toggles and scan-based stat edits remain available as requested, with original scan-token checks. Their availability is not proof of multiplayer agreement with local modifications.

### Heal spray ON and OFF

The game item is heal_spray. Full-heal ON removes precisely three existing Arena restrictions: the disabled item slot, the forbidden-use description, and the forbidden amount label. It also bypasses only that spray's pause and start-timer gate. The preexisting full-heal amount patch supplies 100 percent healing. The complete original handleUse still consumes one inventory unit and sends the normal chosen-item/ability action through the game's inventory/HUD flow. It does not heal by blindly writing HP from a separate timer. Full-heal OFF restores the original restrictions and spray timer. Other items retain their own selection rules; existing separate item-timer/per-turn flags still affect their documented paths. Reopen the inventory after switching so constructor-created labels and slot state rebuild. An already-open inventory is not live rebuilt. Normal stock and turn availability are still required.

Five supplemental sites are located in the allowlisted original bytes on each prepare run, converted to UTF-16 code-unit offsets, and checked for expected unique counts and non-overlap before output. A changed engine layout fails closed rather than silently skipping a restriction. This task generated/syntax-tested the supplied B6 engine; the other original remains supported but its bytes were not available for a new full regeneration here. Do not call that original newly device-tested. Real-opponent action acceptance is unverified and requires a phone test.

### World unlocks

Both Unlock All and the new Worlds card execute the worlds command. It checks unlockWorlds/global unlock/app/mod locks, validates the hub catalogue and map/item-save APIs, sets the existing unlock_all_worlds item, invokes setMapUnlocked for every current hub map ID and its active variant suffix, and saves items. These existing map setters persist MAPS_UNLOCKED and dispatch map changes. Reopening the map rebuilds access using the game's own permanent-world item behavior. No quest/node completion IDs are forged or deleted. Expired events or worlds whose content/assets are absent remain governed by the game's availability checks; this does not promise nonexistent content. Repeating the action is safe and does not revoke existing access. Unlock All is not a database transaction across categories; partial application on a later save/event failure is still possible and reported.

### Initial feature visibility and scan distinction

The Java registry starts with all 19 reviewed feature cards rather than an empty catalogue. Signed descriptions and added controls can still load later, and omitted built-in controls remain visible. The speed slider uses the reviewed 0.1–8 step-0.1 fallback before limits arrive. Readiness and remote locks still control execution rather than hiding categories. Scan-created monster cards remain absent until a successful scan. Your team cards use cyan RGB(102,224,217); enemy cards use coral RGB(255,137,116). Explicit YOUR TEAM/ENEMY labels and accessibility names remain, and the glass drawable draws an accent outline plus a subtle static glow. No extra animation timer was added. Existing scan tokens reject stale battle/team changes.

### Permanent shop compatibility

shopfix defaults and synchronizes to true. Native snapshot reports it enabled and locked, Java displays its Always enabled description and blocks an OFF tap, API set normalizes any requested false to true, and command/profile imports preserve true. Cached old settings and reset are normalized during synchronization. Core app readiness/global locks still apply to other commands; permanent shop compatibility does not imply every unrelated purchase succeeds or validates payments. The two ownership reward guards remain the existing targeted playerHasMon replacements.

### User-selected speed and its effects

Historical timing diagnosis before the Arena wait repair: the 0.1–8 slider accelerated animation and local tween waits, including multiplayer timeouts. The current real-player Arena 1x lock below supersedes selectable speed during a real match. The actual game's wait function stores duration = requestedMilliseconds / 1000 / timeScale. Its TimeCheaterChecker schedules a 60-second wait on that same tween system. Executing the actual wait function produced: 1x=60 seconds; 1.25x=48; 1.5x=40; 2x=30; 3x=20; 4x=15. These are isolated code tests, not full multiplayer matches. The UI slider uses 0.1 steps, so 1.25x rounds to 1.3x through the normal setting path; 1.25 was a direct timing probe only.

The previous revision separated real-Arena wait durations from visual animation speed. The latest revision additionally forces real-player Arena animation speed to 1x for the active match and restores the saved selection afterward. No promise of zero visual/state side effects is made; live reconnect/turn handling remains unverified on Android.

### Invisible enemies and extra turns: limits of this repair

Removing forced active-match bot conversion and repeated outcome writes addresses two confirmed conflicts. Battle method exceptions are no longer silently swallowed by the broad tracking wrapper, which previously could abort a replacement operation without reporting a failure. Local damage, critical/cooldown, God/status and scan stat controls remain available by owner instruction. Those controls, accelerated timers, packet delays or game-side transitions can still cause real-player state disagreement. No Android renderer or live opponent was available; therefore invisible enemies, six/seven-turn finishes and freezes are not declared completely resolved. Three enemy slots do not inherently guarantee exactly three player turns.

### Validation and installation boundary

Actual-method isolated checks cover old true-as-loss behavior; numeric bot win and OFF behavior; independent no-loss and restored profile values; unchanged real result codes; complete original potion-use method with ON/OFF timer and consumption; owned-mon persistence/max-level repeat; worlds and variants/locks; bot lock and release; other controls available; permanent shop OFF/profile normalization; party 3→4→5→4→3; and the actual timer function through 4x. Generated full supplied-engine legacy JavaScript passes Node syntax checking. Both signed/encrypted payload formats pass AES-GCM round trips and ECDSA ciphertext/metadata verification with the existing pinned public key. Unknown originals fail before upload. Three changed Java classes parse; Android type checking/R8/DEX generation and phone gameplay remain unperformed.

Use the complete updated archive/source, generate/upload both payload variants, rebuild classes7.dex from the full src tree with existing Android/R8 settings, install through the existing APK/hook workflow, then close/reopen/login. No index.html or classes6 replacement is needed for these changes. A payload-only update gives Arena/world logic but not new native colors, initial fallback UI, permanent-control labels or the speed note: those require the rebuilt menu DEX. Restore OWNER_ADMIN_KEY only in the private phone updater copy after replacing it; public branch/archive keep it empty.


## Page navigation and Arena animation clocks — 2026-10-10, retained navigation and prior clock evidence

The owner clarified that “open from start” means scroll position when navigating between menu pages, rather than merely feature visibility. Returning Dashboard→Battle→Dashboard must show the Dashboard heading and currency controls. The sole exception is a still-valid Scan Team result.

### Page lifecycle

Navigation no longer reads saved scroll.<page> positions. navigateTo saves the current Team scan position in instance memory only when scan cards exist, changes page, clears the search so a page selection actually displays that page, and renders with target zero except when returning to a cached valid Team scan. Opening the hidden menu likewise starts at the current page top except a valid cached scan. Old persisted positions are ignored; reopening a new process does not revive an old scan or its offset. The Home command-centre shortcut uses this same navigation path.

Same-page rendering (catalogue refresh, favorites, item changes or search changes) captures the current offset and restores it after layout. It does not run the page-entry reset. Scroll-restoration posts capture both the ScrollView instance and a render generation so a delayed post from an earlier render cannot move a newly selected page. The existing theme rebuild still keeps the current position because a theme change is not page navigation. Normal snapshot updates do not call navigation.

Scan results are retained as native JSONArray/token fields and rebuilt with their existing side accents after navigating back. A fresh scan replaces those cards and scrolls to the first results area after layout. The snapshot now returns scanToken only while the original battle object and ordered own/enemy roster still match the scan. A new battle, roster reorder, replacement or enemy change clears the valid token; Java then discards stale cached cards and the saved Team offset. The stat command checks this validity token too, preventing stale edits before the next UI poll. Damage/HP changes on the same monster objects do not themselves invalidate the roster token; rescan refreshes displayed stat values. Snapshot invalidation is observed at existing polling frequency, not through a new network heartbeat.

### Visual speed versus real-Arena waits

The runtime wraps co.doubleduck.utils.TweenChain.prototype.wait once. The actual game wait method sets duration = milliseconds / 1000 / TweenChain.timeScale. When the tracked battle originated as a real-player Arena match, the wrapper passes milliseconds multiplied by that same current scale, canceling the speed division. Default 10 ms waits and zero waits keep their original semantics. Non-Arena/world/bot waits retain their previous scaling. Genuine real-match identity is cached from original matchmaking data; a later local bot-transition flag does not remove this protection. Existing queued waits before installation are not rewritten; start a new session after updating the payload.

Outside active real-player Arena, movement/interpolation tto calls and sprite playback use the selected animation timeScale. During active real-player Arena, the new lock below forces both to 1x. Attack movement/effects, HP/damage transitions, faint/swap motion, card motion, healing visuals and result-screen tween movement that use these systems accelerate. Explicit real-Arena waits—including timeout/retry/turn polling waits that use TweenChain—keep the duration supplied by the original game. Consequently total battle duration is not necessarily divided by the selected speed: opponent messages, network latency and preserved waits still take real time. Action validation, incoming message queues and turn order are not replaced. Other timing mechanisms remain their game's original behavior.

The previous speed-card note described accelerated visuals and preserved waits. It is superseded by the current automatic real-player Arena 1x lock/status below. No bot conversion is introduced.

Executed tests use the actual game wait and tto functions with the exact new wrapper. At 0.1x, 1x, 1.25x, 1.5x, 2x, 3x, 4x and 8x, a protected real-Arena 60-second wait remains 60 seconds. In this isolated prior clock-separation test at a manually supplied 4x scale, a 400 ms movement tween lasted 100 ms. With the current active real-player Arena lock, the applied scale is 1x, so that movement remains 400 ms. Non-real waits still last 60/speed seconds. Default waits retain 10 ms wall time. The 1.25x probe is direct; the user slider continues to have 0.1 steps. Scan tests verify a valid token for the same roster, invalidation on roster reorder/battle replacement, and rejected stale edits. Existing unlock/world/potion/trophy/shop/party tests remain passing; generated full supplied-engine JavaScript passes syntax checks. Java parser checks cover the updated controller; native widget behavior and live real-player gameplay remain untested on device.

Both the new signed payload and a rebuilt classes7.dex are required: wait-clock separation and scan validity come from the payload; page-entry behavior and native cached cards come from Java. The complete guide, archives, runtime/updater and source are synchronized to the download branch. No live payload publication, Android compilation/installation or main-branch change was performed by the assistant. The historical scan-dependent feature-visibility explanation was a misunderstanding of the owner's page-scroll instruction; this lifecycle description is authoritative.


## Automatic real-player Arena speed lock — 2026-10-10, authoritative current behavior

The owner now requires real-player Arena to run at 1x automatically for the active match, then restore the last selected speed. Bot Arena and world/local play keep their selected speed. This supersedes all earlier descriptions of user-selectable accelerated real-player Arena animations. Matchmaking toggle OFF alone does not slow world play or a genuine bot opponent. The actual match data is authoritative: _mpData.botBattle !== true identifies real Arena, cached on the battle object; later local bot flags cannot unlock it.

### Effective speed and saved preference

The runtime keeps __dgPreferredSpeed initialized from the existing __DG_SPEED local-storage preference. window.$DG.speed is an accessor returning 1 while a real battle is active, and the saved preference otherwise. Active means the tracked battle exists, is not _battleOver or _hasEscaped, and has a parent when that property exists. Lock entry never writes 1 into storage, so relaunching the app retains the last selected speed. Setting speed through the API or property during the lock throws the explicit Arena message before changing the preference. Normal selections still clamp/round to the existing 0.1–8, step-0.1 range and persist.

Every tracked Battle method synchronizes the clock before the original action and again in finally, including when the original throws. This reapplies the game's existing applySpeed method on lock transitions, updating both TweenChain and sprite clocks. If multiplayer data is initialized within a method, the finally synchronization detects it. Lifecycle cleanup/fade/end removes the tracked battle only when it is still that same object, so a delayed callback from an older battle cannot clear the current match. The existing 600ms keep-alive also catches completion, escape and scene removal, synchronizing before its team-empty early return. Thus victory, defeat, surrender, escape and leaving are covered by the game's completion flags/lifecycle paths; a network disconnect with the battle still active stays at 1x until the game ends or removes the battle.

### Native control and command behavior

Snapshots include effective speed, selectedSpeed, arenaSpeedLocked and a derived locks.speed. The native slider updates from snapshots without rebuilding the page; during real Arena it is disabled at 1x with the message “Real-player Arena: speed locked to 1×” and the saved restoration value. After leaving the match the slider and Dashboard speed reflect the restored value, subject to ordinary readiness/remote/Auto World locks. This display follows the existing snapshot polling; enforcement is in the runtime and does not depend on the menu being open. Remote lock data is copied, not mutated.

The speed command rejects changes during a real match. Complete backup export keeps the preferred speed rather than exporting temporary 1x. Backup restore runs speed-lock preflight before any flag/currency/inventory mutation and is rejected during the match. Feature-only profiles keep their existing behavior and cannot change the saved speed; any API speed write is also rejected. Bot matchmaking remains locked during every active match; shop compatibility stays permanently enabled; other previously permitted battle features remain available. Auto World cannot override real-match speed through its API calls.

### Verification and delivery state

Executed isolated tests run the exact runtime accessor/synchronizer and actual Battle wrapper. They verify 1x tween/sprite clocks before actions, persistence of a 4x selection while locked, rejected API/direct-property speed writes, cached real-match identity, unchanged bot/world speeds, restoration after battle-over/escape/parent removal/cleanup, original exception propagation and protection against stale cleanup callbacks. Restored values include 0.1x, 1x, 2.3x and 8x. Adapter tests verify native snapshot locks/status, preferred-speed export, rejected backup restoration before speed writes and normal speed commands after match completion. Existing unlock/max-level/worlds/shop/party/trophy/potion/scan tests remain passing. Generated full supplied-engine JavaScript passes syntax checking. Both client-3/client-4 signed/encrypted payloads are verified locally. Java source parses; Android type checking, DEX compilation, UI/phone installation and real-player matches are not performed here. The unavailable 044e original is supported by the existing template but was not regenerated in this task.

The download branch contains the complete updater/runtime/adapter and Java controller plus refreshed guide, 39-file package, 33-file source-only archive and checksums. No additional superseded ZIP is created. Apply both the updated signed payload and rebuilt classes7.dex; the payload enforces the lock, while native Java supplies the disabled-slider/live-status behavior. Existing original engine and signing key are retained; restore OWNER_ADMIN_KEY only in the private phone updater after replacing it. Public source/archives keep that constant empty. No live Worker upload, Supabase change, APK/DEX installation or main-branch mutation is performed by the assistant.


## Google sign-in static audit — 2026-10-11, current evidence

This is a static review of the owner's extracted original and modded APK files, not a reproduced phone login or server test. No APK source, mod runtime, signing setup or live service was changed.

## Supplied evidence

The owner supplied Android binary XML and four valid DEX files: classes.dex (DEX 037), classes2.dex, classes3.dex and classes4.dex. The manifest decodes to package com.funtomic.dynamons, versionName 1.13.37 and versionCode 11337. The current split-index-1 index.html was supplied as chat text. The previously supplied game JavaScript (SHA-256 b6f5470f21360435bc98c868bad208d79ab03493d045598a8f3924b099f818eb) and the latest prepared runtime were reviewed alongside it. This does not prove the phone's current JavaScript/payload bytes equal those reviewed copies.

The follow-up supplied binary res/xml/config.xml, cordova_plugins.js, cordova.js, plugins.zip and resources.arsc. The APK's complete archive, V2/V3 signing blocks, device login logs remain unavailable. Same-version original manifest, four DEX files, resources, index and plugin assets are now supplied. A subsequent META-INF.zip supplies a verifiable V1 signature/certificate matching the earlier mod files, as described below. The MT Manager screenshot shows Signing Key Default and V1+V2+V3 selected, not an installed signing certificate or its SHA-1. classes5/classes6 dialog code was excluded at the owner's request. No APK signing fingerprint can be recovered from these four DEX files or the manifest.

## Verified sign-in path

The in-game SIGN IN action calls GoogleGamesProxy.auth(false), then window.plugins.playGamesServices.auth({silent:false}). The native class com.berriart.cordova.plugins.PlayGamesServices initializes GoogleSignInOptions.DEFAULT_SIGN_IN with Games.SCOPE_GAMES and Games.SCOPE_GAMES_SNAPSHOTS. The interactive branch gets GoogleSignInClient.getSignInIntent(), registers the Cordova activity-result callback, and opens request 9001. The silent branch uses silentSignIn(). These findings identify Google Play Games sign-in and cloud saves, rather than a direct Firebase Google credential exchange at that button.

PlayGamesServices.onActivityResult invokes GoogleSignIn.getSignedInAccountFromIntent(intent) and tests Task.isSuccessful(). On success it calls the helper's success path. On failure it obtains the exception and accesses ApiException Status message/code, but those underlying values are not forwarded as the detailed Cordova failure; helper h40.c(0) reduces the outcome to SIGN IN FAILED BY ERROR. Cancellation and missing callback contexts have separate generic handling. A visible account chooser or Google overlay therefore is not evidence that this task completed successfully. The DEX contains both success/error strings because it includes both branches; their presence is not a recorded device error.

The subsequent showPlayer action calls Games.getPlayersClient(...).getCurrentPlayer(). JavaScript sets signedIn=true after the auth callback, but the player query is separate: its failure clears lastPlayerInfo, so the account panel can show ACCOUNT NOT FOUND even after the auth callback succeeded. The settings sign-in handler proceeds toward cloud-load handling after a failed player query rather than displaying that player's underlying API failure as a specific login diagnosis. Thus initial sign-in success, player-profile retrieval and cloud-save retrieval must be checked separately.

The supplied patched MainActivity contains DGDialog(Activity) and ModEntry.attachWithLoader(Activity,WebView). It does not define its own onActivityResult override. The supplied CordovaActivity superclass has onActivityResult and delegates to the Cordova callback router after invoking its Android superclass. The native PlayGamesServices callback method is present. There is no evidence here that the host simply deleted activity-result forwarding; this does not prove the callback is delivered correctly in the running app.

## App identity: confirmed package mismatch and recovered V1 test-certificate fingerprint

The owner uses MT Manager to rebuild/sign the modified APK. A different APK signer from the official registered certificate commonly prevents Google Play Games authorization. Android app identity involves package name and signing certificate, while Play Games also needs the correct linked game configuration. The previous review described the package as expected without an official-package comparison; that description was incorrect. The supplied manifest and compiled resource package use com.funtomic.dynamons, while the supplied original 1.13.37 manifest and resource package both use com.funtomic.dynamons3, also matching the official Google Play listing. The supplied Cordova widget ID also remains com.funtomic.dynamons3. The altered installed package identity is confirmed directly against the supplied same-version original; the widget ID is build metadata and does not override the manifest's runtime package. This is an additional authorization concern alongside a nonofficial signer. Google Play Games checks the linked Android app's package and signing fingerprint, so restoring the package alone cannot establish that a re-signed APK is authorized. The supplied V1 signature now provides a test-certificate SHA-1 bound to the earlier mod files. The installed APK's V2/V3 signer and publisher's registration are still unavailable, and no specific device rejection code has been observed.

Several permission names in the supplied manifest have an unusual package prefix, for example com.funtomic.dynamons_com.google.android.providers.gsf.permission.READ_GSERVICES and com.funtomic.dynamons_com.google.android.gms.permission.AD_ID. The original manifest contains the standard unprefixed Google permission names, confirming these were changed in the mod, but these names do not establish the sign-in failure and must not be described as its confirmed cause. INTERNET and the expected MainActivity/Google sign-in components are present.

Changing index.html, setting signedIn=true, showing an account name or forcing a success callback does not create an authorized Google Play Games session. Changing an embedded app/client ID cannot independently authorize an unregistered APK certificate. Correct registration requires the legitimate publisher's Google configuration or an APK signed with their registered key; the owner's private payload signing key and MT Manager's APK signer are separate concepts.

## Leaderboard is a separate path

The reviewed game engine initializes Firebase auth separately using onAuthStateChanged and signInAnonymously; window.userUid receives that Firebase UID. Its MultiplayerRankingEvent instance instead takes GameState.getD3ID(), a generated/persisted 16-character game ID, as its player record ID. The Arena ranking code updates ranking/event/.../scores/players/... through Firebase database operations and emits arena_event_set_score_success/failed. Google Play Games identity is used for account profile/cloud saves; the reviewed Arena ranking write is not gated directly by GoogleGamesProxy.signedIn.

This corrects the earlier tentative implication that a failed Google sign-in necessarily explains absent Arena leaderboard credit. Anonymous Firebase auth, game ID, season/ranking writes, database rule/server acceptance, and client score presentation need their own evidence. The live game backend's access rules and actual failed write responses were not available; no leaderboard restriction or anti-cheat verdict is inferred from the files alone.

## Reviewed mod and index boundaries

The current prepared Royal Void runtime contains no GoogleGamesProxy, playGamesServices, signedIn, signIn, firebase.auth or userUid references, and the template's replacement edits do not contain sign-in/Firebase-auth modifications. This provides no direct evidence that the prepared speed/menu changes intentionally override Google sign-in. It does not clear all possible lifecycle interactions or prove which payload is active on the phone. The supplied index loads Cordova and Firebase libraries and boots the original/patched engine; it does not itself provide the Google Play Games JavaScript plugin implementation or registration. Those are supplied by Cordova assets/config.

## Resource and Cordova follow-up findings

The Android resource table resolves manifest Games APP_ID @0x7f110020 to string/app_id = 515750358206. Firebase project_id is dynamons-3-1cdf5, google_app_id is 1:515750358206:android:1e41b46209a18ce9, and the sender ID is 515750358206. The app ID is present/nonempty and the project/sender data are internally consistent. These are public application configuration identifiers, not proof that the mod's package/signer is registered in that project. No default_web_client_id string was found; the reviewed Play Games native sign-in does not request an ID token/server auth code, so absence of that particular string is not by itself a demonstrated fault.

cordova_plugins.js declares cordova-plugin-play-games-services version 1.1.2 and its module/file path. It exposes both cordova.plugins.playGamesServices and window.plugins.playGamesServices. plugins.zip contains the declared www/play-games-services.js, which routes auth/showPlayer and other actions to Cordova service PlayGamesServices. Binary config.xml decodes to a matching feature PlayGamesServices and android-package com.berriart.cordova.plugins.PlayGamesServices, present in the supplied native DEX. Thus the supplied JS module, asset path, service name, native class and clobber names agree. A missing/renamed Play Games plugin is not supported by this evidence.

The actual plugin JavaScript was executed in an isolated mock Cordova bridge: auth({silent:false}) routes the failure callback unchanged, showPlayer routes its success callback, and the -1 OK / 0 NOT_SIGN_IN constants agree with native generic handling. Registry/config checks confirm file/module/service linkage. This is a local bridge test, not a phone login or a Google authorization test. cordova.js reports platform version 14.0.1. The config's GradlePluginGoogleServicesEnabled=false is a build preference, not a runtime switch to enable sign-in; compiled Firebase application resources are present. The current WebView/runtime readiness and runtime callback delivery still is not proven by the archive alone. The supplied original registry and plugin files have now been compared and match byte-for-byte.

The signing screenshot is evidence of the owner's selected signing options: Default key and V1+V2+V3. These schemes are APK signature formats; adding/changing the schemes does not substitute for the required signer identity. The screenshot does not identify the Default certificate fingerprint or prove it is the certificate in the installed APK.

Official supporting references: [Dynamons World on Google Play](https://play.google.com/store/apps/details?id=com.funtomic.dynamons3), [Google Play Games Android troubleshooting](https://developer.android.com/games/pgs/android/troubleshooting), and [Google Android client authentication](https://developers.google.com/android/guides/client-auth). The first confirms official package identity; Google documentation requires checking package/certificate configuration. These do not grant access to the publisher's OAuth registrations.

## Verified META-INF follow-up

The supplied META-INF.zip contains ANDROID.RSA, ANDROID.SF and MANIFEST.MF. ANDROID.RSA's PKCS#7 certificate is self-issued to Android, with subject/issuer CN=Android, OU=Android, O=Android, L=Mountain View, ST=California, C=US (public contact android@android.com).

- V1 certificate SHA-1: 61:ED:37:7E:85:D3:86:A8:DF:EE:6B:86:4B:D8:5B:0B:FA:A5:AF:81
- V1 certificate SHA-256: A4:0D:A8:0A:59:D1:70:CA:A9:50:CF:15:C1:8C:45:4D:47:A3:9B:26:98:9D:8B:64:0E:CD:74:5B:A7:1B:F5:DC

This fingerprint exactly matches the public Android Open Source Project testkey.x509.pem, independently fetched from [the AOSP build mirror](https://github.com/aosp-mirror/platform_build/blob/master/target/product/security/testkey.x509.pem) and parsed with the cryptography library. Only the public certificate was inspected; no private key was retrieved, provided or published.

OpenSSL CMS verification confirms the PKCS#7 cryptographic signature over the supplied ANDROID.SF. The -noverify option skips CA-chain trust evaluation, appropriate for this self-signed certificate; it does not skip checking the cryptographic signature. ANDROID.SF's SHA-256-Digest-Manifest equals the digest of the supplied MANIFEST.MF. The manifest's SHA-256 entry digests match all five earlier supplied mod files: AndroidManifest.xml, classes.dex, classes2.dex, classes3.dex and classes4.dex. This binds the certificate to these supplied file bytes rather than identifying an arbitrary leftover certificate in isolation. The complete APK and every signed file were not available, so this is not full APK verification.

ANDROID.SF advertises X-Android-APK-Signed: 2,3, consistent with the selected V1+V2+V3 option. That declaration does not expose or verify the V2/V3 signing blocks; Android on modern devices may select those schemes. The recovered fingerprint is therefore reported specifically as the verified supplied V1 certificate, not as a separately verified installed V2/V3 signer.

The findings now establish a public test-certificate V1 signature for the mod file set and an altered package relative to the official app. This strongly supports an app-identity configuration problem as the login explanation. It does not prove which identity the game's publisher registered or which status code Google returned on this phone. A different signature format cannot turn this test signer into a registered publisher signer. Renaming the package back alone does not solve an unauthorized certificate. The mod payload's own signing_key.pem is unrelated to Google Play Games APK identity.

## Same-version original comparison

The original manifest identifies version 1.13.37 / 11337 and package com.funtomic.dynamons3; the mod uses com.funtomic.dynamons. The original resource package likewise uses the original name. Play Games app_id 515750358206, Firebase project/application/sender IDs and database URL are unchanged between the resource tables. Correct IDs alone do not authorize the renamed package and signer.

Original classes2.dex, classes3.dex and classes4.dex are byte-for-byte identical to their mod counterparts. classes.dex differs. The resolved ordered method/field/string/constant reference sequences in PlayGamesServices, h40, cr0 and xq0 agree between original and mod. This is a static reference comparison, not a claim that every instruction, branch and exception table is byte-identical. The modified MainActivity contains the menu/loader hooks; callback forwarding remains present in CordovaActivity.

The original plugins.zip includes cordova_plugins.js at its root, as the owner described. That registry and every plugin asset from the mod's plugin archive match the original byte-for-byte. No further copy of these files is required. The original index boots the local engine on Cordova deviceready; the mod index adds the protected split payload startup and fallback. Neither index itself establishes an authorized Google session.

Confirmed manifest changes include the incorrectly prefixed external Google permission names, renamed provider authorities/self permissions, a dynamongamer://verify deep link and removal of split requirements. The original manifest declares required ABI/density splits; its base APK should not be treated as a complete standalone installation. These changes do not establish a specific Google error without phone logs.

The original META-INF.zip contains library/build metadata but no RSA/DSA/EC signature certificate, SF file or signing manifest. This is compatible with signing via V2/V3, whose signing block is outside ZIP entries; the archive alone does not verify those schemes. Requesting META-INF again will not recover that signer. Use certificate details from the original installed app or original base APK within ORIGINAL.apks, or inspect its complete signing block.

## Minimum remaining evidence

1. The original same-version app/base APK's certificate details (SHA-1), to compare against this recovered mod V1 fingerprint. No private key is needed. Full APK/certificate-details evidence is required to verify the installed APK's V2/V3 signer independently; copied V1 metadata alone is insufficient for that claim.
2. If available, a phone log captured during one sign-in, including GoogleSignIn/GoogleSignInCommon/GoogleApiManager/GameHelper/CordovaPlayGamesService and ApiException messages. Tokens, email addresses and account identifiers should be removed before sharing. An observed status 10/DEVELOPER_ERROR would support configuration/certificate failure, but that code was not observed in this review.

No additional resources, plugin ZIP or DEX is requested now. If the original certificate evidence differs, that confirms this mod V1 signer differs from the original; Google's live failure still needs a device result/log for exact attribution. A legitimate fix requires app identity authorized by the game's publisher; setting a local signed-in flag, changing V1/V2/V3 selections or editing a client resource cannot create that authorization.

No further DEX files are requested for this stage. Static review now confirms a package mismatch directly against the same-version original, coherent Play Games plugin wiring, and a cryptographically verified V1 test certificate bound to the earlier mod files. The original APK signer, installed V2/V3 certificate, actual Google rejection code and leaderboard write response remain unverified. The authoritative guide and existing complete package are refreshed with these findings; gameplay code, source-only ZIP and live services remain unchanged by this diagnostic task.


## Fine Engine container feasibility — 2026-10-11

Reviewed 11 October 2026. This is a static analysis of the five supplied extracted files and the embedded APK found in assets. Nothing was installed, executed on Android, downloaded from the application's endpoints, modified or deployed. No Google login, server acceptance, leaderboard credit or working Dynamons integration is demonstrated by this review.

## Conclusion

Fine Engine is a BlackBox-based virtual app container with a Carrom-specific runtime, Google-service provisioning and additional protection/signature-related components. It is substantially different from Royal Void's internal protected JavaScript loader. The general architecture is potentially relevant to running an existing installed app inside another environment, but the supplied binary is not a drop-in Dynamons launcher and it does not establish a Google authorization bypass. Copying its libraries or changing a package string cannot be represented as a working port.

For reliable official Google identity, the unmodified publisher-signed game is the baseline. A container may import its signed files, but virtualized package/UID/service reporting and backend checks can still affect authentication. Importing the currently re-signed Dynamons mod cannot make its certificate become the publisher's certificate.

## Evidence inventory and completeness

All five supplied inputs were inventoried: binary AndroidManifest.xml (120,072 bytes), classes.dex (7,459,619), resources.arsc (176,988), lib.zip (3,669,296) and assets.zip (20,397,072). The library ZIP contains six native binaries under arm64-v8a plus directory entries. The assets ZIP contains 16 entries, including fonts/licenses, images, profiles and a 24,597,601-byte embedded APK at assets/SignatureKiller/origin.apk. All ZIP entries were inventoried and extracted with path checks. The embedded APK has 115 entries and four DEX files. No Carrom game APK is identified as the embedded origin APK: its manifest is also com.fine.engine version 2.1.0.

The owner removed dp.png. No dp.png string was found in the parsed DEX string inventories; that does not prove native/protected code never resolves the image indirectly. The missing image does not block the architecture findings. Font/image/license assets do not establish login behavior.

This is not a claim to have recovered every source line or understood every protected/native instruction. The outer DEX exposes only 20 strings and the StubApp entry class; the bulk of its behavior is protected/native. The embedded main DEX exposes 48,112 strings and analyzable application methods. A custom DEX parser resolved selected class method/field/string references for the launcher architecture; it is not a complete Java decompiler or a dynamic trace. Native binaries were identified by ELF headers and inspected for readable strings/symbols; most are stripped and their full semantics remain unverified.

## Manifest and resources

Outer manifest package: com.fine.engine; versionCode 12; versionName 2.1.0; minSdk 24; targetSdk 36. The resource table contains 553 decoded simple entries and resource package com.fine.engine, with app_name Fine Engine. The application entry point is top.nkbe.safe.StubApp; the exported launcher is top.niunaijun.blackboxa.LaunchActivity. The manifest queries com.miniclip.carrom, declares BlackBox providers, numerous proxy activities/processes, a proxy receiver and a VPN service. Declaration of a VPN service does not establish that a VPN is active or used for login.

Resource messages include 'Install Carrom Pool on this phone first', 'Carrom Pool could not be prepared' and 'Google services'. These agree with the observed class references, rather than being treated as runtime success logs.

## Confirmed launch architecture

The embedded App.attachBaseContext calls BlackBoxCore.doAttachBaseContext, and App.onCreate calls BlackBoxCore.doCreate. CarromRuntime.loadDeviceApp queries Android PackageManager for com.miniclip.carrom. CarromRuntime.prepare calls BlackBoxCore.installPackageAsUser(String,int) for that package; CarromRuntime.launch calls BlackBoxCore.launchApk(String,int). The core's String import overload obtains the installed app's PackageInfo before invoking the virtual package manager. These references support an import-and-launch container design, not merely an ordinary intent that opens the game outside the container.

The runtime also has device/virtual app inspection, data-clearing, removal and prewarm operations. The launch path consults the engine's AccessStore before launching; the engine has its own access/session/licensing classes. That access layer is separate from Google Play Games authorization. Presence of these classes is not permission to bypass the engine's access controls or reuse its proprietary service.

## Google-services path

GmsSetupController has checking/downloading/installing/ready/error states. Its artifact records include packages com.google.android.gms and com.android.vending. installRuntime invokes a microG runtime migration method, provisions the two service artifacts into the virtual environment and checks readiness. These findings show a Google-compatible service setup path. Artifact package names do not prove the downloaded bytes are official Google packages; those artifacts were not supplied or fetched.

There is no observed account chooser, successful player-profile response, cloud-save load or server-authorized login in the supplied evidence. The UI string 'Google services are ready' represents a possible state, not proof that an actual account authenticated. Carrom's and Dynamons' login implementations and server policies differ, so successful Carrom login, if demonstrated, cannot establish Dynamons compatibility.

## Native/protection inventory

- libblackbox.so: AArch64 container/runtime library; readable symbols include Carrom-related names, suggesting game-specific additions.
- libArkStub.so: AArch64 protection/bootstrap component paired with outer StubApp.
- libNightmare.so: stripped AArch64 library; exact role not proven by its name or JNI_OnLoad alone.
- libSignatureKiller.so: AArch64 library with a signature-related hook symbol; accompanying embedded DEX files contain signature-interception classes and references to an embedded origin APK.
- libjiagu.so: despite placement under arm64-v8a, its ELF header is 32-bit ARM. Whether it is loaded in this build is unverified; its location does not make it a valid 64-bit library.
- libshadowhook_nothing.so: very small AArch64 binary; the name alone does not prove functional hooking.

Signature-related components show local interception machinery, not evidence that Google's servers accept a forged identity. The embedded origin.apk belongs to the engine package, so it must not be described as a recovered official Carrom certificate or game. The complete outer APK/signing block was not supplied; the installed engine's full signing identity was not independently verified.

## Applying the idea to Dynamons

A separate host/container would be a new Android project, not an updater-only change. Required compatibility areas are:

1. Import and startup of the official split APK set, including ABI/density splits and native assets. The supplied original Dynamons manifest declares split requirements.
2. Cordova WebView startup, plugin initialization, lifecycle and activity-result forwarding for Google Play Games.
3. Correct handling of the original game identity and service configuration; a virtual environment does not itself grant publisher authorization.
4. Royal Void UI/bridge integration. The existing DGDialog, ModEntry/classes7, protected index entry point, payload signature checks, key flow and JavaScript bridge depend on the rebuilt APK. They do not automatically exist in an untouched official APK imported into a container.
5. Save/profile isolation, login persistence, browser/deep-link callbacks, background/resume, network behavior and supported Android versions/ABIs.
6. Independent verification of Google auth, player retrieval, cloud save and Firebase Arena ranking writes. Login alone is insufficient to validate the leaderboard.

The Carrom runtime and native additions are game-specific. Dynamons uses Cordova/WebView JavaScript; the existing native Carrom modifications are not demonstrated to apply. No source-level integration or runtime test was performed, and no code is offered to forge publisher identity or defeat server authorization.

A sensible feasibility sequence is official Dynamons login baseline, an authorized unmodified-game container launch test, profile/cloud-save verification, then an independently designed menu integration and separate ranking verification. Proceeding to menu integration before proving the baseline would obscure whether failures arise from virtualization or mod features.

## Remaining evidence

No extra DEX or dp.png is required to identify the architecture. For a claim that this engine's Google login actually works, provide a recording or screenshots of importing the installed official Carrom app, completing login and retrieving its account/profile, plus device Android version and whether root is used. Login logs are more informative than a success label.

For a maintainable implementation, the engine/container source repository and license/permission to reuse it are needed; compiled extracts alone do not establish reuse rights or a reliable build. A complete engine APK is useful if full signer verification becomes necessary, but not required for the present architecture conclusion. The original Dynamons certificate SHA-1 and failed-login log remain pending from the earlier investigation.

The owner authorized inspection and feasibility assessment. No launcher was built, APK patched, service changed or bypass tested. The authoritative guide and existing complete package are synchronized with this report on the download branch; main and gameplay code remain unchanged.


## Shinigami bootstrap and runtime review — 2026-10-11

Static review on 11 October 2026. APK SHA-256: ad33e538e76809c9006eb6aee972f9875ebe825e82eb36303459d05dd7873fd6. No app/runtime was executed, installed or modified; no application endpoint or microG artifact was downloaded. Findings describe inspected code and packaged metadata, not successful phone login or server acceptance.

## What this APK contains

The supplied APK is approximately 175 KiB. Manifest package io.np.shinigami, versionName 3.3.15, versionCode 35, minSdk 24 and targetSdk 36. Its one DEX is 129,256 bytes and has 1,750 strings. It contains bootstrap/update/verification/loading code, host API classes, small icons, an empty.jar compatibility asset, resource XML and microG artifact metadata. There are no bundled lib/ native binaries and no complete container/game runtime in this APK.

The manifest declares io.np.shinigami.app.App and RuntimeComponentFactory, launcher MainActivity, a restart process and many top.niunaijun.blackbox proxy components. These declarations establish a container-oriented host contract. They do not prove the actual BlackBox implementation or any supported game's runtime is present in the bootstrap DEX. The empty.jar contains a small classes.dex and manifest, not the missing container implementation.

## How startup and runtime installation work

App.attachBaseContext installs crash logging, attaches host context and attempts to attach the installed runtime. Native libraries are registered from the runtime directory. Startup delegates into payload/host interfaces rather than carrying all behavior in the initial APK. MainActivity can show a bootstrap/loading screen until a usable runtime is available.

UpdateApi fetchRuntimeUpdate and fetchAppUpdate use HTTPS JSON requests; statically decoded strings identify https://shinigami.notesnepal.org and /runtime/update. The string-obfuscation helper is a Base64/byte-XOR transformation; it was decoded statically without running app code. Endpoints were identified, not contacted, and live metadata/runtime versions are unknown.

RuntimeBundleManager stages/downloads bundles, tracks progress and checks metadata before committing an active runtime. Its code has previous-version/rollback, uninstall, process restart and recovery-after-crash paths. A downloaded or selected file is not simply evaluated without inspection. The presence of a debug/custom runtime operation does not mean an arbitrary file is accepted; its normal use is gated and not tested here.

RuntimeBundleVerifier checks the supplied file and optional expected SHA-256, then RuntimePayloadIndex checks the internal contract, index/certificate/signature and individual file integrity. The index verifier references CertificateFactory, host PackageManager certificate information, Signature.initVerify/update/verify and MessageDigest. Error branches reject wrong signer, invalid signature, missing/unsigned/duplicate files, incompatible contract or bootstrap version, excessive expanded contents and an installable APK supplied in place of a runtime payload. These are code paths, not proof that a particular downloaded bundle passed validation. Exact completeness of all defensive branches was not dynamically tested.

RuntimeBundleLoader creates a PathClassLoader and instantiates io.np.shinigami.runtime.impl.ShinigamiRuntimeImpl through the ShinigamiRuntime API, including an API-version check. Runtime native support references libshinigami_runtime.so and libblackbox.so, including an ARM64 extraction path. Those libraries are expected from a separate bundle, not included in this uploaded APK. A legacy loader path attaches installed runtime code to the host class-loading environment.

In practical terms: small host APK → obtain runtime metadata/bundle → stage and verify → make runtime active → load code/native libraries → delegate to container/runtime → restart or recover when required. The installed host's identity and publisher's game identity remain separate.

## microG metadata

assets/microg-runtime-v1.json describes runtimeVersion microg-2026.09.12-bd9dfd2 and two artifacts:

- microG Services, package com.google.android.gms, filename com.google.android.gms-252432000.apk, declared size 93,734,987 bytes.
- microG Companion, package com.android.vending, filename com.android.vending-84022600.apk, declared size 4,203,625 bytes.

Metadata provides download URLs under NepMods/GmsCore GitHub releases plus SHA-256, versionCode, signerSha256 and installOrder. This confirms intended microG provisioning. Neither APK is bundled here or fetched in this review, so actual downloads, artifact certificates and microG compatibility were not verified. The filenames/package names do not make these official Google Play Services binaries.

The actual container runtime is missing, so its microG installer, account handling and game-specific changes cannot be fully audited from the metadata alone. In particular, there is no demonstrated Dynamons Google Play Games login/profile/cloud-save result or Arena ranking success.

## APK signature evidence

The V1 CERT.RSA certificate subject is CN=Shinigami, OU=Dev, O=Shinigami, L=Unknown, ST=Unknown, C=IN.

SHA-1: 8C:41:F3:46:3A:9F:D4:8E:0F:C5:76:D9:A6:2C:34:88:24:2B:FD:39

SHA-256: B0:41:DC:46:F7:FA:71:88:DD:13:40:2B:E8:FF:DD:A5:27:A0:8E:16:AA:B7:8D:77:65:EE:E0:4E:0C:35:84:E7

OpenSSL CMS verifies the V1 signature over CERT.SF; the signing-manifest digest and all 70 listed file digests match. This is V1 verification, not an independent V2/V3 verification, publisher identity endorsement or safety certification. Certificate subject labels are signer-chosen metadata. This certificate is not the Dynamons publisher's registered identity, and a runtime signature accepted by this host does not authorize access to Google's game services.

## Comparison with Fine Engine and Royal Void

Fine Engine carries an embedded APK exposing its CarromRuntime and container/service setup and also bundles native libraries. Shinigami's supplied APK instead separates the small host and downloadable runtime, so it provides less evidence about the actual game execution behavior until that bundle is available. BlackBox declarations and microG metadata make a related container architecture likely/intended, but do not establish that both engines have identical implementation or capability.

Royal Void currently boots an original game JavaScript engine with verified edits and a runtime through its modified Cordova index and added native classes. Shinigami loads Android runtime classes/native libraries into a separate host; copying its host APK or bundle metadata cannot automatically supply Royal Void's key flow, WebView bridge or menu inside an unmodified game.

Potentially reusable design ideas are a small stable host, separately versioned verified runtime, progress/error reporting, rollback and restart recovery. Adopting these ideas would mean designing a new authorized launcher/runtime project, not patching this third-party host to accept our bundle. Reuse of its source/components requires the relevant source and license/permission. No signing restriction was removed and no publisher/server identity was forged.

For Dynamons, feasibility remains unverified: original split import, Android ABI support, Cordova WebView/plugin startup, Google activity-result forwarding, native menu attachment, authorized account profile retrieval, saved progress and separate Firebase ranking writes all require runtime/device tests. Importing the current re-signed mod retains its identity mismatch. Neither microG nor a container guarantees server authorization or leaderboard acceptance.

## Minimum next evidence

To inspect the missing behavior, provide the runtime bundle that this app downloads, with its metadata/version if shown. If it offers an export/share action, use that; otherwise a runtime download link supplied by the app is useful. No root access, private signing key or account token is needed. Do not assume a direct APK URL is equivalent to the host's signed runtime format.

A screenshot of the first setup/runtime download screen can identify which bundle is installed. Phone logs showing a completed Google profile retrieval are required to establish working login; a prompt or 'installed' label only establishes that setup reached that stage. No additional game APK is required to finish the bootstrap analysis.

## Fine Engine screenshot evidence received afterward

The owner supplied a Play Store Carrom download at 7%, a microG Services initial sign-in consent screen and AimAi Engine 2.1.0/ARM64 settings reporting Google services Installed. These observations support the earlier microG/container setup interpretation. They do not show completed Google authentication, linked player profile, cloud-save retrieval or leaderboard acceptance. This updates the earlier report's evidence boundary without claiming that login was tested successfully.

The authoritative system guide and existing complete ZIP embed these findings. This task changes diagnostic documentation only; main, gameplay sources, source-only ZIP and live services remain unchanged.


## Launcher baseline milestone — 2026-10-11

## Completed

An independent native Android baseline launcher was authored and compiled. Its separate package is com.dynamongamer.launcher, version 0.1.0-baseline. It queries the expected original com.funtomic.dynamons3 and supplied mod com.funtomic.dynamons packages, lists versions/splits, reports current Android signer SHA-1/SHA-256 and checks presence of Google services/Play Games packages. It opens only the original package using Android's normal launch intent. A shared text report contains no account credentials or private game data. It cannot observe whether login or saved-progress loading succeeded.

The APK was built using SDK platform 35, build-tools 35.0.0, D8/AAPT2 and ECJ 3.40.0 with Java 21. AAPT2 package/activity/minimum/target metadata, ZIP alignment and apksigner V2/V3 verification passed. Source is delivered complete with no build outputs or signing private key included. Development APK signing is unrelated to the official game or Royal Void payload signer.

## Not completed

There is no container implementation, virtual game launch, WebView attachment, menu integration, runtime injection or Google-login fix in this milestone. No phone test was performed. Fine Engine/Shinigami compiled files are not sufficient to claim a maintainable working port. The owner confirmed that only APKs are available. The public FBlackBox/BlackBox repository has removed its source; its current README is a removal notice. A suitable maintained/licensed engine source or independently implemented container is still needed before a genuine container prototype can be built. No engine access/signature restrictions were disabled.

## Correction to earlier proposal

Launching an unmodified official game in a container was the proposed first architecture milestone. The artifact produced here launches outside a container to establish the official-login baseline and collect the missing installed certificate details. These are different milestones. The host must not be described as a working container or mod loader. Earlier conceptual attachment sequences are unimplemented design ideas, not capabilities proved by the APKs inspected.

## Phone test requested

Install the official game and the separate launcher. Refresh details, open the original game, attempt Google login and check the actual profile/cloud save. Return and share the text diagnostic report plus the observed result. Keep the current mod's installation/save separate. No game APK rebuild is needed for this test.

## Remaining work

1. Obtain phone baseline results, particularly original package signer and exact login failure if any.
2. Select and assess a buildable container implementation and split/ABI/Android compatibility.
3. Test unmodified official game startup and genuine profile retrieval within that container.
4. Design the menu/WebView bridge only once those prerequisites pass.
5. Validate saved-progress persistence and Arena ranking separately.

Documentation, complete source/archive, development APK and checksums are synchronized to the download branch. Existing game/menu source, live payloads, services and main are unchanged by this milestone.


This is the first independently built launcher for the Royal Void container investigation. It opens the installed original game through Android's normal launch intent. It is not a container, and it does not attach the mod menu.

## Install and test on your phone

1. Install Dynamons World from its official Play Store listing, package com.funtomic.dynamons3. Preserve your saves using the game's supported backup before changing game installations. Do not replace the game with a rebuilt APK for this baseline.
2. Install Dynamons-Launcher-Baseline.apk. This is a separate package com.dynamongamer.launcher and does not replace either game package.
3. Open the launcher and tap Refresh installed app details. It reports the original and previously supplied mod packages independently.
4. Tap Open original Dynamons. Test Google sign-in, then verify the game's player profile and saved progress. A visible account chooser is not enough to prove success.
5. Return to the launcher and tap Share diagnostic report. Send that report plus the observed login/profile result. The report does not collect email, account tokens, saves or a stable device identifier.

The original package's Android-reported SHA-1 and SHA-256 fingerprints are included. No trusted publisher fingerprint has been supplied, so the launcher reports the signer without declaring it genuine. The same applies to the Google-services package: its presence does not identify it as official Google software or prove login works.

Expected results include an enabled game-launch button when the expected package and launch activity are visible. If the expected package is absent, the button is disabled. The different com.funtomic.dynamons mod is listed for diagnosis but is not launched by this button. The original game can run at its normal speed; the launcher contains no speed or gameplay controls.

## Complete source

The source ZIP preserves this project folder, including MainActivity.java, Gradle files, manifest, standalone build script, this README and the current system guide. All code is included. No downloaded container code, official game APK, microG binaries, private keys or Android SDK binaries are included.

Open the project in Android Studio with Android SDK platform 35 and Java 17 or newer. The Gradle project uses Android Gradle Plugin 8.7.3; use compatible Gradle 8.9. No Gradle wrapper is bundled, so use the IDE/configured Gradle installation. Run `gradle :app:assembleDebug` with Gradle 8.9. The conventional Gradle build has not been run in this environment; the supplied APK was built through the verified standalone route below.

## Standalone SDK build

Requires Bash, Python 3, a JDK (java, javac, keytool), SDK platform 35 and build-tools 35.0.0 suitable for your build computer. This is a host build script, not a promise that desktop SDK binaries run on Android/Termux.

```sh
export ANDROID_BUILD_TOOLS=/your/android-sdk/build-tools/35.0.0
export ANDROID_PLATFORM_JAR=/your/android-sdk/platforms/android-35/android.jar
bash build_local.sh
```

If only a Java runtime is available, set JAVA_COMPILER_JAR to an Eclipse ECJ compiler JAR; compilation then uses that JAR. The supplied build used ECJ 3.40.0 and Java 21, Android SDK platform 35/build-tools 35.0.0.

The script compiles the complete source, creates DEX using D8, packages using AAPT2, aligns and signs the development APK, then verifies it. It generates a separate local development keystore under build/local; do not publish that file. Rebuilding with a different keystore can require uninstalling a previous launcher build, but does not require changing the game. The launcher signer is unrelated to the game signer and to the Royal Void payload signing key.

Output: build/local/Dynamons-Launcher-Baseline.apk. Build folders and keystores are excluded from the source ZIP. The separately delivered APK is signed as a development build, not as a publisher-signed game.

## Validation and limitations

Java compilation and D8 processing passed. AAPT2 reports the expected package/activity, minSdk 24 and targetSdk 35. ZIP structure/alignment and APK V2/V3 signature verification passed. Java compilation reports two deprecation warnings for system-bar color methods; there were no compilation errors in the final build. No emulator/phone install, login or save test was performed here. Android 7+ is the intended minimum; the complete device/version matrix is untested.

No INTERNET, account, accessibility, overlay, storage or package-install permission is requested. Report sharing uses ACTION_SEND with text. The app never reads another app's private files. It obtains public installed-package metadata through PackageManager and launches the original package normally.

No container engine or menu attachment is implemented. The public FBlackBox/BlackBox repository currently has only a removal notice; the owner has APKs but no container source. The available old VirtualApp source has not been adopted or tested for this project. Fine Engine and Shinigami binaries are analysis references, not build dependencies. Container startup remains a separate engineering milestone requiring a suitable maintained implementation and runtime compatibility testing.

The next decision follows the phone baseline: if official login fails, diagnose the original account/service flow; if it succeeds, we have a reference result against which a future unmodified-game container launch can be compared. Menu attachment comes after that comparison. Successful official login alone does not prove a future container will work or Arena ranking writes will be accepted.
