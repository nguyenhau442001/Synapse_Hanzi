#!/usr/bin/env python3
"""Generate prebuilt Edge TTS Mandarin audio for HSK 3.0 curriculum lessons.

Covers grammar example sentences and dialogue lines across curriculum levels,
writes database/prebuilt_audio/curriculum/manifest.json, and syncs
database/prebuilt_audio/hanzi_audio_map.json.
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import json
from pathlib import Path
import sys
import time
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from tools.build_hanzi_audio_map import main as update_global_map
from tools.generate_hsk_audio_edge import (
    DEFAULT_BITRATE,
    DEFAULT_VOICE,
    encode_mp3,
    generate_edge_audio_bytes,
)

CURRICULUM_DIR = REPO_ROOT / "database" / "curriculum" / "hsk30"
OUTPUT_DIR = REPO_ROOT / "database" / "prebuilt_audio" / "curriculum"
MANIFEST_PATH = OUTPUT_DIR / "manifest.json"
HANZI_MAP_PATH = REPO_ROOT / "database" / "prebuilt_audio" / "hanzi_audio_map.json"
MIN_MP3_BYTES = 256


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--level", help="Optional level number (1..7) to limit generation")
    parser.add_argument("--voice", default=DEFAULT_VOICE, help="Edge TTS voice name")
    parser.add_argument("--bitrate", default=DEFAULT_BITRATE, help="Target MP3 bitrate")
    parser.add_argument("--delay-seconds", type=float, default=0.0, help="Delay between TTS requests")
    parser.add_argument("--concurrency", type=int, default=8, help="Concurrent TTS + ffmpeg workers")
    parser.add_argument("--limit", type=int, help="Maximum number of new clips to generate")
    parser.add_argument("--overwrite", action="store_true", help="Regenerate existing MP3 files")
    parser.add_argument("--dry-run", action="store_true", help="Print planned clips without generating")
    return parser.parse_args()


def collect_clips(level_filter: str | None) -> list[dict[str, str]]:
    """Collect grammar examples and dialogue lines from curriculum level files."""
    files = (
        [CURRICULUM_DIR / f"level{level_filter}.json"]
        if level_filter
        else sorted(CURRICULUM_DIR.glob("level*.json"))
    )
    clips: list[dict[str, str]] = []
    seen_texts: set[str] = set()

    for path in files:
        if not path.is_file():
            raise FileNotFoundError(f"Curriculum file not found: {path}")
        with path.open(encoding="utf-8") as handle:
            data = json.load(handle)

        for lesson in data.get("lessons", []):
            lesson_key = str(lesson.get("key") or "").strip()
            if not lesson_key:
                continue

            g_idx = 0
            for grammar in lesson.get("grammar", []):
                for ex in grammar.get("examples", []):
                    text = str(ex.get("zh") or "").strip()
                    if not text or text in seen_texts:
                        continue
                    seen_texts.add(text)
                    g_idx += 1
                    clips.append({
                        "id": f"{lesson_key}_g{g_idx:02d}",
                        "lesson": lesson_key,
                        "kind": "grammar",
                        "text": text,
                    })

            d_idx = 0
            for line in lesson.get("dialogue", []):
                text = str(line.get("zh") or "").strip()
                if not text or text in seen_texts:
                    continue
                seen_texts.add(text)
                d_idx += 1
                clips.append({
                    "id": f"{lesson_key}_d{d_idx:02d}",
                    "lesson": lesson_key,
                    "kind": "dialogue",
                    "text": text,
                })

    return clips


def load_existing_hanzi_map() -> dict[str, str]:
    if not HANZI_MAP_PATH.is_file():
        return {}
    try:
        with HANZI_MAP_PATH.open(encoding="utf-8") as handle:
            data = json.load(handle)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def write_manifest(clips: list[dict[str, str]], voice: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    items: dict[str, dict[str, str]] = {}
    for clip in clips:
        mp3_path = OUTPUT_DIR / f"{clip['id']}.mp3"
        if mp3_path.is_file() and mp3_path.stat().st_size >= MIN_MP3_BYTES:
            digest = hashlib.sha256(mp3_path.read_bytes()).hexdigest()[:12]
            items[clip["id"]] = {
                "text": clip["text"],
                "url": f"{mp3_path.relative_to(REPO_ROOT).as_posix()}?v={digest}",
                "lesson": clip["lesson"],
                "kind": clip["kind"],
            }

    manifest: dict[str, Any] = {
        "version": 1,
        "voice": voice,
        "items": items,
    }
    tmp = MANIFEST_PATH.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(MANIFEST_PATH)
    print(f"Updated curriculum manifest: {MANIFEST_PATH} ({len(items)} clips)")


async def generate_all(args: argparse.Namespace) -> None:
    all_clips = collect_clips(None)
    target_clips = collect_clips(args.level)
    existing_map = load_existing_hanzi_map()

    pending: list[dict[str, str]] = []
    for clip in target_clips:
        mp3_path = OUTPUT_DIR / f"{clip['id']}.mp3"
        already_on_disk = mp3_path.is_file() and mp3_path.stat().st_size >= MIN_MP3_BYTES
        already_mapped = clip["text"] in existing_map and not str(existing_map[clip["text"]]).startswith("database/prebuilt_audio/curriculum/")
        if not args.overwrite and (already_on_disk or already_mapped):
            continue
        pending.append(clip)

    if args.limit is not None:
        pending = pending[:args.limit]

    print(f"Curriculum clips total: {len(target_clips)}, pending generation: {len(pending)}")
    if args.dry_run:
        for clip in pending[:20]:
            print(f"  [dry-run] {clip['id']} ({clip['kind']}): {clip['text']}")
        return

    semaphore = asyncio.Semaphore(max(1, args.concurrency))
    completed = 0
    total = len(pending)

    async def process_clip(clip: dict[str, str]) -> None:
        nonlocal completed
        mp3_path = OUTPUT_DIR / f"{clip['id']}.mp3"
        async with semaphore:
            audio_bytes = await generate_edge_audio_bytes(clip["text"], args.voice, kind="example")
            await asyncio.to_thread(encode_mp3, audio_bytes, mp3_path, args.bitrate)
            if args.delay_seconds > 0:
                await asyncio.sleep(args.delay_seconds)
        completed += 1
        if completed % 25 == 0 or completed == total:
            print(f"  [{completed}/{total}] Generated {clip['id']}.mp3", flush=True)

    await asyncio.gather(*(process_clip(clip) for clip in pending))

    write_manifest(all_clips, args.voice)
    update_global_map()


def main() -> None:
    args = parse_args()
    asyncio.run(generate_all(args))


if __name__ == "__main__":
    main()
