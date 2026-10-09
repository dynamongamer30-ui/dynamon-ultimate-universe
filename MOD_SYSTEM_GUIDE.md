# Royal Void: complete owner and AI handover

Updated 9 October 2026. This file is documentation for the owner, not an APK asset.

## Current state and boundaries

- Host is a Cordova game, package com.funtomic.dynamons4, Activity com.funtomic.dynamons3.MainActivity. Activity namespace and manifest package intentionally differ.
- UI and Android effects are Java under com.dynamongamer.royalvoid. Gameplay runs inside the existing game WebView.
- User successfully uploaded build royalvoid-03-20261009-070357-a0030a. Phone functionality beyond upload is not independently verified.
- Newly supplied raw Java has spacing/connection diagnostics plus launch-time remote branding support. No new DEX has been built for these changes. Owner must build it.
- Main website branch adds DEX controls and signed-metadata support to its admin panel. Updated dg Worker source must be deployed separately to serve remote branding. Worker settings, existing keys and routes must be retained.
- There are no periodic HTTP heartbeats or config polling in the native path. Local UI/game timers are not network heartbeats. Settings and revocation take effect on the next payload load; already running sessions do not receive immediate revocation.
- Values which execute on a user's phone can be extracted or modified. R8 and encrypted delivery raise the effort; they do not guarantee uneditable branding or theft-proof code. Device fingerprints are identifiers, not cryptographic proof of identity.

## Architecture

1. The game Activity initializes Cordova and stores the game's WebView.
2. One ModEntry.attachWithLoader(Activity,WebView) hook attaches the native launcher and starts NativePayloadLoader.
3. index.html loads Cordova and the original support libraries. On deviceready it sets window.__DG_NATIVE_BOOT_READY=true. It does not load loader.js or directly embed a local game engine.
4. Loader waits for that flag and Cordova device.uuid. Existing login/gate DEX must still verify the user.
5. GET /payload fetches ciphertext plus signed metadata from dg. POST /check asks for its AES key using fp/build/ctsha. That route checks bans, fresh login, license/device/expiry, maintenance and feature locks.
6. Java verifies SHA-256 and both ECDSA signatures, decrypts AES-GCM, and injects the code into the local game WebView. No AES key or plaintext payload is saved to client disk by the loader.
7. Payload contains the patched game engine, branding/catalogue/menu configuration, headless gameplay runtime and window.__DG_INSTALL_NATIVE bridge installer.
8. Loader installs launch locks. New raw loader also applies the optional server-provided brand override after evaluating the signed payload. It then calls lime.embed using the original getSize function.
9. Native GameBridge calls window.__DG_NATIVE.snapshot()/command(); ModController draws the UI and applies responses. Item artwork uses game image paths; Java logo/fonts/sounds are APK assets.

## Exact hook and APK contents

After this existing instruction:

```smali
iput-object p1, p0, Lcom/funtomic/dynamons3/MainActivity;->z:Landroid/webkit/WebView;
```

add exactly one hook:

```smali
invoke-static {p0, p1}, Lcom/dynamongamer/royalvoid/ModEntry;->attachWithLoader(Landroid/app/Activity;Landroid/webkit/WebView;)V
```

Keep .registers 5 for the previously supplied Activity; this hook needs no new registers. Do not move it before invoke-super. Preserve original game DEX files and existing login hooks. Replace only the prior Royal Void DEX, without leaving duplicate class definitions. Use an unused sequential classesN.dex filename when adding a new DEX. DEX numbering is packaging, not part of the class descriptor.

Copy assets/royal_void directly into APK assets/royal_void, not assets/www/assets. Runtime assets: ui_regular.ttf, ui_medium.ttf, ui_bold.ttf; brand_logo.png; select.wav, success.wav, warning.wav. Keep WAV entries uncompressed. Do not copy docs, JSON, Python, tests, build tools, a signing key, mappings, server source or Gradle files into the game APK. Keep all original Cordova/game libraries, data, art and audio. Remove old loader.js only after native loading is configured; keep version.js and local engine files until their references are confirmed unnecessary. Old JS menu code can live in a previously uploaded payload, not only in loader.js.

Verification deep link, if used, belongs in a separate intent-filter inside the existing launcher Activity:

```xml
<intent-filter>
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:host="verify" android:scheme="dynamongamer" />
</intent-filter>
```

No new game Activity, service, SYSTEM_ALERT_WINDOW or overlay permission is required for the menu attached to the Activity.

## Raw project and manual protected builds

All raw source/config is under raw-project on the download branch. AIDE standalone preview uses src/, preview/, assets/, AndroidManifest.xml, build.gradle, settings.gradle, gradle.properties, project.properties and proguard-rules.pro. Its manifest and preview Activity are for the preview app only. Do not replace the game's manifest with them.

AIDE debug output is normally readable. Release minifyEnabled=true, the supplied keep rules and android.enableR8=true request R8 in the legacy AGP3.2.1 project. Whether that Gradle configuration runs depends on the installed AIDE/JDK/SDK; it has not been verified on the owner's phone. An AIDE release APK can include its preview Activity. For a core-only DEX use the Termux R8 path below, which excludes preview entirely. MT Manager is used to inspect/inject/sign; it does not by itself reproduce the Java-to-R8 build.

Termux core build:

```sh
pkg install openjdk-17 python zip
cd /storage/emulated/0/AideProjects/RoyalVoid
export ANDROID_JAR="/absolute/path/to/android.jar"
export R8_JAR="/absolute/path/to/d8.jar"
bash tools/build_dex.sh
bash tools/package_dex_release.sh
```

Get android.jar from an Android SDK platform API28 or newer. For the same toolchain family as the earlier release use platform35 and SDK build-tools35.0.0/lib/d8.jar (it contains R8). Obtain these from the official Android SDK/SDK Manager, or copy them from a SDK installation. They are build tools, not files injected into the APK. Do not use a platform stub jar bundled in an unrelated APK. Source uses Java7 syntax; if the JDK no longer supports source7 set DG_SOURCE_LEVEL=8. JDK17 accepts source7 with deprecation warnings.

Output: dist/dex/classes.dex. Packaging script emits dist/royal-void-dex-package.zip containing only DEX and seven runtime assets. build/royal-void-mapping.txt is private for crash diagnosis. The public keep entrypoints must retain ModEntry.attachWithLoader signature; PortableProfile is kept for Android fragment restoration. Renamed implementation classes and a smaller DEX are expected. Same protection settings do not imply byte-identical output across R8/AIDE/toolchain versions.

## File responsibilities

- `ArtworkView.java`: Image display.
- `BrandConfig.java`: Local fallback identity/version, not authoritative server identity.
- `FeatureRegistry.java`: Validates signed menu configuration and turns entries into native feature cards.
- `FloatingLauncher.java`: Draggable launcher/edge handle.
- `FontManager.java`: Asset fonts and fallback typography.
- `GameBridge.java`: WebView evaluateJavascript bridge with timeout and clearer missing-payload errors.
- `GameConnection.java`: Common connection callback contract.
- `GameScripts.java`: Small pointer calling the server-provided installer; does not contain gameplay patches.
- `GlassBackdropView.java`: Backdrop treatment; device capability affects real blur.
- `GlassPanelDrawable.java`: Translucent panel/card rendering.
- `GlowDrawable.java`: Glow treatment.
- `HapticEngine.java`: Haptic preferences and feedback.
- `IconView.java`: Vector-style Java-drawn symbols.
- `LocalArtworkLoader.java`: Asynchronous loading of inventory art from game assets.
- `ModController.java`: Panel/sidebar, page rendering, spacing, inputs, command feedback, settings and item images.
- `ModEntry.java`: Stable smali hooks, per-Activity instance handling and lifecycle attachment.
- `MotionEffects.java`: Press/entrance/motion preferences.
- `NativePayloadLoader.java`: Launch sequence, HTTPS/key request, signatures/decryption, lock and brand injection, game embed.
- `NavigationAnimator.java`: Sidebar transitions.
- `PayloadCrypto.java`: SHA/signature/decryption helpers.
- `PortableProfile.java`: SAF import/export of one user-selected profile, retained outside app-private storage when chosen by user.
- `PreferencesStore.java`: Local UI/settings preferences.
- `PreviewConnection.java`: Standalone sample data; never use as the real game connection.
- `ProgressRingView.java`: Automation progress visualization.
- `PublicConfigClient.java`: Legacy helper; native startup does not call it for periodic/public configuration.
- `RoyalVoidTheme.java`: Colors, dimensions and shape helpers.
- `ScrollMotion.java`: Scroll-dependent visual motion.
- `SelectionView.java`: Theme-aware selection markers.
- `SkinPackManager.java`: Remote skin manifest loading and selection.
- `SoundEngine.java`: Asset audio feedback.
- `ToggleView.java`: Theme-aware toggles.
- `WebViewFinder.java`: Optional Activity-only attachment helper; explicit WebView hook is preferred.

## Server and admin contract

License/payload Worker: https://dg.dynamongamer30.workers.dev

Bindings: DG (KV fallback), DG_R2 (R2), ADMIN_KEY (secret), SUPABASE_URL (secret), SUPABASE_SERVICE_KEY (secret). Never embed ADMIN_KEY or service-role credentials in a public project, DEX or guide. The owner-specific Python file can contain an admin key by explicit owner choice, but must remain private. The raw public tool prompts or uses DG_ADMIN_KEY environment variable.

