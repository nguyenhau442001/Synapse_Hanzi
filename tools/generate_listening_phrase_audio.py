#!/usr/bin/env python3
"""
tools/generate_listening_phrase_audio.py

Generates prebuilt Edge Neural TTS audio for listening `key_expressions`
phrases that have no entry in hanzi_audio_map.json yet, writes them to
database/prebuilt_audio/listening_phrases/ and records them in that folder's
manifest.json ({items: {id: {text, tts_text, url}}}).

Grammar patterns such as 不只是……也是…… are spoken as the passage clause that
actually uses the pattern (so particles like 了 / 过 keep their natural
reading); without such a clause the parts are joined with a Chinese comma.

Run tools/build_hanzi_audio_map.py afterwards to refresh the global map.

Usage: python3 tools/generate_listening_phrase_audio.py
"""

import asyncio
import hashlib
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "database/prebuilt_audio/listening_phrases"
MANIFEST = OUT_DIR / "manifest.json"
AUDIO_MAP = ROOT / "database/prebuilt_audio/hanzi_audio_map.json"
SOURCE_GLOBS = ["database/listening/*.json", "database/exams/hsk30/**/*.json"]
VOICE = "zh-CN-XiaoxiaoNeural"
BITRATE = "64k"
SAMPLE_RATE = "24000"
HASH_LEN = 12
MIN_AUDIO_BYTES = 256
ELLIPSIS_RE = re.compile(r"[…\.]{2,}|…")
CLAUSE_RE = re.compile(r"[^，。！？；：,!?;:“”\"]+")
MAX_GAP_CHARS = 16
# Trim only leading and trailing silence so internal pattern pauses survive.
EDGE_TRIM = "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB"
AUDIO_FILTER = f"{EDGE_TRIM},areverse,{EDGE_TRIM},areverse,loudnorm=I=-18:TP=-2:LRA=7"


def pattern_parts(phrase):
    return [p.strip() for p in ELLIPSIS_RE.split(phrase) if p.strip()]


def example_clause(parts, sentences):
    """Shortest run of whole clauses in the passage that contains every part in order."""
    gap = ".{0,%d}?" % MAX_GAP_CHARS
    regex = re.compile(gap.join(re.escape(p) for p in parts))
    best = None
    for sent in sentences:
        match = regex.search(sent)
        if not match:
            continue
        start = max(sent.rfind(c, 0, match.start()) for c in "，。！？；：“”") + 1
        end_candidates = [i for i in (sent.find(c, match.end()) for c in "，。！？；") if i >= 0]
        end = min(end_candidates) + 1 if end_candidates else len(sent)
        clause = sent[start:end].strip()
        if best is None or len(clause) < len(best):
            best = clause
    return best


def tts_text_for(phrase, sentences):
    parts = pattern_parts(phrase)
    if len(parts) > 1 or ELLIPSIS_RE.search(phrase):
        clause = example_clause(parts, sentences)
        if clause:
            return clause.rstrip("，；") + ("" if clause[-1] in "。！？" else "。")
    return "，".join(parts) + "。"


def collect_phrases():
    """Map each phrase to the transcript sentences of the questions that use it."""
    phrases = {}

    def walk(node):
        if isinstance(node, dict):
            transcript = node.get("transcript")
            raw = transcript.get("sentences") if isinstance(transcript, dict) else None
            sents = [s.get("zh", "") for s in raw or [] if isinstance(s, dict)]
            for item in node.get("key_expressions") or []:
                phrase = (item.get("phrase") or "").strip()
                if phrase:
                    phrases.setdefault(phrase, []).extend(sents)
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    for pattern in SOURCE_GLOBS:
        for path in sorted(ROOT.glob(pattern)):
            walk(json.loads(path.read_text(encoding="utf-8")))
    return phrases


async def synthesize(text, destination):
    with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tf:
        raw_path = tf.name
    try:
        await edge_tts.Communicate(text=text, voice=VOICE).save(raw_path)
        if os.path.getsize(raw_path) < MIN_AUDIO_BYTES:
            raise RuntimeError(f"Edge TTS produced empty output for: {text}")
        subprocess.run([
            "ffmpeg", "-y", "-loglevel", "error", "-i", raw_path,
            "-af", AUDIO_FILTER, "-ar", SAMPLE_RATE, "-ac", "1", "-codec:a", "libmp3lame",
            "-b:a", BITRATE, "-map_metadata", "-1", "-f", "mp3", str(destination),
        ], check=True)
    finally:
        os.remove(raw_path)


async def main():
    audio_map = json.loads(AUDIO_MAP.read_text(encoding="utf-8"))
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {
        "version": 1, "voice": VOICE, "items": {}}
    known = {entry["text"] for entry in manifest["items"].values()}
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    created = 0
    for phrase, sentences in collect_phrases().items():
        mapped = audio_map.get(phrase, "")
        if phrase in known or (mapped and not mapped.startswith(OUT_DIR.relative_to(ROOT).as_posix())):
            continue
        item_id = "lp_" + hashlib.sha1(phrase.encode("utf-8")).hexdigest()[:HASH_LEN]
        dest = OUT_DIR / f"{item_id}.mp3"
        spoken = tts_text_for(phrase, sentences)
        await synthesize(spoken, dest)
        digest = hashlib.sha1(dest.read_bytes()).hexdigest()[:HASH_LEN]
        manifest["items"][item_id] = {
            "text": phrase,
            "tts_text": spoken,
            "url": f"{dest.relative_to(ROOT).as_posix()}?v={digest}",
        }
        created += 1
        print(f"{phrase} -> {spoken} ({dest.name})")
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Generated {created} phrase clips")


if __name__ == "__main__":
    asyncio.run(main())
