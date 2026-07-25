#!/usr/bin/env bash
set -euo pipefail
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$PACKAGE_DIR/install-test-safe-v22.sh" "$@"
