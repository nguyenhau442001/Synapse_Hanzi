#!/usr/bin/env python3
"""
build_reading_analysis_data.py

Extracts, structures, and compiles authentic HSK 4 Reading & Analysis dataset
from standard Hanban/CTI mock tests ("Tiengtrungthuonghai.vn_Mô phỏng đề thi HSK4 mới.pdf").

Generates:
  database/reading/hsk4_reading_analysis.json
"""

import json
import os
import re
import glob
import importlib.util
from pypinyin import pinyin, Style, lazy_pinyin

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT_DIR = os.path.join(BASE_DIR, "database", "reading")
OUT_FILE = os.path.join(OUT_DIR, "hsk4_reading_analysis.json")
HANVIET_FILE = os.path.join(BASE_DIR, "assets", "js", "hanviet-dict.js")
TESTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tests")

# Load HSK 1-4 Vocabularies
HSK_VOCAB = {}
for lvl in ["hsk1", "hsk2", "hsk3", "hsk4"]:
    vpath = os.path.join(BASE_DIR, "database", "vocabs", f"{lvl}_vocabularies.json")
    if os.path.exists(vpath):
        with open(vpath, "r", encoding="utf-8") as f:
            for item in json.load(f):
                w = item.get("hanzi", "").strip()
                if w:
                    HSK_VOCAB[w] = {
                        "level": lvl,
                        "meaning": item.get("meaning", ""),
                        "pinyin": item.get("pinyin", ""),
                        "hanviet": item.get("hanviet", "")
                    }

# Load Han-Viet dictionary
HANVIET_COMPOUNDS = {}
HANVIET_CHARS = {}
if os.path.exists(HANVIET_FILE):
    with open(HANVIET_FILE, "r", encoding="utf-8") as f:
        content = f.read()
    c_match = re.search(r"const HANVIET_COMPOUNDS = (\{.*?\});", content, re.DOTALL)
    ch_match = re.search(r"const HANVIET_CHARS = (\{.*?\});", content, re.DOTALL)
    if c_match:
        HANVIET_COMPOUNDS = json.loads(c_match.group(1))
    if ch_match:
        HANVIET_CHARS = json.loads(ch_match.group(1))

def get_hanviet(text):
    if not text:
        return ""
    if text in HANVIET_COMPOUNDS:
        return HANVIET_COMPOUNDS[text]
    parts = []
    for ch in text:
        if '\u4e00' <= ch <= '\u9fff':
            parts.append(HANVIET_CHARS.get(ch, ch))
        else:
            parts.append(ch)
    return " ".join(parts).replace("  ", " ").strip()

def get_pinyin_str(text):
    if not text:
        return ""
    py_list = pinyin(text, style=Style.TONE)
    res = []
    for p in py_list:
        res.append(p[0])
    return " ".join(res).strip()

def is_cjk(ch):
    return '一' <= ch <= '鿿'

def sentence_syllables(line, zh_text):
    """Split an authored sentence-level pinyin line into one syllable per CJK char.

    Returns None when the syllable count does not match the CJK char count, so callers can
    fall back to per-token generation instead of misaligning.
    """
    if not line:
        return None
    syllables = [part for part in line.split() if any(c.isalpha() for c in part)]
    cjk_count = sum(1 for ch in zh_text if is_cjk(ch))
    return syllables if len(syllables) == cjk_count else None

def align_token_pinyin_to_sentence(entry):
    """Fill token pinyin from the authored sentence pinyin by char position.

    The sentence pinyin is hand-written from the source exam and carries neutral tones
    ('péng you', 'míng zi') that per-char pypinyin lookups lose. Han-Viet is not aligned:
    the sentence-level Han-Viet lines are less reliable than the curated dictionary.
    Tokens must cover the sentence in order; any gap disables alignment for that entry.
    """
    zh_text = entry["zh"]
    py_syllables = sentence_syllables(entry.get("pinyin"), zh_text)
    if not py_syllables:
        return
    cursor = 0
    cjk_index = 0
    spans = []
    for token in entry.get("tokens", []):
        t_text = token["text"]
        start = zh_text.find(t_text, cursor)
        if start < 0:
            return
        cjk_index += sum(1 for ch in zh_text[cursor:start] if is_cjk(ch))
        width = sum(1 for ch in t_text if is_cjk(ch))
        spans.append((token, cjk_index, width))
        cjk_index += width
        cursor = start + len(t_text)
    for token, start, width in spans:
        if width == 0:
            continue
        if not token.get("pinyin"):
            token["pinyin"] = " ".join(py_syllables[start:start + width])

def enrich_entry(entry):
    # Full pinyin and hanviet
    zh_text = entry["zh"]
    if "pinyin" not in entry or not entry["pinyin"]:
        entry["pinyin"] = get_pinyin_str(zh_text)
    if "hanviet" not in entry or not entry["hanviet"]:
        entry["hanviet"] = get_hanviet(zh_text)

    align_token_pinyin_to_sentence(entry)

    # Enrich tokens
    for token in entry.get("tokens", []):
        t_text = token["text"]
        if "pinyin" not in token or not token["pinyin"]:
            token["pinyin"] = get_pinyin_str(t_text)
        if "hanviet" not in token or not token["hanviet"]:
            token["hanviet"] = get_hanviet(t_text)
            
        # Match HSK vocab
        if t_text in HSK_VOCAB:
            v_info = HSK_VOCAB[t_text]
            if not token.get("meaning"):
                token["meaning"] = v_info["meaning"]
            if token.get("type") not in ["grammar", "advanced"]:
                token["type"] = "core" if v_info["level"] == "hsk4" else "normal"
                
    return entry

def load_all_test_entries():
    entries = []
    test_files = sorted(glob.glob(os.path.join(TESTS_DIR, "test*.py")))
    for tf in test_files:
        mod_name = os.path.splitext(os.path.basename(tf))[0]
        spec = importlib.util.spec_from_file_location(mod_name, tf)
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        for attr in dir(mod):
            if attr.startswith("TEST") and attr.endswith("_ENTRIES"):
                entries.extend(getattr(mod, attr))
    return entries

def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    
    raw_entries = load_all_test_entries()
    enriched = [enrich_entry(e) for e in raw_entries]
    
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(enriched, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully generated {len(enriched)} reading analysis items in {OUT_FILE}")

if __name__ == "__main__":
    main()
