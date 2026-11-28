#!/usr/bin/env python3
"""Targeted Audio Regeneration & Re-Verification for Stage 2 Audit Failures.

Reads FAIL items from database/audit/audio_audit.json, regenerates them with
Edge Neural TTS (zh-CN-XiaoxiaoNeural) at -15% rate for standalone words and
conservative -65dB silence trimming, re-verifies with Whisper (and Gemini Audio
for polyphones), updates level manifests, and syncs hanzi_audio_map.json.
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile
from typing import Any

import edge_tts
import whisper

from audit_audio_stage2 import (
    DEFAULT_AUDIT_PATH,
    DEFAULT_GEMINI_MODEL,
    DEFAULT_WHISPER_MODEL,
    SENTENCE_INITIAL_PROMPT,
    WORD_INITIAL_PROMPT,
    check_with_gemini_audio,
    classify_whisper_match,
    load_api_keys,
    save_audit,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
PREBUILT_AUDIO_ROOT = REPO_ROOT / "database" / "prebuilt_audio"
DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural"
DEFAULT_BITRATE = "64k"
WORD_REGEN_RATE = "-15%"
SENTENCE_REGEN_RATE = "+0%"
MIN_FILE_BYTES = 512

# Conservative trim (-65dB, 0.15s padding): prevents clipping soft onsets and nasal codas.
SILENCE_FILTER = (
    "silenceremove=start_periods=1:start_duration=0.01:start_threshold=-65dB:start_silence=0.15,"
    "areverse,silenceremove=start_periods=1:start_duration=0.05:start_threshold=-65dB:start_silence=0.15,areverse,"
    "loudnorm=I=-18:TP=-2:LRA=7"
)


def file_md5_short(path: Path) -> str:
    """Return 12-char MD5 hex digest for cache-busting manifest URLs."""
    return hashlib.md5(path.read_bytes()).hexdigest()[:12]


async def synthesize_edge_bytes(text: str, voice: str, kind: str) -> bytes:
    """Generate raw MP3 bytes from Microsoft Edge Neural TTS."""
    clean = text.strip()
    rate = SENTENCE_REGEN_RATE
    if kind == "word" and not re.search(r"[，。？！、]", clean):
        clean = f"{clean}。"
        rate = WORD_REGEN_RATE
    comm = edge_tts.Communicate(clean, voice, rate=rate)
    chunks: list[bytes] = []
    async for chunk in comm.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    data = b"".join(chunks)
    if not data:
        raise RuntimeError(f"Edge TTS returned empty audio for: {text}")
    return data


def encode_normalized_mp3(raw_audio: bytes, destination: Path, bitrate: str = DEFAULT_BITRATE) -> None:
    """Normalize audio to 24kHz Mono 64kbps MP3 with conservative silence trimming."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tf:
        tf.write(raw_audio)
        temp_in = tf.name

    temp_out = destination.with_suffix(".mp3.tmp")
    try:
        subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", temp_in,
                "-af", SILENCE_FILTER,
                "-ar", "24000", "-ac", "1",
                "-codec:a", "libmp3lame", "-b:a", bitrate,
                "-map_metadata", "-1", "-f", "mp3", str(temp_out),
            ],
            check=True,
        )
        if temp_out.stat().st_size < MIN_FILE_BYTES:
            raise RuntimeError(f"Normalized MP3 too small: {destination}")
        temp_out.replace(destination)
    finally:
        for p in (temp_in, temp_out):
            try:
                os.remove(p)
            except OSError:
                pass


def update_level_manifest(level_dir: Path, updated_items: list[dict[str, Any]]) -> None:
    """Update versioned URLs and hashes in manifest.json for modified clips."""
    manifest_path = level_dir / "manifest.json"
    if not manifest_path.is_file():
        return
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    items_map = manifest.get("items")
    if not isinstance(items_map, dict):
        return

    changed = False
    for item in updated_items:
        mp3_path = REPO_ROOT / item["path"]
        if not mp3_path.is_file():
            continue
        new_hash = file_md5_short(mp3_path)
        rel_url = f"{item['path']}?v={new_hash}"

        if item["category"] == "vocab":
            key = f"{item['word_id']:04d}" if isinstance(item["word_id"], int) else str(item["word_id"])
            entry = items_map.get(key)
            if isinstance(entry, dict):
                field = "word" if item["kind"] == "word" else "example"
                entry[field] = rel_url
                changed = True
        else:
            key = str(item["word_id"])
            entry = items_map.get(key)
            if isinstance(entry, dict) and "url" in entry:
                entry["url"] = rel_url
                changed = True

    if changed:
        manifest["updated_at"] = datetime.now(timezone.utc).isoformat()
        manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit-file", type=Path, default=DEFAULT_AUDIT_PATH)
    parser.add_argument("--whisper-model", default=DEFAULT_WHISPER_MODEL)
    parser.add_argument("--gemini-model", default=DEFAULT_GEMINI_MODEL)
    parser.add_argument("--tier", type=int, choices=[1, 2, 3])
    parser.add_argument("--level")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--skip-gemini", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    return parser.parse_args()


