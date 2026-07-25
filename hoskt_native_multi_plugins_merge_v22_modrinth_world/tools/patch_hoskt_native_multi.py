#!/usr/bin/env python3
from pathlib import Path
import re, sys
PANEL = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/var/www/pterodactyl')
MARK = 'HOSKT_NATIVE_MULTI_V21'
OLD_MARKS = ['HOSKT_NATIVE_MULTI_V15','HOSKT_NATIVE_MULTI_V16','HOSKT_NATIVE_MULTI_V17','HOSKT_NATIVE_MULTI_V18','HOSKT_NATIVE_MULTI_V19','HOSKT_NATIVE_MULTI_V20','HOSKT_NATIVE_MULTI_V21']
ADDON_MARK = 'HOSKT_ADDON_PATCH_V21'

def p(rel): return PANEL / rel
def read(path): return path.read_text(errors='ignore') if path.exists() else ''
def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text)

def insert_after_last_import(text, block):
    lines = text.splitlines()
    last = -1
    for i, l in enumerate(lines):
        if l.startswith('import '): last = i
    if last >= 0:
        lines.insert(last + 1, block.rstrip())
        return '\n'.join(lines) + ('\n' if text.endswith('\n') else '')
    return block + '\n' + text

def dedupe_imports(text):
    out=[]; seen=set()
    for line in text.splitlines():
        if line.startswith('import '):
            # For the native aliases, prefer the last clean alias line by exact text only.
            if line in seen: continue
            seen.add(line)
        out.append(line)
    return '\n'.join(out) + ('\n' if text.endswith('\n') else '')

def dedupe_lazy_consts(text):
    seen=set(); out=[]
    pat=re.compile(r'^\s*const\s+([A-Za-z_$][A-Za-z0-9_$]*)\s*=\s*lazy\s*\(')
    for line in text.splitlines():
        m=pat.match(line)
        if m:
            name=m.group(1)
            if name in seen:
                continue
            seen.add(name)
        out.append(line)
    return '\n'.join(out) + ('\n' if text.endswith('\n') else '')

def remove_marked_blocks(text):
    for m in OLD_MARKS:
        patterns = [
            rf'\n?// {m}_IMPORTS_BEGIN.*?// {m}_IMPORTS_END\n?',
            rf'\n?\s*// {m}_ROUTES_BEGIN.*?// {m}_ROUTES_END\n?',
            rf'\n?\s*\{{/\* {m}_DASHBOARD_ROUTE_BEGIN \*/\}}.*?\{{/\* {m}_DASHBOARD_ROUTE_END \*/\}}\n?',
            rf'\n?\s*\{{/\* {m}_RCON_BOX_BEGIN \*/\}}.*?\{{/\* {m}_RCON_BOX_END \*/\}}\n?',
            rf'\n?\s*\{{-- {m}_ADMIN_MENU_BEGIN --\}}.*?\{{-- {m}_ADMIN_MENU_END --\}}\n?',
        ]
        for pat in patterns:
            text = re.sub(pat, '\n', text, flags=re.S)
        # Remove malformed Blade markers produced by older f-string escaping: {-- MARK --}
        text = re.sub(rf'\n?\s*\{{--\s*{m}_ADMIN_MENU_BEGIN\s*--\}}', '\n', text)
        text = re.sub(rf'\n?\s*\{{--\s*{m}_ADMIN_MENU_END\s*--\}}', '\n', text)
        text = re.sub(rf'\n?\s*\{{--\s*{m}_[A-Z0-9_]+\s*--\}}', '\n', text)
        # Remove single-line imports from old patch.
        text = re.sub(rf'^.*// {m}_(DASHBOARD_IMPORT|RCON_IMPORT).*$\n?', '', text, flags=re.M)
    return text

