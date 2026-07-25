#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"
PANEL_DIR=""
DRY_RUN=0
RUN_RESTART=0

for arg in "$@"; do
    case "$arg" in
        --panel=*) PANEL_DIR="${arg#--panel=}" ;;
        --dry-run) DRY_RUN=1 ;;
        --restart) RUN_RESTART=1 ;;
    esac
done

python3 "$PACKAGE_DIR/tools/check_modrinth_world_v22.py"
php "$PACKAGE_DIR/tools/test_world_archive_installer_v22.php"

if [[ "$DRY_RUN" != "1" && -n "$PANEL_DIR" ]]; then
    PANEL_REAL="$(readlink -f "$PANEL_DIR")"
    BACKUP_DIR="/root/hoskt-v22-modrinth-world-backup-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$BACKUP_DIR"

    backup_one() {
        local relative="$1"
        if [[ -e "$PANEL_REAL/$relative" ]]; then
            mkdir -p "$BACKUP_DIR/$(dirname "$relative")"
            cp -a "$PANEL_REAL/$relative" "$BACKUP_DIR/$relative"
        fi
    }

    backup_one "app/Services/Minecraft/Maps"
    backup_one "app/Jobs/InstallMinecraftMapJob.php"
    backup_one "app/Http/Controllers/Api/Client/Servers/MinecraftWorldController.php"
    backup_one "resources/scripts/components/server/minecraft-worlds"

    echo "==> Backup bổ sung V22: $BACKUP_DIR"
fi

# Preserve all V9-V20.1 checks and installation behavior, then validate V22.
bash "$PACKAGE_DIR/install-test-safe-v20.sh" "$@"

if [[ "$DRY_RUN" == "1" ]]; then
    echo "OK: Dry-run V22 hoàn tất. Chưa thay đổi file panel."
    exit 0
fi

PANEL_REAL="$(readlink -f "$PANEL_DIR")"
PHP_FILES=(
    "app/Services/Minecraft/Maps/MapProvider.php"
    "app/Services/Minecraft/Maps/CurseForgeMapService.php"
    "app/Services/Minecraft/Maps/ModrinthMapService.php"
    "app/Services/Minecraft/Maps/WorldArchiveInstaller.php"
    "app/Http/Controllers/Api/Client/Servers/MinecraftWorldController.php"
    "app/Jobs/InstallMinecraftMapJob.php"
)

for file in "${PHP_FILES[@]}"; do
    php -l "$PANEL_REAL/$file"
done

grep -q "case Modrinth = 'modrinth'" "$PANEL_REAL/app/Services/Minecraft/Maps/MapProvider.php"
grep -q "MapProvider::Modrinth" "$PANEL_REAL/app/Jobs/InstallMinecraftMapJob.php"
grep -q "<option value='modrinth'>Modrinth</option>" "$PANEL_REAL/resources/scripts/components/server/minecraft-worlds/MinecraftWorldContainer.tsx"
grep -q "WORLD_REFRESH_DELAYS = \[5000, 15000, 45000\]" "$PANEL_REAL/resources/scripts/components/server/minecraft-worlds/MinecraftWorldContainer.tsx"

(
    cd "$PANEL_REAL"
    php artisan optimize:clear
    php artisan route:list | grep -q "minecraft-worlds"
)

restart_queue_worker() {
    if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files --type=service 2>/dev/null | grep -q '^pteroq\.service'; then
        systemctl restart pteroq
        systemctl is-active --quiet pteroq
        echo "==> pteroq đang active."
        return 0
    fi

    if command -v supervisorctl >/dev/null 2>&1; then
        if supervisorctl status 2>/dev/null | grep -qi 'pteroq'; then
            supervisorctl restart 'pteroq:*' 2>/dev/null || supervisorctl restart pteroq
            echo "==> Đã restart queue worker qua Supervisor."
            return 0
        fi
    fi

    echo "WARNING: Không tìm thấy pteroq.service hoặc Supervisor process tên pteroq." >&2
    echo "Queue worker phải chạy thì nút tải map mới xử lý được." >&2
    return 0
}

if [[ "$RUN_RESTART" == "1" ]]; then
    restart_queue_worker
else
    echo "==> Chưa restart queue worker. Sau khi kiểm tra, chạy: systemctl restart pteroq"
fi

echo "==> V22 hoàn tất: Modrinth trong World Manager, tự load kết quả, cài qua staging, nhận diện level.dat/uid.dat, hỗ trợ ZIP/TAR/TGZ/MRPACK và refresh 5/15/45 giây."
