#!/usr/bin/env python3
"""Generate audio for HSK 3.0 mock exam listening questions using Edge Neural TTS.

Synthesizes studio-grade 24kHz MP3 audio with loudness normalization according to AGENTS.md:
Voice: zh-CN-XiaoxiaoNeural
Format: 24kHz Mono, 64kbps MP3
Filter: silenceremove and EBU R128 loudness normalization
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
RATE = "+0%"
VOLUME = "+0%"

# Determine ffmpeg binary path
FFMPEG_BIN = "/opt/homebrew/bin/ffmpeg" if os.path.exists("/opt/homebrew/bin/ffmpeg") else "ffmpeg"

SILENCE_FILTER = (
    "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB:"
    "stop_periods=-1:stop_duration=0.08:stop_threshold=-45dB:stop_silence=0.03,"
    "loudnorm=I=-18:TP=-2:LRA=7"
)


async def synthesize_sentence(text: str, out_path: Path) -> bool:
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


async def main() -> None:
    exam_file = REPO_ROOT / "database/exams/hsk30/level1/hsk30_l1_specimen01.json"
    if not exam_file.exists():
        print(f"Exam file not found: {exam_file}", file=sys.stderr)
        sys.exit(1)

    with open(exam_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    listening_questions = [
        q for q in data.get("sections", {}).get("listening", {}).get("questions", [])
        if q.get("audio_clip") and q.get("audio_text")
    ]

    print(f"Generating audio for {len(listening_questions)} listening questions...")
    for idx, q in enumerate(listening_questions, 1):
        rel_clip = q["audio_clip"]
        audio_dest = REPO_ROOT / rel_clip
        text = q["audio_text"]
        print(f"[{idx}/{len(listening_questions)}] {rel_clip} -> {text}")
        ok = await synthesize_sentence(text, audio_dest)
        if not ok:
            print(f"Failed to generate {rel_clip}", file=sys.stderr)
        # Small delay to prevent rate limiting
        await asyncio.sleep(0.1)

    print("Audio generation completed successfully.")


if __name__ == "__main__":
    asyncio.run(main())
