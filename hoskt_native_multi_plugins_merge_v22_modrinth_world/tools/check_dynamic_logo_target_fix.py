#!/usr/bin/env python3
"""Validate the scoped HOSKT dynamic-logo helper in a package or installed panel."""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys

SAFE_MARKER = "window.__HOSKT_LOGO_TARGET_FIX__ = 'v23-safe';"
DANGEROUS_TOKENS = (
    "findMobileHeaderServerTitle",
    "findServerTopHeaderTitle",
    "document.querySelectorAll('body span, body div')",
    'document.querySelectorAll("body span, body div")',
    "title.innerHTML =",
    "applyServerTopLogo",
)
REQUIRED_TOKENS = (
    SAFE_MARKER,
    ".hoskt-mobile-top-panel-logo",
    "cleanupLegacyInjectedTargets",
    "normalizeKnownLogoImages",
    "attributeFilter: ['data-theme', 'src']",
)


def check_js(path: Path, errors: list[str]) -> None:
    if not path.is_file():
        errors.append(f"missing dynamic-logo helper: {path}")
        return
    text = path.read_text(encoding="utf-8", errors="replace")
    for token in REQUIRED_TOKENS:
        if token not in text:
            errors.append(f"{path} is missing required marker {token!r}")
    for token in DANGEROUS_TOKENS:
        if token in text:
            errors.append(f"{path} still contains dangerous broad-target token {token!r}")
    if re.search(r"querySelectorAll\([^)]*body\s+(?:span|div)", text, flags=re.I):
        errors.append(f"{path} still scans body text nodes for a logo target")
    if ".innerHTML" in text:
        errors.append(f"{path} must not inject logo markup through innerHTML")


def check_views(root: Path, errors: list[str]) -> None:
    view_paths = (
        root / "resources/views/templates/wrapper.blade.php",
        root / "resources/views/layouts/admin.blade.php",
    )
    existing = [path for path in view_paths if path.is_file()]
    if not existing:
        return
    canonical = "hoskt-dynamic-logo-fix-v22.js?v=23-safe"
    filename = "hoskt-dynamic-logo-fix-v22.js"
    for path in existing:
        text = path.read_text(encoding="utf-8", errors="replace")
        canonical_count = text.count(canonical)
        filename_count = text.count(filename)
        if canonical_count == 0:
            errors.append(f"{path} does not load the safe helper with ?v=23-safe")
        elif canonical_count > 1:
            errors.append(f"{path} loads the safe helper {canonical_count} times; expected exactly once")
        if filename_count != canonical_count:
            errors.append(f"{path} still contains a legacy or non-cache-busted helper reference")


def main() -> int:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--package", type=Path, help="Package root containing payload/files")
    group.add_argument("--panel", type=Path, help="Installed panel root")
    args = parser.parse_args()

    errors: list[str] = []
    if args.package:
        root = args.package.resolve()
        js = root / "payload/files/public/hostkt/hoskt-dynamic-logo-fix-v22.js"
        check_js(js, errors)
    else:
        root = args.panel.resolve()
        js = root / "public/hostkt/hoskt-dynamic-logo-fix-v22.js"
        check_js(js, errors)
        check_views(root, errors)

    if errors:
        print("HOSKT dynamic logo target check FAILED:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("OK: HOSKT logo helper is scoped to native header/logo elements only.")
    print("OK: No body div/span scan or innerHTML logo injection remains.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
