#!/usr/bin/env python3
"""Verify that HOSKT's original /modpacks route cannot shadow the native route."""
from __future__ import annotations

import argparse
import re
from pathlib import Path


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--panel', required=True)
    args = parser.parse_args()

    routes = Path(args.panel) / 'resources/scripts/routers/routes.ts'
    if not routes.is_file():
        print(f'ERROR: missing {routes}')
        return 1

    text = routes.read_text(encoding='utf-8', errors='replace')
    path_count = len(re.findall(r"path:\s*['\"]\/modpacks['\"]", text))
    native_count = len(re.findall(
        r"path:\s*['\"]\/modpacks['\"][\s\S]{0,240}?component:\s*NativeHOSKTModpacksContainer\b",
        text,
    ))
    shadow_count = len(re.findall(
        r"path:\s*['\"]\/modpacks['\"][\s\S]{0,240}?component:\s*ModpacksContainer\b",
        text,
    ))

    errors: list[str] = []
    if path_count != 1:
        errors.append(f'expected exactly one /modpacks route, found {path_count}')
    if native_count != 1:
        errors.append(f'expected NativeHOSKTModpacksContainer once, found {native_count}')
    if shadow_count != 0:
        errors.append(f'original HOSKT ModpacksContainer still shadows the route ({shadow_count})')

    if errors:
        print('V19 modpack route-shadow check FAILED:')
        for error in errors:
            print(f'- {error}')
        return 1

    print('OK: exactly one /modpacks route exists and it uses NativeHOSKTModpacksContainer.')
    print('OK: original HOSKT ModpacksContainer no longer shadows the installed native manager.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
