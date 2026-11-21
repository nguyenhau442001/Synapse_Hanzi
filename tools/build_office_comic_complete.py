#!/usr/bin/env python3
"""
tools/build_office_comic_complete.py
Renders authentic comic speech balloons with Chinese typography directly onto the manga page images,
converts them to optimized WebP, and generates pixel-perfect dialogue hotspots and metadata.
"""

import json
from pathlib import Path
import re
import sys
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools"))

from manga_lexicon import segment, lookup, to_traditional, sentence_pinyin

RAW_DIR = Path("/Users/haunguyen/.gemini/antigravity/brain/10406d8c-9179-4f84-9005-19024561b2b0")
TARGET_IMG_DIR = REPO_ROOT / "assets" / "images" / "readings" / "manga" / "office" / "office_ep01"
TARGET_IMG_DIR.mkdir(parents=True, exist_ok=True)

DATA_DIR = REPO_ROOT / "database" / "readings" / "manga" / "office"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_FILE = DATA_DIR / "manifest.json"

STORY_ID = "office_ep01"
FONT_PATH = "/System/Library/Fonts/Hiragino Sans GB.ttc"
FONT_MAIN = ImageFont.truetype(FONT_PATH, 26)
FONT_SPEAKER = ImageFont.truetype(FONT_PATH, 16)

IMG_W, IMG_H = 1376, 768

PANELS_SPEC = [
    {
        "page_num": 1,
        "src_file": RAW_DIR / "dagongren_ep01_p1_1795269761424.jpg",
        "dialogues": [
            {
                "id": "p1_d1",
                "character": "王经理 (Sếp Vương)",
                "speaker": "王经理",
                "zh": "小阳，在吗？",
                "vi": "Tiểu Dương, em có đó không?",
                "box": (140, 50, 460, 145),
                "tail_tip": (320, 220),
                "tail_side": "bottom"
            },
            {
                "id": "p1_d2",
                "character": "小阳 (Tiểu Dương)",
                "speaker": "小阳",
                "zh": "在……王总？",
                "vi": "Dạ có... Sếp Vương?",
                "box": (780, 50, 1080, 145),
                "tail_tip": (890, 190),
                "tail_side": "bottom"
            },
            {
                "id": "p1_d3",
                "character": "王经理 (Sếp Vương)",
                "speaker": "王经理",
                "zh": "来我办公室一下。",
                "vi": "Qua văn phòng anh một lát nhé.",
                "box": (140, 540, 500, 635),
                "tail_tip": (270, 480),
                "tail_side": "top"
            }
        ]
    },
    {
        "page_num": 2,
        "src_file": RAW_DIR / "dagongren_ep01_p2_1795269799371.jpg",
        "dialogues": [
            {
                "id": "p2_d1",
                "character": "小铃 (Tiểu Linh)",
                "speaker": "小铃",
                "zh": "怎么了？",
                "vi": "Sao thế?",
                "box": (880, 50, 1140, 145),
                "tail_tip": (980, 220),
                "tail_side": "bottom"
            },
            {
                "id": "p2_d2",
                "character": "小阳 (Tiểu Dương)",
                "speaker": "小阳",
                "zh": "不知道，感觉要出事了。",
                "vi": "Không biết nữa, nhưng có linh cảm sắp to chuyện rồi.",
                "box": (180, 50, 620, 145),
                "tail_tip": (420, 200),
                "tail_side": "bottom"
            }
        ]
    },
    {
        "page_num": 3,
        "src_file": RAW_DIR / "dagongren_ep01_p3_1795269821710.jpg",
        "dialogues": [
            {
                "id": "p3_d1",
                "character": "王经理 (Sếp Vương)",
                "speaker": "王经理",
                "zh": "别紧张，没什么大事。",
                "vi": "Đừng căng thẳng, chẳng có chuyện gì lớn đâu.",
                "box": (60, 40, 480, 135),
                "tail_tip": (280, 160),
                "tail_side": "bottom"
            },
            {
                "id": "p3_d2",
                "character": "王经理 (Sếp Vương)",
                "speaker": "王经理",
                "zh": "这个项目，你跟一下。",
                "vi": "Dự án này, em theo sát nhé.",
                "box": (490, 40, 910, 135),
                "tail_tip": None
            }
        ]
    },
    {
        "page_num": 4,
        "src_file": RAW_DIR / "dagongren_ep01_p4_1795269855755.jpg",
        "dialogues": [
            {
                "id": "p4_d1",
                "character": "小铃 (Tiểu Linh)",
                "speaker": "小铃",
                "zh": "所以呢？",
                "vi": "Thế rốt cuộc sao?",
                "box": (880, 60, 1140, 155),
                "tail_tip": (1000, 220),
                "tail_side": "bottom"
            },
            {
                "id": "p4_d2",
                "character": "小阳 (Tiểu Dương)",
                "speaker": "小阳",
                "zh": "他说没什么大事。",
                "vi": "Sếp bảo không có chuyện gì to tát cả.",
                "box": (180, 60, 580, 155),
                "tail_tip": (330, 250),
                "tail_side": "bottom"
            }
        ]
    },
    {
        "page_num": 5,
        "src_file": RAW_DIR / "dagongren_ep01_p5_1795269892647.jpg",
        "dialogues": [
            {
                "id": "p5_d1",
                "character": "小铃 (Tiểu Linh)",
                "speaker": "小铃",
                "zh": "那你怎么一脸绝望？",
                "vi": "Thế sao mặt cậu trông tuyệt vọng thế?",
                "box": (80, 50, 520, 145),
                "tail_tip": (280, 200),
                "tail_side": "bottom"
            },
            {
                "id": "p5_d2",
                "character": "小阳 (Tiểu Dương)",
                "speaker": "小阳",
                "zh": "每次他说没什么大事，最后都有大事。",
                "vi": "Lần nào sếp bảo không có chuyện gì lớn, y như rằng cuối cùng việc lớn ngập đầu.",
                "box": (720, 45, 1320, 145),
                "tail_tip": (1020, 180),
                "tail_side": "bottom"
            }
        ]
    }
]

