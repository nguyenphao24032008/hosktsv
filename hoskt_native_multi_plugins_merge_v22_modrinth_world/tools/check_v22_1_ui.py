#!/usr/bin/env python3
"""Static checks for HOSKT V22.1 pagination, embedded modpacks, and image fallback."""
from __future__ import annotations

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
PAYLOAD = ROOT / 'payload/files'


def require(path: Path, markers: list[str], errors: list[str]) -> str:
    if not path.is_file():
        errors.append(f'missing file: {path.relative_to(ROOT)}')
        return ''
    text = path.read_text(encoding='utf-8', errors='replace')
    for marker in markers:
        if marker not in text:
            errors.append(f'{path.relative_to(ROOT)}: missing marker {marker!r}')
    return text


def main() -> int:
    errors: list[str] = []

    page_jump = require(
        PAYLOAD / 'resources/scripts/components/elements/PageJumpControl.tsx',
        [
            'Page <strong',
            'safeTotalPages',
            "type='number'",
            "inputMode='numeric'",
            'onPageSelect(nextPage)',
        ],
        errors,
    )

    pagination_mc = require(
        PAYLOAD / 'resources/scripts/components/elements/PaginationMc.tsx',
        [
            "import PageJumpControl from '@/components/elements/PageJumpControl'",
            'totalPages',
            'currentPage',
            '<PageJumpControl',
        ],
        errors,
    )

    versions = require(
        PAYLOAD / 'resources/scripts/components/server/versions/McVersionsContainer.tsx',
        [
            "import ModpacksContainer from '@/components/server/minecraft-modpacks/ModpacksContainer'",
            "<option value='modpacks'>Modpacks</option>",
            '<ModpacksContainer embedded />',
            "versionsType === 'modpacks'",
        ],
        errors,
    )

    version_row = require(
        PAYLOAD / 'resources/scripts/components/server/versions/McVersionsRow.tsx',
        [
            'remoteIcon',
            'localIcon',
            'fallbackIcon',
            'data-fallback-stage',
            "'/extensions/hoskt-native-version-manager/icons/default.svg?v=22.1'",
        ],
        errors,
    )

    modpacks = require(
        PAYLOAD / 'resources/scripts/components/server/minecraft-modpacks/ModpacksContainer.tsx',
        [
            'embedded?: boolean',
            '<PageJumpControl',
            'totalPages={modpacks.pagination.totalPages}',
            'if (embedded)',
        ],
        errors,
    )

    worlds = require(
        PAYLOAD / 'resources/scripts/components/server/minecraft-worlds/MinecraftWorldContainer.tsx',
        [
            "import PageJumpControl from '@/components/elements/PageJumpControl'",
            '<PageJumpControl',
            'totalPages={maps.pagination.totalPages}',
            "<option value='modrinth'>Modrinth</option>",
        ],
        errors,
    )

    api = require(
        PAYLOAD / 'resources/scripts/api/server/version/getMinecraftVersions.ts',
        [
            'const totalPages = Math.max(1, Number(data.page) || 1)',
            'currentPage',
            'totalPages',
        ],
        errors,
    )

    if 'history.push(`/server/${shortUuid}/modpacks`)' in versions:
        errors.append('Version Manager still redirects Modpacks to another route.')

    for label, text in [('Version row', version_row), ('Version container', versions)]:
        if 'cdn.nguyenhung401.id.vn' in text or 'cdn.bagou450.com' in text:
            errors.append(f'{label} still hard-codes an external version icon CDN.')

    if page_jump.count("type='number'") != 1:
        errors.append('PageJumpControl should contain exactly one numeric page input.')

    if pagination_mc.count('<PageJumpControl') != 1:
        errors.append('Version pagination should render exactly one shared page-jump control.')

    if errors:
        print('V22.1 UI check FAILED:', file=sys.stderr)
        for error in errors:
            print(f'- {error}', file=sys.stderr)
        return 1

    print('OK: Version, Mod, and World managers expose current/total pages and a numeric page jump.')
    print('OK: Modpacks render inside Version Manager without navigating to another route.')
    print('OK: Version icons use provider URL when available, then local SVG, then default SVG.')
    print('OK: V22 Modrinth World Manager markers remain present.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
