#!/usr/bin/env python3
"""
tools/manga_ocr.py — character-level OCR for vertical Chinese manga pages.

Pipeline (per page):
  1. Text detection  : PP-OCRv5 server DBNet, run at 1x and 1.5x and unioned for recall.
  2. Block grouping  : detected boxes are rasterised, dilated by ~½ glyph and merged
                       into speech-bubble blocks (connected components).
  3. Column split    : inside each block the ink is binarised (Otsu) and split into
                       vertical columns with a projection profile. This fixes the
                       detector's habit of merging grid-aligned glyphs of neighbouring
                       columns into one horizontal "line".
  4. Recognition     : each column is rotated 90° CCW and fed to the PP-OCRv5 server
                       recogniser alone (det/cls disabled). CTC time-steps give each
                       glyph's centre; glyph boxes are then snapped to the ink rows.
  5. Output          : blocks → columns (right→left) → chars with pixel boxes + confidence.

The result is cached as JSON next to the story data and consumed by
tools/build_manga_word_layer.py, which aligns it with the curated dialogue text
and emits word-level hover hotspots.

Setup (one-off, isolated venv):
    python3 -m venv .venv-ocr
    .venv-ocr/bin/pip install rapidocr onnxruntime opencv-python-headless
Usage:
    .venv-ocr/bin/python tools/manga_ocr.py                       # all stories in manifest
    .venv-ocr/bin/python tools/manga_ocr.py doraemon_manga_001    # one story
    .venv-ocr/bin/python tools/manga_ocr.py --debug               # also writes overlay PNGs
    .venv-ocr/bin/python tools/manga_ocr.py doraemon_manga_001 --pages=2,3 --debug   # dry run
"""

import json
import re
import sys
from pathlib import Path

import cv2
import numpy as np
from rapidocr import LangDet, LangRec, ModelType, OCRVersion, RapidOCR

REPO_ROOT = Path(__file__).resolve().parent.parent
MANGA_DIR = REPO_ROOT / "database" / "readings" / "manga" / "doraemon"
OCR_DIR = MANGA_DIR / "ocr"
DEBUG_DIR = REPO_ROOT / "tools" / ".manga_ocr_debug"

CJK_RE = re.compile(r"[㐀-鿿豈-﫿]")
PUNCT = set("。，、！？…：；「」『』（）—～.,!?")

ENGINE = RapidOCR(params={
    "Det.ocr_version": OCRVersion.PPOCRV5, "Rec.ocr_version": OCRVersion.PPOCRV5,
    "Det.model_type": ModelType.SERVER, "Rec.model_type": ModelType.SERVER,
    "Det.lang_type": LangDet.CH, "Rec.lang_type": LangRec.CH,
    "Det.limit_side_len": 2400, "Det.limit_type": "max",
    "Det.box_thresh": 0.45,
    "Global.log_level": "error",
})


# ----------------------------------------------------------------------------- detection
def detect_boxes(img):
    """Union of detections at two scales → list of (x0, y0, x1, y1) in px."""
    boxes = []
    for scale in (1.0, 1.5):
        im = img if scale == 1.0 else cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        res = ENGINE(im, use_det=True, use_cls=False, use_rec=True)
        if res.boxes is None:
            continue
        for box, txt, score in zip(res.boxes, res.txts, res.scores):
            if not CJK_RE.search(txt or "") or score < 0.5:
                continue
            b = np.asarray(box) / scale
            boxes.append((b[:, 0].min(), b[:, 1].min(), b[:, 0].max(), b[:, 1].max()))
    return boxes