PUNCT_RE = re.compile(r"^[\s，。？！、：；“”‘’…—（）《》·！？]+$")

def draw_bubble(draw, box, text, speaker=None, tail_tip=None, tail_side="bottom"):
    x0, y0, x1, y1 = box
    r = 16
    
    # 1. Draw tail polygon
    if tail_tip:
        if tail_side == "bottom":
            bx = (x0 + x1) // 2
            tail = [(bx - 18, y1 - 3), (bx + 18, y1 - 3), tail_tip]
        elif tail_side == "top":
            bx = (x0 + x1) // 2
            tail = [(bx - 18, y0 + 3), (bx + 18, y0 + 3), tail_tip]
        draw.polygon(tail, fill=(255, 255, 255), outline=(30, 30, 30))
    
    # 2. Draw rounded rectangle with comic stroke
    draw.rounded_rectangle([x0, y0, x1, y1], radius=r, fill=(255, 255, 255), outline=(30, 30, 30), width=3)
    
    # 3. Clean inner seam between tail and bubble body
    if tail_tip:
        draw.polygon(tail, fill=(255, 255, 255))
        draw.line([tail[0], tail[2]], fill=(30, 30, 30), width=3)
        draw.line([tail[1], tail[2]], fill=(30, 30, 30), width=3)

    # 4. Draw speaker badge
    curr_y = y0 + 10
    if speaker:
        draw.text((x0 + 18, curr_y), speaker, fill=(168, 50, 45), font=FONT_SPEAKER)
        curr_y += 24

    # 5. Draw Chinese text
    draw.text((x0 + 18, curr_y), text, fill=(20, 20, 20), font=FONT_MAIN)

def build_dialogue_hotspots(d, page_num):
    zh = d["zh"]
    zh_trad = to_traditional(zh)
    words = segment(zh)
    tokens = []
    hotspots = []
    
    x0, y0, x1, y1 = d["box"]
    # Percentage bounding box for the whole speech bubble
    d_bbox = {
        "x": round((x0 / IMG_W) * 100, 2),
        "y": round((y0 / IMG_H) * 100, 2),
        "width": round(((x1 - x0) / IMG_W) * 100, 2),
        "height": round(((y1 - y0) / IMG_H) * 100, 2)
    }
    
    # Text area starts at x0 + 18, y0 + 34
    text_x0 = x0 + 18
    text_y0 = y0 + 34
    char_w = 26.0
    char_h = 32.0
    
    cur_px = text_x0
    w_idx = 1
    
    for w in words:
        if PUNCT_RE.match(w):
            continue
            
        py, hv, mean, hsk, _ = lookup(w)
        trad_w = to_traditional(w)
        tokens.append({
            "text": w,
            "text_trad": trad_w,
            "pinyin": py,
            "hanviet": hv,
            "meaning_vi": mean,
            "hsk": hsk
        })
        
        w_px_width = len(w) * char_w
        w_box = {
            "x": round((cur_px / IMG_W) * 100, 3),
            "y": round((text_y0 / IMG_H) * 100, 3),
            "width": round((w_px_width / IMG_W) * 100, 3),
            "height": round((char_h / IMG_H) * 100, 3)
        }
        cur_px += w_px_width
        
        hotspots.append({
            "id": f"{d['id']}_w{w_idx}",
            "text": w,
            "text_trad": trad_w,
            "pinyin": py,
            "hanviet": hv,
            "meaning_vi": mean,
            "hsk": hsk,
            "bbox": w_box,
            "rects": [w_box],
            "sentence_zh": zh_trad,
            "sentence_zh_simplified": zh,
            "sentence_vi": d["vi"],
            "character": d["character"],
            "dialogue_id": d["id"]
        })
        w_idx += 1
        
    return {
        "id": d["id"],
        "character": d["character"],
        "bbox": d_bbox,
        "zh": zh,
        "zh_trad": zh_trad,
        "pinyin": sentence_pinyin(zh),
        "vi": d["vi"],
        "tokens": tokens
    }, hotspots

