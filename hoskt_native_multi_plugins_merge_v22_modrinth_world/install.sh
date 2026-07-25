#!/bin/bash
set -euo pipefail
PANEL_DIR="/var/www/pterodactyl"
PATCH_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="/root/hoskt-native-multi-plugins-v21-backup-$(date +%Y%m%d-%H%M%S)"
RUN_BUILD=0
RUN_MIGRATE=1
RUN_RESTART=1
YES=0
for arg in "$@"; do
  case "$arg" in
    --panel=*) PANEL_DIR="${arg#--panel=}" ;;
    --build) RUN_BUILD=1 ;;
    --no-migrate) RUN_MIGRATE=0 ;;
    --no-restart) RUN_RESTART=0 ;;
    --yes|-y) YES=1 ;;
  esac
done
[ -d "$PANEL_DIR" ] || { echo "Không thấy thư mục panel: $PANEL_DIR"; exit 1; }
[ "$YES" = "1" ] || { echo "Dùng --yes để chạy patch."; exit 1; }
cd "$PANEL_DIR"
echo "==> Kiểm tra V19 và xác nhận giữ nguyên runtime V9/V14/V15/V16/V17/V18"
python3 "$PATCH_DIR/tools/check_v17_preservation.py"
python3 "$PATCH_DIR/tools/check_manager_services_fix.py"
HOSKT_PANEL_DIR="$PANEL_DIR" python3 "$PATCH_DIR/tools/check_mcutils_repaint_fix.py"
echo "==> Kiểm tra gói sửa logo target V15"
python3 "$PATCH_DIR/tools/check_dynamic_logo_target_fix.py" --package "$PATCH_DIR"
echo "==> Kiểm tra copy/input V16"
python3 "$PATCH_DIR/tools/check_mcutils_interaction_fix.py"
echo "==> Kiểm tra độ tương phản V17"
python3 "$PATCH_DIR/tools/check_mcutils_contrast_fix.py"
echo "==> Backup file cũ vào: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"
backup_one(){ local f="$1"; if [ -e "$PANEL_DIR/$f" ]; then mkdir -p "$BACKUP_DIR/$(dirname "$f")"; cp -a "$PANEL_DIR/$f" "$BACKUP_DIR/$f"; fi; }
for f in routes/api-client.php routes/admin.php app/Models/Permission.php app/Transformers/Api/Client/ServerTransformer.php app/Console/Kernel.php resources/scripts/routers/routes.ts resources/scripts/routers/DashboardRouter.tsx resources/scripts/components/layout/Sidebar.tsx resources/scripts/components/server/settings/SettingsContainer.tsx resources/scripts/api/server/getServer.ts resources/scripts/api/http.ts resources/views/layouts/admin.blade.php resources/views/templates/wrapper.blade.php public/hostkt/hoskt-dynamic-logo-fix-v22.js app/Providers/AppServiceProvider.php app/Http/Controllers/Admin/Settings/ThemeController.php app/Support/HosktAddonPatch/AddonDetector.php; do backup_one "$f"; done
for d in app/Services/Plugins/PluginSearchService.php app/Services/Mods/ModSearchService.php app/Services/Minecraft/NativeVersionCatalogService.php app/BlueprintFramework/Extensions/blueserverproperties app/BlueprintFramework/Extensions/minecraftplayermanager app/BlueprintFramework/Extensions/mcutils app/Http/Controllers/Admin/SubDomainController.php app/Http/Controllers/Admin/FreeServersController.php app/Http/Controllers/Admin/Bagou app/Http/Controllers/Api/Client/FreeServersController.php app/Http/Controllers/Api/Client/Servers/SubdomainController.php app/Http/Controllers/Api/Client/Servers/MinecraftRconController.php app/Http/Controllers/Api/Client/Servers/ModpackController.php app/Http/Controllers/Api/Client/Servers/MinecraftWorldController.php app/Http/Controllers/Api/Client/Servers/VersionsController.php app/Http/Controllers/Api/Client/Servers/VersionsPeController.php routes/hoskt-native-addons-api.php routes/hoskt-native-addons-admin.php resources/scripts/components/server/servercfg resources/scripts/components/server/minecraft-player-manager resources/scripts/components/server/mcutils resources/scripts/components/server/subdomain resources/scripts/components/server/minecraft-modpacks resources/scripts/components/server/minecraft-worlds resources/scripts/components/server/versions resources/scripts/components/server/versionspe resources/scripts/components/dashboard/freeservers resources/scripts/api/freeservers resources/scripts/api/server/subdomain resources/scripts/api/server/rcon resources/scripts/api/server/version resources/scripts/api/swr/getMinecraftModpacks.ts resources/views/admin/subdomain resources/views/admin/freeservers resources/views/admin/bagoucenter; do if [ -e "$PANEL_DIR/$d" ]; then mkdir -p "$BACKUP_DIR/$(dirname "$d")"; cp -a "$PANEL_DIR/$d" "$BACKUP_DIR/$d"; fi; done

