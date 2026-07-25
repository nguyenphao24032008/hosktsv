#!/bin/bash
set -euo pipefail
PANEL_DIR="/var/www/pterodactyl"
for arg in "$@"; do case "$arg" in --panel=*) PANEL_DIR="${arg#--panel=}" ;; esac; done
cd "$PANEL_DIR"
rm -f routes/hoskt-native-addons-api.php routes/hoskt-native-addons-admin.php app/Services/Plugins/PluginSearchService.php app/Services/Mods/ModSearchService.php app/Services/Minecraft/NativeVersionCatalogService.php
rm -rf app/BlueprintFramework/Extensions/blueserverproperties app/BlueprintFramework/Extensions/minecraftplayermanager app/BlueprintFramework/Extensions/mcutils
rm -rf resources/scripts/components/server/servercfg resources/scripts/components/server/minecraft-player-manager resources/scripts/components/server/mcutils resources/scripts/components/server/subdomain resources/scripts/components/server/minecraft-modpacks resources/scripts/components/server/minecraft-worlds resources/scripts/components/server/versions resources/scripts/components/server/versionspe resources/scripts/components/dashboard/freeservers resources/scripts/api/freeservers resources/scripts/api/server/subdomain resources/scripts/api/server/rcon resources/scripts/api/server/version
rm -f resources/scripts/api/swr/getMinecraftModpacks.ts app/Support/HosktAddonPatch/AddonDetector.php
PANEL_DIR="$PANEL_DIR" python3 - <<'PYUNINSTALL'
from pathlib import Path
import os, re
P=Path(os.environ['PANEL_DIR'])
files=['routes/api-client.php','routes/admin.php','app/Models/Permission.php','app/Transformers/Api/Client/ServerTransformer.php','app/Console/Kernel.php','resources/scripts/routers/routes.ts','resources/scripts/routers/DashboardRouter.tsx','resources/scripts/components/server/settings/SettingsContainer.tsx','resources/scripts/api/server/getServer.ts','resources/scripts/api/http.ts','resources/views/layouts/admin.blade.php','app/Providers/AppServiceProvider.php','app/Http/Controllers/Admin/Settings/ThemeController.php']
marks=['HOSKT_NATIVE_MULTI_V15','HOSKT_NATIVE_MULTI_V16','HOSKT_NATIVE_MULTI_V21']
for f in files:
    path=P/f
    if not path.exists(): continue
    txt=path.read_text(errors='ignore'); old=txt
    for m in marks:
        pats=[
            rf'/\* {m}_API_ROUTES_BEGIN \*/.*?/\* {m}_API_ROUTES_END \*/',
            rf'/\* {m}_ADMIN_ROUTES_BEGIN \*/.*?/\* {m}_ADMIN_ROUTES_END \*/',
            rf'\s*/\* {m}_PERMISSIONS_BEGIN \*/.*?/\* {m}_PERMISSIONS_END \*/',
            rf'\s*/\* {m}_SERVER_FIELDS_BEGIN \*/.*?/\* {m}_SERVER_FIELDS_END \*/',
            rf'\s*// {m}_IMPORTS_BEGIN.*?// {m}_IMPORTS_END',
            rf'\s*// {m}_ROUTES_BEGIN.*?// {m}_ROUTES_END',
            rf'\s*\{{/\* {m}_DASHBOARD_ROUTE_BEGIN \*/\}}.*?\{{/\* {m}_DASHBOARD_ROUTE_END \*/\}}',
            rf"\nimport FreeServersContainer from .*?{m}_DASHBOARD_IMPORT.*?\n",
            rf"\nimport MinecraftBox from .*?{m}_RCON_IMPORT.*?\n",
            rf'\s*\{{/\* {m}_RCON_BOX_BEGIN \*/\}}.*?\{{/\* {m}_RCON_BOX_END \*/\}}',
            rf'\s*{{-- {m}_ADMIN_MENU_BEGIN --}}.*?{{-- {m}_ADMIN_MENU_END --}}',
            rf'\s*// {m}_FREE_SCHEDULE\n\s*\$schedule->command\(\\Pterodactyl\\Console\\Commands\\Server\\ManageFreeServersCommand::class\)->everyMinute\(\);',
            rf'/\* {m}_VERSIONS_RESULT_BEGIN \*/.*?/\* {m}_VERSIONS_RESULT_END \*/',
            rf'\n\s*/\* {m}_GETSERVER_TYPES \*/\n\s*mcversion: string \| null;\n\s*nestId: number;\n\s*eggId: number;',
            rf'\n\s*/\* {m}_GETSERVER_MAP \*/\n\s*mcversion: data\.mcversion \|\| null,\n\s*nestId: data\.nest_id,\n\s*eggId: data\.egg_id,',
        ]
        for pat in pats: txt=re.sub(pat,'',txt,flags=re.S)
    txt=re.sub(r'\s*/\* HOSKT_ADDON_PATCH_V14_START \*/.*?/\* HOSKT_ADDON_PATCH_V14_END \*/','',txt,flags=re.S)
    txt=re.sub(r'\s*/\* HOSKT_ADDON_PATCH_V21_START \*/.*?/\* HOSKT_ADDON_PATCH_V21_END \*/','',txt,flags=re.S)
    txt=txt.replace('/* HOSKT_ADDON_PATCH_V21_THEME_NOTE: Installed Addons are adjusted by Pterodactyl\\Support\\HosktAddonPatch\\AddonDetector. */\n','')
    if txt!=old: path.write_text(txt)
PYUNINSTALL
COMPOSER_ALLOW_SUPERUSER=1 composer dump-autoload -o || true
php artisan route:clear || true
php artisan cache:clear || true
php artisan view:clear || true
php artisan optimize:clear || true
systemctl restart nginx || true
while read -r service; do
  [ -n "$service" ] && systemctl restart "$service" || true
done < <(systemctl list-units --type=service --all --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1}')
echo "Đã gỡ HOSKT Native Multi Plugins v21. Nếu cần restore đầy đủ, copy backup trong /root/hoskt-native-multi-plugins-v21-backup-*"