def main():
    story_pages = []
    
    for p_spec in PANELS_SPEC:
        p_num = p_spec["page_num"]
        src_path = p_spec["src_file"]
        dest_webp = TARGET_IMG_DIR / f"page_{p_num:02d}.webp"
        
        # 1. Open raw image and draw comic bubbles
        with Image.open(src_path) as img:
            img = img.convert("RGB")
            draw = ImageDraw.Draw(img)
            
            page_dialogues = []
            page_hotspots = []
            
            for d in p_spec["dialogues"]:
                draw_bubble(
                    draw,
                    d["box"],
                    d["zh"],
                    speaker=d.get("speaker"),
                    tail_tip=d.get("tail_tip"),
                    tail_side=d.get("tail_side", "bottom")
                )
                
                dlg_obj, hs_list = build_dialogue_hotspots(d, p_num)
                page_dialogues.append(dlg_obj)
                page_hotspots.extend(hs_list)
                
            # Save final comic page as optimized WebP
            img.save(dest_webp, "WEBP", quality=90, method=6)
            print(f"[✓] Rendered comic page {p_num} -> {dest_webp}")
            
            # Also save cover from page 1
            if p_num == 1:
                cover_webp = TARGET_IMG_DIR / "cover.webp"
                img.save(cover_webp, "WEBP", quality=90, method=6)
                print(f"[✓] Saved cover -> {cover_webp}")
                
            story_pages.append({
                "page_num": p_num,
                "image": f"assets/images/readings/manga/office/{STORY_ID}/page_{p_num:02d}.webp",
                "dialogues": page_dialogues,
                "word_hotspots": page_hotspots,
                "ocr": {"image_px": [IMG_W, IMG_H]}
            })

    # 2. Build story JSON
    story_obj = {
        "id": STORY_ID,
        "series": "office",
        "series_title": "打工人日记",
        "series_title_vi": "Nhật Ký Dân Công Sở",
        "collection": "office",
        "volume": 1,
        "chapter_in_volume": None,
        "chapter_no": 1,
        "title": {
            "zh": "第一集：你在吗？",
            "zh_trad": "第一集：你在嗎？",
            "vi": "Tập 1: Em Có Đó Không?",
            "pinyin": "dì yī jí ： nǐ zài ma ？"
        },
        "description_vi": "9 giờ 47 phút sáng, chuông thông báo công ty bỗng vang lên từ màn hình máy tính: 'Tiểu Dương, em có đó không? Qua văn phòng anh một lát nhé.' Lời nói nghe chừng vô hại, nhưng dân công sở đều biết: mỗi lần sếp bảo 'không có chuyện gì lớn', thì y như rằng việc lớn ngập đầu!",
        "cover_image": f"assets/images/readings/manga/office/{STORY_ID}/cover.webp",
        "source": "《打工人日记》原创职场情景喜剧 · Synapse Hanzi Studio",
        "source_url": "https://github.com/Synapse-Hanzi",
        "source_credits": "Kịch bản và tạo hình nhân vật độc quyền: Synapse Hanzi Studio. Tranh minh họa kết hợp hệ thống tra từ tương tác, pinyin, Hán-Việt và âm thanh đa giác quan.",
        "license": "Original / Educational",
        "page_count": len(story_pages),
        "difficulty": "HSK 1 - 3",
        "estimatedMinutes": 3,
        "file": f"database/readings/manga/office/{STORY_ID}.json",
        "proper_names": ["小阳", "小铃", "王经理", "王总", "老周"],
        "pages": story_pages
    }

    story_out = DATA_DIR / f"{STORY_ID}.json"
    story_out.write_text(json.dumps(story_obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[✓] Saved {story_out}")

    # 3. Update manifest.json
    manifest_items = [
        {
            "id": story_obj["id"],
            "series": story_obj["series"],
            "series_title": story_obj["series_title"],
            "series_title_vi": story_obj["series_title_vi"],
            "collection": story_obj["collection"],
            "volume": story_obj["volume"],
            "chapter_in_volume": story_obj["chapter_in_volume"],
            "chapter_no": story_obj["chapter_no"],
            "title": story_obj["title"],
            "description_vi": story_obj["description_vi"],
            "cover_image": story_obj["cover_image"],
            "source": story_obj["source"],
            "source_url": story_obj["source_url"],
            "source_credits": story_obj["source_credits"],
            "license": story_obj["license"],
            "page_count": story_obj["page_count"],
            "difficulty": story_obj["difficulty"],
            "estimatedMinutes": story_obj["estimatedMinutes"],
            "file": story_obj["file"],
            "proper_names": story_obj["proper_names"]
        }
    ]
    MANIFEST_FILE.write_text(json.dumps(manifest_items, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[✓] Saved {MANIFEST_FILE}")

if __name__ == "__main__":
    main()
