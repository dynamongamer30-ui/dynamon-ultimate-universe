# Dynamons Container Probe 0.1.0 — experimental

This is an independently authored Android host integrated with the published SpaceCore SDK v3. Unlike the baseline launcher, it uses SDK container import/launch APIs. Compilation and APK verification are separate from an actual phone test: Android 16 game startup and Google login are not yet verified.

## First phone test

1. Keep the installed original Dynamons World (com.funtomic.dynamons3) and your existing mod. This host has its own package com.dynamongamer.containerprobe and does not replace either game.
2. Install Dynamons-Container-Probe.apk and open it.
3. Tap Import installed original game. Wait for the result. If already imported, the host reuses that installation rather than repeatedly importing it.
4. If Launch inside container becomes enabled, tap it and check whether the actual game reaches its title/tutorial/game screen. The SDK call returning is not itself proof that the game appeared.
5. Stop at this startup test, return to the host and tap Share startup report. Send the report and whether the game opened, froze or crashed. Google sign-in and save restoration are later tests after startup is established.

The container has a separate game-data area according to the SDK architecture. This host does not copy your original save or logged-in session. The game can begin with a fresh tutorial/profile; that does not mean the installed original save was removed. Independent isolation validation remains a phone-test item. Do not treat this as a replacement for your original installation or a completed mod.

If initialization fails, the host displays the caught SDK error when possible. Native process crashes may prevent the UI from appearing and require Android logs. If import drops split names/paths or the game version differs, launch stays disabled. Send that report; do not bypass the check by using only the base APK. The observed original installation has base plus three splits.

## Implemented behavior

- Initialize FCore in Application.attachBaseContext, with documented system interaction and automatic preloading disabled in the host.
- Import only the already-installed original game into virtual user 0 through FCore.installPackageAsUser(String,int).
- Reuse an existing container installation; do not auto-delete data or automatically replace a different version.
- Compare original/container versionCode, split-name sets and split-source path counts before enabling launch.
- Request virtual startup through FCore.launchApk, without claiming the return value proves success.
- Persist a bounded 32 KiB startup journal in host preferences and share text via ACTION_SEND.
- Handle SDK/import/launch Java failures where possible. No menu, microG installer, account-token handling or game patches are included.

Split metadata equality is only a preliminary check. It does not validate copied split bytes, native resources, runtime asset resolution or actual game startup. The original APK files are not rebuilt or re-signed by our host code; the SDK handles its own internal virtual representation.

## SDK and compatibility

Foundation: FSpaceCore/SpaceCore, published v3 SpaceCore-SDK.aar, release dated 13 July 2023. It is closed-source. The upstream README permits free and commercial SDK use without notifying the author; custom engine changes require its author's arrangements. Our integration uses the documented public APIs and leaves the SDK binary unchanged.

SDK SHA-256: 00f3f0ef341235b3a301df42af1e82ccb0e14fc0bde257d4ac1f0fe5c8f57f46

The SDK documentation describes Android 6–14 and future versions; this is not proof of Android 16 compatibility. This prototype is ARM64-only, minSdk 24, compileSdk 35 and targetSdk 28 to match the older container integration. An older-target compatibility message may appear on your Android 16 phone. Native page-size compatibility, hidden APIs, proxy services and Cordova/WebView behavior remain untested on the device.

The original FBlackBox engine source was removed. ALEX5402/NewBlackbox at commit 89b59836c66f173756a4ae258cf379a957649820 is an Apache-licensed alternative inspected for source availability; package-manager code reports empty splitNames in relevant paths. That is a concern for this split game, not proof that every execution path fails. It was not incorporated into this host or represented as Android 16 validated. SpaceCore provides a small, buildable public SDK integration for the current experimental test.

The SDK's default broad permission declarations were narrowed by the host manifest. The final requested permissions are INTERNET, ACCESS_NETWORK_STATE, ACCESS_WIFI_STATE, WAKE_LOCK, FOREGROUND_SERVICE and VIBRATE. No account, SMS, contacts, camera, storage, overlay, accessibility or package-install permission is requested by the final host manifest. The SDK binary remains unchanged. Restricted capabilities may cause SDK functionality to fail; this probe does not grant extra permissions to get around such failures.

## Complete project and build

The source ZIP includes all authored Java/manifest/Gradle/build files, the unchanged published SDK AAR, third-party notice and current guide. Maven dependencies resolve normally through Google/Maven Central. No SDK source is claimed, no Java files are abbreviated, and no private signing key/build outputs are included.

Build with JDK 17 or newer, Gradle 8.9 and Android SDK platform 35/build-tools 35.0.0. Gradle plugin 8.7.3 is pinned. No Gradle wrapper is included; use Android Studio/configured Gradle, or the build script with a Gradle 8.9 executable on PATH.

```sh
bash build_debug.sh
```

The script generates a local development keystore under build/keys if missing, then runs :app:assembleDebug. A local.properties SDK path can be configured by Android Studio; it is not in the source archive. The debug APK is under app/build/outputs/apk/debug/app-debug.apk. Its development signer does not replace the game signer or the payload signer.

Dependencies: com.tencent:mmkv-static:1.2.10, com.google.code.gson:gson:2.9.1, org.jetbrains.kotlin:kotlin-stdlib:1.5.30 and androidx.appcompat:appcompat:1.3.1, plus normal transitives. See THIRD_PARTY.md for the SDK provenance. The SDK is supplied to make this project complete; public release/README links are included for verification.

## Validation

Gradle debug compilation, dependency resolution, DEX generation and packaging passed on the build computer. Final APK manifest/package/ABI/permissions and alignment checks passed. Its V2 signature verifies; V3 is not present in this Gradle debug build. No emulator/phone install, game startup, actual SDK import, native crash handling, Google profile/cloud save or Arena write was tested here. Java 8 source/target deprecation and unstripped native-library build warnings do not constitute successful device validation.

A functioning SDK host is a step toward a container feasibility test, not a login fix. A container does not grant publisher authorization. No signer impersonation, engine access-control removal or server-result manipulation was authored. Menu attachment remains unimplemented, and importing the current re-signed mod is not this probe's intended path.
