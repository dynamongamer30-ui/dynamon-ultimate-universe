# Royal Void Arena, unlocks and native menu fixes

These are complete source files, reviewed against the active Cloudflare build `royalvoid-unified-20261009-161600-427662`. Production has NOT been updated by this package. No APK/DEX was built or installed here.

## What changes

- Unlock Mons now adds missing playable owned Dynamons through the game's `Mon` constructor and `GameState.addPlayerMon`, then saves with `saveMonsData`. It no longer calls the nonexistent `GameState.setString`. New Dynamons start at Mon.getMaxLevel(); existing owned Dynamons below that cap are upgraded through the game level-up method. Repeating the action does not add duplicates. Retired merged entries and sealed-door entities are excluded.
- Unlock all checks category locks before starting, then uses the repaired Mons command and existing skin/emote/avatar commands. Like the game's other save operations, this is not a transaction across all categories; an error is reported rather than a false all-success message.
- The two one-time reward guards use `playerHasMon` instead of the Dynadex's `isMonCatched`. A collection entry alone no longer blocks an unowned reward; owning the Dynamon still blocks a duplicate one-time reward. No payment validation was bypassed.
- Party size highlight updates from successful command confirmation and game snapshots without reopening the menu. Failed changes do not select the requested size. The payload returns the actual party size. This does not add more visible on-screen seats; the game can show three front-row Dynamons while extras are in reserve.

## Files and placement

The ZIP keeps the complete `src/com/dynamongamer/royalvoid` tree (33 Java files). `ModController.java` is the changed Java file. The included `build_dex.sh` and `proguard-rules.pro` are your supplied build files, unchanged.

`update_payload_once.py` includes the complete current split template/runtime and all 36 patches: the original 34 plus the two reward fixes. It generates BOTH client-3 legacy and client-4 split variants, with the same build ID, AES-GCM encryption, ciphertext signatures and signed metadata. `menu_fixes.js` is included separately for review; it is already embedded in the updater, so do not append it a second time.

## Generate and publish the corrected payload first

Extract the ORIGINAL `assets/www/dynamons_world.min.js` from your CURRENT installed APK. The active build’s original SHA-256 is:

`044e46362e4a286ea279be3762c02d1934afdc682f539cb68dd194e74ec4b9cb`

Your earlier uploaded JavaScript has SHA-256 `b6f5470f21360435bc98c868bad208d79ab03493d045598a8f3924b099f818eb`, which differs. The refreshed updater now supports that hash too, using its own separately validated base edit table plus five checked potion sites. It retains support for the active build’s original and rejects unknown hashes. Never replace the installed APK's original game file with a patched legacy payload.

With Python and the `cryptography` package available, run from the extracted package directory (replace paths with your actual files):

```bash
python update_payload_once.py --original /path/to/current-apk/dynamons_world.min.js --signing-key /path/to/signing_key.pem --bundle-out /path/to/private-fixed-payload.json
```

The private JSON contains AES keys: keep it off GitHub and out of the APK. The reviewed website upload form still expects the older flat client-3 format, so do not use it for this dual-client bundle. Publish directly through the corrected updater and existing ADMIN_KEY (private OWNER_ADMIN_KEY constant, environment override, or hidden prompt):

```bash
python update_payload_once.py --original /path/to/current-apk/dynamons_world.min.js --signing-key /path/to/signing_key.pem --upload
```

The private signing key and ADMIN_KEY are not included in the ZIP. Use your existing keys; no replacement signing key is generated. Both variants stay compatible with the existing Worker and pinned DEX public key. Fully close/reopen the game and log in again after publishing.

## Build the native menu fixes

Use the complete `src` folder with your existing Termux Android/R8 setup. Run your existing build command; the packaged script is:

```bash
bash build_dex.sh
```

It requires your existing `ANDROID_JAR` and `R8_JAR` settings. Its output is `dist/dex/classes.dex`; replace the injected menu DEX as `classes7.dex` through your existing APK workflow. Keep existing assets, hook, manifest and index integration. This repair does not require an index.html replacement or a classes6 change.

## Validation completed here

