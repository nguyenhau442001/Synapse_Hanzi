#!/usr/bin/env python3
"""
tools/build_stroke_data.py

Builds offline stroke data for the writing practice screen (src/islands/Writing.jsx).

For every HSK 3.0 curriculum level it collects the Han characters used by that
level's lesson words and writes database/strokes/level{N}.json:

    {"v": 1, "level": "1", "chars": {"大": {"s": [outline paths], "m": [medians]}}}

Outline paths and medians come from the hanzi-writer-data package (Make Me a
Hanzi, Arphic Public License; the license text is copied next to the bundles).
The service worker caches each bundle the first time its level is opened, so
writing practice keeps working offline per level.

Usage: python3 tools/build_stroke_data.py [--check]
"""

import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CURRICULUM_DIR = ROOT / "database" / "curriculum" / "hsk30"
SOURCE_DIR = ROOT / "node_modules" / "hanzi-writer-data"
OUT_DIR = ROOT / "database" / "strokes"


def is_han(ch: str) -> bool:
    return "㐀" <= ch <= "鿿" or "豈" <= ch <= "﫿"


def level_characters(level_file: Path) -> list:
    data = json.loads(level_file.read_text(encoding="utf-8"))
    seen = []
    for lesson in data.get("lessons", []):
        for word in lesson.get("words", []):
            for ch in word.get("hanzi", ""):
                if is_han(ch) and ch not in seen:
                    seen.append(ch)
    return seen


def compact_path(path: str) -> str:
    """Drop the optional spaces around SVG path commands: "M 494 476 Q 542 485" -> "M494 476Q542 485"."""
    return re.sub(r"\s*([MLQCZ])\s*", r"\1", path).strip()


def build_bundle(level: str, chars: list) -> tuple:
    bundle = {}
    missing = []
    for ch in chars:
        src = SOURCE_DIR / f"{ch}.json"
        if not src.exists():
            missing.append(ch)
            continue
        raw = json.loads(src.read_text(encoding="utf-8"))
        bundle[ch] = {"s": [compact_path(p) for p in raw["strokes"]], "m": raw["medians"]}
    return {"v": 1, "level": level, "chars": bundle}, missing


def serialize(payload: dict) -> str:
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n"


def main() -> int:
    check = "--check" in sys.argv
    if not SOURCE_DIR.exists():
        print("hanzi-writer-data is missing: run `npm install` first.")
        return 1
    level_files = sorted(CURRICULUM_DIR.glob("level*.json"), key=lambda p: int(p.stem[5:]))
    stale = []
    total_missing = []
    for level_file in level_files:
        level = level_file.stem[5:]
        payload, missing = build_bundle(level, level_characters(level_file))
        total_missing += missing
        out = OUT_DIR / f"level{level}.json"
        text = serialize(payload)
        if check:
            if not out.exists() or out.read_text(encoding="utf-8") != text:
                stale.append(out.name)
            continue
        OUT_DIR.mkdir(parents=True, exist_ok=True)
        out.write_text(text, encoding="utf-8")
        print(f"level {level}: {len(payload['chars'])} chars, {len(text) // 1024} KB" + (f", missing {''.join(missing)}" if missing else ""))
    if check:
        if stale:
            print("Stale stroke bundles: " + ", ".join(stale))
            return 1
        print("Stroke bundles are up to date.")
        return 0
    shutil.copyfile(SOURCE_DIR / "ARPHICPL.TXT", OUT_DIR / "ARPHICPL.TXT")
    if total_missing:
        print("Characters without stroke data: " + "".join(sorted(set(total_missing))))
    return 0


if __name__ == "__main__":
    sys.exit(main())
