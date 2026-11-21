#!/usr/bin/env python3
"""
tools/build_office_manga.py
Builds Diary of Dagongren (打工人日记) Episode 1: 《你在吗？》 (Are You There?)
data file with tokens, pinyin, Han-Viet, and word hotspots.
"""

import json
from pathlib import Path
import re
import sys

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools"))

from manga_lexicon import segment, lookup, to_traditional, sentence_pinyin

DATA_DIR = REPO_ROOT / "database" / "readings" / "manga" / "office"
DATA_DIR.mkdir(parents=True, exist_ok=True)
MANIFEST_FILE = DATA_DIR / "manifest.json"

STORY_ID = "office_ep01"

PAGES_DATA = [
    {
        "page_num": 1,
        "image": f"assets/images/readings/manga/office/{STORY_ID}/page_01.webp",
        "dialogues": [
            {
                "id": "p1_d1",
                "character": "王经理 (Sếp Vương)",
                "bbox": {"x": 10.0, "y": 6.0, "width": 32.0, "height": 15.0},
                "zh": "小阳，在吗？",
                "vi": "Tiểu Dương, em có đó không?"
            },
            {
                "id": "p1_d2",
                "character": "小阳 (Tiểu Dương)",
                "bbox": {"x": 58.0, "y": 6.0, "width": 32.0, "height": 15.0},
                "zh": "在……王总？",
                "vi": "Dạ có... Sếp Vương?"
            },
            {
                "id": "p1_d3",
                "character": "王经理 (Sếp Vương)",
                "bbox": {"x": 10.0, "y": 68.0, "width": 36.0, "height": 15.0},
                "zh": "来我办公室一下。",
                "vi": "Qua văn phòng anh một lát nhé."
            }
        ]
    },
    {
        "page_num": 2,
        "image": f"assets/images/readings/manga/office/{STORY_ID}/page_02.webp",
        "dialogues": [
            {
                "id": "p2_d1",
                "character": "小铃 (Tiểu Linh)",
                "bbox": {"x": 64.0, "y": 8.0, "width": 26.0, "height": 14.0},
                "zh": "怎么了？",
                "vi": "Sao thế?"
            },
            {
                "id": "p2_d2",
                "character": "小阳 (Tiểu Dương)",
                "bbox": {"x": 14.0, "y": 8.0, "width": 42.0, "height": 16.0},
                "zh": "不知道，感觉要出事了。",
                "vi": "Không biết nữa, nhưng có linh cảm sắp to chuyện rồi."
            }
        ]
    },
    {
        "page_num": 3,
        "image": f"assets/images/readings/manga/office/{STORY_ID}/page_03.webp",
        "dialogues": [
            {
                "id": "p3_d1",
                "character": "王经理 (Sếp Vương)",
                "bbox": {"x": 18.0, "y": 6.0, "width": 42.0, "height": 15.0},
                "zh": "别紧张，没什么大事。",
                "vi": "Đừng căng thẳng, chẳng có chuyện gì lớn đâu."
            },
            {
                "id": "p3_d2",
                "character": "王经理 (Sếp Vương)",
                "bbox": {"x": 22.0, "y": 24.0, "width": 40.0, "height": 15.0},
                "zh": "这个项目，你跟一下。",
                "vi": "Dự án này, em theo sát nhé."
            }
        ]
    },
    {
        "page_num": 4,
        "image": f"assets/images/readings/manga/office/{STORY_ID}/page_04.webp",
        "dialogues": [
            {
                "id": "p4_d1",
                "character": "小铃 (Tiểu Linh)",
                "bbox": {"x": 64.0, "y": 10.0, "width": 26.0, "height": 14.0},
                "zh": "所以呢？",
                "vi": "Thế rốt cuộc sao?"
            },
            {
                "id": "p4_d2",
                "character": "小阳 (Tiểu Dương)",
                "bbox": {"x": 14.0, "y": 10.0, "width": 38.0, "height": 15.0},
                "zh": "他说没什么大事。",
                "vi": "Sếp bảo không có chuyện gì to tát cả."
            }
        ]
    },
    {
        "page_num": 5,
        "image": f"assets/images/readings/manga/office/{STORY_ID}/page_05.webp",
        "dialogues": [
            {
                "id": "p5_d1",
                "character": "小铃 (Tiểu Linh)",
                "bbox": {"x": 6.0, "y": 8.0, "width": 38.0, "height": 15.0},
                "zh": "那你怎么一脸绝望？",
                "vi": "Thế sao mặt cậu trông tuyệt vọng thế?"
            },
            {
                "id": "p5_d2",
                "character": "小阳 (Tiểu Dương)",
                "bbox": {"x": 52.0, "y": 6.0, "width": 44.0, "height": 17.0},
                "zh": "每次他说没什么大事，最后都有大事。",
                "vi": "Lần nào sếp bảo không có chuyện gì lớn, y như rằng cuối cùng việc lớn ngập đầu."
            }
        ]
    }
]

