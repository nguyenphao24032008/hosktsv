#!/usr/bin/env bash
set -euo pipefail
PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
exec bash "$PACKAGE_DIR/install-v22-3-version-icons-provider-stability.sh" "$@"
