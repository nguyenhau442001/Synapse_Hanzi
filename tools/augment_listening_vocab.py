#!/usr/bin/env python3
"""
tools/augment_listening_vocab.py

Fills gaps in listening `vocabulary_matches` so learners see every
non-trivial HSK word spoken in a passage (e.g. 鼓掌 / 祝贺), not just the
first few HSK 1-4 substrings the original builder captured.

Algorithm:
  - Load HSK 1-6 vocab lists (first level wins for duplicates).
  - Segment each transcript sentence with forward maximum matching, so a
    word is only counted where it is actually a token (no cross-boundary
    substrings such as 现在让 -> 在让).
  - Merge newly found words into the existing list (existing entries keep
    their order and data), skipping ultra-basic HSK1 words, and cap the
    total list length.

Walks any JSON file and augments every object that has both a
`transcript` and a `vocabulary_matches` key.

Usage: python3 tools/augment_listening_vocab.py [--check]
"""

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
VOCAB_LEVELS = ["hsk1", "hsk2", "hsk3", "hsk4", "hsk5", "hsk6"]
TARGET_GLOBS = ["database/listening/*.json", "database/exams/hsk30/**/*.json"]
MIN_WORD_LEN = 2
MAX_WORD_LEN = 6
MAX_VOCAB_PER_QUESTION = 14
# Lowest HSK level whose new words are worth adding (HSK1 words are filler).
MIN_ADDED_LEVEL = 2


def load_vocab_map():
    vocab_map = {}
    for lvl in VOCAB_LEVELS:
        path = ROOT / f"database/vocabs/{lvl}_vocabularies.json"
        if not path.exists():
            continue
        for item in json.loads(path.read_text(encoding="utf-8")):
            word = item.get("hanzi") or item.get("word")
            if not word or word in vocab_map or len(word) < MIN_WORD_LEN:
                continue
            vocab_map[word] = {
                "word": word,
                "pinyin": item.get("pinyin", ""),
                "meaning_vi": item.get("meaning", ""),
                "vocab_id": item.get("id", 0),
                "level": lvl.upper(),
            }
    return vocab_map


def level_num(entry):
    try:
        return int(str(entry.get("level", "HSK0"))[3:])
    except ValueError:
        return 0


def segment_words(text, vocab_map):
    """Forward maximum matching; returns vocab words in order of appearance."""
    found = []
    i = 0
    while i < len(text):
        for size in range(min(MAX_WORD_LEN, len(text) - i), MIN_WORD_LEN - 1, -1):
            cand = text[i:i + size]
            if cand in vocab_map:
                found.append(cand)
                i += size
                break
        else:
            i += 1
    return found


def transcript_texts(transcript):
    sents = transcript.get("sentences") or []
    texts = [s.get("zh", "") for s in sents if isinstance(s, dict)]
    return texts or [transcript.get("full_zh", "")]


def augment_question(q, vocab_map):
    existing = q.get("vocabulary_matches") or []
    have = {v.get("word") for v in existing}
    candidates = []
    for text in transcript_texts(q.get("transcript") or {}):
        for word in segment_words(text, vocab_map):
            entry = vocab_map[word]
            if word in have or level_num(entry) < MIN_ADDED_LEVEL:
                continue
            have.add(word)
            candidates.append(entry)
    room = MAX_VOCAB_PER_QUESTION - len(existing)
    if room <= 0 or not candidates:
        return 0
    candidates.sort(key=level_num, reverse=True)
    added = [dict(c) for c in candidates[:room]]
    q["vocabulary_matches"] = existing + added
    return len(added)


def walk(node, vocab_map):
    count = 0
    if isinstance(node, dict):
        if "transcript" in node and "vocabulary_matches" in node:
            count += augment_question(node, vocab_map)
        for value in node.values():
            count += walk(value, vocab_map)
    elif isinstance(node, list):
        for value in node:
            count += walk(value, vocab_map)
    return count


def main():
    check_only = "--check" in sys.argv
    vocab_map = load_vocab_map()
    total = 0
    for pattern in TARGET_GLOBS:
        for path in sorted(ROOT.glob(pattern)):
            raw = path.read_text(encoding="utf-8")
            data = json.loads(raw)
            added = walk(data, vocab_map)
            if not added:
                continue
            total += added
            print(f"{path.relative_to(ROOT)}: +{added} words")
            if not check_only:
                path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + ("\n" if raw.endswith("\n") else ""), encoding="utf-8")
    print(f"Total added: {total}{' (check only)' if check_only else ''}")
    return 1 if check_only and total else 0


if __name__ == "__main__":
    sys.exit(main())
