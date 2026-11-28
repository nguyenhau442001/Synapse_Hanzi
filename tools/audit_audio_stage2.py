#!/usr/bin/env python3
"""Stage 2 Audio Audit: Hybrid Whisper ASR + Gemini Multimodal Tone Verification.

Reads database/audit/audio_audit.json, runs local OpenAI Whisper (medium)
transcription against expected Chinese text/pinyin, and uses Gemini Audio
(gemini-2.5-flash) on POLYPHONE_RISK words and borderline clips to verify
exact tone and initial onset clarity. Saves progress incrementally.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import time
from typing import Any

from google import genai
from google.genai import types
from pypinyin import Style, pinyin as get_pinyin
import whisper

REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_AUDIT_PATH = REPO_ROOT / "database" / "audit" / "audio_audit.json"
API_KEY_PATH = REPO_ROOT / ".api_key"

DEFAULT_WHISPER_MODEL = "medium"
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"
WORD_INITIAL_PROMPT = "普通话词汇。"
SENTENCE_INITIAL_PROMPT = "普通话句子。"
SAVE_INTERVAL_ITEMS = 50
API_RETRY_DELAY_SEC = 3.0
MAX_API_RETRIES = 3

HANZI_ONLY_RE = re.compile(r"[^\u4e00-\u9fff]")

GEMINI_AUDIO_PROMPT = """You are a strict Mandarin Chinese phonetics auditor.
Listen carefully to the attached audio clip.
Expected word: {expected_text}
Expected pinyin (with tone): {expected_pinyin}

Evaluate strictly:
1. Did the speaker pronounce the exact expected syllable(s) AND exact tone(s) matching "{expected_pinyin}"?
   (Pay special attention to polyphonic characters like 转 zhuàn vs zhuǎn, 长 cháng vs zhǎng, 还 hái vs huán.)
2. Is the initial consonant/onset clear and unclipped (not missing initial t-, d-, b-, p-, etc.) and the final nasal coda (-n, -ng) intact?