def normalize_old_aliases(text):
    repl = {
        "import ServerConfigEditor from '@/components/server/servercfg/ServerConfigEditor';": "import NativeHOSKTServerConfigEditor from '@/components/server/servercfg/ServerConfigEditor';",
        "import PlayerManagerContainer from '@/components/server/minecraft-player-manager/PlayerManagerContainer';": "import NativeHOSKTPlayerManagerContainer from '@/components/server/minecraft-player-manager/PlayerManagerContainer';",
        "import McUtilsContainer from '@/components/server/mcutils/sections/McUtilsContainer';": "import NativeHOSKTMcUtilsContainer from '@/components/server/mcutils/sections/McUtilsContainer';",
        "import SubdomainContainer from '@/components/server/subdomain/SubdomainContainer';": "import NativeHOSKTSubdomainContainer from '@/components/server/subdomain/SubdomainContainer';",
        "import ModpacksContainer from '@/components/server/minecraft-modpacks/ModpacksContainer';": "import NativeHOSKTModpacksContainer from '@/components/server/minecraft-modpacks/ModpacksContainer';",
        "import MinecraftWorldContainer from '@/components/server/minecraft-worlds/MinecraftWorldContainer';": "import NativeHOSKTMinecraftWorldContainer from '@/components/server/minecraft-worlds/MinecraftWorldContainer';",
        "import McVersionsContainer from '@/components/server/versions/McVersionsContainer';": "import NativeHOSKTMcVersionsContainer from '@/components/server/versions/McVersionsContainer';",
        "import McVersionsPePocketMineContainer from '@/components/server/versionspe/McVersionsPePocketMineContainer';": "import NativeHOSKTMcVersionsPePocketMineContainer from '@/components/server/versionspe/McVersionsPePocketMineContainer';",
    }
    for a,b in repl.items(): text=text.replace(a,b)
    return text

def remove_shadowed_modpack_route(text):
    """Remove HOSKT's original /modpacks route before adding the native route."""
    route_pattern = re.compile(
        r"\n(?P<indent>[ \t]*)\{[ \t]*\n"
        r"(?P=indent)[ \t]+path:[ \t]*['\"]\/modpacks['\"][ \t]*,[\s\S]*?"
        r"(?P=indent)\},"
    )

    def keep_or_remove(match):
        block = match.group(0)
        if re.search(r"component:[ \t]*ModpacksContainer\b", block):
            return '\n'
        return block

    text = route_pattern.sub(keep_or_remove, text)
    text = re.sub(
        r"^[ \t]*const[ \t]+ModpacksContainer[ \t]*=[ \t]*lazy\(\(\)[ \t]*=>[ \t]*import\(['\"]@/components/server/modpacks/ModpacksContainer['\"]\)\);[ \t]*\n?",
        '',
        text,
        flags=re.M,
    )
    return text


