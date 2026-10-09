# Royal Void 0.2.0 — phone instructions

This is Java source and assets. No compiled APK/DEX is included. Version 0.1 worked on your phone; these 0.2 changes still require a phone build and test.

## First: update the menu while keeping the working loader

1. Back up your working APK.
2. Replace the old Royal Void Java source with ALL files in `src/com/dynamongamer/royalvoid/`. Do not mix 0.1 and 0.2 class files.
3. For a preview project, include `preview/com/dynamongamer/preview/MainActivity.java`. This class is not required by the injection runtime.
4. Replace the target APK's complete `assets/royal_void/` folder with this release's folder. The new logo filename is `images/brand_logo.png`.
5. Build with AIDE. If its Gradle version differs, use your AIDE-generated build configuration and keep Java 7 syntax/API 19 minimum. Compile against SDK 28 or newer; PixelCopy needs an SDK exposing API 26.
6. Inject the resulting DEX without replacing any original DEX. Replace your prior Royal Void DEX only; do not add duplicate Royal Void class definitions. For multiple generated DEX files, preserve all of them under unused sequential names.
7. Keep this hook directly below the game's WebView assignment:

```smali
iput-object p1, p0, Lcom/funtomic/dynamons3/MainActivity;->z:Landroid/webkit/WebView;
invoke-static {p0, p1}, Lcom/dynamongamer/royalvoid/ModEntry;->attach(Landroid/app/Activity;Landroid/webkit/WebView;)V
```

8. Keep your existing `index.html` loading `loader.js` for this first test. Keep your game manifest and existing login DEX. Rebuild, sign, install without clearing game data.
9. Only the floating launcher appears at startup. Tap to open; drag the header to move the window. Long press the launcher for shortcuts. Interface settings and file export/import are in Command centre (sliders icon).
10. If sound assets are compressed by MT Manager, SoundPool cannot open them. Store WAV files uncompressed. This source's Gradle build does that automatically.

## Second: remove loader.js and test the Java loader

Do this only after the new menu starts successfully. Keep the original working APK for rollback.

Replace your loader block inside the EXISTING `deviceready` listener:

OLD:
```javascript
addScript('version.js', Date.now(), function () {
    addScript('./loader.js', version);
});
```

NEW:
```javascript
window.__DG_NATIVE_BOOT_READY = true;
```

Keep `getSize()`, the content div, all game library scripts, `cordova.js`, `cordova_plugins.js`, and the rest of the listener. Do not load `dynamons_world.min.js` or call `lime.embed()` in the HTML. The Java loader downloads, verifies, decrypts and boots the authorized game. `version.js` is not needed for this native boot path, but it may stay in your APK for rollback.

Change our hook to:

```smali
iput-object p1, p0, Lcom/funtomic/dynamons3/MainActivity;->z:Landroid/webkit/WebView;
invoke-static {p0, p1}, Lcom/dynamongamer/royalvoid/ModEntry;->attachWithLoader(Landroid/app/Activity;Landroid/webkit/WebView;)V
```

Now `assets/www/loader.js` is unused and can be removed. Keep ONLY ONE Royal Void hook. Do not run the Java loader and JavaScript loader together.

The native loader uses your current Worker URL and the public key from the uploaded working loader. It waits for Cordova's `device.uuid`, so your existing login DEX can continue to authorize the same fingerprint. If login is not complete when it requests access, finish login, long press the launcher and select Retry game loading. It does not substitute a made-up fingerprint or bypass your access gate.

No new Activity, service, overlay permission or manifest filter is required for Royal Void. Keep your existing `dynamongamer://verify` filter for the existing login workflow.

## Back up all controls to ONE file

Open Command centre → Export all settings. Pick a location in Downloads or your document provider. After reinstalling, use Import and restore all settings and choose that file.

Included: feature switches with internal keys, speed, coins/dust, party size, consumable quantities, skin selection, favorites, feedback settings, panel height/opacity, launcher placement, reduced motion and sound volume.

Automation choices are recorded but restored stopped; start them explicitly afterward. Temporary enemy/battle HP/stat edits and collection ownership are game state, not persistent menu settings, and are not replayed. Restore checks remote locks and known game records first; backups cannot authorize locked features. Runtime setter failures can still leave a partially changed game; inspect the result before retrying.

The file survives app uninstall because it is saved through Android's document picker. It still depends on the user keeping that file/provider. Private app settings do not survive every uninstall. No broad storage permission is needed.

## Signed payload and server changes

`dist/dynamons_world_native.js` is unsigned/unencrypted and was rebuilt from the EARLIER supplied `1.js`. It is NOT verified as the engine for your 1.13.36 APK. Do not upload it blindly. Run `tools/prepare_payload.py --original /path/to/the/matching/1.js` and verify every patch against your matching game version, then use your existing private signing key and encryption/upload pipeline.

Native loading can use your existing live payload first; the DEX adapter hides its old HTML menu once hooks are available. Updated headless payload is required for pause/resume, signed community branding, and the full embedded cosmetic catalog.

`backend/license/` contains a tested SERVER DRAFT, not a deployed change. Read `SECURITY.md` before replacing the live Worker. Supabase records and live Cloudflare deployment were not modified.
