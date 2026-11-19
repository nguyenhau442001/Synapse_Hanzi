#!/usr/bin/env python3
"""Manga transcript data: every bubble's tokens must spell its full sentence.

The reader shows the whole sentence from `tokens`; a dropped word means the
learner cannot read the bubble. Rebuild with tools/build_manga_word_layer.py.
"""

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MANIFEST = ROOT / "database" / "readings" / "manga" / "doraemon" / "manifest.json"


def iter_dialogues():
    for item in json.loads(MANIFEST.read_text(encoding="utf-8")):
        story = json.loads((ROOT / item["file"]).read_text(encoding="utf-8"))
        for page in story["pages"]:
            for d in page.get("dialogues", []):
                yield item["id"], d


def test_tokens_cover_every_character():
    bad = [f"{sid} {d['id']}: {d['zh_trad']!r} != {''.join(t['text_trad'] for t in d['tokens'])!r}"
           for sid, d in iter_dialogues()
           if "".join(t["text_trad"] for t in d["tokens"]) != d["zh_trad"]]
    total = sum(1 for _ in iter_dialogues())
    assert total > 0
    assert not bad, f"{len(bad)}/{total} bubbles drop characters:\n" + "\n".join(bad)


def test_simplified_tokens_cover_simplified_sentence():
    bad = [d["id"] for _, d in iter_dialogues() if "".join(t["text"] for t in d["tokens"]) != d["zh"]]
    assert not bad, f"simplified token text mismatch: {bad}"


def test_word_tokens_have_reading_and_punct_tokens_are_flagged():
    for sid, d in iter_dialogues():
        for t in d["tokens"]:
            if t.get("punct"):
                assert not any("㐀" <= c <= "鿿" for c in t["text_trad"]), (sid, d["id"], t)
            else:
                assert t.get("pinyin"), (sid, d["id"], t["text_trad"])
