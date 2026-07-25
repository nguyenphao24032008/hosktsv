#!/usr/bin/env python3
"""Verify V9/V14/V15/V16/V17 runtime-sensitive files are byte-for-byte preserved."""
from __future__ import annotations

import hashlib
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = Path(__file__).with_name('v17_preserved_sha256.txt')


def digest(path: Path) -> str:
    h = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b''):
            h.update(chunk)
    return h.hexdigest()


def main() -> int:
    errors: list[str] = []
    if not MANIFEST.is_file():
        print(f'V17 preservation check FAILED: missing {MANIFEST}', file=sys.stderr)
        return 1

    checked = 0
    for line in MANIFEST.read_text(encoding='utf-8').splitlines():
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        try:
            expected, relative = line.split(maxsplit=1)
        except ValueError:
            errors.append(f'invalid manifest line: {line!r}')
            continue
        path = ROOT / relative
        if not path.is_file():
            errors.append(f'missing preserved file: {relative}')
            continue
        actual = digest(path)
        if actual != expected:
            errors.append(f'changed preserved file: {relative}\n  expected {expected}\n  actual   {actual}')
        checked += 1

    if errors:
        print('V17 preservation check FAILED:', file=sys.stderr)
        for error in errors:
            print(f'- {error}', file=sys.stderr)
        return 1

    print(f'OK: {checked} V9/V14/V15/V16/V17 runtime-sensitive files are byte-for-byte unchanged.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
