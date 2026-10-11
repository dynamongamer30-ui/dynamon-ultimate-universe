# Shinigami 3.3.15 bootstrap review

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
