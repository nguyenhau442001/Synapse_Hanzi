#!/usr/bin/env python3
"""Build the HSK 3.0 curriculum (giao trinh) data used by src/islands/Curriculum.jsx.

Source lessons live in tools/curriculum_src/level<N>.json and only carry Chinese
text plus Vietnamese translations. This script:
  * generates tone-marked pinyin for titles, grammar examples and dialogues
    (deck pinyin first, pypinyin + jieba as the fallback),
  * assigns every word of the matching HSK 3.0 vocabulary deck to exactly one
    lesson (words that appear in a lesson's text go to that lesson first, the
    rest fill each lesson up to an even quota in deck order),
  * writes database/curriculum/hsk30/level<N>.json (lesson content),
    database/curriculum/hsk30/decks/<key>.json (flashcard deck per lesson),
    database/curriculum/hsk30/index.json and src/islands/curriculumIndex.js.

Usage: python3 tools/build_curriculum.py [--check]
  --check  only verify that the generated files are up to date (exit 1 if stale).
"""

import argparse
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "tools" / "curriculum_src"
VOCAB_DIR = ROOT / "database" / "vocabs" / "hsk3_0"
OUT_DIR = ROOT / "database" / "curriculum" / "hsk30"
INDEX_JS = ROOT / "src" / "islands" / "curriculumIndex.js"

# Curriculum level id -> (vocabulary file, flashcard deck key that owns the audio manifest)
LEVEL_SOURCES = {
    "1": ("level1_vocabularies.json", "hsk30_1"),
    "2": ("level2_vocabularies.json", "hsk30_2"),
    "3": ("level3_vocabularies.json", "hsk30_3"),
    "4": ("level4_vocabularies.json", "hsk30_4"),
    "5": ("level5_vocabularies.json", "hsk30_5"),
    "6": ("level6_vocabularies.json", "hsk30_6"),
    "7": ("level7_vocabularies.json", "hsk30_7"),
}

CJK_RE = re.compile(r"[㐀-鿿]")
PUNCT_MAP = {
    "，": ",", "。": ".", "？": "?", "！": "!", "、": ",", "：": ":", "；": ";",
    "“": "\"", "”": "\"", "‘": "'", "’": "'", "（": "(", "）": ")", "《": "«", "》": "»",
    "……": "...", "—": "-", "——": "-", "…": "...",
}
WORD_FIELDS = ("id", "hanzi", "pinyin", "hanviet", "meaning", "example_zh", "example_py", "expected_pinyin", "example_vi")


def load_json(path):
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def dump_json(data, compact=False):
    if compact:
        return json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n"
    return json.dumps(data, ensure_ascii=False, indent=1) + "\n"


TONE_MARKS = {
    "1": "āēīōūǖ", "2": "áéíóúǘ", "3": "ǎěǐǒǔǚ", "4": "àèìòùǜ",
}
NUMERAL_CHARS = set("零一二三四五六七八九十百千万两第")
# Proper nouns used by the lesson cast; capitalised readings override pypinyin.
PROPER_NOUNS = {
    "王明": "Wáng Míng", "阿兰": "Ā Lán", "大卫": "Dàwèi", "李老师": "Lǐ lǎoshī", "张经理": "Zhāng jīnglǐ",
    "北京": "Běijīng", "上海": "Shànghǎi", "河内": "Hénèi", "越南": "Yuènán", "美国": "Měiguó",
    "中国": "Zhōngguó", "汉语": "Hànyǔ", "中文": "Zhōngwén", "长城": "Chángchéng", "春节": "Chūnjié",
    "北京大学": "Běijīng Dàxué", "越南人": "Yuènánrén", "美国人": "Měiguórén", "中国人": "Zhōngguórén",
    "小林": "Xiǎo Lín", "张衡": "Zhāng Héng", "地动仪": "dìdòngyí", "丽江": "Lìjiāng", "云南": "Yúnnán",
    "西藏": "Xīzàng", "丝绸之路": "Sīchóu zhī Lù", "敬仰": "jìngyǎng", "陈教授": "Chén jiàoshòu", "刘记者": "Liú jìzhě",
}


def syllable_tone(syllable):
    for tone, marks in TONE_MARKS.items():
        if any(ch in syllable for ch in marks):
            return tone
    return "5"