def patch_routes_ts():
    path=p('resources/scripts/routers/routes.ts')
    text=read(path)
    if not text:
        print('[warn] missing routes.ts')
        return
    text=remove_marked_blocks(text)
    text=remove_shadowed_modpack_route(text)
    text=normalize_old_aliases(text)
    text=dedupe_imports(text)
    text=dedupe_lazy_consts(text)
    imports=f"""// {MARK}_IMPORTS_BEGIN
import NativeHOSKTServerConfigEditor from '@/components/server/servercfg/ServerConfigEditor';
import NativeHOSKTPlayerManagerContainer from '@/components/server/minecraft-player-manager/PlayerManagerContainer';
import NativeHOSKTMcUtilsContainer from '@/components/server/mcutils/sections/McUtilsContainer';
import NativeHOSKTSubdomainContainer from '@/components/server/subdomain/SubdomainContainer';
import NativeHOSKTModpacksContainer from '@/components/server/minecraft-modpacks/ModpacksContainer';
import NativeHOSKTMinecraftWorldContainer from '@/components/server/minecraft-worlds/MinecraftWorldContainer';
import NativeHOSKTMcVersionsContainer from '@/components/server/versions/McVersionsContainer';
import NativeHOSKTMcVersionsPePocketMineContainer from '@/components/server/versionspe/McVersionsPePocketMineContainer';
// {MARK}_IMPORTS_END"""
    text=insert_after_last_import(text, imports)
    # permission:null is intentional for v21 so the menu is visible even if HOSKT does not know the new permission keys yet.
    route_block=f"""
        // {MARK}_ROUTES_BEGIN
        {{ path: '/servercfg', permission: null, name: 'Server Properties', component: NativeHOSKTServerConfigEditor }},
        {{ path: '/minecraft/players', permission: null, name: 'Players', component: NativeHOSKTPlayerManagerContainer }},
        {{ path: '/mc-utils', permission: null, name: 'Minecraft Utils', component: NativeHOSKTMcUtilsContainer }},
        {{ path: '/subdomain', permission: null, name: 'Domain', component: NativeHOSKTSubdomainContainer }},
        {{ path: '/modpacks', permission: null, name: 'Modpacks', component: NativeHOSKTModpacksContainer }},
        {{ path: '/minecraft-worlds', permission: null, name: 'Worlds', component: NativeHOSKTMinecraftWorldContainer }},
        {{ path: '/versions', permission: null, name: 'Version', component: NativeHOSKTMcVersionsContainer }},
        {{ path: '/versions/pocketmine', permission: null, name: 'Bedrock Version', component: NativeHOSKTMcVersionsPePocketMineContainer }},
        // {MARK}_ROUTES_END
""".rstrip()
    # Prefer placing before Settings so it is clearly visible in the menu.
    m=re.search(r"\n\s*\{\s*path:\s*['\"]/settings['\"]", text)
    if m:
        text=text[:m.start()]+'\n'+route_block+text[m.start():]
    else:
        # Match object syntax: server: [ ...
        m=re.search(r"server\s*:\s*\[", text)
        if m:
            text=text[:m.end()]+'\n'+route_block+text[m.end():]
        else:
            # Match exported array variants.
            m=re.search(r"(serverRoutes|routes)\s*[:=]\s*\[", text)
            if m:
                text=text[:m.end()]+'\n'+route_block+text[m.end():]
            else:
                print('[warn] could not locate server routes array in routes.ts')
    text=dedupe_imports(dedupe_lazy_consts(text))
    write(path,text)

def append_once(path, block, marker):
    text=read(path)
    if not text:
        print(f'[warn] missing {path}')
        return
    if marker not in text:
        write(path, text.rstrip() + '\n\n' + block.strip() + '\n')

def patch_permissions_transformer():
    append_once(p('routes/api-client.php'), f"""
/* {MARK}_API_ROUTES_BEGIN */
if (file_exists(base_path('routes/hoskt-native-addons-api.php'))) {{ require base_path('routes/hoskt-native-addons-api.php'); }}
/* {MARK}_API_ROUTES_END */
""", f'{MARK}_API_ROUTES_BEGIN')
    append_once(p('routes/admin.php'), f"""
/* {MARK}_ADMIN_ROUTES_BEGIN */
if (file_exists(base_path('routes/hoskt-native-addons-admin.php'))) {{ require base_path('routes/hoskt-native-addons-admin.php'); }}
/* {MARK}_ADMIN_ROUTES_END */
""", f'{MARK}_ADMIN_ROUTES_BEGIN')
    perm=p('app/Models/Permission.php'); text=read(perm)
    if text and f'{MARK}_PERMISSIONS_BEGIN' not in text and 'subdomain' not in text:
        block=f"""
        /* {MARK}_PERMISSIONS_BEGIN */
        'subdomain' => ['description' => 'Manage subdomains for this server.', 'keys' => ['manage' => 'Create and delete subdomains for this server.']],
        'rcon' => ['description' => 'Manage Minecraft RCON and Query settings.', 'keys' => ['manage' => 'Enable, disable, and rotate Minecraft RCON/Query settings.']],
        'version' => ['description' => 'Manage Minecraft version changes.', 'keys' => ['version' => 'Allows changing the Minecraft server version.']],
        /* {MARK}_PERMISSIONS_END */
"""
        text=text.replace("        'websocket' =>", block+"\n        'websocket' =>",1) if "'websocket' =>" in text else text.replace('];', block+'];',1)
        write(perm,text)
    tr=p('app/Transformers/Api/Client/ServerTransformer.php'); text=read(tr)
    if text and f'{MARK}_SERVER_FIELDS_BEGIN' not in text and "'mcversion'" not in text:
        block=f"""
            /* {MARK}_SERVER_FIELDS_BEGIN */
            'mcversion' => $server->mcversion ?? null,
            'nest_id' => $server->nest_id,
            'egg_id' => $server->egg_id,
            /* {MARK}_SERVER_FIELDS_END */
"""
        text=text.replace("            'node' =>", block+"\n            'node' =>",1) if "'node' =>" in text else text
        write(tr,text)
    getserver=p('resources/scripts/api/server/getServer.ts'); text=read(getserver)
    if text:
        if 'mcversion:' not in text:
            text=re.sub(r'(node:\s*string;)', r"\1\n    /* HOSKT_NATIVE_MULTI_V21_GETSERVER_TYPES */\n    mcversion: string | null;\n    nestId: number;\n    eggId: number;", text, count=1)
        if 'mcversion: data.mcversion' not in text:
            text=re.sub(r'(node:\s*data\.node,)', r"\1\n        /* HOSKT_NATIVE_MULTI_V21_GETSERVER_MAP */\n        mcversion: data.mcversion || null,\n        nestId: data.nest_id,\n        eggId: data.egg_id,", text, count=1)
        write(getserver,text)
    http=p('resources/scripts/api/http.ts'); text=read(http)
    if text and 'interface VersionsResult' not in text:
        block=f"""/* {MARK}_VERSIONS_RESULT_BEGIN */
export interface VersionsResult<T> {{ items: T[]; }}
/* {MARK}_VERSIONS_RESULT_END */

"""
        text=text.replace('export interface PaginationDataSet', block+'export interface PaginationDataSet',1) if 'export interface PaginationDataSet' in text else block+text
        write(http,text)

