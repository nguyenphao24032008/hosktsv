#!/usr/bin/env bash
set -euo pipefail
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "NOTICE: Gói hiện tại là V22.2; script V22.1 được giữ để tương thích và sẽ chạy bộ cài V22.2."
exec bash "$PACKAGE_DIR/install-test-safe-v22-2.sh" "$@"
