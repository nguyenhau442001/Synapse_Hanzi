#!/usr/bin/env python3
"""
tools/grade_wanwu_levels.py
Sets the HSK level of each 万物有意思 reading from its hardest vocabulary.

The book is authentic text, not graded material, so a reading is labelled with
the highest HSK 3.0 level among the words it uses (jieba segmentation).
HSK 7-9 share one word list, so that band is reported as HSK7.
Words outside the HSK lists (names, technical terms) are ignored.

Writes `level` into database/readings/manifest.json and each story JSON.

Usage:
  python3 tools/grade_wanwu_levels.py            # write levels
  python3 tools/grade_wanwu_levels.py --dry-run  # print levels only
"""

import argparse
import json
import re
from collections import Counter
from pathlib import Path

import jieba

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST = REPO_ROOT / "database" / "readings" / "manifest.json"
VOCAB_DIR = REPO_ROOT / "database" / "vocabs" / "hsk3_0"
CJK_RE = re.compile(r"[一-鿿]")


def load_word_levels():
    """hanzi -> lowest HSK 3.0 level that lists it."""
    levels = {}
    for lvl in range(1, 10):
        path = VOCAB_DIR / f"level{lvl}_vocabularies.json"
        if not path.exists():
            continue
        for item in json.loads(path.read_text(encoding="utf-8")):
            word = item.get("hanzi") or item.get("simplified")
            if word:
                levels.setdefault(word, lvl)
    return levels


def grade(story: dict, word_levels: dict) -> int:
    hits = [
        word_levels[w]
        for s in story.get("sentences", [])
        for w in jieba.cut(s.get("zh", ""))
        if CJK_RE.search(w) and w in word_levels
    ]
    return max(hits) if hits else 1


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    jieba.setLogLevel(60)
    word_levels = load_word_levels()
    for word in word_levels:
        jieba.add_word(word)

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    tally = Counter()
    for m in manifest:
        if m.get("series") != "wanwu":
            continue
        path = REPO_ROOT / m["path"]
        story = json.loads(path.read_text(encoding="utf-8"))
        level = f"HSK{grade(story, word_levels)}"
        tally[level] += 1
        if m.get("level") != level:
            print(f"{m['id']}: {m.get('level')} -> {level}")
        m["level"] = level
        if not args.dry_run and story.get("level") != level:
            story["level"] = level
            path.write_text(json.dumps(story, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("Levels:", dict(sorted(tally.items())))
    if not args.dry_run:
        MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