class PinyinMaker:
    """Tone-marked pinyin with word spacing, preferring curated deck readings."""

    def __init__(self):
        from pypinyin import Style, pinyin

        self._pinyin = pinyin
        self._style = Style.TONE
        self.known = {}
        for name, _deck in LEVEL_SOURCES.values():
            for word in load_json(VOCAB_DIR / name):
                hanzi = word.get("hanzi", "")
                py = (word.get("pinyin") or "").strip()
                # Skip single characters (context decides) and multi-reading entries.
                if len(hanzi) >= 2 and py and "/" not in py and "," not in py and "；" not in py and hanzi not in self.known:
                    self.known[hanzi] = py
        overrides_path = SRC_DIR / "pinyin_overrides.json"
        if overrides_path.exists():
            self.known.update(load_json(overrides_path))
        self.known.update(PROPER_NOUNS)
        self.max_len = max(len(k) for k in self.known)

    def _segment(self, run):
        """Greedy longest match against the known dictionary; unknown chars stay single."""
        tokens, i = [], 0
        while i < len(run):
            for size in range(min(self.max_len, len(run) - i), 0, -1):
                piece = run[i:i + size]
                if size == 1 or piece in self.known:
                    tokens.append(piece)
                    i += size
                    break
        return tokens

    def _run_pinyin(self, run):
        chars = [item[0] for item in self._pinyin(run, style=self._style)]
        # Tone sandhi for 一 and 不 on context readings, neutral 个 after numerals.
        for i, ch in enumerate(run):
            nxt = chars[i + 1] if i + 1 < len(run) else None
            nxt_tone = syllable_tone(nxt) if nxt else None
            if ch == "不" and nxt_tone == "4":
                chars[i] = "bú"
            elif ch == "一" and nxt and (i == 0 or run[i - 1] not in NUMERAL_CHARS) and run[i + 1] not in NUMERAL_CHARS and run[i + 1] not in "月号日":
                chars[i] = "yí" if nxt_tone in ("4", "5") else "yì"
            if ch == "得" and chars[i] == "dé" and i > 0:
                chars[i] = "de"
            if ch == "个" and i > 0 and (run[i - 1] in NUMERAL_CHARS or run[i - 1] in "几这那每哪"):
                chars[i] = "ge"
        words, pos = [], 0
        for token in self._segment(run):
            if len(token) > 1 and token in self.known:
                words.append(self.known[token])
            else:
                words.append("".join(chars[pos:pos + len(token)]))
            pos += len(token)
        return words

    def __call__(self, text):
        parts = []
        for chunk in re.findall(r"[\u3400-\u9fff]+|[^\u3400-\u9fff]+", text):
            if CJK_RE.match(chunk):
                parts.extend(("w", w) for w in self._run_pinyin(chunk))
            else:
                for ch in re.findall(r"……|——|\s+|.", chunk):
                    if ch.strip():
                        parts.append(("p", PUNCT_MAP.get(ch, ch)))
        out = ""
        for kind, value in parts:
            if kind == "w":
                if out and not out.endswith((" ", "\"", "(", "«")):
                    out += " "
                out += value
            else:
                if value in ("\"", "(", "«") and out and not out.endswith(" "):
                    out += " "
                out += value
                if value in (",", ".", "?", "!", ":", ";", "...", ")", "»"):
                    out += " "
        out = re.sub(r"\s+", " ", out).strip()
        out = re.sub(r" ([,.?!:;])", r"\1", out)
        out = re.sub(r"\s*(\.\.\.)", r"\1", out)
        # Capitalise each sentence start.
        return re.sub(r"(^|[.?!] |\")([a-zāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜü])", lambda m: m.group(1) + m.group(2).upper(), out)


def lesson_text(lesson):
    chunks = [lesson["zh"]]
    for g in lesson.get("grammar", []):
        chunks.extend(ex[0] for ex in g.get("ex", []))
    chunks.extend(line[1] for line in lesson.get("dlg", []))
    return "\n".join(chunks)


def assign_words(lessons, words):
    """Return a list (per lesson) of deck words, each deck word used exactly once."""
    count = len(lessons)
    quota = math.ceil(len(words) / count)
    by_len = sorted(range(len(words)), key=lambda i: (-len(words[i]["hanzi"]), i))
    owner = {}
    texts = [lesson_text(lesson) for lesson in lessons]
    for li, text in enumerate(texts):
        taken = sum(1 for v in owner.values() if v == li)
        for wi in by_len:
            if wi in owner or taken >= quota:
                continue
            if words[wi]["hanzi"] and words[wi]["hanzi"] in text:
                owner[wi] = li
                taken += 1
    buckets = [[] for _ in lessons]
    for wi, li in owner.items():
        buckets[li].append(wi)
    pending = [wi for wi in range(len(words)) if wi not in owner]
    for li in range(count):
        remaining_lessons = count - li
        target = min(quota, len(buckets[li]) + max(0, math.ceil((len(pending)) / remaining_lessons)))
        while len(buckets[li]) < target and pending:
            buckets[li].append(pending.pop(0))
    if pending:
        buckets[-1].extend(pending)
    # Words that occur in the lesson text come first, then the quota fillers.
    return [[words[wi] for wi in sorted(bucket, key=lambda i, li=li: (owner.get(i) != li, i))] for li, bucket in enumerate(buckets)]


