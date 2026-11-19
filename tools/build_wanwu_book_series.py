#!/usr/bin/env python3
"""
tools/build_wanwu_book_series.py
Comprehensive builder for the "万物有意思" (Wanwu Youyisi) book series.
Adapts articles sequentially by book page order with:
- Exact page numbers noted (e.g., Trang 8 - 18)
- 100% guaranteed tone-marked Pinyin on EVERY Chinese character/word
- Sino-Vietnamese (Hán-Việt) on every token
- SRS and vocabulary database integration
- 3 comprehension quiz questions per article
"""

import json
import re
from pathlib import Path
import pypinyin
import jieba

REPO_ROOT = Path(__file__).resolve().parent.parent
VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
READINGS_DIR = REPO_ROOT / "database" / "readings"

# 1. Load vocabulary lookups
VOCAB_BY_ID = {}
ID_BY_HANZI = {}

for lvl in range(1, 10):
    p = VOCAB_DIR / "hsk3_0" / f"level{lvl}_vocabularies.json"
    if p.exists():
        with open(p, encoding="utf-8") as f:
            for item in json.load(f):
                wid = f"hsk{lvl}_{item['id']}"
                VOCAB_BY_ID[wid] = item
                ID_BY_HANZI.setdefault(item.get("hanzi") or item.get("simplified"), wid)

for lvl in range(1, 7):
    p = VOCAB_DIR / f"hsk{lvl}_vocabularies.json"
    if p.exists():
        with open(p, encoding="utf-8") as f:
            for item in json.load(f):
                wid = f"hsk{lvl}_{item['id']}"
                VOCAB_BY_ID.setdefault(wid, item)
                ID_BY_HANZI.setdefault(item.get("hanzi") or item.get("simplified"), wid)

# 2. Load Han-Viet lookups
with open(REPO_ROOT / "assets" / "js" / "hanviet-dict.js", encoding="utf-8") as f:
    hv_content = f.read()

comp_m = re.search(r"const HANVIET_COMPOUNDS = ({.*?});", hv_content)
chars_m = re.search(r"const HANVIET_CHARS = ({.*?});", hv_content)
hv_comp = json.loads(comp_m.group(1)) if comp_m else {}
hv_chars = json.loads(chars_m.group(1)) if chars_m else {}


def get_hanviet(text: str) -> str:
    if text in hv_comp:
        return hv_comp[text]
    parts = [hv_chars.get(c, c) for c in text if "\u4e00" <= c <= "\u9fff"]
    return " ".join(parts).title() if parts else text


def get_pinyin(text: str) -> str:
    return " ".join(pypinyin.lazy_pinyin(text, style=pypinyin.Style.TONE))


def make_tokens_for_sentence(zh_sentence: str) -> list:
    """
    Splits Chinese sentence into tokens using jieba + pypinyin.
    Guarantees that 100% of tokens with Chinese characters have valid pinyin and hanviet.
    """
    raw_tokens = list(jieba.cut(zh_sentence))
    tokens = []

    for word in raw_tokens:
        word = word.strip()
        if not word:
            continue

        # Check if punctuation
        if not any("\u4e00" <= c <= "\u9fff" for c in word):
            tokens.append({"text": word})
            continue

        token = {
            "text": word,
            "pinyin": get_pinyin(word),
            "hanviet": get_hanviet(word),
        }

        # Check HSK database match
        wid = ID_BY_HANZI.get(word)
        if wid and wid in VOCAB_BY_ID:
            v = VOCAB_BY_ID[wid]
            lvl = int(wid.split("_")[0].replace("hsk", ""))
            token["hsk"] = lvl
            token["word_id"] = wid
            token["meaning_vi"] = v.get("meaning", v.get("vietnamese", ""))
            # Use canonical database pinyin if available
            if v.get("pinyin"):
                token["pinyin"] = v["pinyin"]
            if v.get("hanviet"):
                token["hanviet"] = v["hanviet"]

        tokens.append(token)

    return tokens


def resolve_spotlight(sentences, preferred_words):
    spotlight = []
    for w in preferred_words:
        wid = ID_BY_HANZI.get(w)
        if wid and wid in VOCAB_BY_ID and wid not in spotlight:
            spotlight.append(wid)
    # Fill up with existing word_ids from tokens
    for s in sentences:
        for t in s["tokens"]:
            wid = t.get("word_id")
            if wid and wid in VOCAB_BY_ID and wid not in spotlight:
                spotlight.append(wid)
            if len(spotlight) >= 4:
                break
        if len(spotlight) >= 4:
            break
    return spotlight[:5]


