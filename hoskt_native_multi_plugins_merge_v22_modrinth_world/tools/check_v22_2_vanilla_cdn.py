#!/usr/bin/env python3
"""Static validation for HOSKT V22.2 Vanilla CDN icon and local fallback."""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / 'payload/files'
CDN = 'https://cdn.nguyenhung401.id.vn/img/vanilla-icon.jpg'


def main() -> int:
    errors: list[str] = []

    row = PAYLOAD / 'resources/scripts/components/server/versions/McVersionsRow.tsx'
    png = PAYLOAD / 'public/extensions/hoskt-native-version-manager/icons/vanilla-icon.png'
    page_jump = PAYLOAD / 'resources/scripts/components/elements/PageJumpControl.tsx'
    versions = PAYLOAD / 'resources/scripts/components/server/versions/McVersionsContainer.tsx'
    modpacks = PAYLOAD / 'resources/scripts/components/server/minecraft-modpacks/ModpacksContainer.tsx'
    worlds = PAYLOAD / 'resources/scripts/components/server/minecraft-worlds/MinecraftWorldContainer.tsx'

    if not row.is_file():
        errors.append(f'missing file: {row.relative_to(ROOT)}')
        text = ''
    else:
        text = row.read_text(encoding='utf-8', errors='replace')

    markers = [
        f"const vanillaCdnIcon = '{CDN}'",
        "const localVanillaPng = '/extensions/hoskt-native-version-manager/icons/vanilla-icon.png?v=22.2'",
        "stype === 'vanilla' ? vanillaCdnIcon : providerRemoteIcon",
        "'vanilla-cdn'",
        "'vanilla-local-png'",
        "data-fallback-stage",
        "default.svg?v=22.2",
    ]
    for marker in markers:
        if marker not in text:
            errors.append(f'{row.relative_to(ROOT)}: missing marker {marker!r}')

    if text.count(CDN) != 1:
        errors.append('The exact Vanilla CDN URL must occur exactly once in McVersionsRow.tsx.')

    if not png.is_file():
        errors.append(f'missing local fallback: {png.relative_to(ROOT)}')
    else:
        signature = png.read_bytes()[:8]
        if signature != b'\x89PNG\r\n\x1a\n':
            errors.append(f'{png.relative_to(ROOT)} is not a valid PNG signature.')

    shared_checks = {
        page_jump: ["type='number'", 'safeTotalPages', 'onPageSelect(nextPage)'],
        versions: ["<option value='modpacks'>Modpacks</option>", '<ModpacksContainer embedded />'],
        modpacks: ['totalPages={modpacks.pagination.totalPages}', '<PageJumpControl'],
        worlds: ['totalPages={maps.pagination.totalPages}', "<option value='modrinth'>Modrinth</option>"],
    }
    for path, required in shared_checks.items():
        if not path.is_file():
            errors.append(f'missing preserved V22.1/V22 file: {path.relative_to(ROOT)}')
            continue
        body = path.read_text(encoding='utf-8', errors='replace')
        for marker in required:
            if marker not in body:
                errors.append(f'{path.relative_to(ROOT)}: missing preserved marker {marker!r}')

    if errors:
        print('V22.2 validation FAILED:', file=sys.stderr)
        for error in errors:
            print(f'- {error}', file=sys.stderr)
        return 1

    print('OK: exact Vanilla CDN URL is configured in Version Manager.')
    print('OK: fallback chain is CDN -> bundled PNG -> provider SVG -> default SVG.')
    print('OK: page jump, inline Modpacks, and Modrinth World Manager markers remain present.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
