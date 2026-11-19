#!/usr/bin/env python3
"""
tools/build_manga_word_layer.py — word-level hover layer for the manga reader.

Inputs (per story id):
  database/readings/manga/doraemon/<id>.json                story meta + pages (rewritten in place)
  database/readings/manga/doraemon/ocr/<id>.ocr.json        glyph boxes from tools/manga_ocr.py
  database/readings/manga/doraemon/transcripts/<id>.json    proof-read text of every balloon
  database/readings/manga/doraemon/transcripts/glossary_vi.json   context meanings / overrides

For each balloon in the transcript:
  1. find the run of OCR columns that best matches it (Needleman–Wunsch on
     simplified-normalised characters, searched over every contiguous column
     range of every OCR block);
  2. align transcript glyphs to OCR glyphs — matches *and* OCR misreads inherit
     the OCR box, glyphs the OCR missed are interpolated on the column grid;
  3. convert to simplified, segment into words (jieba + the HSK 3.0 lexicon as
     user dictionary, or a manual "seg" override), attach pinyin, Hán-Việt,
     Vietnamese meaning and HSK level;
  4. emit one hotspot per word whose `rects` follow the vertical columns
     (a word broken across two columns gets two rects), coordinates in % of
     the page image.

Setup: the same venv as manga_ocr.py plus
    .venv-ocr/bin/pip install opencc-python-reimplemented pypinyin jieba
Usage:
    .venv-ocr/bin/python tools/build_manga_word_layer.py [story_id ...]
"""

import json
import logging
import re
import sys
from pathlib import Path

import jieba
from opencc import OpenCC
from pypinyin import Style, lazy_pinyin

REPO_ROOT = Path(__file__).resolve().parent.parent
MANGA_DIR = REPO_ROOT / "database" / "readings" / "manga" / "doraemon"
OCR_DIR = MANGA_DIR / "ocr"
TR_DIR = MANGA_DIR / "transcripts"
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
HANVIET_JS = REPO_ROOT / "assets" / "js" / "hanviet-dict.js"

jieba.setLogLevel(logging.WARNING)
T2S = OpenCC("t2s")
CJK_RE = re.compile(r"[㐀-鿿豈-﫿]")


# ----------------------------------------------------------------------------- lexicon
def load_lexicon():
    lex = {}
    # HSK 3.0 (levels 1-9) — level 7 file holds the shared 7-9 band
    for lvl in range(1, 8):
        f = VOCAB_DIR / "hsk3_0" / f"level{lvl}_vocabularies.json"
        if not f.exists():
            continue
        for e in json.loads(f.read_text(encoding="utf-8")):
            hz = e.get("hanzi")
            if hz and hz not in lex:
                lex[hz] = {"pinyin": e.get("pinyin", ""), "hanviet": e.get("hanviet", ""),
                           "meaning_vi": e.get("meaning", ""), "hsk": lvl if lvl < 7 else "7-9"}
    # legacy HSK 2.0 decks fill gaps
    for lvl in range(1, 7):
        f = VOCAB_DIR / f"hsk{lvl}_vocabularies.json"
        if not f.exists():
            continue
        for e in json.loads(f.read_text(encoding="utf-8")):
            hz = e.get("hanzi")
            if hz and hz not in lex:
                lex[hz] = {"pinyin": e.get("pinyin", ""), "hanviet": "", "meaning_vi": e.get("meaning", ""), "hsk": None}
    return lex


def load_hanviet():
    src = HANVIET_JS.read_text(encoding="utf-8")
    out = {}
    for name in ("HANVIET_CHARS", "HANVIET_COMPOUNDS"):
        m = re.search(r"const %s = (\{.*?\});" % name, src, re.S)
        if m:
            out[name] = json.loads(m.group(1))
    return out.get("HANVIET_CHARS", {}), out.get("HANVIET_COMPOUNDS", {})


LEX = load_lexicon()
HV_CHARS, HV_COMPOUNDS = load_hanviet()
GLOSSARY = json.loads((TR_DIR / "glossary_vi.json").read_text(encoding="utf-8")) if (TR_DIR / "glossary_vi.json").exists() else {}
for w in list(LEX) + list(GLOSSARY):
    if len(w) > 1:
        jieba.add_word(w, freq=50000)


def hanviet_of(word_s, word_t):
    if word_s in HV_COMPOUNDS:
        return HV_COMPOUNDS[word_s]
    parts = []
    for cs, ct in zip(word_s, word_t):
        v = HV_CHARS.get(cs) or HV_CHARS.get(ct)
        if isinstance(v, list):
            v = v[0] if v else ""
        if isinstance(v, dict):
            v = v.get("hv") or v.get("hanviet") or ""
        parts.append((v or "").split(",")[0].strip().title())
    return " ".join(p for p in parts if p)


