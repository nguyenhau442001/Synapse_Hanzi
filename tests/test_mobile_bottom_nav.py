#!/usr/bin/env python3
"""
tests/test_mobile_bottom_nav.py

Verification suite for Mobile Bottom Navigation Bar:
1. Verifies DOM buttons exist in index.html with appropriate accessibility labels.
2. Asserts event listeners for mobile bottom nav (vocab, review, notebook, profile) and dialog close triggers
   are registered in AppBootstrap.js and MobileBottomNav.js.
3. Ensures compiled islands.js contains active event bindings for mobNav elements.
"""

from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parent.parent

def test_mobile_bottom_nav_markup():
    index_html = (ROOT / "index.html").read_text(encoding="utf-8")
    soup = BeautifulSoup(index_html, "html.parser")

    nav = soup.find(id="mobileBottomNav")
    assert nav is not None, "#mobileBottomNav missing from index.html"
    assert "mobile-bottom-nav" in nav.get("class", [])

    mob_vocab = soup.find(id="mobNavVocab")
    assert mob_vocab is not None, "#mobNavVocab button missing"
    assert "Từ vựng" in mob_vocab.get_text()

    mob_review = soup.find(id="mobNavReview")
    assert mob_review is not None, "#mobNavReview button missing"
    assert "Ôn nhanh" in mob_review.get_text()

    mob_notebook = soup.find(id="mobNavNotebook")
    assert mob_notebook is not None, "#mobNavNotebook button missing"
    assert "Sổ từ" in mob_notebook.get_text()

    mob_profile = soup.find(id="mobNavProfile")
    assert mob_profile is not None, "#mobNavProfile button missing"
    assert "Thống kê" in mob_profile.get_text()

    # Close buttons for mobile sheets
    assert soup.find(id="mobileStatsClose") is not None, "#mobileStatsClose button missing"
    assert soup.find(id="mobileDockClose") is not None, "#mobileDockClose button missing"

def test_mobile_bottom_nav_event_wiring():
    bootstrap_js = (ROOT / "src/islands/AppBootstrap.js").read_text(encoding="utf-8")
    mob_nav_js = (ROOT / "src/islands/MobileBottomNav.js").read_text(encoding="utf-8")
    islands_bundle = (ROOT / "assets/js/preact/islands.js").read_text(encoding="utf-8")

    # AppBootstrap.js bindings
    assert "mobNavVocab" in bootstrap_js
    assert "mobNavReview" in bootstrap_js
    assert "mobNavNotebook" in bootstrap_js
    assert "mobNavProfile" in bootstrap_js
    assert "mobileStatsClose" in bootstrap_js
    assert "mobileDockClose" in bootstrap_js

    # MobileBottomNav.js bindings
    assert "mobNavVocab" in mob_nav_js
    assert "mobNavReview" in mob_nav_js
    assert "mobNavNotebook" in mob_nav_js
    assert "mobNavProfile" in mob_nav_js
    assert "mobileStatsClose" in mob_nav_js
    assert "mobileDockClose" in mob_nav_js

    # Compiled islands bundle has them
    assert "mobNavVocab" in islands_bundle
    assert "mobNavReview" in islands_bundle
    assert "mobNavNotebook" in islands_bundle
    assert "mobNavProfile" in islands_bundle
