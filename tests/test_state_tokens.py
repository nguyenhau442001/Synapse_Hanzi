#!/usr/bin/env python3
"""
Learning states use one color token and one Vietnamese label each:
Đã nhớ (--state-known), Cần ôn (--state-due), Chưa học (--state-new).
The brand accent must not carry state meaning.
"""

import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_CSS = (ROOT / "assets" / "css" / "base.css").read_text(encoding="utf-8")
WORKSTATION_CSS = (ROOT / "assets" / "css" / "workstation.css").read_text(encoding="utf-8")
FLASHCARD_CSS = (ROOT / "assets" / "css" / "flashcard.css").read_text(encoding="utf-8")
FLASHCARD_JS = (ROOT / "src" / "islands" / "FlashcardStudy.jsx").read_text(encoding="utf-8")


def luminance(hex_color):
    channels = [int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in channels]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(a, b):
    hi, lo = sorted([luminance(a), luminance(b)], reverse=True)
    return (hi + 0.05) / (lo + 0.05)


class TestStateTokens(unittest.TestCase):
    def test_tokens_defined_for_light_and_dark(self):
        for state in ("known", "due", "new"):
            values = re.findall(rf"--state-{state}:\s*(#[0-9A-Fa-f]{{6}});", BASE_CSS)
            self.assertGreaterEqual(len(values), 2, state)

    def test_state_colors_meet_wcag_aa(self):
        light = re.findall(r"--state-(known|due|new):\s*(#[0-9A-Fa-f]{6});", BASE_CSS)
        first = {}
        for state, color in light:
            first.setdefault(state, []).append(color)
        for state, (light_color, dark_color, *_rest) in first.items():
            self.assertGreaterEqual(contrast(light_color, "#F5F0E7"), 4.5, state)
            self.assertGreaterEqual(contrast(dark_color, "#2A303A"), 4.5, state)

    def test_accent_not_used_for_state(self):
        self.assertNotRegex(WORKSTATION_CSS, r"progress-nav-(seg|stat)--known[^{]*\{[^}]*var\(--accent\)")

    def test_rating_buttons_use_state_tokens(self):
        self.assertIn("--rating-color: var(--state-due);", FLASHCARD_CSS)
        self.assertIn("--rating-color: var(--state-known);", FLASHCARD_CSS)

    def test_progress_bar_is_segmented_without_legend(self):
        for seg in ("progress-nav-seg--known", "progress-nav-seg--unknown", "progress-nav-seg--unseen"):
            self.assertIn(seg, FLASHCARD_JS)
        self.assertNotIn('class="progress-nav-stats-breakdown"', FLASHCARD_JS)
        self.assertIn(".progress-nav-seg--unseen {\n  background: var(--state-new-border);", WORKSTATION_CSS)

    def test_due_state_label_is_can_on(self):
        self.assertIn("label: 'Cần ôn'", FLASHCARD_JS)
        self.assertNotIn("label: 'Chưa nhớ',\n      count: unknown", FLASHCARD_JS)


if __name__ == "__main__":
    unittest.main()