def lookup(word_s, word_t):
    """→ (pinyin, hanviet, meaning_vi, hsk, known)"""
    g = GLOSSARY.get(word_s) or GLOSSARY.get(word_t)
    base = LEX.get(word_s, {})
    py = (g or {}).get("pinyin") or base.get("pinyin") or " ".join(lazy_pinyin(word_s, style=Style.TONE))
    hv = (g or {}).get("hanviet") or base.get("hanviet") or hanviet_of(word_s, word_t)
    mean = (g or {}).get("meaning_vi") or base.get("meaning_vi") or ""
    return py, hv, mean, base.get("hsk"), bool(mean)


# ----------------------------------------------------------------------------- alignment
def norm(ch):
    if ch in "…‥.・": return "…"
    if ch in "！!": return "!"
    if ch in "？?": return "?"
    if ch in "，,、": return ","
    if ch in "。．": return "。"
    return T2S.convert(ch)


def nw(a, b, match=3, mis=-1, gap=-1):
    """Global alignment of two char lists → list of (i or None, j or None)."""
    n, m = len(a), len(b)
    S = [[0] * (m + 1) for _ in range(n + 1)]
    for i in range(1, n + 1): S[i][0] = i * gap
    for j in range(1, m + 1): S[0][j] = j * gap
    for i in range(1, n + 1):
        for j in range(1, m + 1):
            s = match if a[i - 1] == b[j - 1] else mis
            S[i][j] = max(S[i - 1][j - 1] + s, S[i - 1][j] + gap, S[i][j - 1] + gap)
    i, j, path = n, m, []
    while i > 0 or j > 0:
        if i > 0 and j > 0 and S[i][j] == S[i - 1][j - 1] + (match if a[i - 1] == b[j - 1] else mis):
            path.append((i - 1, j - 1)); i -= 1; j -= 1
        elif i > 0 and S[i][j] == S[i - 1][j] + gap:
            path.append((i - 1, None)); i -= 1
        else:
            path.append((None, j - 1)); j -= 1
    return path[::-1], S[n][m]


def page_glyphs(ocr_page):
    """Flatten OCR → blocks[ [ (col_id, glyph dict), ... per column ] ]."""
    blocks = []
    cid = 0
    for b in ocr_page["blocks"]:
        cols = []
        for c in b["columns"]:
            cols.append({"id": cid, "box": c["box"], "chars": c["chars"]})
            cid += 1
        blocks.append(cols)
    return blocks


def best_columns(text, blocks, used):
    """Best contiguous column run (inside one block) for a balloon text."""
    a = [norm(c) for c in text]
    n_cjk = sum(1 for c in text if CJK_RE.match(c))
    best = None
    for bi, cols in enumerate(blocks):
        for i in range(len(cols)):
            if cols[i]["id"] in used:
                continue
            for j in range(i, len(cols)):
                if cols[j]["id"] in used:
                    break
                glyphs = [g for c in cols[i:j + 1] for g in c["chars"]]
                b = [norm(g["ch"]) for g in glyphs]
                path, score = nw(a, b)
                matches = sum(1 for x, y in path if x is not None and y is not None and a[x] == b[y] and CJK_RE.match(text[x]))
                key = (matches, score)
                if best is None or key > best[0]:
                    best = (key, cols[i:j + 1], path, glyphs)
    if not best or best[0][0] < max(1, 0.34 * n_cjk):
        return None
    return best


def place_boxes(text, cols, path, glyphs, pitch):
    """Box for every transcript char (OCR box when aligned, interpolated otherwise)."""
    col_of = {}
    for c in cols:
        for g in c["chars"]:
            col_of[id(g)] = c
    boxes = [None] * len(text)
    for i, j in path:
        if i is not None and j is not None:
            x, y, w, h = glyphs[j]["box"]
            if h < pitch * 0.7 and CJK_RE.match(text[i]):
                # faint glyphs get tightened to a sliver by the ink threshold — restore a full cell
                cy = y + h / 2
                y, h = int(cy - pitch * 0.45), int(pitch * 0.9)
            boxes[i] = ([x, y, w, h], col_of[id(glyphs[j])]["id"])
    # interpolate gaps along the column grid — but only inside the column the
    # neighbour glyph lives in; a guess outside it would land on artwork, and no
    # hotspot is better than a wrong one
    col_box = {c["id"]: c["box"] for c in cols}

    def inside(box, cid):
        cx, cy, cw_, ch_ = col_box[cid]
        return box[1] >= cy - pitch * 0.5 and box[1] + box[3] <= cy + ch_ + pitch * 0.5

    filled = list(boxes)
    for i in range(len(text)):
        if boxes[i] is not None:
            continue
        prev = next((k for k in range(i - 1, -1, -1) if boxes[k] is not None), None)
        nxt = next((k for k in range(i + 1, len(text)) if boxes[k] is not None), None)
        cand = []
        if prev is not None:
            (x, y, w, h), cid = boxes[prev]
            cand.append(([x, int(y + (i - prev) * pitch), w, int(pitch * 0.92)], cid))
        if nxt is not None:
            (x, y, w, h), cid = boxes[nxt]
            cand.append(([x, int(y - (nxt - i) * pitch), w, int(pitch * 0.92)], cid))
        filled[i] = next((c for c in cand if inside(*c)), None)
    return filled


