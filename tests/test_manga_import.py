#!/usr/bin/env python3
"""tools/import_manga_chapter.py: series ordering, ids, OCR draft and a full --skip-ocr import."""

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
import import_manga_chapter as imp  # noqa: E402


def test_story_id_keeps_word_layer_prefix():
    assert imp.story_id("short", 1, 3) == "doraemon_manga_s01_03"
    assert imp.story_id("adventure", 12, 1) == "doraemon_manga_l12_01"


def test_manifest_follows_series_order_and_renumbers():
    manifest = [
        {"id": "a", "collection": "short", "volume": 21, "chapter_in_volume": None, "chapter_no": 1},
        {"id": "adv", "collection": "adventure", "volume": 1, "chapter_in_volume": 1, "chapter_no": 1},
    ]
    manifest = imp.upsert_manifest(manifest, {"id": "v1c2", "collection": "short", "volume": 1, "chapter_in_volume": 2})
    manifest = imp.upsert_manifest(manifest, {"id": "v1c1", "collection": "short", "volume": 1, "chapter_in_volume": 1})
    assert [m["id"] for m in manifest] == ["v1c1", "v1c2", "a", "adv"]
    assert [m["chapter_no"] for m in manifest] == [1, 2, 3, 1]
    # re-importing replaces instead of duplicating
    manifest = imp.upsert_manifest(manifest, {"id": "v1c1", "collection": "short", "volume": 1, "chapter_in_volume": 1})
    assert len(manifest) == 4


def test_real_manifest_is_in_series_order():
    manifest = json.loads(imp.MANIFEST.read_text(encoding="utf-8"))
    assert manifest == sorted(manifest, key=imp.sort_key)
    assert all(m.get("collection") in imp.COLLECTIONS for m in manifest)


def test_natural_page_order():
    names = ["p10.jpg", "p2.jpg", "p1.jpg"]
    assert sorted(names, key=imp.natural_key) == ["p1.jpg", "p2.jpg", "p10.jpg"]


def test_draft_transcript_one_bubble_per_block():
    ocr = {"pages": [{"page_num": 1, "blocks": [{"text": "春天到了。"}, {"text": ""}]}, {"page_num": 2, "blocks": []}]}
    tr = imp.draft_transcript("x", ocr)
    assert tr["pages"][0]["bubbles"] == [{"zh_trad": "春天到了。", "speaker": "", "vi": "", "draft": True}]
    assert tr["pages"][1]["bubbles"] == []


def test_skip_ocr_import_end_to_end(tmp_path, monkeypatch):
    pytest.importorskip("PIL")
    manga = tmp_path / "manga"
    manga.mkdir()
    (manga / "manifest.json").write_text(imp.MANIFEST.read_text(encoding="utf-8"), encoding="utf-8")
    monkeypatch.setattr(imp, "REPO_ROOT", tmp_path)
    monkeypatch.setattr(imp, "MANGA_DIR", manga)
    monkeypatch.setattr(imp, "MANIFEST", manga / "manifest.json")
    monkeypatch.setattr(imp, "IMG_ROOT", tmp_path / "img")
    src = ROOT / "assets" / "images" / "readings" / "manga" / "doraemon" / "plant"

    imp.main(["--src", str(src), "--volume", "1", "--chapter", "1", "--slug", "test-chapter",
              "--title-zh", "來自未來的國度", "--title-vi", "Đến từ tương lai", "--skip-ocr"])

    sid = "doraemon_manga_s01_01"
    story = json.loads((manga / f"{sid}.json").read_text(encoding="utf-8"))
    assert len(story["pages"]) == 8
    assert story["pages"][0]["image"] == "img/test-chapter/page_01.webp"
    assert (tmp_path / "img" / "test-chapter" / "page_08.webp").exists()
    manifest = json.loads((manga / "manifest.json").read_text(encoding="utf-8"))
    assert manifest[0]["id"] == sid and manifest[0]["chapter_no"] == 1
    assert manifest[0]["page_count"] == 8
    with pytest.raises(SystemExit):  # second import without --force refuses to clobber
        imp.main(["--src", str(src), "--volume", "1", "--chapter", "1", "--slug", "test-chapter",
                  "--title-zh", "x", "--title-vi", "x", "--skip-ocr"])
