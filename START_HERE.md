# Start here: current Royal Void / Thunder files

Read [MOD_SYSTEM_GUIDE.md](MOD_SYSTEM_GUIDE.md), the authoritative detailed guide. [raw-project/MOD_SYSTEM_GUIDE.md](raw-project/MOD_SYSTEM_GUIDE.md) points to the same guide rather than maintaining a conflicting copy.

## Current Arena and menu repair package

[Royal-Void-Unlock-Party-Fixes.zip](Royal-Void-Unlock-Party-Fixes.zip) preserves the complete source folder and contains 39 files including the current guide, supplied build files and corrected dual-client updater. [FIXES_README.md](FIXES_README.md) explains payload-first publication and the classes7 build/install steps. Do not use the reviewed old website upload form for the dual-client JSON; use the corrected updater's --upload command. No production publication or new DEX build has been performed here.

The refreshed updater supports two separately validated original engines: active-original SHA-256 044e46362e4a286ea279be3762c02d1934afdc682f539cb68dd194e74ec4b9cb and supplied-original SHA-256 b6f5470f21360435bc98c868bad208d79ab03493d045598a8f3924b099f818eb. Each has its own 35 base edits plus five checked potion sites (40 final edits). Unknown hashes are rejected; the original local engine in the APK must match the file used to generate the selected payload. Replace the previous updater before retrying --upload.

[Royal-Void-Supplied-SRC.zip](Royal-Void-Supplied-SRC.zip) contains only all 33 Java source files under src/. Browse them in [raw-project/src](raw-project/src). Verify archives using [SHA256SUMS.txt](SHA256SUMS.txt).

## Standing task completion rules

After every mod task, update the guide, complete changed files, links/archives/checksums and clean superseded downloads, following [AGENTS.md](AGENTS.md) and [DELIVERY_RULES.md](DELIVERY_RULES.md). Main remains unchanged unless the owner authorizes it. This is the assistant's post-task workflow, not a background sync daemon.

Older versioned ZIPs and the workflow that rebuilt an old ZIP have been removed. Historical raw-project integration/server/tool files are reference only unless explicitly synchronized against the active system. Do not deploy them as though they were the live Worker. The canonical new repair updater is raw-project/tools/update_payload_once.py.

The current package fixes numeric bot result codes, potion gating, worlds, startup control visibility, scan colors and permanent shop compatibility. Bot matchmaking locks during active matches; real-player Arena speed locks at 1x and restores your last selection afterward. Use both the updated payload and rebuilt classes7.dex for the complete change. Real-player acceptance and freezes remain device-test items.

## Latest page navigation and animation-clock update

Dashboard and every normal page open at the top when selected. Valid Scan Team results are retained; a roster/battle change clears them. Real-player Arena now automatically runs at 1x: a 60-second wait stays 60 seconds and a 400ms movement stays 400ms. Your saved selected speed returns afterward. Apply both the new payload and rebuilt classes7.dex. See the current guide for exact validation and limitations.

Google sign-in diagnostic update (11 October 2026): [original/mod comparison](AUTH_SIGNIN_REVIEW.md) confirms original com.funtomic.dynamons3 versus mod com.funtomic.dynamons. DEX 2–4, plugin registry and plugin assets match byte-for-byte; Play Games/Firebase IDs are unchanged. The mod V1 signature verifies with the public AOSP test certificate. Original META-INF contains no signing certificate; original/installed V2/V3 signer details and phone error logs remain needed. Google profile/cloud saves and anonymous Firebase Arena ranking are distinct. Documentation and the embedded guide are refreshed; gameplay code and live services are unchanged.

Fine Engine assessment (11 October 2026): [container architecture and Dynamons compatibility](FINE_ENGINE_REVIEW.md). Static review identifies a BlackBox virtual container with Carrom-specific runtime and Google-services provisioning. This is a feasibility assessment, not a verified Dynamons port or Google-login bypass. The authoritative guide and existing complete package include the findings; gameplay files are unchanged.

Shinigami assessment (11 October 2026): [bootstrap/runtime review](SHINIGAMI_REVIEW.md). The supplied small APK downloads and verifies a separate Android runtime; its microG metadata and container declarations do not demonstrate Google login or Dynamons compatibility. The actual runtime bundle is still needed to inspect game execution. Guide and packaged guide are refreshed; gameplay files are unchanged.

Launcher baseline 0.1.0 (11 October 2026): [development APK](Dynamons-Launcher-Baseline.apk) · [complete source ZIP](Dynamons-Launcher-Baseline-SRC.zip) · [source/build instructions](launcher-baseline/README.md) · [milestone status](LAUNCHER_STATUS.md). Opens original Dynamons normally and shares installed package/signer/split diagnostics. APK compiled and V2/V3 signatures verified; phone testing remains pending. This is outside-container baseline testing, not a container or menu attachment. Private signing keys are excluded; game/menu sources and live services are unchanged.

First phone baseline received: [installed identity evidence](PHONE_BASELINE.md) records Android 16, original/mod different package and signer fingerprints, and the owner's existing Google-signed-in original installation. This is not a fresh sign-in/cloud-save or container test. The mod signer matches the prior Android test certificate. APK/gameplay code are unchanged; diagnostic guide/source archives are refreshed.

Experimental container probe 0.1.0 (11 October 2026): [ARM64 test APK](Dynamons-Container-Probe.apk) · [complete source ZIP](Dynamons-Container-Probe-SRC.zip) · [instructions](container-prototype/README.md) · [milestone status](CONTAINER_PROTOTYPE_STATUS.md). Uses unchanged published SpaceCore SDK APIs to import the installed original and request container launch after version/split metadata checks. Gradle build and APK V2/alignment checks passed; Android 16 startup, actual split handling and Google login remain phone-test items. No menu/save/session copying is implemented. The baseline launcher remains available for comparison. Current guides/checksums/source archives are refreshed; main and game/menu code are unchanged.
