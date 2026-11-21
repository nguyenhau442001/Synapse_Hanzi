#!/usr/bin/env python3
"""
tools/convert_xiyouji_images.py
Converts generated Lianhuanhua page images into optimized WebP assets for the manga reader.
"""

from pathlib import Path
from PIL import Image
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent
TARGET_DIR = REPO_ROOT / "assets" / "images" / "readings" / "manga" / "classic" / "xiyouji_01"
TARGET_DIR.mkdir(parents=True, exist_ok=True)

def convert_images(image_paths):
    for i, path_str in enumerate(image_paths, 1):
        src = Path(path_str)
        if not src.exists():
            print(f"[!] Source not found: {src}")
            continue
        dest = TARGET_DIR / f"page_{i:02d}.webp"
        with Image.open(src) as img:
            # Convert RGB if necessary
            if img.mode != "RGB":
                img = img.convert("RGB")
            # Save optimized WebP
            img.save(dest, "WEBP", quality=85, method=6)
            print(f"[✓] Converted {src.name} -> {dest} ({img.size[0]}x{img.size[1]})")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        convert_images(sys.argv[1:])
    else:
        print("Usage: convert_xiyouji_images.py <img1> <img2> ...")
