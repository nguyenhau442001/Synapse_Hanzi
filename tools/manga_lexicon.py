#!/usr/bin/env python3
"""
tools/manga_lexicon.py — shared word lookup for the comic reader data builders.

Segments a Chinese sentence into words (jieba + the HSK 3.0 lexicon as a user
dictionary) and attaches pinyin, Hán-Việt, Vietnamese meaning and HSK level to
every word. Context meanings / overrides live in
    database/readings/manga/glossary_vi.json

Setup (one-off, isolated venv):
    python3 -m venv .venv-manga
    .venv-manga/bin/pip install jieba opencc-python-reimplemented pypinyin Pillow
"""

import json
import logging
import re
from pathlib import Path

import jieba
from opencc import OpenCC
from pypinyin import Style, lazy_pinyin

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
HANVIET_JS = REPO_ROOT / "assets" / "js" / "hanviet-dict.js"
GLOSSARY_FILE = REPO_ROOT / "database" / "readings" / "manga" / "glossary_vi.json"

jieba.setLogLevel(logging.WARNING)
S2T = OpenCC("s2t")
CJK_RE = re.compile(r"[㐀-鿿豈-﫿]")

# HSK 3.0 marks homonyms with superscripts (会¹ / 会²); the first, lowest level wins.
HOMONYM_MARK_RE = re.compile(r"[⁰¹²³⁴⁵⁶⁷⁸⁹]+$")


def load_lexicon():
    lex = {}
    # HSK 3.0 (levels 1-9) — level 7 file holds the shared 7-9 band
    for lvl in range(1, 8):
        f = VOCAB_DIR / "hsk3_0" / f"level{lvl}_vocabularies.json"
        if not f.exists():
            continue
        for e in json.loads(f.read_text(encoding="utf-8")):
            hz = HOMONYM_MARK_RE.sub("", e.get("hanzi") or "")
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
GLOSSARY = json.loads(GLOSSARY_FILE.read_text(encoding="utf-8")) if GLOSSARY_FILE.exists() else {}
for _w in list(LEX) + list(GLOSSARY):
    if len(_w) > 1:
        jieba.add_word(_w, freq=50000)


def add_names(names):
    """Register proper names so jieba keeps them whole."""
    for n in names:
        jieba.add_word(n, freq=80000)


def hanviet_of(word):
    if word in HV_COMPOUNDS:
        return HV_COMPOUNDS[word]
    parts = []
    for c in word:
        v = HV_CHARS.get(c) or HV_CHARS.get(S2T.convert(c))
        if isinstance(v, list):
            v = v[0] if v else ""
        if isinstance(v, dict):
            v = v.get("hv") or v.get("hanviet") or ""
        parts.append((v or "").split(",")[0].strip().title())
    return " ".join(p for p in parts if p)


def lookup(word):
    """Simplified word → (pinyin, hanviet, meaning_vi, hsk, known)."""
    g = GLOSSARY.get(word)
    base = LEX.get(word, {})
    py = (g or {}).get("pinyin") or base.get("pinyin") or " ".join(lazy_pinyin(word, style=Style.TONE))
    hv = (g or {}).get("hanviet") or base.get("hanviet") or hanviet_of(word)
    mean = (g or {}).get("meaning_vi") or base.get("meaning_vi") or ""
    return py, hv, mean, base.get("hsk"), bool(mean)


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


def segment(zh, seg_override=None):
    if seg_override:
        parts = seg_override.split("|")
        if "".join(parts) == zh:
            return parts
        print(f"   ! seg override mismatch for {zh!r}: {seg_override!r}")
    out = []
    for w in jieba.cut(zh, HMM=False):
        out.extend(split_unknown(w))
    return out


def to_traditional(zh_s):
    """Simplified → Traditional, keeping a 1:1 glyph mapping with the source."""
    t = S2T.convert(zh_s)
    if len(t) != len(zh_s):
        t = "".join(S2T.convert(c) for c in zh_s)
    return t


def sentence_pinyin(zh):
    return " ".join(lazy_pinyin(zh, style=Style.TONE))
