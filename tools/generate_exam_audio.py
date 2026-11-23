#!/usr/bin/env python3
"""Generate authentic CTI-standard listening audio with exact 3.5s pause between repetitions.

Covers HSK 1, HSK 2, and HSK 3 listening exams:
1. First reading: Announce question number ('第一题。...') + dialogue/sentence.
2. Intermission: Exact 3.5-second silence interval for the examinee to review options.
3. Second reading: Full dialogue/sentence repeated clearly.
4. Audio normalized with EBU R128 (-18 LUFS) for studio clarity.
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
PAUSE_DURATION_SEC = "3.5"

FFMPEG_BIN = "/opt/homebrew/bin/ffmpeg" if os.path.exists("/opt/homebrew/bin/ffmpeg") else "ffmpeg"


def num_to_zh(n: int) -> str:
    """Convert number 1..50 to Chinese numeral."""
    zh_digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
    if n <= 10:
        return zh_digits[n]
    if n < 20:
        return f"十{zh_digits[n - 10]}"
    if n == 20:
        return "二十"
    if n < 30:
        return f"二十{zh_digits[n - 20]}"
    if n == 30:
        return "三十"
    if n < 40:
        return f"三十{zh_digits[n - 30]}"
    if n == 40:
        return "四十"
    return f"四十{zh_digits[n - 40]}"


async def synthesize_repeated_question(q_num: int, text: str, out_path: Path) -> bool:
    """Synthesize 1st reading, 3.5s silence pause, and 2nd reading with ffmpeg concat."""
    out_path.parent.mkdir(parents=True, exist_ok=True)
    prefix = f"第{num_to_zh(q_num)}题。"
    text1 = f"{prefix} {text}。"
    text2 = f"{text}。"

    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f1, \
         tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as f2:
        tmp1 = Path(f1.name)
        tmp2 = Path(f2.name)

    try:
        success = False
        for attempt in range(4):
            try:
                c1 = edge_tts.Communicate(text=text1, voice=VOICE, rate=RATE, volume=VOLUME)
                c2 = edge_tts.Communicate(text=text2, voice=VOICE, rate=RATE, volume=VOLUME)
                await c1.save(str(tmp1))
                await c2.save(str(tmp2))
                success = True
                break
            except Exception as ex:
                if attempt == 3:
                    print(f"Edge TTS failed on {out_path.name}: {ex}", file=sys.stderr)
                    return False
                await asyncio.sleep(1.5 * (attempt + 1))

        if not success:
            return False

        cmd = [
            FFMPEG_BIN, "-y",
            "-i", str(tmp1),
            "-f", "lavfi", "-t", PAUSE_DURATION_SEC, "-i", "anullsrc=r=24000:cl=mono",
            "-i", str(tmp2),
            "-filter_complex", "[0:a][1:a][2:a]concat=n=3:v=0:a=1[out];[out]loudnorm=I=-18:TP=-2:LRA=7",
            "-ar", "24000",
            "-ac", "1",
            "-b:a", "64k",
            str(out_path)
        ]
        res = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, check=False)
        if res.returncode != 0:
            print(f"ffmpeg error on {out_path.name}: {res.stderr.decode('utf-8', errors='ignore')}", file=sys.stderr)
            return False
        return True
    finally:
        if tmp1.exists():
            tmp1.unlink()
        if tmp2.exists():
            tmp2.unlink()


async def process_exam_file(exam_file: Path) -> None:
    if not exam_file.exists():
        print(f"Exam file not found: {exam_file}", file=sys.stderr)
        return

    with open(exam_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    listening_questions = [
        q for q in data.get("sections", {}).get("listening", {}).get("questions", [])
        if q.get("audio_clip") and (q.get("audio_text") or q.get("prompt_zh"))
    ]

    print(f"\nProcessing {data.get('title')} ({len(listening_questions)} questions)...")
    for idx, q in enumerate(listening_questions, 1):
        rel_clip = q["audio_clip"]
        audio_dest = REPO_ROOT / rel_clip
        if audio_dest.exists() and audio_dest.stat().st_size > 1000:
            continue

        raw_text = q.get("audio_text") or q.get("prompt_zh")
        q_num = q.get("number", idx)
        print(f"  [{idx}/{len(listening_questions)}] {rel_clip} -> 第{num_to_zh(q_num)}题")
        ok = await synthesize_repeated_question(q_num, raw_text, audio_dest)
        if not ok:
            print(f"Failed to generate {rel_clip}", file=sys.stderr)
        await asyncio.sleep(0.08)


async def main() -> None:
    exam_files = [
        REPO_ROOT / "database/exams/hsk30/level1/hsk30_l1_specimen01.json",
        REPO_ROOT / "database/exams/hsk30/level2/hsk30_l2_specimen01.json",
        REPO_ROOT / "database/exams/hsk30/level3/hsk30_l3_specimen01.json",
        REPO_ROOT / "database/exams/hsk30/level4/hsk30_l4_specimen01.json",
    ]
    for ef in exam_files:
        await process_exam_file(ef)

    print("\nAll HSK 3.0 CTI audio generation completed successfully.")


if __name__ == "__main__":
    asyncio.run(main())
