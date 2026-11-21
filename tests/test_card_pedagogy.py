#!/usr/bin/env python3
"""
Pedagogy lines on the flashcard back: labelled Hán Việt reading, grammar patterns,
inline character decomposition and pinyin tone colors.
"""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FLASHCARD_JS = (ROOT / "src" / "islands" / "FlashcardStudy.jsx").read_text(encoding="utf-8")
WORKSTATION_CSS = (ROOT / "assets" / "css" / "workstation.css").read_text(encoding="utf-8")


class TestCardPedagogy(unittest.TestCase):
    def test_hanviet_is_labelled(self):
        self.assertIn('<span class="hanviet-label">Hán Việt:</span>', FLASHCARD_JS)
        self.assertIn("hv.toLocaleUpperCase('vi')", FLASHCARD_JS)
        self.assertIn(".hanviet-badge .hanviet-value", WORKSTATION_CSS)


    def test_patterns_seeded_for_tai(self):
        import json
        words = json.loads((ROOT / "database" / "vocabs" / "hsk3_0" / "level1_vocabularies.json").read_text(encoding="utf-8"))
        tai = next(w for w in words if w["hanzi"] == "太")
        forms = [p["form"] for p in tai["patterns"]]
        self.assertEqual(forms, ["太 + Adj + 了", "不太 + Adj"])
        curated = json.loads((ROOT / "database" / "vocabs" / "hsk3_0" / "curated_vi.json").read_text(encoding="utf-8"))
        self.assertEqual(curated["太|tài"]["patterns"], tai["patterns"])

    def test_pattern_match_highlights_full_pattern(self):
        import json, re
        words = json.loads((ROOT / "database" / "vocabs" / "hsk3_0" / "level1_vocabularies.json").read_text(encoding="utf-8"))
        tai = next(w for w in words if w["hanzi"] == "太")
        plain = re.sub(r"</?u>", "", tai["example_zh"])
        self.assertEqual(re.search(tai["patterns"][0]["match"], plain).group(0), "太贵了")
        self.assertEqual(re.search(tai["patterns"][1]["match"], "今天不太冷。").group(0), "不太冷")

    def test_pattern_line_rendered(self):
        self.assertIn('id="cardPatterns"', FLASHCARD_JS)
        self.assertIn("highlightPatternInExample(w.example_zh, w.patterns)", FLASHCARD_JS)
        build = (ROOT / "tools" / "build_hsk30_vocab.py").read_text(encoding="utf-8")
        self.assertIn("entry['patterns'] = review['patterns']", build)


if __name__ == "__main__":
    unittest.main()
