#!/usr/bin/env python3
"""Static regression check for Minecraft Utilities V14 original-theme shell renderer."""

from pathlib import Path
import os
import re
import shutil
import subprocess
import sys
import tempfile

PACKAGE_ROOT = Path(__file__).resolve().parents[1]
MCUTILS = PACKAGE_ROOT / "payload/files/resources/scripts/components/server/mcutils"
CONTAINER = MCUTILS / "sections/McUtilsContainer.tsx"

FORBIDDEN_GLOBAL = (
    "content-visibility: auto",
    "translateZ(0)",
    "translate3d(0",
    "backface-visibility: hidden",
    "contain: paint",
    "contain: strict",
)

FORBIDDEN_CONTAINER = (
    "<iframe",
    "FRAME_DOCUMENT",
    "srcDoc=",
    "frameRef",
    "ResizeObserver",
    "frame.style.height",
    "scrolling='no'",
    'scrolling="no"',
    "attachShadow",
    "ShadowRoot",
    "MutationObserver",
    "addEventListener('touchmove'",
    'addEventListener("touchmove"',
    "event.preventDefault()",
    "scrollTop +=",
    "findPageScroller",
    "canScrollInDirection",
    "position: fixed",
    "position: sticky",
    "hoskt-mcutils-topbar",
    "hoskt-mcutils-sidebar-v12",
    "hoskt-mcutils-menu-stage-v12",
    "PanelLogo",
    "BrandMark",
    "FontAwesomeIcon",
    "appRoot.style.setProperty('display', 'none'",
    "body.hoskt-mcutils-standalone",
    "standalone-body-portal",
)


def find_typescript_module() -> Path | None:
    candidates: list[Path] = []
    panel_dir = os.environ.get("HOSKT_PANEL_DIR", "").strip()
    if panel_dir:
        candidates.append(Path(panel_dir) / "node_modules/typescript/lib/typescript.js")

    node_path = os.environ.get("NODE_PATH", "")
    for entry in node_path.split(os.pathsep):
        if entry.strip():
            candidates.append(Path(entry) / "typescript/lib/typescript.js")

    npm = shutil.which("npm")
    if npm:
        result = subprocess.run([npm, "root", "-g"], text=True, capture_output=True, check=False)
        if result.returncode == 0 and result.stdout.strip():
            candidates.append(Path(result.stdout.strip()) / "typescript/lib/typescript.js")

    node = shutil.which("node")
    if node:
        result = subprocess.run(
            [node, "-e", "try{console.log(require.resolve('typescript'))}catch(e){process.exit(1)}"],
            cwd=panel_dir if panel_dir and Path(panel_dir).is_dir() else None,
            text=True,
            capture_output=True,
            check=False,
        )
        if result.returncode == 0 and result.stdout.strip():
            candidates.append(Path(result.stdout.strip()))

    seen: set[Path] = set()
    for candidate in candidates:
        try:
            resolved = candidate.expanduser().resolve()
        except OSError:
            resolved = candidate.expanduser()
        if resolved in seen:
            continue
        seen.add(resolved)
        if resolved.is_file():
            return resolved
    return None


def parse_typescript(source_files: list[Path]) -> list[str]:
    typescript_module = find_typescript_module()
    if typescript_module is None:
        print(
            "WARNING: Không tìm thấy module TypeScript cho bước kiểm tra phụ; "
            "sẽ kiểm tra đầy đủ khi chạy yarn build.",
            file=sys.stderr,
        )
        return []

    node_script = r"""
const ts = require(process.argv[2]);
const fs = require('fs');
let failed = false;
for (const file of process.argv.slice(3)) {
  const text = fs.readFileSync(file, 'utf8');
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, kind);
  for (const d of sf.parseDiagnostics) {
    failed = true;
    const pos = sf.getLineAndCharacterOfPosition(d.start || 0);
    const msg = ts.flattenDiagnosticMessageText(d.messageText, '\n');
    console.error(`${file}:${pos.line + 1}:${pos.character + 1}: ${msg}`);
  }
}
process.exit(failed ? 1 : 0);
"""
    with tempfile.NamedTemporaryFile("w", suffix=".js", delete=False, encoding="utf-8") as handle:
        handle.write(node_script)
        script_path = Path(handle.name)

    try:
        result = subprocess.run(
            ["node", str(script_path), str(typescript_module), *map(str, source_files)],
            text=True,
            capture_output=True,
            check=False,
        )
    finally:
        script_path.unlink(missing_ok=True)

    if result.returncode == 0:
        return []
    output = (result.stderr or result.stdout).strip()
    return [f"TypeScript syntax parser failed: {line}" for line in output.splitlines() if line.strip()]


