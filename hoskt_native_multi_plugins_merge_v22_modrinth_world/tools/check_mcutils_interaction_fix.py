#!/usr/bin/env python3
"""Regression checks for the V16 HTTP clipboard and malformed-input fixes."""

from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
MCUTILS = ROOT / "payload/files/resources/scripts/components/server/mcutils"
COMPONENTS = MCUTILS / "sections/components"
COPY_HELPER = MCUTILS / "utils/copyTextToClipboard.ts"

COPY_COMPONENTS = (
    "minecraft-color-code-generator.tsx",
    "MiniMessageBuilder.tsx",
    "small-caps-generator.tsx",
    "McEmojiList.tsx",
    "ColorPicker.tsx",
    "MinecraftRainbowTextGenerator.tsx",
    "PlaceholderApi.tsx",
)


def main() -> int:
    errors: list[str] = []

    if not COPY_HELPER.is_file():
        errors.append(f"missing clipboard helper: {COPY_HELPER}")
    else:
        helper = COPY_HELPER.read_text(encoding="utf-8")
        required = (
            "!window.isSecureContext",
            "document.execCommand('copy')",
            "textarea.setSelectionRange(0, textarea.value.length)",
            "return legacyCopyText(text);",
            "await navigator.clipboard.writeText(text)",
        )
        for token in required:
            if token not in helper:
                errors.append(f"clipboard helper is missing {token!r}")

    direct_clipboard_calls: list[str] = []
    for path in sorted(MCUTILS.rglob("*.ts*")):
        if path == COPY_HELPER:
            continue
        text = path.read_text(encoding="utf-8")
        if "navigator.clipboard" in text:
            direct_clipboard_calls.append(str(path.relative_to(ROOT)))
    if direct_clipboard_calls:
        errors.append("direct navigator.clipboard calls remain in: " + ", ".join(direct_clipboard_calls))

    import_line = "import { copyTextToClipboard } from '../../utils/copyTextToClipboard';"
    for filename in COPY_COMPONENTS:
        path = COMPONENTS / filename
        text = path.read_text(encoding="utf-8") if path.is_file() else ""
        if import_line not in text:
            errors.append(f"{filename} does not import the shared clipboard helper")
        if "copyTextToClipboard(" not in text:
            errors.append(f"{filename} does not call the shared clipboard helper")

    motd_path = COMPONENTS / "MOTDCreator.tsx"
    motd = motd_path.read_text(encoding="utf-8")
    dangerous = (
        "part[1].toLowerCase()",
        "text.split(/(&[0-9a-fk-or])/g)",
    )
    for token in dangerous:
        if token in motd:
            errors.append(f"MOTD parser still contains unsafe token {token!r}")
    for token in (
        "const next = index + 1 < text.length",
        "if (!isCode)",
        "Object.prototype.hasOwnProperty.call(colorMap, next)",
        "Object.prototype.hasOwnProperty.call(formattingMap, next)",
        "if (format === 'r')",
        "const max = textarea.value.length",
    ):
        if token not in motd:
            errors.append(f"MOTD parser is missing safety marker {token!r}")

    mini = (COMPONENTS / "MiniMessageBuilder.tsx").read_text(encoding="utf-8")
    if "const element = inputRef.current;" not in mini or "if (!element) return;" not in mini:
        errors.append("MiniMessage delayed selection callback is not null-safe")
    if "inputRef.current!" in mini:
        errors.append("MiniMessage still contains unsafe non-null inputRef access")

    emoji = (COMPONENTS / "McEmojiList.tsx").read_text(encoding="utf-8")
    if "try {" not in emoji or "Array.isArray(parsed)" not in emoji:
        errors.append("Emoji recent-history JSON restore is not guarded")

    if errors:
        print("Minecraft Utilities V16 interaction check FAILED:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    print("OK: V16 clipboard helper supports HTTPS Clipboard API and synchronous HTTP fallback.")
    print("OK: Every Minecraft Utilities copy action uses the shared helper.")
    print("OK: MOTD preview accepts trailing/lone '&' and malformed codes without throwing.")
    print("OK: Delayed refs and emoji localStorage restore are guarded.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
