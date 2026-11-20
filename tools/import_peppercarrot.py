#!/usr/bin/env python3
"""
tools/import_peppercarrot.py — import Pepper&Carrot episodes into the comic reader.

Pepper&Carrot by David Revoy is licensed CC BY 4.0 (https://www.peppercarrot.com).
The Simplified Chinese ("cn") translation ships as Inkscape SVG sources, so the
exact balloon text and its position come straight from the source file — no OCR.

For every episode this tool:
  1. downloads the rendered cn page JPGs (low-res, 1200 px) and stores them as webp
     under assets/images/readings/manga/peppercarrot/epNN/
  2. downloads the cn + vi SVG sources (cached in tools/.peppercarrot_cache/)
  3. extracts every text block and lays out its glyph boxes from the SVG geometry
  4. segments each balloon into words with pinyin, Hán-Việt, Vietnamese meaning
     and HSK level (tools/manga_lexicon.py); the Vietnamese balloon translation
     comes from the official vi SVG (matched by element id)
  5. writes database/readings/manga/peppercarrot/pc_epNN.json and the manifest

Usage:
    .venv-manga/bin/python tools/import_peppercarrot.py            # all episodes
    .venv-manga/bin/python tools/import_peppercarrot.py 1 2 3      # some episodes
    .venv-manga/bin/python tools/import_peppercarrot.py --debug 1  # overlay PNGs in the cache dir
"""

import io
import json
import math
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import manga_lexicon as lx  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = REPO_ROOT / "database" / "readings" / "manga" / "peppercarrot"
IMG_ROOT = REPO_ROOT / "assets" / "images" / "readings" / "manga" / "peppercarrot"
CACHE = REPO_ROOT / "tools" / ".peppercarrot_cache"
BASE_URL = "https://www.peppercarrot.com/0_sources"
MAX_WIDTH = 1100

SVG = "{http://www.w3.org/2000/svg}"
SODI = "{http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd}"
INK = "{http://www.inkscape.org/namespaces/inkscape}"

SERIES = {
    "series": "peppercarrot",
    "series_title": "胡椒和胡萝卜",
    "series_title_vi": "Pepper&Carrot",
    "collection": "peppercarrot",
}
CREDITS = ("Pepper&Carrot © David Revoy, giấy phép CC BY 4.0 (www.peppercarrot.com). "
           "Bản dịch tiếng Trung: {cn}. Bản dịch tiếng Việt: {vi}.")
PROPER_NAMES = ["小辣椒", "胡萝卜", "卡芙卡", "蒂姆", "百里香", "肉桂", "孜然", "芫荽", "藏红花", "七味", "辣椒",
                "胡椒", "混沌", "混沌魔法", "魔法学院"]


# ----------------------------------------------------------------------------- download
def fetch(url, dest):
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    dest.parent.mkdir(parents=True, exist_ok=True)
    r = subprocess.run(["curl", "-sfL", "-m", "120", "-o", str(dest), url])
    if r.returncode != 0:
        dest.unlink(missing_ok=True)
        return None
    return dest


def episodes_index():
    f = fetch(f"{BASE_URL}/episodes.json", CACHE / "episodes.json")
    return json.loads(f.read_text(encoding="utf-8"))


def translators(ep_name, lang):
    f = fetch(f"{BASE_URL}/{ep_name}/lang/{lang}/info.json", CACHE / ep_name / f"{lang}_info.json")
    if not f:
        return []
    try:
        return [re.sub(r"\s*<[^>]*>", "", t).strip() for t in json.loads(f.read_text("utf-8"))["credits"]["translation"]]
    except (KeyError, ValueError):
        return []


# ----------------------------------------------------------------------------- geometry
def parse_transform(s):
    """SVG transform attribute → affine (a, b, c, d, e, f)."""
    m = (1, 0, 0, 1, 0, 0)
    for name, args in re.findall(r"(\w+)\s*\(([^)]*)\)", s or ""):
        v = [float(x) for x in re.split(r"[\s,]+", args.strip()) if x]
        if name == "matrix":
            t = tuple(v)
        elif name == "translate":
            t = (1, 0, 0, 1, v[0], v[1] if len(v) > 1 else 0)
        elif name == "scale":
            t = (v[0], 0, 0, v[1] if len(v) > 1 else v[0], 0, 0)
        elif name == "rotate":
            a = math.radians(v[0])
            t = (math.cos(a), math.sin(a), -math.sin(a), math.cos(a), 0, 0)
            if len(v) == 3:
                t = mul(mul((1, 0, 0, 1, v[1], v[2]), t), (1, 0, 0, 1, -v[1], -v[2]))
        else:
            continue
        m = mul(m, t)
    return m


