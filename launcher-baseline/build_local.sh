#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
: "${ANDROID_BUILD_TOOLS:?Set ANDROID_BUILD_TOOLS to your Android SDK build-tools/35.0.0 directory}"
: "${ANDROID_PLATFORM_JAR:?Set ANDROID_PLATFORM_JAR to platforms/android-35/android.jar}"
BUILD_DIR="$PROJECT_DIR/build/local"
mkdir -p "$BUILD_DIR/classes" "$BUILD_DIR/dex"
find "$PROJECT_DIR/app/src/main/java" -name '*.java' -print > "$BUILD_DIR/sources.txt"
if command -v javac >/dev/null 2>&1; then
    javac -source 8 -target 8 -bootclasspath "$ANDROID_PLATFORM_JAR" -d "$BUILD_DIR/classes" @"$BUILD_DIR/sources.txt"
else
    : "${JAVA_COMPILER_JAR:?Install a JDK or set JAVA_COMPILER_JAR to an Eclipse ECJ compiler JAR}"
    java -jar "$JAVA_COMPILER_JAR" -source 8 -target 8 -bootclasspath "$ANDROID_PLATFORM_JAR" -d "$BUILD_DIR/classes" @"$BUILD_DIR/sources.txt"
fi
python3 - "$BUILD_DIR" <<'PYZIP'
import sys, zipfile
from pathlib import Path
p = Path(sys.argv[1])
with zipfile.ZipFile(p / 'classes.jar', 'w', zipfile.ZIP_DEFLATED) as z:
    for f in sorted((p / 'classes').rglob('*.class')):
        z.write(f, f.relative_to(p / 'classes').as_posix())
PYZIP
"$ANDROID_BUILD_TOOLS/d8" --min-api 24 --lib "$ANDROID_PLATFORM_JAR" --output "$BUILD_DIR/dex" "$BUILD_DIR/classes.jar"
python3 - "$PROJECT_DIR" "$BUILD_DIR" <<'PYMANIFEST'
import sys, xml.etree.ElementTree as ET
from pathlib import Path
ET.register_namespace('android', 'http://schemas.android.com/apk/res/android')
tree = ET.parse(Path(sys.argv[1]) / 'app/src/main/AndroidManifest.xml')
tree.getroot().set('package', 'com.dynamongamer.launcher')
tree.write(Path(sys.argv[2]) / 'AndroidManifest.xml', encoding='utf-8', xml_declaration=True)
PYMANIFEST
"$ANDROID_BUILD_TOOLS/aapt2" link -I "$ANDROID_PLATFORM_JAR" --manifest "$BUILD_DIR/AndroidManifest.xml" --min-sdk-version 24 --target-sdk-version 35 --version-code 1 --version-name 0.1.0-baseline -o "$BUILD_DIR/unsigned.apk"
python3 - "$BUILD_DIR" <<'PY'
import sys,zipfile
from pathlib import Path
p=Path(sys.argv[1])
with zipfile.ZipFile(p/'unsigned.apk','a',zipfile.ZIP_DEFLATED) as z:
    z.write(p/'dex/classes.dex','classes.dex')
PY
"$ANDROID_BUILD_TOOLS/zipalign" -f 4 "$BUILD_DIR/unsigned.apk" "$BUILD_DIR/aligned.apk"
if [[ ! -f "$BUILD_DIR/debug.keystore" ]]; then
    keytool -genkeypair -keystore "$BUILD_DIR/debug.keystore" -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=Dynamons Launcher Development,O=Dynamon Gamer,C=IN'
fi
"$ANDROID_BUILD_TOOLS/apksigner" sign --ks "$BUILD_DIR/debug.keystore" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "$BUILD_DIR/Dynamons-Launcher-Baseline.apk" "$BUILD_DIR/aligned.apk"
"$ANDROID_BUILD_TOOLS/apksigner" verify --verbose "$BUILD_DIR/Dynamons-Launcher-Baseline.apk"
printf 'Built development APK: %s\n' "$BUILD_DIR/Dynamons-Launcher-Baseline.apk"