- Reproduced the previous missing-setString unlock error.
- Verified owned additions and persistence using real `addPlayerMon`/`saveMonsData` functions from the supplied game, with isolated dependencies.
- Verified repeat unlock, category locks, unlock-all delegation, party 3→4→5→4→3, rejected party changes, and one-time shop ownership behavior.
- Read/decrypted the actual active Cloudflare payload and verified both reward guards match uniquely, the required ownership/add/save APIs exist, and additional patch offsets do not overlap existing patches.
- Java source parsed; runtime/updater syntax checks passed. Both client encryption round trips and pinned ECDSA ciphertext/metadata signatures passed; wrong-original rejection passed.

Android type checking/DEX compilation and in-device gameplay were not performed here. After installation, check: add owned monsters, repeat without duplicates, buy an unowned one-time reward, change party size both upward and downward, close/reopen and confirm saved ownership. These are code-level fixes with the stated checks, not a claim of live Android verification.

The current authoritative system guide is MOD_SYSTEM_GUIDE.md on the download branch and is included in this package. Follow that guide for deployed/prepared status and future sync rules.

## Exact command for the owner’s current Termux folder

```bash
cd /storage/emulated/0/Dynamons/Mod && python update_payload_once.py --original dynamons_world.min.js --signing-key signing_key.pem --upload
```

Without --upload or --bundle-out, argument validation stops before generating/uploading anything. No script replacement is needed for that error.

The supplied-original table was validated by generating the full patched game and both signed/encrypted client variants. Replace the old Python file with the latest complete GitHub copy before retrying. No live publication was performed during these checks.

For a command-only upload, set OWNER_ADMIN_KEY once in your private phone copy of update_payload_once.py. The GitHub copy keeps that constant empty. Updating the script requires setting it again. Environment DG_ADMIN_KEY takes precedence. Never publish your customized private copy.

Maximum-level correction: Mons unlock adds missing playable Dynamons at Mon.getMaxLevel() and upgrades existing owned Dynamons below that cap via the game level-up API. Repeating Unlock repairs the prior level-1 grants without duplicates. Upload the new payload and reopen/login before pressing Unlock again. Restore OWNER_ADMIN_KEY in your private updated Python file if using the no-prompt option. Shop/catch rewards retain their own level rules.

## Current Arena/UI corrections

- Numeric bot win result 0 replaces the incorrect boolean true (loss). Win bot matches OFF preserves the original result. Real-player result codes are preserved; no server outcome is fabricated. No Trophy Loss operates separately for bot losses/give-up.
- Bot matchmaking is locked during an active match. Starting bot automation mid-match is rejected. Other match controls stay available. Active real matches are not rewritten into bots by polling.
- Full-heal ON enables Arena heal spray slots/text and bypasses only its timer; the original item action consumes stock. OFF restores normal restrictions. Reopen inventory after switching. Live real-opponent acceptance still needs phone verification.
- Unlock All includes supported worlds and active variants, using map persistence and the existing world-unlock item. Story completion is unchanged. A separate Worlds button is included.
- All 19 feature cards and the speed slider are discoverable from startup. Scan results still require Scan. Enemy cards use coral with a subtle outline/glow; your team uses cyan.
- Shop compatibility is permanently ON, including saved-profile/reset paths; the UI labels it Always enabled.
- Speed remains your choice. The current speed card explains that visual playback accelerates while real-Arena tween wait timers are protected: at 4x a 60-second wait stays 60 seconds. The opponent/network is not accelerated. Use 1x if swaps/disconnects/freezes occur. Zero side effects and live stability are not promised.

Both the new payload and a rebuilt classes7.dex are required for the full delivery. The updater alone does not change the native colors/initial panels/speed note. No live upload, DEX build or phone installation was performed by the assistant. Confirmed conflicts were corrected, but invisible enemies and every real-player freeze cannot be declared resolved without live testing.

## Latest navigation and animation-clock update

Every page opens at the top when selected, including Dashboard after visiting Battle. Valid Scan Team results are the exception: cards and their scroll position survive returning to Team. A fresh scan starts at the results area; roster/battle changes clear stale scans. Same-page polling/render does not reset scrolling.

Real Arena wait timers now retain normal wall duration. Movement/effect interpolation and sprite playback still follow selected speed; at 4x a 400ms movement tween is 100ms while a 60-second wait remains 60 seconds. World/bot waits keep their existing behavior. Network/turn order is not sped up. Both payload publication and rebuilding/installing classes7.dex are necessary. Android UI and live multiplayer still need phone testing.
