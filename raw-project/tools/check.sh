#!/usr/bin/env bash
set -euo pipefail
DG_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
node --check "$DG_ROOT/tests/bootstrap.js"
node "$DG_ROOT/tests/bridge.test.js"
node "$DG_ROOT/tests/runtime.test.js"
node "$DG_ROOT/tests/license-policy.test.mjs"
node "$DG_ROOT/tests/worker-routes.test.mjs"
node "$DG_ROOT/tests/free-tier.test.mjs"
python3 "$DG_ROOT/tests/sealed-payload.test.py"
# JDK 17+ is only required for this development syntax-check utility.
# The Android app itself uses Java 7 syntax.
java "$DG_ROOT/tools/ParseJava.java" "$DG_ROOT/src"
java "$DG_ROOT/tools/ParseJava.java" "$DG_ROOT/preview"
