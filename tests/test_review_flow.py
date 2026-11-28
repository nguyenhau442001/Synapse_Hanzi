#!/usr/bin/env python3
"""
Structural checks for the review/browse split on the flashcard study screen:
- Review mode is a graded queue: grading requires a revealed card and auto-advances.
- Prev/next navigation only exists in browse mode ("Duyệt danh sách").
"""

import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PROGRESS_JS = ROOT / "src" / "islands" / "StudyProgress.jsx"
FLASHCARD_JS = ROOT / "src" / "islands" / "FlashcardStudy.jsx"
APP_STATE_JS = ROOT / "src" / "islands" / "AppState.js"
ROUTER_JS = ROOT / "src" / "islands" / "SpaRouter.js"


class TestReviewFlow(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.progress = PROGRESS_JS.read_text(encoding="utf-8")
        cls.flashcard = FLASHCARD_JS.read_text(encoding="utf-8")
        cls.state = APP_STATE_JS.read_text(encoding="utf-8")
        cls.router = ROUTER_JS.read_text(encoding="utf-8")

    def test_study_mode_defaults_to_review(self):
        self.assertIn("export let studyMode = 'review';", self.state)

    def test_grading_requires_review_mode_and_reveal(self):
        body = self.progress.split("export function rateCurrentCard", 1)[1].split("\n}\n", 1)[0]
        self.assertIn("studyMode !== 'review'", body)
        self.assertIn("isCardRevealed()", body)
        self.assertIn("advanceReviewQueue(", body)

    def test_prev_next_only_in_browse_mode(self):
        for fn in ("export function nextCard", "export function prevCard"):
            body = self.progress.split(fn, 1)[1].split("\n}\n", 1)[0]
            self.assertIn("studyMode !== 'browse'", body)

    def test_review_queue_puts_due_before_new(self):
        body = self.progress.split("export function buildReviewQueue", 1)[1].split("\n}\n", 1)[0]
        self.assertIn("SRS.isDue", body)
        self.assertIn("due.map(d => d.i).concat(fresh.slice(0, newCardAllowance()))", body)

    def test_daily_new_card_limit_reuses_daily_goal(self):
        levels = (ROOT / "src" / "islands" / "Levels.js").read_text(encoding="utf-8")
        self.assertIn("export const DEFAULT_DAILY_STUDY_GOAL = 20;", levels)
        body = self.progress.split("export function newCardAllowance", 1)[1].split("\n}\n", 1)[0]
        self.assertIn("readDailyStudyGoal()", body)
        self.assertIn("countNewReviewsToday(readStudyDirection())", body)

    def test_review_counters_rendered(self):
        self.assertIn("Hôm nay cần ôn:", self.flashcard)
        self.assertIn("Thẻ mới:", self.flashcard)

    def test_controls_follow_mode(self):
        self.assertIn("const showRating = isReview && revealed;", self.flashcard)
        self.assertIn("const showNav = hasCard && studyMode === 'browse';", self.flashcard)
        self.assertIn("Duyệt danh sách", self.flashcard)

    def test_browse_mode_is_kept_in_url(self):
        self.assertIn("'&mode=browse'", self.router)

    def test_shuffle_deck_shuffles_review_queue_and_resets_idx(self):
        body = self.progress.split("export function shuffleDeck", 1)[1].split("\n}\n", 1)[0]
        self.assertIn("shuffleInPlace(filteredOrder)", body)
        self.assertIn("idx = 0", body)
        self.assertNotIn("refreshStudyDeck()", body)


if __name__ == "__main__":
    unittest.main()
