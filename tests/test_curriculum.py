"""Checks for the HSK 3.0 curriculum (Giao trinh) data and its wiring."""

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "database" / "curriculum" / "hsk30"


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def test_generated_curriculum_is_up_to_date():
    result = subprocess.run(
        [sys.executable, str(ROOT / "tools" / "build_curriculum.py"), "--check"],
        capture_output=True, text=True, cwd=ROOT,
    )
    assert result.returncode == 0, result.stdout + result.stderr


def test_every_level_covers_its_vocabulary_exactly_once():
    index = load(DATA / "index.json")
    assert [lv["level"] for lv in index["levels"]] == ["1", "2", "3", "4", "5", "6", "7"]
    for level in index["levels"]:
        vocab_file = ROOT / "database" / "vocabs" / "hsk3_0" / f"level{level['level']}_vocabularies.json"
        vocab_ids = [w["id"] for w in load(vocab_file)]
        seen = []
        for lesson in level["lessons"]:
            deck = load(DATA / "decks" / f"{lesson['key']}.json")
            assert len(deck) == lesson["words"]
            seen.extend(w["id"] for w in deck)
        assert sorted(seen) == sorted(vocab_ids), level["name"]


def test_lessons_have_grammar_dialogue_and_quizzable_examples():
    index = load(DATA / "index.json")
    for level in index["levels"]:
        data = load(DATA / f"level{level['level']}.json")
        for lesson in data["lessons"]:
            assert lesson["zh"] and lesson["vi"] and lesson["py"]
            assert len(lesson["dialogue"]) >= 4, lesson["key"]
            assert all(line["py"] and line["vi"] for line in lesson["dialogue"])
            assert len(lesson["grammar"]) >= 2, lesson["key"]
            for point in lesson["grammar"]:
                assert point["formula"] and point["examples"]
                assert any(point["key"] in ex["zh"] for ex in point["examples"]), (lesson["key"], point["title"])


def test_curriculum_tab_is_wired_into_the_app():
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    assert 'id="primaryTabCurriculum"' in html
    assert 'id="screenCurriculum"' in html
    assert 'id="mobNavCurriculum"' in html
    hub = (ROOT / "src" / "islands" / "RadicalHub.jsx").read_text(encoding="utf-8")
    assert "curriculum: { tabId: 'primaryTabCurriculum', screenId: 'screenCurriculum' }" in hub
    main = (ROOT / "src" / "islands" / "main.jsx").read_text(encoding="utf-8")
    assert "mountCurriculum();" in main
    bundle = (ROOT / "tools" / "bundle_css.py").read_text(encoding="utf-8")
    assert "assets/css/curriculum.css" in bundle
