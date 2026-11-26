#!/usr/bin/env python3
"""
tests/test_design_system.py

Guards the v3.38 design system: brand palette and scale tokens, webfonts,
shell layer ordering, shared primitives, and the curriculum page structure.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASE_CSS = (ROOT / "assets/css/base.css").read_text(encoding="utf-8")
DS_CSS = (ROOT / "assets/css/design-system.css").read_text(encoding="utf-8")
INDEX = (ROOT / "index.html").read_text(encoding="utf-8")


def test_brand_palette_tokens():
    for token in (
        "--accent: #A8322D;",
        "--accent-hover: #852722;",
        "--bg: #F5F0E7;",
        "--card-bg: #FFFFFF;",
        "--text-primary: #292722;",
        "--text-tertiary: #858078;",
        "--border: #E8E1D7;",
        "--success-bg: #E9F2EA;",
        "--danger-bg: #F8EDE7;",
    ):
        assert token in BASE_CSS, token


def test_scale_tokens():
    for token in (
        "--space-1: 4px;", "--space-2: 8px;", "--space-3: 12px;", "--space-4: 16px;",
        "--space-5: 24px;", "--space-6: 32px;", "--space-7: 48px;",
        "--radius-card: 12px;", "--radius-btn: 8px;", "--radius-input: 9px;", "--radius-pill: 999px;",
        "--fs-page: 32px;", "--fs-section: 20px;", "--fs-body: 14px;", "--fs-caption: 12px;",
        "--dur-fast: 150ms;", "--dur-base: 200ms;", "--content-max: 1200px;",
    ):
        assert token in BASE_CSS, token


def test_flat_surfaces_no_gradients_or_card_shadows():
    assert "--accent-gradient: linear-gradient(var(--accent), var(--accent));" in BASE_CSS
    assert BASE_CSS.count("--card-shadow: none;") >= 3  # light, system dark, manual dark


def test_brand_fonts_loaded_with_fallbacks():
    assert "fonts.googleapis.com/css2?family=Be+Vietnam+Pro" in INDEX
    assert "Noto+Serif+SC" in INDEX
    assert '--font-sans: "Be Vietnam Pro",' in BASE_CSS
    assert '--font-zh: "Noto Serif SC", "Songti SC"' in BASE_CSS


def test_design_system_layer_bundled_last():
    bundle = (ROOT / "tools/bundle_css.py").read_text(encoding="utf-8")
    start = bundle.index("BUNDLE_FILES = [")
    entries = [line.strip().strip('",') for line in bundle[start:bundle.index("]", start)].splitlines()[1:]]
    entries = [e for e in entries if e]
    assert entries[-1] == "assets/css/design-system.css"


def test_shared_primitives_have_all_states():
    for selector in (
        ".ds-btn:active", ".ds-btn:focus-visible", ".ds-btn:disabled", '.ds-btn[aria-busy="true"]',
        ".ds-btn--primary:hover", ".ds-pill",
    ):
        assert selector in BASE_CSS, selector


def test_brand_identity_in_shell():
    header_js = (ROOT / "src/islands/HeaderConstants.js").read_text(encoding="utf-8")
    header_jsx = (ROOT / "src/islands/AppHeader.jsx").read_text(encoding="utf-8")
    assert "BRAND_TITLE: '汉字思维'" in header_js and "TITLE: 'appTitle'" in header_js
    assert "HEADER_LOGO_SRC = 'assets/images/logo.svg'" in header_js
    assert "Hànzì Sīwéi" in INDEX and "Hanzi Mind" in INDEX
    assert ".app-header-brand h1 {\n  font-family: var(--font-zh);" in DS_CSS
    assert "🔥" not in header_jsx and "🔥" not in header_js


def test_curriculum_page_structure():
    jsx = (ROOT / "src/islands/Curriculum.jsx").read_text(encoding="utf-8")
    for cls in ("cur-metrics", "cur-levels", "is-complete", "cur-feature", "cur-feature-py",
                "cur-lesson-py", "cur-overview", "cur-meters", "cur-structure", "CurriculumSkeleton",
                "cur-empty-title"):
        assert cls in jsx, cls
    css = (ROOT / "assets/css/curriculum.css").read_text(encoding="utf-8")
    assert "grid-template-columns: minmax(0, 8fr) minmax(0, 4fr);" in css
    assert "contain: inline-size;" in css  # scrollable level selector cannot widen the page
    assert "body.curriculum-view-active:not(.study-mode) .app-header" in DS_CSS
    assert "position: sticky;" in DS_CSS


def test_primary_tabs_alignment_no_negative_margin():
    # Primary tabs group must not have negative margin-left, ensuring clean flush alignment with daily goal card
    assert "margin-left: -14px;" not in DS_CSS
    assert "margin-left: calc(-1 * var(--space-3));" not in DS_CSS

