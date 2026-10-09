#!/usr/bin/env bash
set -euo pipefail

# Creates the injection package only. Source, JSON, documentation, tests,
# server files and build intermediates never enter this archive.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEX_DIR="${1:-$ROOT/dist/dex}"
ASSET_DIR="${2:-$ROOT/assets/royal_void}"
OUT="${3:-$ROOT/dist/royal-void-dex-package.zip}"

[ -d "$DEX_DIR" ] || { echo "DEX directory not found: $DEX_DIR" >&2; exit 2; }
[ -d "$ASSET_DIR" ] || { echo "Asset directory not found: $ASSET_DIR" >&2; exit 2; }
mkdir -p "$(dirname "$OUT")"

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/assets/royal_void"

shopt -s nullglob
dex_files=("$DEX_DIR"/classes*.dex)
[ "${#dex_files[@]}" -gt 0 ] || { echo 'No classes*.dex was produced.' >&2; exit 2; }
for dex in "${dex_files[@]}"; do
  name="$(basename "$dex")"
  [[ "$name" =~ ^classes([2-9]|[1-9][0-9]+)?\.dex$ ]] || { echo "Unexpected DEX name: $dex" >&2; exit 2; }
  cp -f "$dex" "$work/"
done

# Only runtime artwork/audio/fonts are copied. License notes remain in the
# source project and are not runtime inputs.
find "$ASSET_DIR" -type f \( -name '*.png' -o -name '*.ttf' -o -name '*.wav' \) -print0 |
  while IFS= read -r -d '' file; do
    relative="${file#"$ASSET_DIR/"}"
    mkdir -p "$work/assets/royal_void/$(dirname "$relative")"
    cp -f "$file" "$work/assets/royal_void/$relative"
  done

rm -f "$OUT"
(cd "$work" && zip -q -r -D -9 "$OUT" . -x '*.wav' && find assets -type f -name '*.wav' -print0 | xargs -0 -r zip -q -0 "$OUT")
python3 - "$OUT" <<'PY'
import sys, zipfile
path = sys.argv[1]
allowed = ('.dex', '.png', '.ttf', '.wav')
with zipfile.ZipFile(path) as z:
    names = z.namelist()
    if not names:
        raise SystemExit('release archive contains no files')
    if any(not n.endswith(allowed) for n in names):
        raise SystemExit('release archive contains a non-runtime file')
    for n in names:
        if n.endswith('.wav') and z.getinfo(n).compress_type!=zipfile.ZIP_STORED:
            raise SystemExit('Sound must be stored uncompressed: '+n)
        if n.endswith('.dex'):
            data=z.read(n)
            if len(data)<112 or data[:4]!=b'dex\n' or data[7]!=0:
                raise SystemExit('Invalid DEX file: '+n)
    if not any(n.startswith('assets/royal_void/') for n in names):
        raise SystemExit('release archive is missing assets/royal_void')
    if z.testzip() is not None:
        raise SystemExit('release archive failed integrity check')
print(path)
print('runtime files:', len(names))
PY
