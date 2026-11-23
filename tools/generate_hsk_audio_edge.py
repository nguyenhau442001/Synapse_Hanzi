#!/usr/bin/env python3
"""Generate prebuilt Mandarin audio using Microsoft Edge Neural TTS.

Produces studio-grade 24kHz MP3 audio with silence trimming and loudness normalization,
updates level manifests, syncs the global Hanzi audio map, and supports batch commits.
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
    "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-50dB:start_silence=0.08,"
    "areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-50dB:start_silence=0.08,areverse,"
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
    return "".join(parser.parts).strip()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", default="hsk4", help="Level name: hsk1..hsk6 or hsk30_1..hsk30_9")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Edge TTS voice name (default: zh-CN-XiaoxiaoNeural)")
    parser.add_argument("--kind", choices=["both", "word", "example"], default="both")
    parser.add_argument("--start-id", type=int, help="Only process rows with id >= start-id")
    parser.add_argument("--limit", type=int, help="Maximum number of rows to process")
    parser.add_argument("--ids", help="Comma-separated vocabulary ids to generate (e.g. 1,2,5)")
    parser.add_argument("--bitrate", default=DEFAULT_BITRATE, help="Target MP3 bitrate (default: 64k)")
    parser.add_argument("--delay-seconds", type=float, default=0.25, help="Delay between requests (default: 0.25s)")
    parser.add_argument("--batch-size", type=int, default=100, help="Commit and push after every N generated words (default: 100)")
    parser.add_argument(
        "--auto-commit",
        action=argparse.BooleanOptionalAction,
        default=True,
        help="Automatically commit and push to main after each batch (default: True)",
    )
    parser.add_argument("--overwrite", action="store_true", help="Regenerate and overwrite existing audio files")
    parser.add_argument("--skip-manifest", action="store_true", help="Do not update manifest.json")
    parser.add_argument("--dry-run", action="store_true", help="Show planned audio clips without calling the API")
    return parser.parse_args()


def get_vocab_path(level: str) -> Path:
    if level.startswith("hsk30_"):
        num = level.replace("hsk30_", "")
        return REPO_ROOT / "database" / "vocabs" / "hsk3_0" / f"level{num}_vocabularies.json"
    return REPO_ROOT / "database" / "vocabs" / f"{level}_vocabularies.json"


def load_rows(level: str, start_id: int | None, limit: int | None, ids_filter: set[int] | None) -> list[dict[str, Any]]:
    source = get_vocab_path(level)
    if not source.is_file():
        raise FileNotFoundError(f"Vocabulary file not found: {source}")

    with source.open(encoding="utf-8") as handle:
        rows = json.load(handle)
    if not isinstance(rows, list):
        raise ValueError(f"Expected a JSON array in {source}")

    normalized: list[dict[str, Any]] = []
    for row in rows:
        try:
            word_id = int(row["id"])
        except (KeyError, TypeError, ValueError) as exc:
            raise ValueError(f"Invalid vocabulary id in {source}: {row!r}") from exc

        if ids_filter is not None and word_id not in ids_filter:
            continue
        if start_id is not None and word_id < start_id:
            continue

        raw_hanzi = str(row.get("hanzi") or "")
        clean_hanzi = re.sub(r"[（\(].*?[）\)]", "", raw_hanzi).strip() or raw_hanzi
        example = visible_text(row.get("example_zh"))
        pinyin = visible_text(row.get("pinyin"))
        if not clean_hanzi or not example:
            raise ValueError(f"Row id {word_id} has empty hanzi or example_zh")

        normalized.append({
            "id": word_id,
            "word": clean_hanzi,
            "pinyin": pinyin,
            "example": example,
        })

    normalized.sort(key=lambda r: r["id"])
    return normalized[:limit] if limit is not None else normalized


def output_path(level: str, word_id: int, kind: str) -> Path:
    folder = "words" if kind == "word" else "examples"
    return REPO_ROOT / "database" / "prebuilt_audio" / level / folder / f"{word_id:04d}.mp3"


async def generate_edge_audio_bytes(text: str, voice: str, kind: str = "word") -> bytes:
    clean = text.strip()
    rate = "+0%"
    # For standalone single-character words, use full stop and moderate pacing
    # to guarantee clean terminal pitch contour and full initial/final articulation
    if kind == "word" and len(clean) == 1 and not re.search(r"[，。？！、]", clean):
        clean = f"{clean}。"
        rate = "-6%"
    comm = edge_tts.Communicate(clean, voice, rate=rate)
    audio_data = b""
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            audio_data += chunk["data"]
    if not audio_data:
        raise RuntimeError(f"Edge TTS returned empty audio for: {text}")
    return audio_data


def encode_mp3(audio_data: bytes, destination: Path, bitrate: str) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tf:
        tf.write(audio_data)
        temp_input = tf.name

    temporary = destination.with_suffix(".mp3.tmp")
    try:
        subprocess.run([
            "ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", temp_input,
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


def update_manifest(level: str, voice: str) -> None:
    manifest_dir = REPO_ROOT / "database" / "prebuilt_audio" / level
    manifest_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = manifest_dir / "manifest.json"

    vocab_file = get_vocab_path(level)
    if not vocab_file.is_file():
        return
    with vocab_file.open(encoding="utf-8") as h:
        rows = json.load(h)

    items: dict[str, dict[str, str]] = {}
    total_words = 0
    total_examples = 0

    for row in rows:
        row_id = str(row["id"])
        clips: dict[str, str] = {}
        for kind in ("word", "example"):
            audio_file = output_path(level, int(row_id), kind)
            if audio_file.is_file() and audio_file.stat().st_size >= 256:
                digest = hashlib.sha256(audio_file.read_bytes()).hexdigest()[:12]
                clips[kind] = f"{audio_file.relative_to(REPO_ROOT).as_posix()}?v={digest}"
                if kind == "word":
                    total_words += 1
                else:
                    total_examples += 1
        if clips:
            items[row_id] = clips

    manifest = {
        "version": 1,
        "level": level,
        "engine": "EdgeTTS",
        "voice": voice,
        "speed": 1.0,
        "items": items,
    }

    temp_path = manifest_path.with_suffix(".json.tmp")
    temp_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temp_path.replace(manifest_path)
    print(f"Updated manifest: {manifest_path} ({len(items)} items, {total_words} words, {total_examples} examples)")

    try:
        if str(REPO_ROOT) not in sys.path:
            sys.path.insert(0, str(REPO_ROOT))
        from tools.build_hanzi_audio_map import main as update_global_map
        update_global_map()
    except Exception as e:
        print(f"Global Hanzi audio map sync notice: {e}")


def git_commit_and_push(batch_count: int, level: str) -> None:
    try:
        manifest_path = REPO_ROOT / "database" / "prebuilt_audio" / level / "manifest.json"
        audio_dir = REPO_ROOT / "database" / "prebuilt_audio" / level
        hanzi_map_path = REPO_ROOT / "database" / "prebuilt_audio" / "hanzi_audio_map.json"
        print(f"\n[>>> GIT] Committing and pushing batch of {batch_count} audio clips for {level.upper()} to main...", flush=True)
        files_to_add = [str(audio_dir), str(manifest_path)]
        if hanzi_map_path.is_file():
            files_to_add.append(str(hanzi_map_path))
        subprocess.run(["git", "add"] + files_to_add, cwd=REPO_ROOT, check=True)
        commit_msg = f"feat(audio): batch generate prebuilt audio via EdgeTTS ({level.upper()}: +{batch_count} clips)"
        res = subprocess.run(["git", "commit", "-m", commit_msg], cwd=REPO_ROOT, capture_output=True, text=True)
        print(f"[>>> GIT] {res.stdout.strip()}", flush=True)
        push_res = subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=REPO_ROOT, capture_output=True, text=True)
        if push_res.returncode != 0:
            subprocess.run(["git", "pull", "--rebase", "origin", "main"], cwd=REPO_ROOT, capture_output=True, text=True)
            push_res = subprocess.run(["git", "push", "origin", "HEAD:main"], cwd=REPO_ROOT, capture_output=True, text=True)
        print(f"[>>> GIT] Push result: {push_res.stdout.strip() or push_res.stderr.strip() or 'OK'}\n", flush=True)
    except Exception as e:
        print(f"[!] Warning: git commit/push encountered error: {e}", flush=True)


async def async_main() -> int:
    args = parse_args()

    ids_filter = {int(x.strip()) for x in args.ids.split(",") if x.strip()} if args.ids else None
    rows = load_rows(args.level, args.start_id, args.limit, ids_filter)

    kinds = ["word", "example"] if args.kind == "both" else [args.kind]
    tasks = []
    for r in rows:
        for k in kinds:
            dest = output_path(args.level, r["id"], k)
            tasks.append({
                "id": r["id"],
                "kind": k,
                "text": r["word"] if k == "word" else r["example"],
                "output": dest,
            })

    # Filter out existing clips unless overwrite is specified
    pending = []
    for t in tasks:
        if args.overwrite or not t["output"].is_file() or t["output"].stat().st_size < 256:
            pending.append(t)

    print(f"Level: {args.level.upper()}")
    print(f"Total planned tasks: {len(tasks)} ({len(pending)} pending, {len(tasks) - len(pending)} already exist)")
    print(f"Engine: Microsoft Edge Neural TTS | Voice: {args.voice} | Bitrate: {args.bitrate}")
    print(f"Delay between requests: {args.delay_seconds:.2f}s | Batch size: {args.batch_size} words ({args.batch_size * len(kinds)} clips)")

    if args.dry_run:
        print("\n[DRY RUN] First 5 pending clips:")
        for t in pending[:5]:
            print(f"  [{t['kind']:7s}] #{t['id']:04d}: {t['text']} -> {t['output']}")
        return 0

    if not pending:
        print("All audio clips are already generated!")
        if not args.skip_manifest:
            update_manifest(args.level, args.voice)
        return 0

    success_count = 0
    uncommitted_clips = 0
    batch_target_clips = args.batch_size * len(kinds)
    t_start = time.time()

    for i, task in enumerate(pending, 1):
        print(f"[{i}/{len(pending)}] Generating #{task['id']:04d} ({task['kind']}): {task['text']} ...", end="", flush=True)

        for attempt in range(4):
            try:
                raw_bytes = await generate_edge_audio_bytes(task["text"], args.voice, task["kind"])
                encode_mp3(raw_bytes, task["output"], args.bitrate)
                file_size_kb = task["output"].stat().st_size / 1024
                print(f" OK ({file_size_kb:.1f} KB)")
                success_count += 1
                uncommitted_clips += 1
                break
            except Exception as exc:
                if attempt == 3:
                    print(f" FAILED: {exc}")
                else:
                    await asyncio.sleep(1.0 * (attempt + 1))

        # Commit and push periodically
        if uncommitted_clips >= batch_target_clips:
            if not args.skip_manifest:
                update_manifest(args.level, args.voice)
            if args.auto_commit:
                git_commit_and_push(uncommitted_clips, args.level)
                uncommitted_clips = 0
        elif not args.skip_manifest and success_count % 25 == 0:
            update_manifest(args.level, args.voice)

        if i < len(pending) and args.delay_seconds > 0:
            await asyncio.sleep(args.delay_seconds)

    elapsed = time.time() - t_start
    print(f"\nDone! Successfully generated {success_count}/{len(pending)} clips in {elapsed:.1f}s ({elapsed/max(1, success_count):.2f}s/clip).")

    if not args.skip_manifest:
        update_manifest(args.level, args.voice)

    if args.auto_commit and uncommitted_clips > 0:
        git_commit_and_push(uncommitted_clips, args.level)

    return 0


def main() -> int:
    return asyncio.run(async_main())


if __name__ == "__main__":
    sys.exit(main())