R2 objects: ct:<build> holds ciphertext/metadata; key:<build> holds key_b64 and ct_sha; current_build selects the active build. Publish unique build IDs. GET /payload is public ciphertext; /check gates the key. Admin upload requires X-Admin and stores ciphertext then key then current_build. The Worker currently does not verify upload signatures itself; the DEX verifies them before execution. Admin must upload only valid signed bundles.

Supabase tables use id/data JSONB rows: valid_keys, activated_users, banned_devices, suspicious_activity, app_config. app_config has existing owner-only RLS writes; no new table/migration is required for FeatureLocks or DexBranding. Verified existing policies before adding UI. No production settings/data were changed during this code update.

- app_config row FeatureLocks: object of boolean feature keys; true means locked. app/mods block access, unlock locks all unlock categories. Unknown boolean keys are preserved by the panel.
- app_config row DexBranding: name/edition/links array, served by the new Worker at /check. New Java applies name and community links at next launch. Edition remains payload/local UI copy in current rendering; logo/fonts require asset update and rebuild.
- Maintenance blocks new loading; it is a separate existing configuration setting.
- ValidKeys expiry is Unix seconds. ActivatedUsers.lastLogin is milliseconds (seconds also normalized). Login grace is30 minutes; timestamps more than60 seconds in future are blocked.
- Current /verify-key route preserves legacy binding behavior; do not claim an atomic multi-device binding guarantee. Concurrent first-use activation still needs a separate reviewed server fix.
- Legacy /heartbeat is a no-op; /tamper does not auto-ban untrusted reports. admin/list returns presence_disabled:true and active:[] rather than polling presence. Empty active[] does not mean zero users.

Admin routes on main: /admin-control (Royal Void DEX tab) and /admin-loader (payload upload). Feature access and branding appear next launch. Main's VITE_LICENSE_WORKER_URL must point to dg. Website production branch should be main, not the DEX download branch; pnpm build fails on a branch that only contains download files.

## Payload encryption and signing

Existing signing_key.pem is an ECDSA P-256 private key generated by the old build tool. It must match the public key pinned in NativePayloadLoader. Do not generate a replacement without updating the DEX trust anchor. Never share the private key with another AI, add it to GitHub or include it in APK assets.

Public trust anchor (not secret):

```
MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEBvmVi6bDPa9eUOBNsYKr+IQ3JW3rQPQpeWxhi/fTTuLIn8jtG3vDb1G2y9286BKW1GKs2zksU9Grw6eFMHF7Aw==
```

AES-256-GCM uses fresh32-byte key and12-byte IV. Ciphertext includes GCM tag. ct_sha is SHA256 of ciphertext. ECDSA signatures use SHA256 and raw64-byte r||s, base64 encoded. protocol=2, min_client=3, issued=Unix seconds. Ciphertext signature is sig_b64. meta_sig_b64 signs the exact UTF8 text:

```
DG-PAYLOAD-V2
{build}
{ct_sha}
{iv_b64}
{issued}
3
```

No trailing newline. The DEX verifies both signatures. Signed metadata prevents unauthenticated swaps of build/IV/version/timestamp; issued is not a persistent anti-replay counter. There is no client certificate/session attestation. Already decrypted client code cannot be guaranteed secret.

Owner updater commands:

```sh
python tools/update_payload.py --original original_game.js --signing-key /private/path/signing_key.pem
```

Reads original unmodified same-version game engine, checks matching key and all rules, stops on ambiguity/overlap, adds headless runtime/config, encrypts/signs, asks ADMIN_KEY then uploads. It sets browser-compatible User-Agent because default Python headers were blocked by Cloudflare1010. No heartbeat is added. Original JS and private key are untouched. A HTTP403 body 'forbidden' is Worker auth; non-JSON1010 is Cloudflare browser-signature block.

To edit values/config files manually:

```sh
python tools/update_payload.py --original original_game.js --signing-key /private/path/signing_key.pem --config-dir integration
```

Overrides brand.json, menu_config.json, catalog.json, patches.json if present. Be careful: numeric backend command ceilings are also hardcoded in native_adapter.js; changing UI menu_config alone does not change all command bounds. To change actual behavior, edit adapter/headless runtime, run tools/embed_runtime.py to regenerate tests/bootstrap.js, then prepare/seal the updated payload. The standalone embedded updater contains a runtime snapshot, so run `python tools/rebuild_updater.py` to regenerate its embedded owner data, or use tools/prepare_payload.py followed by tools/seal_payload.py after editing runtime source. The two-stage tools read current source directly; the standalone tool does not magically read an edited bootstrap.js.

For the admin Loader page export a private bundle instead of uploading:

```sh
python tools/update_payload.py --original original_game.js --signing-key /private/path/signing_key.pem --config-dir integration --bundle-out /private/path/upload.json
```

Then select upload.json in the owner admin-loader form. The updated form preserves protocol/issued/min_client/meta_sig_b64 and rejects incomplete protocol2 metadata. Bundle contains the AES key: keep it owner-only. Do not publish it. Branding overrides are delivered over HTTPS in the authorized /check response; unlike payload-embedded defaults they are not covered by the payload ECDSA signature. Keys/settings can be cached in process but the native path does not store decrypted content on disk.

## Values, features and patch definitions

These are current supported values, not all desired future features. Original menu IAP-marking actions are not proof of paid entitlement and are intentionally not implemented as validated purchases. There is no first-turn control in this catalogue. Unlock collection records does not grant playable creatures. noTrophyLoss and winTrophy share existing winning-state hooks; assess behavior against the current game before making stronger claims.