def patch_dashboard_route():
    path=p('resources/scripts/routers/DashboardRouter.tsx')
    text=read(path)
    if not text: return
    text=remove_marked_blocks(text)
    imp=f"import FreeServersContainer from '@/components/dashboard/freeservers/FreeServersContainer'; // {MARK}_DASHBOARD_IMPORT"
    text=insert_after_last_import(text, imp)
    route=f"""
                    {{/* {MARK}_DASHBOARD_ROUTE_BEGIN */}}
                    <Route path={{'/freeservers'}} exact><FreeServersContainer /></Route>
                    {{/* {MARK}_DASHBOARD_ROUTE_END */}}
"""
    if "<Route path={'/freeservers'}" not in text and '<Route path={\'/freeservers\'}' not in text:
        if "<Route path={'*'}" in text:
            text=text.replace("<Route path={'*'}", route+"                    <Route path={'*'}",1)
        elif '</Switch>' in text:
            text=text.replace('</Switch>', route+'                </Switch>',1)
        else:
            print('[warn] could not inject FreeServers route')
    write(path,dedupe_imports(text))

def patch_settings_box():
    path=p('resources/scripts/components/server/settings/SettingsContainer.tsx')
    text=read(path)
    if not text: return
    text=remove_marked_blocks(text)
    imp=f"import MinecraftBox from '@/components/server/settings/MinecraftBox'; // {MARK}_RCON_IMPORT"
    text=insert_after_last_import(text, imp)
    insert=f"\n            {{/* {MARK}_RCON_BOX_BEGIN */}}\n            <MinecraftBox />\n            {{/* {MARK}_RCON_BOX_END */}}\n"
    if '<MinecraftBox />' not in text:
        m=re.search(r"(<ServerContentBlock[^>]*>)", text)
        if m: text=text[:m.end()]+insert+text[m.end():]
        elif '</ServerContentBlock>' in text: text=text.replace('</ServerContentBlock>', insert+'</ServerContentBlock>',1)
        else: print('[warn] could not inject MinecraftBox')
    write(path,dedupe_imports(text))

