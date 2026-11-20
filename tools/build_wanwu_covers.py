#!/usr/bin/env python3
"""
tools/build_wanwu_covers.py
Re-extracts one unique cover per 万物有意思 chapter from the source PDF and
computes a focal point so the wide card crop keeps the subject in view.

- Only scans the chapter's own pages: PDF index [book_page_start - 1, book_page_end - 1).
  (book_page_end is the next chapter's first page, which must not be scanned.)
- Never reuses an image already picked by another chapter (pixel hash).
- Focal point: detected faces first, then a saliency map, then image center.
- FOCUS_OVERRIDES (story id -> "x% y%") wins over the computed focal point.

Writes `cover_image`, `illustration` and `cover_focus` into the manifest and story JSON.

Usage:
  python3 tools/build_wanwu_covers.py            # extract + write
  python3 tools/build_wanwu_covers.py --dry-run  # print picks only
  python3 tools/build_wanwu_covers.py --focus-only  # keep images, recompute focus
"""

import argparse
import hashlib
import io
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST = REPO_ROOT / "database" / "readings" / "manifest.json"
IMG_DIR = REPO_ROOT / "assets" / "images" / "readings" / "wanwu"
PDF_GLOB = "exam_materials/hsk4/*万物有意思*.pdf"

MIN_BYTES = 15000
MIN_W, MIN_H = 160, 120

# Hand-tuned focal points ("x% y%") for covers where detection misses the subject.
FOCUS_OVERRIDES = {
    "wanwu_story_016": "50% 15%",
    "wanwu_story_037": "50% 12%",
    "wanwu_story_055": "50% 40%",
    "wanwu_story_061": "50% 18%",
    "wanwu_story_062": "50% 22%",
    "wanwu_story_085": "50% 30%",
}


def pixel_hash(img: Image.Image) -> str:
    """Hash of a small grayscale thumbnail: identical pictures collide even if re-encoded."""
    thumb = img.convert("L").resize((16, 16), Image.Resampling.BILINEAR)
    return hashlib.md5(thumb.tobytes()).hexdigest()


def chapter_candidates(reader, start: int, end: int):
    """Usable images on the chapter's own pages, largest first."""
    found = []
    for p in range(max(0, start - 1), min(end - 1, len(reader.pages))):
        for obj in reader.pages[p].images:
            if len(obj.data) < MIN_BYTES:
                continue
            try:
                img = Image.open(io.BytesIO(obj.data))
                img.load()
            except Exception:
                continue
            if img.width >= MIN_W and img.height >= MIN_H:
                found.append((img.width * img.height, p, img))
    found.sort(key=lambda t: -t[0])
    return found


def save_cover(img: Image.Image, dest: Path):
    img = img.copy()
    img.thumbnail((800, 600), Image.Resampling.LANCZOS)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    img.save(dest, format="WEBP", quality=82)


_FACE = None


def compute_focus(path: Path) -> str:
    """Return a CSS object-position for the subject of the picture."""
    global _FACE
    if _FACE is None:
        _FACE = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    bgr = cv2.cvtColor(np.array(Image.open(path).convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w = bgr.shape[:2]
    gray = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)

    min_side = max(24, int(min(w, h) * 0.06))
    faces = _FACE.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=6, minSize=(min_side, min_side))
    if len(faces):
        x, y, fw, fh = max(faces, key=lambda f: f[2] * f[3])
        # Center slightly below the face so the head and shoulders both show.
        cx, cy = x + fw / 2, y + fh * 0.9
    else:
        sal = cv2.saliency.StaticSaliencyFineGrained_create()
        ok, smap = sal.computeSaliency(bgr)
        if not ok:
            return "50% 50%"
        smap = cv2.GaussianBlur((smap * 255).astype("uint8"), (0, 0), max(w, h) / 40)
        weights = smap.astype("float64") ** 2
        total = weights.sum()
        if total <= 0:
            return "50% 50%"
        ys, xs = np.indices(weights.shape)
        cx, cy = (xs * weights).sum() / total, (ys * weights).sum() / total

    px = round(min(100, max(0, cx / w * 100)))
    py = round(min(100, max(0, cy / h * 100)))
    return f"{px}% {py}%"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--focus-only", action="store_true")
    args = ap.parse_args()

    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    stories = [m for m in manifest if m.get("series") == "wanwu"]

    reader = None
    if not args.focus_only:
        import pypdf
        pdfs = sorted(REPO_ROOT.glob(PDF_GLOB))
        if not pdfs:
            raise SystemExit(f"Source PDF not found: {PDF_GLOB}")
        reader = pypdf.PdfReader(str(pdfs[0]))

    used = {}
    for m in stories:
        sid = m["id"]
        dest = IMG_DIR / f"{sid}.webp"
        rel = f"assets/images/readings/wanwu/{sid}.webp"
        if reader is not None:
            pick = None
            for _, page, img in chapter_candidates(reader, m["book_page_start"], m["book_page_end"]):
                h = pixel_hash(img)
                if h not in used:
                    pick = (page, img, h)
                    break
            if pick is None:
                print(f"{sid}: no unique image on its pages -> no cover (seal fallback)")
                m.pop("cover_image", None)
                m.pop("illustration", None)
                m.pop("cover_focus", None)
                if not args.dry_run and dest.exists():
                    dest.unlink()
                continue
            page, img, h = pick
            used[h] = sid
            print(f"{sid}: pdf page {page} {img.width}x{img.height}")
            if not args.dry_run:
                save_cover(img, dest)
        if not dest.exists():
            continue
        m["cover_image"] = rel
        m["illustration"] = rel
        m["cover_focus"] = FOCUS_OVERRIDES.get(sid) or compute_focus(dest)
        print(f"  focus {m['cover_focus']}")

    if args.dry_run:
        return
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    for m in stories:
        path = REPO_ROOT / m["path"]
        story = json.loads(path.read_text(encoding="utf-8"))
        for key in ("cover_image", "illustration", "cover_focus"):
            if key in m:
                story[key] = m[key]
            else:
                story.pop(key, None)
        path.write_text(json.dumps(story, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Updated {len(stories)} wanwu stories.")


if __name__ == "__main__":
    main()
