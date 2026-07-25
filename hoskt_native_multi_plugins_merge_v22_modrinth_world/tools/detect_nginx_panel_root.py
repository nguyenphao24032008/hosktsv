#!/usr/bin/env python3
"""Locate Nginx server blocks for a port and verify a Pterodactyl public root."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
from pathlib import Path
import re
import shutil
import subprocess
import sys


@dataclass
class ServerBlock:
    listens: list[str]
    roots: list[str]
    server_names: list[str]


def matching_brace(text: str, opening: int) -> int | None:
    depth = 0
    quote: str | None = None
    escaped = False
    for index in range(opening, len(text)):
        char = text[index]
        if quote:
            if escaped:
                escaped = False
            elif char == "\\":
                escaped = True
            elif char == quote:
                quote = None
            continue
        if char in {"'", '"'}:
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                return index
    return None


def parse_server_blocks(text: str) -> list[ServerBlock]:
    blocks: list[ServerBlock] = []
    for match in re.finditer(r"\bserver\s*\{", text):
        opening = text.find("{", match.start())
        closing = matching_brace(text, opening)
        if closing is None:
            continue
        body = text[opening + 1 : closing]
        listens = [value.strip() for value in re.findall(r"\blisten\s+([^;]+);", body)]
        roots = [value.strip().strip('"\'') for value in re.findall(r"\broot\s+([^;]+);", body)]
        names: list[str] = []
        for value in re.findall(r"\bserver_name\s+([^;]+);", body):
            names.extend(value.split())
        blocks.append(ServerBlock(listens=listens, roots=roots, server_names=names))
    return blocks


def listen_matches_port(value: str, port: str) -> bool:
    tokens = value.replace("[", "").replace("]", "").split()
    endpoint = tokens[0] if tokens else value
    return endpoint == port or endpoint.endswith(f":{port}")


def normalise_root(value: str) -> str:
    if value.startswith("$"):
        return value.rstrip("/")
    try:
        return str(Path(value).expanduser().resolve()).rstrip("/")
    except OSError:
        return value.rstrip("/")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", required=True)
    parser.add_argument("--expected", help="Expected public root, e.g. /var/www/pterodactyl-test/public")
    args = parser.parse_args()

    nginx = shutil.which("nginx")
    if not nginx:
        print("ERROR: Không tìm thấy lệnh nginx.", file=sys.stderr)
        return 4

    result = subprocess.run([nginx, "-T"], text=True, capture_output=True, check=False)
    config = "\n".join(part for part in (result.stdout, result.stderr) if part)
    if not config.strip():
        print("ERROR: nginx -T không trả về cấu hình.", file=sys.stderr)
        return 4

    candidates = [
        block
        for block in parse_server_blocks(config)
        if any(listen_matches_port(value, args.port) for value in block.listens)
    ]

    if not candidates:
        print(f"ERROR: Không tìm thấy server block Nginx listen cổng {args.port}.", file=sys.stderr)
        return 3

    print(f"Nginx server block cho cổng {args.port}:")
    for index, block in enumerate(candidates, start=1):
        print(f"  [{index}] listen: {', '.join(block.listens) or '(không rõ)'}")
        print(f"      server_name: {', '.join(block.server_names) or '(không có)'}")
        print(f"      root: {', '.join(block.roots) or '(không tìm thấy)'}")

    if not args.expected:
        return 0

    expected = normalise_root(args.expected)
    roots = {normalise_root(root) for block in candidates for root in block.roots}
    if expected not in roots:
        print(
            f"ERROR: Cổng {args.port} không trỏ tới root mong đợi {expected}. "
            f"Các root tìm thấy: {', '.join(sorted(roots)) or '(không có)'}." ,
            file=sys.stderr,
        )
        return 2

    print(f"OK: Cổng {args.port} trỏ tới đúng panel test: {expected}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