def patch_admin_menu():
    path=p('resources/views/layouts/admin.blade.php')
    text=read(path)
    if not text: return
    text=remove_marked_blocks(text)
    # Remove malformed marker lines left by v21 ({-- ... --}) so they do not render in the admin sidebar.
    text=re.sub(r'\n?\s*\{--\s*HOSKT_NATIVE_MULTI_V\d+_[A-Z0-9_]+\s*--\}', '\n', text)
    menu="""
                        {{-- __MARK___ADMIN_MENU_BEGIN --}}
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.subdomain') ?: 'active' }}"><a href="{{ route('admin.subdomain') }}"><i class="fa fa-globe"></i> <span>SubDomain Manager</span></a></li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.freeservers') ?: 'active' }}"><a href="{{ route('admin.freeservers') }}"><i class="fa fa-calendar"></i> <span>Free Servers</span></a></li>
                        <li class="{{ ! starts_with(Route::currentRouteName(), 'admin.bagoucenter') ?: 'active' }}"><a href="{{ route('admin.bagoucenter') }}"><i class="fa fa-cubes"></i> <span>Bagou Center</span></a></li>
                        {{-- __MARK___ADMIN_MENU_END --}}
""".replace('__MARK__', MARK)
    if 'SubDomain Manager' not in text:
        text=text.replace('<li class="header">MANAGEMENT</li>', '<li class="header">MANAGEMENT</li>\n'+menu,1) if '<li class="header">MANAGEMENT</li>' in text else text.replace('</ul>', menu+'\n</ul>',1)
    write(path,text)

def patch_kernel():
    path=p('app/Console/Kernel.php')
    text=read(path)
    if not text or 'ManageFreeServersCommand' in text: return
    line=f"        // {MARK}_FREE_SCHEDULE\n        $schedule->command(\\Pterodactyl\\Console\\Commands\\Server\\ManageFreeServersCommand::class)->everyMinute();\n"
    if 'CleanServiceBackupFilesCommand::class' in text:
        text=re.sub(r'(CleanServiceBackupFilesCommand::class\)->daily\(\);\s*)', lambda m: m.group(1)+'\n'+line, text, count=1)
    else:
        text=re.sub(r'(protected function schedule\([^)]*\)\s*:?\s*\w*\s*\{)', lambda m: m.group(1)+'\n'+line, text, count=1)
    write(path,text)

def patch_addon_detector_hook():
    path=p('app/Providers/AppServiceProvider.php')
    text=read(path)
    if not text:
        print('[warn] missing AppServiceProvider.php')
        return
    # remove old v14/v21 hook blocks then re-add cleanly
    
    for _v in ['V14','V17','V18','V21']:
        text=re.sub(r'\s*/\* HOSKT_ADDON_PATCH_'+_v+r'_START \*/.*?/\* HOSKT_ADDON_PATCH_'+_v+r'_END \*/', '', text, flags=re.S)
    call=f"""/* HOSKT_ADDON_PATCH_V21_START */
        if (class_exists(\\Pterodactyl\\Support\\HosktAddonPatch\\AddonDetector::class)) {{
            \\Pterodactyl\\Support\\HosktAddonPatch\\AddonDetector::boot();
        }}
        /* HOSKT_ADDON_PATCH_V21_END */"""
    m=re.search(r'public\s+function\s+boot\s*\([^)]*\)\s*(?::\s*[^\{]+)?\s*\{', text)
    if not m:
        print('[warn] could not find AppServiceProvider::boot for addon detector')
        return
    text=text[:m.end()]+'\n        '+call+'\n'+text[m.end():]
    write(path,text)
    # optional harmless note in ThemeController
    tc=p('app/Http/Controllers/Admin/Settings/ThemeController.php')
    t=read(tc)
    if t and 'HOSKT_ADDON_PATCH_V21_THEME_NOTE' not in t:
        note="/* HOSKT_ADDON_PATCH_V21_THEME_NOTE: Installed Addons are adjusted by Pterodactyl\\Support\\HosktAddonPatch\\AddonDetector. */\n"
        t=re.sub(r'^<\?php\s*', lambda _m: "<?php\n"+note, t, count=1)
        write(tc,t)