def pct(v, total):
    return round(v / total * 100, 3)


def rects_for(boxes, W, H):
    by_col = {}
    for box, cid in boxes:
        by_col.setdefault(cid, []).append(box)
    rects = []
    for cid, bs in by_col.items():
        x0 = min(b[0] for b in bs); y0 = min(b[1] for b in bs)
        x1 = max(b[0] + b[2] for b in bs); y1 = max(b[1] + b[3] for b in bs)
        pad = 1.5
        rects.append({"x": pct(x0 - pad, W), "y": pct(y0 - pad, H),
                      "width": pct(x1 - x0 + 2 * pad, W), "height": pct(y1 - y0 + 2 * pad, H)})
    rects.sort(key=lambda r: (-r["x"], r["y"]))  # reading order
    return rects


def union(rects):
    x0 = min(r["x"] for r in rects); y0 = min(r["y"] for r in rects)
    x1 = max(r["x"] + r["width"] for r in rects); y1 = max(r["y"] + r["height"] for r in rects)
    return {"x": round(x0, 3), "y": round(y0, 3), "width": round(x1 - x0, 3), "height": round(y1 - y0, 3)}


# ----------------------------------------------------------------------------- segmentation
def segment(zh_s, seg_override=None):
    if seg_override:
        parts = seg_override.split("|")
        if "".join(parts) == zh_s:
            return parts
        print(f"   ! seg override mismatch for {zh_s!r}: {seg_override!r}")
    out = []
    for w in jieba.cut(zh_s, HMM=False):
        out.extend(split_unknown(w))
    return out


def known(w):
    return w in GLOSSARY or bool(LEX.get(w, {}).get("meaning_vi"))


def split_unknown(w):
    """jieba sometimes glues words the lexicon does not define (很多, 看到 …).
    Re-split such a word into lexicon entries (longest match first) when every
    piece is defined; otherwise keep it whole for the glossary."""
    if len(w) < 2 or known(w) or not CJK_RE.search(w):
        return [w]
    parts, i = [], 0
    while i < len(w):
        for j in range(len(w), i, -1):
            if known(w[i:j]) or j == i + 1:
                parts.append(w[i:j]); i = j
                break
    return parts if all(known(p) for p in parts) else [w]


def to_simplified(zh_t):
    s = T2S.convert(zh_t)
    if len(s) != len(zh_t):  # keep a 1:1 glyph mapping
        s = "".join(T2S.convert(c) for c in zh_t)
    return s