def mul(m, n):
    a, b, c, d, e, f = m
    A, B, C, D, E, F = n
    return (a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f)


def apply(m, x, y):
    a, b, c, d, e, f = m
    return a * x + c * y + e, b * x + d * y + f


def box_through(m, x, y, w, h):
    pts = [apply(m, px, py) for px, py in ((x, y), (x + w, y), (x, y + h), (x + w, y + h))]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return min(xs), min(ys), max(xs) - min(xs), max(ys) - min(ys)


def style_of(el):
    return dict(kv.split(":", 1) for kv in (el.get("style") or "").split(";") if ":" in kv)


def num(v, default=None):
    m = re.match(r"\s*(-?[\d.]+(?:e-?\d+)?)", v or "")
    return float(m.group(1)) if m else default


def glyph_em(ch):
    if lx.CJK_RE.match(ch) or ord(ch) > 0x2E80 or ch in "…—“”‘’":
        return 1.0
    if ch == " ":
        return 0.3
    return 0.55


# ----------------------------------------------------------------------------- text extraction
class Doc:
    def __init__(self, path):
        self.root = ET.parse(path).getroot()
        self.parent = {c: p for p in self.root.iter() for c in p}
        self.by_id = {e.get("id"): e for e in self.root.iter() if e.get("id")}
        self.W = num(self.root.get("width"), 2481)
        self.H = num(self.root.get("height"), 3503)

    def ctm(self, el):
        chain = []
        while el is not None:
            chain.append(el)
            el = self.parent.get(el)
        m = (1, 0, 0, 1, 0, 0)
        for e in reversed(chain):
            m = mul(m, parse_transform(e.get("transform")))
        return m

    def hidden(self, el):
        while el is not None:
            st = style_of(el)
            if st.get("display", "").strip() == "none" or st.get("visibility", "").strip() == "hidden":
                return True
            el = self.parent.get(el)
        return False

    def inherited(self, el, key, default=None):
        while el is not None:
            v = style_of(el).get(key)
            if v is not None:
                return v.strip()
            if key == "font-size" and el.get("font-size"):
                return el.get("font-size")
            el = self.parent.get(el)
        return default


def text_blocks(doc):
    """→ list of {id, lines:[{text, glyphs:[(ch, page box x,y,w,h)]}]} in page px."""
    blocks = []
    for el in doc.root.iter():
        tag = el.tag
        if tag not in (SVG + "text", SVG + "flowRoot") or doc.hidden(el):
            continue
        lines = flow_lines(doc, el) if tag == SVG + "flowRoot" else svg_text_lines(doc, el)
        lines = [ln for ln in lines if ln["text"].strip()]
        if lines:
            blocks.append({"id": el.get("id"), "lines": lines})
    return blocks


def layout_line(doc, m, text, x, baseline, fs, anchor):
    width = sum(glyph_em(c) for c in text) * fs
    x0 = x - width / 2 if anchor == "middle" else x - width if anchor == "end" else x
    glyphs, cx = [], x0
    for ch in text:
        w = glyph_em(ch) * fs
        glyphs.append((ch, box_through(m, cx, baseline - 0.86 * fs, w, fs)))
        cx += w
    return {"text": text, "glyphs": glyphs}


def anchor_of(doc, el):
    a = doc.inherited(el, "text-anchor")
    if a:
        return a
    align = doc.inherited(el, "text-align", "start")
    return {"center": "middle", "end": "end", "right": "end"}.get(align, "start")


def svg_text_lines(doc, tx):
    m = doc.ctm(tx)
    lines = []
    x = num(tx.get("x"), 0)
    y = num(tx.get("y"), 0)
    tspans = [t for t in tx if t.tag == SVG + "tspan"]
    if not tspans:
        fs = num(doc.inherited(tx, "font-size"), 40)
        return [layout_line(doc, m, "".join(tx.itertext()).strip(), x, y, fs, anchor_of(doc, tx))]
    for ts in tspans:
        text = "".join(ts.itertext())
        fs = num(doc.inherited(ts, "font-size"), 40)
        if ts.get("x") is not None:
            x = num(ts.get("x").split()[0], x)
        if ts.get("y") is not None:
            y = num(ts.get("y").split()[0], y)
        elif lines:
            lh = doc.inherited(ts, "line-height", "1.25")
            y += fs * (num(lh, 125) / 100 if lh.endswith("%") else num(lh, 1.25))
        lines.append(layout_line(doc, m, text.strip(), x, y, fs, anchor_of(doc, ts)))
    return lines