def patch_server_sidebar():
    # Patch both route-derived sidebar maps and HOSKT mobile drawer render directly.
    path=p('resources/scripts/components/layout/Sidebar.tsx')
    text=read(path)
    if not text: return
    # Remove old icon/path/direct blocks so reinstall stays clean.
    for m in OLD_MARKS:
        text=re.sub(rf'\n?\s*/\* {m}_SIDEBAR_ICONS_BEGIN \*/.*?/\* {m}_SIDEBAR_ICONS_END \*/', '\n', text, flags=re.S)
        text=re.sub(rf'\n?\s*/\* {m}_SIDEBAR_PATHS_BEGIN \*/.*?/\* {m}_SIDEBAR_PATHS_END \*/', '\n', text, flags=re.S)
        text=re.sub(rf'\n?\s*\{{/\* {m}_DIRECT_SERVER_MENU_BEGIN \*/\}}.*?\{{/\* {m}_DIRECT_SERVER_MENU_END \*/\}}\n?', '\n', text, flags=re.S)
    text=re.sub(r'\n?\s*\{\/\* HOSKT_NATIVE_MULTI_DIRECT_SERVER_MENU_BEGIN \*\/\}.*?\{\/\* HOSKT_NATIVE_MULTI_DIRECT_SERVER_MENU_END \*\/\}\n?', '\n', text, flags=re.S)

    def icon_of(label, fallback):
        pats=[rf"['\"]{re.escape(label)}['\"]\s*:\s*(fa[A-Za-z0-9_]+)", rf"\b{re.escape(label)}\b\s*:\s*(fa[A-Za-z0-9_]+)"]
        for pat in pats:
            mm=re.search(pat, text)
            if mm: return mm.group(1)
        return fallback

    files_icon=icon_of('Files','faFolderOpen')
    plugins_icon=icon_of('Plugins','faCube')
    db_icon=icon_of('Databases','faTable')
    settings_icon=icon_of('Settings','faSlidersH')
    users_icon=icon_of('Users','faUserFriends')
    network_icon=icon_of('Network','faGlobe')

    block=f"""
    /* {MARK}_SIDEBAR_ICONS_BEGIN */
    'Server Properties': {settings_icon},
    'Players': {users_icon},
    'Minecraft Utils': {plugins_icon},
    'Domain': {network_icon},
    'Modpacks': {plugins_icon},
    'Worlds': {files_icon},
    'Version': {settings_icon},
    'Bedrock Version': {db_icon},
    /* {MARK}_SIDEBAR_ICONS_END */"""
    text=re.sub(r"(\n\s*Backups\s*:\s*fa[A-Za-z0-9_]+\s*,)", r"\1\n"+block, text, count=1)

    new_labels=["Server Properties","Players","Minecraft Utils","Domain","Modpacks","Worlds","Version","Bedrock Version"]
    def add_labels_to_management(m):
        q=m.group(1); body=m.group(2); end=m.group(3)
        out=body
        for lab in new_labels:
            if lab not in out:
                out += ('' if out.rstrip().endswith(',') else ',') + f" '{lab}'"
        return q + out + end
    text=re.sub(r"(['\"]Management['\"]\s*:\s*\[)([^\]]*Backups[^\]]*)(\])", add_labels_to_management, text, flags=re.S)

    block=f"""
    /* {MARK}_SIDEBAR_PATHS_BEGIN */
    'Server Properties': 'servercfg',
    'Players': 'minecraft/players',
    'Minecraft Utils': 'mc-utils',
    'Domain': 'subdomain',
    'Modpacks': 'modpacks',
    'Worlds': 'minecraft-worlds',
    'Version': 'versions',
    'Bedrock Version': 'versions/pocketmine',
    /* {MARK}_SIDEBAR_PATHS_END */"""
    text=re.sub(r"(\n\s*Backups\s*:\s*['\"]backups['\"]\s*,)", r"\1\n"+block, text, count=1)

    direct=f"""
                                    {{/* {MARK}_DIRECT_SERVER_MENU_BEGIN */}}
                                    {{showServerNav && serverId && (
                                        <>
                                            <SectionTitle>ADDONS</SectionTitle>
                                            <NavItem to={{`/server/${{serverId}}/servercfg`}} onClick={{closeSidebar}} $sidebarItemStyle={{sidebarItemStyle}}>
                                                <FontAwesomeIcon icon={{{settings_icon}}} />
                                                Server Properties
                                            </NavItem>
                                            <NavItem to={{`/server/${{serverId}}/minecraft/players`}} onClick={{closeSidebar}} $sidebarItemStyle={{sidebarItemStyle}}>
                                                <FontAwesomeIcon icon={{{users_icon}}} />
                                                Players
                                            </NavItem>
                                            <NavItem to={{`/server/${{serverId}}/mc-utils`}} onClick={{closeSidebar}} $sidebarItemStyle={{sidebarItemStyle}}>
                                                <FontAwesomeIcon icon={{{plugins_icon}}} />
                                                Minecraft Utils
                                            </NavItem>
                                            <NavItem to={{`/server/${{serverId}}/subdomain`}} onClick={{closeSidebar}} $sidebarItemStyle={{sidebarItemStyle}}>
                                                <FontAwesomeIcon icon={{{network_icon}}} />
                                                Domain
                                            </NavItem>
                                            <NavItem to={{`/server/${{serverId}}/modpacks`}} onClick={{closeSidebar}} $sidebarItemStyle={{sidebarItemStyle}}>
                                                <FontAwesomeIcon icon={{{plugins_icon}}} />
                                                Modpacks
                                            </NavItem>
                                            <NavItem to={{`/server/${{serverId}}/minecraft-worlds`}} onClick={{closeSidebar}} $sidebarItemStyle={{sidebarItemStyle}}>
                                                <FontAwesomeIcon icon={{{files_icon}}} />
                                                Worlds
                                            </NavItem>
                                            <NavItem to={{`/server/${{serverId}}/versions`}} onClick={{closeSidebar}} $sidebarItemStyle={{sidebarItemStyle}}>
                                                <FontAwesomeIcon icon={{{settings_icon}}} />
                                                Version
                                            </NavItem>
                                            <NavItem to={{`/server/${{serverId}}/versions/pocketmine`}} onClick={{closeSidebar}} $sidebarItemStyle={{sidebarItemStyle}}>
                                                <FontAwesomeIcon icon={{{db_icon}}} />
                                                Bedrock Version
                                            </NavItem>
                                        </>
                                    )}}
                                    {{/* {MARK}_DIRECT_SERVER_MENU_END */}}
"""
    text=text.replace('                                    {renderPanelNavigation(true)}', direct+'                                    {renderPanelNavigation(true)}')

    # Safety: fix broken JSX icon attributes left by old v20 patch: icon=faSlidersH -> icon={faSlidersH}
    text=re.sub(r'icon=(fa[A-Za-z0-9_]+)', r'icon={\1}', text)
    write(path,text)

