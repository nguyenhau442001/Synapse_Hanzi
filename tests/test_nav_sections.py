#!/usr/bin/env python3
"""
tests/test_nav_sections.py

Two-level primary navigation (replaces the former "Công cụ" dropdown):
1. Six top sections in order: Từ vựng, Giáo trình, Nghe, Đọc, Viết, Ôn nhanh.
2. The dropdown and its handlers/styles are gone.
3. Every former tool is reachable from a sub-tab of the right section, in the right order.
4. NavSections.js maps sections to the same sub-tab keys as the markup.
"""

from pathlib import Path
import re
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent

EXPECTED_SECTIONS = [
    ("vocab", "primaryTabVocab", "Từ vựng"),
    ("curriculum", "primaryTabCurriculum", "Giáo trình"),
    ("listening", "primaryNavListening", "Nghe"),
    ("speaking", "primaryNavSpeaking", "Nói"),
    ("reading", "primaryNavReading", "Đọc"),
    ("writing", "primaryNavWriting", "Viết"),
    ("exam", "primaryNavExam", "Luyện thi"),
    ("review", "primaryTabReview", "Ôn nhanh"),
]

EXPECTED_SUBTABS = {
    "vocab": [("level", "Theo cấp độ"), ("topic", "Theo chủ đề"), ("radicals", "Bộ thủ"), ("guessWord", "Trò chơi")],
    "listening": [("listening", "Luyện nghe HSK4")],
    "speaking": [("speaking", "Luyện nói & Thanh điệu")],
    "reading": [("gradedReading", "Bài đọc phân cấp"), ("reading", "Đọc hiểu HSK4")],
    "writing": [("writing", "Tập viết chữ Hán"), ("sentenceGame", "Xếp câu HSK4"), ("speedQuiz", "Điền từ")],
}


def soup():
    return BeautifulSoup((ROOT / "index.html").read_text(encoding="utf-8"), "html.parser")


def test_top_nav_has_six_sections_in_order():
    group = soup().find(id="primaryTabs").find(class_="primary-tabs-group")
    buttons = group.find_all("button")
    actual = [(b.get("data-section"), b.get("id"), b.get_text(strip=True)) for b in buttons]
    assert actual == EXPECTED_SECTIONS


def test_tools_dropdown_is_removed():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'id="primaryGamesMenu"' not in html
    assert "primary-games-menu" not in html
    assert "primary-menu-trigger" not in html
    hub = (ROOT / "src/islands/RadicalHub.jsx").read_text(encoding="utf-8")
    assert "primaryGamesMenu" not in hub
    assert "initPrimaryMenuKeyboard" not in hub
    for css in (ROOT / "assets/css").glob("*.css"):
        text = css.read_text(encoding="utf-8")
        assert "primary-games-menu" not in text, css.name
        assert "primary-menu-trigger" not in text, css.name


def test_hsk_standard_picker_is_removed():
    doc = soup()
    assert doc.find(id="primaryToolbarCluster") is None
    assert doc.find(id="pickerVersionControls") is None
    assert doc.find(id="pickerVersionSelect") is None


def test_sub_tabs_are_grouped_by_section():
    row = soup().find(id="primaryTabs").find(id="skillSubTabs")
    assert row is not None, "Sub-tab row must live inside #primaryTabs"
    grouped = {}
    for btn in row.find_all("button"):
        assert "view-tab" in btn.get("class", [])
        grouped.setdefault(btn["data-section"], []).append((btn["data-subtab"], btn.get_text(strip=True)))
    assert grouped == EXPECTED_SUBTABS


def test_only_vocab_sub_tabs_visible_on_first_paint():
    row = soup().find(id="skillSubTabs")
    for btn in row.find_all("button"):
        assert btn.has_attr("hidden") == (btn["data-section"] != "vocab"), btn["id"]
    active = [b["data-subtab"] for b in row.find_all("button", class_="active")]
    assert active == ["level"]


def test_nav_sections_module_matches_markup():
    js = (ROOT / "src/islands/NavSections.js").read_text(encoding="utf-8")
    for section, nav_id, _ in EXPECTED_SECTIONS:
        assert re.search(rf"{section}: \{{ navId: '{nav_id}'", js), section
    for section, items in EXPECTED_SUBTABS.items():
        keys = ", ".join(f"'{key}'" for key, _ in items)
        assert f"subtabs: [{keys}]" in js, section
    assert "lastSubtab" in js, "Sections should reopen on their last used sub-tab"
    bootstrap = (ROOT / "src/islands/AppBootstrap.js").read_text(encoding="utf-8")
    assert "initNavSections()" in bootstrap
    assert "mountNavSections();" in (ROOT / "src/islands/main.jsx").read_text(encoding="utf-8")


def test_radical_lookup_lives_in_radical_hub():
    hub = (ROOT / "src/islands/RadicalHub.jsx").read_text(encoding="utf-8")
    assert 'id="radicalLookupBtn"' in hub
    assert "openRadicalDirectory()" in hub
    assert "Tra cứu 214 bộ thủ" in hub
