#!/usr/bin/env python3
"""
tools/check_reading_covers.py
Guards graded-reading covers in database/readings/manifest.json.

Fails (exit 1) when:
- a cover_image file is missing,
- two readings use the same photo cover (pixel hash, so re-encoded copies count),
- a cover_focus is not a CSS "x% y%" pair.

Editorial word illustrations (stories with `cover_word`) are shared on purpose
and are only counted, not failed.

Usage:
  python3 tools/check_reading_covers.py
"""

import hashlib
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST = REPO_ROOT / "database" / "readings" / "manifest.json"
FOCUS_RE = re.compile(r"^\d{1,3}% \d{1,3}%$")


def pixel_hash(path: Path) -> str:
    with Image.open(path) as img:
        thumb = img.convert("L").resize((16, 16), Image.Resampling.BILINEAR)
    return hashlib.md5(thumb.tobytes()).hexdigest()


def main() -> int:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    errors = []
    by_hash = defaultdict(list)
    shared_words = 0

    for m in manifest:
        cover = m.get("cover_image")
        if not cover:
            continue
        path = REPO_ROOT / cover
        if not path.exists():
            errors.append(f"{m['id']}: missing cover file {cover}")
            continue
        focus = m.get("cover_focus")
        if focus is not None and not FOCUS_RE.match(focus):
            errors.append(f"{m['id']}: bad cover_focus {focus!r}")
        if m.get("cover_word"):
            shared_words += 1
            continue
        if path.suffix.lower() == ".svg":
            by_hash[cover].append(m["id"])
        else:
            by_hash[pixel_hash(path)].append(m["id"])

    for ids in by_hash.values():
        if len(ids) > 1:
            errors.append("duplicate photo cover: " + ", ".join(ids))

    photos = sum(len(v) for v in by_hash.values())
    print(f"Checked {photos} photo covers, {shared_words} word-illustration covers.")
    for e in errors:
        print("ERROR", e)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
