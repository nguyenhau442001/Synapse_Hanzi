#!/usr/bin/env python3
"""Refresh prebuilt audio for short (<0.36s) single-character words across all levels.

Ensures that standalone monosyllabic words have natural pacing and full articulation
of initial plosives and tones without onset clipping.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import time

REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT))

from tools.generate_hsk_audio_edge import (
    DEFAULT_VOICE,
    DEFAULT_BITRATE,
    generate_edge_audio_bytes,
    encode_mp3,
    update_manifest,
)

LEVEL_FILES = {
    "hsk30_1": REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level1_vocabularies.json",
    "hsk30_2": REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level2_vocabularies.json",
    "hsk30_3": REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level3_vocabularies.json",
    "hsk30_4": REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level4_vocabularies.json",
    "hsk30_5": REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level5_vocabularies.json",
    "hsk30_6": REPO_ROOT / "database" / "vocabs" / "hsk3_0" / "level6_vocabularies.json",
    "hsk4": REPO_ROOT / "database" / "vocabs" / "hsk4_vocabularies.json",
}

MAX_SHORT_DURATION = 0.36


def get_audio_duration(file_path: Path) -> float:
    try:
        out = subprocess.check_output(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(file_path)],
            text=True,
        )
        return float(out.strip())
    except Exception:
        return 0.0


async def main() -> int:
    candidates: list[dict] = []

    for level, vocab_path in LEVEL_FILES.items():
        if not vocab_path.is_file():
            continue
        with vocab_path.open(encoding="utf-8") as f:
            words = json.load(f)

        for w in words:
            hz = w.get("hanzi", "").strip()
            if len(hz) != 1:
                continue
            wid = int(w["id"])
            audio_path = REPO_ROOT / "database" / "prebuilt_audio" / level / "words" / f"{wid:04d}.mp3"
            if not audio_path.is_file():
                continue
            dur = get_audio_duration(audio_path)
            if dur < MAX_SHORT_DURATION:
                candidates.append({
                    "level": level,
                    "id": wid,
                    "hanzi": hz,
                    "pinyin": w.get("pinyin", ""),
                    "path": audio_path,
                    "old_dur": dur,
                })

    print(f"Found {len(candidates)} short (<{MAX_SHORT_DURATION}s) single-character words to refresh.")
    if not candidates:
        print("All single-character words already meet duration standards.")
        return 0

    levels_touched: set[str] = set()
    t0 = time.time()

    for idx, item in enumerate(candidates, 1):
        level = item["level"]
        wid = item["id"]
        hz = item["hanzi"]
        audio_path = item["path"]
        old_dur = item["old_dur"]

        print(f"[{idx}/{len(candidates)}] {level.upper()} #{wid:04d} ({hz}, {item['pinyin']}): {old_dur:.3f}s ->", end=" ", flush=True)

        try:
            raw_bytes = await generate_edge_audio_bytes(hz, DEFAULT_VOICE, kind="word")
            encode_mp3(raw_bytes, audio_path, DEFAULT_BITRATE)
            new_dur = get_audio_duration(audio_path)
            print(f"OK ({new_dur:.3f}s, +{(new_dur - old_dur) * 1000:.0f}ms)")
            levels_touched.add(level)
        except Exception as e:
            print(f"FAILED: {e}")

        await asyncio.sleep(0.2)

    print(f"\nUpdating manifests for touched levels: {sorted(levels_touched)}...")
    for lvl in sorted(levels_touched):
        update_manifest(lvl, DEFAULT_VOICE)

    elapsed = time.time() - t0
    print(f"Completed refresh of {len(candidates)} words in {elapsed:.1f}s.")
    return 0


if __name__ == "__main__":
    code = asyncio.run(main())
    sys.exit(code)
