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

python3 "$PACKAGE_DIR/tools/check_v22_3_all_version_icons_provider_stability.py"

if [[ "$DRY_RUN" != "1" && -n "$PANEL_DIR" ]]; then
    PANEL_REAL="$(readlink -f "$PANEL_DIR")"
    BACKUP_DIR="/root/hoskt-v22-3-before-install-$(date +%Y%m%d-%H%M%S)"
    for relative in \
        resources/scripts/components/server/versions/McVersionsContainer.tsx \
        resources/scripts/components/server/versions/McVersionsRow.tsx \
        resources/scripts/components/server/minecraft-modpacks/ModpacksContainer.tsx \
        resources/scripts/api/swr/getMinecraftModpacks.ts \
        app/Services/Minecraft/NativeVersionCatalogService.php \
        app/Services/Minecraft/Modpacks/CurseForgeModpackService.php \
        app/Http/Controllers/Api/Client/Servers/ModpackController.php; do
        if [[ -e "$PANEL_REAL/$relative" ]]; then
            mkdir -p "$BACKUP_DIR/$(dirname "$relative")"
            cp -a "$PANEL_REAL/$relative" "$BACKUP_DIR/$relative"
        fi
    done
    echo "==> Backup V22.3: $BACKUP_DIR"
fi

# Reuse the complete safe installer and all preservation checks from V22.
bash "$PACKAGE_DIR/install-test-safe-v22.sh" "$@"

if [[ "$DRY_RUN" == "1" ]]; then
    echo "OK: Dry-run V22.3 hoàn tất. Chưa thay đổi Panel."
    exit 0
fi

PANEL_REAL="$(readlink -f "$PANEL_DIR")"
python3 "$PACKAGE_DIR/tools/check_v22_3_all_version_icons_provider_stability.py"
php -l "$PANEL_REAL/app/Services/Minecraft/NativeVersionCatalogService.php"
php -l "$PANEL_REAL/app/Services/Minecraft/Modpacks/CurseForgeModpackService.php"
php -l "$PANEL_REAL/app/Http/Controllers/Api/Client/Servers/ModpackController.php"
(
  cd "$PANEL_REAL"
  php artisan optimize:clear
)

echo "==> HOSKT V22.3 đã cài xong: icon CDN cho mọi loại Version Manager, Sponge không treo vô hạn, CurseForge/provider selector không bị chặn bởi request chi tiết modpack đã cài."
