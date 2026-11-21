#!/usr/bin/env python3
"""
tools/convert_office_images.py
Converts generated Office Workplace Comedy page images into optimized WebP assets for the manga reader.
"""

from pathlib import Path
from PIL import Image
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent
TARGET_DIR = REPO_ROOT / "assets" / "images" / "readings" / "manga" / "office" / "office_ep01"
TARGET_DIR.mkdir(parents=True, exist_ok=True)

def convert_images(image_paths):
    for i, path_str in enumerate(image_paths, 1):
        src = Path(path_str)
        if not src.exists():
            print(f"[!] Source not found: {src}")
            continue
        dest = TARGET_DIR / f"page_{i:02d}.webp"
        with Image.open(src) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            # Save optimized WebP
            img.save(dest, "WEBP", quality=85, method=6)
            print(f"[✓] Converted {src.name} -> {dest} ({img.size[0]}x{img.size[1]})")

    # Also create cover.webp from page 1 if not already present
    cover_dest = TARGET_DIR / "cover.webp"
    first_src = Path(image_paths[0])
    if first_src.exists():
        with Image.open(first_src) as img:
            if img.mode != "RGB":
                img = img.convert("RGB")
            img.save(cover_dest, "WEBP", quality=85, method=6)
            print(f"[✓] Created cover {cover_dest}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        convert_images(sys.argv[1:])
    else:
        print("Usage: convert_office_images.py <img1> <img2> ...")
