# Launcher milestone status — 11 October 2026

## Completed

An independent native Android baseline launcher was authored and compiled. Its separate package is com.dynamongamer.launcher, version 0.1.0-baseline. It queries the expected original com.funtomic.dynamons3 and supplied mod com.funtomic.dynamons packages, lists versions/splits, reports current Android signer SHA-1/SHA-256 and checks presence of Google services/Play Games packages. It opens only the original package using Android's normal launch intent. A shared text report contains no account credentials or private game data. It cannot observe whether login or saved-progress loading succeeded.

The APK was built using SDK platform 35, build-tools 35.0.0, D8/AAPT2 and ECJ 3.40.0 with Java 21. AAPT2 package/activity/minimum/target metadata, ZIP alignment and apksigner V2/V3 verification passed. Source is delivered complete with no build outputs or signing private key included. Development APK signing is unrelated to the official game or Royal Void payload signer.

## Not completed

There is no container implementation, virtual game launch, WebView attachment, menu integration, runtime injection or Google-login fix in this milestone. No phone test was performed. Fine Engine/Shinigami compiled files are not sufficient to claim a maintainable working port. The owner confirmed that only APKs are available. The public FBlackBox/BlackBox repository has removed its source; its current README is a removal notice. A suitable maintained/licensed engine source or independently implemented container is still needed before a genuine container prototype can be built. No engine access/signature restrictions were disabled.

## Correction to earlier proposal

Launching an unmodified official game in a container was the proposed first architecture milestone. The artifact produced here launches outside a container to establish the official-login baseline and collect the missing installed certificate details. These are different milestones. The host must not be described as a working container or mod loader. Earlier conceptual attachment sequences are unimplemented design ideas, not capabilities proved by the APKs inspected.

## Phone test requested

Install the official game and the separate launcher. Refresh details, open the original game, attempt Google login and check the actual profile/cloud save. Return and share the text diagnostic report plus the observed result. Keep the current mod's installation/save separate. No game APK rebuild is needed for this test.

## Remaining work

1. Obtain phone baseline results, particularly original package signer and exact login failure if any.
2. Select and assess a buildable container implementation and split/ABI/Android compatibility.
3. Test unmodified official game startup and genuine profile retrieval within that container.
4. Design the menu/WebView bridge only once those prerequisites pass.
5. Validate saved-progress persistence and Arena ranking separately.

Documentation, complete source/archive, development APK and checksums are synchronized to the download branch. Existing game/menu source, live payloads, services and main are unchanged by this milestone.


## First phone report received

The owner ran the launcher on Android 16/API 36 and supplied installed signer/split diagnostics. See PHONE_BASELINE.md. Original and mod signers differ; the mod matches the prior test certificate. The owner subsequently reports that the original game is already signed in to their Google account. Fresh sign-in, explicit player-profile retrieval and cloud-save restoration were not separately demonstrated. This satisfies the installed signer evidence request, not the container or menu milestones.