PUNCT_RE = re.compile(r"^[\s，。？！、：；“”‘’…—（）《》·！？]+$")

def build_tokens_and_hotspots(dialogue, page_num):
    zh = dialogue["zh"]
    zh_trad = to_traditional(zh)
    words = segment(zh)
    tokens = []
    hotspots = []
    
    d_box = dialogue.get("bbox") or {"x": 10.0, "y": 10.0, "width": 80.0, "height": 15.0}
    
    # Calculate word positioning across the dialogue bounding box
    meaningful_chars = sum(len(w) for w in words if not PUNCT_RE.match(w))
    char_w = d_box["width"] / max(meaningful_chars, 1)
    
    cur_x = d_box["x"]
    w_idx = 1
    
    for w in words:
        if PUNCT_RE.match(w):
            continue
            
        py, hv, mean, hsk, _ = lookup(w)
        trad_w = to_traditional(w)
        token_obj = {
            "text": w,
            "text_trad": trad_w,
            "pinyin": py,
            "hanviet": hv,
            "meaning_vi": mean,
            "hsk": hsk
        }
        tokens.append(token_obj)
        
        w_box = {
            "x": round(cur_x, 3),
            "y": round(d_box["y"], 3),
            "width": round(len(w) * char_w, 3),
            "height": round(d_box["height"], 3)
        }
        cur_x += len(w) * char_w
        
        hotspot_obj = {
            "id": f"{dialogue['id']}_w{w_idx}",
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
            "sentence_vi": dialogue["vi"],
            "character": dialogue["character"],
            "dialogue_id": dialogue["id"]
        }
        hotspots.append(hotspot_obj)
        w_idx += 1
        
    dialogue["zh_trad"] = zh_trad
    dialogue["pinyin"] = sentence_pinyin(zh)
    dialogue["tokens"] = tokens
    return hotspots

def main():
    story_pages = []
    for p in PAGES_DATA:
        p_num = p["page_num"]
        page_hotspots = []
        for d in p["dialogues"]:
            hs = build_tokens_and_hotspots(d, p_num)
            page_hotspots.extend(hs)
            
        story_pages.append({
            "page_num": p_num,
            "image": p["image"],
            "dialogues": p["dialogues"],
            "word_hotspots": page_hotspots,
            "ocr": {"image_px": [1376, 768]}
        })

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
        "source_credits": "Kịch bản và tạo hình nhân vật độc quyền của Synapse Hanzi Studio. Thiết kế hỗ trợ học tiếng Trung công sở thực chiến với hệ thống tương tác đa giác quan (Pinyin, Hán-Việt, phân tích từ vựng & âm thanh).",
        "license": "Original / Educational",
        "page_count": len(story_pages),
        "difficulty": "HSK 1 - 3",
        "estimatedMinutes": 3,
        "file": f"database/readings/manga/office/{STORY_ID}.json",
        "proper_names": ["小阳", "小铃", "王经理", "王总", "老周"],
        "pages": story_pages
    }

    # Save story JSON
    story_out = DATA_DIR / f"{STORY_ID}.json"
    story_out.write_text(json.dumps(story_obj, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[✓] Saved {story_out} ({len(story_pages)} pages)")

    # Update manifest.json
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