def main() -> int:
    errors: list[str] = []
    source_files = sorted([*MCUTILS.rglob("*.ts"), *MCUTILS.rglob("*.tsx")])

    for path in source_files:
        text = path.read_text(encoding="utf-8")
        relative = path.relative_to(PACKAGE_ROOT)
        for token in FORBIDDEN_GLOBAL:
            if token in text:
                errors.append(f"{relative} still contains {token!r}")

        if path.suffix == ".tsx":
            for match in re.finditer(r"<button(?:\s|>)", text):
                close = text.find(">", match.start())
                if close == -1:
                    errors.append(f"{relative} has an unclosed <button tag")
                    continue
                opening_tag = text[match.start() : close + 1]
                if not re.search(r"\btype\s*=", opening_tag):
                    line = text.count("\n", 0, match.start()) + 1
                    errors.append(f'{relative}:{line} button is missing type="button"')

    container_text = CONTAINER.read_text(encoding="utf-8")
    for token in FORBIDDEN_CONTAINER:
        if token in container_text:
            errors.append(f"{CONTAINER.relative_to(PACKAGE_ROOT)} still contains forbidden token {token!r}")

    required_markers = (
        "import { createPortal } from 'react-dom';",
        "hoskt-mcutils-inline-host-v14",
        "hoskt-mcutils-safe-zone-v14",
        "data-hoskt-scroll-fix', 'v9-preserved-v14'",
        "data-hoskt-renderer', 'original-theme-main-portal'",
        "data-hoskt-sidebar', 'native-theme-sidebar'",
        "const main = marker.closest('main')",
        "const hiddenWrapper = main ? directChildOf(marker, main) : null;",
        "mountParent.appendChild(host);",
        "hiddenWrapper.style.setProperty('display', 'none', 'important');",
        "main.style.setProperty('overflow-x', 'hidden', 'important');",
        "createPortal(page, portalHost)",
        "data-hoskt-mcutils-marker='v14'",
        "background-image: none !important",
        "contain: none !important",
        "content-visibility: visible !important",
        "will-change: auto !important",
        "hoskt-mcutils-shell-title-v14",
        "Minecraft Server Utilities",
        "copyrightText",
        "Pterodactyl® © 2015 - ${new Date().getFullYear()}",
    )
    for marker in required_markers:
        if marker not in container_text:
            errors.append(f"{CONTAINER.relative_to(PACKAGE_ROOT)} is missing marker {marker!r}")

    # The renderer must not contain its own header/sidebar/logo. Those must remain
    # the real HOSKT theme components outside the Minecraft Utilities safe zone.
    if "<img" in container_text:
        errors.append(f"{CONTAINER.relative_to(PACKAGE_ROOT)} must not render a logo/image in the shell")
    if re.search(r"url\s*\(", container_text, flags=re.I):
        errors.append(f"{CONTAINER.relative_to(PACKAGE_ROOT)} unexpectedly contains a CSS url() asset")

    component_markers = {
        MCUTILS / "sections/components/MinecraftRainbowTextGenerator.tsx": (
            "hoskt-rainbow-check",
            "hoskt-rainbow-radio",
            "role='checkbox'",
            "aria-pressed={selected}",
        ),
        MCUTILS / "sections/components/PlaceholderApi.tsx": (
            "hoskt-placeholder-row",
            "hoskt-placeholder-toggle",
            "type='button'",
        ),
        MCUTILS / "sections/components/minecraft-color-code-generator.tsx": (
            "hoskt-classic-control",
            "type='button'",
        ),
    }
    for path, markers in component_markers.items():
        text = path.read_text(encoding="utf-8")
        for marker in markers:
            if marker not in text:
                errors.append(f"{path.relative_to(PACKAGE_ROOT)} is missing marker {marker!r}")

    errors.extend(parse_typescript(source_files))

    if errors:
        print("Minecraft Utilities V14 regression check FAILED:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print(f"OK: Minecraft Utilities V14 static checks passed for {len(source_files)} TypeScript files.")
    print("OK: Real HOSKT header/sidebar stays mounted; no duplicate logo or purple menu mark exists in the renderer.")
    print("OK: V9 repaint controls remain scoped to Classic Colors, Rainbow Builder and Placeholder API content.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
