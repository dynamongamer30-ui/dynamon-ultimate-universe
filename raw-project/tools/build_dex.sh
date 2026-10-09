#!/usr/bin/env bash
# Run on a system/phone with a JDK, Android SDK android.jar, and R8 JAR.
set -euo pipefail
DG_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [ -z "${ANDROID_JAR:-}" ] || [ ! -f "$ANDROID_JAR" ]; then
  echo 'Set ANDROID_JAR to an Android SDK platform android.jar (API 28 or newer).' >&2
  exit 2
fi
if ! command -v javac >/dev/null 2>&1; then echo 'A JDK with javac is required.' >&2; exit 2; fi
if [ -z "${R8_JAR:-}" ] || [ ! -f "$R8_JAR" ]; then echo 'Set R8_JAR to a pinned R8 JAR. Release builds require obfuscation.' >&2; exit 2; fi
mkdir -p "$DG_ROOT/build/core-classes" "$DG_ROOT/dist/dex"
find "$DG_ROOT/build/core-classes" -type f -name '*.class' -delete
find "$DG_ROOT/src" -type f -name '*.java' > "$DG_ROOT/build/core-sources.txt"
# The app sources use Java 7 syntax. Newer JDKs may require -source/-target 8;
# override DG_SOURCE_LEVEL=8 if the installed compiler no longer accepts 7.
javac -encoding UTF-8 -source "${DG_SOURCE_LEVEL:-7}" -target "${DG_SOURCE_LEVEL:-7}" \
  -classpath "$ANDROID_JAR" -d "$DG_ROOT/build/core-classes" @"$DG_ROOT/build/core-sources.txt"
jar cf "$DG_ROOT/build/royal-void-core.jar" -C "$DG_ROOT/build/core-classes" .
find "$DG_ROOT/dist/dex" -maxdepth 1 -type f -name 'classes*.dex' -delete
java -cp "$R8_JAR" com.android.tools.r8.R8 --release --min-api 19 \
  --lib "$ANDROID_JAR" --pg-conf "$DG_ROOT/proguard-rules.pro" \
  --pg-map-output "$DG_ROOT/build/royal-void-mapping.txt" \
  --output "$DG_ROOT/dist/dex" "$DG_ROOT/build/royal-void-core.jar"
echo "DEX output: $DG_ROOT/dist/dex/classes.dex"
echo 'Copy assets/royal_void into the target APK assets directory. The preview Activity was excluded.'
