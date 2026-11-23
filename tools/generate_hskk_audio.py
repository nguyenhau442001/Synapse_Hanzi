#!/usr/bin/env python3
"""Generate studio-grade audio for all 3 HSKK exam levels (Primary, Intermediate, Advanced).

Synthesizes audio according to AGENTS.md:
Voice: zh-CN-XiaoxiaoNeural
Format: 24kHz Mono, 64kbps MP3
Filter: silenceremove + EBU R128 loudness normalization
"""

from __future__ import annotations

import asyncio
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

import edge_tts

REPO_ROOT = Path(__file__).resolve().parents[1]
VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-10%"
VOLUME = "+0%"

FFMPEG_BIN = "/opt/homebrew/bin/ffmpeg" if os.path.exists("/opt/homebrew/bin/ffmpeg") else "ffmpeg"

SILENCE_FILTER = (
    "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB:"
    "stop_periods=-1:stop_duration=0.08:stop_threshold=-45dB:stop_silence=0.03,"
    "loudnorm=I=-18:TP=-2:LRA=7"
)


def num_to_zh(n: int) -> str:
    """Convert number to Chinese numeral."""
    zh_digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
    if n <= 10:
        return zh_digits[n]
    if n < 20:
        return f"十{zh_digits[n - 10]}"
    if n == 20:
        return "二十"
    return f"二十{zh_digits[n - 20]}"


async def synthesize_clip(text: str, out_path: Path) -> bool:
    """Synthesize text using Edge TTS and normalize with ffmpeg."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp:
        tmp_path = Path(tmp.name)

    try:
        communicate = edge_tts.Communicate(text=text, voice=VOICE, rate=RATE, volume=VOLUME)
        await communicate.save(str(tmp_path))

        cmd = [
            FFMPEG_BIN,
            "-y",
            "-i",
            str(tmp_path),
            "-af",
            SILENCE_FILTER,
            "-ar",
            "24000",
            "-ac",
            "1",
            "-b:a",
            "64k",
            str(out_path),
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=False)
        if res.returncode != 0:
            print(f"ffmpeg error on {out_path.name}: {res.stderr.decode('utf-8', errors='ignore')}", file=sys.stderr)
            return False
        return True
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


async def process_file(json_path: Path) -> None:
    if not json_path.exists():
        print(f"File not found: {json_path}")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    sections = data.get("sections", {})
    all_questions = []
    for sec_key, sec_val in sections.items():
        all_questions.extend(sec_val.get("questions", []))

    print(f"\nProcessing {data.get('title')} ({len(all_questions)} questions)...")
    for q in all_questions:
        rel_clip = q.get("audio_clip")
        prompt = q.get("prompt_zh")
        q_num = q.get("number", 1)
        if not rel_clip or not prompt:
            continue

        out_path = REPO_ROOT / rel_clip
        if out_path.exists() and out_path.stat().st_size > 1000:
            continue

        spoken_text = f"第{num_to_zh(q_num)}题。{prompt}"
        print(f"  -> {rel_clip} : {spoken_text[:35]}...")
        ok = await synthesize_clip(spoken_text, out_path)
        if not ok:
            print(f"Failed to generate {rel_clip}", file=sys.stderr)
        await asyncio.sleep(0.08)


async def main() -> None:
    files = [
        REPO_ROOT / "database/exams/hskk/primary/hskk_primary_specimen01.json",
        REPO_ROOT / "database/exams/hskk/intermediate/hskk_intermediate_specimen01.json",
        REPO_ROOT / "database/exams/hskk/advanced/hskk_advanced_specimen01.json",
    ]
    for fp in files:
        await process_file(fp)

    print("\nAll HSKK audio generation completed successfully.")


if __name__ == "__main__":
    asyncio.run(main())
