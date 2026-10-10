# Royal Void unlock, shop and party-button fixes

These are complete source files, reviewed against the active Cloudflare build `royalvoid-unified-20261009-161600-427662`. Production has NOT been updated by this package. No APK/DEX was built or installed here.

## What changes

- Unlock Mons now adds missing playable owned Dynamons through the game's `Mon` constructor and `GameState.addPlayerMon`, then saves with `saveMonsData`. It no longer calls the nonexistent `GameState.setString`. New Dynamons start at level 1; existing Dynamons and levels are preserved. Repeating the action does not add duplicates. Retired merged entries and sealed-door entities are excluded.
- Unlock all checks category locks before starting, then uses the repaired Mons command and existing skin/emote/avatar commands. Like the game's other save operations, this is not a transaction across all categories; an error is reported rather than a false all-success message.
- The two one-time reward guards use `playerHasMon` instead of the Dynadex's `isMonCatched`. A collection entry alone no longer blocks an unowned reward; owning the Dynamon still blocks a duplicate one-time reward. No payment validation was bypassed.
- Party size highlight updates from successful command confirmation and game snapshots without reopening the menu. Failed changes do not select the requested size. The payload returns the actual party size. This does not add more visible on-screen seats; the game can show three front-row Dynamons while extras are in reserve.

## Files and placement

The ZIP keeps the complete `src/com/dynamongamer/royalvoid` tree (33 Java files). `ModController.java` is the changed Java file. The included `build_dex.sh` and `proguard-rules.pro` are your supplied build files, unchanged.

`update_payload_once.py` includes the complete current split template/runtime and all 36 patches: the original 34 plus the two reward fixes. It generates BOTH client-3 legacy and client-4 split variants, with the same build ID, AES-GCM encryption, ciphertext signatures and signed metadata. `menu_fixes.js` is included separately for review; it is already embedded in the updater, so do not append it a second time.

## Generate and publish the corrected payload first

Extract the ORIGINAL `assets/www/dynamons_world.min.js` from your CURRENT installed APK. The active build’s original SHA-256 is:

`044e46362e4a286ea279be3762c02d1934afdc682f539cb68dd194e74ec4b9cb`

Your earlier uploaded JavaScript has SHA-256 `b6f5470f21360435bc98c868bad208d79ab03493d045598a8f3924b099f818eb`, which differs. The refreshed updater now supports that hash too, using its own separately validated 36-edit table. It retains support for the active build’s original and rejects unknown hashes. Never replace the installed APK's original game file with a patched legacy payload.

With Python and the `cryptography` package available, run from the extracted package directory (replace paths with your actual files):

```bash
python update_payload_once.py --original /path/to/current-apk/dynamons_world.min.js --signing-key /path/to/signing_key.pem --bundle-out /path/to/private-fixed-payload.json
```

The private JSON contains AES keys: keep it off GitHub and out of the APK. The reviewed website upload form still expects the older flat client-3 format, so do not use it for this dual-client bundle. Publish directly through the corrected updater and existing ADMIN_KEY prompt:

```bash
python update_payload_once.py --original /path/to/current-apk/dynamons_world.min.js --signing-key /path/to/signing_key.pem --upload
```

The private signing key and ADMIN_KEY are not included in the ZIP. Use your existing keys; no replacement signing key is generated. Both variants stay compatible with the existing Worker and pinned DEX public key. Fully close/reopen the game and log in again after publishing.

## Build the party-button fix

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
