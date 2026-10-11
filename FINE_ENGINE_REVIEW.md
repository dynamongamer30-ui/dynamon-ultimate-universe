# Fine Engine 2.1.0 architecture and Dynamons compatibility review

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
