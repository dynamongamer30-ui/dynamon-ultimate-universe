#!/usr/bin/env bash
set -euo pipefail
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
mkdir -p "$PROJECT_DIR/build/keys"
if [[ ! -f "$PROJECT_DIR/build/keys/development.keystore" ]]; then
    keytool -genkeypair -keystore "$PROJECT_DIR/build/keys/development.keystore" -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 3650 -dname 'CN=Dynamons Container Development,O=Dynamon Gamer,C=IN'
fi
"${GRADLE_EXECUTABLE:-gradle}" -p "$PROJECT_DIR" --no-daemon :app:assembleDebug