Current native command bounds: speed0.1–8; coins/dust0–999999999; item quantities0–999999; party3–5; stat edits0–1000000 with extra HP maximum and battle scan-token checks. Stats/party validity still depends on the game. Flags and limits in signed menu config:

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
      "title": "Win state",
      "description": "Apply the existing winning-state hook",
      "category": "Arena",
      "icon": "star"
    },
    {
      "key": "noTrophyLoss",
      "title": "No trophy loss",
      "description": "Apply the existing arena win-state hook",
      "category": "Arena",
      "icon": "shield"
    },
    {
      "key": "fullheal",
      "title": "Full-heal potions",
      "description": "Restore full health with a potion",
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
      "description": "Enable the original shop patch",
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

Exact patch rules follow for AI maintenance. They were derived from engine logic, so match contexts may change between game versions. Never choose the first ambiguous regex occurrence automatically. Rule32 was corrected against original SHA256044e46362e4a286ea279be3762c02d1934afdc682f539cb68dd194e74ec4b9cb: both wheel actions are in one post-battle ternary; both require the spin gate. All34 rules and generated JS syntax passed for that input. A future engine needs matching diagnostics and re-derived anchors.

```json
{
  "version": 1,
  "source": {
    "original": "dynamons_world.min-kr6g.js",
    "patch": "patch.js"
  },
  "rules": [
    {
      "find": "\\.__id__\\]=(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\),(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\);var\\ (?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\}(?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\.lime=(?P<g4>[A-Za-z_$][A-Za-z0-9_$]*)\\.lime\\|\\|\\{\\};var\\ (?P<g5>[A-Za-z_$][A-Za-z0-9_$]*)=\\{\\},(?P<g6>[A-Za-z_$][A-Za-z0-9_$]*)=function\\(\\)\\{return\\ (?P<g7>[A-Za-z_$][A-Za-z0-9_$]*)\\.__string_rec\\(this,\"",
      "repl_segs": [
        {
          "lit": "."
        },
        {
          "lit": "__id__"
        },
        {
          "lit": "]="
        },
        {
          "grp": "g0"
        },
        {
          "lit": "),"
        },
        {
          "grp": "g1"
        },
        {
          "lit": ");"
        },
        {
          "lit": "var"
        },
        {
          "lit": " "
        },
        {
          "grp": "g2"
        },
        {
          "lit": "}"
        },
        {
          "grp": "g3"
        },
        {
          "lit": "."
        },
        {
          "lit": "lime"
        },
        {
          "lit": "="
        },
        {
          "grp": "g4"
        },
        {
          "lit": "."
        },
        {
          "lit": "lime"
        },
        {
          "lit": "||{};"
        },
        {
          "lit": "var"
        },
        {
          "lit": " "
        },
        {
          "grp": "g5"
        },
        {
          "lit": "=(window||self).$DW"
        },
        {
          "lit": "={},"
        },
        {
          "grp": "g6"
        },
        {
          "lit": "="
        },
        {
          "lit": "function"
        },
        {
          "lit": "(){"
        },
        {
          "lit": "return"
        },
        {
          "lit": " "
        },
        {
          "grp": "g7"
        },
        {
          "lit": "."
        },
        {
          "lit": "__string_rec"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        },
        {
          "lit": ",\""
        }
      ],
      "anchor": "__string_rec",
      "expect": ".__id__]=c),c);var c}J.lime=J.lime||{};var t=(window||self).$DW={},q=function(){return Pa.__string_rec(this,\"",
      "strategy": "generalized",
      "ctx": 45,
      "a_pos": 5162,
      "orig_core": "",
      "patch_core": "(window||self).$DW=",
      "radius": 130,
      "id": 0,
      "feature": "inline logic edit"
    },
    {
      "find": "und\\((?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.getTotalHP\\(\\)\\*\\((?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)/100\\)\\),this\\._actoutD",
      "repl_segs": [
        {
          "lit": "und"
        },
        {
          "lit": "("
        },
        {
          "grp": "g0"
        },
        {
          "lit": "."
        },
        {
          "lit": "getTotalHP"
        },
        {
          "lit": "()*("
        },
        {
          "lit": "((window.__DGF&&window.__DGF.fullhe"
        },
        {
          "grp": "g1"
        },
        {
          "lit": "l)?100:a)"
        },
        {
          "lit": "/100)),"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_actoutD"
        }
      ],
      "anchor": "getTotalHP",
      "expect": "und(b.getTotalHP()*(((window.__DGF&&window.__DGF.fullheal)?100:a)/100)),this._actoutD",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 564252,
      "orig_core": "a",
      "patch_core": "((window.__DGF&&window.__DGF.fullheal)?100:a)",
      "radius": 81,
      "id": 1,
      "feature": "Full Heal (potions=100%)  [flag: fullheal]"
    },
    {
      "find": "this\\._hasEscaped=!0,null==this\\._mpData\\?this\\.fadeToMenu\\(\\):\\(",
      "repl_segs": [
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_hasEscaped"
        },
        {
          "lit": "=!0,"
        },
        {
          "lit": "("
        },
        {
          "lit": "null"
        },
        {
          "lit": "=="
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_mpData"
        },
        {
          "lit": "||null==this._mpUser)"
        },
        {
          "lit": "?"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "fadeToMenu"
        },
        {
          "lit": "():("
        }
      ],
      "anchor": "_hasEscaped",
      "expect": "this._hasEscaped=!0,(null==this._mpData||null==this._mpUser)?this.fadeToMenu():(",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 639566,
      "orig_core": "null==this._mpData",
      "patch_core": "(null==this._mpData||null==this._mpUser)",
      "radius": 98,
      "id": 2,
      "feature": "inline logic edit"
    },
    {
      "find": "displayMPErrors:function\\(\\)\\{this\\.stopEnemyTurnTimeout\\(\\),this\\.executeBotTransition\\(\\)\\}",
      "repl_segs": [
        {
          "lit": "displayMPErrors:function(){this.stopEnemyTurnTimeout(),this.executeBotTransition()}"
        }
      ],
      "anchor": "displayMPErrors:function()",
      "expect": "displayMPErrors:function(){this.stopEnemyTurnTimeout(),this.executeBotTransition()}",
      "strategy": "compatibility-noop",
      "ctx": 0,
      "a_pos": 674833,
      "orig_core": "displayMPErrors:function(){this.stopEnemyTurnTimeout(),this.executeBotTransition()}",
      "patch_core": "already safe in this game build",
      "radius": 100,
      "id": 3,
      "feature": "inline logic edit (already safe in this build)"
    },
    {
      "find": "\\),this\\._turnRingWait\\.destroy\\(\\),this\\._tur",
      "repl_segs": [
        {
          "lit": "),"
        },
        {
          "lit": "this._turnRingWait&&"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_turnRingWait"
        },
        {
          "lit": "."
        },
        {
          "lit": "destroy"
        },
        {
          "lit": "(),"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_tur"
        }
      ],
      "anchor": "_turnRingWait",
      "expect": "),this._turnRingWait&&this._turnRingWait.destroy(),this._tur",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 690032,
      "orig_core": "",
      "patch_core": "&&this._turnRingWait",
      "radius": 80,
      "id": 4,
      "feature": "inline logic edit"
    },
    {
      "find": "top\\(\\),this\\._emoteHud\\.removeEventListener\\(\"OpenUIEvent\",(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\(this,this\\.handleEmoteHud\\)\\),this\\._emoteHud\\.removeEventListener\\(\"EmoteEvent\",(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\(this,this\\.handleEmoteHud\\)\\)\\):this\\._botBattle\\&\\&\\((?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\.removeTweens\\(this\\._botTurnExpectant\\),(?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\.removeTweens\\(this\\._emoteExpectant\\),this\\._emoteHud\\.removeEventListener\\(\"OpenUIEvent\",(?P<g4>[A-Za-z_$][A-Za-z0-9_$]*)\\(this,this\\.handleEmoteHud\\)\\),this\\._emoteHud\\.removeEventListener",
      "repl_segs": [
        {
          "lit": "top"
        },
        {
          "lit": "(),"
        },
        {
          "lit": "this._emoteHud&&"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_emoteHud"
        },
        {
          "lit": "."
        },
        {
          "lit": "removeEventListener"
        },
        {
          "lit": "(\""
        },
        {
          "lit": "OpenUIEvent"
        },
        {
          "lit": "\","
        },
        {
          "grp": "g0"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        },
        {
          "lit": ","
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "handleEmoteHud"
        },
        {
          "lit": ")),"
        },
        {
          "lit": "this._emoteHud&&"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_emoteHud"
        },
        {
          "lit": "."
        },
        {
          "lit": "removeEventListener"
        },
        {
          "lit": "(\""
        },
        {
          "lit": "EmoteEvent"
        },
        {
          "lit": "\","
        },
        {
          "grp": "g1"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        },
        {
          "lit": ","
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "handleEmoteHud"
        },
        {
          "lit": "))):"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_botBattle"
        },
        {
          "lit": "&&("
        },
        {
          "grp": "g2"
        },
        {
          "lit": "."
        },
        {
          "lit": "removeTweens"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_botTurnExpectant"
        },
        {
          "lit": "),"
        },
        {
          "grp": "g3"
        },
        {
          "lit": "."
        },
        {
          "lit": "removeTweens"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_emoteExpectant"
        },
        {
          "lit": "),"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_emoteHud"
        },
        {
          "lit": "&&this._emoteHud"
        },
        {
          "lit": "."
        },
        {
          "lit": "removeEventListener"
        },
        {
          "lit": "(\""
        },
        {
          "lit": "OpenUIEvent"
        },
        {
          "lit": "\","
        },
        {
          "grp": "g4"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        },
        {
          "lit": ","
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "handleEmoteHud"
        },
        {
          "lit": ")),"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_emoteHud"
        },
        {
          "lit": "&&this._emoteHud"
        },
        {
          "lit": "."
        },
        {
          "lit": "removeEventListener"
        }
      ],
      "anchor": "removeEventListener",
      "expect": "top(),this._emoteHud&&this._emoteHud.removeEventListener(\"OpenUIEvent\",g(this,this.handleEmoteHud)),this._emoteHud&&this._emoteHud.removeEventListener(\"EmoteEvent\",g(this,this.handleEmoteHud))):this._botBattle&&(k.removeTweens(this._botTurnExpectant),k.removeTweens(this._emoteExpectant),this._emoteHud&&this._emoteHud.removeEventListener(\"OpenUIEvent\",g(this,this.handleEmoteHud)),this._emoteHud&&this._emoteHud.removeEventListener",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 690140,
      "orig_core": ".removeEventListener(\"OpenUIEvent\",g(this,this.handleEmoteHud)),this._emoteHud.removeEventListener(\"EmoteEvent\",g(this,this.handleEmoteHud))):this._botBattle&&(k.removeTweens(this._botTurnExpectant),k.removeTweens(this._emoteExpectant),this._emoteHud.removeEventListener(\"OpenUIEvent\",g(this,this.handleEmoteHud)),this._emoteHud",
      "patch_core": "&&this._emoteHud.removeEventListener(\"OpenUIEvent\",g(this,this.handleEmoteHud)),this._emoteHud&&this._emoteHud.removeEventListener(\"EmoteEvent\",g(this,this.handleEmoteHud))):this._botBattle&&(k.removeTweens(this._botTurnExpectant),k.removeTweens(this._emoteExpectant),this._emoteHud&&this._emoteHud.removeEventListener(\"OpenUIEvent\",g(this,this.handleEmoteHud)),this._emoteHud&&this._emoteHud",
      "radius": 408,
      "id": 5,
      "feature": "near string: OpenUIEvent"
    },
    {
      "find": "rnDat=function\\((?P<g0>[A-Za-z_$][A-Za-z0-9_$]*),(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\)\\{(?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\.init\\(\\);for\\(var\\ (?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)=",
      "repl_segs": [
        {
          "lit": "rnDat"
        },
        {
          "lit": "="
        },
        {
          "lit": "function"
        },
        {
          "lit": "("
        },
        {
          "grp": "g0"
        },
        {
          "lit": ","
        },
        {
          "grp": "g1"
        },
        {
          "lit": "){"
        },
        {
          "lit": "if(!a||typeof a.sendTurn!==\"function\")return;"
        },
        {
          "grp": "g2"
        },
        {
          "lit": "."
        },
        {
          "lit": "init"
        },
        {
          "lit": "();"
        },
        {
          "lit": "for"
        },
        {
          "lit": "("
        },
        {
          "lit": "var"
        },
        {
          "lit": " "
        },
        {
          "grp": "g3"
        },
        {
          "lit": "="
        }
      ],
      "anchor": "function",
      "expect": "rnDat=function(a,b){if(!a||typeof a.sendTurn!==\"function\")return;Vb.init();for(var c=",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 703150,
      "orig_core": "",
      "patch_core": "if(!a||typeof a.sendTurn!==\"function\")return;",
      "radius": 80,
      "id": 6,
      "feature": "near string: function"
    },
    {
      "find": "his\\._invCooldownMax=3\\),this\\._invIsAvail=",
      "repl_segs": [
        {
          "lit": "his"
        },
        {
          "lit": "."
        },
        {
          "lit": "_invCooldownMax"
        },
        {
          "lit": "="
        },
        {
          "lit": "(window.__DGF&&window.__DGF.pvpcd)?1:"
        },
        {
          "lit": "3),"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_invIsAvail"
        },
        {
          "lit": "="
        }
      ],
      "anchor": "_invCooldownMax",
      "expect": "his._invCooldownMax=(window.__DGF&&window.__DGF.pvpcd)?1:3),this._invIsAvail=",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 839661,
      "orig_core": "",
      "patch_core": "(window.__DGF&&window.__DGF.pvpcd)?1:",
      "radius": 80,
      "id": 8,
      "feature": "PvP Cooldown Skip  [flag: pvpcd]"
    },
    {
      "find": "apBox\\.addChild\\((?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\)\\}\\},setupAbilsBox:function\\(\\)\\{for\\(var\\ (?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)=0,(?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)=this\\._abilsBox\\.get_numChildren\\(",
      "repl_segs": [
        {
          "lit": "apBox"
        },
        {
          "lit": "."
        },
        {
          "lit": "addChild"
        },
        {
          "lit": "("
        },
        {
          "grp": "g0"
        },
        {
          "lit": ")}},"
        },
        {
          "lit": "setupAbilsBox"
        },
        {
          "lit": ":"
        },
        {
          "lit": "function"
        },
        {
          "lit": "(){"
        },
        {
          "lit": "try{window.__DG_HUD=this;}catch(e){}"
        },
        {
          "lit": "for"
        },
        {
          "lit": "("
        },
        {
          "lit": "var"
        },
        {
          "lit": " "
        },
        {
          "grp": "g1"
        },
        {
          "lit": "=0,"
        },
        {
          "grp": "g2"
        },
        {
          "lit": "="
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_abilsBox"
        },
        {
          "lit": "."
        },
        {
          "lit": "get_numChildren"
        },
        {
          "lit": "("
        }
      ],
      "anchor": "get_numChildren",
      "expect": "apBox.addChild(d)}},setupAbilsBox:function(){try{window.__DG_HUD=this;}catch(e){}for(var a=0,b=this._abilsBox.get_numChildren(",
      "strategy": "generalized",
      "ctx": 45,
      "a_pos": 849429,
      "orig_core": "",
      "patch_core": "try{window.__DG_HUD=this;}catch(e){}",
      "radius": 130,
      "id": 9,
      "feature": "inline logic edit"
    },
    {
      "find": "ssedTurn:function\\(\\)\\{0<this\\._invCooldown\\&",
      "repl_segs": [
        {
          "lit": "ssedTurn"
        },
        {
          "lit": ":"
        },
        {
          "lit": "function"
        },
        {
          "lit": "(){"
        },
        {
          "lit": "(window.__DGF&&window.__DGF.turnreset)&&(this._itemsUsedThisTurn=0);"
        },
        {
          "lit": "0<"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_invCooldown"
        },
        {
          "lit": "&"
        }
      ],
      "anchor": "_invCooldown",
      "expect": "ssedTurn:function(){(window.__DGF&&window.__DGF.turnreset)&&(this._itemsUsedThisTurn=0);0<this._invCooldown&",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 851677,
      "orig_core": "",
      "patch_core": "(window.__DGF&&window.__DGF.turnreset)&&(this._itemsUsedThisTurn=0);",
      "radius": 80,
      "id": 10,
      "feature": "Turn Reset  [flag: turnreset]"
    },
    {
      "find": "=(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.data\\&\\&null!=(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\.data\\.choseItem\\&\\&\\(this\\._itemsBtn\\.addChild\\(this\\._itemsBtnOff\\),this\\._itemsBt",
      "repl_segs": [
        {
          "lit": "="
        },
        {
          "grp": "g0"
        },
        {
          "lit": "."
        },
        {
          "lit": "data"
        },
        {
          "lit": "&&"
        },
        {
          "lit": "null"
        },
        {
          "lit": "!="
        },
        {
          "grp": "g1"
        },
        {
          "lit": "."
        },
        {
          "lit": "data"
        },
        {
          "lit": "."
        },
        {
          "lit": "choseItem"
        },
        {
          "lit": "&&("
        },
        {
          "lit": "this._itemsUsedThisTurn=(this._itemsUsedThisTurn||0)+1,((window.__DGF&&window.__DGF.items5)?5<=this._itemsUsedThisTurn:!0)&&(this._itemsUsedThisTurn=0,"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_itemsBtn"
        },
        {
          "lit": "."
        },
        {
          "lit": "addChild"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_itemsBtnOff"
        },
        {
          "lit": "),"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_itemsBt"
        }
      ],
      "anchor": "_itemsBtnOff",
      "expect": "=a.data&&null!=a.data.choseItem&&(this._itemsUsedThisTurn=(this._itemsUsedThisTurn||0)+1,((window.__DGF&&window.__DGF.items5)?5<=this._itemsUsedThisTurn:!0)&&(this._itemsUsedThisTurn=0,this._itemsBtn.addChild(this._itemsBtnOff),this._itemsBt",
      "strategy": "generalized",
      "ctx": 45,
      "a_pos": 857061,
      "orig_core": "",
      "patch_core": "UsedThisTurn=(this._itemsUsedThisTurn||0)+1,((window.__DGF&&window.__DGF.items5)?5<=this._itemsUsedThisTurn:!0)&&(this._itemsUsedThisTurn=0,this._items",
      "radius": 130,
      "id": 11,
      "feature": "5x Item Use  [flag: items5]"
    },
    {
      "find": ",this\\._itemsBtn\\.getChildAt\\(0\\)\\.set_visible\\(!1\\),null!=(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.data\\.ability\\?\\(this\\._itemsUsed\\+\\+,this",
      "repl_segs": [
        {
          "lit": ","
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_itemsBtn"
        },
        {
          "lit": "."
        },
        {
          "lit": "getChildAt"
        },
        {
          "lit": "(0)."
        },
        {
          "lit": "set_visible"
        },
        {
          "lit": "(!1"
        },
        {
          "lit": ")"
        },
        {
          "lit": "),"
        },
        {
          "lit": "null"
        },
        {
          "lit": "!="
        },
        {
          "grp": "g0"
        },
        {
          "lit": "."
        },
        {
          "lit": "data"
        },
        {
          "lit": "."
        },
        {
          "lit": "ability"
        },
        {
          "lit": "?("
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_itemsUsed"
        },
        {
          "lit": "++,"
        },
        {
          "lit": "this"
        }
      ],
      "anchor": "set_visible",
      "expect": ",this._itemsBtn.getChildAt(0).set_visible(!1)),null!=a.data.ability?(this._itemsUsed++,this",
      "strategy": "generalized",
      "ctx": 45,
      "a_pos": 857287,
      "orig_core": "",
      "patch_core": ")",
      "radius": 130,
      "id": 12,
      "feature": "inline logic edit"
    },
    {
      "find": ",(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.items=\\[\\],(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\.name=\"Player\"\\+\\(1(?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\*Math\\.random\\(\\)",
      "repl_segs": [
        {
          "lit": ","
        },
        {
          "grp": "g0"
        },
        {
          "lit": "."
        },
        {
          "lit": "items"
        },
        {
          "lit": "=[],"
        },
        {
          "grp": "g1"
        },
        {
          "lit": "."
        },
        {
          "lit": "name"
        },
        {
          "lit": "=\""
        },
        {
          "lit": "BOT_"
        },
        {
          "lit": "\"+(1"
        },
        {
          "grp": "g2"
        },
        {
          "lit": "*"
        },
        {
          "lit": "Math"
        },
        {
          "lit": "."
        },
        {
          "lit": "random"
        },
        {
          "lit": "()"
        }
      ],
      "anchor": "random",
      "expect": ",b.items=[],b.name=\"BOT_\"+(1e7*Math.random()",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 1101777,
      "orig_core": "Player",
      "patch_core": "BOT_",
      "radius": 86,
      "id": 13,
      "feature": "inline logic edit"
    },
    {
      "find": "his\\._fullTimeToWait=240,this\\._isWorking=",
      "repl_segs": [
        {
          "lit": "his"
        },
        {
          "lit": "."
        },
        {
          "lit": "_fullTimeToWait"
        },
        {
          "lit": "="
        },
        {
          "lit": "(window.__DGF&&window.__DGF.itemtimer)?0:"
        },
        {
          "lit": "240,"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_isWorking"
        },
        {
          "lit": "="
        }
      ],
      "anchor": "_fullTimeToWait",
      "expect": "his._fullTimeToWait=(window.__DGF&&window.__DGF.itemtimer)?0:240,this._isWorking=",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 1301737,
      "orig_core": "",
      "patch_core": "(window.__DGF&&window.__DGF.itemtimer)?0:",
      "radius": 80,
      "id": 14,
      "feature": "Item Timer Skip  [flag: itemtimer]"
    },
    {
      "find": "_timeToTick:null,_timerToTick:null,_isWorking:null,_dispatcher:null,startTimer:function\\(\\)\\{this\\._isWorking=!0,this\\._timerToTick=new\\ (?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\(this\\._timeToTick\\),this\\._timerToTick\\.run=(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\(this",
      "repl_segs": [
        {
          "lit": "_timeToTick"
        },
        {
          "lit": ":"
        },
        {
          "lit": "null"
        },
        {
          "lit": ","
        },
        {
          "lit": "_timerToTick"
        },
        {
          "lit": ":"
        },
        {
          "lit": "null"
        },
        {
          "lit": ","
        },
        {
          "lit": "_isWorking"
        },
        {
          "lit": ":"
        },
        {
          "lit": "null"
        },
        {
          "lit": ","
        },
        {
          "lit": "_dispatcher"
        },
        {
          "lit": ":"
        },
        {
          "lit": "null"
        },
        {
          "lit": ","
        },
        {
          "lit": "startTimer"
        },
        {
          "lit": ":"
        },
        {
          "lit": "function"
        },
        {
          "lit": "(){"
        },
        {
          "lit": "if(window.__DGF&&window.__DGF.itemtimer){this._isWorking=!1;this._timeToWait=0;this.dispatch(new da(\"complete\"));return;}"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_isWorking"
        },
        {
          "lit": "=!0,"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_timerToTick"
        },
        {
          "lit": "="
        },
        {
          "lit": "new"
        },
        {
          "lit": " "
        },
        {
          "grp": "g0"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_timeToTick"
        },
        {
          "lit": "),"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_timerToTick"
        },
        {
          "lit": "."
        },
        {
          "lit": "run"
        },
        {
          "lit": "="
        },
        {
          "grp": "g1"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        }
      ],
      "anchor": "_timerToTick",
      "expect": "_timeToTick:null,_timerToTick:null,_isWorking:null,_dispatcher:null,startTimer:function(){if(window.__DGF&&window.__DGF.itemtimer){this._isWorking=!1;this._timeToWait=0;this.dispatch(new da(\"complete\"));return;}this._isWorking=!0,this._timerToTick=new ik(this._timeToTick),this._timerToTick.run=g(this",
      "strategy": "generalized",
      "ctx": 90,
      "a_pos": 1302041,
      "orig_core": "",
      "patch_core": "if(window.__DGF&&window.__DGF.itemtimer){this._isWorking=!1;this._timeToWait=0;this.dispatch(new da(\"complete\"));return;}",
      "radius": 220,
      "id": 15,
      "feature": "Item Timer Skip  [flag: itemtimer]"
    },
    {
      "find": "ction\\(\\)\\{return\\ this\\._dispatcher\\.hasEventListener\\(\"change\"\\)\\},getLeftTime:function\\(\\)\\{return\\ this\\._timeToWait\\},addListener:function\\((?P<g0>[A-Za-z_$][A-Za-z0-9_$]*),(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\)\\{this\\._dispatcher\\.addEventListener\\((?P<g2>[A-Za-z_$][A-Za-z0-9_$]*),(?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\)\\},remove",
      "repl_segs": [
        {
          "lit": "ction"
        },
        {
          "lit": "(){"
        },
        {
          "lit": "return"
        },
        {
          "lit": " "
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_dispatcher"
        },
        {
          "lit": "."
        },
        {
          "lit": "hasEventListener"
        },
        {
          "lit": "(\""
        },
        {
          "lit": "change"
        },
        {
          "lit": "\")},"
        },
        {
          "lit": "getLeftTime"
        },
        {
          "lit": ":"
        },
        {
          "lit": "function"
        },
        {
          "lit": "(){"
        },
        {
          "lit": "return"
        },
        {
          "lit": " "
        },
        {
          "lit": "(window.__DGF&&window.__DGF.itemtimer)?0:"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_timeToWait"
        },
        {
          "lit": "},"
        },
        {
          "lit": "addListener"
        },
        {
          "lit": ":"
        },
        {
          "lit": "function"
        },
        {
          "lit": "("
        },
        {
          "grp": "g0"
        },
        {
          "lit": ","
        },
        {
          "grp": "g1"
        },
        {
          "lit": "){"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_dispatcher"
        },
        {
          "lit": "."
        },
        {
          "lit": "addEventListener"
        },
        {
          "lit": "("
        },
        {
          "grp": "g2"
        },
        {
          "lit": ","
        },
        {
          "grp": "g3"
        },
        {
          "lit": ")},"
        },
        {
          "lit": "remove"
        }
      ],
      "anchor": "hasEventListener",
      "expect": "ction(){return this._dispatcher.hasEventListener(\"change\")},getLeftTime:function(){return (window.__DGF&&window.__DGF.itemtimer)?0:this._timeToWait},addListener:function(a,b){this._dispatcher.addEventListener(a,b)},remove",
      "strategy": "generalized",
      "ctx": 90,
      "a_pos": 1302606,
      "orig_core": "",
      "patch_core": "(window.__DGF&&window.__DGF.itemtimer)?0:",
      "radius": 220,
      "id": 16,
      "feature": "Item Timer Skip  [flag: itemtimer]"
    },
    {
      "find": "ialBattle:(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.specialBattle\\};(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\.get\\(this\\._overlay\\)\\.tto\\(\\{alpha:1\\},350\\)\\.call\\(function\\(\\)\\{return\\ (?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\.removeChild\\((?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\._pvpModal\\),(?P<g4>[A-Za-z_$][A-Za-z0-9_$]*)\\._pvpModal\\.removeEventListener\\(\"close\",(?P<g5>[A-Za-z_$][A-Za-z0-9_$]*)\\((?P<g6>[A-Za-z_$][A-Za-z0-9_$]*),(?P<g7>[A-Za-z_$][A-Za-z0-9_$]*)\\.handleClosePVP\\)\\),",
      "repl_segs": [
        {
          "lit": "ialBattle"
        },
        {
          "lit": ":"
        },
        {
          "grp": "g0"
        },
        {
          "lit": "."
        },
        {
          "lit": "specialBattle"
        },
        {
          "lit": "};"
        },
        {
          "grp": "g1"
        },
        {
          "lit": "."
        },
        {
          "lit": "get"
        },
        {
          "lit": "("
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_overlay"
        },
        {
          "lit": ")."
        },
        {
          "lit": "tto"
        },
        {
          "lit": "({"
        },
        {
          "lit": "alpha"
        },
        {
          "lit": ":1},350)."
        },
        {
          "lit": "call"
        },
        {
          "lit": "("
        },
        {
          "lit": "function"
        },
        {
          "lit": "(){"
        },
        {
          "lit": "return"
        },
        {
          "lit": " "
        },
        {
          "lit": "(null!=b._pvpModal&&("
        },
        {
          "grp": "g2"
        },
        {
          "lit": "."
        },
        {
          "lit": "removeChild"
        },
        {
          "lit": "("
        },
        {
          "grp": "g3"
        },
        {
          "lit": "."
        },
        {
          "lit": "_pvpModal"
        },
        {
          "lit": "),"
        },
        {
          "grp": "g4"
        },
        {
          "lit": "."
        },
        {
          "lit": "_pvpModal"
        },
        {
          "lit": "."
        },
        {
          "lit": "removeEventListener"
        },
        {
          "lit": "(\""
        },
        {
          "lit": "close"
        },
        {
          "lit": "\","
        },
        {
          "grp": "g5"
        },
        {
          "lit": "("
        },
        {
          "grp": "g6"
        },
        {
          "lit": ","
        },
        {
          "grp": "g7"
        },
        {
          "lit": "."
        },
        {
          "lit": "handleClosePVP"
        },
        {
          "lit": ")),"
        }
      ],
      "anchor": "removeEventListener",
      "expect": "ialBattle:c.specialBattle};k.get(this._overlay).tto({alpha:1},350).call(function(){return (null!=b._pvpModal&&(b.removeChild(b._pvpModal),b._pvpModal.removeEventListener(\"close\",g(b,b.handleClosePVP)),",
      "strategy": "generalized",
      "ctx": 90,
      "a_pos": 1333240,
      "orig_core": "",
      "patch_core": "(null!=b._pvpModal&&(",
      "radius": 220,
      "id": 17,
      "feature": "inline logic edit"
    },
    {
      "find": "ttle\\)\\),(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\._pvpModal\\.destroy\\(\\),(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\._pvpModal=null,(?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\.dispatchEvent\\(new\\ (?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\((?P<g4>[A-Za-z_$][A-Za-z0-9_$]*)\\.START_BATTLE,(?P<g5>[A-Za-z_$][A-Za-z0-9_$]*)\\)\\)\\}\\)",
      "repl_segs": [
        {
          "lit": "ttle"
        },
        {
          "lit": ")),"
        },
        {
          "grp": "g0"
        },
        {
          "lit": "."
        },
        {
          "lit": "_pvpModal"
        },
        {
          "lit": "."
        },
        {
          "lit": "destroy"
        },
        {
          "lit": "(),"
        },
        {
          "grp": "g1"
        },
        {
          "lit": "."
        },
        {
          "lit": "_pvpModal"
        },
        {
          "lit": "="
        },
        {
          "lit": "null"
        },
        {
          "lit": "))"
        },
        {
          "lit": ","
        },
        {
          "grp": "g2"
        },
        {
          "lit": "."
        },
        {
          "lit": "dispatchEvent"
        },
        {
          "lit": "("
        },
        {
          "lit": "new"
        },
        {
          "lit": " "
        },
        {
          "grp": "g3"
        },
        {
          "lit": "("
        },
        {
          "grp": "g4"
        },
        {
          "lit": "."
        },
        {
          "lit": "START_BATTLE"
        },
        {
          "lit": ","
        },
        {
          "grp": "g5"
        },
        {
          "lit": "))})"
        }
      ],
      "anchor": "dispatchEvent",
      "expect": "ttle)),b._pvpModal.destroy(),b._pvpModal=null)),b.dispatchEvent(new ja(Ua.START_BATTLE,d))})",
      "strategy": "generalized",
      "ctx": 45,
      "a_pos": 1333449,
      "orig_core": "",
      "patch_core": "))",
      "radius": 130,
      "id": 18,
      "feature": "inline logic edit"
    },
    {
      "find": "tton\\.set_enabled\\(!0\\)\\},onContinueButtonCl",
      "repl_segs": [
        {
          "lit": "tton"
        },
        {
          "lit": "."
        },
        {
          "lit": "set_enabled"
        },
        {
          "lit": "(!0)"
        },
        {
          "lit": ",window.__DG_RESULT=this"
        },
        {
          "lit": "},"
        },
        {
          "lit": "onContinueButtonCl"
        }
      ],
      "anchor": "onContinueButtonCl",
      "expect": "tton.set_enabled(!0),window.__DG_RESULT=this},onContinueButtonCl",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 1494748,
      "orig_core": "",
      "patch_core": ",window.__DG_RESULT=this",
      "radius": 80,
      "id": 19,
      "feature": "inline logic edit"
    },
    {
      "find": "\\.indexOf\\((?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\)\\&\\&\\((?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\+=(?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\),12==(?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\.length\\)break\\}if\\(",
      "repl_segs": [
        {
          "lit": "."
        },
        {
          "lit": "indexOf"
        },
        {
          "lit": "("
        },
        {
          "grp": "g0"
        },
        {
          "lit": ")&&("
        },
        {
          "grp": "g1"
        },
        {
          "lit": "+="
        },
        {
          "grp": "g2"
        },
        {
          "lit": "),"
        },
        {
          "lit": "((window.__DGF&&window.__DGF.nickval)?20:"
        },
        {
          "lit": "12"
        },
        {
          "lit": ")"
        },
        {
          "lit": "=="
        },
        {
          "grp": "g3"
        },
        {
          "lit": "."
        },
        {
          "lit": "length"
        },
        {
          "lit": ")"
        },
        {
          "lit": "break"
        },
        {
          "lit": "}"
        },
        {
          "lit": "if"
        },
        {
          "lit": "("
        }
      ],
      "anchor": "indexOf",
      "expect": ".indexOf(x)&&(t+=x),((window.__DGF&&window.__DGF.nickval)?20:12)==t.length)break}if(",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 2260061,
      "orig_core": "12",
      "patch_core": "((window.__DGF&&window.__DGF.nickval)?20:12)",
      "radius": 82,
      "id": 20,
      "feature": "Nickname Validation Bypass  [flag: nickval]"
    },
    {
      "find": "kField\\.set_maxChars\\(12\\),this\\._nickField\\.",
      "repl_segs": [
        {
          "lit": "kField"
        },
        {
          "lit": "."
        },
        {
          "lit": "set_maxChars"
        },
        {
          "lit": "("
        },
        {
          "lit": "(window.__DGF&&window.__DGF.nicklen)?20:"
        },
        {
          "lit": "12),"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_nickField"
        },
        {
          "lit": "."
        }
      ],
      "anchor": "set_maxChars",
      "expect": "kField.set_maxChars((window.__DGF&&window.__DGF.nicklen)?20:12),this._nickField.",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 2357365,
      "orig_core": "",
      "patch_core": "(window.__DGF&&window.__DGF.nicklen)?20:",
      "radius": 80,
      "id": 21,
      "feature": "Nickname Length Unlock  [flag: nicklen]"
    },
    {
      "find": "htRandom:function\\(\\)\\{var\\ (?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)=this;this\\._mat",
      "repl_segs": [
        {
          "lit": "htRandom"
        },
        {
          "lit": ":"
        },
        {
          "lit": "function"
        },
        {
          "lit": "(){"
        },
        {
          "lit": "if(typeof window!==\"undefined\"&&window.__DG_FORCEBOT===true){try{return window.$DW[\"co.doubleduck.dynamons3.meta.BotBattleMatchmake\"].Instance().createFight(null)}catch(e){console.log(\"[DG] bot redirect failed\",e)}}"
        },
        {
          "lit": "var"
        },
        {
          "lit": " "
        },
        {
          "grp": "g0"
        },
        {
          "lit": "="
        },
        {
          "lit": "this"
        },
        {
          "lit": ";"
        },
        {
          "lit": "this"
        },
        {
          "lit": "."
        },
        {
          "lit": "_mat"
        }
      ],
      "anchor": "htRandom",
      "expect": "htRandom:function(){if(typeof window!==\"undefined\"&&window.__DG_FORCEBOT===true){try{return window.$DW[\"co.doubleduck.dynamons3.meta.BotBattleMatchmake\"].Instance().createFight(null)}catch(e){console.log(\"[DG] bot redirect failed\",e)}}var a=this;this._mat",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 2396919,
      "orig_core": "",
      "patch_core": "if(typeof window!==\"undefined\"&&window.__DG_FORCEBOT===true){try{return window.$DW[\"co.doubleduck.dynamons3.meta.BotBattleMatchmake\"].Instance().createFight(null)}catch(e){console.log(\"[DG] bot redirect failed\",e)}}",
      "radius": 80,
      "id": 22,
      "feature": "near string: undefined"
    },
    {
      "find": "tring=function\\((?P<g0>[A-Za-z_$][A-Za-z0-9_$]*),(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\)\\{if\\(0==(?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\.length\\)return\\ (?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)(?P<g4>[A-Za-z_$][A-Za-z0-9_$]*)(?P<g5>[A-Za-z_$][A-Za-z0-9_$]*)\\ (?P<g6>[A-Za-z_$][A-Za-z0-9_$]*);if\\(null==(?P<g7>[A-Za-z_$][A-Za-z0-9_$]*)\\)\\{if\\(null=",
      "repl_segs": [
        {
          "lit": "tring"
        },
        {
          "lit": "="
        },
        {
          "lit": "function"
        },
        {
          "lit": "("
        },
        {
          "grp": "g0"
        },
        {
          "lit": ","
        },
        {
          "grp": "g1"
        },
        {
          "lit": "){"
        },
        {
          "lit": "var __dgs=a;"
        },
        {
          "lit": "if"
        },
        {
          "lit": "(0=="
        },
        {
          "grp": "g2"
        },
        {
          "lit": "."
        },
        {
          "lit": "length"
        },
        {
          "lit": ")"
        },
        {
          "lit": "{var __e=new w;try{__e._dgText=\"\";}catch(_){}"
        },
        {
          "lit": "return"
        },
        {
          "lit": " "
        },
        {
          "lit": "__"
        },
        {
          "grp": "g4"
        },
        {
          "lit": ";"
        },
        {
          "lit": "}"
        },
        {
          "lit": "if"
        },
        {
          "lit": "("
        },
        {
          "lit": "null"
        },
        {
          "lit": "=="
        },
        {
          "grp": "g7"
        },
        {
          "lit": "){"
        },
        {
          "lit": "if"
        },
        {
          "lit": "("
        },
        {
          "lit": "null"
        },
        {
          "lit": "="
        }
      ],
      "anchor": "function",
      "expect": "tring=function(a,b){var __dgs=a;if(0==a.length){var __e=new w;try{__e._dgText=\"\";}catch(_){}return __e;}if(null==b){if(null=",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 2500201,
      "orig_core": "if(0==a.length)return new w;",
      "patch_core": "var __dgs=a;if(0==a.length){var __e=new w;try{__e._dgText=\"\";}catch(_){}return __e;}",
      "radius": 108,
      "id": 23,
      "feature": "inline logic edit"
    },
    {
      "find": "\\.set_x\\((?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.get_x\\(\\)\\-(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\);return\\ (?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\},(?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\.getChar=",
      "repl_segs": [
        {
          "lit": "."
        },
        {
          "lit": "set_x"
        },
        {
          "lit": "("
        },
        {
          "grp": "g0"
        },
        {
          "lit": "."
        },
        {
          "lit": "get_x"
        },
        {
          "lit": "()-"
        },
        {
          "grp": "g1"
        },
        {
          "lit": ");"
        },
        {
          "lit": "try{d._dgText=__dgs;}catch(_){}"
        },
        {
          "lit": "return"
        },
        {
          "lit": " "
        },
        {
          "grp": "g2"
        },
        {
          "lit": "},"
        },
        {
          "grp": "g3"
        },
        {
          "lit": "."
        },
        {
          "lit": "getChar"
        },
        {
          "lit": "="
        }
      ],
      "anchor": "getChar",
      "expect": ".set_x(f.get_x()-a);try{d._dgText=__dgs;}catch(_){}return d},I.getChar=",
      "strategy": "generalized",
      "ctx": 20,
      "a_pos": 2500831,
      "orig_core": "",
      "patch_core": "try{d._dgText=__dgs;}catch(_){}",
      "radius": 80,
      "id": 24,
      "feature": "inline logic edit"
    },
    {
      "find": "inigame\",(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.TIP_FONT=(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\.WHITE_SMALL,(?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\.MAX_DEF=500,(?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\._inited=!1,(?P<g4>[A-Za-z_$][A-Za-z0-9_$]*)\\._dispatcher=new\\ (?P<g5>[A-Za-z_$][A-Za-z0-9_$]*),(?P<g6>[A-Za-z_$][A-Za-z0-9_$]*)\\._need",
      "repl_segs": [
        {
          "lit": "inigame"
        },
        {
          "lit": "\","
        },
        {
          "grp": "g0"
        },
        {
          "lit": "."
        },
        {
          "lit": "TIP_FONT"
        },
        {
          "lit": "="
        },
        {
          "grp": "g1"
        },
        {
          "lit": "."
        },
        {
          "lit": "WHITE_SMALL"
        },
        {
          "lit": ","
        },
        {
          "grp": "g2"
        },
        {
          "lit": "."
        },
        {
          "lit": "MAX_DEF"
        },
        {
          "lit": "="
        },
        {
          "lit": "(window.__DGF&&window.__DGF.maxdef)?100000000000000:"
        },
        {
          "lit": "500,"
        },
        {
          "grp": "g3"
        },
        {
          "lit": "."
        },
        {
          "lit": "_inited"
        },
        {
          "lit": "=!1,"
        },
        {
          "grp": "g4"
        },
        {
          "lit": "."
        },
        {
          "lit": "_dispatcher"
        },
        {
          "lit": "="
        },
        {
          "lit": "new"
        },
        {
          "lit": " "
        },
        {
          "grp": "g5"
        },
        {
          "lit": ","
        },
        {
          "grp": "g6"
        },
        {
          "lit": "."
        },
        {
          "lit": "_need"
        }
      ],
      "anchor": "WHITE_SMALL",
      "expect": "inigame\",hd.TIP_FONT=O.WHITE_SMALL,h.MAX_DEF=(window.__DGF&&window.__DGF.maxdef)?100000000000000:500,h._inited=!1,h._dispatcher=new Aa,h._need",
      "strategy": "generalized",
      "ctx": 45,
      "a_pos": 4965953,
      "orig_core": "",
      "patch_core": "(window.__DGF&&window.__DGF.maxdef)?100000000000000:",
      "radius": 130,
      "id": 25,
      "feature": "Max Defense Cap  [flag: maxdef]"
    },
    {
      "find": "(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.shopPromoIds=\\[\"unlimited_snacks_sale\"\\]",
      "repl_segs": [
        {
          "lit": "Object.defineProperty("
        },
        {
          "grp": "g0"
        },
        {
          "lit": ",\"shopPromoIds\",{configurable:true,get:function(){return [];}})"
        }
      ],
      "anchor": "shopPromoIds=[\"unlimited_snacks_sale\"]",
      "radius": 200,
      "ctx": 0,
      "strategy": "generalized",
      "orig_core": "fb.shopPromoIds=[\"unlimited_snacks_sale\"]",
      "patch_core": "Object.defineProperty(fb,\"shopPromoIds\",{configurable:true,get:function(){return [];}})",
      "expect": "Object.defineProperty(fb,\"shopPromoIds\",{configurable:true,get:function(){return [];}})",
      "id": 26,
      "a_pos": 4967502,
      "feature": "near string: shopPromoIds"
    },
    {
      "find": "elete\\ define\\.__amd\\);",
      "repl_segs": [
        {
          "lit": "elete define.__amd);"
        }
      ],
      "anchor": "define",
      "expect": "elete define.__amd);\n;(function(){try{if(window.__DG_ERRCATCH)return;window.__DG_ERRCATCH=1;function box(title,msg){try{var d=document.getElementById('dg_err');if(!d){d=document.createElement('div');d.id='dg_err';d.style.cssText='position:fixed;left:8px;right:8px;top:90px;max-height:70vh;overflow:auto;z-index:2147483647;background:rgba(140,0,0,.96);color:#fff;font:12px/1.4 monospace;padding:12px;border:2px solid #ff5555;border-radius:10px;white-space:pre-wrap;word-break:break-word;box-shadow:0 8px 30px rgba(0,0,0,.6)';var x=document.createElement('div');x.textContent='\\u2715 close';x.style.cssText='position:sticky;top:0;float:right;cursor:pointer;background:#fff;color:#900;padding:2px 8px;border-radius:6px;font-weight:700';x.onclick=function(){d.remove();};d.appendChild(x);var c=document.createElement('div');c.textContent='\\u29C9 copy';c.style.cssText='position:sticky;top:0;float:right;margin-right:8px;cursor:pointer;background:#fff;color:#900;padding:2px 8px;border-radius:6px;font-weight:700';c.onclick=function(){try{navigator.clipboard.writeText(d.innerText);}catch(e){}};d.appendChild(c);var p=document.createElement('div');p.id='dg_err_body';d.appendChild(p);document.body.appendChild(d);}var body=document.getElementById('dg_err_body');body.textContent=(body.textContent?body.textContent+'\\n\\n---\\n':'')+'['+title+']\\n'+msg;}catch(e){}}window.addEventListener('error',function(e){try{if(e&&e.target&&e.target!==window&&(e.target.tagName||e.target.src||e.target.href))return;if(!e.message&&!e.error)return;var m=(e.message||'')+'\\n@ '+(e.filename||'?')+':'+(e.lineno||'?')+':'+(e.colno||'?');if(e.error&&e.error.stack)m+='\\n'+e.error.stack;box('JS ERROR',m);}catch(_){}}, true);window.addEventListener('unhandledrejection',function(e){try{var r=e.reason;box('PROMISE REJECTION',(r&&(r.stack||r.message))||String(r));}catch(_){}});}catch(e){}})();\n\n;\n",
      "strategy": "compatibility-noop",
      "ctx": 20,
      "a_pos": 5070158,
      "orig_core": "",
      "patch_core": "",
      "radius": 80,
      "id": 27,
      "feature": "Internal error isolation (no visible debug overlay)"
    },
    {
      "find": "0\\=\\=e\\.getId\\(\\)\\.indexOf\\(\\\"suit\\#inferno\\\"\\)\\&\\&h\\.setItemAmount\\(\\\"inferno_suit\\\"\\,1\\)",
      "repl_segs": [
        {
          "lit": "0==e.getId().indexOf(\"suit#inferno\")&&(h.setItemAmount(\"inferno_suit\",1),h.setItemAmount(\"inferno_armor\",1))"
        }
      ],
      "anchor": "setItemAmount(\"inferno_suit\"",
      "expect": "0==e.getId().indexOf(\"suit#inferno\")&&(h.setItemAmount(\"inferno_suit\",1),h.setItemAmount(\"inferno_armor\",1))",
      "strategy": "literal",
      "radius": 200,
      "id": 28,
      "feature": "Inferno suit: grant inferno_armor so it appears in items"
    },
    {
      "find": "openFortuneWheel:function\\(\\)\\{if\\((?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.isEnoughMemoryForContinue\\((?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\.memoryInfo\\)\\)\\{var\\ (?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)=new\\ (?P<g3>[A-Za-z_$][A-Za-z0-9_$]*);(?P=g2)\\.addEventListener\\(\"close\",(?P<g4>[A-Za-z_$][A-Za-z0-9_$]*)\\(this,this\\.handleCloseModal\\)\\),this\\._modalLayer\\.addChild\\((?P=g2)\\),this\\.toggleScrolls\\(!1\\)\\}\\}",
      "repl_segs": [
        {
          "lit": "openFortuneWheel:function(){if((window||self).$DG&&(window||self).$DG.spin){if("
        },
        {
          "grp": "g0"
        },
        {
          "lit": ".isEnoughMemoryForContinue("
        },
        {
          "grp": "g1"
        },
        {
          "lit": ".memoryInfo)){var "
        },
        {
          "grp": "g2"
        },
        {
          "lit": "=new "
        },
        {
          "grp": "g3"
        },
        {
          "lit": ";"
        },
        {
          "grp": "g2"
        },
        {
          "lit": ".addEventListener(\"close\","
        },
        {
          "grp": "g4"
        },
        {
          "lit": "(this,this.handleCloseModal)),this._modalLayer.addChild("
        },
        {
          "grp": "g2"
        },
        {
          "lit": "),this.toggleScrolls(!1)}}else this.handleCloseWheel()}"
        }
      ],
      "anchor": "openFortuneWheel:function()",
      "expect": "openFortuneWheel:function(){if((window||self).$DG&&(window||self).$DG.spin){if(ja.isEnoughMemoryForContinue(h.memoryInfo)){var a=new Xg;a.addEventListener(\"close\",g(this,this.handleCloseModal)),this._modalLayer.addChild(a),this.toggleScrolls(!1)}}else this.handleCloseWheel()}",
      "strategy": "literal",
      "radius": 400,
      "id": 29,
      "feature": "Remove Fortune/Spin wheel (worlds + after battles) \u2014 gated by $DG.spin"
    },
    {
      "find": "(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.setPreferedAsTimeScale=function\\(\\)\\{(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\.setTimeScale\\((?P=g0)\\._preferTimeScale\\),(?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\.setTimeScale\\((?P=g0)\\._preferTimeScale\\),(?P=g0)\\.dispatch\\(new\\ (?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\(\"TIME_SCALE_CHANGED\"\\)\\)\\}",
      "repl_segs": [
        {
          "grp": "g0"
        },
        {
          "lit": ".setPreferedAsTimeScale=function(){var __s=(window||self).$DG&&+(window||self).$DG.speed||"
        },
        {
          "grp": "g0"
        },
        {
          "lit": "._preferTimeScale;"
        },
        {
          "grp": "g1"
        },
        {
          "lit": ".setTimeScale(__s),"
        },
        {
          "grp": "g2"
        },
        {
          "lit": ".setTimeScale(__s),"
        },
        {
          "grp": "g0"
        },
        {
          "lit": ".dispatch(new "
        },
        {
          "grp": "g3"
        },
        {
          "lit": "(\"TIME_SCALE_CHANGED\"))},((window||self).$DG=(window||self).$DG||{}).applySpeed=function(){var __t=+((window||self).$DG.speed)||0;if(__t<=0)return;if("
        },
        {
          "grp": "g1"
        },
        {
          "lit": ".timeScale!==__t){"
        },
        {
          "grp": "g1"
        },
        {
          "lit": ".setTimeScale(__t),"
        },
        {
          "grp": "g2"
        },
        {
          "lit": ".setTimeScale(__t)}}"
        }
      ],
      "anchor": "setPreferedAsTimeScale=function",
      "expect": "h.setPreferedAsTimeScale=function(){var __s=(window||self).$DG&&+(window||self).$DG.speed||h._preferTimeScale;k.setTimeScale(__s),Tb.setTimeScale(__s),h.dispatch(new fa(\"TIME_SCALE_CHANGED\"))},((window||self).$DG=(window||self).$DG||{}).applySpeed=function(){var __t=+((window||self).$DG.speed)||0;if(__t<=0)return;if(k.timeScale!==__t){k.setTimeScale(__t),Tb.setTimeScale(__t)}}",
      "strategy": "literal",
      "radius": 300,
      "id": 30,
      "feature": "Global speed: setPreferedAsTimeScale honors $DG.speed at FULL chosen speed (k==Tb lockstep) + drift-only $DG.applySpeed"
    },
    {
      "find": "(?P<g0>[A-Za-z_$][A-Za-z0-9_$]*)\\.resetTimeScale=function\\(\\)\\{(?P<g1>[A-Za-z_$][A-Za-z0-9_$]*)\\.setTimeScale\\(1\\),(?P<g2>[A-Za-z_$][A-Za-z0-9_$]*)\\.setTimeScale\\(1\\),(?P=g0)\\.dispatch\\(new\\ (?P<g3>[A-Za-z_$][A-Za-z0-9_$]*)\\(\"TIME_SCALE_CHANGED\"\\)\\)\\}",
      "repl_segs": [
        {
          "grp": "g0"
        },
        {
          "lit": ".resetTimeScale=function(){var __s=(window||self).$DG&&+(window||self).$DG.speed||1;"
        },
        {
          "grp": "g1"
        },
        {
          "lit": ".setTimeScale(__s),"
        },
        {
          "grp": "g2"
        },
        {
          "lit": ".setTimeScale(__s),"
        },
        {
          "grp": "g0"
        },
        {
          "lit": ".dispatch(new "
        },
        {
          "grp": "g3"
        },
        {
          "lit": "(\"TIME_SCALE_CHANGED\"))}"
        }
      ],
      "anchor": "resetTimeScale=function",
      "expect": "h.resetTimeScale=function(){var __s=(window||self).$DG&&+(window||self).$DG.speed||1;k.setTimeScale(__s),Tb.setTimeScale(__s),h.dispatch(new fa(\"TIME_SCALE_CHANGED\"))}",
      "strategy": "literal",
      "radius": 300,
      "id": 31,
      "feature": "Global speed: resetTimeScale honors $DG.speed (k==Tb lockstep)"
    },
    {
      "find": "m\\&\\&c\\?Math\\.random\\(\\)<\\.5\\?this\\._actionQeue\\.push\\(\\{type:\"wheel\"\\}\\):1!=d\\?this\\._actionQeue\\.push\\(\\{type:\"promo\",promoType:d\\}\\):\"\"!=\\(b=Cb\\.getShopPromoId\\(\\)\\)\\&\\&this\\._actionQeue\\.push\\(\\{type:\"shopPromo\",id:b\\}\\):m\\?this\\._actionQeue\\.push\\(\\{type:\"wheel\"\\}\\)",
      "repl_segs": [
        {
          "lit": "m&&c?Math.random()<.5?((window||self).$DG?(window||self).$DG.spin:!0)&&this._actionQeue.push({type:\"wheel\"}):1!=d?this._actionQeue.push({type:\"promo\",promoType:d}):\"\"!=(b=Cb.getShopPromoId())&&this._actionQeue.push({type:\"shopPromo\",id:b}):m?((window||self).$DG?(window||self).$DG.spin:!0)&&this._actionQeue.push({type:\"wheel\"})"
        }
      ],
      "anchor": "m&&c?Math.random()<.5?",
      "expect": "m&&c?Math.random()<.5?((window||self).$DG?(window||self).$DG.spin:!0)&&this._actionQeue.push({type:\"wheel\"}):1!=d?this._actionQeue.push({type:\"promo\",promoType:d}):\"\"!=(b=Cb.getShopPromoId())&&this._actionQeue.push({type:\"shopPromo\",id:b}):m?((window||self).$DG?(window||self).$DG.spin:!0)&&this._actionQeue.push({type:\"wheel\"})",
      "strategy": "exact",
      "radius": 700,
      "id": 32,
      "feature": "Spin-wheel: gate both post-battle wheel queue branches behind $DG.spin"
    },
    {
      "find": "\"arena_event_set_score_failed\"==a\\.type\\?\\(null!=\\(a=a\\.data\\.oldScore\\)&&\\(h\\.pvpSeasons\\.seasons\\.h\\[c\\]\\.scoreData\\.score=a\\),h\\.saveSeasonData\\(\\),this\\.onFailed\\(\"SET_SCORE_FAILED\"\\)\\)",
      "repl_segs": [
        {
          "lit": "\"arena_event_set_score_failed\"==a.type?(this.onFailed(\"SET_SCORE_FAILED\"))"
        }
      ],
      "anchor": "arena_event_set_score_failed",
      "expect": "\"arena_event_set_score_failed\"==a.type?(this.onFailed(\"SET_SCORE_FAILED\"))",
      "strategy": "literal",
      "radius": 300,
      "id": 33,
      "feature": "Arena trophies: stop destructive rollback on failed score write (failed write no longer erases earned trophies; next success re-pushes the true value)"
    },
    {
      "find": "h\\.pvpSeasons\\.seasons\\.h\\[this\\._currentEventId\\]\\.scoreData\\.score=c,h\\.saveMonsData\\(\\)",
      "repl_segs": [
        {
          "lit": "(c>(+h.pvpSeasons.seasons.h[this._currentEventId].scoreData.score||0)&&(h.pvpSeasons.seasons.h[this._currentEventId].scoreData.score=c)),h.saveMonsData()"
        }
      ],
      "anchor": "SCORE_RECORD_GET_FAILED",
      "expect": "(c>(+h.pvpSeasons.seasons.h[this._currentEventId].scoreData.score||0)&&(h.pvpSeasons.seasons.h[this._currentEventId].scoreData.score=c)),h.saveMonsData()",
      "strategy": "literal",
      "radius": 300,
      "id": 34,
      "feature": "Arena trophies: server-read never lowers local (onScoreRecordGot max-clamp). Stale/lagging server score can't erase earned trophies or corrupt the base used for the next reward."
    }
  ],
  "menu_edits": [
    {
      "file": "mod_menu.js",
      "id": "M1",
      "find": "var DG_ICONMAP={inferno_suit:\"images/general/char_icons/inferno_icon.png\",inferno:\"images/general/char_icons/inferno_icon.png\",",
      "replace": "var DG_ICONMAP={inferno_armor:\"images/general/char_icons/inferno_icon.png\",inferno_suit:\"images/general/char_icons/inferno_icon.png\",inferno:\"images/general/char_icons/inferno_icon.png\",",
      "feature": "Inferno: map the functional inferno_armor item to the inferno icon"
    },
    {
      "file": "mod_menu.js",
      "id": "M2",
      "find": "L.forEach(function(it){ var id=it.id; var row=mk(\"div\",{class:\"dw_item\"});",
      "replace": "L.forEach(function(it){ var id=it.id; if(id===\"inferno_suit\")return; var row=mk(\"div\",{class:\"dw_item\"});",
      "feature": "Inferno: hide the legacy duplicate inferno_suit row in the items list"
    },
    {
      "file": "mod_menu.js (speed block)",
      "id": "M3",
      "note": "Heartbeat calls $DG.applySpeed() (drift-only). NO animCap \u2014 sprite animation runs at the exact chosen speed (k==Tb), fixing Error #2007 (addChild null) in auto-grind caused by logic/animation desync."
    },
    {
      "file": "mod_menu.js (auto-grind tick)",
      "id": "M4",
      "note": "After tapping the results screen, auto-grind waits __DG_commitMs (default 2500ms) before starting the next match, so each Firebase trophy write serializes/lands (keeps local AND server in sync). Tunable: window.__DG_commitMs."
    }
  ],
  "notes": [
    "Rule #3 retained as a version-specific compatibility match: this build already has a displayMPErrors implementation without the obsolete _mpQueueTimer.stop() call.",
    "Phase 1\u20134 build: rule #27 retained as a no-op to remove the visible debug overlay while preserving the 34-rule manifest."
  ]
}
```

## Troubleshooting and change discipline

- Missing server bridge/empty Advanced: wrong/missing signed0.3 payload or hook isn't attachWithLoader; verify launch message before changing UI.
- Java menu plus anime avatar: old payload UI/other login DEX may still draw a launcher; inspect source rather than deleting login classes blindly.
- Black M floating button shown over Cloudflare too: external app overlay, not Royal Void.
- Crash immediately: check missing/overwritten original game DEX, duplicate Royal Void classes, wrong hook timing/signature, missing assets and Android crash trace.
- Rule32 ambiguity: use corrected branch-level rule and the exact original file. Do not patch modded_payload.js as though original.
- Signature mismatch: wrong key, missing metadata or malformed ciphertext; do not disable verification.
- ADMIN_KEY change only affects Worker admin auth; it is unrelated to ECDSA private key. Never confuse it with a Cloudflare API token.
- Replace only modified Java source, then manually rebuild protected DEX. Changing server config doesn't update compiled Java.
- Settings preferences are normally app-private. Uninstall-persistent backup requires explicit SAF export to a user-selected document; Android permission/scoped-storage rules apply.
- No3D engine is currently included. Motion uses native animations/glow/translucency; don't claim a3D renderer or guaranteed real backdrop blur.

For a future AI: read this file plus actual source from GitHub; do not infer missing classes/features. Preserve public hook signatures, owner-only secrets, existing website functions, no-heartbeat requirement and separation of APK/client versus owner/server tools. Add meaningful tests for new behavior; do not regenerate signing keys or silently skip failed patches. The handover intentionally contains no secret values.
