#!/usr/bin/env python3
"""Structural checks for the manga reader redesign (Graded Reading > Truyện tranh)."""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JSX = (ROOT / "src" / "islands" / "GradedReading.jsx").read_text(encoding="utf-8")
CSS = (ROOT / "assets" / "css" / "graded-reading.css").read_text(encoding="utf-8")
MANIFEST = json.loads((ROOT / "database" / "readings" / "manga" / "peppercarrot" / "manifest.json").read_text(encoding="utf-8"))


def test_single_top_bar_replaces_header_and_toolbar():
    assert 'class="manga-topbar"' in JSX
    assert "manga-header" not in JSX and ".manga-header" not in CSS
    assert "--manga-topbar-h: 48px" in CSS
    # Theme lives only in the settings popover, wired to the app theme.
    assert "toggleTheme" in JSX and "Sáng" in JSX
    assert "manga-tool-btn" not in JSX  # old 'Bóng thoại' toolbar button


def test_settings_menu_holds_reader_options():
    settings = JSX[JSX.index("function MangaSettings("):JSX.index("function MangaViewer(")]
    for label in ("Bố cục", "Giao diện", "Chữ", "Pinyin trên chữ", "Số bóng thoại", "Màu cấp HSK", "Phím tắt"):
        assert label in settings, label


def test_layout_is_page_first_with_single_scroll_panel():
    assert "grid-template-columns: minmax(0, 1fr) clamp(320px, 35%, 520px)" in CSS
    assert "manga-dlg-list" not in JSX  # nested list scroller removed
    assert "the panel is the only scroll container" in CSS


def test_bubble_zoom_is_capped_by_scan_resolution():
    assert "const MANGA_MAX_ZOOM = 1.4;" in JSX
    assert "Math.min(MANGA_MAX_ZOOM, naturalW / sheetW)" in JSX


def test_accent_reserved_for_active_state():
    reader_css = CSS[CSS.index("/* 6C. Reader shell */"):]
    assert "#A8322A" not in reader_css
    assert "--manga-active: var(--accent);" in CSS
    assert "--manga-tint-basic" in CSS and "border-bottom: 2.5px solid var(--manga-band" not in CSS


def test_chapter_wide_numbering_and_dot_strip():
    assert "function mangaChapterOrder(story)" in JSX
    assert "order.index[current.id]} / ${order.total}" in JSX
    assert 'class="manga-strip"' in JSX and "manga-dot" in JSX


def test_recall_first_panel():
    assert "const mangaShowVi = signal(false);" in JSX
    assert "Hiện nghĩa" in JSX
    assert "+ Thêm vào flashcard" not in JSX and "manga-star-btn" in JSX
    assert "const mangaTokenIdx = signal(-1);" in JSX


def test_script_toggle_and_coverage_badge():
    assert "readPref(MANGA_SCRIPT_KEY, 'simp')" in JSX
    assert "const MANGA_COVERAGE_TARGET = 0.9;" in JSX
    for item in MANIFEST:
        assert isinstance(item.get("proper_names"), list) and item["proper_names"]


def test_keyboard_map():
    handler = JSX[JSX.index("const onKeyDown = (e) => {"):JSX.index("window.addEventListener('keydown', onKeyDown);")]
    for key in ("'ArrowRight'", "'ArrowLeft'", "key === ' '", "e.shiftKey", "'t'", "'Escape'", "exitFullscreen"):
        assert key in handler, key


def test_mobile_bottom_sheet():
    assert re.search(r"@media \(max-width: 767px\) \{[^@]*\.manga-panel\.is-open", CSS)
    assert "body.manga-reading .mobile-bottom-nav { display: none; }" in CSS
    assert "manga-sheet-handle" in JSX