def patch_bagou_hotfix():
    # Bagou admin pages call api.bagou450.com. If DNS/API is down, original code throws 500.
    # Make Bagou admin tabs safe/offline instead of breaking the panel.
    view_dir=p('resources/views/admin/bagoucenter')
    view_dir.mkdir(parents=True, exist_ok=True)
    write(view_dir/'offline.blade.php', """@extends('layouts.admin')

@section('title')
    Bagou Center
@endsection

@section('content-header')
    <h1>Bagou Center<small>External API unavailable.</small></h1>
@endsection

@section('content')
<div class=\"row\">
    <div class=\"col-xs-12\">
        <div class=\"box box-warning\">
            <div class=\"box-header with-border\">
                <h3 class=\"box-title\">Bagou API Offline</h3>
            </div>
            <div class=\"box-body\">
                Panel không kết nối được tới <code>api.bagou450.com</code>. Mình đã chặn lỗi 500 để trang admin không bị trắng.
                Các plugin native trong server vẫn hoạt động độc lập với trang Bagou này.
            </div>
        </div>
    </div>
</div>
@endsection
""")
    bagou_dir=p('app/Http/Controllers/Admin/Bagou')
    bagou_dir.mkdir(parents=True, exist_ok=True)
    for cls in ['BagouLicenseController','BagouVersionsController','BagouSettingsController','BagouMcVersionsController']:
        write(bagou_dir/(cls+'.php'), f"""<?php

namespace Pterodactyl\\Http\\Controllers\\Admin\\Bagou;

use Illuminate\\View\\View;
use Pterodactyl\\Http\\Controllers\\Controller;

class {cls} extends Controller
{{
    public function index(): View
    {{
        return view('admin.bagoucenter.offline');
    }}

    public function __call($method, $parameters)
    {{
        return view('admin.bagoucenter.offline');
    }}
}}
""")
    write(bagou_dir/'BagouCenterController.php', """<?php

namespace Pterodactyl\\Http\\Controllers\\Admin\\Bagou;

use Illuminate\\View\\View;
use Pterodactyl\\Http\\Controllers\\Controller;

class BagouCenterController extends Controller
{
    public function index(): View
    {
        return view('admin.bagoucenter.index', ['apistatus' => 0, 'cdnstatus' => 0]);
    }

    public function settings(): View
    {
        return view('admin.bagoucenter.offline');
    }
}
""")
    det=p('app/Support/HosktAddonPatch/AddonDetector.php')
    if det.exists():
        s=read(det).replace('app/Models/Bagoulicense.php', 'app/Models/BagouLicense.php')
        write(det,s)


