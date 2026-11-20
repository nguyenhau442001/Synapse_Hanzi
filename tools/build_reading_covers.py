#!/usr/bin/env python3
"""
tools/build_reading_covers.py
Gives every graded reading without artwork a topical cover illustration.

The cover is one of the editorial-style word illustrations in images/HSK_3.0/
(cream background, matches the app look). The script prefers concrete words from
the story title, then words the story repeats. Hand-picked words in OVERRIDES win.
Gemini covers from tools/generate_reading_covers.py take priority when present.

Writes `cover_image` and `cover_word` into database/readings/manifest.json.

Usage:
  python3 tools/build_reading_covers.py            # write manifest
  python3 tools/build_reading_covers.py --dry-run  # print picks only
"""

import argparse
import json
import re
from collections import Counter
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
MANIFEST = REPO_ROOT / "database" / "readings" / "manifest.json"
ILLU_DIR = REPO_ROOT / "images" / "HSK_3.0"
GEMINI_COVER_REL = "assets/images/readings/covers"

# Words that never make a meaningful picture on their own.
STOP_WORDS = set(
    "我 你 他 她 它 们 我们 你们 他们 的 了 是 在 和 与 及 一 个 这 那 有 不 也 都 很 就 要 会 去 来 上 下 中 之 对 "
    "把 被 从 到 吗 呢 吧 啊 得 地 着 过 还 又 再 才 最 更 太 好 多 少 大 小 说 叫 做 想 能 可以 什么 怎么 为什么 "
    "哪 哪儿 那儿 这儿 谁 几 么 给 让 跟 比 自己 一起 一下 一点儿 一些 时候 东西 事 事情 问题 方法 开始 已经 "
    "觉得 知道 喜欢 应该 可能 因为 所以 但是 如果 虽然 只 只是 还是 或者 而且 然后 现在 今天 明天 昨天 每天 "
    "非常 真 第 次 种 些 里 后 前 年 月 日 号 点 分 位 件 张 本 条 双 块 新 老 真的 关于 如何 "
    "生活 故事 学会 发现 变化 重要 意义 选择 计划 经验 体验 感受 心 看 听 用 找 买 等 走 坐 住 回 "
    "白 黑 红 高兴 正在 认识 介绍 欢迎 准备 参加 大家 现代 前面 后面 第一 难忘 美丽 可爱 漂亮 快乐 "
    "中 与 及 其 以 为 而 于 之 所 者 化 性 论 的 一天 天 字 题 电 钱 泡 弹 寄 搬 爬 喝 吃 写".split()
)

CJK_RE = re.compile(r"[㐀-鿿]+")

