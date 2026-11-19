#!/usr/bin/env python3
"""
tools/wanwu_builder_common.py
Shared utilities for building and validating Graded Reading stories from 《万物有意思》:
- Guaranteed 100% tone-marked Pinyin coverage on all Chinese character tokens
- Sino-Vietnamese (Hán-Việt) on every Chinese token
- Vocabulary database linkage (HSK 2.0 and 3.0)
- Manifest generation and synchronization
"""

import json
import re
from pathlib import Path
import pypinyin
import jieba

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
READINGS_DIR = REPO_ROOT / "database" / "readings"
MANIFEST_PATH = READINGS_DIR / "manifest.json"

# 1. Load vocabulary databases
VOCAB_BY_ID = {}
ID_BY_HANZI = {}

for lvl in range(1, 10):
    p = VOCAB_DIR / "hsk3_0" / f"level{lvl}_vocabularies.json"
    if p.exists():
        with open(p, encoding="utf-8") as f:
            for item in json.load(f):
                wid = f"hsk{lvl}_{item['id']}"
                VOCAB_BY_ID[wid] = item
                ID_BY_HANZI.setdefault(item.get("hanzi") or item.get("simplified"), wid)

for lvl in range(1, 7):
    p = VOCAB_DIR / f"hsk{lvl}_vocabularies.json"
    if p.exists():
        with open(p, encoding="utf-8") as f:
            for item in json.load(f):
                wid = f"hsk{lvl}_{item['id']}"
                VOCAB_BY_ID.setdefault(wid, item)
                ID_BY_HANZI.setdefault(item.get("hanzi") or item.get("simplified"), wid)

# 2. Han-Viet lookups
with open(REPO_ROOT / "assets" / "js" / "hanviet-dict.js", encoding="utf-8") as f:
    hv_content = f.read()

comp_m = re.search(r"const HANVIET_COMPOUNDS = ({.*?});", hv_content)
chars_m = re.search(r"const HANVIET_CHARS = ({.*?});", hv_content)
hv_comp = json.loads(comp_m.group(1)) if comp_m else {}
hv_chars = json.loads(chars_m.group(1)) if chars_m else {}


def get_hanviet(text: str) -> str:
    if text in hv_comp:
        return hv_comp[text]
    parts = [hv_chars.get(c, c) for c in text if "\u4e00" <= c <= "\u9fff"]
    return " ".join(parts).title() if parts else text


def get_pinyin(text: str) -> str:
    return " ".join(pypinyin.lazy_pinyin(text, style=pypinyin.Style.TONE))


def make_tokens_for_sentence(zh_sentence: str) -> list:
    raw_tokens = list(jieba.cut(zh_sentence))
    tokens = []
    for word in raw_tokens:
        word = word.strip()
        if not word:
            continue
        if not any("\u4e00" <= c <= "\u9fff" for c in word):
            tokens.append({"text": word})
            continue

        token = {
            "text": word,
            "pinyin": get_pinyin(word),
            "hanviet": get_hanviet(word),
        }
        wid = ID_BY_HANZI.get(word)
        if wid and wid in VOCAB_BY_ID:
            v = VOCAB_BY_ID[wid]
            lvl = int(wid.split("_")[0].replace("hsk", ""))
            token["hsk"] = lvl
            token["word_id"] = wid
            token["meaning_vi"] = v.get("meaning", v.get("vietnamese", ""))
            if v.get("pinyin"):
                token["pinyin"] = v["pinyin"]
            if v.get("hanviet"):
                token["hanviet"] = v["hanviet"]
        tokens.append(token)
    return tokens


def resolve_spotlight(sentences, preferred_words):
    spotlight = []
    for w in preferred_words:
        wid = ID_BY_HANZI.get(w)
        if wid and wid in VOCAB_BY_ID and wid not in spotlight:
            spotlight.append(wid)
    for s in sentences:
        for t in s["tokens"]:
            wid = t.get("word_id")
            if wid and wid in VOCAB_BY_ID and wid not in spotlight:
                spotlight.append(wid)
            if len(spotlight) >= 4:
                break
        if len(spotlight) >= 4:
            break
    return spotlight[:5]