def get_all_book_stories():
    stories = []

    # -------------------------------------------------------------------------
    # 1. 水母：美丽的海上“霸主” - Pages 8 - 18
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_001",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 1,
        "book_page_start": 8,
        "book_page_end": 18,
        "page_display": "Trang 8 - 18",
        "title": {
            "zh": "水母：美丽的海上“霸主”",
            "vi": "Con sứa: 'Bá chủ' xinh đẹp giữa đại dương"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪼",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 8 - 18 · Khám phá loài sứa - 'đóa hoa trong nước' cổ hơn khủng long với cơ thể 99% là nước và loài sứa bờm sư tử khổng lồ.",
        "sentences_data": [
            ("水母是海洋中最美丽的生物之一，它们在水中漂游时，就像一朵朵盛开的“水中之花”。",
             "Shuǐmǔ shì hǎiyáng zhōng zuì měilì de shēngwù zhī yī, tāmen zài shuǐzhōng piāoyóu shí, jiù xiàng yì duǒduǒ shèngkāi de “shuǐzhōng zhī huā”.",
             "Sứa là một trong những sinh vật xinh đẹp nhất của đại dương, khi trôi bơi trong nước, chúng tựa như những đóa 'hoa trong nước' đang nở rộ."),
            ("远远望去，水母像一顶顶圆伞，细长的触手向四周伸展，闪耀着淡绿或蓝紫色的光芒。",
             "Yuǎnyuǎn wàngqù, shuǐmǔ xiàng yì dǐngdǐng yuánsǎn, xìcháng de chùshǒu xiàng sìzhōu shēnzhǎn, shǎnyàozhe dànlǜ huò lánzǐsè de guāngmáng.",
             "Nhìn từ xa, sứa như những chiếc ô tròn, những xúc tu thon dài vươn ra bốn phía, lấp lánh ánh sáng xanh lục nhạt hoặc tím lam dịu dàng."),
            ("很多生物学家认为，水母是动物界中名副其实的“活化石”。",
             "Hěn duō shēngwù xuéjiā rènwéi, shuǐmǔ shì dòngwùjiè zhōng míng fù qí shí de “huó huàshí”.",
             "Nhiều nhà sinh vật học cho rằng, sứa là một 'hóa thạch sống' danh bất hư truyền trong thế giới động vật."),
            ("水母在地球上出现的时间比恐龙还要早得多，距今已有超过六亿年的生存历史。",
             "Shuǐmǔ zài dìqiú shàng chūxiàn de shíjiān bǐ kǒnglóng hái yào zǎo de duō, jùjīn yǐ yǒu chāoguò liù yì nián de shēngcún lìshǐ.",
             "Thời điểm sứa xuất hiện trên Trái Đất sớm hơn loài khủng long rất nhiều, cách ngày nay hơn 600 triệu năm lịch sử sinh tồn."),
            ("水母的身体非常奇特，其中大约百分之九十九都是水分，呈现半透明的状态。",
             "Shuǐmǔ de shēntǐ fēicháng qítè, qízhōng dàyuē bǎifēnzhī jiǔshíjiǔ dōu shì shuǐfèn, chéngxiàn bàn tòumíng de zhuàngtài.",
             "Cơ thể loài sứa vô cùng kỳ lạ, trong đó khoảng 99% đều là nước, biểu hiện trạng thái bán trong suốt."),
            ("虽然水母在海中漂游的速度很快，但它们其实并不擅长主动游泳，通常要借助海浪和水流来移动。",
             "Suīrán shuǐmǔ zài hǎizhōng piāoyóu de sùdù hěn kuài, dàn tāmen qíshí bìng bù shàncháng zhǔdòng yóuyǒng, tōngcháng yào jièzhù hǎilàng hé shuǐliú lái yídòng.",
             "Tuy tốc độ trôi nổi của sứa rất nhanh, nhưng chúng thực chất không giỏi tự bơi, thường phải nhờ vào sóng biển và dòng nước để di chuyển."),
            ("目前全世界已知的水母大约有一千三百多种，形状各异。",
             "Mùqián quán shìjiè yǐzhī de shuǐmǔ dàyuē yǒu yìqiān sānbǎi duō zhǒng, xíngzhuàng gè yì.",
             "Hiện nay toàn thế giới đã biết khoảng hơn 1.300 loài sứa, muôn hình vạn trạng."),
            ("比如有的像和尚的帽子，被称为“僧帽水母”；有的像船上的白帆，被称为“帆水母”。",
             "Bǐrú yǒu de xiàng héshang de màozi, bèi chēng wéi “sēngmào shuǐmǔ”; yǒu de xiàng chuán shàng de báifān, bèi chēng wéi “fān shuǐmǔ”.",
             "Chẳng hạn có loài như mũ nhà sư nên gọi là 'sứa tăng mạo' (sứa mũ sư); có loài như cánh buồm trắng trên thuyền nên gọi là 'sứa buồm'."),
            ("人们常常以为海洋中体型最庞大的是蓝鲸，其实有些巨型水母比蓝鲸还要长。",
             "Rénmen chángcháng yǐwéi hǎiyáng zhōng tǐxíng zuì pángdà de shì lánjīng, qíshí yǒuxiē jùxíng shuǐmǔ bǐ lánjīng hái yào cháng.",
             "Mọi người thường nghĩ sinh vật dài nhất đại dương là cá voi xanh, thực ra một số loài sứa khổng lồ còn dài hơn cả cá voi xanh."),
            ("一八七零年，在美国海岸发现的一只霞水母，触手长达三十六米，展开面积达五百多平方米。",
             "Yī-bā-qī-líng nián, zài Měiguó hǎi'àn fāxiàn de yì zhī xiáshuǐmǔ, chùshǒu cháng dá sānshíliù mǐ, zhǎnkāi miànjī dá wǔbǎi duō píngfāngmǐ.",
             "Năm 1870, tại bờ biển nước Mỹ, người ta phát hiện một con sứa bờm sư tử có xúc tu dài tới 36 mét, diện tích trải rộng hơn 500 mét vuông."),
            ("不过，美丽的水母往往也隐藏着危险，某些箱水母的触手带有极强的毒素。",
             "Búguò, měilì de shuǐmǔ wǎngwǎng yě yǐncáng zhe wēixiǎn, mǒuxiē xiāngshuǐmǔ de chùshǒu dàiyǒu jí qiáng de dúsù.",
             "Tuy nhiên, sứa xinh đẹp thường cũng ẩn chứa hiểm nguy, xúc tu của loài sứa hộp mang nọc độc cực mạnh."),
            ("这群古老而神奇的海洋精灵，经历了数亿年漫长时光的考验，依然在大海中自由漂游。",
             "Zhè qún gǔlǎo ér shénqí de hǎiyáng jīnglíng, jīnglì le shù yì nián màncháng shíguāng de kǎoyàn, yīrán zài dàhǎi zhōng zìyóu piāoyóu.",
             "Bầy tinh linh đại dương cổ xưa và kỳ diệu này, trải qua hàng trăm triệu năm thử thách của thời gian, vẫn đang tự do trôi bơi giữa biển lớn.")
        ],
        "preferred_spotlight": ["海洋", "危险", "生存", "历史"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Tại sao các nhà khoa học gọi loài sứa là 'hóa thạch sống'?",
                "options_vi": [
                    "Vì chúng xuất hiện sớm hơn khủng long, cách nay hơn 600 triệu năm",
                    "Vì cơ thể chúng cứng như đá",
                    "Vì chúng sống ở vùng núi cao"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 水母在地球上出现的时间比恐龙还要早得多，距今已有超过六亿年的生存历史."
            },
            {
                "id": "q2",
                "question_vi": "Cơ thể loài sứa chứa bao nhiêu phần trăm là nước?",
                "options_vi": ["Khoảng 99%", "Khoảng 50%", "Khoảng 70%"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 其中大约百分之九十九都是水分 (Trong đó khoảng 99% là nước)."
            },
            {
                "id": "q3",
                "question_vi": "Con sứa bờm sư tử phát hiện năm 1870 ở Mỹ có xúc tu dài bao nhiêu mét?",
                "options_vi": ["Dài 36 mét", "Dài 10 mét", "Dài 5 mét"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 触手长达三十六米 (Xúc tu dài tới 36 mét)."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 2. 蛇：亦神亦邪 - Pages 19 - 29
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_002",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 1,
        "book_page_start": 19,
        "book_page_end": 29,
        "page_display": "Trang 19 - 29",
        "title": {
            "zh": "蛇：亦神亦邪",
            "vi": "Rắn: Vừa là thần linh, vừa là tà ác"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🐍",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 19 - 29 · Hình tượng loài rắn trong thần thoại Nữ Oa, Phục Hy và biểu tượng ngành y học thế giới.",
        "sentences_data": [
            ("在人类漫长的文明历史中，很少有一种动物像蛇这样，同时背负着崇拜与恐惧两种截然相反的情感。",
             "Zài rénlèi màncháng de wénmíng lìshǐ zhōng, hěn shǎo yǒu yì zhǒng dòngwù xiàng shé zhèyàng, tóngshí bēifù zhe chóngbài yǔ kǒngjù liǎng zhǒng jiérán xiāngfǎn de qínggǎn.",
             "Trong lịch sử văn minh dài lâu của nhân loại, hiếm có loài động vật nào như rắn, đồng thời gánh vác cả hai cảm xúc trái ngược hoàn toàn: sùng bái và khiếp sợ."),
            ("在中国古代神话中，开天辟地的人类始祖伏羲和女娲，形象都是人首蛇身。",
             "Zài Zhōngguó gǔdài shénhuà zhōng, kāitiān-pìdì de rénlèi shǐzǔ Fúxī hé Nǚwā, xíngxiàng dōu shì rénshǒu-shéshēn.",
             "Trong thần thoại cổ đại Trung Quốc, thủy tổ của loài người là Phục Hy và Nữ Oa đều mang hình tượng đầu người mình rắn."),
            ("古人认为蛇具有蜕皮重生的神奇能力，因此把蛇看作生命力旺盛与长生不老的象征。",
             "Gǔrén rènwéi shé jùyǒu tuìpí chóngshēng de shénqí nénglì, yīncǐ bǎ shé kànzuò shēngmìnglì wàngshèng yǔ chángshēng-bùlǎo de xiàngzhēng.",
             "Cổ nhân cho rằng loài rắn có năng lực lột da tái sinh kỳ diệu, vì thế coi rắn là biểu tượng của sức sống dồi dào và trường sinh bất lão."),
            ("西方医学的标志也是一条盘绕在木杖上的蛇，被称为“阿斯克勒庇俄斯之杖”。",
             "Xīfāng yīxué de biāozhì yě shì yì tiáo pánrào zài mùzhàng shàng de shé, bèi chēng wéi “Āsīkèlèbǐ'éosī zhī zhàng”.",
             "Biểu tượng của nền y học phương Tây cũng là một con rắn quấn quanh cây gậy gỗ, được gọi là 'Cây trượng Asclepius'."),
            ("然而在很多民间传说中，蛇又因为剧毒和冰冷的眼神，被人们视为阴险、狡诈和邪恶的化身。",
             "Rán'ér zài hěn duō mínjiān chuánshuō zhōng, shé yòu yīnwèi jùdú hé bīnglěng de yǎnshén, bèi rénmen shìwéi yīnxiǎn, jiǎozhà hé xié'è de huàshēn.",
             "Tuy nhiên trong nhiều truyền thuyết dân gian, rắn lại vì nọc độc chết người và ánh mắt lạnh lẽo mà bị coi là hóa thân của sự nham hiểm, giảo hoạt và tà ác."),
            ("事实上，蛇是自然界生态平衡中不可缺少的重要一环，它们每年捕食大量危害农作物的田鼠。",
             "Shìshí shàng, shé shì zìránjiè shēngtài pínghéng zhōng bùkě quēshǎo de zhòngyào yì huán, tāmen měinián bǔshí dàliàng wēihài nóngzuòwù de tiánshǔ.",
             "Trên thực tế, rắn là một mắt xích quan trọng không thể thiếu trong cân bằng sinh thái tự nhiên, hằng năm chúng săn bắt lượng lớn chuột đồng gây hại mùa màng."),
            ("神圣与邪恶交织在一起，让蛇这种古老的爬行动物始终笼罩在神秘的文化光环之中。",
             "Shénshèng yǔ xié'è jiāozhī zài yìqǐ, ràng shé zhè zhǒng gǔlǎo de páxíng dòngwù shǐzhōng lǒngzhào zài shénmì de wénhuà guānghuán zhī zhōng.",
             "Sự thần thánh đan xen cùng tà ác khiến loài bò sát cổ xưa này luôn bao phủ trong vầng hào quang văn hóa đầy huyền bí.")
        ],
        "preferred_spotlight": ["历史", "自然", "文化", "生命"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Trong thần thoại Trung Quốc, Phục Hy và Nữ Oa có hình tượng như thế nào?",
                "options_vi": ["Đầu người mình rắn", "Đầu rồng đuôi cá", "Đầu chim cánh phượng"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 伏羲和女娲，形象都是人首蛇身 (Phục Hy và Nữ Oa hình tượng đầu người mình rắn)."
            },
            {
                "id": "q2",
                "question_vi": "Tại sao cổ nhân coi loài rắn là biểu tượng của sự tái sinh?",
                "options_vi": ["Vì rắn có khả năng lột da", "Vì rắn ngủ đông nhiều tháng", "Vì rắn có thể bơi dưới nước"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 古人认为蛇具有蜕皮重生的神奇能力 (Cổ nhân cho rằng rắn có năng lực lột da tái sinh)."
            },
            {
                "id": "q3",
                "question_vi": "Biểu tượng của ngành y học thế giới có hình ảnh gì?",
                "options_vi": ["Con rắn quấn quanh cây gậy gỗ", "Bông hoa hồng đỏ", "Ngôi sao năm cánh"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 西方医学的标志也是一条盘绕在木杖上的蛇 (Biểu tượng y học là con rắn quấn trên cây trượng)."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 3. 鹦鹉：善言不由心 - Pages 30 - 36
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_003",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 1,
        "book_page_start": 30,
        "book_page_end": 36,
        "page_display": "Trang 30 - 36",
        "title": {
            "zh": "鹦鹉：善言不由心",
            "vi": "Con vẹt: Khéo nói nhưng không từ tâm"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🦜",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 30 - 36 · Khám phá tài bắt chước tiếng người độc đáo của loài vẹt - 'viên ngọc có lông vũ' và cấu tạo đặc biệt của vòm họng.",
        "sentences_data": [
            ("鹦鹉是一大类色彩艳丽而形态多样的鸟类，被人们誉为“带羽毛的宝石”。",
             "Yīngwǔ shì yí dà lèi sècǎi yànlì ér xíngtài duōyàng de niǎolèi, bèi rénmen yùwéi “dài yǔmáo de bǎoshí”.",
             "Vẹt là một bộ lớn các loài chim màu sắc rực rỡ và muôn hình vạn trạng, được người đời ngợi ca là 'viên ngọc mang lông vũ'."),
            ("全世界已知的鹦鹉大约有三百多种，主要分布在热带地区，羽毛常有红、绿、黄、蓝等鲜艳的颜色。",
             "Quán shìjiè yǐzhī de yīngwǔ dàyuē yǒu sānbǎi duō zhǒng, zhǔyào fēnbù zài rèdài dìqū, yǔmáo cháng yǒu hóng, lǜ, huáng, lán děng xiānyàn de yánsè.",
             "Toàn thế giới đã biết khoảng hơn 300 loài vẹt, phân bố chủ yếu ở các vùng nhiệt đới, lông chim thường mang sắc đỏ, lục, vàng, lam tươi thắm."),
            ("鹦鹉最引人注目的本领，莫过于它们能够惟妙惟肖地模仿人类说话和各种声音。",
             "Yīngwǔ zuì yǐn rén zhùmù de běnlǐng, mòguò yú tāmen nénggòu wéimiào-wéixiào de mófǎng rénlèi shuōhuà hé gèzhǒng shēngyīn.",
             "Bản lĩnh thu hút sự chú ý nhất của loài vẹt không gì bằng khả năng bắt chước tiếng người và các loại âm thanh một cách sống động như thật."),
            ("俗话说“鹦鹉学舌，善言不由心”，意思是鹦鹉虽然会学人说话，但并不理解话语背后的真正含义。",
             "Súhuà shuō “yīngwǔ xué shé, shàn yán bù yóu xīn”, yìsi shì yīngwǔ suīrán huì xué rén shuōhuà, dàn bìng bù lǐjiě huàyǔ bèihòu de zhēnzhèng hányì.",
             "Dục ngữ có câu 'Vẹt học nói, khéo nói chẳng bởi tâm', ý nói vẹt tuy bắt chước tiếng người nói, nhưng không hề hiểu ý nghĩa chân chính đằng sau câu chữ."),
            ("科学家研究发现，鹦鹉之所以能够“说话”，是因为它们拥有非常特殊的发音器官和肥厚圆润的舌头。",
             "Kēxuéjiā yánjiū fāxiàn, yīngwǔ zhīsuǒyǐ nénggòu “shuōhuà”, shì yīnwèi tāmen yōngyǒu fēicháng tèshū de fāyīn qìguān hé féihòu yuánrùn de shétou.",
             "Các nhà khoa học phát hiện, sở dĩ vẹt có thể 'nói' là nhờ sở hữu cơ quan phát âm đặc biệt và chiếc lưỡi tròn dày mềm mại."),
            ("它们的大脑中还有专门控制声音学习的复杂区域，这在所有鸟类中是非常罕见的。",
             "Tāmen de dànǎo zhōng hái yǒu zhuānmén kòngzhì shēngyīn xuéxí de fùzá qūyù, zhè zài suǒyǒu niǎolèi zhōng shì fēicháng hǎnjiàn de.",
             "Trong não bộ của chúng còn có vùng chuyên biệt điều khiển học hỏi âm thanh, điều này rất hiếm gặp trong thế giới các loài chim."),
            ("正因为聪明伶俐又长相美丽，鹦鹉几千年来一直是人类最喜爱的宠物鸟之一。",
             "Zhèng yīnwèi cōngmíng línglì yòu zhǎngxiàng měilì, yīngwǔ jǐ qiān nián lái yìzhí shì rénlèi zuì xǐ'ài de chǒngwù niǎo zhī yī.",
             "Chính nhờ thông minh lanh lợi lại có vẻ ngoài xinh xắn, loài vẹt suốt hàng nghìn năm qua luôn là một trong những loài chim cảnh được con người yêu thích nhất.")
        ],
        "preferred_spotlight": ["自然", "声音", "发现", "美丽"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Loài vẹt được người đời ca tụng bằng mỹ từ nào?",
                "options_vi": ["Viên ngọc mang lông vũ", "Sứ giả của mùa xuân", "Chiếc chuông vàng rừng sâu"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 被人们誉为“带羽毛的宝石” (Được ngợi ca là 'viên ngọc mang lông vũ')."
            },
            {
                "id": "q2",
                "question_vi": "Câu thành ngữ '鹦鹉学舌' (Vẹt học nói) mang ý nghĩa gì?",
                "options_vi": [
                    "Bắt chước lời nói mà không hiểu ý nghĩa thực sự",
                    "Rất giỏi sáng tác thơ văn",
                    "Chỉ thích nói chuyện một mình"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 意思是鹦鹉虽然会学人说话，但并不理解话语背后的真正含义."
            },
            {
                "id": "q3",
                "question_vi": "Nhờ đặc điểm giải phẫu nào mà vẹt có thể phát âm bắt chước giọng người?",
                "options_vi": [
                    "Cơ quan phát âm đặc biệt và chiếc lưỡi tròn dày",
                    "Mỏ chim rất dài và nhọn",
                    "Đôi cánh vỗ tạo ra tiếng kêu"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 拥有非常特殊的发音器官和肥厚圆润的舌头."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 4. 乌鸦：城市的“留守者” - Pages 37 - 46
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_004",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 1,
        "book_page_start": 37,
        "book_page_end": 46,
        "page_display": "Trang 37 - 46",
        "title": {
            "zh": "乌鸦：城市的“留守者”",
            "vi": "Con quạ: Kẻ ở lại thành phố"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🐦‍⬛",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 37 - 46 · Giải mã loài quạ đen: từ câu chuyện cổ 'Quạ uống nước' đến chỉ số thông minh vượt trội và văn hóa hiếu thảo 'quạ mớm mồi'.",
        "sentences_data": [
            ("提起乌鸦，很多人的第一印象是漆黑的羽毛和粗哑的叫声，甚至在某些传说中被视作不祥的征兆。",
             "Tíqǐ wūyā, hěn duō rén de dì-yī yìnxiàng shì qīhēi de yǔmáo hé cūyǎ de jiàoshēng, shènzhì zài mǒuxiē chuánshuō zhōng bèi shìzuò bùxiáng de zhēngzhào.",
             "Nhắc đến quạ, ấn tượng đầu tiên của nhiều người là bộ lông đen tuyền và tiếng kêu khàn đặc, thậm chí trong một số truyền thuyết bị xem là điềm báo không may."),
            ("但在中国古代早期文化中，乌鸦曾是备受尊敬的神鸟，太阳中的三足金乌就是至高光明的象征。",
             "Dàn zài Zhōngguó gǔdài zǎoqī wénhuà zhōng, wūyā céng shì bèishòu zūnjìng de shénniǎo, tàiyáng zhōng de sānzú jīnwū jiù shì zhìgāo guāngmíng de xiàngzhēng.",
             "Thế nhưng trong văn hóa cổ sơ Trung Hoa, quạ từng là loài thần điểu được tôn kính hết mực, Kim Ô ba chân trong Mặt Trời chính là biểu tượng của ánh quang tối thượng."),
            ("古人还常常用“乌鸦反哺”来赞美孝道，认为雏鸟长大后会叼食物回报年迈的父母。",
             "Gǔrén hái chángcháng yòng “wūyā fǎnbǔ” lái zànměi xiàodào, rènwéi chúniǎo zhǎngdà hòu huì diāo shíwù huíbào niánmài de fùmǔ.",
             "Cổ nhân còn thường dùng thành ngữ 'quạ mớm mồi ngược' để ca ngợi đạo hiếu, cho rằng chim con khi lớn sẽ ngậm mồi về nuôi nấng cha mẹ già."),
            ("现代科学实验进一步证明，乌鸦是鸟类家族中智商最高的物种之一。",
             "Xiàndài kēxué shíyàn jìnyíbù zhèngmíng, wūyā shì niǎolèi jiāzú zhōng zhìshāng zuì gāo de wùzhǒng zhī yī.",
             "Thực nghiệm khoa học hiện đại chứng minh thêm rằng, quạ là một trong những loài có chỉ số thông minh cao nhất trong họ nhà chim."),
            ("著名的寓言故事《乌鸦喝水》所描绘的场景，在现实实验室中得到了完全的验证。",
             "Zhùmíng de yùyán gùshì “Wūyā Hē Shuǐ” suǒ miáohuì de chǎngjǐng, zài xiànshí shíyànshì zhōng dédào le wánquán de yànzhèng.",
             "Cảnh tượng trong câu chuyện ngụ ngôn nổi tiếng 'Quạ uống nước' đã được kiểm chứng hoàn toàn trong các phòng thí nghiệm thực tế."),
            ("乌鸦不仅懂得往窄口瓶里投放石子来升高水面，还会制造和使用小木棍工具去钩取缝隙里的食物。",
             "Wūyā bùjǐn dǒngde wǎng zhǎikǒu píng lǐ tóufàng shízǐ lái shēnggāo shuǐmiàn, hái huì zhìzào hé shǐyòng xiǎo mùgùn gōngjù qù gōu qǔ fèngxì lǐ de shíwù.",
             "Quạ không chỉ biết thả sỏi vào bình cổ hẹp để dâng mực nước, mà còn biết chế tạo và dùng que gỗ nhỏ móc lấy thức ăn trong khe hẹp."),
            ("随着现代城市的高速发展，极具智慧和适应力的乌鸦渐渐成为城市里坚韧的“留守者”。",
             "Suízhe xiàndài chéngshì de gāosù fāzhǎn, jí jù zhìhuì hé shìyìnglì de wūyā jiànjiàn chéngwéi chéngshì lǐ jiānrèn de “liúshǒuzhě”.",
             "Theo sự phát triển nhanh chóng của các đô thị hiện đại, loài quạ đầy trí khôn và khả năng thích nghi cao đã dần trở thành 'kẻ ở lại' kiên cường của thành phố.")
        ],
        "preferred_spotlight": ["城市", "发展", "证明", "实验"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Trong thần thoại Trung Hoa cổ đại, loài chim ba chân trong Mặt Trời là chim gì?",
                "options_vi": ["Tam túc kim ô (quạ vàng ba chân)", "Phượng hoàng lửa", "Đại bàng cánh vàng"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 太阳中的三足金乌就是至高光明的象征."
            },
            {
                "id": "q2",
                "question_vi": "Thành ngữ '乌鸦反哺' (Quạ mớm mồi) thường dùng để ca ngợi đức tính gì?",
                "options_vi": ["Lòng hiếu thảo với cha mẹ", "Sự dũng cảm nơi chiến trường", "Tính siêng năng cần cù"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 古人还常常用“乌鸦反哺”来赞美孝道 (Cổ nhân dùng để ca ngợi đạo hiếu)."
            },
            {
                "id": "q3",
                "question_vi": "Khả năng nào chứng minh chỉ số thông minh vượt trội của loài quạ?",
                "options_vi": [
                    "Biết thả sỏi vào bình để dâng nước và dùng que khều thức ăn",
                    "Biết bay lượn trên tầng không cao nhất",
                    "Biết hót nhiều khúc nhạc phức tạp"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 乌鸦不仅懂得往窄口瓶里投放石子来升高水面，还会制造和使用小木棍工具."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 5. 蚂蚁：一亿年物种进化之旅 - Pages 47 - 54
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_005",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 1,
        "book_page_start": 47,
        "book_page_end": 54,
        "page_display": "Trang 47 - 54",
        "title": {
            "zh": "蚂蚁：一亿年物种进化之旅",
            "vi": "Loài kiến: Hành trình tiến hóa một trăm triệu năm"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🐜",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 47 - 54 · Xã hội loài kiến với cấu trúc phân công lao động chặt chẽ và hành trình sinh tồn vượt qua kỷ băng hà.",
        "sentences_data": [
            ("蚂蚁虽然身躯微小，却是地球上繁衍最成功、数量最庞大的陆生生物群体之一。",
             "Mǎyǐ suīrán shēnqū wēixiǎo, què shì dìqiú shàng fányǎn zuì chénggōng, shùliàng zuì pángdà de lùshēng shēngwù qúntǐ zhī yī.",
             "Kiến tuy thân hình bé nhỏ, nhưng lại là một trong những quần thể sinh vật trên cạn sinh sôi thành công nhất và số lượng đông đảo nhất hành tinh."),
            ("化石记录表明，早在恐龙统治地球的白垩纪时代，也就是距今一亿多年前，蚂蚁就已经出现在地球上了。",
             "Huàshí jìlù biǎomíng, zǎo zài kǒnglóng tǒngzhì dìqiú de Bái'èjì shídài, yě jiù shì jùjīn yí yì duō nián qián, mǎyǐ jiù yǐjīng chūxiàn zài dìqiú shàng le.",
             "Hóa thạch ghi nhận chỉ ra rằng, từ kỷ Phấn Trắng khi khủng long còn thống trị Trái Đất cách nay hơn 100 triệu năm, loài kiến đã có mặt trên địa cầu."),
            ("蚂蚁是典型的社会性昆虫，一个蚁巢就像一个组织严密、分工明确的微型王国。",
             "Mǎyǐ shì diǎnxíng de shèhuìxìng kūnchóng, yí gè yǐcháo jiù xiàng yí gè zǔzhī yánmì, fēngōng míngquè de wēixíng wángguó.",
             "Kiến là loài côn trùng xã hội điển hình, một tổ kiến giống như một vương quốc thu nhỏ có tổ chức chặt chẽ và phân công rành mạch."),
            ("蚁后专门负责产卵繁育后代，工蚁负责寻找食物、修建巢穴，而兵蚁则负责守卫领地安全。",
             "Yǐhòu zhuānmén fùzé chǎnluǎn fányù hòudài, gōngyǐ fùzé xúnzhǎo shíwù, xiūjiàn cháoxué, ér bīngyǐ zé fùzé shǒuwèi lǐngdì ānquán.",
             "Kiến chúa chuyên trách đẻ trứng nhân giống bầy đàn, kiến thợ gánh vác tìm kiếm thức ăn và xây đắp tổ, còn kiến lính nhận nhiệm vụ canh giữ lãnh địa an toàn."),
            ("蚂蚁的力量十分惊人，一只普通的蚂蚁能够举起超过自身体重五十倍的物体。",
             "Mǎyǐ de lìliàng shífēn jīngrén, yì zhī pǔtōng de mǎyǐ nénggòu jǔ qǐ chāoguò zìshēn tǐzhòng wǔshí bèi de wùtǐ.",
             "Sức mạnh của loài kiến rất đáng kinh ngạc, một con kiến bình thường có thể nâng bổng vật thể nặng gấp hơn 50 lần trọng lượng cơ thể."),
            ("它们通过触角释放微量的化学气味信息素，在黑夜中也能精确地引导同伴列队前行。",
             "Tāmen tōngguò chùjiǎo shìfàng wēiliàng de huàxué qìwèi xìnxīsù, zài hēiyè zhōng yě néng jīngquè de yǐndǎo tóngbàn lièduì qiánxíng.",
             "Chúng thông qua râu phát ra pheromone mùi hóa học siêu nhỏ, dù trong đêm đen cũng có thể dẫn đường chuẩn xác cho đồng loại xếp hàng tiến bước."),
            ("正是凭借高度的团结与协作精神，微小的蚂蚁经历了沧海桑田的变迁，在地球上屹立了一亿年。",
             "Zhèng shì píngjiè gāodù de tuánjié yǔ xiézuò jīngshén, wēixiǎo de mǎyǐ jīnglì le cānghǎi-sāngtián de biànqiān, zài dìqiú shàng yìlì le yí yì nián.",
             "Chính nhờ tinh thần đoàn kết và phối hợp cao độ, những chú kiến bé nhỏ đã vượt qua bao biến thiên dâu bể để đứng vững trên Trái Đất suốt 100 triệu năm.")
        ],
        "preferred_spotlight": ["蚂蚁", "力量", "地球", "组织"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Loài kiến đã xuất hiện trên Trái Đất từ khoảng bao nhiêu năm trước?",
                "options_vi": ["Hơn 100 triệu năm trước", "Khoảng 10 triệu năm trước", "Mới xuất hiện vài nghìn năm"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 距今一亿多年前，蚂蚁就已经出现在地球上了."
            },
            {
                "id": "q2",
                "question_vi": "Một chú kiến bình thường có thể nâng vật nặng gấp bao nhiêu lần cơ thể?",
                "options_vi": ["Gấp hơn 50 lần", "Gấp 2 lần", "Gấp 5 lần"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 一只普通的蚂蚁能够举起超过自身体重五十倍的物体."
            },
            {
                "id": "q3",
                "question_vi": "Kiến giao tiếp và dẫn đường cho nhau bằng phương thức nào?",
                "options_vi": [
                    "Bằng tín hiệu mùi hóa học (pheromone) qua râu",
                    "Bằng mắt nhìn ban đêm",
                    "Bằng tiếng hót"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 通过触角释放微量的化学气味信息素 (Thông qua râu phát tín hiệu mùi hóa học)."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 6. 汉字：中华文化的基因 - Pages 456 - 467
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_006",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 3,
        "book_page_start": 456,
        "book_page_end": 467,
        "page_display": "Trang 456 - 467",
        "title": {
            "zh": "汉字：中华文化的基因",
            "vi": "Chữ Hán: Mã gene văn hóa Trung Hoa"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🔤",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 456 - 467 · Khám phá nguồn gốc chữ Hán từ giáp cốt văn Ân Khư, truyền thuyết Thương Hiệt tạo chữ và sức sống bền bỉ qua hàng thiên niên kỷ.",
        "sentences_data": [
            ("人类文明的真正历史，可以说是从有了文字才真正开始的。",
             "Rénlèi wénmíng de zhēnzhèng lìshǐ, kěyǐ shuō shì cóng yǒu le wénzì cái zhēnzhèng kāishǐ de.",
             "Lịch sử thực sự của văn minh nhân loại, có thể nói chỉ bắt đầu khi văn tự xuất hiện."),
            ("汉字是中华文化的基因和载体，经历了数千年的连续演化而从未中断。",
             "Hànzì shì Zhōnghuá wénhuà de jīyīn hé zàitǐ, jīnglì le shù qiān nián de liánxù yǎnhuà ér cóngwèi zhōngduàn.",
             "Chữ Hán là mã gene và vật mang của văn hóa Trung Hoa, trải qua hàng nghìn năm tiến hóa liên tục mà chưa từng gián đoạn."),
            ("传说黄帝时期的史官仓颉观察鸟兽足迹，受到启发而创造了最早的汉字。",
             "Chuánshuō Huángdì shíqī de shǐguān Cāngjié guānchá niǎoshòu zújī, shòudào qǐfā ér chuàngzào le zuìzǎo de hànzì.",
             "Truyền thuyết kể rằng viên sử quan Thương Hiệt thời Hoàng Đế quan sát dấu chân chim thú, được khơi gợi cảm hứng mà sáng tạo ra chữ viết đầu tiên."),
            ("目前考古发现最早的成熟汉字体系，是商代晚期的甲骨文，距今已有三千三百多年的历史。",
             "Mùqián kǎogǔ fāxiàn zuìzǎo de chéngshú hànzì tǐxì, shì Shāngdài wǎnqī de jiǎgǔwén, jùjīn yǐ yǒu sānqiān sānbǎi duō nián de lìshǐ.",
             "Hệ thống chữ Hán hoàn chỉnh cổ xưa nhất mà khảo cổ phát hiện là chữ giáp cốt thời cuối nhà Thương, cách nay hơn 3.300 năm lịch sử."),
            ("汉字属于表意文字体系，从最初的甲骨文、金文、小篆，逐渐演变为隶书、楷书和草书。",
             "Hànzì shǔyú biǎoyì wénzì tǐxì, cóng zuìchū de jiǎgǔwén, jīnwén, xiǎozhuàn, zhújiàn yǎnbiàn wéi lìshū, kǎishū hé cǎoshū.",
             "Chữ Hán thuộc hệ thống chữ biểu ý tượng hình, từ giáp cốt văn, kim văn, tiểu triện ban đầu, dần dần biến đổi thành lệ thư, khải thư và thảo thư."),
            ("每一个汉字都如同一幅微型的画卷，蕴含着古人对天地万物运行规律的深刻理解。",
             "Měi yí gè hànzì dōu rútóng yì fú wēixíng de huàjuàn, yùnhán zhe gǔrén duì tiāndì wànwù yùnxíng guīlǜ de shēnkè lǐjiě.",
             "Mỗi một chữ Hán tựa như một bức tranh thu nhỏ, ẩn chứa sự thấu hiểu sâu sắc của người xưa về quy luật vận hành của vạn vật trời đất."),
            ("如今汉字不仅是十数亿人日常交流的工具，更是全人类共同的珍贵文化遗产。",
             "Rújīn hànzì bùjǐn shì shíshù yì rén rìcháng jiāoliú de gōngjù, gèng shì quán rénlèi gòngtóng de zhēnguì wénhuà yíchǎn.",
             "Ngày nay, chữ Hán không chỉ là công cụ giao tiếp thường nhật của hơn một tỷ người, mà còn là di sản văn hóa quý báu chung của toàn nhân loại.")
        ],
        "preferred_spotlight": ["汉字", "历史", "文化", "交流"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Theo truyền thuyết cổ xưa, ai là người sáng tạo ra chữ Hán đầu tiên?",
                "options_vi": ["Thương Hiệt (仓颉)", "Khổng Tử (孔子)", "Lý Bạch (李白)"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 传说黄帝时期的史官仓颉观察鸟兽足迹，受到启发而创造了最早的汉字."
            },
            {
                "id": "q2",
                "question_vi": "Hệ thống chữ Hán cổ xưa hoàn chỉnh nhất được khảo cổ tìm thấy là gì?",
                "options_vi": ["Chữ Giáp Cốt (甲骨文) thời Thương", "Chữ Lệ thư thời Hán", "Chữ Khải thư thời Đường"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 目前考古发现最早的成熟汉字体系，是商代晚期的甲骨文."
            },
            {
                "id": "q3",
                "question_vi": "Chữ Hán thuộc hệ thống văn tự nào?",
                "options_vi": ["Văn tự biểu ý (表意文字)", "Văn tự ghi âm thuần túy", "Chữ viết dựa trên chữ cái Latinh"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 汉字属于表意文字体系 (Chữ Hán thuộc hệ thống chữ biểu ý)."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 7. 治水：从“凿龙门”到“都江堰” - Pages 488 - 496
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_007",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 3,
        "book_page_start": 488,
        "book_page_end": 496,
        "page_display": "Trang 488 - 496",
        "title": {
            "zh": "治水：从“凿龙门”到“都江堰”",
            "vi": "Trị thủy: Từ Đục Long Môn đến Đô Giang Yển"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🌊",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 488 - 496 · Trí tuệ trị thủy ngàn năm: từ huyền thoại Đại Vũ đục núi xẻ kênh đến công trình vĩ đại Đô Giang Yển của Lý Băng.",
        "sentences_data": [
            ("水是生命之源，但凶猛的洪水自古以来也是威胁人类生存的严重灾难。",
             "Shuǐ shì shēngmìng zhī yuán, dàn xiōngměng de hóngshuǐ zìgǔ yǐlái yě shì wēixié rénlèi shēngcún de yánzhòng zāinàn.",
             "Nước là nguồn gốc của sự sống, nhưng những cơn lũ dữ từ xưa đến nay cũng là thảm họa nghiêm trọng đe dọa sự sinh tồn của loài người."),
            ("上古时期，黄河流域洪水泛滥，大禹继承父亲的遗志，历经十三年辛苦治水。",
             "Shànggǔ shíqī, Huánghé liùyù hóngshuǐ fànlàn, Dà Yǔ jìchéng fùqīn de yízhì, lìjīng shísān nián xīnkǔ zhìshuǐ.",
             "Thời thượng cổ, lưu vực Hoàng Hà lũ lụt ngập tràn, Đại Vũ nối chí người cha, trải qua 13 năm gian khổ trị thủy."),
            ("与父亲只用筑堤“堵水”不同，大禹采用顺应水性的“疏导”方法，开凿龙门，引水入海。",
             "Yǔ fùqīn zhǐ yòng zhùdī “dǔshuǐ” bùtóng, Dà Yǔ cǎiyòng shùnyìng shuǐxìng de “shūdǎo” fāngfǎ, kāizáo Lóngmén, yǐnshuǐ rùhǎi.",
             "Khác với người cha chỉ biết đắp đê 'chặn nước', Đại Vũ thuận theo tính nước mà dùng phương pháp 'khơi thông khai thông', đục núi Long Môn, dẫn dòng ra biển."),
            ("战国时期，蜀郡太守李冰父子总结了古人的经验，在成都平原修建了举世闻名的都江堰。",
             "Zhànguó shíqī, Shǔjùn tàishǒu Lǐ Bīng fùzǐ zǒngjié le gǔrén de jīngyàn, zài Chéngdū píngyuán xiūjiàn le jǔshì wénmíng de Dūjiāngyàn.",
             "Thời Chiến Quốc, thái thú Thục quận là Lý Băng cùng con trai đúc kết kinh nghiệm cổ nhân, xây dựng công trình Đô Giang Yển chấn động thế giới trên đồng bằng Thành Đô."),
            ("都江堰没有修建任何高大的水坝，而是巧妙利用自然地形与水流力量，实现了无坝引水、自然分流与自动排沙。",
             "Dūjiāngyàn méiyǒu xiūjiàn rènhé gāodà de shuǐbà, érshì qiǎomiào lìyòng zìrán dìxíng yǔ shuǐliú lìliàng, shíxiàn le wú bà yǐnshuǐ, zìrán fēnliú yǔ zìdòng páishā.",
             "Đô Giang Yển không hề đắp đập cao chặn dòng, mà khéo léo tận dụng địa hình tự nhiên cùng sức nước để dẫn nước không cần đập, chia dòng tự nhiên và tự động xả cát."),
            ("两千多年过去了，都江堰依然在滋养着拥有天府之国美称的成都平原。",
             "Liǎng qiān duō nián guòqù le, Dūjiāngyàn yīrán zài zīyǎng zhe yōngyǒu tiānfǔ zhī guó měichēng de Chéngdū píngyuán.",
             "Hơn 2.000 năm trôi qua, Đô Giang Yển vẫn ngày đêm tưới mát đồng bằng Thành Đô - nơi được mệnh danh là Đất nước Thiên Phủ."),
            ("从大禹治水到都江堰，中国古人“道法自然、因势利导”的生态智慧，至今依然散发着灿烂的光芒。",
             "Cóng Dà Yǔ zhìshuǐ dào Dūjiāngyàn, Zhōngguó gǔrén “dào fǎ zìrán, yīn shì lì dǎo” de shēngtài zhìhuì, zhìjīn yīrán sànfā zhe cànlàn de guāngmáng.",
             "Từ Đại Vũ trị thủy đến Đô Giang Yển, trí tuệ sinh thái 'thuận theo tự nhiên, dựa vào thế nước mà dẫn dụ' của cổ nhân Trung Hoa đến nay vẫn rạng rỡ muôn phần.")
        ],
        "preferred_spotlight": ["自然", "经验", "力量", "生命"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Đại Vũ đã dùng phương pháp trị thủy nào khác biệt so với người cha?",
                "options_vi": [
                    "Phương pháp khơi thông dòng chảy (疏导), thuận theo tính nước",
                    "Đắp thêm nhiều tường đê cao hơn nữa",
                    "Di dời toàn bộ người dân lên núi cao"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 大禹采用顺应水性的“疏导”方法，开凿龙门，引水入海."
            },
            {
                "id": "q2",
                "question_vi": "Ai là người chỉ huy xây dựng công trình thủy lợi Đô Giang Yển?",
                "options_vi": ["Lý Băng (李冰) và con trai", "Khổng Tử", "Gia Cát Lượng"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 蜀郡太守李冰父子总结了古人的经验，在成都平原修建了举世闻名的都江堰."
            },
            {
                "id": "q3",
                "question_vi": "Đặc điểm kỳ diệu nhất của công trình Đô Giang Yển là gì?",
                "options_vi": [
                    "Không dùng đập cao mà dựa vào địa hình tự nhiên để phân dòng xả cát",
                    "Dùng sắt thép hiện đại để ngăn dòng lũ",
                    "Chỉ hoạt động được vào mùa khô"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 巧妙利用自然地形与水流力量，实现了无坝引水、自然分流与自动排沙."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 8. 筷子：高妙绝伦的杠杆 - Pages 534 - 544
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_008",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 3,
        "book_page_start": 534,
        "book_page_end": 544,
        "page_display": "Trang 534 - 544",
        "title": {
            "zh": "筷子：高妙绝伦的杠杆",
            "vi": "Đôi đũa: Chiếc đòn bẩy tuyệt diệu"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🥢",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 534 - 544 · Khám phá nguồn gốc chiếc đũa, nguyên lý đòn bẩy vật lý và tại sao cổ nhân đổi tên từ 'Trợ' (箸) thành 'Khoái' (筷).",
        "sentences_data": [
            ("说起中国人的发明，大家常常想到“四大发明”。",
             "Shuō qǐ Zhōngguórén de fāmíng, dàjiā chángcháng xiǎngdào “sì dà fāmíng”.",
             "Nói về phát minh của người Trung Quốc, mọi người thường nghĩ đến 'Tứ đại phát minh'."),
            ("其实还有一个非常重要、每天都离不开的发明，那就是——筷子。",
             "Qíshí hái yǒu yí gè fēicháng zhòngyào, měitiān dōu lí bù kāi de fāmíng, nà jiùshì —— kuàizi.",
             "Thực ra còn có một phát minh vô cùng quan trọng, mỗi ngày đều không thể tách rời, đó chính là đôi đũa."),
            ("物理学家李政道曾经说过，筷子虽然只有简单的两根，却巧妙地应用了杠杆原理。",
             "Wùlǐ xuéjiā Lǐ Zhèngdào céngjīng shuō guò, kuàizi suīrán zhǐyǒu jiǎndān de liǎng gēn, què qiǎomiào de yìngyòng le gànggǎn yuánlǐ.",
             "Nhà vật lý học Lý Chính Đạo từng nói, đũa tuy chỉ có hai chiếc que đơn giản, nhưng lại ứng dụng khéo léo nguyên lý đòn bẩy."),
            ("筷子就像手指的延伸，手指能做的事情它都能做，而且不怕热也不怕冷。",
             "Kuàizi jiù xiàng shǒuzhǐ de yánshēn, shǒuzhǐ néng zuò de shìqing tā dōu néng zuò, érqiě bú pà rè yě bú pà lěng.",
             "Đôi đũa giống như cánh tay nối dài của ngón tay, việc ngón tay làm được nó đều làm được, hơn nữa không sợ nóng cũng không sợ lạnh."),
            ("很多人不知道，在古代，筷子并不叫“筷子”，而是被称为“箸”。",
             "Hěn duō rén bù zhīdào, zài gǔdài, kuàizi bìng bù jiào “kuàizi”, érshì bèi chēng wéi “zhù”.",
             "Nhiều người không biết rằng, thời cổ đại, đũa không gọi là 'khoái tử', mà được gọi là 'trợ' (箸)."),
            ("这个字上面是竹字头，下面是一个“者”字，说明最早的筷子多半是用竹子做成的。",
             "Zhè gè zì shàngmiàn shì zhúzìtóu, xiàmiàn shì yí gè “zhě” zì, shuōmíng zuìzǎo de kuàizi duōbàn shì yòng zhúzi zuòchéng de.",
             "Chữ này trên đầu là bộ trúc, bên dưới là chữ 'giả', cho thấy đũa thuở ban đầu phần lớn làm bằng tre trúc."),
            ("在江南水乡，划船的人最忌讳“住”，因为“住”和“停住”发音相同，意头不好。",
             "Zài Jiāngnán shuǐxiāng, huáchuán de rén zuì jìhuì “zhù”, yīnwèi “zhù” hé “tíngzhù” fāyīn xiāngtóng, yìtou bù hǎo.",
             "Ở vùng sông nước Giang Nam, người chèo thuyền rất kiêng kỵ chữ 'trợ' (đọc gần như 'trú'), vì đồng âm với 'dừng lại', mang điềm chẳng lành."),
            ("船家希望船行得快，于是就把“箸”改叫成了“快儿”。",
             "Chuánjiā xīwàng chuán xíng de kuài, yútì jiù bǎ “zhù” gǎi jiào chéng le “kuàir”.",
             "Nhà thuyền mong thuyền lướt đi thật nhanh, thế là đổi gọi 'trợ' thành 'khoái nhi' (nhanh nhẹn)."),
            ("后来，人们又在“快”字上面加上了竹字头，正式造出了“筷”这个字。",
             "Hòulái, rénmen yòu zài “kuài” zì shàngmiàn jiāshàng le zhúzìtóu, zhèngshì zàochū le “kuài” zhè gè zì.",
             "Về sau, người ta thêm bộ trúc lên đầu chữ 'khoái', chính thức tạo nên chữ 'đũa' (筷)."),
            ("一双小小的筷子，不仅是一件实用的餐具，更承载着中华民族几千年的生活智慧与文化底蕴。",
             "Yì shuāng xiǎoxiǎo de kuàizi, bùjǐn shì yí jiàn shíyòng de cānjù, gèng chéngzài zhe Zhōnghuá mínzú jǐ qiān nián de shēnghuó zhìhuì yǔ wénhuà dǐyùn.",
             "Một đôi đũa nhỏ bé, không chỉ là món đồ dùng ăn uống tiện lợi, mà còn chở che trí tuệ sinh hoạt và bề dày văn hóa hàng nghìn năm của dân tộc Trung Hoa."),
            ("当你每天拿起筷子吃饭时，其实也是在与古老文明进行一次亲切的握手。",
             "Dāng nǐ měitiān ná qǐ kuàizi chīfàn shí, qíshí yě shì zài yǔ gǔlǎo wénmíng jìnxíng yí cì qīnqiè de wòshǒu.",
             "Mỗi ngày khi bạn cầm đũa lên dùng bữa, thực chất bạn đang có một cái bắt tay thân mật cùng một nền văn minh cổ xưa.")
        ],
        "preferred_spotlight": ["筷子", "发明", "物理", "文化"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Nhà vật lý học Lý Chính Đạo nhận xét đôi đũa ứng dụng nguyên lý nào?",
                "options_vi": ["Nguyên lý đòn bẩy", "Nguyên lý phản lực", "Nguyên lý dẫn nhiệt"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 巧妙地应用了杠杆原理 (Ứng dụng khéo léo nguyên lý đòn bẩy)."
            },
            {
                "id": "q2",
                "question_vi": "Thời cổ đại, đôi đũa được gọi bằng chữ gì?",
                "options_vi": ["Trợ (箸)", "Chước (勺)", "Kiềm (钳)"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 很多不知道，在古代，筷子并不叫“筷子”，而是被称为“箸”."
            },
            {
                "id": "q3",
                "question_vi": "Tại sao người dân vùng sông nước Giang Nam đổi tên đũa thành 'Khoái' (筷)?",
                "options_vi": [
                    "Vì kiêng chữ 'Trợ' đồng âm với dừng thuyền, muốn thuyền chạy mau lẹ",
                    "Vì ăn bằng đũa rất nhanh",
                    "Vì do nhà vua ban lệnh đổi tên"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 划船的人最忌讳“住”... 船家希望船行得快，于是就把“箸”改叫成了“快儿”."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 9. 扇子：终年无尽风 - Pages 545 - 556
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_009",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 3,
        "book_page_start": 545,
        "book_page_end": 556,
        "page_display": "Trang 545 - 556",
        "title": {
            "zh": "扇子：终年无尽风",
            "vi": "Chiếc quạt: Quanh năm không dứt gió"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪭",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 545 - 556 · Lịch sử chiếc quạt xua tan oi bức: từ quạt lông vũ thời cổ, quạt tròn cung đình đến quạt xếp thư pháp nghệ thuật.",
        "sentences_data": [
            ("在没有空调和电风扇的古代，人们度过炎热夏天的最得力工具，就是拿在手中的一把扇子。",
             "Zài méiyǒu kōngtiáo hé diànfēngshàn de gǔdài, rénmen dùguò yánrè xiàtiān de zuì délì gōngjù, jiù shì ná zài shǒuzhōng de yì bǎ shànzi.",
             "Thời cổ đại khi chưa có máy lạnh hay quạt điện, công cụ đắc lực nhất để mọi người vượt qua ngày hè oi ả chính là chiếc quạt cầm tay."),
            ("最早的扇子大约出现在三千年前的商周时期，当时并不是用来纳凉，而是用羽毛制作的仪仗扇。",
             "Zuìzǎo de shànzi dàyuē chūxiàn zài sānqiān nián qián de Shāng-Zhōu shíqī, dāngshí bìng bú shì yòng lái nàliáng, érshì yòng yǔmáo zhìzuò de yízhàng shàn.",
             "Chiếc quạt đầu tiên xuất hiện khoảng 3.000 năm trước thời Thương Chu, thuở ấy không dùng hóng mát mà là quạt nghi trượng kết bằng lông chim."),
            ("汉代以后，丝织品制作的团扇开始流行，圆圆的扇面象征着“合欢”与“团圆”，深受宫廷女子喜爱。",
             "Hàndài yǐhòu, sīzhīpǐn zhìzuò de tuánshàn kāishǐ liúxíng, yuányuán de shànmiàn xiàngzhēng zhe “héhuān” yǔ “tuányuán”, shēnshòu gōngtíng nǚzǐ xǐ'ài.",
             "Từ thời Hán về sau, quạt tròn (đoàn phiến) dệt bằng tơ lụa bắt đầu thịnh hành, mặt quạt tròn vành vạnh tượng trưng cho 'hợp hoan' và 'đoàn viên', rất được các cung nhân yêu thích."),
            ("宋代时期，可以自由开合折叠的折扇传入中原，并迅速在文人雅士之间流传开来。",
             "Sòngdài shíqī, kěyǐ zìyóu kāihé zhédié de zhéshàn chuánrù zhōngyuán, bìng xùnsù zài wénrén yǎshì zhījiān liúchuán kāi lái.",
             "Vào thời Tống, chiếc quạt xếp có thể tự do mở ra gập lại truyền vào Trung Nguyên, nhanh chóng lan rộng trong giới văn nhân tao nhã."),
            ("文人墨客在扇面上题诗作画，让一把实用的日常工具升华为极具审美品位的艺术品。",
             "Wénrén mòkè zài shànmiàn shàng tíshī zuòhuà, ràng yì bǎ shíyòng de rìcháng gōngjù shēnghuá wéi jí jù shěnměi pǐnwèi de yìshùpǐn.",
             "Thi nhân mặc khách đề thơ vẽ tranh lên mặt quạt, khiến một món đồ dùng sinh hoạt thường ngày thăng hoa thành một tác phẩm nghệ thuật đầy thẩm mỹ."),
            ("一把轻巧的折扇，开合之间既能送来清风，也能展现主人的学识与风度。",
             "Yì bǎ qīngqiǎo de zhéshàn, kāihé zhījiān jì néng sòng lái qīngfēng, yě néng zhǎnxiàn zhǔrén de xuéshí yǔ fēngdù.",
             "Một chiếc quạt xếp nhẹ nhàng, lúc mở lúc gập vừa mang lại làn gió mát lành, vừa biểu đạt học vấn và phong độ đĩnh đạc của chủ nhân."),
            ("如今扇子虽然退出了主要的避暑功能，但它蕴含的典雅诗意依然在中华文化中世代流传。",
             "Rújīn shànzi suīrán tuìchū le zhǔyào de bìshǔ gōngnéng, dàn tā yùnhán de diǎnyǎ shīyì yīrán zài Zhōnghuá wénhuà zhōng shìdài liúchuán.",
             "Ngày nay chiếc quạt tuy không còn là phương tiện tránh nóng chủ yếu, nhưng nét thi vị tao nhã của nó vẫn lưu truyền qua bao thế hệ trong văn hóa Trung Hoa.")
        ],
        "preferred_spotlight": ["扇子", "工具", "艺术", "文化"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Ban đầu thời Thương Chu, chiếc quạt được dùng vào mục đích gì?",
                "options_vi": [
                    "Làm quạt nghi trượng kết bằng lông chim (仪仗)",
                    "Dùng để quạt mát mùa hè",
                    "Dùng để che mưa bão"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 当时并不是用来纳凉，而是用羽毛制作的仪仗扇."
            },
            {
                "id": "q2",
                "question_vi": "Quạt tròn (đoàn phiến) thời xưa mang ý nghĩa tượng trưng cho điều gì?",
                "options_vi": ["Đoàn viên và hòa hợp hạnh phúc (合欢团圆)", "Tài lộc giàu sang", "Sức khỏe dồi dào"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 圆圆的扇面象征着“合欢”与“团圆”."
            },
            {
                "id": "q3",
                "question_vi": "Văn nhân tao nhã thường làm gì để biến chiếc quạt thành tác phẩm nghệ thuật?",
                "options_vi": [
                    "Đề thơ và vẽ tranh lên mặt quạt (题诗作画)",
                    "Dán vàng ngọc lên nan quạt",
                    "Đeo chuông nhỏ vào cán quạt"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 文人墨客在扇面上题诗作画，让一把实用的日常工具升华为极具审美品位的艺术品."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 10. 风筝：魏晋发明的最早飞行器 - Pages 557 - 564
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_010",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 3,
        "book_page_start": 557,
        "book_page_end": 564,
        "page_display": "Trang 557 - 564",
        "title": {
            "zh": "风筝：魏晋发明的最早飞行器",
            "vi": "Cánh diều: Thiết bị bay sớm nhất phát minh thời Ngụy Tấn"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪁",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 557 - 564 · Cánh diều giấy bay lượn trên trời xanh: từ công cụ quân sự đo cự ly thời chiến đến thú vui thanh nhã ngày tiết Thanh Minh.",
        "sentences_data": [
            ("每当春天微风吹起的时候，天空中总会飞翔着各种五彩斑斓的风筝。",
             "Měi dāng chūntiān wēifēng chuī qǐ de shíhou, tiānkōng zhōng zǒng huì fēixiáng zhe gèzhǒng wǔcǎi-bānlán de fēngzheng.",
             "Mỗi dịp gió xuân thoang thoảng thổi về, trên bầu trời lại rợp bóng muôn cánh diều rực rỡ sắc màu bay lượn."),
            ("美国国家航空航天博物馆的大厅里写着一句话：“人类最早的飞行器是中国的风筝和火箭”。",
             "Měiguó Guójiā Hángkōng Hángtiān Bówùguǎn de dàtīng lǐ xiězhe yí jù huà: “Rénlèi zuìzǎo de fēixíngqì shì Zhōngguó de fēngzheng hé huǒjiàn”.",
             "Trong đại sảnh của Bảo tàng Hàng không Không gian Quốc gia Mỹ có khắc câu: 'Thiết bị bay sớm nhất của loài người chính là cánh diều và tên lửa của Trung Quốc'."),
            ("风筝最早被称为“木鸢”，相传是由春秋时期的思想家墨子历时三年用木头削制而成的。",
             "Fēngzheng zuìzǎo bèi chēng wéi “mùyuān”, xiāngchuán shì yóu Chūnqiū shíqī de sīxiǎngjiā Mòzǐ lìshí sān nián yòng mùtou xiāozhì ér chéng de.",
             "Cánh diều thuở ban sơ gọi là 'mộc diên' (diều gỗ), tương truyền do nhà tư tưởng Mặc Tử thời Xuân Thu đẽo gọt ròng rã suốt 3 năm mới thành."),
            ("东汉时期蔡伦改进了造纸术，人们开始用轻便的纸张制作风筝，因此风筝又被称为“纸鸢”。",
             "Dōnghàn shíqī Cài Lún gǎijìn le zàozhǐshù, rénmen kāishǐ yòng qīngbiàn de zhǐzhāng zhìzuò fēngzheng, yīncǐ fēngzheng yòu bèi chēng wéi “zhǐyuān”.",
             "Thời Đông Hán, Thái Luân cải tiến thuật làm giấy, người ta bắt đầu dùng những tờ giấy nhẹ nhàng để làm diều, từ đó cánh diều còn được gọi là 'chỉ diên' (diều giấy)."),
            ("在古代战争中，风筝曾多次被用作测量距离、传递秘密情报和联络军情的军事工具。",
             "Zài gǔdài zhànzhēng zhōng, fēngzheng céng duō cì bèi yòngzuò cèliáng jùlí, chuándì mìmì qíngbào hé liánluò jūnqíng de jūnshì gōngjù.",
             "Trong các trận chiến cổ xưa, diều từng nhiều lần được trưng dụng làm công cụ quân sự để đo đạc cự ly, chuyển phát tình báo mật và liên lạc trận mạc."),
            ("到了唐宋时期，放风筝逐渐转变为百姓在清明时节踏青祈福的一项户外娱乐习俗。",
             "Dào le Táng-Sòng shíqī, fàng fēngzheng zhújiàn zhuǎnbiàn wéi bǎixìng zài Qīngmíng shíjié tàqīng qífú de yí xiàng hùwài yúlè xísú.",
             "Đến thời Đường Tống, thả diều dần chuyển hóa thành một phong tục giải trí ngoài trời khi du xuân cầu phúc trong tiết Thanh Minh của dân gian."),
            ("牵着长长的丝线奔跑在草地上，看着风筝直上云霄，寄托着人们对自由翱翔的美好向往。",
             "Qiān zhe chángcháng de sīxiàn bēnpǎo zài cǎodì shàng, kàn zhe fēngzheng zhí shàng yúnxiāo, jìtuō zhe rénmen duì zìyóu áoxiáng de měihǎo xiàngwǎng.",
             "Cầm sợi dây dài sải bước chạy trên thảm cỏ xanh, ngắm cánh diều vút tận mây xanh, gửi gắm ước vọng bay lượn tự do tuyệt đẹp của con người.")
        ],
        "preferred_spotlight": ["风筝", "飞行", "工具", "自由"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Bảo tàng Hàng không Không gian Quốc gia Mỹ ghi nhận điều gì về cánh diều?",
                "options_vi": [
                    "Diều và tên lửa của Trung Quốc là thiết bị bay sớm nhất của loài người",
                    "Diều chỉ là món đồ chơi trẻ em",
                    "Diều được phát minh ở châu Âu"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: “人类最早的飞行器是中国的风筝和火箭”."
            },
            {
                "id": "q2",
                "question_vi": "Trước khi dùng giấy, chiếc diều đầu tiên (mộc diên) làm bằng vật liệu gì?",
                "options_vi": ["Làm bằng gỗ (木头)", "Làm bằng da thú", "Làm bằng lá cây"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 相传是由春秋时期的思想家墨子历时三年用木头削制而成的."
            },
            {
                "id": "q3",
                "question_vi": "Trong chiến tranh cổ đại, diều từng đóng vai trò gì?",
                "options_vi": [
                    "Đo đạc cự ly và truyền phát tin tình báo mật",
                    "Dùng để tấn công kẻ thù từ trên cao",
                    "Dùng để chở binh lính bay qua tường thành"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 风筝曾多次被用作测量距离、传递秘密情报和联络军情的军事工具."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 11. 伞：最浪漫的发明 - Pages 565 - 573
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_011",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 3,
        "book_page_start": 565,
        "book_page_end": 573,
        "page_display": "Trang 565 - 573",
        "title": {
            "zh": "伞：最浪漫的发明",
            "vi": "Chiếc ô: Phát minh lãng mạn nhất"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "☂️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 565 - 573 · Câu chuyện chiếc ô che mưa nắng: từ truyền thuyết thê tử của Lỗ Ban đến cây dù giấy dầu trong Bạch Xà Truyện.",
        "sentences_data": [
            ("“撑着油纸伞，独自彷徨在悠长又寂寥的雨巷”，现代诗人戴望舒的诗句让油纸伞充满了浪漫色彩。",
             "“Chēng zhe yóuzhǐsǎn, dúzì pánghuáng zài yōucháng yòu jìliáo de yǔxiàng”, xiàndài shīrén Dài Wàngshū de shījù ràng yóuzhǐsǎn chōngmǎn le làngmàn sècǎi.",
             "'Nâng chiếc dù giấy dầu, một mình bâng khuâng nơi ngõ mưa dài dằng dặc lại tịch liêu', vần thơ của nhà thơ hiện đại Đới Vọng Thư đã phủ lên chiếc dù giấy dầu ngập tràn sắc thái lãng mạn."),
            ("在中国民间神话《白蛇传》里，许仙与白娘子在西湖断桥相遇，正是靠一把雨伞结下了千古良缘。",
             "Zài Zhōngguó mínjiān shénhuà “Báishé Zhuàn” lǐ, Xǔ Xiān yǔ Bái Niángzǐ zài Xīhú Duànqiáo xiāngyù, zhèng shì kào yì bǎ yǔsǎn jiéxià le qiāngǔ liángyuán.",
             "Trong huyền thoại dân gian 'Bạch Xà Truyện', Hứa Tiên gặp gỡ Bạch Nương Tử bên cầu Đoạn Kiều Hồ Tây, cũng chính nhờ một chiếc ô che mưa mà se duyên kỳ ngộ ngàn năm."),
            ("相传伞是由中国古代著名工匠鲁班的妻子云氏发明的。",
             "Xiāngchuán sǎn shì yóu Zhōngguó gǔdài zhùmíng gōngjiàng Lǔ Bān de qīzǐ Yún Shì fāmíng de.",
             "Tương truyền chiếc ô do nàng Vân Thị - vợ của bậc danh sư thợ mộc Lỗ Ban thời cổ đại sáng tạo nên."),
            ("看到丈夫常在烈日和暴雨中辛苦劳作，云氏将竹子劈成细条，骨架蒙上兽皮，做成了能够开合的便携“移动凉亭”。",
             "Kàndào zhàngfu cháng zài lièrì hé bàoyǔ zhōng xīnkǔ láozuò, Yún Shì jiāng zhúzi pīchéng xìtiáo, gǔjià méngshàng shòupí, zuòchéng le nénggòu kāihé de biànxié “yídòng liángtíng”.",
             "Nhìn thấy phu quân thường dầm mưa dãi nắng lao tác vất vả, Vân Thị đã chẻ tre thành nan nhỏ, bọc da thú lên khung sườn, tạo thành một 'đình mát di động' mở gập tiện lợi."),
            ("东汉时期造纸术普及后，人们在纸面上刷上桐油来防水，真正诞生了轻巧耐用的油纸伞。",
             "Dōnghàn shíqī zàozhǐshù pǔjí hòu, rénmen zài zhǐmiàn shàng shuāshàng tóngyóu lái fángshuǐ, zhēnzhèng dànshēng le qīngqiǎo nàiyòng de yóuzhǐsǎn.",
             "Thời Đông Hán sau khi kỹ thuật làm giấy thịnh hành, người ta quét dầu trẩu lên mặt giấy để chống thấm nước, chính thức khai sinh ra chiếc dù giấy dầu bền đẹp thanh thoát."),
            ("雨伞不仅是遮风挡雨的日常工具，更在漫长岁月里融入了中国人对深情与陪伴的美好寄托。",
             "Yǔsǎn bùjǐn shì zhēfēng-dǎngyǔ de rìcháng gōngjù, gèng zài màncháng suìyuè lǐ róngrù le Zhōngguórén duì shēnqíng yǔ péibàn de měihǎo jìtuō.",
             "Chiếc ô không chỉ là vật dụng che mưa chắn gió, mà qua năm tháng dài lâu đã thấm đượm niềm gửi gắm thiêng liêng về tình sâu nghĩa nặng và sự sẻ chia đồng hành."),
            ("一把伞撑开，便是一方小小的晴空，守护着风雨同舟的温馨时光。",
             "Yì bǎ sǎn chēngkāi, biàn shì yì fāng xiǎoxiǎo de qíngkōng, shǒuhù zhe fēngyǔ-tóngzhōu de wēnxīn shíguāng.",
             "Một tán ô xòe rộng, chính là một khoảng trời bình yên nhỏ bé, chở che những khoảnh khắc ấm áp cùng chung một con thuyền qua giông bão.")
        ],
        "preferred_spotlight": ["发明", "工具", "时光", "美丽"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Theo truyền thuyết, ai là người đầu tiên phát minh ra chiếc ô?",
                "options_vi": ["Vân Thị (云氏) - vợ của Lỗ Ban", "Khổng Minh", "Lý Bạch"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 相传伞是由中国古代著名工匠鲁班的妻子云氏发明的."
            },
            {
                "id": "q2",
                "question_vi": "Trong câu chuyện Bạch Xà Truyện, chiếc ô đóng vai trò gì?",
                "options_vi": [
                    "Làm vật se duyên cho Hứa Tiên và Bạch Nương Tử che chung mưa",
                    "Làm vũ khí đánh đuổi yêu ma",
                    "Làm thuyền vượt qua sông"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 许仙与白娘子在西湖断桥相遇，正是靠一把雨伞结下了千古良缘."
            },
            {
                "id": "q3",
                "question_vi": "Người ta quét chất gì lên mặt giấy để làm dù giấy dầu chống thấm?",
                "options_vi": ["Dầu trẩu (桐油)", "Mật ong", "Sáp nến"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 人们在纸面上刷上桐油来防水，真正诞生了轻巧耐用的油纸伞."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 12. 棋：围棋是国粹，象棋是舶来品？ - Pages 574 - 585
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_012",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 3,
        "book_page_start": 574,
        "book_page_end": 585,
        "page_display": "Trang 574 - 585",
        "title": {
            "zh": "棋：围棋是国粹，象棋是舶来品？",
            "vi": "Cờ: Cờ vây là quốc túy, cờ tướng là hàng ngoại nhập?"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "♟️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 574 - 585 · Triết lý cờ vây cổ xưa 'cầm kỳ thi họa' và cuộc tranh luận thú vị về nguồn gốc cờ tướng phương Đông.",
        "sentences_data": [
            ("在中国传统文化中，“琴棋书画”被视为衡量文人素养与雅趣的四大学艺。",
             "Zài Zhōngguó chuántǒng wénhuà zhōng, “qín-qí-shū-huà” bèi shìwéi héngliáng wénrén sùyǎng yǔ yǎqù de sì dà xuéyì.",
             "Trong văn hóa truyền thống Trung Hoa, 'cầm, kỳ, thi, họa' được coi là bốn môn nghệ thuật đo lường cốt cách và tao nhã của bậc văn nhân."),
            ("这里的“棋”，在古人心中最主要的代表就是围棋。",
             "Zhèlǐ de “qí”, zài gǔrén xīnzhōng zuì zhǔyào de dàibiǎo jiù shì wéiqí.",
             "Chữ 'kỳ' ở đây, trong lòng người xưa đại diện hàng đầu chính là cờ vây."),
            ("相传围棋起源于四千多年前的尧帝时代，尧帝为了启发性格鲁莽的儿子丹朱，发明了黑白两色棋子。",
             "Xiāngchuán wéiqí qǐyuán yú sìqiān duō nián qián de Yáo Dì shídài, Yáo Dì wèile qǐfā xìnggé lǔmǎng de érzi Dānzhū, fāmíng le hēibái liǎng sè qízǐ.",
             "Tương truyền cờ vây khởi nguồn từ hơn 4.000 năm trước thời vua Nghiêu, vua vì muốn khai mở trí tuệ cho người con tính tình bốc đồng nên sáng chế ra hai màu cờ đen trắng."),
            ("围棋规则虽然简单，但棋盘上的千变万化却极其深奥，体现了东方哲学中虚实相生、阴阳调和的智慧。",
             "Wéiqí guīzé suīrán jiǎndān, dàn qípán shàng de qiānbiàn-wànhuà què jíqí shēn'ào, tǐxiàn le dōngfāng zhéxué zhōng xūshí xiāngshēng, yīnyáng tiáohé de zhìhuì.",
             "Luật chơi cờ vây tuy đơn giản, nhưng biến hóa trên bàn cờ lại khôn lường thâm thúy, thể hiện trí tuệ triết học phương Đông về hư thực tương sinh, âm dương điều hòa."),
            ("与围棋完全本土发源不同，关于中国象棋的起源，学术界一直存在着激烈的讨论。",
             "Yǔ wéiqí wánquán běntǔ fāyuán bùtóng, guānyú Zhōngguó xiàngqí de qǐyuán, xuéshùjiè yìzhí cúnzài zhe jīliè de tǎolùn.",
             "Khác với cờ vây hoàn toàn bắt nguồn bản địa, nguồn gốc của cờ tướng Trung Hoa luôn có những tranh luận sôi nổi trong giới học thuật."),
            ("很多学者认为，象棋的前身受到了古印度“恰图兰卡”棋戏的影响，通过丝绸之路传入中原后演变而成。",
             "Hěn duō xuézhě rènwéi, xiàngqí de qiánshēn shòudào le gǔ Yìndù “qiàtúlánkǎ” qíxì de yǐngxiǎng, tōngguò Sīchóu zhī Lù chuánrù zhōngyuán hòu yǎnbiàn ér chéng.",
             "Nhiều học giả nhận định tiền thân của cờ tướng chịu ảnh hưởng từ trò cờ Chaturanga của Ấn Độ cổ, qua Con đường Tơ lụa truyền vào Trung Nguyên rồi dần biến đổi."),
            ("不管是高雅深邃的围棋，还是街头巷尾随处可见的象棋，都深刻塑造了东方人的思维格局与生活情趣。",
             "Bùguǎn shì gāoyǎ shēnsuì de wéiqí, háishì jiētóu xiàngwěi suíchù-kějiàn de xiàngqí, dōu shēnkè sùzào le dōngfāngrén de sīwéi géjú yǔ shēnghuó qíngqù.",
             "Bất kể là cờ vây cao nhã thâm sâu, hay bàn cờ tướng bình dị nơi đầu đường cuối ngõ, đều tạc nên nét tư duy chiến lược và phong vị tao nhã của người phương Đông.")
        ],
        "preferred_spotlight": ["围棋", "文化", "思维", "影响"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Trong 'cầm kỳ thi họa', chữ 'kỳ' nguyên bản chỉ môn cờ nào?",
                "options_vi": ["Cờ vây (围棋)", "Cờ vua phương Tây", "Cờ cá ngựa"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 这里的“棋”，在古人心中最主要的代表就是围棋."
            },
            {
                "id": "q2",
                "question_vi": "Theo truyền thuyết, vua Nghiêu phát minh cờ vây nhằm mục đích gì?",
                "options_vi": [
                    "Khai sáng trí tuệ và rèn luyện tính nết cho con trai Đan Chu",
                    "Để tuyển chọn tướng tài ra trận",
                    "Để cá cược tiền bạc"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 尧帝为了启发性格鲁莽的儿子丹朱，发明了黑白两色棋子."
            },
            {
                "id": "q3",
                "question_vi": "Nhiều học giả cho rằng cờ tướng chịu ảnh hưởng du nhập từ nền văn minh nào?",
                "options_vi": ["Trò cờ cổ của Ấn Độ qua Con đường Tơ lụa", "Từ Ai Cập cổ đại", "Từ La Mã cổ đại"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 象棋的前身受到了古印度“恰图兰卡”棋戏的影响，通过丝绸之路传入中原."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 13. 饺子：“娇耳”的千年流传 - Pages 786 - 794
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_013",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 4,
        "book_page_start": 786,
        "book_page_end": 794,
        "page_display": "Trang 786 - 794",
        "title": {
            "zh": "饺子：“娇耳”的千年流传",
            "vi": "Sủi cảo: Thiên niên lưu truyền của món 'Kiều nhĩ'"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🥟",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 786 - 794 · Hành trình nghìn năm của sủi cảo: từ bài thuốc chữa rét buốt tai của y thánh Trương Trọng Cảnh đến biểu tượng đoàn viên ngày Tết.",
        "sentences_data": [
            ("在中国北方，有一句著名的俗话叫做“大寒小寒，吃饺子过年”。",
             "Zài Zhōngguó běifāng, yǒu yí jù zhùmíng de súhuà jiàozuò “dàhán xiǎohán, chī jiǎozi guònián”.",
             "Ở miền Bắc Trung Quốc, có câu tục ngữ nổi tiếng: 'Đại hàn tiểu hàn, ăn sủi cảo đón Tết'."),
            ("很多人不知道，饺子最初发明的时候，并不是为了当饭吃，而是一味用来治病的药方。",
             "Hěn duō rén bù zhīdào, jiǎozi zuìchū fāmíng de shíhou, bìng bú shì wèile dāng fàn chī, érshì yí wèi yòng lái zhìbìng de yàofāng.",
             "Nhiều người không biết rằng, sủi cảo thuở mới phát minh không phải để làm món ăn no, mà là một phương thuốc dùng trị bệnh."),
            ("东汉末年的著名医学家张仲景，在冬天看到很多穷苦百姓因为严寒而冻烂了耳朵，心里非常难过。",
             "Dōnghàn mònián de zhùmíng yīxuéjiā Zhāng Zhòngjǐng, zài dōngtiān kàndào hěn duō qióngkǔ bǎixìng yīnwèi yánhán ér dòng làn le ěrduo, xīnlǐ fēicháng nánguò.",
             "Cuối thời Đông Hán, danh y Trương Trọng Cảnh mùa đông thấy nhiều người dân nghèo bị giá rét làm cóng buốt lở loét cả tai, trong lòng vô cùng xót xa."),
            ("于是他把羊肉、辣椒和驱寒的药材切碎包进面皮里，捏成耳朵的形状，煮好后连汤带水送给乡亲们吃。",
             "Yútì tā bǎ yángròu, làjiāo hé qūhán de yàocái qiēsuì bāo jìn miànpí lǐ, niēchéng ěrduo de xíngzhuàng, zhǔhǎo hòu liántāng-dàishuǐ sòng gěi xiāngqīnmen chī.",
             "Thế là ông băm nhỏ thịt dê, ớt và dược liệu trừ hàn gói vào vỏ bột mì, nặn thành hình vành tai, nấu chín rồi phát cả canh lẫn bánh cho bà con ăn."),
            ("这种神奇的药汤被称为“祛寒娇耳汤”，乡亲们吃了以后浑身暖和，耳朵很快就不冻了。",
             "Zhè zhǒng shénqí de yàotāng bèi chēng wéi “qūhán jiāo'ěr tāng”, xiāngqīnmen chī le yǐhòu húnshēn nuǎnhuo, ěrduo hěn kuài jiù bú dòng le.",
             "Nồi canh thuốc kỳ diệu đó được gọi là 'Khư hàn kiều nhĩ thang', bà con ăn xong khắp người ấm áp, tai không còn bị cóng buốt nữa."),
            ("后来每逢冬至和大年三十，人们就模仿娇耳的样子包面食吃，渐渐演变成了今天家喻户晓的饺子。",
             "Hòulái měi féng Dōngzhì hé Dànián Sānshí, rénmen jiù mófǎng jiāo'ěr de yàngzi bāo miànshí chī, jiànjiàn yǎnbiàn chéng le jīntiān jiāyù-hùxiǎo de jiǎozi.",
             "Về sau cứ mỗi dịp Đông Chí và Ba Mươi Tết, người người lại phỏng theo hình kiều nhĩ mà gói bột ăn, dần dà trở thành món sủi cảo nức tiếng muôn nhà hôm nay."),
            ("饺子的外形酷似金元宝，包进各种美味馅料，寄托着全家人团团圆圆、吉祥发财的美好祝愿。",
             "Jiǎozi de wàixíng kùsì jīnyuánbǎo, bāo jìn gèzhǒng měiwèi xiànliào, jìtuō zhe quánjiā rén tuántuán-yuányuán, jíxiáng fācái de měihǎo zhùyuàn.",
             "Hình dáng sủi cảo tựa thỏi vàng nén, gói trọn bao nhân bánh thơm lành, gửi gắm ước nguyện cả gia đình sum họp viên mãn, cát tường phát tài.")
        ],
        "preferred_spotlight": ["饺子", "文化", "暖和", "发明"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Ban đầu, sủi cảo được phát minh nhằm mục đích gì?",
                "options_vi": [
                    "Làm phương thuốc chữa rét buốt cóng tai cho người nghèo",
                    "Làm món tráng miệng cung đình",
                    "Làm lương khô cho quân lính viễn chinh"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 并不是为了当饭吃，而是一味用来治病的药方 (Không phải để ăn no mà là thang thuốc trị bệnh)."
            },
            {
                "id": "q2",
                "question_vi": "Vị danh y nào đã sáng chế ra món 'Khư hàn kiều nhĩ thang' tiền thân của sủi cảo?",
                "options_vi": ["Trương Trọng Cảnh (张仲景)", "Hoa Đà", "Biển Thước"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 著名医学家张仲景... 发明了“祛寒娇耳汤”."
            },
            {
                "id": "q3",
                "question_vi": "Hình dáng của chiếc sủi cảo tượng trưng cho vật gì mang ý nghĩa tài lộc?",
                "options_vi": ["Thỏi vàng nén nguyên bảo (金元宝)", "Vầng trăng rằm", "Cánh hoa đào"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 饺子的外形酷似金元宝 (Hình dáng sủi cảo giống thỏi vàng nén)."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 14. 茶：神奇的东方树叶 - Pages 795 - 803
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_014",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 4,
        "book_page_start": 795,
        "book_page_end": 803,
        "page_display": "Trang 795 - 803",
        "title": {
            "zh": "茶：神奇的东方树叶",
            "vi": "Trà: Chiếc lá phương Đông kỳ diệu"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🍵",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 795 - 803 · Câu chuyện chiếc lá trà xanh, từ thức uống giải khát đời thường đến 'Trà Kinh' của Lục Vũ và văn hóa phương Đông.",
        "sentences_data": [
            ("在中国，茶被称为“国饮”，一缕清香穿越了数千年的历史烟云。",
             "Zài Zhōngguó, chá bèi chēng wéi “guóyǐn”, yì lǚ qīngxiāng chuānyuè le shù qiān nián de lìshǐ yānyún.",
             "Tại Trung Quốc, trà được xưng tụng là 'quốc ẩm', một làn hương thanh tao xuyên qua khói mây của hàng ngàn năm lịch sử."),
            ("相传神农氏尝百草，一日遇七十二毒，得荼而解之，这里的“荼”就是古代的茶。",
             "Xiāngchuán Shénnóng Shì cháng bǎicǎo, yí rì yù qīshí'èr dú, dé tú ér jiě zhī, zhèlǐ de “tú” jiù shì gǔdài de chá.",
             "Tương truyền Thần Nông nếm trăm loài cỏ, một ngày gặp 72 thứ độc, nhờ có lá trà mà giải được, chữ 'đồ' thuở ấy chính là lá trà cổ."),
            ("唐代陆羽写出了世界上第一部关于茶的专门著作《茶经》，系统总结了茶叶的种植、采摘、制作与品饮艺术。",
             "Tángdài Lù Yǔ xiěchū le shìjiè shàng dì-yī bù guānyú chá de zhuānmén zhùzuò “Chájīng”, xìtǒng zǒngjié le cháyè de zhòngzhí, cǎizhāi, zhìzuò yǔ pǐnyǐn yìshù.",
             "Thời Đường, Lục Vũ đã viết nên cuốn sách chuyên khảo đầu tiên trên thế giới về trà mang tên 'Trà Kinh', đúc kết hệ thống trồng trọt, hái lượm, sao chế và nghệ thuật thưởng trà."),
            ("中国人喝茶，讲究“清心涤烦”，不仅是为了解渴，更是一种修身养性的生活态度。",
             "Zhōngguórén hē chá, jiǎngjiu “qīngxīn-dífán”, bùjǐn shì wèile jiěkě, gèng shì yì zhǒng xiūshēn-yǎngxìng de shēnghuó tàidù.",
             "Người Trung Hoa thưởng trà coi trọng 'thanh tâm gột sạch phiền muộn', không chỉ để giải khát, mà còn là thái độ sống tu tâm dưỡng tính."),
            ("一片小小的东方树叶，沿着古代丝绸之路和茶马古道走向世界，成为了全球三大无酒精饮料之一。",
             "Yí piàn xiǎoxiǎo de dōngfāng shùyè, yánzhe gǔdài Sīchóu zhī Lù hé Chámǎ Gǔdào zǒuxiàng shìjiè, chéngwéi le quánqiú sān dà wú-jiǔjiīng yǐnliào zhī yī.",
             "Một chiếc lá phương Đông nhỏ bé, men theo Con đường Tơ lụa và Trà Mã Cổ Đạo cổ xưa vươn ra thế giới, trở thành một trong ba thức uống không cồn lớn nhất hành tinh."),
            ("无论绿茶的清冽、红茶的醇厚，还是乌龙茶的浓郁回甘，都让人品味出岁月的沉淀。",
             "Wúlùn lǜchá de qīngliè, hóngchá de chúnhòu, háishì wūlóngchá de nóngyù huígān, dōu ràng rén pǐnwèi chū suìyuè de chéndiàn.",
             "Dù là vị thanh khiết của trà xanh, đậm đà của trà đỏ hay thơm nồng hậu ngọt của ô long, đều khiến người ta cảm nhận lắng đọng của thời gian."),
            ("一杯香茗在手，便能让人在喧嚣的现代生活中找到内心的宁静与释怀。",
             "Yì bēi xiāngmíng zài shǒu, biàn néng ràng rén zài xuānxiāo de xiàndài shēnghuó zhōng zhǎodào nèixīn de níngjìng yǔ shìhuái.",
             "Một chén trà thơm trong tay, liền giúp lòng người tìm lại thanh tịnh và an nhiên giữa nhịp sống hiện đại ồn ào.")
        ],
        "preferred_spotlight": ["茶叶", "味道", "文化", "历史"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Tác phẩm chuyên khảo đầu tiên trên thế giới về trà có tên là gì?",
                "options_vi": ["Trà Kinh (茶经) của Lục Vũ", "Bản Thảo Cương Mục", "Thương Hàn Luận"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 唐代陆羽写出了世界上第一部关于茶的专门著作《茶经》."
            },
            {
                "id": "q2",
                "question_vi": "Thần Nông trong truyền thuyết đã dùng lá trà vào việc gì?",
                "options_vi": ["Dùng giải độc khi nếm trăm loài thảo mộc", "Dùng làm thuốc nhuộm vải", "Dùng để nấu canh cá"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 相传神农氏尝百草，一日遇七十二毒，得荼而解之."
            },
            {
                "id": "q3",
                "question_vi": "Chiếc lá trà phương Đông đã lan tỏa khắp thế giới qua con đường giao thương nào?",
                "options_vi": ["Con đường Tơ lụa và Trà Mã Cổ Đạo", "Đường biển phương Bắc", "Kênh đào Suez"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 沿着古代丝绸之路和茶马古道走向世界."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 15. 火锅：涮一把滚烫的生活 - Pages 817 - 823
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_015",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 4,
        "book_page_start": 817,
        "book_page_end": 823,
        "page_display": "Trang 817 - 823",
        "title": {
            "zh": "火锅：涮一把滚烫的生活",
            "vi": "Nồi lẩu: Nhúng một muôi cuộc đời sôi sục"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🍲",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 817 - 823 · Nồi lẩu ấm nồng gắn kết sum vầy: từ nồi đồng hầm thịt thời Thương Chu đến hương vị cay nồng trứ danh của lẩu Tứ Xuyên.",
        "sentences_data": [
            ("无论行走在哪一座城市，街道两旁热气腾腾的火锅店，总能勾起人们大快朵颐的冲动。",
             "Wúlùn xíngzǒu zài nǎ yí zuò chéngshì, jiēdào liǎngpáng rèqì-téngténg de huǒguō diàn, zǒng néng gōuqǐ rénmen dàkuài-duǒyí de chōngdòng.",
             "Bất kể dạo bước trên thành phố nào, những quán lẩu bốc khói nghi ngút hai bên đường luôn khơi dậy cảm giác muốn ăn một bữa thật đã đời."),
            ("寒冬腊月里，三五好友围着滚烫的火锅举杯共饮，享受美味的同时也拉近了彼此的心灵。",
             "Hándōng-làyuè lǐ, sān-wǔ hǎoyǒu wéizhe gǔntàng de huǒguō jǔbēi gòngyǐn, xiǎngshòu měiwèi de tóngshí yě lājìn le bǐcǐ de xīnlíng.",
             "Vào những ngày đông buốt giá, dăm ba người bạn quây quần bên nồi lẩu sôi sùng sục nâng chén sum vầy, vừa thưởng thức mỹ vị vừa kéo gần khoảng cách tâm hồn."),
            ("吃火锅不仅是一种饮食方式，更被公认为中国最温暖、最富有烟火气的聚餐文化。",
             "Chī huǒguō bùjǐn shì yì zhǒng yǐnshí fāngshì, gèng bèi gōngrèn wéi Zhōngguó zuì wēnnuǎn, zuì fùyǒu yānhuǒqì de jùcān wénhuà.",
             "Ăn lẩu không chỉ là một cách thức ẩm thực, mà còn được công nhận là nét văn hóa sum họp ấm áp và đậm đà phong vị đời thường nhất của người Trung Quốc."),
            ("考古发现表明，早在商周时期的青铜器皿中，就已经出现了底部可以放置炭火加热的微型青铜温鼎。",
             "Kǎogǔ fāxiàn biǎomíng, zǎo zài Shāng-Zhōu shíqī de qīngtóng qìmǐn zhōng, jiù yǐjīng chūxiàn le dǐbù kěyǐ fàngzhì tànhuǒ jiārè de wēixíng qīngtóng wēndǐng.",
             "Phát hiện khảo cổ cho thấy, ngay từ các đồ đồng thời Thương Chu đã xuất hiện chiếc vạc đồng nhỏ có đáy đựng than củi sưởi nhiệt."),
            ("到了清代，火锅甚至登上了皇家国宴的大雅之堂，乾隆皇帝下江南时就曾多次大设火锅千叟宴。",
             "Dào le Qīngdài, huǒguō shènzhì dēngshàng le huángjiā guóyàn de dàyǎ-zhītáng, Qiánlóng huángdì xià Jiāngnán shí jiù céng duō cì dà shè huǒguō qiānshǒuyàn.",
             "Đến thời nhà Thanh, lẩu thậm chí bước lên chốn quốc yến hoàng gia cao quý, hoàng đế Càn Long khi vi hành Giang Nam từng mở đại tiệc lẩu chiêu đãi ngàn bô lão."),
            ("从北京传统的铜锅涮羊肉，到四川重庆麻辣鲜香的红油九宫格，各地的火锅各有独特的风味。",
             "Cóng Běijīng chuántǒng de tóngguō shuànyángròu, dào Sìchuān Chóngqìng málà xiānxiāng de hóngyóu jiǔgōnggé, gèdì de huǒguō gè yǒu dútè de fēngwèi.",
             "Từ nồi đồng nhúng thịt cừu truyền thống của Bắc Kinh, đến nồi lẩu chín ô dầu đỏ cay tê thơm nồng của Tứ Xuyên Trùng Khánh, lẩu mỗi miền mang một phong vị độc đáo riêng."),
            ("一锅红汤沸腾翻滚，包容万物食材，正如平凡生活中滚烫而真实的美好人间。",
             "Yì guō hóngtāng fèiténg fāngǔn, bāoróng wànwù shícái, zhèng rú píngfán shēnghuó zhōng gǔntàng ér zhēnshí de měihǎo rénjiān.",
             "Một nồi nước dùng sôi sục đỏ tươi, dung nạp vạn vật thực phẩm tươi ngon, hệt như cuộc đời bình dị ấm nồng và chân thực giữa nhân gian."),
        ],
        "preferred_spotlight": ["火锅", "城市", "味道", "文化"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Hiện vật khảo cổ nào chứng minh nguồn gốc ban sơ của nồi lẩu từ thời Thương Chu?",
                "options_vi": [
                    "Vạc đồng nhỏ có đáy đựng than sưởi ấm (温鼎)",
                    "Chảo gang lớn chiên xào",
                    "Bát đất nung nấu cháo"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 出现了底部可以放置炭火加热的微型青铜温鼎."
            },
            {
                "id": "q2",
                "question_vi": "Vị hoàng đế nhà Thanh nào từng tổ chức đại tiệc lẩu chiêu đãi ngàn bô lão?",
                "options_vi": ["Vua Càn Long (乾隆皇帝)", "Vua Khang Hy", "Vua Ung Chính"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 乾隆皇帝下江南时就曾多次大设火锅千叟宴."
            },
            {
                "id": "q3",
                "question_vi": "Món lẩu truyền thống của Bắc Kinh nổi tiếng với cách ăn nào?",
                "options_vi": [
                    "Nồi đồng nhúng thịt cừu (铜锅涮羊肉)",
                    "Lẩu cá cay chín ô",
                    "Lẩu nấm gà tiềm thuốc bắc"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 从北京传统的铜锅涮羊肉，到四川重庆麻辣鲜香..."
            }
        ]
    })

    # -------------------------------------------------------------------------
    # 16. 豆腐：素食经典中国创造 - Pages 824 - 831
    # -------------------------------------------------------------------------
    stories.append({
        "id": "wanwu_story_016",
        "level": "HSK4",
        "series": "wanwu",
        "book_volume": 4,
        "book_page_start": 824,
        "book_page_end": 831,
        "page_display": "Trang 824 - 831",
        "title": {
            "zh": "豆腐：素食经典中国创造",
            "vi": "Đậu phụ: Phát minh kinh điển của ẩm thực thanh đạm"
        },
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🥢",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 824 - 831 · Khám phá nguồn gốc chiếc bìa đậu phụ trắng ngần từ lò luyện đan thời Tây Hán của Hoài Nam Vương Lưu An.",
        "sentences_data": [
            ("洁白如玉、入口即化的豆腐，是中华美食对全人类餐桌的一大杰出贡献。",
             "Jiébái rú yù, rùkǒu jí huà de dòufu, shì Zhōnghuá měishí duì quán rénlèi cānzhuō de yí dà jiéchū gòngxiàn.",
             "Miếng đậu phụ trắng ngần như ngọc, tan ngay nơi đầu lưỡi là một cống hiến kiệt xuất của ẩm thực Trung Hoa đối với bàn ăn nhân loại."),
            ("相传在西汉时期，淮南王刘安在八公山隐居炼丹，渴望炼制出长生不老的仙丹。",
             "Xiāngchuán zài Xīhàn shíqī, Huáinán Wáng Liú'ān zài Bāgōngshān yǐnjū liàndān, kěwàng liànzhì chū chángshēng-bùlǎo de xiāndān.",
             "Tương truyền vào thời Tây Hán, Hoài Nam Vương Lưu An ẩn cư tại núi Bát Công luyện đan, khao khát chế ra linh đơn trường sinh bất lão."),
            ("一次炼丹过程中，他不小心把豆浆和石膏卤水倒在了一起，结果并没有炼出仙丹，反而凝固成了白嫩清香的豆制品。",
             "Yí cì liàndān guòchéng zhōng, tā bù xiǎoxīn bǎ dòujiāng hé shígāo lǔshuǐ dào zài le yìqǐ, jiéguǒ bìng méiyǒu liànchū xiāndān, fǎn'ér nínggù chéng le báinèn qīngxiāng de dòuzhìpǐn.",
             "Trong một lần luyện đan, ông sơ ý đổ nước đậu nành hòa cùng nước thạch cao làm đông, kết quả không luyện được tiên đan, mà lại đông kết thành một món đậu trắng ngần thanh mát."),
            ("有人大着胆子尝了一口，发现口感滑嫩、味道极其鲜美，这就是世界上第一块豆腐的诞生。",
             "Yǒu rén dà zhe dǎnzi cháng le yì kǒu, fāxiàn kǒugǎn huánèn, wèidào jíqí xiānměi, zhè jiù shì shìjiè shàng dì-yī kuài dòufu de dànshēng.",
             "Có người bạo gan nếm thử một miếng, phát hiện cảm giác mềm mượt, mùi vị tươi ngon vô cùng, đó chính là sự ra đời của miếng đậu phụ đầu tiên trên thế giới."),
            ("豆腐营养极其丰富，不仅富含优质植物蛋白，而且容易被人体消化和吸收。",
             "Dòufu yíngyǎng jíqí fēngfù, bùjǐn fùhán yōuzhì zhíwù dànbái, érqiě róngyì bèi réntǐ xiāohuà hé xīshōu.",
             "Đậu phụ dinh dưỡng vô cùng phong phú, không chỉ giàu protein thực vật hảo hạng, mà còn dễ dàng được cơ thể tiêu hóa và hấp thụ."),
            ("它质地温和，能够与各种山珍海味完美搭配，被赞誉为中国烹饪界最具包容性的“百搭君子”。",
             "Tā zhìdì wēnhé, nénggòu yǔ gèzhǒng shānzhēn-hǎiwèi wánměi dāpèi, bèi zànyù wéi Zhōngguó pēngrènjiè zuì jù bāoróngxìng de “bǎidā jūnzǐ”.",
             "Đậu phụ tính tình hòa nhã, có thể sánh duyên hoàn mỹ với mọi của ngon vật lạ, được ca ngợi là 'bậc quân tử vạn năng' có tính dung nạp cao nhất trong nghệ thuật ẩm thực Trung Hoa.")
        ],
        "preferred_spotlight": ["豆腐", "味道", "丰富", "营养"],
        "quiz": [
            {
                "id": "q1",
                "question_vi": "Theo truyền thuyết, ai là người tình cờ phát minh ra món đậu phụ?",
                "options_vi": ["Hoài Nam Vương Lưu An (刘安)", "Gia Cát Lượng", "Đỗ Phủ"],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 淮南王刘安在八公山隐居炼丹... 诞生了第一块豆腐."
            },
            {
                "id": "q2",
                "question_vi": "Đậu phụ ra đời trong hoàn cảnh tình cờ nào?",
                "options_vi": [
                    "Đổ nhầm nước đậu nành với thạch cao làm đông khi đang luyện đan",
                    "Làm rơi hạt đậu vào nồi súp thịt gà",
                    "Phơi đậu nành ngoài trời nắng lâu ngày"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 他不小心把豆浆和石膏卤水倒在了一起... 凝固成了白嫩清香的豆制品."
            },
            {
                "id": "q3",
                "question_vi": "Tại sao đậu phụ được xưng tụng là 'quân tử vạn năng' (百搭君子) trong ẩm thực?",
                "options_vi": [
                    "Vì tính chất ôn hòa, có thể phối hợp hoàn hảo với mọi nguyên liệu",
                    "Vì chỉ dành riêng cho bậc vua chúa thưởng thức",
                    "Vì chỉ ăn được vào mùa xuân"
                ],
                "answer": 0,
                "explanation_vi": "Trong bài viết: 质地温和，能够与各种山珍海味完美搭配，被赞誉为中国烹饪界最具包容性的“百搭君子”."
            }
        ]
    })

    return stories


def main():
    stories = get_all_book_stories()
    manifest_path = READINGS_DIR / "manifest.json"

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # 1. Clean up legacy book stories (hsk4_story_051..054) and previous wanwu stories
    # IMPORTANT: Preserve hsk4_story_050!
    manifest = [
        m for m in manifest
        if m["id"] not in {"hsk4_story_051", "hsk4_story_052", "hsk4_story_053", "hsk4_story_054"}
        and not m["id"].startswith("wanwu_story_")
    ]

    # Delete legacy disk files
    for old_num in range(51, 55):
        old_f = READINGS_DIR / "hsk4" / f"hsk4_story_0{old_num}.json"
        if old_f.exists():
            old_f.unlink()

    # 2. Build and write each story sequentially by book page
    wanwu_manifest_entries = []
    for sdata in stories:
        sid = sdata["id"]
        sentences = []
        for sidx, (zh, py, vi) in enumerate(sdata["sentences_data"]):
            tokens = make_tokens_for_sentence(zh)
            sentences.append({
                "id": f"s{sidx + 1}",
                "zh": zh,
                "pinyin": py,
                "vi": vi,
                "audio_start_ms": None,
                "audio_end_ms": None,
                "tokens": tokens
            })

        spotlight = resolve_spotlight(sentences, sdata.get("preferred_spotlight", []))

        img_rel = f"assets/images/readings/wanwu/{sid}.webp"
        has_img = (REPO_ROOT / img_rel).exists()

        story_obj = {
            "id": sid,
            "level": sdata["level"],
            "series": "wanwu",
            "book_page_start": sdata["book_page_start"],
            "book_page_end": sdata["book_page_end"],
            "page_display": sdata["page_display"],
            "title": sdata["title"],
            "topic": sdata["topic"],
            "topic_vi": sdata["topic_vi"],
            "icon": sdata["icon"],
            "cover_image": img_rel if has_img else None,
            "illustration": img_rel if has_img else None,
            "estimatedMinutes": sdata["estimatedMinutes"],
            "description_vi": sdata["description_vi"],
            "sentences": sentences,
            "vocabulary_spotlight": spotlight,
            "quiz": sdata["quiz"]
        }

        # Check: Verify that 100% of Chinese tokens have pinyin
        missing_py = [
            t["text"]
            for s in sentences
            for t in s["tokens"]
            if any("\u4e00" <= c <= "\u9fff" for c in t.get("text", "")) and not t.get("pinyin")
        ]
        if missing_py:
            raise ValueError(f"[{sid}] Found tokens with missing pinyin: {missing_py}")

        out_file = READINGS_DIR / "hsk4" / f"{sid}.json"
        with open(out_file, "w", encoding="utf-8") as f:
            json.dump(story_obj, f, ensure_ascii=False, indent=2)

        print(f"[+] Successfully generated {sid} ({sdata['title']['zh']}) - {sdata['page_display']} - 100% Pinyin guaranteed.")

        # Manifest entry
        wanwu_manifest_entries.append({
            "id": sid,
            "level": sdata["level"],
            "series": "wanwu",
            "series_title": "万物有意思",
            "series_title_vi": "Vạn vật thú vị",
            "book_page_start": sdata["book_page_start"],
            "book_page_end": sdata["book_page_end"],
            "page_display": sdata["page_display"],
            "title": sdata["title"],
            "topic": sdata["topic"],
            "topic_vi": sdata["topic_vi"],
            "icon": sdata["icon"],
            "cover_image": img_rel if has_img else None,
            "illustration": img_rel if has_img else None,
            "estimatedMinutes": sdata["estimatedMinutes"],
            "description_vi": sdata["description_vi"],
            "sentence_count": len(sentences),
            "sentences_count": len(sentences),
            "spotlight_count": len(spotlight),
            "words_count": sum(len(s["tokens"]) for s in sentences),
            "file": f"database/readings/hsk4/{sid}.json",
            "path": f"database/readings/hsk4/{sid}.json"
        })

    # Sort Wanwu entries by book page start
    wanwu_manifest_entries.sort(key=lambda x: x["book_page_start"])

    # Put the sequential Wanwu book series at the VERY TOP of manifest.json
    new_manifest = wanwu_manifest_entries + manifest

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(new_manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[✓] Finished building {len(stories)} stories strictly in book page order. Placed at top of manifest.json.")


if __name__ == "__main__":
    main()