# Hand-picked cover words for stories where the heuristic picks a weak picture.
OVERRIDES = {
    "hsk1_story_001": "起床", "hsk1_story_007": "饭馆", "hsk1_story_015": "做饭", "hsk1_story_026": "飞机",
    "hsk1_story_037": "筷子", "hsk1_story_041": "汉字", "hsk1_story_049": "朋友",
    "hsk2_story_003": "火车", "hsk2_story_015": "公交车", "hsk2_story_022": "足球", "hsk2_story_027": "鸡蛋",
    "hsk2_story_028": "钥匙", "hsk2_story_030": "歌", "hsk2_story_032": "猫", "hsk2_story_035": "笑",
    "hsk2_story_036": "考试", "hsk2_story_044": "太阳", "hsk2_story_045": "学习", "hsk2_story_046": "家",
    "hsk3_story_002": "山", "hsk3_story_005": "演讲", "hsk3_story_010": "朋友", "hsk3_story_040": "购物",
    "hsk3_story_041": "包裹", "hsk3_story_042": "面包", "hsk3_story_043": "画", "hsk3_story_045": "植物",
    "hsk3_story_048": "茶",
    "hsk4_story_003": "环境", "hsk4_story_004": "京剧", "hsk4_story_005": "运动", "hsk4_story_007": "朋友",
    "hsk4_story_012": "购物", "hsk4_story_016": "纸", "hsk4_story_019": "学习", "hsk4_story_027": "动物",
    "hsk4_story_028": "钱", "hsk4_story_032": "农村", "hsk4_story_033": "手机", "hsk4_story_034": "锻炼",
    "hsk4_story_035": "灯笼", "hsk4_story_036": "自行车", "hsk4_story_037": "阅读", "hsk4_story_044": "锻炼",
    "hsk4_story_046": "市场", "hsk4_story_048": "汉语", "hsk4_story_029": "电脑", "hsk4_story_009": "山",
    "hsk4_story_025": "地球", "hsk4_story_050": "太阳",
    "hsk5_story_001": "手工", "hsk5_story_006": "地球", "hsk5_story_009": "手机", "hsk5_story_014": "电脑",
    "hsk5_story_015": "书", "hsk5_story_017": "灯笼", "hsk5_story_018": "大脑", "hsk5_story_019": "房间",
    "hsk5_story_020": "医院", "hsk5_story_024": "数据", "hsk5_story_026": "地球", "hsk5_story_027": "学生",
    "hsk5_story_031": "绿色", "hsk5_story_039": "冰", "hsk5_story_049": "老人", "hsk5_story_050": "火箭",
    "hsk5_story_005": "树", "hsk5_story_011": "自行车", "hsk5_story_016": "农村", "hsk5_story_012": "同事",
    "hsk6_story_001": "海洋", "hsk6_story_003": "森林", "hsk6_story_004": "钱", "hsk6_story_005": "大脑",
    "hsk6_story_006": "工厂", "hsk6_story_009": "太阳能", "hsk6_story_010": "机器人", "hsk6_story_011": "望远镜",
    "hsk6_story_012": "地球", "hsk6_story_013": "药", "hsk6_story_014": "电脑", "hsk6_story_015": "山",
    "hsk6_story_016": "眼镜", "hsk6_story_017": "音乐", "hsk6_story_019": "大脑", "hsk6_story_020": "书",
    "hsk6_story_021": "银行", "hsk6_story_023": "显微镜", "hsk6_story_025": "城市", "hsk6_story_027": "书",
    "hsk6_story_028": "海洋", "hsk6_story_029": "网络", "hsk6_story_030": "画", "hsk6_story_031": "钱",
    "hsk6_story_032": "雨", "hsk6_story_033": "大脑", "hsk6_story_034": "书", "hsk6_story_036": "博物馆",
    "hsk6_story_037": "手机", "hsk6_story_038": "河", "hsk6_story_040": "汽车", "hsk6_story_041": "河",
    "hsk6_story_042": "数学", "hsk6_story_043": "电脑", "hsk6_story_044": "星星", "hsk6_story_045": "窗户",
    "hsk6_story_046": "种子", "hsk6_story_048": "画", "hsk6_story_049": "老人", "hsk6_story_050": "冰",
    "hsk7_story_001": "工厂", "hsk7_story_003": "电脑", "hsk7_story_004": "河", "hsk7_story_005": "法律",
    "hsk7_story_006": "药", "hsk7_story_007": "地球", "hsk7_story_010": "城市", "hsk7_story_011": "城市",
    "hsk7_story_012": "太阳能", "hsk7_story_013": "机器人", "hsk7_story_015": "集装箱", "hsk7_story_016": "老人",
    "hsk7_story_017": "电脑", "hsk7_story_019": "工厂", "hsk7_story_020": "银行", "hsk7_story_021": "森林",
    "hsk7_story_023": "火车", "hsk7_story_024": "港口", "hsk7_story_025": "社区", "hsk7_story_026": "医院",
    "hsk7_story_027": "灯笼", "hsk7_story_028": "水稻", "hsk7_story_029": "楼", "hsk7_story_030": "电脑",
    "hsk7_story_032": "电池", "hsk7_story_033": "银行", "hsk7_story_034": "火箭", "hsk7_story_035": "法院",
    "hsk7_story_037": "数据", "hsk7_story_038": "工厂", "hsk7_story_039": "电脑", "hsk7_story_040": "银行",
    "hsk7_story_041": "工厂", "hsk7_story_042": "地震", "hsk7_story_043": "手工", "hsk7_story_044": "汽车",
    "hsk7_story_045": "河", "hsk7_story_046": "警察", "hsk7_story_047": "货币", "hsk7_story_048": "大学",
    "hsk7_story_050": "温泉",
    "hsk8_story_001": "书", "hsk8_story_002": "大脑", "hsk8_story_003": "集装箱", "hsk8_story_004": "博物馆",
    "hsk8_story_005": "望远镜", "hsk8_story_006": "电脑", "hsk8_story_007": "森林", "hsk8_story_008": "灯笼",
    "hsk8_story_009": "显微镜", "hsk8_story_010": "城市", "hsk8_story_011": "船", "hsk8_story_012": "显微镜",
    "hsk8_story_013": "电脑", "hsk8_story_014": "冰", "hsk8_story_015": "卫星", "hsk8_story_016": "法院",
    "hsk8_story_017": "警察", "hsk8_story_018": "家庭", "hsk8_story_019": "城市", "hsk8_story_020": "显微镜",
    "hsk8_story_021": "集装箱", "hsk8_story_022": "医院", "hsk8_story_023": "电脑", "hsk8_story_024": "海洋",
    "hsk8_story_025": "博物馆", "hsk8_story_026": "画", "hsk8_story_027": "货币", "hsk8_story_028": "地球",
    "hsk8_story_029": "机器人", "hsk8_story_030": "银行", "hsk8_story_031": "书", "hsk8_story_032": "显微镜",
    "hsk8_story_033": "地震", "hsk8_story_034": "法院", "hsk8_story_035": "大脑", "hsk8_story_036": "药",
    "hsk8_story_037": "书", "hsk8_story_038": "草地", "hsk8_story_039": "显微镜", "hsk8_story_040": "工厂",
    "hsk8_story_041": "河", "hsk8_story_042": "手机", "hsk8_story_043": "电脑", "hsk8_story_044": "显微镜",
    "hsk8_story_045": "合同", "hsk8_story_046": "工厂", "hsk8_story_047": "法院", "hsk8_story_048": "电脑",
    "hsk8_story_049": "钱", "hsk8_story_050": "电脑",
    "hsk9_story_001": "书", "hsk9_story_002": "望远镜", "hsk9_story_003": "网络", "hsk9_story_004": "大脑",
    "hsk9_story_005": "书", "hsk9_story_006": "时间", "hsk9_story_007": "海洋", "hsk9_story_008": "大脑",
    "hsk9_story_009": "银行", "hsk9_story_010": "地球", "hsk9_story_011": "书", "hsk9_story_012": "星星",
    "hsk9_story_013": "大脑", "hsk9_story_014": "数学", "hsk9_story_015": "书", "hsk9_story_016": "温度",
    "hsk9_story_017": "大脑", "hsk9_story_018": "网络", "hsk9_story_019": "书", "hsk9_story_020": "星星",
    "hsk9_story_021": "窗户", "hsk9_story_022": "动物", "hsk9_story_023": "游戏", "hsk9_story_024": "星星",
    "hsk9_story_025": "机器", "hsk9_story_026": "天平", "hsk9_story_027": "物理", "hsk9_story_028": "工厂",
    "hsk9_story_029": "地球", "hsk9_story_030": "时间", "hsk9_story_031": "植物", "hsk9_story_032": "画",
    "hsk9_story_033": "星星", "hsk9_story_034": "法院", "hsk9_story_035": "物理", "hsk9_story_036": "科学",
    "hsk9_story_037": "动物", "hsk9_story_038": "物理", "hsk9_story_039": "书", "hsk9_story_040": "地图",
    "hsk9_story_041": "沙子", "hsk9_story_042": "机器人", "hsk9_story_043": "星星", "hsk9_story_044": "地球",
    "hsk9_story_045": "大脑", "hsk9_story_046": "书", "hsk9_story_047": "望远镜", "hsk9_story_048": "书",
    "hsk9_story_049": "科学", "hsk9_story_050": "地图",
}


