# First phone baseline report — 11 October 2026

Evidence supplied by the owner as the launcher-generated text report, generated at 2026-10-11 23:31:24 +0530. This confirms that the launcher ran far enough on the owner's phone to query installed-package metadata and produce its report. It does not establish a game launch, successful login, menu attachment or container startup. These are Android-reported installed signing details copied by the owner, not an independent complete-APK signing-block verification or publisher-registration lookup.

Device: Android 16 / API 36, arm64-v8a.

| Installation | Package | Version | Splits |
| --- | --- | --- | --- |
| Expected original | com.funtomic.dynamons3 | 1.13.37 / 11337 | config.arm64_v8a, config.en, config.xxhdpi |
| Existing mod | com.funtomic.dynamons | 1.13.37 / 11337 | none |

Expected original current signer SHA-1:
E5:40:80:87:9B:3E:69:B3:B3:E5:FA:23:98:38:2B:B0:77:0A:8E:FB

Expected original current signer SHA-256:
6F:BA:8D:11:9B:AC:77:5A:D5:30:E7:69:5B:56:0C:CC:9C:F5:6A:1A:1F:08:1E:0B:12:04:B1:FB:2B:CC:67:32

Installed mod current signer SHA-1:
61:ED:37:7E:85:D3:86:A8:DF:EE:6B:86:4B:D8:5B:0B:FA:A5:AF:81

Installed mod current signer SHA-256:
A4:0D:A8:0A:59:D1:70:CA:A9:50:CF:15:C1:8C:45:4D:47:A3:9B:26:98:9D:8B:64:0E:CD:74:5B:A7:1B:F5:DC

The installed mod fingerprints exactly match the previously cryptographically verified V1 Android test certificate. The expected original fingerprints differ. Thus the owner-reported installed package identities and signer fingerprints differ, supporting the app-identity mismatch diagnosis more strongly than the extracted V1 metadata alone. A particular Google rejection status and the publisher's linked OAuth configuration remain unknown. Copying a public fingerprint/certificate cannot reproduce a private signing key or authorize the mod.

Google-services package com.google.android.gms is reported installed at 26.36.66 (260400-991556904) / 263666035, with 11 splits. com.google.android.play.games is reported not installed or not visible. The separate Play Games app's absence is not by itself proof of a sign-in failure; the game SDK uses Google Play services, and account/profile setup must be tested. Google-services version/package presence alone does not certify the service implementation or a working account.

The launcher remains an outside-container baseline. Container and menu attachment are not implemented. No game files, source or payload were changed in response to this report. The original split set matters for any future container import; treating the base APK alone as complete can omit necessary device resources/libraries.

## Next observation

The owner subsequently reports that the original game is already signed in to their Google account. This establishes an owner-reported existing original-game session, not a fresh login or independently observed profile/cloud-save retrieval. No repeat sign-out is needed merely to obtain this baseline. If original login works and the mod fails, the app-identity explanation becomes stronger, though exact failure still requires a device result/log. If original login also fails, investigate account/service/profile setup before attributing everything to the mod. Firebase Arena ranking writes remain a separate flow.

No original signer screenshot or additional META-INF archive is required at this stage: the requested installed fingerprints are now supplied. The runtime/container source prerequisite remains unresolved; only third-party APKs are available. No container success can be inferred from this diagnostic report.