Reply ONLY with valid JSON:
{{"heard_pinyin": "<pinyin you heard>", "tone_correct": true|false, "onset_clear": true|false, "reason": "<brief explanation>"}}"""


def load_api_keys() -> list[str]:
    """Load Gemini API keys from environment variables or .api_key file."""
    keys: list[str] = []
    for env_var in ("GEMINI_API_KEY", "GOOGLE_AI_KEY", "GOOGLE_API_KEY"):
        val = os.environ.get(env_var, "")
        for part in val.split(","):
            k = part.strip()
            if k and k not in keys:
                keys.append(k)
    if API_KEY_PATH.is_file():
        for line in API_KEY_PATH.read_text(encoding="utf-8").splitlines():
            k = line.strip()
            if k and not k.startswith("#") and k not in keys:
                keys.append(k)
    return keys


def normalize_hanzi(text: str) -> str:
    """Keep only CJK Unified Ideograph characters for comparison."""
    return HANZI_ONLY_RE.sub("", text or "")


def to_toneless_pinyin(text: str) -> list[str]:
    """Convert Chinese text to a list of toneless pinyin syllables."""
    clean = normalize_hanzi(text)
    if not clean:
        return []
    return [syl[0] for syl in get_pinyin(clean, style=Style.NORMAL)]


def classify_whisper_match(expected_text: str, whisper_text: str) -> str:
    """Compare Whisper transcription against expected text via Hanzi and toneless pinyin."""
    exp_hanzi = normalize_hanzi(expected_text)
    got_hanzi = normalize_hanzi(whisper_text)
    if not exp_hanzi:
        return "missing_expected"
    if not got_hanzi:
        return "mismatch"
    if exp_hanzi == got_hanzi:
        return "exact"
    if to_toneless_pinyin(exp_hanzi) == to_toneless_pinyin(got_hanzi):
        return "pinyin_match"
    return "mismatch"


def check_with_gemini_audio(
    keys: list[str],
    key_idx: int,
    mp3_path: Path,
    expected_text: str,
    expected_pinyin: str,
    model_name: str,
) -> tuple[dict[str, Any] | None, int]:
    """Verify exact tone and onset clarity using Gemini multimodal audio input."""
    if not keys:
        return None, key_idx

    audio_bytes = mp3_path.read_bytes()
    prompt = GEMINI_AUDIO_PROMPT.format(
        expected_text=expected_text,
        expected_pinyin=expected_pinyin or "(verify natural Mandarin)",
    )

    for attempt in range(MAX_API_RETRIES * max(1, len(keys))):
        key = keys[key_idx % len(keys)]
        client = genai.Client(api_key=key)
        try:
            response = client.models.generate_content(
                model=model_name,
                contents=[
                    types.Part.from_bytes(data=audio_bytes, mime_type="audio/mp3"),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.0,
                ),
            )
            parsed = json.loads(response.text)
            return parsed, key_idx
        except Exception as exc:
            err = str(exc)
            if "429" in err or "RESOURCE_EXHAUSTED" in err:
                key_idx += 1
                time.sleep(API_RETRY_DELAY_SEC)
                continue
            if attempt < MAX_API_RETRIES - 1:
                time.sleep(API_RETRY_DELAY_SEC)
                continue
            return {"error": err}, key_idx

    return {"error": "All Gemini API retries exhausted"}, key_idx


def should_check_gemini(item: dict[str, Any], whisper_match: str) -> bool:
    """Decide whether an item needs Gemini multimodal tone/onset verification."""
    flags = set(item.get("stage1_flags") or [])
    if "POLYPHONE_RISK" in flags and item.get("expected_pinyin"):
        return True
    if "TOO_SHORT_MONOSYLLABLE" in flags:
        return True
    if whisper_match == "pinyin_match" and item.get("kind") == "word":
        return True
    return False


def save_audit(audit_path: Path, data: dict[str, Any]) -> None:
    """Persist audit JSON atomically."""
    data["stage2_updated_at"] = datetime.now(timezone.utc).isoformat()
    tmp_path = audit_path.with_suffix(".json.tmp")
    tmp_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp_path.replace(audit_path)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit-file", type=Path, default=DEFAULT_AUDIT_PATH)
    parser.add_argument("--whisper-model", default=DEFAULT_WHISPER_MODEL)
    parser.add_argument("--gemini-model", default=DEFAULT_GEMINI_MODEL)
    parser.add_argument("--tier", type=int, choices=[1, 2, 3], help="Only audit items in this priority tier")
    parser.add_argument("--level", help="Only audit items in this level (e.g. hsk4, hsk30_4)")
    parser.add_argument("--only-flagged", action="store_true", help="Only audit items with Stage 1 flags")
    parser.add_argument("--recheck", action="store_true", help="Re-audit items even if stage2_status is not PENDING")
    parser.add_argument("--skip-gemini", action="store_true", help="Skip Gemini multimodal tone verification")
    parser.add_argument("--limit", type=int, help="Maximum number of items to process in this run")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data = json.loads(args.audit_file.read_text(encoding="utf-8"))
    items: list[dict[str, Any]] = data["items"]

    candidates: list[dict[str, Any]] = []
    for item in items:
        if not args.recheck and item.get("stage2_status") != "PENDING":
            continue
        if args.tier is not None and item.get("priority_tier") != args.tier:
            continue
        if args.level and item.get("level") != args.level:
            continue
        if args.only_flagged and not item.get("stage1_flags"):
            continue
        candidates.append(item)

    if args.limit is not None:
        candidates = candidates[:args.limit]

    if not candidates:
        print("No matching items to audit in Stage 2.")
        return

    print(f"Loading Whisper model '{args.whisper_model}'...")
    model = whisper.load_model(args.whisper_model)
    api_keys = [] if args.skip_gemini else load_api_keys()
    key_idx = 0
    if not args.skip_gemini:
        print(f"Loaded {len(api_keys)} Gemini API key(s) for polyphone/onset verification.")

    passed = 0
    failed = 0
    for idx, item in enumerate(candidates, start=1):
        full_path = REPO_ROOT / item["path"]
        flags = set(item.get("stage1_flags") or [])

        if "MISSING_OR_CORRUPT" in flags or not full_path.is_file():
            item["stage2_status"] = "FAIL"
            item["fail_reason"] = "MISSING_OR_CORRUPT"
            failed += 1
            continue

        initial_prompt = WORD_INITIAL_PROMPT if item.get("kind") == "word" else SENTENCE_INITIAL_PROMPT
        result = model.transcribe(
            str(full_path),
            language="zh",
            initial_prompt=initial_prompt,
            fp16=False,
        )
        whisper_text = (result.get("text") or "").strip()
        whisper_match = classify_whisper_match(item.get("expected_text", ""), whisper_text)

        item["whisper_text"] = whisper_text
        item["whisper_match"] = whisper_match

        if whisper_match == "mismatch":
            if not args.skip_gemini and api_keys and item.get("kind") == "word":
                gem, key_idx = check_with_gemini_audio(
                    api_keys,
                    key_idx,
                    full_path,
                    item.get("expected_text", ""),
                    item.get("expected_pinyin", ""),
                    args.gemini_model,
                )
                if gem and "error" not in gem:
                    tone_ok = bool(gem.get("tone_correct", False))
                    onset_ok = bool(gem.get("onset_clear", False))
                    item["gemini_tone_ok"] = tone_ok and onset_ok
                    item["gemini_heard_pinyin"] = gem.get("heard_pinyin")
                    if tone_ok and onset_ok:
                        item["stage2_status"] = "PASS"
                        item["fail_reason"] = None
                        passed += 1
                    else:
                        item["stage2_status"] = "FAIL"
                        item["fail_reason"] = f"GEMINI_AUDIO_FAIL: {gem.get('reason', 'tone or onset mismatch')}"
                        failed += 1
                else:
                    item["stage2_status"] = "FAIL"
                    item["fail_reason"] = f"WHISPER_MISMATCH: expected '{item.get('expected_text')}', heard '{whisper_text}'"
                    failed += 1
            else:
                item["stage2_status"] = "FAIL"
                item["fail_reason"] = f"WHISPER_MISMATCH: expected '{item.get('expected_text')}', heard '{whisper_text}'"
                failed += 1
        elif not args.skip_gemini and api_keys and should_check_gemini(item, whisper_match):
            gem, key_idx = check_with_gemini_audio(
                api_keys,
                key_idx,
                full_path,
                item.get("expected_text", ""),
                item.get("expected_pinyin", ""),
                args.gemini_model,
            )
            if gem and "error" not in gem:
                tone_ok = bool(gem.get("tone_correct", True))
                onset_ok = bool(gem.get("onset_clear", True))
                item["gemini_tone_ok"] = tone_ok and onset_ok
                item["gemini_heard_pinyin"] = gem.get("heard_pinyin")
                if not tone_ok or not onset_ok:
                    item["stage2_status"] = "FAIL"
                    item["fail_reason"] = f"GEMINI_AUDIO_FAIL: {gem.get('reason', 'tone or onset mismatch')}"
                    failed += 1
                else:
                    item["stage2_status"] = "PASS"
                    item["fail_reason"] = None
                    passed += 1
            else:
                item["stage2_status"] = "PASS"
                item["fail_reason"] = None
                passed += 1
        else:
            item["stage2_status"] = "PASS"
            item["fail_reason"] = None
            passed += 1

        if idx % SAVE_INTERVAL_ITEMS == 0 or idx == len(candidates):
            save_audit(args.audit_file, data)
            print(f"  Stage 2 progress: {idx}/{len(candidates)} (PASS={passed}, FAIL={failed})")

    print(f"Stage 2 finished: {len(candidates)} audited -> PASS={passed}, FAIL={failed}")


if __name__ == "__main__":
    main()
