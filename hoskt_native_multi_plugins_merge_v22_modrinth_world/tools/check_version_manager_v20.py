#!/usr/bin/env python3
"""Static regression checks for HOSKT Version Manager V20."""
from __future__ import annotations

import hashlib
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / 'payload/files'


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    errors: list[str] = []

    # V19 route-shadow behavior must match the approved versioned preservation baseline.
    manifest = Path(__file__).with_name('v19_route_preserved_sha256.txt')
    for line in manifest.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        expected, relative = line.split(maxsplit=1)
        path = ROOT / relative
        if not path.is_file():
            errors.append(f'missing V19 preserved file: {relative}')
        elif digest(path) != expected:
            errors.append(f'changed V19 preserved file: {relative}')

    checks = {
        PAYLOAD / 'app/Services/Minecraft/NativeVersionCatalogService.php': [
            "'spigot'", "'sponge'", "'waterfall'", "'forge'", "'mohist'", "'magma'", "'catserver'",
            'https://hub.spigotmc.org/jenkins/job/BuildTools/',
            'https://maven.minecraftforge.net/net/minecraftforge/forge/maven-metadata.xml',
            'https://dl-api.spongepowered.org/v1/org.spongepowered/spongevanilla',
            'https://mohistmc.com/api/v2/projects/mohist/',
            'https://api.github.com/repos/',
            'Cache::remember',
            'legacyPaperProjectVersions',
            'resolveLegacyPaperProject',
            "'install_mode' => 'spigot-buildtools'",
            "'install_mode' => 'forge-installer'",
        ],
        PAYLOAD / 'app/Http/Controllers/Api/Client/Servers/VersionsController.php': [
            'spigotBuildToolsStartup',
            'proxyJarStartup',
            'command -v git',
            'forgeInstallerStartup',
            "'bootstrap' => $bootstrap",
            "'install_mode', $installMode",
        ],
        PAYLOAD / 'resources/scripts/components/server/versions/McVersionsRow.tsx': [
            '/extensions/hoskt-native-version-manager/icons/',
            'if (result.bootstrap === true)',
            'finishBootstrapVersion',
            'BuildTools.jar',
            'forge-installer.jar',
            'ghcr.io/pterodactyl/yolks:java_25',
            'ghcr.io/pterodactyl/yolks:java_11',
        ],
        PAYLOAD / 'resources/scripts/components/server/versions/McVersionsContainer.tsx': [
            "<option value='modpacks'>Modpacks</option>",
        ],
        PAYLOAD / 'database/migrations/2026_07_10_000001_add_java25_to_java_eggs.php': [
            "ghcr.io/pterodactyl/yolks:java_25",
            "str_contains((string) $image, 'ghcr.io/pterodactyl/yolks:java_')",
        ],
        PAYLOAD / 'app/Services/Minecraft/Modpacks/CurseForgeModpackService.php': [
            'resolveApiKey',
            "env('CURSEFORGE_API_KEY', '')",
            "readEnvFileValue('CURSEFORGE_API_KEY')",
            'addons.minecraft_modpack_installer.settings.curseforge_api_key',
        ],
    }

    for path, markers in checks.items():
        if not path.is_file():
            errors.append(f'missing file: {path.relative_to(ROOT)}')
            continue
        text = path.read_text(encoding='utf-8', errors='replace')
        for marker in markers:
            if marker not in text:
                errors.append(f'{path.relative_to(ROOT)}: missing marker {marker!r}')

    row = (PAYLOAD / 'resources/scripts/components/server/versions/McVersionsRow.tsx').read_text(encoding='utf-8')
    if 'cdn.bagou450.com' in row:
        errors.append('Version Manager still references the retired Bagou image CDN.')

    container = (PAYLOAD / 'resources/scripts/components/server/versions/McVersionsContainer.tsx').read_text(encoding='utf-8')
    has_legacy_redirect = "history.push(`/server/${shortUuid}/modpacks`)" in container
    has_embedded_manager = 'ModpacksContainer embedded' in container and "versionsType === 'modpacks'" in container
    if not (has_legacy_redirect or has_embedded_manager):
        errors.append('Version Manager has neither the legacy Modpacks redirect nor the V22.1 embedded Modpacks view.')

    icon_dir = PAYLOAD / 'public/extensions/hoskt-native-version-manager/icons'
    expected_icons = {
        'default', 'vanilla', 'snapshot', 'spigot', 'paper', 'purpur', 'sponge', 'bungeecord',
        'waterfall', 'velocity', 'forge', 'fabric', 'mohist', 'magma', 'catserver', 'modpacks',
    }
    actual_icons = {path.stem for path in icon_dir.glob('*.svg')} if icon_dir.is_dir() else set()
    missing_icons = sorted(expected_icons - actual_icons)
    if missing_icons:
        errors.append('missing local icons: ' + ', '.join(missing_icons))

    native = (PAYLOAD / 'app/Services/Minecraft/NativeVersionCatalogService.php').read_text(encoding='utf-8')
    row_text = (PAYLOAD / 'resources/scripts/components/server/versions/McVersionsRow.tsx').read_text(encoding='utf-8')
    for label, source in [('PHP', native), ('TypeScript', row_text)]:
        if 'minor >= 20' in source:
            errors.append(f'{label} still maps every Minecraft 1.20.x release to Java 21.')
        if 'minor >= 12' in source:
            errors.append(f'{label} still maps legacy Minecraft releases to Java 11.')
        if 'minor === 17' not in source:
            errors.append(f'{label} is missing the Minecraft 1.17 -> Java 16 rule.')

    if errors:
        print('V20 Version Manager check FAILED:', file=sys.stderr)
        for error in errors:
            print(f'- {error}', file=sys.stderr)
        return 1

    print('OK: V19 route-shadow behavior matches the approved V22.3.1 preservation baseline.')
    print('OK: V9/V14/V15/V16/V17 preservation is delegated to the existing V19 checks.')
    print('OK: Local Version Manager icons and all native provider routes are present.')
    print('OK: Spigot/Forge first-start installers and a supported Modpacks integration are present.')
    print('OK: Java 8/11/16/17/21/25 selection and Java 25 egg migration are present.')
    print('OK: CurseForge key can be read from HOSKT settings or CURSEFORGE_API_KEY.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
