#!/usr/bin/env bash
# Builds the Chrome Web Store upload ZIP: release/cornmute-v<version>.zip (manifest.json at the ZIP root).
set -euo pipefail
cd "$(dirname "$0")/.."
VERSION=$(node -p "require('./extension/manifest.json').version")
OUT="release/cornmute-v${VERSION}.zip"
mkdir -p release
rm -f "$OUT"
(cd extension && zip -qrX "../$OUT" . -x '.*' -x '*/.*')
echo "Built $OUT"
unzip -l "$OUT"
