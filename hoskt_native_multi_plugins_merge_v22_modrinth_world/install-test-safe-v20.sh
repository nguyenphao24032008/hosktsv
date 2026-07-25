#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
PANEL_DIR=""
DRY_RUN=0
NO_MIGRATE=0
for arg in "$@"; do
    case "$arg" in
        --panel=*) PANEL_DIR="${arg#--panel=}" ;;
        --dry-run) DRY_RUN=1 ;;
        --no-migrate) NO_MIGRATE=1 ;;
    esac
done

python3 "$PACKAGE_DIR/tools/check_version_manager_v20.py"

# V20 changes one additional Modpacks provider file not covered by the original
# V19 backup list. Back it up separately before the V19-safe installer runs.
if [[ "$DRY_RUN" != "1" && -n "$PANEL_DIR" && -f "$PANEL_DIR/app/Services/Minecraft/Modpacks/CurseForgeModpackService.php" ]]; then
    BACKUP_DIR="/root/hoskt-version-manager-v20-extra-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR/app/Services/Minecraft/Modpacks"
    cp -a "$PANEL_DIR/app/Services/Minecraft/Modpacks/CurseForgeModpackService.php" "$BACKUP_DIR/app/Services/Minecraft/Modpacks/"
    echo "==> Backup bổ sung V20: $BACKUP_DIR"
fi

bash "$PACKAGE_DIR/install-test-safe.sh" "$@"

if [[ "$DRY_RUN" != "1" ]]; then
    php -l "$PANEL_DIR/app/Services/Minecraft/NativeVersionCatalogService.php"
    php -l "$PANEL_DIR/app/Http/Controllers/Api/Client/Servers/VersionsController.php"
    php -l "$PANEL_DIR/app/Services/Minecraft/Modpacks/CurseForgeModpackService.php"

    if grep -Rqs 'cdn.bagou450.com/img/' "$PANEL_DIR/resources/scripts/components/server/versions/McVersionsRow.tsx"; then
        echo "ERROR: Version Manager trên panel vẫn còn dùng CDN ảnh Bagou cũ." >&2
        exit 1
    fi

    test -f "$PANEL_DIR/public/extensions/hoskt-native-version-manager/icons/default.svg" || {
        echo "ERROR: Thiếu bộ icon local Version Manager sau khi cài." >&2
        exit 1
    }

    if [[ "$NO_MIGRATE" != "1" ]]; then
        (
            cd "$PANEL_DIR"
            php artisan migrate --force --path=database/migrations/2026_07_10_000001_add_java25_to_java_eggs.php
        )
    fi
fi

echo "==> V20.1 hoàn tất: ảnh local, provider native đầy đủ, Java đúng phiên bản, CurseForge key fallback; V9 và route-shadow V19 được giữ nguyên."
