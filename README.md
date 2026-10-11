# Royal Void download branch

[Complete current system guide](MOD_SYSTEM_GUIDE.md) · [Task/sync rules](AGENTS.md) · [Delivery rules](DELIVERY_RULES.md)

[Arena/unlock/menu fixes ZIP](Royal-Void-Unlock-Party-Fixes.zip) contains 39 complete files: the full 33-file source tree, supplied build files, corrected dual-client updater, Arena/world/runtime repairs, instructions and the current guide. Includes the speed-effects note, permanent shop setting, match-time bot lock, startup controls and distinct scan colors. Read [FIXES_README.md](FIXES_README.md) before publishing/building. Local source, behavior and cryptographic checks passed. No live upload or Android build/install was performed by the assistant; real-player stability still requires phone testing.

[All Java source files](raw-project/src) · [Source-only ZIP](Royal-Void-Supplied-SRC.zip) · [Menu control inventory](CURRENT_MENU_CONTROLS.md) · [Start here](START_HERE.md) · [Archive checksums](SHA256SUMS.txt)

Superseded versioned build/archive packages and their old archive-based build workflow were removed. Necessary source, assets and build tools remain. Main remains unchanged. Other branch deletion is not completed because the connector has no branch-delete operation.

Latest update: real-player Arena automatically forces 1x and restores your saved speed after completion or leaving. The native slider displays the lock. Bot Arena and world modes keep your selected speed. Page-entry and valid Scan Team behavior remain. Apply both the updated payload and rebuilt classes7.dex. Local checks passed; Android/live-opponent validation remains pending.

Google sign-in diagnostic update (11 October 2026): [original/mod comparison](AUTH_SIGNIN_REVIEW.md) confirms original com.funtomic.dynamons3 versus mod com.funtomic.dynamons. DEX 2–4, plugin registry and plugin assets match byte-for-byte; Play Games/Firebase IDs are unchanged. The mod V1 signature verifies with the public AOSP test certificate. Original META-INF contains no signing certificate; original/installed V2/V3 signer details and phone error logs remain needed. Google profile/cloud saves and anonymous Firebase Arena ranking are distinct. Documentation and the embedded guide are refreshed; gameplay code and live services are unchanged.

Fine Engine assessment (11 October 2026): [container architecture and Dynamons compatibility](FINE_ENGINE_REVIEW.md). Static review identifies a BlackBox virtual container with Carrom-specific runtime and Google-services provisioning. This is a feasibility assessment, not a verified Dynamons port or Google-login bypass. The authoritative guide and existing complete package include the findings; gameplay files are unchanged.

Shinigami assessment (11 October 2026): [bootstrap/runtime review](SHINIGAMI_REVIEW.md). The supplied small APK downloads and verifies a separate Android runtime; its microG metadata and container declarations do not demonstrate Google login or Dynamons compatibility. The actual runtime bundle is still needed to inspect game execution. Guide and packaged guide are refreshed; gameplay files are unchanged.

Launcher baseline 0.1.0 (11 October 2026): [development APK](Dynamons-Launcher-Baseline.apk) · [complete source ZIP](Dynamons-Launcher-Baseline-SRC.zip) · [source/build instructions](launcher-baseline/README.md) · [milestone status](LAUNCHER_STATUS.md). Opens original Dynamons normally and shares installed package/signer/split diagnostics. APK compiled and V2/V3 signatures verified; phone testing remains pending. This is outside-container baseline testing, not a container or menu attachment. Private signing keys are excluded; game/menu sources and live services are unchanged.

First phone baseline received: [installed identity evidence](PHONE_BASELINE.md) records Android 16, original/mod different package and signer fingerprints, and the owner's existing Google-signed-in original installation. This is not a fresh sign-in/cloud-save or container test. The mod signer matches the prior Android test certificate. APK/gameplay code are unchanged; diagnostic guide/source archives are refreshed.
