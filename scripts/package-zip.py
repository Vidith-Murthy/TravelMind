#!/usr/bin/env python3
"""Package a clean, source-complete TravelMind ZIP archive."""

from __future__ import annotations

import argparse
from pathlib import Path
import zipfile

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    "dist",
    ".mastra",
    ".runtime",
    "artifacts",
    "coverage",
    "__pycache__",
}
EXCLUDED_NAMES = {".env", ".DS_Store", "Thumbs.db"}
EXCLUDED_SUFFIXES = {".db", ".duckdb", ".log", ".pyc"}


def should_include(path: Path, root: Path) -> bool:
    relative = path.relative_to(root)
    parts = relative.parts
    if any(part in EXCLUDED_DIRS for part in parts):
        return False
    if path.name in EXCLUDED_NAMES:
        return False
    if path.name.startswith(".env.") and path.name != ".env.example":
        return False
    if any(path.name.endswith(suffix) for suffix in EXCLUDED_SUFFIXES):
        return False
    if ".db-" in path.name or path.name.endswith(".duckdb.wal"):
        return False
    return path.is_file() and not path.is_symlink()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("output", nargs="?", help="Output ZIP path (default: ../TravelMind.zip)")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    output = Path(args.output).expanduser().resolve() if args.output else root.parent / "TravelMind.zip"
    output.parent.mkdir(parents=True, exist_ok=True)

    files = sorted(path for path in root.rglob("*") if should_include(path, root))
    with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=8) as archive:
        for path in files:
            relative = path.relative_to(root)
            archive.write(path, Path("TravelMind") / relative)

    print(f"Created {output} ({len(files)} files, {output.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
