#!/usr/bin/env python3
"""
tests/test_graded_reading_layout.py

Verification suite for the restructured Graded Reading layout architecture:
1. Validates compact header and reading progress structure in GradedReading.jsx.
2. Validates streamlined secondary featured collection strip.
3. Validates unified toolbar and grouped filter controls.
4. Validates 4-tier information hierarchy in reading cards.
5. Validates responsive CSS grid definitions and overflow protection in graded-reading.css.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

def test_graded_reading_jsx_layout_structure():
    jsx_path = ROOT / "src" / "islands" / "GradedReading.jsx"
    assert jsx_path.exists(), "GradedReading.jsx not found"
    jsx_content = jsx_path.read_text(encoding="utf-8")

    # 1. Hub opens on a continue-reading strip instead of the old hero header
    assert "graded-continue" in jsx_content
    assert "graded-hub-header" not in jsx_content
    assert "graded-collections-strip" not in jsx_content  # duplicated the source filter
    assert "LAST_STORY_KEY" in jsx_content

    # 2. Filter bar: search, source segment, topic/sort panel, HSK chips, hide-read
    assert "graded-filterbar" in jsx_content
    assert "graded-source-seg" in jsx_content
    assert "graded-filter-panel" in jsx_content
    assert "graded-level-chips" in jsx_content
    assert "graded-hide-read" in jsx_content
    assert "sourceFilter" in jsx_content  # source and level combine
    assert "'suggested'" in jsx_content

    # 3. Results heading and grid
    assert "graded-results-head" in jsx_content
    assert "graded-story-grid" in jsx_content

    # 4. Story card: real link, separate mark button, no nested interactive elements
    assert 'class="graded-card-link"' in jsx_content
    assert "graded-card-mark" in jsx_content
    assert "graded-card-cover" in jsx_content
    assert 'role="button" aria-label={`Đọc bài' not in jsx_content

    # 5. Mobile reader 3-tier hierarchy & illustration frame
    assert "graded-reader-top-bar" in jsx_content
    assert "graded-reader-title-block" in jsx_content
    assert "graded-reader-actions-bar" in jsx_content
    assert "graded-illustration-frame" in jsx_content
    assert "graded-legend-title" in jsx_content

def test_graded_reading_css_responsive_grid():
    css_path = ROOT / "assets" / "css" / "graded-reading.css"
    assert css_path.exists(), "graded-reading.css not found"
    css_content = css_path.read_text(encoding="utf-8")

    # Layout container max-width consistency
    assert "max-width: 1040px" in css_content
    assert ".graded-reading-container" in css_content

    # Hub grid: 3 columns, 2 on tablets, card rows on phones
    assert "grid-template-columns: repeat(3, minmax(0, 1fr))" in css_content
    assert "grid-template-columns: repeat(2, minmax(0, 1fr))" in css_content
    assert ".graded-story-grid { grid-template-columns: minmax(0, 1fr)" in css_content

    # Level chips scroll horizontally with a faded edge; phone filter bar is sticky
    assert "overflow-x: auto" in css_content
    assert "-webkit-overflow-scrolling: touch" in css_content
    assert "mask-image" in css_content
    assert "position: sticky" in css_content

    # Old hub blocks are gone
    assert ".graded-hub-header" not in css_content
    assert ".graded-col-card" not in css_content

    # Reader mobile 3-tier grid & zen mode
    assert "grid-template-columns: repeat(3, 1fr)" in css_content
    assert "padding-bottom: 96px" in css_content
    assert "max-height: 150px" in css_content

if __name__ == "__main__":
    test_graded_reading_jsx_layout_structure()
    test_graded_reading_css_responsive_grid()
    print("All graded reading layout tests passed!")