def flow_lines(doc, fr):
    """Inkscape 0.9x flowRoot: paragraphs wrapped inside a flowRegion rect."""
    m = doc.ctm(fr)
    region = fr.find(SVG + "flowRegion")
    rect = region.find(SVG + "rect") if region is not None else None
    if rect is None:
        use = region.find(SVG + "use") if region is not None else None
        ref = use.get("{http://www.w3.org/1999/xlink}href", "")[1:] if use is not None else ""
        rect = doc.by_id.get(ref)
    if rect is None:
        return []
    rm = mul(m, parse_transform(rect.get("transform")))
    rx, ry = num(rect.get("x"), 0), num(rect.get("y"), 0)
    rw = num(rect.get("width"), 0)
    lh_s = doc.inherited(fr, "line-height", "125%")
    lines, y = [], ry
    for para in fr.iter(SVG + "flowPara"):
        text = "".join(para.itertext())
        fs = num(doc.inherited(para, "font-size"), 40)
        lh = fs * (num(lh_s, 125) / 100 if lh_s.endswith("%") else num(lh_s, 1.25))
        lh = max(lh, fs)  # 0% / tiny line-heights render at roughly 1em in Inkscape
        anchor = anchor_of(doc, para)
        cx = rx + rw / 2 if anchor == "middle" else rx + rw if anchor == "end" else rx
        for part in wrap(text.strip(), rw, fs) or [""]:
            y += lh
            if part:
                lines.append(layout_line(doc, rm, part, cx, y - (lh - fs) - 0.14 * fs, fs, anchor))
    return lines


def wrap(text, width, fs):
    out, cur, cw = [], "", 0
    for ch in text:
        w = glyph_em(ch) * fs
        if cur and cw + w > width and ch not in "，。！？、…）」":
            out.append(cur); cur, cw = "", 0
        cur += ch; cw += w
    if cur:
        out.append(cur)
    return out


# ----------------------------------------------------------------------------- balloon building
LATIN_RE = re.compile(r"[A-Za-z]{2,}")


def clean_block(block):
    """Drop lines without Chinese (untranslated leftovers, URLs, patron names)."""
    lines = [ln for ln in block["lines"] if lx.CJK_RE.search(ln["text"])]
    return {**block, "lines": lines} if lines else None


def reading_order(blocks, H):
    def key(b):
        g = b["lines"][0]["glyphs"]
        top = min(bx[1] for _, bx in g)
        left = min(bx[0] for _, bx in g)
        return (round(top / (H * 0.035)), left)
    return sorted(blocks, key=key)


def pct(v, total):
    return round(v / total * 100, 3)


def rects_for(boxes, W, H):
    by_line = {}
    for (x, y, w, h), li in boxes:
        by_line.setdefault(li, []).append((x, y, w, h))
    rects = []
    for li in sorted(by_line):
        bs = by_line[li]
        x0 = min(b[0] for b in bs); y0 = min(b[1] for b in bs)
        x1 = max(b[0] + b[2] for b in bs); y1 = max(b[1] + b[3] for b in bs)
        pad = 2
        rects.append({"x": pct(x0 - pad, W), "y": pct(y0 - pad, H),
                      "width": pct(x1 - x0 + 2 * pad, W), "height": pct(y1 - y0 + 2 * pad, H)})
    return rects


def union(rects):
    x0 = min(r["x"] for r in rects); y0 = min(r["y"] for r in rects)
    x1 = max(r["x"] + r["width"] for r in rects); y1 = max(r["y"] + r["height"] for r in rects)
    return {"x": round(x0, 3), "y": round(y0, 3), "width": round(x1 - x0, 3), "height": round(y1 - y0, 3)}


def normalise_text(s):
    s = re.sub(r"\s+", "", s)
    return s.replace("...", "…").replace("..", "…")