def build():
    make_py = PinyinMaker()
    files = {}
    index = []
    for level_id, (vocab_name, deck_key) in LEVEL_SOURCES.items():
        src_path = SRC_DIR / f"level{level_id}.json"
        if not src_path.exists():
            continue
        src = load_json(src_path)
        words = load_json(VOCAB_DIR / vocab_name)
        lessons = src["lessons"]
        buckets = assign_words(lessons, words)
        out_lessons = []
        level_entry = {
            "level": level_id,
            "name": src["name"],
            "band": src["band"],
            "deck": deck_key,
            "words": len(words),
            "grammarTotal": src.get("grammarTotal"),
            "lessons": [],
        }
        for n, (lesson, bucket) in enumerate(zip(lessons, buckets), start=1):
            key = f"cur30_{level_id}_{n:02d}"
            grammar = []
            for g in lesson.get("grammar", []):
                grammar.append({
                    "title": g["t"],
                    "tag": g.get("tag", ""),
                    "formula": g["f"],
                    "note": g.get("n", ""),
                    "key": g.get("k", ""),
                    "examples": [{"zh": ex[0], "py": make_py(ex[0]), "vi": ex[1]} for ex in g.get("ex", [])],
                })
            dialogue = [{"who": line[0], "zh": line[1], "py": make_py(line[1]), "vi": line[2]} for line in lesson.get("dlg", [])]
            out_lessons.append({
                "key": key,
                "n": n,
                "zh": lesson["zh"],
                "py": make_py(lesson["zh"]),
                "vi": lesson["vi"],
                "topic": lesson.get("topic", ""),
                "grammar": grammar,
                "dialogueTitle": lesson.get("dlgTitle", ""),
                "dialogue": dialogue,
                "words": [{"id": w["id"], "hanzi": w["hanzi"], "pinyin": w.get("pinyin", ""), "meaning": w.get("meaning", ""), "hanviet": w.get("hanviet", "")} for w in bucket],
            })
            deck = [{field: w.get(field, "") for field in WORD_FIELDS} for w in bucket]
            files[OUT_DIR / "decks" / f"{key}.json"] = dump_json(deck, compact=True)
            level_entry["lessons"].append({"key": key, "n": n, "zh": lesson["zh"], "vi": lesson["vi"], "words": len(bucket), "grammar": len(grammar)})
        files[OUT_DIR / f"level{level_id}.json"] = dump_json({
            "level": level_id, "name": src["name"], "band": src["band"], "deck": deck_key,
            "lessons": out_lessons,
        }, compact=True)
        index.append(level_entry)
    files[OUT_DIR / "index.json"] = dump_json({
        "standard": "GF0025-2021",
        "levels": index,
    })
    js_entries = []
    for level in index:
        for lesson in level["lessons"]:
            js_entries.append([lesson["key"], level["level"], level["name"], lesson["n"], lesson["zh"], lesson["words"], level["deck"]])
    files[INDEX_JS] = (
        "// Generated by tools/build_curriculum.py - do not edit by hand.\n"
        "// [lessonKey, levelId, levelName, lessonNumber, titleZh, wordCount, parentDeck]\n"
        "export const CURRICULUM_LESSONS = " + json.dumps(js_entries, ensure_ascii=False) + ";\n"
    )
    return files


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--check", action="store_true", help="fail if generated files are stale")
    args = parser.parse_args()
    files = build()
    stale = []
    for path, content in files.items():
        current = path.read_text(encoding="utf-8") if path.exists() else None
        if current != content:
            stale.append(path)
            if not args.check:
                path.parent.mkdir(parents=True, exist_ok=True)
                path.write_text(content, encoding="utf-8")
    if args.check:
        if stale:
            print("Stale curriculum files:", *[str(p.relative_to(ROOT)) for p in stale], sep="\n  ")
            return 1
        print("Curriculum data is up to date.")
        return 0
    lessons = sum(len(v) for v in [json.loads(c)["lessons"] for p, c in files.items() if p.name.startswith("level")])
    print(f"Wrote {len(stale)} changed file(s); {lessons} lessons total.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
