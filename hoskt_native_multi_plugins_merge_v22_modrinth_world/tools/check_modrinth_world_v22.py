#!/usr/bin/env python3
from pathlib import Path
import sys

root = Path(__file__).resolve().parents[1]
checks = {
    "payload/files/app/Services/Minecraft/Maps/MapProvider.php": [
        "case CurseForge = 'curseforge';",
        "case Modrinth = 'modrinth';",
    ],
    "payload/files/app/Services/Minecraft/Maps/ModrinthMapService.php": [
        "https://api.modrinth.com/v2/",
        "project_type:modpack",
        "server_side!=unsupported",
        "WorldArchiveInstaller",
        ".mrpack",
    ],
    "payload/files/app/Services/Minecraft/Maps/WorldArchiveInstaller.php": [
        "level.dat",
        "uid.dat",
        "MAX_NESTED_ARCHIVES",
        "renameFiles",
        "deleteIgnoringErrors",
    ],
    "payload/files/app/Services/Minecraft/Maps/CurseForgeMapService.php": [
        "WorldArchiveInstaller",
        "installFromUrl",
    ],
    "payload/files/app/Http/Controllers/Api/Client/Servers/MinecraftWorldController.php": [
        "ModrinthMapService",
        "MapProvider::Modrinth",
    ],
    "payload/files/app/Jobs/InstallMinecraftMapJob.php": [
        "ModrinthMapService",
        "MapProvider::Modrinth",
        "public int $timeout = 900",
    ],
    "payload/files/resources/scripts/components/server/minecraft-worlds/MinecraftWorldContainer.tsx": [
        "'curseforge' | 'modrinth'",
        "<option value='modrinth'>Modrinth</option>",
        "WORLD_REFRESH_DELAYS = [5000, 15000, 45000]",
        "useState<MinecraftMapProvider>('modrinth')",
        "useState<string>('world')",
    ],
    "install-test-safe-v22.sh": [
        "check_modrinth_world_v22.py",
        "pteroq",
        "WorldArchiveInstaller.php",
    ],
}

errors = []
for rel, needles in checks.items():
    path = root / rel
    if not path.is_file():
        errors.append(f"missing file: {rel}")
        continue
    text = path.read_text(encoding="utf-8", errors="replace")
    for needle in needles:
        if needle not in text:
            errors.append(f"{rel}: missing marker {needle!r}")

if errors:
    print("V22 Modrinth World package check FAILED:", file=sys.stderr)
    for error in errors:
        print(f" - {error}", file=sys.stderr)
    raise SystemExit(1)

print("OK: V22 Modrinth World provider, queued installer, archive validation, and auto-load markers are present.")