echo "==> Copy file native HOSKT"
cp -a "$PATCH_DIR/payload/files/." "$PANEL_DIR/"
echo "==> Patch routes / permissions / frontend / HOSKT logo target"
python3 "$PATCH_DIR/tools/patch_hoskt_native_multi.py" "$PANEL_DIR"
python3 "$PATCH_DIR/tools/check_dynamic_logo_target_fix.py" --panel "$PANEL_DIR"
python3 "$PATCH_DIR/tools/check_modpack_route_shadow_fix.py" --panel "$PANEL_DIR"
echo "==> Clear cache / autoload"
COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o || true
php artisan view:clear || true
php artisan cache:clear || true
php artisan config:clear || true
php artisan route:clear || true
php artisan optimize:clear || true
if [ "$RUN_MIGRATE" = "1" ]; then
  php artisan migrate --force || true
  php artisan migrate --force --path=database/migrations/2022_07_04_151819_create_bagoulicense_table.php || true
  php artisan migrate --force --path=database/migrations/2022_10_24_133158_add_version_field_to_bagoulicense_table.php || true
fi
if [ "$RUN_BUILD" = "1" ]; then
  export NODE_OPTIONS=${NODE_OPTIONS:---openssl-legacy-provider}
  yarn install
  echo "==> Kiểm tra lại TypeScript sau yarn install"
  HOSKT_PANEL_DIR="$PANEL_DIR" python3 "$PATCH_DIR/tools/check_mcutils_repaint_fix.py"
  python3 "$PATCH_DIR/tools/check_mcutils_interaction_fix.py"
  python3 "$PATCH_DIR/tools/check_mcutils_contrast_fix.py"
  if yarn build:production; then
    echo "==> Build frontend thành công"
  elif yarn run build:production; then
    echo "==> Build frontend thành công"
  elif yarn build; then
    echo "==> Build frontend thành công"
  else
    echo "ERROR: Build frontend lỗi, menu server sẽ không hiện tab mới. Gửi log từ dòng ERROR in ... cho mình." >&2
    exit 1
  fi
else
  echo "Bỏ qua build frontend. Muốn hiện tab mới, chạy với --build."
fi
chown -R www-data:www-data "$PANEL_DIR/storage" "$PANEL_DIR/bootstrap/cache" || true
chown -R www-data:www-data "$PANEL_DIR/app" "$PANEL_DIR/routes" "$PANEL_DIR/resources" "$PANEL_DIR/database" || true
chmod -R 755 "$PANEL_DIR/storage" "$PANEL_DIR/bootstrap/cache" || true
if [ "$RUN_RESTART" = "1" ]; then
  systemctl restart nginx || true
  mapfile -t PHP_FPM_SERVICES < <(systemctl list-units --type=service --all --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')
  if [ "${#PHP_FPM_SERVICES[@]}" -eq 0 ]; then
    echo "WARNING: Không tìm thấy service PHP-FPM để restart tự động."
  else
    for service in "${PHP_FPM_SERVICES[@]}"; do
      systemctl restart "$service" || true
    done
  fi
else
  echo "==> Bỏ qua restart Nginx/PHP-FPM (--no-restart)"
fi
echo "==> Kiểm tra nhanh:"
php artisan route:list 2>/dev/null | grep -E "subdomain|freeservers|bagou|modpack|versions|minecraft-world|rcon" || true
grep -n "HOSKT_NATIVE_MULTI_V21\|NativeHOSKT" resources/scripts/routers/routes.ts | head -30 || true
grep -n "HOSKT_NATIVE_MULTI_V21_SIDEBAR\|Server Properties\|Minecraft Utils" resources/scripts/components/layout/Sidebar.tsx | head -30 || true
grep -n "HOSKT_ADDON_PATCH_V21" app/Providers/AppServiceProvider.php || true
echo "Xong HOSKT Native Multi Plugins V22.3.1 + Modpack Route Shadow Fix V19, giữ nguyên runtime V18/V17/V16/V15/V14/V9. Backup: $BACKUP_DIR"
