#!/usr/bin/env python3
"""Regression checks for V17 selected-preset and MOTD aspect-label contrast fixes."""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'payload/files/resources/scripts/components/server/mcutils/sections/components'

checks = {
    BASE / 'MOTDCreator.tsx': [
        'const getReadableTextColor = (hexColor: string): string =>',
        "WebkitTextFillColor: getReadableTextColor(color)",
        "aria-label={`Insert Minecraft color code &${code}`}",
        "const next = index + 1 < text.length ? text[index + 1].toLowerCase() : '';",
    ],
    BASE / 'MinecraftRainbowTextGenerator.tsx': [
        ".hoskt-rainbow-preset-label",
        "-webkit-text-fill-color: rgb(244, 244, 245) !important;",
        "data-selected={selected ? 'true' : 'false'}",
        "hoskt-rainbow-control hoskt-rainbow-preset",
        "hoskt-rainbow-preset-label block w-full",
    ],
}

errors = []
for path, markers in checks.items():
    try:
        text = path.read_text(encoding='utf-8')
    except OSError as exc:
        errors.append(f'{path}: {exc}')
        continue
    for marker in markers:
        if marker not in text:
            errors.append(f'{path.name}: missing marker: {marker}')

if errors:
    print('Minecraft Utilities V17 contrast check FAILED:', file=sys.stderr)
    for error in errors:
        print(f' - {error}', file=sys.stderr)
    raise SystemExit(1)

print('OK: V17 keeps V16 safety and improves selected preset/MOTD aspect label contrast only.')