def build_and_save_story(sdata: dict) -> dict:
    sid = sdata["id"]
    sp = sdata["book_page_start"]
    ep = sdata["book_page_end"]
    img_rel = f"assets/images/readings/wanwu/{sid}.webp"

    sentences = []
    for sidx, (zh, py, vi) in enumerate(sdata["sentences_data"]):
        tokens = make_tokens_for_sentence(zh)
        sentences.append({
            "id": f"s{sidx+1}",
            "zh": zh,
            "pinyin": py,
            "vi": vi,
            "audio_start_ms": None,
            "audio_end_ms": None,
            "tokens": tokens
        })

    # Validate 100% pinyin on all Chinese tokens
    naked = []
    for s in sentences:
        for t in s["tokens"]:
            if any("\u4e00" <= c <= "\u9fff" for c in t["text"]) and not t.get("pinyin"):
                naked.append(t["text"])
    if naked:
        raise ValueError(f"Story {sid} has naked Chinese tokens without Pinyin: {naked}")

    spotlight = resolve_spotlight(sentences, sdata.get("preferred_spotlight", []))

    full_story = {
        "id": sid,
        "chapter_no": sdata["chapter_no"],
        "level": sdata.get("level", "HSK4"),
        "series": "wanwu",
        "book_volume": sdata["book_volume"],
        "book_page_start": sp,
        "book_page_end": ep,
        "page_display": sdata["page_display"],
        "title": sdata["title"],
        "topic": sdata.get("topic", "culture_history"),
        "topic_vi": sdata.get("topic_vi", "📚 Vạn vật thú vị"),
        "icon": sdata.get("icon", "📖"),
        "cover_image": img_rel,
        "illustration": img_rel,
        "estimatedMinutes": sdata.get("estimatedMinutes", 5),
        "description_vi": sdata["description_vi"],
        "sentences": sentences,
        "vocabulary_spotlight": spotlight,
        "quiz": sdata["quiz"]
    }

    out_file = READINGS_DIR / "hsk4" / f"{sid}.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(full_story, f, ensure_ascii=False, indent=2)

    return {
        "id": sid,
        "level": full_story["level"],
        "series": "wanwu",
        "series_title": "万物有意思",
        "series_title_vi": "Vạn vật thú vị",
        "book_page_start": sp,
        "book_page_end": ep,
        "page_display": full_story["page_display"],
        "title": full_story["title"],
        "topic": full_story["topic"],
        "topic_vi": full_story["topic_vi"],
        "icon": full_story["icon"],
        "cover_image": img_rel,
        "illustration": img_rel,
        "estimatedMinutes": full_story["estimatedMinutes"],
        "description_vi": full_story["description_vi"],
        "sentence_count": len(sentences),
        "sentences_count": len(sentences),
        "spotlight_count": len(spotlight),
        "words_count": sum(len(s["tokens"]) for s in sentences),
        "file": f"database/readings/hsk4/{sid}.json",
        "path": f"database/readings/hsk4/{sid}.json"
    }


def update_manifest_all():
    with open(MANIFEST_PATH, encoding="utf-8") as f:
        manifest = json.load(f)

    # Read all wanwu_story_*.json files in database/readings/hsk4/
    wanwu_entries = []
    wanwu_files = sorted((READINGS_DIR / "hsk4").glob("wanwu_story_*.json"))
    for p in wanwu_files:
        with open(p, encoding="utf-8") as f:
            d = json.load(f)
        wanwu_entries.append({
            "id": d["id"],
            "level": d.get("level", "HSK4"),
            "series": "wanwu",
            "series_title": "万物有意思",
            "series_title_vi": "Vạn vật thú vị",
            "book_page_start": d.get("book_page_start", 0),
            "book_page_end": d.get("book_page_end", 0),
            "page_display": d.get("page_display", ""),
            "title": d["title"],
            "topic": d.get("topic", "culture_history"),
            "topic_vi": d.get("topic_vi", "📚 Vạn vật thú vị"),
            "icon": d.get("icon", "📖"),
            "cover_image": d.get("cover_image", ""),
            "illustration": d.get("illustration", ""),
            "estimatedMinutes": d.get("estimatedMinutes", 5),
            "description_vi": d.get("description_vi", ""),
            "sentence_count": len(d.get("sentences", [])),
            "sentences_count": len(d.get("sentences", [])),
            "spotlight_count": len(d.get("vocabulary_spotlight", [])),
            "words_count": sum(len(s.get("tokens", [])) for s in d.get("sentences", [])),
            "file": f"database/readings/hsk4/{d['id']}.json",
            "path": f"database/readings/hsk4/{d['id']}.json"
        })

    wanwu_entries.sort(key=lambda x: x.get("book_page_start", 0))

    non_wanwu = [m for m in manifest if m.get("series") != "wanwu"]
    final_manifest = wanwu_entries + non_wanwu

    with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
        json.dump(final_manifest, f, ensure_ascii=False, indent=2)

    print(f"[✓] Manifest updated: {len(wanwu_entries)} Wanwu stories + {len(non_wanwu)} other stories = {len(final_manifest)} total.")
