#!/usr/bin/env python3
"""Generate authentic CTI-standard listening audio with exact 3.5s pause between repetitions.

In official HSK 1 CTI exams:
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
RATE = "-12%"
VOLUME = "+0%"
PAUSE_DURATION_SEC = "3.5"

FFMPEG_BIN = "/opt/homebrew/bin/ffmpeg" if os.path.exists("/opt/homebrew/bin/ffmpeg") else "ffmpeg"


def num_to_zh(n: int) -> str:
    """Convert number 1..20 to Chinese numeral."""
    zh_digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
    if n <= 10:
        return zh_digits[n]
    if n < 20:
        return f"十{zh_digits[n - 10]}"
    return "二十"


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
        c1 = edge_tts.Communicate(text=text1, voice=VOICE, rate=RATE, volume=VOLUME)
        c2 = edge_tts.Communicate(text=text2, voice=VOICE, rate=RATE, volume=VOLUME)
        await c1.save(str(tmp1))
        await c2.save(str(tmp2))

        # Concatenate: [1st reading] + [3.5s silence] + [2nd reading]
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

    print(f"Generating CTI-standard audio with 3.5s pause for {len(listening_questions)} questions...")
    for idx, q in enumerate(listening_questions, 1):
        rel_clip = q["audio_clip"]
        audio_dest = REPO_ROOT / rel_clip
        raw_text = q["audio_text"]
        q_num = q.get("number", idx)
        print(f"[{idx}/{len(listening_questions)}] {rel_clip} -> 第{num_to_zh(q_num)}题 (3.5s pause) (Repeat x2)")
        ok = await synthesize_repeated_question(q_num, raw_text, audio_dest)
        if not ok:
            print(f"Failed to generate {rel_clip}", file=sys.stderr)
        await asyncio.sleep(0.1)

    print("CTI audio with authentic 3.5s pause generated successfully.")


if __name__ == "__main__":
    asyncio.run(main())
