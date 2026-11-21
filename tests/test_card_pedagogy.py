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


if __name__ == "__main__":
    unittest.main()