def build_page(pn, image, cn_doc, vi_doc, sid, misses, src_size=None):
    """src_size: size of the rendered JPG. The official renders drop a ~70 px
    (SVG units) strip at the top of the page, so the visible height is shorter
    than the SVG canvas and every y coordinate is shifted by the cropped strip."""
    vi_text = {}
    if vi_doc is not None:
        for b in text_blocks(vi_doc):
            vi_text[b["id"]] = " ".join(ln["text"].strip() for ln in b["lines"])
    W, H = cn_doc.W, cn_doc.H
    sw, sh = src_size or image.size
    visible_h = sh * W / sw
    crop_top = max(0.0, H - visible_h)
    H = visible_h
    blocks = [b for b in (clean_block(b) for b in text_blocks(cn_doc)) if b]
    for b in blocks:
        for ln in b["lines"]:
            ln["glyphs"] = [(ch, (x, y - crop_top, w, h)) for ch, (x, y, w, h) in ln["glyphs"]]
    dialogues, hotspots = [], []
    for bi, block in enumerate(reading_order(blocks, H)):
        did = f"p{pn}_d{bi + 1}"
        # one string for the balloon + a page box for each of its characters
        chars, boxes = [], []
        for li, ln in enumerate(block["lines"]):
            for ch, bx in ln["glyphs"]:
                if ch.isspace():
                    continue
                chars.append(ch); boxes.append((bx, li))
        raw = "".join(chars)
        zh = normalise_text(raw)
        if zh != raw:  # keep glyph boxes aligned with the normalised text
            boxes = [boxes[min(i, len(boxes) - 1)] for i in range(len(zh))]
        zh_t = lx.to_traditional(zh)
        vi = vi_text.get(block["id"], "")
        dialogue = {"id": did, "character": "", "bbox": union(rects_for(boxes, W, H)), "zh": zh, "zh_trad": zh_t,
                    "pinyin": lx.sentence_pinyin(zh), "vi": vi, "tokens": []}
        pos = 0
        for wi, word in enumerate(lx.segment(zh)):
            start, pos = pos, pos + len(word)
            word_t = zh_t[start:pos]
            if not lx.CJK_RE.search(word):
                prev = dialogue["tokens"][-1] if dialogue["tokens"] else None
                if prev and prev.get("punct"):
                    prev["text"] += word; prev["text_trad"] += word_t
                else:
                    dialogue["tokens"].append({"text": word, "text_trad": word_t, "punct": True})
                continue
            py, hv, mean, hsk, known = lx.lookup(word)
            if not known:
                misses.setdefault(word, f"{sid} p{pn}: {zh}")
            tok = {"text": word, "text_trad": word_t, "pinyin": py, "hanviet": hv, "meaning_vi": mean, "hsk": hsk}
            dialogue["tokens"].append(tok)
            wboxes = [boxes[k] for k in range(start, pos) if lx.CJK_RE.match(zh[k])]
            if not wboxes:
                continue
            rects = rects_for(wboxes, W, H)
            hotspots.append({"id": f"{did}_w{wi}", **tok, "bbox": union(rects), "rects": rects,
                             "sentence_zh": zh_t, "sentence_zh_simplified": zh, "sentence_vi": vi,
                             "character": "", "dialogue_id": did})
        dialogues.append(dialogue)
    iw, ih = image.size
    return {"page_num": pn, "dialogues": dialogues, "word_hotspots": hotspots,
            "ocr": {"engine": "svg-source", "image_px": [iw, ih]}}


def debug_overlay(img, page, dest):
    im = img.convert("RGB")
    d = ImageDraw.Draw(im)
    W, H = im.size
    for hs in page["word_hotspots"]:
        for r in hs["rects"]:
            x, y = r["x"] * W / 100, r["y"] * H / 100
            d.rectangle([x, y, x + r["width"] * W / 100, y + r["height"] * H / 100], outline=(220, 30, 30), width=2)
    im.save(dest)


# ----------------------------------------------------------------------------- story
def hsk_label(pages, target=0.8):
    """Lowest HSK level whose vocabulary covers `target` of the word tokens
    (proper names and punctuation excluded; words outside HSK never count as covered)."""
    levels = []
    for p in pages:
        for d in p["dialogues"]:
            for t in d["tokens"]:
                if t.get("punct") or t["text"] in PROPER_NAMES:
                    continue
                levels.append(int(str(t.get("hsk") or "0").split("-")[0] or 0) or None)
    if not levels:
        return "Không lời thoại"
    for lvl in range(1, 8):
        if sum(1 for v in levels if v and v <= lvl) / len(levels) >= target:
            return f"HSK {lvl}" if lvl < 7 else "HSK 7 - 9"
    return "HSK 7 - 9"


