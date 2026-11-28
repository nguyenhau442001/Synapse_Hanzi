#!/usr/bin/env python3
"""Stage 2 Illustration Audit: Batch multimodal vision scoring.

Renders audited SVG illustrations to PNG contact sheets (4x4 grids) and uses
Gemini Vision (google.genai) to evaluate clarity, relevance to Vietnamese
meaning/example, and visual appropriateness. Results are persisted incrementally
into database/audit/illustration_audit.json.
"""

import argparse
import json
import os
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path

from google import genai
from google.genai import types
from PIL import Image, ImageDraw

AUDIT_PATH = Path("database/audit/illustration_audit.json")
API_KEY_PATH = Path(".api_key")
DEFAULT_MODEL = "gemini-2.5-flash"

GRID_COLS = 4
GRID_ROWS = 4
BATCH_SIZE = GRID_COLS * GRID_ROWS
CELL_IMG_SIZE = 240
CELL_HEADER_HEIGHT = 36
CELL_WIDTH = CELL_IMG_SIZE
CELL_HEIGHT = CELL_IMG_SIZE + CELL_HEADER_HEIGHT

MIN_PASSING_SCORE = 3
API_RETRY_DELAY_SECONDS = 4.0
MAX_API_RETRIES = 3

VISION_SYSTEM_PROMPT = """You are a strict art director auditing Chinese vocabulary flashcard illustrations.
You will receive a 4x4 contact sheet of up to 16 illustrations labeled #0 through #15, along with a JSON list of each item's Hanzi, Vietnamese meaning, and Chinese example sentence.

For EACH item in the batch, evaluate how well a learner can understand the word from the illustration alone:
- clarity_score (1-5): 1 = incomprehensible abstract blob/geometric shape; 2 = very vague/confusing; 3 = somewhat recognizable; 4 = clear; 5 = immediately obvious.
- relevance_score (1-5): 1 = completely unrelated to the meaning/example; 3 = loosely related; 5 = depicts the exact meaning/scene.
- is_inappropriate (boolean): true ONLY if the shape looks accidentally suggestive/vulgar, offensive, or severely broken/corrupted.
- issue_tags (array of strings): pick from ["TOO_ABSTRACT", "WRONG_CONCEPT", "AWKWARD_SHAPE", "CLIPPED", "TEXT_LEAK", "GENERIC_BLOB", "UNRECOGNIZABLE"], or [] if passing.
- reason (string): 1 concise English sentence explaining the visual issue (or "Clear and accurate." if >= 4).

Return ONLY a JSON array of objects with keys: index, clarity_score, relevance_score, is_inappropriate, issue_tags, reason."""


def load_api_key() -> str:
    """Load Gemini API key from environment or .api_key file."""
    env_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if env_key:
        return env_key
    if API_KEY_PATH.is_file():
        return API_KEY_PATH.read_text(encoding="utf-8").strip()
    raise RuntimeError("No GEMINI_API_KEY env var or .api_key file found.")


def render_svgs_to_png(svg_paths: list[Path], out_dir: Path) -> dict[Path, Path]:
    """Batch-render SVG files to PNGs using macOS qlmanage."""
    rendered: dict[Path, Path] = {}
    if not svg_paths:
        return rendered

    cmd = ["qlmanage", "-t", "-s", str(CELL_IMG_SIZE), "-o", str(out_dir)] + [
        str(p) for p in svg_paths
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=False)

    for svg_path in svg_paths:
        png_path = out_dir / f"{svg_path.name}.png"
        if png_path.is_file():
            rendered[svg_path] = png_path
    return rendered


def build_contact_sheet(batch: list[dict], png_map: dict[Path, Path]) -> Image.Image:
    """Compose a 4x4 labeled contact sheet PNG for a batch of up to 16 records."""
    rows = (len(batch) + GRID_COLS - 1) // GRID_COLS
    sheet = Image.new("RGB", (GRID_COLS * CELL_WIDTH, rows * CELL_HEIGHT), (255, 255, 255))
    draw = ImageDraw.Draw(sheet)

    for idx, rec in enumerate(batch):
        col = idx % GRID_COLS
        row = idx // GRID_COLS
        x0 = col * CELL_WIDTH
        y0 = row * CELL_HEIGHT

        draw.rectangle([x0, y0, x0 + CELL_WIDTH - 1, y0 + CELL_HEADER_HEIGHT - 1], fill=(240, 236, 228))
        label = f"#{idx} {rec['hanzi']}"
        draw.text((x0 + 8, y0 + 10), label, fill=(30, 30, 30))

        png_path = png_map.get(Path(rec["primary_path"]))
        if png_path and png_path.is_file():
            with Image.open(png_path) as cell_img:
                rgb_img = cell_img.convert("RGB").resize((CELL_IMG_SIZE, CELL_IMG_SIZE))
                sheet.paste(rgb_img, (x0, y0 + CELL_HEADER_HEIGHT))

        draw.rectangle([x0, y0, x0 + CELL_WIDTH - 1, y0 + CELL_HEIGHT - 1], outline=(200, 195, 185))

    return sheet


