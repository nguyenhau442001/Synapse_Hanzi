#!/usr/bin/env python3
"""
tests/test_writing.py

Writing practice (Tập viết) worksheet: offline stroke bundles and app wiring.
Ink rendering and stroke grading are covered by tools/test_writing_ink.mjs (npm test).
"""

import json
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
STROKES = ROOT / "database" / "strokes"


def read(path):
    return (ROOT / path).read_text(encoding="utf-8")


def test_stroke_bundles_cover_every_curriculum_character():
    for level_file in sorted((ROOT / "database/curriculum/hsk30").glob("level*.json")):
        level = level_file.stem[5:]
        bundle = json.loads((STROKES / f"level{level}.json").read_text(encoding="utf-8"))
        assert bundle["v"] == 1 and bundle["level"] == level
        data = json.loads(level_file.read_text(encoding="utf-8"))
        chars = {ch for lesson in data["lessons"] for w in lesson["words"] for ch in w["hanzi"] if "㐀" <= ch <= "鿿"}
        missing = chars - set(bundle["chars"])
        assert not missing, f"level {level} lacks stroke data for {''.join(sorted(missing))}"
        for ch, entry in list(bundle["chars"].items())[:50]:
            assert len(entry["s"]) == len(entry["m"]) > 0, ch
            assert all(p.startswith("M") and p.endswith("Z") for p in entry["s"]), ch


def test_stroke_data_license_ships_with_bundles():
    assert (STROKES / "ARPHICPL.TXT").exists()
    assert "Arphic Public License" in read("tools/build_stroke_data.py")


@pytest.mark.skipif(not (ROOT / "node_modules/hanzi-writer-data").exists(), reason="hanzi-writer-data not installed")
def test_stroke_bundles_are_up_to_date():
    result = subprocess.run([sys.executable, "tools/build_stroke_data.py", "--check"], cwd=ROOT, capture_output=True, text=True)
    assert result.returncode == 0, result.stdout + result.stderr


def test_writing_screen_is_wired_into_the_app():
    html = read("index.html")
    assert 'id="screenWriting"' in html
    assert 'id="primaryTabWriting"' in html and 'data-subtab="writing"' in html
    # Primary navigation: Viết sits right after Đọc
    tabs = html[html.index('class="primary-tabs-group"'):html.index('id="pickerControls"')]
    assert tabs.index('id="primaryNavReading"') < tabs.index('id="primaryNavWriting"') < tabs.index('id="primaryTabReview"')
    assert "navId: 'primaryNavWriting'" in read("src/islands/NavSections.js")
    hub = read("src/islands/RadicalHub.jsx")
    assert "writing: { screenId: 'screenWriting' }" in hub
    assert "writing-view-active" in hub and "Writing.init()" in hub
    router = read("src/islands/SpaRouter.js")
    assert "?tab=writing&lesson=" in router and "Writing.open(" in router
    assert "mountWriting();" in read("src/islands/main.jsx")
    assert "openWritingPractice" in read("src/islands/Curriculum.jsx")
    assert "assets/css/writing.css" in read("tools/bundle_css.py")


def test_worksheet_supports_mouse_touch_and_pen():
    jsx = read("src/islands/Writing.jsx")
    for needle in ("onPointerDown", "onPointerMove", "onPointerCancel", "setPointerCapture", "getCoalescedEvents",
                   "pointerType === 'touch' && penOnlyActive()", "e.pressure", "wr-pad"):
        assert needle in jsx, needle
    css = read("assets/css/writing.css")
    assert "touch-action: none" in css
    assert "-webkit-touch-callout: none" in css
    assert "env(safe-area-inset-bottom)" in css
