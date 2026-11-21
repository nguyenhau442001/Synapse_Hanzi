#!/usr/bin/env python3
"""Build a global Hanzi to Prebuilt Audio URL lookup map.

Outputs database/prebuilt_audio/hanzi_audio_map.json mapping clean Hanzi
text to its studio-grade MP3 audio URL.
"""

from __future__ import annotations

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIO_DIR = REPO_ROOT / "database" / "prebuilt_audio"
VOCABS_DIR = REPO_ROOT / "database" / "vocabs"
OUTPUT_FILE = AUDIO_DIR / "hanzi_audio_map.json"


def clean_hanzi(text: str) -> str:
    """Strip parenthetical annotations and whitespace from Hanzi."""
    text = (text or "").strip()
    for delimiter in ("（", "("):
        if delimiter in text:
            text = text.split(delimiter)[0].strip()
    return text


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

        if level_name.startswith("hsk30_"):
            num = level_name.replace("hsk30_", "")
            vfile = VOCABS_DIR / "hsk3_0" / f"level{num}_vocabularies.json"
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

            word_text = str(vocab_entry.get("hanzi") or "").strip()
            word_audio = audio_info.get("word")
            if not word_audio:
                continue

            clean_text = clean_hanzi(word_text)
            if clean_text and clean_text not in mapping:
                mapping[clean_text] = word_audio
            if word_text and word_text not in mapping:
                mapping[word_text] = word_audio

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
