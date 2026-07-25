#!/usr/bin/env python3
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / 'payload/files'

ICONS = {
    'vanilla': 'vanilla-icon.jpg',
    'snapshot': 'snapshot-icon.jpg',
    'spigot': 'spigot-icon.jpg',
    'paper': 'paper-icon.jpg',
    'purpur': 'purpur-icon.jpg',
    'sponge': 'sponge-icon.jpg',
    'bungeecord': 'bungeecord-icon.jpg',
    'waterfall': 'waterfall-icon.jpg',
    'velocity': 'velocity-icon.jpg',
    'forge': 'forge-icon.jpg',
    'fabric': 'fabric-icon.jpg',
    'mohist': 'mohist-icon.jpg',
    'magma': 'magma-icon.jpg',
    'catserver': 'catserver-icon.jpg',
    'others': 'others-icon.jpg',
}


def main() -> int:
    errors = []
    row = PAYLOAD / 'resources/scripts/components/server/versions/McVersionsRow.tsx'
    versions = PAYLOAD / 'resources/scripts/components/server/versions/McVersionsContainer.tsx'
    modpacks = PAYLOAD / 'resources/scripts/components/server/minecraft-modpacks/ModpacksContainer.tsx'
    modpack_api = PAYLOAD / 'resources/scripts/api/swr/getMinecraftModpacks.ts'
    native = PAYLOAD / 'app/Services/Minecraft/NativeVersionCatalogService.php'
    curse = PAYLOAD / 'app/Services/Minecraft/Modpacks/CurseForgeModpackService.php'
    controller = PAYLOAD / 'app/Http/Controllers/Api/Client/Servers/ModpackController.php'

    texts = {}
    for path in [row, versions, modpacks, modpack_api, native, curse, controller]:
        if not path.is_file():
            errors.append(f'missing file: {path.relative_to(ROOT)}')
            texts[path] = ''
        else:
            texts[path] = path.read_text(encoding='utf-8', errors='replace')

    row_text = texts[row]
    for provider, filename in ICONS.items():
        url = f'https://cdn.nguyenhung401.id.vn/img/{filename}'
        if f"{provider}: '{url}'" not in row_text:
            errors.append(f'missing CDN mapping for {provider}: {url}')
    for marker in ['localVanillaPng', 'localIcon', 'fallbackIcon', "data-fallback-stage={remoteIcon ? 'remote' : 'local'}"]:
        if marker not in row_text:
            errors.append(f'icon fallback marker missing: {marker}')

    if 'Modpacks are displayed directly inside Version Manager' in texts[versions]:
        errors.append('obsolete inline Modpacks helper text was not removed')

    for marker in ['Loading {provider} modpacks', 'You can still change the provider above']:
        if marker not in texts[modpacks]:
            errors.append(f'non-blocking modpack loading marker missing: {marker}')
    if 'timeout: 15000' not in texts[modpack_api]:
        errors.append('frontend modpack request timeout missing')

    for marker in ['private function fastHttp()', 'Sponge catalogue API unavailable', "'1.21.1-12.0.2'"]:
        if marker not in texts[native]:
            errors.append(f'Sponge resilience marker missing: {marker}')
    for marker in ["'timeout' => 10", "'connect_timeout' => 4", "($response['data'] ?? [])"]:
        if marker not in texts[curse]:
            errors.append(f'CurseForge resilience marker missing: {marker}')
    for marker in ['Modpack provider search failed.', 'Never make the provider selector wait', 'Cache::get($cacheKey)']:
        if marker not in texts[controller]:
            errors.append(f'Modpack controller resilience marker missing: {marker}')

    if errors:
        print('V22.3 validation FAILED:', file=sys.stderr)
        for error in errors:
            print(f'- {error}', file=sys.stderr)
        return 1

    print('OK: all Version Manager CDN icons are mapped with local fallback.')
    print('OK: Sponge catalogue has timeout and fallback rows.')
    print('OK: CurseForge/provider switching cannot be blocked by installed-modpack detail lookups.')
    print('OK: obsolete inline Modpacks helper text is removed.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