def _install_dynamic_logo_script(text):
    """Install one canonical helper tag, even when the panel has no previous tag."""
    filename = 'hoskt-dynamic-logo-fix-v22.js'
    begin = '{{-- HOSKT_DYNAMIC_LOGO_FIX_V23_SAFE_BEGIN --}}'
    finish = '{{-- HOSKT_DYNAMIC_LOGO_FIX_V23_SAFE_END --}}'
    block = (
        f"    {begin}\n"
        f'    <script defer src="/hostkt/{filename}?v=23-safe" '
        f'data-hoskt-logo-helper="v23-safe"></script>\n'
        f"    {finish}\n"
    )

    # Remove blocks created by an earlier run, then remove every legacy/helper
    # script tag regardless of whether it used asset(), url(), a relative URL,
    # or an older cache query. This prevents duplicate execution.
    text = re.sub(
        rf'\n?\s*{re.escape(begin)}.*?{re.escape(finish)}\s*\n?',
        '\n',
        text,
        flags=re.S,
    )
    helper_tag = re.compile(
        rf"""<script\b
             (?=[^>]*\bsrc\s*=\s*(?:\"[^\"]*{re.escape(filename)}[^\"]*\"|'[^']*{re.escape(filename)}[^']*'))
             [^>]*>\s*</script>""",
        flags=re.I | re.S | re.X,
    )
    text = helper_tag.sub('', text)

    # Prefer loading at the end of <body>. Some customized Blade layouts do not
    # have a conventional body tag, so fall back to </html>, then EOF.
    matches = list(re.finditer(r'</body\s*>', text, flags=re.I))
    if not matches:
        matches = list(re.finditer(r'</html\s*>', text, flags=re.I))
    if matches:
        at = matches[-1].start()
        prefix = text[:at]
        if prefix and not prefix.endswith('\n'):
            prefix += '\n'
        return prefix + block + text[at:]

    if text and not text.endswith('\n'):
        text += '\n'
    return text + block


def patch_dynamic_logo_target_fix():
    """Keep the native HOSKT header/sidebar and load the scoped helper safely."""
    js = p('public/hostkt/hoskt-dynamic-logo-fix-v22.js')
    js_text = read(js)
    safe_marker = "window.__HOSKT_LOGO_TARGET_FIX__ = 'v23-safe';"
    if not js_text or safe_marker not in js_text:
        raise RuntimeError('Safe HOSKT dynamic-logo helper was not copied to public/hostkt.')

    for rel in ('resources/views/templates/wrapper.blade.php', 'resources/views/layouts/admin.blade.php'):
        path = p(rel)
        text = read(path)
        if not text:
            print(f'[warn] missing {rel}; dynamic-logo helper was not injected there')
            continue
        write(path, _install_dynamic_logo_script(text))

def main():
    patch_permissions_transformer()
    patch_routes_ts()
    patch_dashboard_route()
    patch_settings_box()
    patch_server_sidebar()
    patch_admin_menu()
    patch_bagou_hotfix()
    patch_kernel()
    patch_addon_detector_hook()
    patch_dynamic_logo_target_fix()
    print('HOSKT native multi patcher V22.3.1 + V19 modpack route shadow fix (V17/V16 preserved) completed.')

if __name__ == '__main__':
    main()
