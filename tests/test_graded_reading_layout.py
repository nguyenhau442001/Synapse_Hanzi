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

    # 1. Compact header and reading progress
    assert "graded-hub-header" in jsx_content
    assert "graded-hub-progress-card" in jsx_content
    assert "graded-hub-progress-bar" in jsx_content
    assert "graded-hub-hero" not in jsx_content  # Oversized hero replaced

    # 2. Streamlined secondary featured collection strip
    assert "graded-book-strip" in jsx_content
    assert "graded-book-strip-btn" in jsx_content

    # 3. Unified toolbar and structured filters
    assert "graded-toolbar" in jsx_content
    assert "graded-toolbar-top" in jsx_content
    assert "graded-toolbar-filters" in jsx_content
    assert "graded-filter-divider" in jsx_content
    assert "graded-filter-levels" in jsx_content
    assert "graded-results-bar" in jsx_content

    # 4. Reading card information hierarchy
    assert "graded-card-titles" in jsx_content
    assert "graded-card-zh-title" in jsx_content
    assert "graded-card-vi-title" in jsx_content
    assert "graded-card-thumb-wrap" in jsx_content
    assert "graded-card-footer" in jsx_content

def test_graded_reading_css_responsive_grid():
    css_path = ROOT / "assets" / "css" / "graded-reading.css"
    assert css_path.exists(), "graded-reading.css not found"
    css_content = css_path.read_text(encoding="utf-8")

    # Layout container max-width consistency
    assert "max-width: 1040px" in css_content
    assert ".graded-reading-container" in css_content

    # 3-column desktop grid
    assert "grid-template-columns: repeat(3, 1fr)" in css_content

    # 2-column tablet grid
    assert "grid-template-columns: repeat(2, 1fr)" in css_content

    # 1-column mobile grid
    assert "grid-template-columns: 1fr" in css_content

    # Horizontal filter scrolling protection
    assert "overflow-x: auto" in css_content
    assert "-webkit-overflow-scrolling: touch" in css_content

if __name__ == "__main__":
    test_graded_reading_jsx_layout_structure()
    test_graded_reading_css_responsive_grid()
    print("All graded reading layout tests passed!")