def import_episode(ep, debug=False, misses=None):
    misses = {} if misses is None else misses
    name, total = ep["name"], ep["total_pages"]
    n = int(name[2:4])
    sid = f"pc_ep{n:02d}"
    has_vi = "vi" in ep["translated_languages"]
    img_dir = IMG_ROOT / f"ep{n:02d}"
    img_dir.mkdir(parents=True, exist_ok=True)
    pages, title = [], None
    for p in range(0, total + 1):
        tag = f"E{n:02d}P{p:02d}"
        jpg = fetch(f"{BASE_URL}/{name}/low-res/cn_Pepper-and-Carrot_by-David-Revoy_{tag}.jpg", CACHE / name / f"cn_{tag}.jpg")
        cn = fetch(f"{BASE_URL}/{name}/lang/cn/{tag}.svg", CACHE / name / f"cn_{tag}.svg")
        if not jpg or not cn:
            print(f"   ! {tag}: missing cn page, skipped")
            continue
        vi = fetch(f"{BASE_URL}/{name}/lang/vi/{tag}.svg", CACHE / name / f"vi_{tag}.svg") if has_vi else None
        img = Image.open(io.BytesIO(jpg.read_bytes()))
        src_size = img.size
        if img.width > MAX_WIDTH:
            img = img.resize((MAX_WIDTH, round(img.height * MAX_WIDTH / img.width)), Image.LANCZOS)
        out_img = img_dir / f"page_{p:02d}.webp"
        img.convert("RGB").save(out_img, "WEBP", quality=78, method=6)
        page = build_page(len(pages) + 1, img, Doc(cn), Doc(vi) if vi else None, sid, misses, src_size)
        page["image"] = out_img.relative_to(REPO_ROOT).as_posix()
        if p == 0:
            title = page["dialogues"]
        if debug:
            debug_overlay(img, page, CACHE / name / f"debug_{tag}.png")
        pages.append({"page_num": page["page_num"], "image": page["image"], "dialogues": page["dialogues"],
                      "word_hotspots": page["word_hotspots"], "ocr": page["ocr"]})
    # Title page (P00): the longest balloon that is not the series name is the episode title.
    title_d = max((d for d in (title or []) if "胡椒" not in d["zh"] or len(d["zh"]) > 8),
                  key=lambda d: len(d["zh"]), default=None)
    title_zh = title_d["zh"] if title_d else ep["name"].split("_", 1)[1].replace("-", " ")
    title_vi = (title_d or {}).get("vi") or ep["name"].split("_", 1)[1].replace("-", " ")
    words = sum(1 for pg in pages for d in pg["dialogues"] for t in d["tokens"] if not t.get("punct"))
    credits = CREDITS.format(cn=", ".join(translators(name, "cn")) or "cộng đồng Pepper&Carrot",
                             vi=", ".join(translators(name, "vi")) or "chưa có")
    story = {
        "id": sid, **SERIES, "volume": n, "chapter_in_volume": None, "chapter_no": n,
        "title": {"zh": title_zh, "zh_trad": lx.to_traditional(title_zh), "vi": title_vi,
                  "pinyin": lx.sentence_pinyin(title_zh)},
        "description_vi": f"Tập {n} của Pepper&Carrot — cô phù thủy nhỏ Pepper và chú mèo Carrot. {title_vi}",
        "cover_image": pages[0]["image"] if pages else "",
        "source": f"Pepper&Carrot · Episode {n} · David Revoy · CC BY 4.0",
        "source_url": f"https://www.peppercarrot.com/cn/webcomic/{name}.html",
        "source_credits": credits,
        "license": "CC BY 4.0",
        "page_count": len(pages),
        "difficulty": hsk_label(pages),
        "estimatedMinutes": max(3, round(words / 25) + len(pages) // 2),
        "pages": pages,
    }
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    (OUT_DIR / f"{sid}.json").write_text(json.dumps(story, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    n_d = sum(len(p["dialogues"]) for p in pages)
    n_h = sum(len(p["word_hotspots"]) for p in pages)
    print(f"{sid}: {len(pages)} pages · {n_d} balloons · {n_h} word hotspots · {story['difficulty']} · {title_zh}")
    return story


def write_manifest():
    entries = []
    for f in sorted(OUT_DIR.glob("pc_ep*.json")):
        s = json.loads(f.read_text(encoding="utf-8"))
        entries.append({k: v for k, v in s.items() if k != "pages"} | {
            "file": f.relative_to(REPO_ROOT).as_posix(), "proper_names": PROPER_NAMES})
    entries.sort(key=lambda e: e["volume"])
    (OUT_DIR / "manifest.json").write_text(json.dumps(entries, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"manifest: {len(entries)} episodes")


def main():
    args = sys.argv[1:]
    debug = "--debug" in args
    wanted = {int(a) for a in args if a.isdigit()}
    lx.add_names(PROPER_NAMES)
    misses = {}
    for ep in episodes_index():
        n = int(ep["name"][2:4])
        if wanted and n not in wanted:
            continue
        if "cn" not in ep["translated_languages"]:
            continue
        import_episode(ep, debug=debug, misses=misses)
    write_manifest()
    if misses:
        print(f"\n{len(misses)} words without a Vietnamese meaning (add them to database/readings/manga/glossary_vi.json)")


if __name__ == "__main__":
    main()
