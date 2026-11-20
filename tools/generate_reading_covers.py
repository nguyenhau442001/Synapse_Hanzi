#!/usr/bin/env python3
"""
tools/generate_reading_covers.py
Generates a topical cover illustration for each graded reading with Gemini image models.

Each story gets a scene drawn from its title, description and opening sentences, in one
shared art style that matches the app (warm cream paper, terracotta red, sage green).
Images are saved as WebP in assets/images/readings/covers/<story_id>.webp and linked via
`cover_image` in database/readings/manifest.json. Stories that already have real artwork
(e.g. 万物有意思 page scans) are skipped. Re-runs skip covers that already exist.

API key lookup: --api-key, then GEMINI_API_KEY / GOOGLE_API_KEY, then ./.api_key.

Usage:
  python3 tools/generate_reading_covers.py --only hsk1_story_002     # one story
  python3 tools/generate_reading_covers.py --level HSK1 --limit 10   # a batch
  python3 tools/generate_reading_covers.py                           # everything missing
  python3 tools/generate_reading_covers.py --link-only               # just relink manifest
"""

import argparse
import io
import json
import os
import sys
import time
from pathlib import Path

from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST = REPO_ROOT / "database" / "readings" / "manifest.json"
COVER_DIR = REPO_ROOT / "assets" / "images" / "readings" / "covers"
COVER_REL = "assets/images/readings/covers"
DEFAULT_MODEL = "gemini-3.1-flash-image"
OUT_SIZE = (640, 360)

STYLE = (
    "Warm editorial flat illustration in the style of a modern picture book. "
    "Solid cream paper background (#F4EDE2) with subtle paper grain. "
    "Limited palette: terracotta red (#A8322A), warm orange, sage green (#527D70), "
    "sand beige, soft charcoal outlines. Simple rounded shapes, gentle shading, calm and friendly mood. "
    "Characters, if any, are East Asian people drawn in a simple charming way. "
    "Wide 16:9 composition with the main subject centered and generous empty margins on the left and right, "
    "so the image still reads well when cropped to a centered square. "
    "Absolutely no text, no letters, no numbers, no Chinese characters, no signs with writing, no watermark, no border."
)


def get_api_key(cli_key):
    if cli_key:
        return cli_key
    for var in ("GEMINI_API_KEY", "GOOGLE_AI_KEY", "GOOGLE_API_KEY"):
        if os.environ.get(var):
            return os.environ[var].split(",")[0].strip()
    key_file = REPO_ROOT / ".api_key"
    if key_file.is_file():
        for line in key_file.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#"):
                return line
    return None


def needs_generated_cover(item):
    cover = item.get("cover_image") or ""
    return not cover or cover.startswith(COVER_REL)


def build_prompt(item):
    with open(REPO_ROOT / item["file"], "r", encoding="utf-8") as f:
        story = json.load(f)
    title = item.get("title") or {}
    opening = " ".join(s.get("vi", "") for s in story.get("sentences", [])[:4]).strip()
    return (
        f"{STYLE}\n\n"
        f"Illustrate this short story for language learners in one clear, recognizable scene.\n"
        f"Story title: {title.get('zh', '')} ({title.get('vi', '')}).\n"
        f"Summary (Vietnamese): {item.get('description_vi', '')}\n"
        f"Opening (Vietnamese): {opening}\n"
        f"Show the key subject of the title prominently so a reader instantly recognizes the topic."
    )


def generate_image(client, model, prompt):
    from google.genai import types

    response = client.models.generate_content(
        model=model,
        contents=prompt,
        config=types.GenerateContentConfig(
            response_modalities=["IMAGE"],
            image_config=types.ImageConfig(aspect_ratio="16:9"),
        ),
    )
    for cand in response.candidates or []:
        for part in (cand.content.parts if cand.content else []) or []:
            if part.inline_data and part.inline_data.data:
                return part.inline_data.data
    raise RuntimeError("no image in response")


def save_webp(raw, out_path):
    img = Image.open(io.BytesIO(raw)).convert("RGB")
    # Center-crop to 16:9 in case the model returns another ratio, then downscale.
    w, h = img.size
    target = OUT_SIZE[0] / OUT_SIZE[1]
    if w / h > target:
        nw = int(h * target)
        img = img.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
    elif w / h < target:
        nh = int(w / target)
        img = img.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
    img = img.resize(OUT_SIZE, Image.LANCZOS)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, "WEBP", quality=80, method=6)


def link_manifest(manifest):
    linked = 0
    for item in manifest:
        if not needs_generated_cover(item):
            continue
        path = COVER_DIR / f"{item['id']}.webp"
        if path.is_file():
            item["cover_image"] = f"{COVER_REL}/{item['id']}.webp"
            linked += 1
        else:
            item.pop("cover_image", None)
    with open(MANIFEST, "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return linked


def main():
    parser = argparse.ArgumentParser(description="Generate topical cover illustrations for graded readings.")
    parser.add_argument("--only", help="Comma-separated story ids to generate.")
    parser.add_argument("--level", help="Only stories of this level, e.g. HSK1.")
    parser.add_argument("--limit", type=int, default=0, help="Stop after N new images.")
    parser.add_argument("--force", action="store_true", help="Regenerate even if the cover exists.")
    parser.add_argument("--model", default=DEFAULT_MODEL, help="Gemini image model name.")
    parser.add_argument("--api-key", help="Gemini API key (overrides env and .api_key).")
    parser.add_argument("--delay", type=float, default=1.0, help="Seconds to wait between requests.")
    parser.add_argument("--link-only", action="store_true", help="Only relink manifest to existing files.")
    args = parser.parse_args()

    with open(MANIFEST, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    if not args.link_only:
        api_key = get_api_key(args.api_key)
        if not api_key:
            sys.exit("[!] No Gemini API key found.")
        from google import genai

        client = genai.Client(api_key=api_key)
        only = set(args.only.split(",")) if args.only else None
        todo = [
            item for item in manifest
            if needs_generated_cover(item)
            and (not only or item["id"] in only)
            and (not args.level or item.get("level") == args.level)
            and (args.force or not (COVER_DIR / f"{item['id']}.webp").is_file())
        ]
        if args.limit:
            todo = todo[: args.limit]
        print(f"[*] {len(todo)} covers to generate with {args.model}")

        for n, item in enumerate(todo, 1):
            out = COVER_DIR / f"{item['id']}.webp"
            for attempt in range(4):
                try:
                    save_webp(generate_image(client, args.model, build_prompt(item)), out)
                    print(f"[{n}/{len(todo)}] {item['id']} {item['title']['zh']} -> ok")
                    break
                except Exception as exc:  # retry on rate limits / transient errors
                    msg = str(exc)
                    if "PerDay" in msg or "per day" in msg.lower():
                        print("[!] Daily quota exhausted, stopping.")
                        todo = []
                        break
                    wait = 20 * (attempt + 1)
                    print(f"[{n}/{len(todo)}] {item['id']} failed ({msg[:120]}), retry in {wait}s")
                    time.sleep(wait)
            else:
                print(f"[!] {item['id']} skipped after retries")
            if not todo:
                break
            time.sleep(args.delay)

    linked = link_manifest(manifest)
    print(f"[*] Manifest links {linked} generated covers.")


if __name__ == "__main__":
    main()
