#!/usr/bin/env python3
"""
tools/import_manga_chapter.py — add one Doraemon chapter to the manga reader in one command.

Give it a folder of page scans (jpg/png/webp, from a book you own) plus where the
chapter sits in the series, and it will:
  1. convert the pages to webp under assets/images/readings/manga/doraemon/<slug>/
  2. write the story skeleton database/readings/manga/doraemon/<id>.json
  3. upsert the manifest entry, keeping the whole manifest in series order
     (short stories: volume 1 → 45; long adventures 大長篇: film 1 → N)
  4. run tools/manga_ocr.py for the chapter
  5. draft transcripts/<id>.json from the OCR text (only if no transcript exists yet)
  6. run tools/build_manga_word_layer.py so the chapter is readable right away

The OCR draft has no Vietnamese and may contain misreads. Proof-read
transcripts/<id>.json (fix zh_trad, add speaker / vi, drop "draft": true), then
rebuild the word layer:
    .venv-ocr/bin/python tools/build_manga_word_layer.py <id>

Usage (run with the OCR venv, see tools/manga_ocr.py for setup; Pillow is needed too):
    .venv-ocr/bin/python tools/import_manga_chapter.py --src ~/scans/vol01_ch01 \\
        --volume 1 --chapter 1 --slug from-the-future \\
        --title-zh "來自未來的國度" --title-vi "Đến từ đất nước tương lai"
    .venv-ocr/bin/python tools/import_manga_chapter.py --src ~/scans/dinosaur_ch01 \\
        --collection adventure --volume 1 --chapter 1 --slug nobita-dinosaur-01 \\
        --title-zh "大雄的恐龍 (一)" --title-vi "Chú khủng long của Nobita (1)"
Flags:
    --skip-ocr      only images + skeleton + manifest (run OCR later)
    --force         overwrite an existing chapter's images/story file
"""

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MANGA_DIR = REPO_ROOT / "database" / "readings" / "manga" / "doraemon"
MANIFEST = MANGA_DIR / "manifest.json"
TR_DIR = MANGA_DIR / "transcripts"
OCR_DIR = MANGA_DIR / "ocr"
IMG_ROOT = REPO_ROOT / "assets" / "images" / "readings" / "manga" / "doraemon"

IMAGE_EXT = {".jpg", ".jpeg", ".png", ".webp"}
MAX_WIDTH = 1100
COLLECTIONS = {
    "short": {"source_vol": "《哆啦A梦》第{vol}卷", "order": 0},
    "adventure": {"source_vol": "《哆啦A梦大長篇》第{vol}部", "order": 1},
}
DEFAULT_NAMES = ["大雄", "靜兒", "叮噹", "技安", "小夫"]
CREDITS = ("Bản quyền nguyên tác thuộc Fujiko Pro & Shogakukan. "
           "Sử dụng làm tư liệu đối chiếu học tập tiếng Trung phi thương mại.")


# ----------------------------------------------------------------------------- pure helpers
def story_id(collection, volume, chapter):
    """Stable id; keeps the doraemon_manga_ prefix the word-layer builder globs for."""
    tag = "s" if collection == "short" else "l"
    return f"doraemon_manga_{tag}{volume:02d}_{chapter:02d}"


def natural_key(path):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", Path(path).name)]


def list_pages(src):
    pages = sorted((p for p in Path(src).iterdir() if p.suffix.lower() in IMAGE_EXT), key=natural_key)
    if not pages:
        raise SystemExit(f"No page images (jpg/png/webp) found in {src}")
    return pages


def sort_key(entry):
    """Series order: collection, then volume, then chapter inside the volume.
    Entries without a volume (legacy) keep their chapter_no order at the end of their collection."""
    coll = COLLECTIONS.get(entry.get("collection", "short"), {"order": 9})["order"]
    vol = entry.get("volume")
    return (coll, vol if vol is not None else 10_000, entry.get("chapter_in_volume") or 0, entry.get("chapter_no") or 0)


def upsert_manifest(manifest, entry):
    """Replace the entry with the same id (or append), re-sort, and renumber chapter_no
    as the running position inside each collection (shown as the reading order)."""
    out = [m for m in manifest if m["id"] != entry["id"]] + [entry]
    out.sort(key=sort_key)
    counters = {}
    for m in out:
        coll = m.get("collection", "short")
        counters[coll] = counters.get(coll, 0) + 1
        m["chapter_no"] = counters[coll]
    return out


def draft_transcript(sid, ocr):
    """One bubble per OCR block, in the OCR reading order; Vietnamese left empty."""
    pages = []
    for p in ocr["pages"]:
        bubbles = [{"zh_trad": b["text"], "speaker": "", "vi": "", "draft": True}
                   for b in p.get("blocks", []) if b.get("text")]
        pages.append({"page_num": p["page_num"], "bubbles": bubbles})
    return {"id": sid,
            "note": "OCR draft from tools/import_manga_chapter.py — proof-read zh_trad, add speaker and vi, "
                    "then remove the draft flags and rebuild with tools/build_manga_word_layer.py.",
            "pages": pages}


