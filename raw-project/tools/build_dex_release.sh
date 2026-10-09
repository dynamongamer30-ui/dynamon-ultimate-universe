#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
bash "$ROOT/tools/build_dex.sh"
bash "$ROOT/tools/package_dex_release.sh" "$ROOT/dist/dex" "$ROOT/assets/royal_void" "$ROOT/dist/royal-void-dex-package.zip"