def cv_column_proposals(img, gray, g, known):
    """Second detector for balloons DBNet skipped (thin, light glyphs).

    Ink is closed into blobs; any blob of balloon-text size that no DBNet box
    touches is split into vertical columns with the same projection profile as
    below, and a column is kept only when the recogniser reads it as confident
    CJK text — artwork never survives that check."""
    H, W = gray.shape
    bw = (gray < 140).astype(np.uint8) * 255
    # strip strokes longer than any glyph (panel borders, balloon outlines, artwork lines)
    n0, lab0, st0, _ = cv2.connectedComponentsWithStats(bw)
    big = [i for i in range(1, n0) if max(st0[i][2], st0[i][3]) > g * 1.4]
    if big:
        bw[np.isin(lab0, big)] = 0
    k = max(2, int(g * 0.3))
    blob = cv2.morphologyEx(bw, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    n, _, st, _ = cv2.connectedComponentsWithStats(blob)

    def covered(a):
        """Fraction of box a already covered by a DBNet box."""
        best = 0.0
        for b in known:
            iw = min(a[2], b[2]) - max(a[0], b[0]); ih = min(a[3], b[3]) - max(a[1], b[1])
            if iw > 0 and ih > 0:
                best = max(best, iw * ih / float((a[2] - a[0]) * (a[3] - a[1])))
        return best

    out = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        cand = (x, y, x + w, y + h)
        if not (0.45 * g <= w <= 7 * g and 1.4 * g <= h <= 9 * g):
            continue
        if not (0.15 <= area / float(w * h) <= 0.88):
            continue
        for col in split_columns(gray, cand, g):
            cx0, cy0, cx1, cy1 = col
            if not (0.5 * g <= cx1 - cx0 <= 1.4 * g and cy1 - cy0 >= 1.5 * g) or covered(col) > 0.3:
                continue
            crop = img[max(0, cy0 - 3):min(H, cy1 + 3), max(0, cx0 - 3):min(W, cx1 + 3)]
            res = ENGINE(np.ascontiguousarray(np.rot90(crop)), use_det=False, use_cls=False, use_rec=True)
            if not res.txts:
                continue
            t, sc = res.txts[0], float(res.scores[0])
            if sc >= 0.8 and sum(1 for c in t if CJK_RE.match(c)) >= 2 and all(CJK_RE.match(c) or c in PUNCT for c in t):
                out.append(col)
    return out


def glyph_size(boxes):
    shorts = [min(x1 - x0, y1 - y0) for x0, y0, x1, y1 in boxes]
    return float(np.median(shorts)) if shorts else 30.0


def group_blocks(img_shape, boxes, g):
    """Merge detection boxes into bubble blocks (rectangles)."""
    h, w = img_shape[:2]
    mask = np.zeros((h, w), np.uint8)
    for x0, y0, x1, y1 in boxes:
        cv2.rectangle(mask, (int(x0), int(y0)), (int(x1), int(y1)), 255, -1)
    k = max(3, int(g * 0.45))
    dil = cv2.dilate(mask, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(dil)
    blocks = []
    for i in range(1, n):
        ys, xs = np.where((lab == i) & (mask > 0))
        if len(xs) == 0:
            continue
        blocks.append((int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
    return blocks


# ----------------------------------------------------------------------------- columns
def runs(profile, min_val, min_gap):
    """Contiguous index runs where profile >= min_val, bridging gaps < min_gap."""
    on = profile >= min_val
    out, start, last = [], None, None
    for i, v in enumerate(on):
        if v:
            if start is None:
                start = i
            elif last is not None and i - last > min_gap:
                out.append((start, last + 1))
                start = i
            last = i
    if start is not None:
        out.append((start, last + 1))
    return out


def ink_mask(gray):
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    return bw


def extend_column(page_bw, col, g):
    """Grow a column up/down to swallow glyphs the detector box clipped off.

    A neighbouring ink run is accepted when it sits within half a glyph of the
    column, is no taller than a glyph and its ink stays inside the column's
    x-range (a bubble outline or artwork would spill sideways)."""
    x0, y0, x1, y1 = col
    H, W = page_bw.shape
    mx = max(2, int(g * 0.35))
    for direction in (-1, 1):
        for _ in range(3):
            if direction < 0:
                s0, s1 = max(0, y0 - int(g * 1.6)), y0
            else:
                s0, s1 = y1, min(H, y1 + int(g * 1.6))
            if s1 - s0 < 3:
                break
            strip = page_bw[s0:s1, x0:x1] > 0
            prof = strip.sum(axis=1)
            rr = runs(prof, 1, max(2, int(g * 0.12)))
            if not rr:
                break
            ry0, ry1 = rr[-1] if direction < 0 else rr[0]
            gap = (s1 - s0 - ry1) if direction < 0 else ry0
            if gap > g * 0.55 or ry1 - ry0 > g * 1.15:
                break
            lx0, lx1 = max(0, x0 - mx), min(W, x1 + mx)
            margin = page_bw[s0 + ry0:s0 + ry1, lx0:x0].sum() + page_bw[s0 + ry0:s0 + ry1, x1:lx1].sum()
            inside = page_bw[s0 + ry0:s0 + ry1, x0:x1].sum()
            if inside == 0 or margin > inside * 0.25:
                break
            # the run must touch neither side wall of the column (panel border / outline)
            band = strip[ry0:ry1]
            if band[:, 0].sum() > (ry1 - ry0) * 0.6 or band[:, -1].sum() > (ry1 - ry0) * 0.6:
                break
            if direction < 0:
                y0 = s0 + ry0
            else:
                y1 = s0 + ry1
    return (x0, y0, x1, y1)


def split_columns(gray, block, g, page_bw=None):
    x0, y0, x1, y1 = block
    pad = max(2, int(g * 0.15))
    H, W = gray.shape
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(W, x1 + pad), min(H, y1 + pad)
    bw = ink_mask(gray[y0:y1, x0:x1])

    # drop long strokes touching the crop border (bubble outlines / panel lines)
    n, lab, st, _ = cv2.connectedComponentsWithStats(bw)
    for i in range(1, n):
        bx, by, bwid, bhei, area = st[i]
        touches = bx == 0 or by == 0 or bx + bwid >= bw.shape[1] or by + bhei >= bw.shape[0]
        if touches and max(bwid, bhei) > g * 1.2:
            bw[lab == i] = 0

    prof = (bw > 0).sum(axis=0)
    cols = []
    raw = [r for r in runs(prof, 1, max(2, int(g * 0.12))) if r[1] - r[0] >= g * 0.25]
    # ink width of one column: DBNet boxes carry padding, so measure the runs themselves
    widths = sorted(b - a for a, b in raw)
    cw = float(np.median(widths[: max(1, (len(widths) + 1) // 2)])) if widths else g * 0.6
    cw = min(max(cw, g * 0.45), g * 0.95)
    for cx0, cx1 in raw:
        # a run much wider than one column = neighbouring columns touching; cut at the deepest valley
        pieces = [(cx0, cx1)]
        while any(b - a > cw * 1.6 for a, b in pieces):
            nxt = []
            for a, b in pieces:
                if b - a > cw * 1.6:
                    lo, hi = a + int(cw * 0.7), b - int(cw * 0.7)
                    cut = lo + int(np.argmin(prof[lo:hi])) if hi > lo else (a + b) // 2
                    nxt += [(a, cut), (cut, b)]
                else:
                    nxt.append((a, b))
            pieces = nxt
        for a, b in pieces:
            rprof = (bw[:, a:b] > 0).sum(axis=1)
            rr = runs(rprof, 1, int(g * 0.9))
            for ry0, ry1 in rr:
                if ry1 - ry0 < g * 0.3 and (b - a) < g * 0.3:
                    continue
                col = (x0 + a, y0 + ry0, x0 + b, y0 + ry1)
                if page_bw is not None:
                    col = extend_column(page_bw, col, g)
                cols.append(col)
    return cols


# ----------------------------------------------------------------------------- recognition
def recognise_column(img, gray, col, g):
    x0, y0, x1, y1 = col
    cx = (x0 + x1) / 2
    half = max((x1 - x0) / 2, g * 0.55) + 3
    H, W = gray.shape
    ax0, ax1 = int(max(0, cx - half)), int(min(W, cx + half))
    ay0, ay1 = int(max(0, y0 - 4)), int(min(H, y1 + 4))
    crop = img[ay0:ay1, ax0:ax1]
    if crop.size == 0:
        return []
    rot = np.ascontiguousarray(np.rot90(crop))  # CCW: top of column → left of line
    res = ENGINE(rot, use_det=False, use_cls=False, use_rec=True, return_word_box=True)
    if not res.txts or not res.word_results:
        return []
    info = res.word_results[0]
    chars, centres, confs = [], [], []
    total = float(info.line_txt_len) or 1.0
    flat_words = [c for w in info.words for c in w]
    flat_cols = [c for w in info.word_cols for c in w]
    flat_conf = list(info.confs) if info.confs else [float(res.scores[0])] * len(flat_words)
    span = ay1 - ay0
    for ch, colpos, cf in zip(flat_words, flat_cols, flat_conf):
        chars.append(ch)
        centres.append(ay0 + (colpos + 0.5) / total * span)
        confs.append(float(cf))
    if not chars:
        return []

    # snap glyph boxes: boundaries at midpoints between centres, clamped to ink extent
    bounds = [y0] + [(centres[i] + centres[i + 1]) / 2 for i in range(len(centres) - 1)] + [y1]
    out = []
    for i, ch in enumerate(chars):
        top, bot = bounds[i], bounds[i + 1]
        # keep glyphs roughly square (prevents one char stretching over an empty gap)
        if bot - top > g * 1.25:
            c = centres[i]
            top, bot = max(top, c - g * 0.6), min(bot, c + g * 0.6)
        out.append({
            "ch": ch,
            "conf": round(confs[i], 3),
            "box": [int(round(x0)), int(round(top)), int(round(x1 - x0)), int(round(bot - top))],
        })
    return out


def recognise_glyph(img, box):
    """Single upright glyph → (char, conf)."""
    x, y, w, h = box
    H, W = img.shape[:2]
    pad = 3
    crop = img[max(0, y - pad):min(H, y + h + pad), max(0, x - pad):min(W, x + w + pad)]
    if crop.size == 0:
        return "", 0.0
    # give the recogniser a little horizontal context so it does not stretch the glyph
    crop = cv2.copyMakeBorder(crop, 4, 4, 10, 10, cv2.BORDER_REPLICATE)
    res = ENGINE(crop, use_det=False, use_cls=False, use_rec=True)
    if not res.txts:
        return "", 0.0
    t = res.txts[0].strip()
    return (t[:1], float(res.scores[0])) if t else ("", 0.0)


def tighten(page_bw, box):
    """Shrink a glyph slot to the ink it actually contains (vertically)."""
    x, y, w, h = box
    prof = page_bw[y:y + h, x:x + w].sum(axis=1)
    nz = np.nonzero(prof)[0]
    if len(nz) == 0:
        return box
    return [x, y + int(nz[0]), w, int(nz[-1] - nz[0] + 1)]


def slot_column(img, page_bw, col, chars, pitch):
    """Re-segment a column into evenly pitched glyph slots.

    Typeset manga dialogue sits on a fixed grid, so the slot count follows from
    the column height. When the whole-column read already has that many glyphs
    we only replace its CTC-estimated boxes by the slot boxes; otherwise every
    slot is recognised on its own (recovers glyphs CTC merged or dropped and
    discards slots that turned out to be artwork)."""
    x0, y0, x1, y1 = col
    h = y1 - y0
    n = max(1, int(round(h / pitch)))
    step = h / n
    slots = [[x0, int(round(y0 + i * step)), x1 - x0, int(round(step))] for i in range(n)]
    if len(chars) == n:
        return [{**c, "box": tighten(page_bw, s)} for c, s in zip(chars, slots)]
    col_text = "".join(c["ch"] for c in chars)
    out = []
    for s in slots:
        ch, cf = recognise_glyph(img, s)
        if not ch or cf < 0.35 or not (CJK_RE.match(ch) or ch in PUNCT):
            continue
        box = tighten(page_bw, s)
        # a glyph straddling two slots gets read twice — merge unless the column read doubled it too
        if out and out[-1]["ch"] == ch and (ch * 2) not in col_text:
            prev = out[-1]["box"]
            bottom = box[1] + box[3]
            prev[3] = bottom - prev[1]
            out[-1]["conf"] = max(out[-1]["conf"], round(cf, 3))
            continue
        out.append({"ch": ch, "conf": round(cf, 3), "box": box})
    return out


# ----------------------------------------------------------------------------- page / story
def ocr_page(path, debug_name=None):
    img = cv2.imread(str(path))
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    H, W = gray.shape
    boxes = detect_boxes(img)
    g = glyph_size(boxes)
    boxes += cv_column_proposals(img, gray, g, boxes)
    # page-wide ink mask with a fixed threshold (text is near-black on paper)
    page_bw = (gray < 110).astype(np.uint8)
    # phase 1 — whole-column reads
    staged = []
    for block in group_blocks(img.shape, boxes, g):
        cols = split_columns(gray, block, g, page_bw)
        cols.sort(key=lambda c: (-(c[0] + c[2]) / 2, c[1]))  # right → left, top → bottom
        entries = []
        for col in cols:
            chars = recognise_column(img, gray, col, g)
            chars = [c for c in chars if CJK_RE.match(c["ch"]) or c["ch"] in PUNCT]
            if not chars or not any(CJK_RE.match(c["ch"]) for c in chars):
                continue
            mean_conf = sum(c["conf"] for c in chars) / len(chars)
            if mean_conf < 0.45:
                continue
            entries.append((col, chars, mean_conf))
        staged.append(entries)

    # page glyph pitch from confident multi-glyph columns
    samples = [(c[3] - c[1]) / len(ch) for ent in staged for c, ch, mc in ent
               if len(ch) >= 3 and mc >= 0.9 and CJK_RE.match(ch[-1]["ch"])]
    pitch = float(np.median(samples)) if samples else g * 1.05

    # phase 2 — grid slotting
    blocks_out = []
    for entries in staged:
        col_out = []
        for col, chars, _ in entries:
            chars = slot_column(img, page_bw, col, chars, pitch)
            if not any(CJK_RE.match(c["ch"]) for c in chars):
                continue
            col_out.append({"box": [col[0], col[1], col[2] - col[0], col[3] - col[1]],
                            "text": "".join(c["ch"] for c in chars), "chars": chars})
        if col_out:
            bx0 = min(c["box"][0] for c in col_out); by0 = min(c["box"][1] for c in col_out)
            bx1 = max(c["box"][0] + c["box"][2] for c in col_out); by1 = max(c["box"][1] + c["box"][3] for c in col_out)
            blocks_out.append({"box": [bx0, by0, bx1 - bx0, by1 - by0],
                               "text": "".join(c["text"] for c in col_out), "columns": col_out})
    # reading order: manga panels right→left, top→bottom (coarse row bands)
    band = H / 8
    blocks_out.sort(key=lambda b: (int(b["box"][1] // band), -(b["box"][0] + b["box"][2])))

    if debug_name:
        DEBUG_DIR.mkdir(parents=True, exist_ok=True)
        vis = img.copy()
        for b in blocks_out:
            x, y, w, h = b["box"]
            cv2.rectangle(vis, (x - 2, y - 2), (x + w + 2, y + h + 2), (0, 160, 255), 1)
            for c in b["columns"]:
                for ch in c["chars"]:
                    cx, cy, cw, chh = ch["box"]
                    cv2.rectangle(vis, (cx, cy), (cx + cw, cy + chh), (40, 40, 230), 1)
        cv2.imwrite(str(DEBUG_DIR / f"{debug_name}.png"), vis)

    return {"width": W, "height": H, "glyph_px": round(g, 1), "pitch_px": round(pitch, 1), "blocks": blocks_out}


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    debug = "--debug" in sys.argv
    only = next((a.split("=", 1)[1] for a in sys.argv if a.startswith("--pages=")), None)
    only = {int(x) for x in only.split(",")} if only else None  # dry run: no JSON written
    manifest = json.loads((MANGA_DIR / "manifest.json").read_text(encoding="utf-8"))
    OCR_DIR.mkdir(parents=True, exist_ok=True)
    for item in manifest:
        if args and item["id"] not in args:
            continue
        story = json.loads((MANGA_DIR / f"{item['id']}.json").read_text(encoding="utf-8"))
        pages = []
        for p in story["pages"]:
            if only and p["page_num"] not in only:
                continue
            img_path = REPO_ROOT / p["image"]
            name = f"{item['id']}_p{p['page_num']:02d}"
            res = ocr_page(img_path, name if debug else None)
            res["page_num"] = p["page_num"]
            res["image"] = p["image"]
            pages.append(res)
            print(f"{name}: {len(res['blocks'])} blocks · " + " | ".join(b["text"] for b in res["blocks"]))
        if only:
            continue
        out = OCR_DIR / f"{item['id']}.ocr.json"
        out.write_text(json.dumps({"id": item["id"], "engine": "PP-OCRv5 server (RapidOCR/ONNX) + column split",
                                   "pages": pages}, ensure_ascii=False, indent=1), encoding="utf-8")
        print("saved", out.relative_to(REPO_ROOT))


if __name__ == "__main__":
    main()
