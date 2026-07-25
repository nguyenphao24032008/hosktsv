#!/usr/bin/env python3
"""Regression test for V22.3.1 dynamic-logo Blade injection."""

from __future__ import annotations

from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

PACKAGE = Path(__file__).resolve().parents[1]
PATCHER = PACKAGE / "tools/patch_hoskt_native_multi.py"
CHECKER = PACKAGE / "tools/check_dynamic_logo_target_fix.py"
SAFE_JS = PACKAGE / "payload/files/public/hostkt/hoskt-dynamic-logo-fix-v22.js"
CANONICAL = "hoskt-dynamic-logo-fix-v22.js?v=23-safe"
FILENAME = "hoskt-dynamic-logo-fix-v22.js"


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def run(*args: str) -> None:
    subprocess.run(args, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)


def assert_view(path: Path) -> None:
    text = path.read_text(encoding="utf-8")
    assert text.count(CANONICAL) == 1, f"canonical helper count is wrong in {path}"
    assert text.count(FILENAME) == 1, f"legacy or duplicate helper remains in {path}"
    assert "?v=old" not in text, f"old cache query remains in {path}"


def main() -> int:
    with tempfile.TemporaryDirectory(prefix="hoskt-logo-injection-") as temp:
        panel = Path(temp) / "panel"
        js_target = panel / "public/hostkt/hoskt-dynamic-logo-fix-v22.js"
        js_target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(SAFE_JS, js_target)

        # Real-panel failure case: wrapper has no helper at all.
        write(
            panel / "resources/views/templates/wrapper.blade.php",
            "<!doctype html>\n<html><body><div id=\"app\"></div></body></html>\n",
        )
        # Customized panel case: helper uses Laravel asset() and an old query.
        write(
            panel / "resources/views/layouts/admin.blade.php",
            "<html><body>\n<script src=\"{{ asset('hostkt/hoskt-dynamic-logo-fix-v22.js') }}?v=old\"></script>\n</body></html>\n",
        )

        run(sys.executable, str(PATCHER), str(panel))
        run(sys.executable, str(CHECKER), "--panel", str(panel))
        assert_view(panel / "resources/views/templates/wrapper.blade.php")
        assert_view(panel / "resources/views/layouts/admin.blade.php")

        # A second installation must not create duplicate script tags.
        run(sys.executable, str(PATCHER), str(panel))
        run(sys.executable, str(CHECKER), "--panel", str(panel))
        assert_view(panel / "resources/views/templates/wrapper.blade.php")
        assert_view(panel / "resources/views/layouts/admin.blade.php")

    print("OK: dynamic-logo helper is inserted when missing, normalized, and idempotent.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
