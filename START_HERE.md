# Royal Void downloads

The latest supplied Java source is in [raw-project/src](raw-project/src) and [Royal-Void-Supplied-SRC.zip](Royal-Void-Supplied-SRC.zip). The ZIP contains all 33 supplied Java files under src/ with their original folder structure. No source lines have been shortened or omitted. This is a source-only archive, not an APK or rebuilt DEX.

Read [CURRENT_MENU_CONTROLS.md](CURRENT_MENU_CONTROLS.md) for the control map, evidence limits and current architecture, and [DELIVERY_RULES.md](DELIVERY_RULES.md) for delivery preferences.

Existing versioned Java-And-Assets, AIDE-Build-Project and DEX-And-Assets ZIPs are older reference packages. They have not been rebuilt from the newly supplied split-loader source. Do not treat their loader/integration instructions as current. The remaining raw-project integration/server/tool files are historical reference too; live Worker and supplied split loader differ. The build workflow still uses the older Java-And-Assets ZIP.

This update does not change main, upload a payload, deploy Workers, modify Supabase, or build/install an APK. The user-supplied original MainActivity does not show installed mod hooks.

Source ZIP SHA-256: a8f28357b89b901a38b04e34202a50ad51f16e774eacee31202e070aa243552d

## Unlock/shop/party repairs

[Royal-Void-Unlock-Party-Fixes.zip](Royal-Void-Unlock-Party-Fixes.zip) contains all 33 Java files, the supplied build files and a corrected complete dual-client updater. Follow [FIXES_README.md](FIXES_README.md) for payload-first installation and verification limits. These source fixes are not yet published to the live Worker payload or installed in an APK. Use raw-project/tools/update_payload_once.py for this repair rather than the historical update_payload.py.