def build_illustration_index():
    """word -> repo-relative path of its editorial SVG, lowest HSK level first."""
    index = {}
    for lvl in range(1, 10):
        for svg in sorted((ILLU_DIR / f"level{lvl}").glob("*.svg")):
            if svg.stem in index:
                continue
            with open(svg, "r", encoding="utf-8") as f:
                head = f.read(300)
            if 'data-style="editorial"' in head:
                index[svg.stem] = svg.relative_to(REPO_ROOT).as_posix()
    return index


def story_token_counts(story_path):
    with open(story_path, "r", encoding="utf-8") as f:
        story = json.load(f)
    counts = Counter()
    for sent in story.get("sentences", []):
        for tok in sent.get("tokens", []):
            text = tok.get("text") or ""
            if CJK_RE.fullmatch(text):
                counts[text] += 1
    return counts


def title_words(title, index):
    found = set()
    for run in CJK_RE.findall(title):
        for size in range(4, 0, -1):
            for i in range(len(run) - size + 1):
                word = run[i:i + size]
                if word in index and word not in STOP_WORDS:
                    found.add(word)
    # Drop words contained in a longer title match (商 inside 商店).
    return {w for w in found if not any(w != o and w in o for o in found)}


def pick_cover_word(item, index):
    if item["id"] in OVERRIDES:
        return OVERRIDES[item["id"]]
    title = (item.get("title") or {}).get("zh", "")
    counts = story_token_counts(REPO_ROOT / item["file"])
    candidates = title_words(title, index)
    if candidates:
        # Title words: favour what the story repeats, then longer (more specific) words.
        return max(candidates, key=lambda w: (counts.get(w, 0) + 2 * len(w), -title.find(w)))
    scored = [(n * len(w), w) for w, n in counts.items() if w in index and w not in STOP_WORDS and len(w) > 1]
    return max(scored)[1] if scored else None


