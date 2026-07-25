#!/usr/bin/env python3
"""Static regression checks for the V18 manager/provider repair."""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / 'payload/files'

CHECKS = {
    PAYLOAD / 'app/Services/Mods/ModSearchService.php': [
        'namespace Pterodactyl\\Services\\Mods;',
        'class ModSearchService',
        "'base_uri' => 'https://api.modrinth.com/v2/'",
        "addons.minecraft_mod_installer.settings.curseforge_api_key",
        'array_is_list($platforms)',
        "'downloadUrl' =>",
        "'fileName' =>",
    ],
    PAYLOAD / 'app/Services/Minecraft/Maps/CurseForgeMapService.php': [
        "config('services.curseforge.api_key')",
        "env('CURSEFORGE_API_KEY', '')",
        "addons.minecraft_modpack_installer.settings.curseforge_api_key",
        'CurseForge API key is missing.',
        "'foreground' => true",
    ],
    PAYLOAD / 'app/Http/Controllers/Api/Client/Servers/MinecraftWorldController.php': [
        'use Illuminate\\Validation\\ValidationException;',
        'catch (\\RuntimeException $exception)',
        'ValidationException::withMessages',
    ],
    PAYLOAD / 'app/Services/Minecraft/NativeVersionCatalogService.php': [
        "public const SOURCE = 'hoskt-native-v18';",
        "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json",
        'https://fill.papermc.io/v3/projects/',
        'https://api.purpurmc.org/v2/purpur/',
        'https://meta.fabricmc.net/v2/versions/game',
        '/server/jar',
        "withHeaders(['User-Agent' => $this->userAgent()])",
    ],
    PAYLOAD / 'app/Http/Controllers/Api/Client/Servers/VersionsController.php': [
        'private NativeVersionCatalogService $nativeVersions',
        'NativeVersionCatalogService::SOURCE',
        "'completed' => true",
        "'filename' => $filename",
        'legacyBagouList',
    ],
    PAYLOAD / 'resources/scripts/components/server/versions/McVersionsRow.tsx': [
        "const result = typeof data === 'object' && data !== null ? data : { size: data };",
        'if (result.completed === true)',
        'finishDownloadedVersion(filename, archive, java)',
        "ghcr.io/pterodactyl/yolks:java_21",
        'getVersionFileSize(uuid, filename)',
    ],
    PAYLOAD / 'app/Support/HosktAddonPatch/AddonDetector.php': [
        "'minecraft-mod-installer' => [",
        "'app/Services/Mods/ModSearchService.php'",
    ],
}


def main() -> int:
    errors: list[str] = []
    for path, markers in CHECKS.items():
        if not path.is_file():
            errors.append(f'missing file: {path.relative_to(ROOT)}')
            continue
        text = path.read_text(encoding='utf-8', errors='replace')
        for marker in markers:
            if marker not in text:
                errors.append(f'{path.relative_to(ROOT)}: missing marker {marker!r}')

    if errors:
        print('V18 manager/provider check FAILED:', file=sys.stderr)
        for error in errors:
            print(f'- {error}', file=sys.stderr)
        return 1

    print('OK: V18 Mod Manager backend, World Manager key handling, and native Version Manager are present.')
    print('OK: Native completed-download responses and legacy Bagou polling are both handled.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
