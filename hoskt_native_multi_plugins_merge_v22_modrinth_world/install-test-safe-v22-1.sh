#!/usr/bin/env bash
set -euo pipefail
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "NOTICE: install-test-safe-v22-1.sh đã được chuyển tiếp sang V22.2."
exec bash "$PACKAGE_DIR/install-test-safe-v22-2.sh" "$@"