def build_entry(args, sid, page_paths):
    coll = COLLECTIONS[args.collection]
    rel_imgs = [p.relative_to(REPO_ROOT).as_posix() for p in page_paths]
    source = args.source or (coll["source_vol"].format(vol=args.volume)
                             + " · 原作：藤子·F·不二雄 · 小学馆 / 香港文化传信")
    return {
        "id": sid,
        "series": "doraemon",
        "series_title": "哆啦A梦",
        "series_title_vi": "Đô-rê-mon",
        "collection": args.collection,
        "volume": args.volume,
        "chapter_in_volume": args.chapter,
        "chapter_no": 0,  # renumbered by upsert_manifest
        "title": {
            "zh": to_simplified(args.title_zh),
            "zh_trad": args.title_zh,
            "vi": args.title_vi,
            "pinyin": args.title_pinyin or title_pinyin(args.title_zh),
        },
        "description_vi": args.description_vi or "",
        "cover_image": rel_imgs[0],
        "source": source,
        "source_credits": CREDITS,
        "page_count": len(rel_imgs),
        "difficulty": args.difficulty,
        "estimatedMinutes": max(3, round(len(rel_imgs) * 0.9)),
        "file": f"database/readings/manga/doraemon/{sid}.json",
        "proper_names": DEFAULT_NAMES,
    }


def to_simplified(text):
    try:
        from opencc import OpenCC
        return OpenCC("t2s").convert(text)
    except ImportError:
        return text


def title_pinyin(text):
    try:
        from pypinyin import Style, lazy_pinyin
    except ImportError:
        return ""
    syl = [s for s in lazy_pinyin(to_simplified(text), style=Style.TONE) if re.search(r"\w", s)]
    out = " ".join(syl)
    return out[:1].upper() + out[1:]


# ----------------------------------------------------------------------------- side effects
def convert_pages(src_pages, dest_dir, force):
    from PIL import Image

    if dest_dir.exists() and any(dest_dir.iterdir()) and not force:
        raise SystemExit(f"{dest_dir.relative_to(REPO_ROOT)} already has pages; pass --force to overwrite")
    dest_dir.mkdir(parents=True, exist_ok=True)
    out = []
    for i, src in enumerate(src_pages, 1):
        im = Image.open(src).convert("RGB")
        if im.width > MAX_WIDTH:
            im = im.resize((MAX_WIDTH, round(im.height * MAX_WIDTH / im.width)), Image.LANCZOS)
        dest = dest_dir / f"page_{i:02d}.webp"
        im.save(dest, "WEBP", quality=82, method=6)
        out.append(dest)
    return out


def run_tool(script, sid):
    cmd = [sys.executable, str(REPO_ROOT / "tools" / script), sid]
    print("→", " ".join(Path(c).name if i < 2 else c for i, c in enumerate(cmd)))
    subprocess.run(cmd, check=True, cwd=REPO_ROOT)


def main(argv=None):
    ap = argparse.ArgumentParser(description="Import one Doraemon chapter into the manga reader.")
    ap.add_argument("--src", required=True, help="folder with the chapter's page images, in reading order")
    ap.add_argument("--collection", choices=sorted(COLLECTIONS), default="short",
                    help="short = 短篇 volumes 1-45, adventure = 大長篇 long adventures")
    ap.add_argument("--volume", type=int, required=True, help="volume (short) or adventure number")
    ap.add_argument("--chapter", type=int, required=True, help="chapter number inside the volume")
    ap.add_argument("--slug", required=True, help="image folder name, e.g. from-the-future")
    ap.add_argument("--title-zh", required=True, help="chapter title as printed (traditional)")
    ap.add_argument("--title-vi", required=True)
    ap.add_argument("--title-pinyin", default="")
    ap.add_argument("--description-vi", default="")
    ap.add_argument("--difficulty", default="HSK 3 - 4")
    ap.add_argument("--source", default="", help="override the source line")
    ap.add_argument("--skip-ocr", action="store_true")
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args(argv)

    if not re.fullmatch(r"[a-z0-9][a-z0-9-]*", args.slug):
        raise SystemExit("--slug must be lowercase letters, digits and dashes")
    sid = story_id(args.collection, args.volume, args.chapter)
    story_path = MANGA_DIR / f"{sid}.json"
    if story_path.exists() and not args.force:
        raise SystemExit(f"{sid} already exists; pass --force to re-import")

    pages = convert_pages(list_pages(Path(args.src).expanduser()), IMG_ROOT / args.slug, args.force)
    entry = build_entry(args, sid, pages)
    story = {k: v for k, v in entry.items() if k not in ("file", "proper_names")}
    story["pages"] = [{"page_num": i, "image": entry_img, "dialogues": [], "word_hotspots": []}
                      for i, entry_img in enumerate((p.relative_to(REPO_ROOT).as_posix() for p in pages), 1)]
    story_path.write_text(json.dumps(story, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else []
    manifest = upsert_manifest(manifest, entry)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"{sid}: {len(pages)} pages → {(IMG_ROOT / args.slug).relative_to(REPO_ROOT)} · manifest updated")

    if args.skip_ocr:
        print("OCR skipped. Next: tools/manga_ocr.py", sid, "then re-run without --skip-ocr --force, or draft the transcript by hand.")
        return

    run_tool("manga_ocr.py", sid)
    tr_path = TR_DIR / f"{sid}.json"
    if not tr_path.exists():
        ocr = json.loads((OCR_DIR / f"{sid}.ocr.json").read_text(encoding="utf-8"))
        TR_DIR.mkdir(parents=True, exist_ok=True)
        tr_path.write_text(json.dumps(draft_transcript(sid, ocr), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        print("drafted", tr_path.relative_to(REPO_ROOT), "from OCR — proof-read it and add Vietnamese")
    run_tool("build_manga_word_layer.py", sid)


if __name__ == "__main__":
    main()