# ----------------------------------------------------------------------------- build
def build_story(sid, misses):
    story_path = MANGA_DIR / f"{sid}.json"
    story = json.loads(story_path.read_text(encoding="utf-8"))
    ocr = json.loads((OCR_DIR / f"{sid}.ocr.json").read_text(encoding="utf-8"))
    tr = json.loads((TR_DIR / f"{sid}.json").read_text(encoding="utf-8"))
    ocr_pages = {p["page_num"]: p for p in ocr["pages"]}
    tr_pages = {p["page_num"]: p for p in tr["pages"]}

    stats = {"balloons": 0, "placed": 0, "words": 0, "glyphs": 0, "ocr_hit": 0}
    for page in story["pages"]:
        pn = page["page_num"]
        op, tp = ocr_pages.get(pn), tr_pages.get(pn, {"bubbles": []})
        if not op:
            continue
        W, H = op["width"], op["height"]
        pitch = op.get("pitch_px") or op.get("glyph_px", 28)
        blocks = page_glyphs(op)
        used = set()
        dialogues, hotspots = [], []
        for bi, bub in enumerate(tp["bubbles"]):
            stats["balloons"] += 1
            zh_t = bub["zh_trad"]
            zh_s = to_simplified(zh_t)
            did = f"p{pn}_d{bi + 1}"
            if bub.get("manual_cols"):
                # hand-placed vertical columns: [[x, y, w, h, "text in this column"], ...]
                boxes = []
                for ci, (mx, my, mw, mh, part) in enumerate(bub["manual_cols"]):
                    step = mh / max(1, len(part))
                    boxes += [([mx, int(my + k * step), mw, int(step)], f"m{bi}_{ci}") for k in range(len(part))]
                if len(boxes) != len(zh_t):
                    print(f"   ! p{pn}: manual_cols text does not add up to {zh_t}")
                    continue
                stats["placed"] += 1
            elif bub.get("manual_px"):
                # hand-placed geometry (e.g. horizontal titles the column OCR does not cover)
                mx, my, mw, mh = bub["manual_px"]
                n = len(zh_t)
                horiz = bub.get("layout") == "h"
                boxes = []
                for k in range(n):
                    if horiz:
                        boxes.append(([int(mx + k * mw / n), my, int(mw / n), mh], f"m{bi}"))
                    else:
                        boxes.append(([mx, int(my + k * mh / n), mw, int(mh / n)], f"m{bi}"))
                stats["placed"] += 1
            else:
                best = best_columns(zh_t, blocks, used)
                if not best:
                    print(f"   ! p{pn}: balloon not located on page: {zh_t}")
                    continue
                (matches, _), cols, path, glyphs = best
                used.update(c["id"] for c in cols)
                stats["placed"] += 1
                stats["ocr_hit"] += matches
                stats["glyphs"] += sum(1 for c in zh_t if CJK_RE.match(c))
                boxes = place_boxes(zh_t, cols, path, glyphs, pitch)

            sentence_py = " ".join(lazy_pinyin(zh_s, style=Style.TONE))
            dlg_rects = rects_for([b for b in boxes if b], W, H)
            dialogue = {
                "id": did, "character": bub.get("speaker", ""),
                "bbox": union(dlg_rects), "zh": zh_s, "zh_trad": zh_t,
                "pinyin": bub.get("pinyin") or sentence_py, "vi": bub.get("vi", ""), "tokens": [],
            }
            # Every segment becomes a token so the panel can show the whole sentence:
            # joined text_trad == zh_trad. Punctuation runs are kept as "punct" tokens;
            # words the lexicon does not know stay in with hsk: null.
            pos = 0
            for wi, word_s in enumerate(segment(zh_s, bub.get("seg"))):
                start, pos = pos, pos + len(word_s)
                word_t = zh_t[start:pos]
                if not CJK_RE.search(word_s):
                    prev = dialogue["tokens"][-1] if dialogue["tokens"] else None
                    if prev and prev.get("punct"):
                        prev["text"] += word_s
                        prev["text_trad"] += word_t
                    else:
                        dialogue["tokens"].append({"text": word_s, "text_trad": word_t, "punct": True})
                    continue
                py, hv, mean, hsk, known = lookup(word_s, word_t)
                if not known:
                    misses.setdefault(word_s, f"{sid} p{pn}: {zh_s}")
                tok = {"text": word_s, "text_trad": word_t, "pinyin": py, "hanviet": hv,
                       "meaning_vi": mean, "hsk": hsk}
                dialogue["tokens"].append(tok)
                # Hover hotspots still need a located glyph box on the scan.
                wboxes = [boxes[k] for k in range(start, pos) if boxes[k] and CJK_RE.match(zh_t[k])]
                if not wboxes:
                    continue
                rects = rects_for(wboxes, W, H)
                hotspots.append({
                    "id": f"{did}_w{wi}", **tok, "bbox": union(rects), "rects": rects,
                    "sentence_zh": zh_t, "sentence_zh_simplified": zh_s,
                    "sentence_vi": bub.get("vi", ""), "character": bub.get("speaker", ""),
                    "dialogue_id": did,
                })
                stats["words"] += 1
            dialogues.append(dialogue)
        page["dialogues"] = dialogues
        page["word_hotspots"] = hotspots
        page["ocr"] = {"engine": "PP-OCRv5", "glyph_pitch_px": pitch, "image_px": [W, H]}

    story_path.write_text(json.dumps(story, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    acc = stats["ocr_hit"] / max(1, stats["glyphs"]) * 100
    print(f"{sid}: {stats['placed']}/{stats['balloons']} balloons located · {stats['words']} word hotspots · "
          f"OCR glyph agreement {acc:.1f}%")


def main():
    ids = sys.argv[1:] or [p.stem for p in sorted(TR_DIR.glob("doraemon_manga_*.json"))]
    misses = {}
    for sid in ids:
        build_story(sid, misses)
    if misses:
        print(f"\n{len(misses)} words without a Vietnamese meaning (add them to transcripts/glossary_vi.json):")
        for w, ctx in sorted(misses.items()):
            print(f"   {w}\t{ctx}")


if __name__ == "__main__":
    main()
