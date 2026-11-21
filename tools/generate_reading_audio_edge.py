#!/usr/bin/env python3
"""Generate prebuilt Mandarin audio for Graded Reading stories using Edge Neural TTS.

Synthesizes studio-grade 24kHz MP3 audio with loudness normalization for each sentence
in graded reading stories, and supports batch commits directly to main.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import html
from html.parser import HTMLParser
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import time
from typing import Any

import edge_tts

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"
DEFAULT_BITRATE = "64k"

SILENCE_FILTER = (
    "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB:"
    "stop_periods=-1:stop_duration=0.08:stop_threshold=-45dB:stop_silence=0.03,"
    "loudnorm=I=-18:TP=-2:LRA=7"
)


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def visible_text(value: Any) -> str:
    parser = _TextExtractor()
    parser.feed(html.unescape(str(value or "")))
    parser.close()
    raw = "".join(parser.parts).strip()
    return re.sub(r"^[，。？！、\s]+", "", raw)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--levels",
        default="HSK1,HSK2,HSK3,HSK4,HSK5,HSK6",
        help="Comma-separated levels to process (e.g. HSK1,HSK2,HSK3)",
    )
    parser.add_argument("--story-id", help="Only process a single story id")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Edge TTS voice name (default: zh-CN-XiaoxiaoNeural)")
    parser.add_argument("--bitrate", default=DEFAULT_BITRATE, help="Target MP3 bitrate (default: 64k)")
    parser.add_argument("--delay-seconds", type=float, default=0.25, help="Delay between requests (default: 0.25s)")
    parser.add_argument("--batch-size", type=int, default=200, help="Commit and push after every N clips (default: 200)")
    parser.add_argument(
        "--auto-commit",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Automatically commit and push to main after each batch (default: True)",
    )
    parser.add_argument("--overwrite", action="store_true", help="Regenerate and overwrite existing audio files")
    parser.add_argument("--dry-run", action="store_true", help="Show planned clips without generating audio")
    return parser.parse_args()


def load_manifest() -> list[dict[str, Any]]:
    path = REPO_ROOT / "database" / "readings" / "manifest.json"
    if not path.is_file():
        raise FileNotFoundError(f"Reading manifest not found: {path}")
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def load_story_file(story_item: dict[str, Any]) -> dict[str, Any]:
    file_rel = story_item.get("file") or story_item.get("path")
    if not file_rel:
        level_dir = (story_item.get("level") or "").lower()
        file_rel = f"database/readings/{level_dir}/{story_item['id']}.json"
    full_path = REPO_ROOT / file_rel
    if not full_path.is_file():
        raise FileNotFoundError(f"Story file not found: {full_path}")
    with full_path.open(encoding="utf-8") as f:
        return json.load(f)


def sentence_text(sentence: dict[str, Any]) -> str:
    if sentence.get("zh"):
        return visible_text(sentence["zh"])
    tokens = sentence.get("tokens") or []
    if tokens:
        return visible_text("".join(t.get("text", "") for t in tokens))
    return visible_text(sentence.get("text", ""))


async def synthesize_edge_tts(text: str, voice: str, destination: Path, bitrate: str = DEFAULT_BITRATE) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tf:
        temp_input = tf.name

    try:
        communicator = edge_tts.Communicate(text=text, voice=voice)
        await communicator.save(temp_input)

        if not os.path.exists(temp_input) or os.path.getsize(temp_input) < 256:
            raise RuntimeError(f"Edge TTS produced empty output for text: {text}")

        temporary = destination.with_suffix(".tmp.mp3")
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-i", temp_input,
            "-af", SILENCE_FILTER, "-ar", "24000", "-ac", "1", "-codec:a", "libmp3lame",
            "-b:a", bitrate, "-map_metadata", "-1", "-f", "mp3", str(temporary),
        ], check=True)
        if temporary.stat().st_size < 256:
            raise RuntimeError(f"Encoded audio is unexpectedly small: {destination}")
        temporary.replace(destination)
    finally:
        try:
            os.remove(temp_input)
        except OSError:
            pass


def commit_and_push_batch(batch_count: int, level_label: str) -> None:
    try:
        git_dir = REPO_ROOT / "database" / "prebuilt_audio" / "readings"
        if not git_dir.exists():
            return
        subprocess.run(["git", "add", "database/prebuilt_audio/readings"], cwd=REPO_ROOT, check=True)
        status = subprocess.run(["git", "status", "--porcelain"], cwd=REPO_ROOT, capture_output=True, text=True, check=True)
        if not status.stdout.strip():
            return

        commit_msg = f"feat(audio): batch generate prebuilt reading audio ({level_label}: +{batch_count} clips)"
        print(f"\n[>>> GIT] Committing and pushing batch of {batch_count} clips for {level_label} to main...")
        subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_ROOT, check=True)
        subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=REPO_ROOT, check=True)
        print("[>>> GIT] Push succeeded.\n")
    except subprocess.CalledProcessError as e:
        print(f"[>>> GIT WARN] Failed to commit/push batch: {e}", file=sys.stderr)


async def main_async() -> int:
    args = parse_args()
    manifest = load_manifest()
    target_levels = {lvl.strip().upper() for lvl in args.levels.split(",") if lvl.strip()}

    stories_to_process: list[dict[str, Any]] = []
    for item in manifest:
        item_level = (item.get("level") or "").upper()
        if target_levels and item_level not in target_levels:
            continue
        if args.story_id and item.get("id") != args.story_id:
            continue
        stories_to_process.append(item)

    print(f"Matched {len(stories_to_process)} stories across levels: {sorted(target_levels)}")

    tasks: list[dict[str, Any]] = []
    for story_item in stories_to_process:
        story_id = story_item["id"]
        try:
            story_data = load_story_file(story_item)
        except Exception as e:
            print(f"Skipping story {story_id}: {e}")
            continue

        sentences = story_data.get("sentences", [])
        for sent in sentences:
            sent_id = str(sent.get("id") or "")
            if not sent_id:
                continue
            text = sentence_text(sent)
            if not text:
                continue
            dest = REPO_ROOT / "database" / "prebuilt_audio" / "readings" / story_id / f"{sent_id}.mp3"
            tasks.append({
                "story_id": story_id,
                "sent_id": sent_id,
                "text": text,
                "dest": dest,
                "level": story_item.get("level", "UNKNOWN"),
            })

    total_tasks = len(tasks)
    pending_tasks = [t for t in tasks if args.overwrite or not t["dest"].is_file() or t["dest"].stat().st_size < 256]
    print(f"Total planned tasks: {total_tasks} ({len(pending_tasks)} pending, {total_tasks - len(pending_tasks)} exist)")
    print(f"Voice: {args.voice} | Bitrate: {args.bitrate} | Batch size: {args.batch_size}")

    if args.dry_run:
        print("\n[Dry run] First 5 tasks:")
        for t in pending_tasks[:5]:
            print(f"  [{t['story_id']}:{t['sent_id']}] {t['text']} -> {t['dest']}")
        return 0

    if not pending_tasks:
        print("All reading clips are already generated!")
        return 0

    generated_count = 0
    batch_count = 0
    t0 = time.time()

    for idx, task in enumerate(pending_tasks, start=1):
        story_id = task["story_id"]
        sent_id = task["sent_id"]
        text = task["text"]
        dest = task["dest"]

        print(f"[{idx}/{len(pending_tasks)}] {story_id} ({sent_id}): {text[:24]} ...", end=" ", flush=True)
        try:
            await synthesize_edge_tts(text, voice=args.voice, destination=dest, bitrate=args.bitrate)
            size_kb = dest.stat().st_size / 1024
            print(f"OK ({size_kb:.1f} KB)")
            generated_count += 1
            batch_count += 1
        except Exception as e:
            print(f"FAILED: {e}")

        if args.delay_seconds > 0:
            await asyncio.sleep(args.delay_seconds)

        if args.auto_commit and batch_count >= args.batch_size:
            commit_and_push_batch(batch_count, task["level"])
            batch_count = 0

    if args.auto_commit and batch_count > 0:
        commit_and_push_batch(batch_count, "GradedReading")

    elapsed = time.time() - t0
    rate = elapsed / max(1, generated_count)
    print(f"\nDone! Successfully generated {generated_count}/{len(pending_tasks)} reading clips in {elapsed:.1f}s ({rate:.2f}s/clip).")
    return 0


def main() -> None:
    try:
        code = asyncio.run(main_async())
        sys.exit(code)
    except KeyboardInterrupt:
        print("\nInterrupted by user.")
        sys.exit(130)


if __name__ == "__main__":
    main()
