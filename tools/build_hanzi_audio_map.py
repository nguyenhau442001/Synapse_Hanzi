#!/usr/bin/env python3
"""Build a global Hanzi to Prebuilt Audio URL lookup map.

Outputs database/prebuilt_audio/hanzi_audio_map.json mapping clean Hanzi
text to its studio-grade MP3 audio URL.
"""

from __future__ import annotations

import json
from pathlib import Path
import re

REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = REPO_ROOT / "database" / "prebuilt_audio"
VOCABS_DIR = REPO_ROOT / "database" / "vocabs"
OUTPUT_FILE = AUDIO_DIR / "hanzi_audio_map.json"
TAG_RE = re.compile(r"</?[a-z0-9]+>", re.IGNORECASE)


def clean_hanzi(text: str) -> str:
    """Strip parenthetical annotations and whitespace from Hanzi."""
    text = (text or "").strip()
    for delimiter in ("（", "("):
        if delimiter in text:
            text = text.split(delimiter)[0].strip()
    return text


def strip_html_tags(text: str) -> str:
    """Strip HTML markup like <u> and </u> from example sentences."""
    return TAG_RE.sub("", text or "").strip()


def _add_sentence_mapping(mapping: dict[str, str], text: str, audio_url: str) -> None:
    """Register a sentence and its unpunctuated variant if not already mapped."""
    clean_text = strip_html_tags(text)
    if not clean_text:
        return
    if clean_text not in mapping:
        mapping[clean_text] = audio_url
    no_punct = clean_text.rstrip("。！？!?., \t\n\r")
    if no_punct and no_punct not in mapping:
        mapping[no_punct] = audio_url


def build_hanzi_audio_map() -> dict[str, str]:
    mapping: dict[str, str] = {}

    for manifest_file in sorted(AUDIO_DIR.glob("*/manifest.json")):
        level_name = manifest_file.parent.name
        try:
            with manifest_file.open(encoding="utf-8") as handle:
                manifest = json.load(handle)
        except Exception:
            continue

        items = manifest.get("items", {})
        if not items:
            continue

        if level_name == "curriculum":
            for entry in items.values():
                if isinstance(entry, dict) and entry.get("text") and entry.get("url"):
                    _add_sentence_mapping(mapping, str(entry["text"]), str(entry["url"]))
            continue

        if level_name.startswith("hsk30_"):
            num = level_name.replace("hsk30_", "")
            vfile = VOCABS_DIR / "hsk3_0" / f"level{num}_vocabularies.json"
        elif level_name.startswith("topic_"):
            slug = level_name.removeprefix("topic_")
            vfile = VOCABS_DIR / "topics" / f"{slug}.json"
        else:
            vfile = VOCABS_DIR / f"{level_name}_vocabularies.json"

        if not vfile.is_file():
            continue

        try:
            with vfile.open(encoding="utf-8") as vhandle:
                vocabs = json.load(vhandle)
        except Exception:
            continue

        id_to_vocab = {str(r.get("id")): r for r in vocabs if "id" in r}

        for word_id, audio_info in items.items():
            vocab_entry = id_to_vocab.get(word_id)
            if not vocab_entry:
                continue

            # 1. Map vocabulary word audio
            word_text = str(vocab_entry.get("hanzi") or "").strip()
            word_audio = audio_info.get("word")
            if word_audio:
                clean_text = clean_hanzi(word_text)
                if clean_text and clean_text not in mapping:
                    mapping[clean_text] = word_audio
                if word_text and word_text not in mapping:
                    mapping[word_text] = word_audio

            # 2. Map example sentence audio
            example_audio = audio_info.get("example")
            example_zh = vocab_entry.get("example_zh")
            if example_audio and example_zh:
                _add_sentence_mapping(mapping, example_zh, example_audio)

    return mapping


def main() -> None:
    mapping = build_hanzi_audio_map()
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    temp_path = OUTPUT_FILE.with_suffix(".json.tmp")
    with temp_path.open("w", encoding="utf-8") as handle:
        json.dump(mapping, handle, ensure_ascii=False, indent=2)
        handle.write("\n")
    temp_path.replace(OUTPUT_FILE)
    print(f"Generated global Hanzi audio map: {OUTPUT_FILE} ({len(mapping)} words)")


if __name__ == "__main__":
    main()
