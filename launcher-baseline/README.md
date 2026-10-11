# Dynamons Launcher Baseline 0.1.0

This is the first independently built launcher for the Royal Void container investigation. It opens the installed original game through Android's normal launch intent. It is not a container, and it does not attach the mod menu.

## Install and test on your phone

1. Install Dynamons World from its official Play Store listing, package com.funtomic.dynamons3. Preserve your saves using the game's supported backup before changing game installations. Do not replace the game with a rebuilt APK for this baseline.
2. Install Dynamons-Launcher-Baseline.apk. This is a separate package com.dynamongamer.launcher and does not replace either game package.
3. Open the launcher and tap Refresh installed app details. It reports the original and previously supplied mod packages independently.
4. Tap Open original Dynamons. Test Google sign-in, then verify the game's player profile and saved progress. A visible account chooser is not enough to prove success.
5. Return to the launcher and tap Share diagnostic report. Send that report plus the observed login/profile result. The report does not collect email, account tokens, saves or a stable device identifier.

The original package's Android-reported SHA-1 and SHA-256 fingerprints are included. No trusted publisher fingerprint has been supplied, so the launcher reports the signer without declaring it genuine. The same applies to the Google-services package: its presence does not identify it as official Google software or prove login works.

Expected results include an enabled game-launch button when the expected package and launch activity are visible. If the expected package is absent, the button is disabled. The different com.funtomic.dynamons mod is listed for diagnosis but is not launched by this button. The original game can run at its normal speed; the launcher contains no speed or gameplay controls.

## Complete source

The source ZIP preserves this project folder, including MainActivity.java, Gradle files, manifest, standalone build script, this README and the current system guide. All code is included. No downloaded container code, official game APK, microG binaries, private keys or Android SDK binaries are included.

Open the project in Android Studio with Android SDK platform 35 and Java 17 or newer. The Gradle project uses Android Gradle Plugin 8.7.3; use compatible Gradle 8.9. No Gradle wrapper is bundled, so use the IDE/configured Gradle installation. Run `gradle :app:assembleDebug` with Gradle 8.9. The conventional Gradle build has not been run in this environment; the supplied APK was built through the verified standalone route below.

## Standalone SDK build

Requires Bash, Python 3, a JDK (java, javac, keytool), SDK platform 35 and build-tools 35.0.0 suitable for your build computer. This is a host build script, not a promise that desktop SDK binaries run on Android/Termux.

```sh
export ANDROID_BUILD_TOOLS=/your/android-sdk/build-tools/35.0.0
export ANDROID_PLATFORM_JAR=/your/android-sdk/platforms/android-35/android.jar
bash build_local.sh
```

If only a Java runtime is available, set JAVA_COMPILER_JAR to an Eclipse ECJ compiler JAR; compilation then uses that JAR. The supplied build used ECJ 3.40.0 and Java 21, Android SDK platform 35/build-tools 35.0.0.

The script compiles the complete source, creates DEX using D8, packages using AAPT2, aligns and signs the development APK, then verifies it. It generates a separate local development keystore under build/local; do not publish that file. Rebuilding with a different keystore can require uninstalling a previous launcher build, but does not require changing the game. The launcher signer is unrelated to the game signer and to the Royal Void payload signing key.

Output: build/local/Dynamons-Launcher-Baseline.apk. Build folders and keystores are excluded from the source ZIP. The separately delivered APK is signed as a development build, not as a publisher-signed game.

## Validation and limitations

Java compilation and D8 processing passed. AAPT2 reports the expected package/activity, minSdk 24 and targetSdk 35. ZIP structure/alignment and APK V2/V3 signature verification passed. Java compilation reports two deprecation warnings for system-bar color methods; there were no compilation errors in the final build. No emulator/phone install, login or save test was performed here. Android 7+ is the intended minimum; the complete device/version matrix is untested.

No INTERNET, account, accessibility, overlay, storage or package-install permission is requested. Report sharing uses ACTION_SEND with text. The app never reads another app's private files. It obtains public installed-package metadata through PackageManager and launches the original package normally.

No container engine or menu attachment is implemented. The public FBlackBox/BlackBox repository currently has only a removal notice; the owner has APKs but no container source. The available old VirtualApp source has not been adopted or tested for this project. Fine Engine and Shinigami binaries are analysis references, not build dependencies. Container startup remains a separate engineering milestone requiring a suitable maintained implementation and runtime compatibility testing.

The next decision follows the phone baseline: if official login fails, diagnose the original account/service flow; if it succeeds, we have a reference result against which a future unmodified-game container launch can be compared. Menu attachment comes after that comparison. Successful official login alone does not prove a future container will work or Arena ranking writes will be accepted.


## First phone report received

The owner ran the launcher on Android 16/API 36 and supplied installed signer/split diagnostics. See PHONE_BASELINE.md. Original and mod signers differ; the mod matches the prior test certificate. The owner subsequently reports that the original game is already signed in to their Google account. Fresh sign-in, explicit player-profile retrieval and cloud-save restoration were not separately demonstrated. This satisfies the installed signer evidence request, not the container or menu milestones.