async def main_async(args: argparse.Namespace) -> None:
    data = json.loads(args.audit_file.read_text(encoding="utf-8"))
    items: list[dict[str, Any]] = data["items"]

    to_fix: list[dict[str, Any]] = []
    for item in items:
        if item.get("stage2_status") != "FAIL":
            continue
        if not item.get("expected_text"):
            continue
        if args.tier is not None and item.get("priority_tier") != args.tier:
            continue
        if args.level and item.get("level") != args.level:
            continue
        to_fix.append(item)

    if args.limit is not None:
        to_fix = to_fix[:args.limit]

    print(f"Found {len(to_fix)} FAIL items to regenerate.")
    if args.dry_run or not to_fix:
        for item in to_fix[:20]:
            print(f"  [DRY-RUN] {item['id']} ({item['expected_text']} | {item.get('fail_reason')})")
        return

    print(f"Loading Whisper model '{args.whisper_model}' for post-regeneration verification...")
    model = whisper.load_model(args.whisper_model)
    api_keys = [] if args.skip_gemini else load_api_keys()
    key_idx = 0

    fixed_by_level: dict[str, list[dict[str, Any]]] = {}
    fixed_count = 0
    still_failing = 0

    for idx, item in enumerate(to_fix, start=1):
        dest = REPO_ROOT / item["path"]
        raw = await synthesize_edge_bytes(item["expected_text"], DEFAULT_VOICE, item["kind"])
        encode_normalized_mp3(raw, dest)

        initial_prompt = WORD_INITIAL_PROMPT if item["kind"] == "word" else SENTENCE_INITIAL_PROMPT
        res = model.transcribe(str(dest), language="zh", initial_prompt=initial_prompt, fp16=False)
        whisper_text = (res.get("text") or "").strip()
        whisper_match = classify_whisper_match(item["expected_text"], whisper_text)

        item["whisper_text"] = whisper_text
        item["whisper_match"] = whisper_match
        item["regenerated_at"] = datetime.now(timezone.utc).isoformat()

        ok = whisper_match in {"exact", "pinyin_match"}
        need_gemini = (
            not args.skip_gemini
            and api_keys
            and (
                "POLYPHONE_RISK" in (item.get("stage1_flags") or [])
                or (not ok and item.get("kind") == "word")
            )
        )
        if need_gemini:
            gem, key_idx = check_with_gemini_audio(
                api_keys, key_idx, dest, item["expected_text"], item.get("expected_pinyin", ""), args.gemini_model
            )
            if gem and "error" not in gem:
                tone_ok = bool(gem.get("tone_correct", False))
                onset_ok = bool(gem.get("onset_clear", False))
                item["gemini_tone_ok"] = tone_ok and onset_ok
                item["gemini_heard_pinyin"] = gem.get("heard_pinyin")
                ok = tone_ok and onset_ok
                if not ok:
                    item["fail_reason"] = f"POST_REGEN_GEMINI_FAIL: {gem.get('reason')}"

        if ok:
            item["stage2_status"] = "FIXED"
            item["fail_reason"] = None
            fixed_count += 1
        else:
            still_failing += 1
            if not item.get("fail_reason"):
                item["fail_reason"] = f"POST_REGEN_WHISPER_MISMATCH: heard '{whisper_text}'"

        fixed_by_level.setdefault(item["level"], []).append(item)
        if idx % 20 == 0 or idx == len(to_fix):
            save_audit(args.audit_file, data)
            print(f"  Regenerated {idx}/{len(to_fix)} (FIXED={fixed_count}, STILL_FAIL={still_failing})")

    for level_name, level_items in fixed_by_level.items():
        level_dir = PREBUILT_AUDIO_ROOT / level_name
        if level_dir.is_dir():
            update_level_manifest(level_dir, level_items)

    subprocess.run(["python3", str(REPO_ROOT / "tools" / "build_hanzi_audio_map.py")], check=True)
    save_audit(args.audit_file, data)
    print(f"Done: FIXED={fixed_count}, STILL_FAIL={still_failing}. Manifests and hanzi_audio_map.json synced.")


def main() -> None:
    asyncio.run(main_async(parse_args()))


if __name__ == "__main__":
    main()