def score_batch_with_gemini(
    client: genai.Client, model: str, batch: list[dict], sheet_img: Image.Image
) -> list[dict]:
    """Send contact sheet + metadata to Gemini Vision and parse structured JSON scores."""
    metadata_lines = [
        {
            "index": idx,
            "hanzi": rec["hanzi"],
            "meaning": rec["meaning"],
            "example_zh": rec["example_zh"],
        }
        for idx, rec in enumerate(batch)
    ]
    user_prompt = (
        "Evaluate these flashcard illustrations:\n"
        + json.dumps(metadata_lines, ensure_ascii=False)
    )

    for attempt in range(1, MAX_API_RETRIES + 1):
        try:
            response = client.models.generate_content(
                model=model,
                contents=[VISION_SYSTEM_PROMPT, user_prompt, sheet_img],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )
            parsed = json.loads(response.text)
            if isinstance(parsed, list):
                return parsed
        except Exception as exc:  # noqa: BLE001
            if attempt == MAX_API_RETRIES:
                raise RuntimeError(f"Gemini Vision failed after {MAX_API_RETRIES} retries: {exc}") from exc
            time.sleep(API_RETRY_DELAY_SECONDS * attempt)
    return []


def recompute_summary(payload: dict) -> None:
    """Recompute top-level AuditSummary counters from current records."""
    records = payload["records"]
    payload["summary"]["stage2_audited_count"] = sum(1 for r in records if "vision_audit" in r)
    payload["summary"]["needs_regen_count"] = sum(
        1 for r in records if r.get("status") == "needs_regen"
    )
    payload["summary"]["regenerated_count"] = sum(
        1 for r in records if r.get("status") == "regenerated"
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Stage 2 HSK Illustration Vision Audit")
    parser.add_argument("--audit-file", type=Path, default=AUDIT_PATH)
    parser.add_argument("--tier", type=int, choices=[1, 2, 3], default=1)
    parser.add_argument("--limit", type=int, default=0, help="Max words to audit (0 = all in tier)")
    parser.add_argument("--model", type=str, default=DEFAULT_MODEL)
    parser.add_argument("--force", action="store_true", help="Re-audit already scored words")
    args = parser.parse_args()

    payload = json.loads(args.audit_file.read_text(encoding="utf-8"))
    candidates = [
        rec for rec in payload["records"]
        if rec["priority_tier"] == args.tier and (args.force or "vision_audit" not in rec)
    ]
    if args.limit > 0:
        candidates = candidates[:args.limit]

    if not candidates:
        print(f"No pending Tier {args.tier} words to audit.")
        return

    print(f"Auditing {len(candidates)} Tier {args.tier} illustrations in batches of {BATCH_SIZE}...")
    client = genai.Client(api_key=load_api_key())

    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp_path = Path(tmp_dir)
        for start in range(0, len(candidates), BATCH_SIZE):
            batch = candidates[start:start + BATCH_SIZE]
            svg_paths = [Path(rec["primary_path"]) for rec in batch]
            png_map = render_svgs_to_png(svg_paths, tmp_path)
            sheet_img = build_contact_sheet(batch, png_map)

            results = score_batch_with_gemini(client, args.model, batch, sheet_img)
            by_idx = {item["index"]: item for item in results if isinstance(item, dict) and "index" in item}
            now_iso = datetime.now(timezone.utc).isoformat()

            for idx, rec in enumerate(batch):
                score_obj = by_idx.get(idx)
                if not score_obj:
                    continue
                clarity = int(score_obj.get("clarity_score", 3))
                relevance = int(score_obj.get("relevance_score", 3))
                inappropriate = bool(score_obj.get("is_inappropriate", False))
                rec["vision_audit"] = {
                    "clarity_score": clarity,
                    "relevance_score": relevance,
                    "is_inappropriate": inappropriate,
                    "issue_tags": list(score_obj.get("issue_tags", [])),
                    "reason": str(score_obj.get("reason", "")),
                    "audited_at": now_iso,
                }
                needs_regen = (
                    clarity < MIN_PASSING_SCORE
                    or relevance < MIN_PASSING_SCORE
                    or inappropriate
                )
                rec["status"] = "needs_regen" if needs_regen else "pass"

            recompute_summary(payload)
            args.audit_file.write_text(
                json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            batch_num = (start // BATCH_SIZE) + 1
            total_batches = (len(candidates) + BATCH_SIZE - 1) // BATCH_SIZE
            print(
                f"  Batch {batch_num}/{total_batches} saved "
                f"(audited={payload['summary']['stage2_audited_count']}, "
                f"needs_regen={payload['summary']['needs_regen_count']})"
            )


if __name__ == "__main__":
    main()