def main():
    parser = argparse.ArgumentParser(description="Assign topical cover illustrations to graded readings.")
    parser.add_argument("--dry-run", action="store_true", help="Print picks without writing the manifest.")
    args = parser.parse_args()

    index = build_illustration_index()
    with open(MANIFEST, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    assigned = gemini = 0
    for item in manifest:
        cover = item.get("cover_image") or ""
        if cover and not item.get("cover_word") and not cover.startswith(GEMINI_COVER_REL):
            continue  # real artwork (e.g. 万物有意思 page scans) stays untouched
        gemini_file = REPO_ROOT / GEMINI_COVER_REL / f"{item['id']}.webp"
        if gemini_file.is_file():
            item["cover_image"] = f"{GEMINI_COVER_REL}/{item['id']}.webp"
            item.pop("cover_word", None)
            gemini += 1
            continue
        word = pick_cover_word(item, index)
        if not word or word not in index:
            print(f"[!] {item['id']}: no illustration found")
            continue
        item["cover_image"] = index[word]
        item["cover_word"] = word
        assigned += 1
        if args.dry_run:
            print(f"{item['id']}\t{word}\t{item['title']['zh']}\t{item['title']['vi']}")

    print(f"[*] {assigned} SVG covers, {gemini} Gemini covers ({len(index)} illustrated words).")
    if not args.dry_run:
        with open(MANIFEST, "w", encoding="utf-8") as f:
            json.dump(manifest, f, ensure_ascii=False, indent=2)
            f.write("\n")


if __name__ == "__main__":
    main()
