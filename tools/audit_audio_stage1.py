#!/usr/bin/env python3
"""Stage 1 Audio Audit: Local acoustic heuristic & polyphone scanner.

Indexes all prebuilt MP3 audio clips under database/prebuilt_audio/ (vocab words,
examples, curriculum, listening phrases, and graded readings), resolves expected
Chinese text and pinyin, runs ffprobe/ffmpeg acoustic checks in parallel, flags
polyphonic words, and writes database/audit/audio_audit.json.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess
from typing import Any

from pypinyin import Style, pinyin as get_pinyin

REPO_ROOT = Path(__file__).resolve().parents[1]
PREBUILT_AUDIO_ROOT = REPO_ROOT / "database" / "prebuilt_audio"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "database" / "audit" / "audio_audit.json"
SCHEMA_VERSION = "1.0.0"

# Priority tiers for Stage 2 and regeneration ordering
TIER_1_LEVELS = {"hsk1", "hsk2", "hsk3", "hsk4", "hsk30_1", "hsk30_2", "hsk30_3", "hsk30_4"}
TIER_2_LEVELS = {"hsk5", "hsk6", "hsk30_5", "hsk30_6", "hsk30_7", "hsk30_8", "hsk30_9"}

# Acoustic thresholds (named constants, no magic numbers)
MIN_FILE_BYTES = 512
MIN_MONOSYLLABLE_DURATION_SEC = 0.45
MIN_MULTI_CHAR_DURATION_PER_CHAR_SEC = 0.14
MAX_DURATION_PER_CHAR_SEC = 0.95
MIN_SENTENCE_DURATION_SEC = 0.55
MAX_DURATION_FLOOR_SEC = 2.5
LOW_VOLUME_MAX_DB = -30.0
FFPROBE_TIMEOUT_SEC = 10
DEFAULT_WORKERS = 8

HANZI_CHAR_RE = re.compile(r"[\u4e00-\u9fff]")
PAREN_ANNOTATION_RE = re.compile(r"[（\(].*?[）\)]")
LEADING_PUNCT_RE = re.compile(r"^[，。？！、\s]+")
MAX_VOL_RE = re.compile(r"max_volume:\s*([-\d.]+)\s*dB")
MEAN_VOL_RE = re.compile(r"mean_volume:\s*([-\d.]+)\s*dB")


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def clean_visible_text(value: Any) -> str:
    """Extract clean visible text without HTML tags."""
    parser = _TextExtractor()
    parser.feed(html.unescape(str(value or "")))
    parser.close()
    return "".join(parser.parts).strip()


def count_hanzi(text: str) -> int:
    """Return the number of CJK Unified Ideograph characters in text."""
    return len(HANZI_CHAR_RE.findall(text))


def detect_polyphone_risk(text: str) -> list[str]:
    """Return characters in text that have multiple Mandarin readings."""
    hanzi_chars = HANZI_CHAR_RE.findall(text)
    if not hanzi_chars:
        return []
    readings = get_pinyin("".join(hanzi_chars), style=Style.TONE, heteronym=True)
    polyphones: list[str] = []
    for ch, char_readings in zip(hanzi_chars, readings):
        if len(set(char_readings)) > 1 and ch not in polyphones:
            polyphones.append(ch)
    return polyphones


def compute_priority_tier(level: str, category: str) -> int:
    """Assign priority tier: 1 (HSK 1-4 vocab), 2 (HSK 5-9 & topics), 3 (other)."""
    if category == "vocab" and level in TIER_1_LEVELS:
        return 1
    if category == "vocab" and (level in TIER_2_LEVELS or level.startswith("topic_")):
        return 2
    return 3


def get_vocab_path(level: str) -> Path | None:
    """Resolve vocabulary JSON path for a level directory name."""
    if level.startswith("hsk30_"):
        num = level.removeprefix("hsk30_")
        candidate = REPO_ROOT / "database" / "vocabs" / "hsk3_0" / f"level{num}_vocabularies.json"
        return candidate if candidate.is_file() else None
    if level.startswith("topic_"):
        slug = level.removeprefix("topic_")
        candidate = REPO_ROOT / "database" / "vocabs" / "topics" / f"{slug}.json"
        return candidate if candidate.is_file() else None
    candidate = REPO_ROOT / "database" / "vocabs" / f"{level}_vocabularies.json"
    return candidate if candidate.is_file() else None


def collect_vocab_items() -> list[dict[str, Any]]:
    """Index all vocab word and example MP3s across HSK 2.0, HSK 3.0, and topics."""
    items: list[dict[str, Any]] = []
    for level_dir in sorted(PREBUILT_AUDIO_ROOT.iterdir()):
        if not level_dir.is_dir():
            continue
        level = level_dir.name
        if level in {"curriculum", "listening_phrases", "readings"}:
            continue
        vocab_path = get_vocab_path(level)
        if not vocab_path:
            continue

        rows = json.loads(vocab_path.read_text(encoding="utf-8"))
        row_by_id = {int(r["id"]): r for r in rows if "id" in r}

        for kind, folder in (("word", "words"), ("example", "examples")):
            folder_path = level_dir / folder
            if not folder_path.is_dir():
                continue
            for mp3_path in sorted(folder_path.glob("*.mp3")):
                try:
                    word_id = int(mp3_path.stem)
                except ValueError:
                    continue
                row = row_by_id.get(word_id, {})
                raw_hanzi = str(row.get("hanzi") or "")
                clean_hanzi = PAREN_ANNOTATION_RE.sub("", raw_hanzi).strip() or raw_hanzi
                expected_text = clean_hanzi if kind == "word" else clean_visible_text(row.get("example_zh"))
                expected_pinyin = clean_visible_text(row.get("pinyin")) if kind == "word" else ""
                items.append({
                    "id": f"{level}:{kind}:{mp3_path.stem}",
                    "category": "vocab",
                    "level": level,
                    "kind": kind,
                    "word_id": word_id,
                    "path": str(mp3_path.relative_to(REPO_ROOT)),
                    "expected_text": expected_text,
                    "expected_pinyin": expected_pinyin,
                    "priority_tier": compute_priority_tier(level, "vocab"),
                })
    return items


def collect_manifest_items(folder_name: str, category: str) -> list[dict[str, Any]]:
    """Index MP3s from curriculum or listening_phrases manifest.json."""
    folder_path = PREBUILT_AUDIO_ROOT / folder_name
    manifest_path = folder_path / "manifest.json"
    if not folder_path.is_dir():
        return []

    manifest_items: dict[str, Any] = {}
    if manifest_path.is_file():
        manifest_items = json.loads(manifest_path.read_text(encoding="utf-8")).get("items", {})

    items: list[dict[str, Any]] = []
    for mp3_path in sorted(folder_path.glob("*.mp3")):
        key = mp3_path.stem
        meta = manifest_items.get(key, {})
        expected_text = clean_visible_text(meta.get("tts_text") or meta.get("text") or "")
        items.append({
            "id": f"{folder_name}:{key}",
            "category": category,
            "level": folder_name,
            "kind": meta.get("kind") or category,
            "word_id": key,
            "path": str(mp3_path.relative_to(REPO_ROOT)),
            "expected_text": expected_text,
            "expected_pinyin": "",
            "priority_tier": compute_priority_tier(folder_name, category),
        })
    return items


def collect_reading_items() -> list[dict[str, Any]]:
    """Index MP3s under database/prebuilt_audio/readings/ using readings manifest."""
    readings_audio_root = PREBUILT_AUDIO_ROOT / "readings"
    manifest_path = REPO_ROOT / "database" / "readings" / "manifest.json"
    if not readings_audio_root.is_dir() or not manifest_path.is_file():
        return []

    stories = json.loads(manifest_path.read_text(encoding="utf-8"))
    story_map = {s["id"]: s for s in stories if "id" in s}

    items: list[dict[str, Any]] = []
    for story_dir in sorted(readings_audio_root.iterdir()):
        if not story_dir.is_dir():
            continue
        story_id = story_dir.name
        story_meta = story_map.get(story_id, {})
        sentence_by_idx: dict[int, str] = {}

        file_rel = story_meta.get("file") or story_meta.get("path")
        if not file_rel and story_meta.get("level"):
            file_rel = f"database/readings/{story_meta['level'].lower()}/{story_id}.json"
        if file_rel and (REPO_ROOT / file_rel).is_file():
            story_data = json.loads((REPO_ROOT / file_rel).read_text(encoding="utf-8"))
            for idx, sent in enumerate(story_data.get("sentences", []), start=1):
                if sent.get("zh"):
                    txt = clean_visible_text(sent["zh"])
                elif sent.get("tokens"):
                    txt = clean_visible_text("".join(t.get("text", "") for t in sent["tokens"]))
                else:
                    txt = clean_visible_text(sent.get("text", ""))
                sentence_by_idx[idx] = LEADING_PUNCT_RE.sub("", txt)

        for mp3_path in sorted(story_dir.glob("*.mp3")):
            stem = mp3_path.stem
            idx_num = int(stem[1:]) if stem.startswith("s") and stem[1:].isdigit() else -1
            expected_text = sentence_by_idx.get(idx_num, "")
            items.append({
                "id": f"readings:{story_id}:{stem}",
                "category": "readings",
                "level": str(story_meta.get("level") or "readings").lower(),
                "kind": "reading_sentence",
                "word_id": f"{story_id}:{stem}",
                "path": str(mp3_path.relative_to(REPO_ROOT)),
                "expected_text": expected_text,
                "expected_pinyin": "",
                "priority_tier": 3,
            })
    return items


def probe_audio_file(item: dict[str, Any], check_volume: bool) -> dict[str, Any]:
    """Run ffprobe (and optional ffmpeg volumedetect) on one MP3 and compute Stage 1 flags."""
    full_path = REPO_ROOT / item["path"]
    flags: list[str] = []
    duration_sec = 0.0
    sample_rate = 0
    file_bytes = full_path.stat().st_size if full_path.is_file() else 0
    max_volume_db: float | None = None
    mean_volume_db: float | None = None

    if file_bytes < MIN_FILE_BYTES:
        flags.append("MISSING_OR_CORRUPT")
    else:
        try:
            probe = subprocess.run(
                [
                    "ffprobe", "-v", "error",
                    "-show_entries", "format=duration:stream=sample_rate",
                    "-of", "json", str(full_path),
                ],
                capture_output=True, text=True, timeout=FFPROBE_TIMEOUT_SEC, check=True,
            )
            info = json.loads(probe.stdout)
            duration_sec = float(info.get("format", {}).get("duration") or 0.0)
            streams = info.get("streams") or []
            if streams:
                sample_rate = int(streams[0].get("sample_rate") or 0)
        except Exception:
            flags.append("MISSING_OR_CORRUPT")

        if check_volume and "MISSING_OR_CORRUPT" not in flags:
            try:
                vol = subprocess.run(
                    ["ffmpeg", "-i", str(full_path), "-af", "volumedetect", "-f", "null", "-"],
                    capture_output=True, text=True, timeout=FFPROBE_TIMEOUT_SEC,
                )
                max_m = MAX_VOL_RE.search(vol.stderr)
                mean_m = MEAN_VOL_RE.search(vol.stderr)
                if max_m:
                    max_volume_db = float(max_m.group(1))
                    if max_volume_db < LOW_VOLUME_MAX_DB:
                        flags.append("LOW_VOLUME")
                if mean_m:
                    mean_volume_db = float(mean_m.group(1))
            except Exception:
                pass

    expected_text = item["expected_text"]
    hanzi_count = count_hanzi(expected_text)
    if not expected_text:
        flags.append("MISSING_EXPECTED_TEXT")
    elif "MISSING_OR_CORRUPT" not in flags:
        if item["kind"] == "word" and hanzi_count == 1 and duration_sec < MIN_MONOSYLLABLE_DURATION_SEC:
            flags.append("TOO_SHORT_MONOSYLLABLE")
        elif hanzi_count > 1:
            min_expected = max(MIN_SENTENCE_DURATION_SEC if item["kind"] != "word" else 0.0,
                               hanzi_count * MIN_MULTI_CHAR_DURATION_PER_CHAR_SEC)
            max_expected = max(MAX_DURATION_FLOOR_SEC, hanzi_count * MAX_DURATION_PER_CHAR_SEC)
            if duration_sec < min_expected or duration_sec > max_expected:
                flags.append("DURATION_ANOMALY")

    polyphones = detect_polyphone_risk(expected_text) if item["kind"] == "word" else []
    if polyphones:
        flags.append("POLYPHONE_RISK")

    return {
        **item,
        "hanzi_count": hanzi_count,
        "polyphones": polyphones,
        "file_bytes": file_bytes,
        "duration_sec": round(duration_sec, 3),
        "sample_rate": sample_rate,
        "max_volume_db": max_volume_db,
        "mean_volume_db": mean_volume_db,
        "stage1_flags": flags,
        "stage2_status": "PENDING",
        "whisper_text": None,
        "whisper_match": None,
        "gemini_tone_ok": None,
        "fail_reason": None,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT_PATH, help="Output audit JSON path")
    parser.add_argument("--workers", type=int, default=DEFAULT_WORKERS, help="Parallel ffprobe workers")
    parser.add_argument("--check-volume", action="store_true", help="Also run ffmpeg volumedetect (slower)")
    parser.add_argument("--limit", type=int, help="Only process first N items (for smoke testing)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    all_items: list[dict[str, Any]] = []
    all_items.extend(collect_vocab_items())
    all_items.extend(collect_manifest_items("curriculum", "curriculum"))
    all_items.extend(collect_manifest_items("listening_phrases", "listening_phrases"))
    all_items.extend(collect_reading_items())
    all_items.sort(key=lambda x: (x["priority_tier"], x["level"], x["kind"], str(x["word_id"])))

    if args.limit is not None:
        all_items = all_items[:args.limit]

    print(f"Indexed {len(all_items)} MP3 files. Running Stage 1 acoustic scan ({args.workers} workers)...")
    results: list[dict[str, Any]] = [{}] * len(all_items)
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(probe_audio_file, item, args.check_volume): idx for idx, item in enumerate(all_items)}
        done = 0
        for future in as_completed(futures):
            idx = futures[future]
            results[idx] = future.result()
            done += 1
            if done % 2000 == 0 or done == len(all_items):
                print(f"  Scanned {done}/{len(all_items)}")

    flag_counts: dict[str, int] = {}
    for r in results:
        for fl in r["stage1_flags"]:
            flag_counts[fl] = flag_counts.get(fl, 0) + 1

    args.output.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": SCHEMA_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_items": len(results),
        "flag_summary": flag_counts,
        "items": results,
    }
    args.output.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Stage 1 complete -> {args.output}")
    print(f"Flag summary: {json.dumps(flag_counts, ensure_ascii=False)}")


if __name__ == "__main__":
    main()
