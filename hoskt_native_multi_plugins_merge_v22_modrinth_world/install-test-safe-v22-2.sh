#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
PANEL_DIR=""
DRY_RUN=0

for arg in "$@"; do
    case "$arg" in
        --panel=*) PANEL_DIR="${arg#--panel=}" ;;
        --dry-run) DRY_RUN=1 ;;
    esac
done

python3 "$PACKAGE_DIR/tools/check_v22_2_vanilla_cdn.py"

if [[ "$DRY_RUN" != "1" && -n "$PANEL_DIR" ]]; then
    PANEL_REAL="$(readlink -f "$PANEL_DIR")"
    BACKUP_DIR="/root/hoskt-v22-2-vanilla-cdn-backup-$(date +%Y%m%d-%H%M%S)"

    backup_one() {
        local relative="$1"
        if [[ -e "$PANEL_REAL/$relative" ]]; then
            mkdir -p "$BACKUP_DIR/$(dirname "$relative")"
            cp -a "$PANEL_REAL/$relative" "$BACKUP_DIR/$relative"
        fi
    }

    backup_one "resources/scripts/components/server/versions/McVersionsRow.tsx"
    backup_one "public/extensions/hoskt-native-version-manager/icons/vanilla-icon.png"
    echo "==> Backup bổ sung V22.2: $BACKUP_DIR"
fi

# Reuse all V9-V22 safety checks, payload installation, build, migrations, and restart behavior.
bash "$PACKAGE_DIR/install-test-safe-v22.sh" "$@"

if [[ "$DRY_RUN" == "1" ]]; then
    echo "OK: Dry-run V22.2 hoàn tất. Chưa thay đổi file panel."
    exit 0
fi

PANEL_REAL="$(readlink -f "$PANEL_DIR")"
ROW="$PANEL_REAL/resources/scripts/components/server/versions/McVersionsRow.tsx"
PNG="$PANEL_REAL/public/extensions/hoskt-native-version-manager/icons/vanilla-icon.png"
CDN='https://cdn.nguyenhung401.id.vn/img/vanilla-icon.jpg'

grep -Fq "$CDN" "$ROW"
grep -Fq "data-fallback-stage={stype === 'vanilla' ? 'vanilla-cdn'" "$ROW"
grep -Fq "vanilla-local-png" "$ROW"
test -s "$PNG"
python3 - "$PNG" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
if path.read_bytes()[:8] != b'\x89PNG\r\n\x1a\n':
    raise SystemExit(f'ERROR: local Vanilla fallback is not a valid PNG: {path}')
print(f'OK: local Vanilla PNG fallback: {path}')
PY

(
    cd "$PANEL_REAL"
    php artisan optimize:clear
)

echo "==> V22.2 hoàn tất: Vanilla dùng CDN được chỉ định, tự fallback PNG local -> vanilla.svg -> default.svg."
echo "==> Các tính năng V22.1/V22 được giữ: nhập trang, tổng số trang, Modpacks trong Version Manager, Modrinth World Manager và Queue pteroq."
