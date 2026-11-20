#!/usr/bin/env python3
"""
tools/build_wanwu_volume1.py
Builds Volume 1 (Chapters 01 to 22) of 《万物有意思》:
- Guaranteed 100% Pinyin coverage on all Chinese character tokens
- Sino-Vietnamese (Hán-Việt) on every token
- High-quality Vietnamese translations
- 3 comprehension quiz questions per chapter
- WebP illustration extraction from PDF
- Exact page numbers noted
"""

import json
import io
import re
import sys
from pathlib import Path
import pypinyin
import jieba
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
if (REPO_ROOT / "tools" / ".deps").exists():
    sys.path.insert(0, str(REPO_ROOT / "tools" / ".deps"))
import pypdf

VOCAB_DIR = REPO_ROOT / "database" / "vocabs"
READINGS_DIR = REPO_ROOT / "database" / "readings"
IMG_OUT_DIR = REPO_ROOT / "assets" / "images" / "readings" / "wanwu"
IMG_OUT_DIR.mkdir(parents=True, exist_ok=True)

PDF_PATH = REPO_ROOT / "exam_materials" / "hsk4" / "Vạn vật thú vị (Phiên bản Trung Quốc + Phiên bản Thế giới) (Bộ 4 cuốn) 万物有意思（中国篇+世界篇）（套装4册）(八十余个历史之谜，穿越千年时光，此刻扑面而来……） (北京日报.pdf"
reader = pypdf.PdfReader(str(PDF_PATH))

# 1. Vocabulary lookups
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

# 2. Han-Viet lookups
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
    raw_tokens = list(jieba.cut(zh_sentence))
    tokens = []
    for word in raw_tokens:
        word = word.strip()
        if not word:
            continue
        if not any("\u4e00" <= c <= "\u9fff" for c in word):
            tokens.append({"text": word})
            continue

        token = {
            "text": word,
            "pinyin": get_pinyin(word),
            "hanviet": get_hanviet(word),
        }
        wid = ID_BY_HANZI.get(word)
        if wid and wid in VOCAB_BY_ID:
            v = VOCAB_BY_ID[wid]
            lvl = int(wid.split("_")[0].replace("hsk", ""))
            token["hsk"] = lvl
            token["word_id"] = wid
            token["meaning_vi"] = v.get("meaning", v.get("vietnamese", ""))
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


def extract_illustration(sp: int, ep: int, sid: str) -> str:
    dest = IMG_OUT_DIR / f"{sid}.webp"
    if dest.exists() and dest.stat().st_size > 5000:
        return f"assets/images/readings/wanwu/{sid}.webp"

    best_img = None
    best_size = 0
    for p in range(max(0, sp - 1), min(ep - 1, len(reader.pages))):
        for img_obj in reader.pages[p].images:
            if len(img_obj.data) > best_size and len(img_obj.data) > 20000:
                try:
                    pil_img = Image.open(io.BytesIO(img_obj.data))
                    if pil_img.width >= 180 and pil_img.height >= 140:
                        best_img = pil_img
                        best_size = len(img_obj.data)
                except Exception:
                    pass

    if best_img:
        best_img.thumbnail((800, 600), Image.Resampling.LANCZOS)
        if best_img.mode in ("RGBA", "LA", "P"):
            best_img = best_img.convert("RGB")
        best_img.save(dest, format="WEBP", quality=82)
        print(f"  [+] Extracted illustration for {sid}: {dest.stat().st_size} bytes")
        return f"assets/images/readings/wanwu/{sid}.webp"
    return None


def get_volume1_stories():
    stories = []

    # 1. 水母
    stories.append({
        "id": "wanwu_story_001",
        "chapter_no": 1,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 8,
        "book_page_end": 19,
        "page_display": "Trang 8 - 19",
        "title": {"zh": "水母：美丽的海上“霸主”", "vi": "Con sứa: 'Bá chủ' xinh đẹp giữa đại dương"},
        "topic": "nature_wildlife",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪼",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 8 - 19 · Khám phá loài sứa - 'đóa hoa trong nước' cổ hơn khủng long với cơ thể 99% là nước và loài sứa bờm sư tử khổng lồ.",
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
            ("人们常常以为海洋中体型最庞大的是蓝鲸，其实有些巨型霞水母比蓝鲸还要长。",
             "Rénmen chángcháng yǐwéi hǎiyáng zhōng tǐxíng zuì pángdà de shì lánjīng, qíshí yǒuxiē jùxíng xiáshuǐmǔ bǐ lánjīng hái yào cháng.",
             "Mọi người thường nghĩ sinh vật dài nhất đại dương là cá voi xanh, thực ra một số loài sứa bờm sư tử khổng lồ còn dài hơn cả cá voi xanh."),
            ("一八七零年，在美国海岸发现的一只霞水母，触手长达三十六米，展现了大自然的奇迹。",
             "Yī-bā-qī-líng nián, zài Měiguó hǎi'àn fāxiàn de yì zhī xiáshuǐmǔ, chùshǒu cháng dá sānshíliù mǐ, zhǎnxiàn le dàzìrán de qíjì.",
             "Năm 1870, tại bờ biển nước Mỹ, người ta phát hiện một con sứa có xúc tu dài tới 36 mét, biểu hiện kỳ tích của tự nhiên lớn lao.")
        ],
        "preferred_spotlight": ["海洋", "自然", "生存", "历史"],
        "quiz": [
            {"id": "q1", "question_vi": "Tại sao sứa được gọi là hóa thạch sống?", "options_vi": ["Xuất hiện hơn 600 triệu năm trước, sớm hơn khủng long", "Thân cứng như đá", "Sống ở vùng băng tuyết"], "answer": 0, "explanation_vi": "Sứa xuất hiện hơn 600 triệu năm trước trên Trái Đất."},
            {"id": "q2", "question_vi": "Cơ thể sứa chứa bao nhiêu phần trăm là nước?", "options_vi": ["Khoảng 99%", "Khoảng 50%", "Khoảng 70%"], "answer": 0, "explanation_vi": "Cơ thể loài sứa chứa khoảng 99% là nước."},
            {"id": "q3", "question_vi": "Con sứa phát hiện năm 1870 ở bờ biển Mỹ có xúc tu dài bao nhiêu mét?", "options_vi": ["36 mét", "10 mét", "5 mét"], "answer": 0, "explanation_vi": "Xúc tu của con sứa bờm sư tử dài tới 36 mét."}
        ]
    })

    # 2. 蛇
    stories.append({
        "id": "wanwu_story_002",
        "chapter_no": 2,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 19,
        "book_page_end": 30,
        "page_display": "Trang 19 - 30",
        "title": {"zh": "蛇：亦神亦邪", "vi": "Rắn: Vừa là thần linh, vừa là tà ác"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🐍",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 19 - 30 · Hình tượng loài rắn trong thần thoại Nữ Oa, Phục Hy và biểu tượng ngành y học thế giới.",
        "sentences_data": [
            ("在人类漫长的文明历史中，蛇同时背负着崇拜与恐惧两种截然相反的情感。",
             "Zài rénlèi màncháng de wénmíng lìshǐ zhōng, shé tóngshí bēifù zhe chóngbài yǔ kǒngjù liǎng zhǒng jiérán xiāngfǎn de qínggǎn.",
             "Trong lịch sử văn minh nhân loại, rắn đồng thời gánh vác cả hai cảm xúc trái ngược: sùng kính và khiếp sợ."),
            ("在中国古代神话中，开天辟地的人类始祖伏羲和女娲，形象都是人首蛇身。",
             "Zài Zhōngguó gǔdài shénhuà zhōng, kāitiān-pìdì de rénlèi shǐzǔ Fúxī hé Nǚwā, xíngxiàng dōu shì rénshǒu-shéshēn.",
             "Trong thần thoại cổ đại Trung Quốc, thủy tổ loài người là Phục Hy và Nữ Oa đều mang hình tượng đầu người mình rắn."),
            ("古人认为蛇具有蜕皮重生的神奇能力，因此把蛇看作生命力旺盛与长生不老的象征。",
             "Gǔrén rènwéi shé jùyǒu tuìpí chóngshēng de shénqí nénglì, yīncǐ bǎ shé kànzuò shēngmìnglì wàngshèng yǔ chángshēng-bùlǎo de xiàngzhēng.",
             "Cổ nhân cho rằng rắn có khả năng lột da tái sinh, coi đó là biểu tượng của sức sống mãnh liệt và trường sinh."),
            ("西方医学的标志也是一条盘绕在木杖上的蛇，被称为“阿斯克勒庇俄斯之杖”。",
             "Xīfāng yīxué de biāozhì yě shì yì tiáo pánrào zài mùzhàng shàng de shé, bèi chēng wéi “Āsīkèlèbǐ'éosī zhī zhàng”.",
             "Biểu tượng của y học phương Tây là con rắn quấn quanh cây trượng Asclepius."),
            ("事实上，蛇是自然界生态平衡中不可缺少的重要一环，它们每年捕食大量危害农作物的田鼠。",
             "Shìshí shàng, shé shì zìránjiè shēngtài pínghéng zhōng bùkě quēshǎo de zhòngyào yì huán, tāmen měinián bǔshí dàliàng wēihài nóngzuòwù de tiánshǔ.",
             "Trên thực tế, rắn là mắt xích quan trọng trong cân bằng sinh thái, săn bắt lượng lớn chuột đồng bảo vệ mùa màng.")
        ],
        "preferred_spotlight": ["历史", "自然", "文化", "生命"],
        "quiz": [
            {"id": "q1", "question_vi": "Phục Hy và Nữ Oa có hình tượng thế nào?", "options_vi": ["Đầu người mình rắn", "Đầu chim cánh phụng", "Đầu cá đuôi lươn"], "answer": 0, "explanation_vi": "Cả hai đều mang hình tượng đầu người mình rắn."},
            {"id": "q2", "question_vi": "Tại sao cổ nhân coi rắn là biểu tượng tái sinh?", "options_vi": ["Khả năng lột da", "Biết bơi dưới nước", "Ngủ đông"], "answer": 0, "explanation_vi": "Rắn có đặc tính lột da để phát triển."},
            {"id": "q3", "question_vi": "Rắn giúp ích gì cho nông nghiệp?", "options_vi": ["Bắt chuột đồng phá hoại", "Làm tơi đất", "Tạo bóng mát"], "answer": 0, "explanation_vi": "Rắn săn bắt chuột đồng bảo vệ hoa màu."}
        ]
    })

    # 3. 鹦鹉
    stories.append({
        "id": "wanwu_story_003",
        "chapter_no": 3,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 30,
        "book_page_end": 37,
        "page_display": "Trang 30 - 37",
        "title": {"zh": "鹦鹉：善言不由心", "vi": "Con vẹt: Khéo nói nhưng không từ tâm"},
        "topic": "nature_wildlife",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🦜",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 30 - 37 · Khám phá tài bắt chước tiếng người độc đáo của loài vẹt - 'viên ngọc có lông vũ' và cấu tạo đặc biệt của vòm họng.",
        "sentences_data": [
            ("鹦鹉是一大类色彩艳丽而形态多样的鸟类，被人们誉为“带羽毛的宝石”。",
             "Yīngwǔ shì yí dà lèi sècǎi yànlì ér xíngtài duōyàng de niǎolèi, bèi rénmen yùwéi “dài yǔmáo de bǎoshí”.",
             "Vẹt là loài chim sắc màu sặc sỡ, được ca ngợi là viên ngọc mang lông vũ."),
            ("鹦鹉最引人注目的本领，莫过于它们能够惟妙惟肖地模仿人类说话和各种声音。",
             "Yīngwǔ zuì yǐn rén zhùmù de běnlǐng, mòguò yú tāmen nénggòu wéimiào-wéixiào de mófǎng rénlèi shuōhuà hé gèzhǒng shēngyīn.",
             "Tài năng nổi bật nhất của vẹt là bắt chước tiếng người và các loại âm thanh sinh động."),
            ("俗话说“鹦鹉学舌，善言不由心”，意思是鹦鹉虽然会学人说话，但并不理解真正含义。",
             "Súhuà shuō “yīngwǔ xué shé, shàn yán bù yóu xīn”, yìsi shì yīngwǔ suīrán huì xué rén shuōhuà, dàn bìng bù lǐjiě zhēnzhèng hányì.",
             "Tục ngữ có câu vẹt học nói khéo nhưng không hiểu nghĩa thực sự."),
            ("科学家发现，鹦鹉能说话是因为它们拥有特殊的发音器官和肥厚圆润的舌头。",
             "Kēxuéjiā fāxiàn, yīngwǔ néng shuōhuà shì yīnwèi tāmen yōngyǒu tèshū de fāyīn qìguān hé féihòu yuánrùn de shétou.",
             "Vẹt phát âm được nhờ cơ quan phát âm đặc biệt và chiếc lưỡi tròn dày mềm mại."),
            ("聪明伶俐又长相美丽，让鹦鹉几千年来一直是人类最喜爱的宠物鸟之一。",
             "Cōngmíng línglì yòu zhǎngxiàng měilì, ràng yīngwǔ jǐ qiān nián lái yìzhí shì rénlèi zuì xǐ'ài de chǒngwù niǎo zhī yī.",
             "Thông minh xinh đẹp giúp loài vẹt ngàn đời nay luôn là thú cưng chim cảnh được mến mộ.")
        ],
        "preferred_spotlight": ["自然", "声音", "发现", "美丽"],
        "quiz": [
            {"id": "q1", "question_vi": "Vẹt được mệnh danh là gì?", "options_vi": ["Viên ngọc mang lông vũ", "Chúa tể bầu trời", "Chim thông thái"], "answer": 0, "explanation_vi": "Vẹt được ví như viên ngọc có lông vũ."},
            {"id": "q2", "question_vi": "Câu '鹦鹉学舌' ám chỉ điều gì?", "options_vi": ["Học vẹt không hiểu nghĩa", "Hát rất hay", "Chăm chỉ nói chuyện"], "answer": 0, "explanation_vi": "Chỉ việc lặp lại lời nói của người khác mà không hiểu."},
            {"id": "q3", "question_vi": "Cơ quan nào giúp vẹt nói được?", "options_vi": ["Khí quản đặc biệt và lưỡi tròn dày", "Mỏ dài nhọn", "Đôi cánh"], "answer": 0, "explanation_vi": "Vẹt có lưỡi dày tròn và bộ máy phát thanh đặc biệt."}
        ]
    })

    # 4. 乌鸦
    stories.append({
        "id": "wanwu_story_004",
        "chapter_no": 4,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 37,
        "book_page_end": 47,
        "page_display": "Trang 37 - 47",
        "title": {"zh": "乌鸦：城市的“留守者”", "vi": "Con quạ: Kẻ ở lại thành phố"},
        "topic": "nature_wildlife",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🐦‍⬛",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 37 - 47 · Giải mã loài quạ đen: từ câu chuyện cổ 'Quạ uống nước' đến chỉ số thông minh vượt trội và văn hóa hiếu thảo 'quạ mớm mồi'.",
        "sentences_data": [
            ("提起乌鸦，很多人的第一印象是漆黑的羽毛，但在古代它曾是备受尊敬的神鸟。",
             "Tíqǐ wūyā, hěn duō rén de dì-yī yìnxiàng shì qīhēi de yǔmáo, dàn zài gǔdài tā céng shì bèishòu zūnjìng de shénniǎo.",
             "Nói đến quạ nhiều người nhớ bộ lông đen tuyền, nhưng thời cổ nó từng là thần điểu được tôn kính."),
            ("古人常常用“乌鸦反哺”来赞美孝道，认为雏鸟长大后会叼食物回报年迈的父母。",
             "Gǔrén chángcháng yòng “wūyā fǎnbǔ” lái zànměi xiàodào, rènwéi chúniǎo zhǎngdà hòu huì diāo shíwù huíbào niánmài de fùmǔ.",
             "Cổ nhân dùng thành ngữ quạ mớm mồi ngược để ca ngợi tấm lòng hiếu thuận nuôi cha mẹ."),
            ("现代科学实验证明，乌鸦是鸟类家族中智商最高的物种之一。",
             "Xiàndài kēxué shíyàn zhèngmíng, wūyā shì niǎolèi jiāzú zhōng zhìshāng zuì gāo de wùzhǒng zhī yī.",
             "Khoa học chứng minh quạ là một trong những loài chim thông minh nhất hành tinh."),
            ("乌鸦不仅懂得投放石子升高水面喝水，还会制造和使用小木棍工具去钩取食物。",
             "Wūyā bùjǐn dǒngde tóufàng shízǐ shēnggāo shuǐmiàn hē shuǐ, hái huì zhìzào hé shǐyòng xiǎo mùgùn gōngjù qù gōu qǔ shíwù.",
             "Quạ biết thả sỏi dâng nước uống và còn biết dùng que gỗ khều lấy thức ăn trong hốc sâu."),
            ("极具智慧和适应力的乌鸦，渐渐成为现代城市里坚韧的“留守者”。",
             "Jí jù zhìhuì hé shìyìnglì de wūyā, jiànjiàn chéngwéi xiàndài chéngshì lǐ jiānrèn de “liúshǒuzhě”.",
             "Đầy thông minh và khả năng thích nghi cao, loài quạ trở thành cư dân kiên cường của đô thị.")
        ],
        "preferred_spotlight": ["城市", "实验", "工具", "证明"],
        "quiz": [
            {"id": "q1", "question_vi": "Thành ngữ '乌鸦反哺' ca ngợi đức tính gì?", "options_vi": ["Lòng hiếu thảo với cha mẹ", "Sự dũng cảm", "Tính cần cù"], "answer": 0, "explanation_vi": "Ca ngợi chim con tha mồi nuôi mẹ già."},
            {"id": "q2", "question_vi": "Hành vi nào chứng tỏ trí khôn của quạ?", "options_vi": ["Biết thả sỏi vào bình và dùng que gắp mồi", "Bay cao", "Hót to"], "answer": 0, "explanation_vi": "Quạ biết tận dụng công cụ để lấy mồi và nước."},
            {"id": "q3", "question_vi": "Trong thành phố hiện đại, quạ đóng vai trò gì?", "options_vi": ["Kẻ ở lại kiên cường thích nghi cao", "Loài di cư", "Vật nuôi gia đình"], "answer": 0, "explanation_vi": "Quạ thích nghi xuất sắc với môi trường đô thị."}
        ]
    })

    # 5. 蚂蚁
    stories.append({
        "id": "wanwu_story_005",
        "chapter_no": 5,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 47,
        "book_page_end": 56,
        "page_display": "Trang 47 - 56",
        "title": {"zh": "蚂蚁：一亿年物种进化之旅", "vi": "Loài kiến: Hành trình tiến hóa một trăm triệu năm"},
        "topic": "nature_wildlife",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🐜",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 47 - 56 · Xã hội loài kiến với cấu trúc phân công lao động chặt chẽ và hành trình sinh tồn vượt qua kỷ băng hà.",
        "sentences_data": [
            ("蚂蚁虽然身躯微小，却是地球上繁衍最成功、数量最庞大的陆生生物群体之一。",
             "Mǎyǐ suīrán shēnqū wēixiǎo, què shì dìqiú shàng fányǎn zuì chénggōng, shùliàng zuì pángdà de lùshēng shēngwù qúntǐ zhī yī.",
             "Kiến tuy nhỏ bé nhưng là loài vật trên cạn sinh sôi đông đảo bậc nhất Trái Đất."),
            ("早在距今一亿多年前的恐龙时代，蚂蚁就已经出现在地球上了。",
             "Zǎo zài jùjīn yí yì duō nián qián de kǒnglóng shídài, mǎyǐ jiù yǐjīng chūxiàn zài dìqiú shàng le.",
             "Từ hơn 100 triệu năm trước thời khủng long, kiến đã xuất hiện trên hành tinh."),
            ("一个蚁巢就像一个组织严密、分工明确的微型王国，各司其职。",
             "Yí gè yǐcháo jiù xiàng yí gè zǔzhī yánmì, fēngōng míngquè de wēixíng wángguó, gè sī qí zhí.",
             "Một tổ kiến như một vương quốc thu nhỏ có kỷ luật thép và phân công rành mạch."),
            ("一只普通的蚂蚁能够举起超过自身体重五十倍的物体，堪称自然界的“大力士”。",
             "Yì zhī pǔtōng de mǎyǐ nénggòu jǔ qǐ chāoguò zìshēn tǐzhòng wǔshí bèi de wùtǐ, kānchēng zìránjiè de “dàlìshì”.",
             "Một chú kiến có thể nâng vật nặng gấp 50 lần trọng lượng bản thân, như lực sĩ rừng xanh."),
            ("凭借高度的团结与协作精神，微小的蚂蚁经历了沧海桑田的变迁，在地球上屹立了一亿年。",
             "Píngjiè gāodù de tuánjié yǔ xiézuò jīngshén, wēixiǎo de mǎyǐ jīnglì le cānghǎi-sāngtián de biànqiān, zài dìqiú shàng yìlì le yí yì nián.",
             "Nhờ tinh thần đoàn kết tuyệt đối, bầy kiến bé nhỏ đã vượt qua mọi biến thiên suốt trăm triệu năm.")
        ],
        "preferred_spotlight": ["蚂蚁", "力量", "地球", "组织"],
        "quiz": [
            {"id": "q1", "question_vi": "Kiến xuất hiện trên Trái Đất từ khi nào?", "options_vi": ["Hơn 100 triệu năm trước thời khủng long", "Cách nay 1.000 năm", "Thời kỳ đồ đá"], "answer": 0, "explanation_vi": "Hóa thạch kiến có từ hơn 100 triệu năm trước."},
            {"id": "q2", "question_vi": "Kiến có thể nâng vật nặng gấp bao nhiêu lần cơ thể?", "options_vi": ["Gấp 50 lần", "Gấp 2 lần", "Gấp 5 lần"], "answer": 0, "explanation_vi": "Kiến có thể nâng vật nặng gấp hơn 50 lần bản thân."},
            {"id": "q3", "question_vi": "Bí quyết sinh tồn của loài kiến là gì?", "options_vi": ["Tính kỷ luật và đoàn kết cao", "Có cánh bay nhanh", "Nọc độc nguy hiểm"], "answer": 0, "explanation_vi": "Sức mạnh bầy đàn và phân công lao động chặt chẽ."}
        ]
    })

    # 6. 航母
    stories.append({
        "id": "wanwu_story_006",
        "chapter_no": 6,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 56,
        "book_page_end": 66,
        "page_display": "Trang 56 - 66",
        "title": {"zh": "航母：飞机载舰的迷人设想", "vi": "Tàu sân bay: Ý tưởng mê hoặc về tàu chở máy bay"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🚢",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 56 - 66 · Sự ra đời của tàu sân bay: từ giấc mơ cất cánh giữa biển khơi đến 'sân bay di động' định hình hải chiến hiện đại.",
        "sentences_data": [
            ("自莱特兄弟完成人类第一次动力飞行后，把飞机与军舰结合的设想便迅速诞生了。",
             "Zì Lǎitè xiōngdì wánchéng rénlèi dì-yī cì dònglì fēixíng hòu, bǎ fēijī yǔ jūnjiàn jiéhé de shèxiǎng biàn xùnsù dànshēng le.",
             "Kể từ khi anh em nhà Wright bay chuyến đầu tiên, ý tưởng kết hợp máy bay với tàu chiến lập tức ra đời."),
            ("航空母舰本质上是一座移动的海上浮动机场，拥有宽阔平坦的飞行甲板。",
             "Hángkōng mǔjiàn běnzhì shàng shì yí zuò yídòng de hǎishàng fúdòng jīchǎng, yōngyǒu kuānkuò píngtǎn de fēixíng jiǎbǎn.",
             "Tàu sân bay bản chất là một sân bay nổi di động trên biển với sàn đáp mênh mông."),
            ("一战期间，英国改装了世界上第一艘具备全通甲板的航空母舰“百眼巨人”号。",
             "Yīzhàn qījiān, Yīngguó gǎizhuāng le shìjiè shàng dì-yī sōu jùbèi quántōng jiǎbǎn de hángkōng mǔjiàn “Bǎi Yǎn Jùrén” hào.",
             "Trong Thế chiến I, Anh cải hoán chiến hạm đầu tiên có sàn đáp thông suốt mang tên Argus."),
            ("在二战的太平洋战场上，航母彻底取代了战列舰，成为现代海战中的绝对核心主力。",
             "Zài Èrzhàn de Tàipíngyáng zhànchǎng shàng, hángmǔ chèdǐ qǔdài le zhànlièjiàn, chéngwéi xiàndài hǎizhàn zhōng de juéduì héxīn zhǔlì.",
             "Trong Thế chiến II, tàu sân bay soán ngôi thiết giáp hạm, trở thành linh hồn của hải chiến hiện đại."),
            ("现代重型核动力航母能够搭载数十架先进战机，航行数十年而无需添加燃料。",
             "Xiàndài zhòngxíng hé dònglì hángmǔ nénggòu dāzài shùshí jià xiānjìn zhànjī, hángxíng shùshí nián ér wúxū tiānjiā ránliào.",
             "Tàu sân bay hạt nhân ngày nay mang theo hàng chục chiến đấu cơ, có thể chạy hàng chục năm không cần nạp nhiên liệu.")
        ],
        "preferred_spotlight": ["飞行", "海洋", "现代", "核心"],
        "quiz": [
            {"id": "q1", "question_vi": "Bản chất của tàu sân bay là gì?", "options_vi": ["Một sân bay nổi di động trên biển", "Một tàu ngầm khổng lồ", "Một trạm radar đơn thuần"], "answer": 0, "explanation_vi": "Tàu sân bay hoạt động như một sân bay quân sự nổi trên biển."},
            {"id": "q2", "question_vi": "Trong Thế chiến II, tàu sân bay đã thay thế loại tàu chiến nào?", "options_vi": ["Thiết giáp hạm (战列舰)", "Tàu buồm", "Tàu đánh cá"], "answer": 0, "explanation_vi": "Tàu sân bay thay thế thiết giáp hạm để thành lực lượng nòng cốt."},
            {"id": "q3", "question_vi": "Ưu điểm của tàu sân bay hạt nhân hiện đại là gì?", "options_vi": ["Có thể chạy hàng chục năm không cần tiếp nhiên liệu", "Không cần người lái", "Chạy hoàn toàn bằng sức gió"], "answer": 0, "explanation_vi": "Năng lượng hạt nhân cho phép tàu chạy bền bỉ hàng chục năm."}
        ]
    })

    # 7. 机关枪
    stories.append({
        "id": "wanwu_story_007",
        "chapter_no": 7,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 66,
        "book_page_end": 76,
        "page_display": "Trang 66 - 76",
        "title": {"zh": "机关枪：“死神手中的镰刀”", "vi": "Súng máy: 'Lưỡi hái trong tay tử thần'"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "⚙️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 66 - 76 · Bước ngoặt vũ khí bộ binh: phát minh của Maxim và bài học đau thương về uy lực của hỏa lực tự động trong Thế chiến I.",
        "sentences_data": [
            ("在第一次世界大战中，机关枪的普遍使用彻底改变了陆地战场的作战形态。",
             "Zài dì-yī cì shìjiè dàzhàn zhōng, jīguānqiāng de pǔbiàn shǐyòng chèdǐ gǎibiàn le lùdì zhànchǎng de zuòzhàn xíngtài.",
             "Trong Thế chiến I, sự xuất hiện rộng rãi của súng máy đã đảo lộn hoàn toàn bộ mặt chiến trường trên bộ."),
            ("一八八四年，发明家马克沁利用子弹发射时的后坐力能量，造出了第一挺全自动机枪。",
             "Yī-bā-bā-sì nián, fāmíngjiā Mǎkèqìn lìyòng zǐdàn fāshè shí de hòuzuòlì néngliàng, zàochū le dì-yī tǐng quán zìdòng jīqiāng.",
             "Năm 1884, nhà phát minh Maxim tận dụng lực giật khi bắn để chế tạo khẩu súng máy tự động đầu tiên."),
            ("机枪拥有每分钟发射数百发子弹的恐怖射速，让传统的步兵密集冲锋变成了致命的灾难。",
             "Jīqiāng yōngyǒu měi fēnzhōng fāshè shùbǎi fā zǐdàn de kǒngbù shèsù, ràng chuántǒng de bùbīng mìjí chōngfēng biànchéng le zhìmìng de zāinàn.",
             "Với tốc độ xả hàng trăm viên đạn mỗi phút, các đợt xung phong giáp lá cà truyền thống trở thành thảm họa."),
            ("在索姆河战役中，短短一天之内就有数万名英军士兵倒在德军机枪构筑的火网之下。",
             "Zài Suǒmǔhé zhànyì zhōng, duǎnduǎn yì tiān zhīnèi jiù yǒu shùwàn míng Yīngjūn shìbīng dǎo zài Déjūn jīqiāng gòuzhù de huǒwǎng zhīxià.",
             "Trong trận Somme, chỉ trong một ngày đã có hàng vạn binh sĩ gục ngã trước làn đạn súng máy."),
            ("残酷的战争教训促使军事家们重新思考防御战术，并直接催生了坦克的诞生。",
             "Cánkù de zhànzhēng jiàoxun cùshǐ jūnshìjiā men chóngxīn sīkǎo fángyù zhànshù, bìng zhíjiē cuīshēng le tǎnkè de dànshēng.",
             "Bài học tàn khốc đã buộc giới quân sự phải đổi mới chiến thuật và thúc đẩy cỗ xe tăng ra đời.")
        ],
        "preferred_spotlight": ["发明", "战争", "改变", "能量"],
        "quiz": [
            {"id": "q1", "question_vi": "Ai là người chế tạo khẩu súng máy tự động đầu tiên?", "options_vi": ["Maxim (马克沁)", "Nobel", "Edison"], "answer": 0, "explanation_vi": "Nhà phát minh Maxim chế tạo súng máy tự động năm 1884."},
            {"id": "q2", "question_vi": "Súng máy vận hành dựa trên nguồn năng lượng nào?", "options_vi": ["Lực giật khi đạn nổ bắn ra", "Dòng điện ngoài", "Lò xo dây cót"], "answer": 0, "explanation_vi": "Sử dụng lực đẩy giật lùi của phát bắn để nạp viên tiếp theo."},
            {"id": "q3", "question_vi": "Hỏa lực súng máy đã trực tiếp thúc đẩy sự ra đời của vũ khí nào?",
             "options_vi": ["Xe tăng bọc thép", "Máy bay tiêm kích", "Tàu ngầm"], "answer": 0, "explanation_vi": "Để đột phá hỏa lực súng máy, xe tăng đã được phát minh."}
        ]
    })

    # 8. 坦克
    stories.append({
        "id": "wanwu_story_008",
        "chapter_no": 8,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 76,
        "book_page_end": 85,
        "page_display": "Trang 76 - 85",
        "title": {"zh": "坦克：陆战之王", "vi": "Xe tăng: Vua chiến trường trên bộ"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🛡️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 76 - 85 · Cỗ máy bọc thép phá vỡ thế bế tắc chiến hào: nguồn gốc tên gọi 'Tank' bí mật và vai trò bá chủ lục quân.",
        "sentences_data": [
            ("一战时期，铁丝网、战壕与机枪的结合让进攻方寸步难行，战场陷入了长期的僵局。",
             "Yīzhàn shíqī, tiěsīwǎng, zhànháo yǔ jīqiāng de jiéhé ràng jìngōngfāng cùnbù-nánxíng, zhànchǎng xiànrù le chángqī de jiāngjú.",
             "Thời Thế chiến I, hào sâu, dây thép gai và súng máy khiến các đợt tiến công bế tắc hoàn toàn."),
            ("为了突破这种死亡防线，英国人秘密研制出一种披着厚重装甲、依靠履带行驶的钢铁巨兽。",
             "Wèile tūpò zhè zhǒng sǐwáng fángxiàn, Yīngguórén mìmì yánzhì chū yì zhǒng pī zhe hòuzhòng zhuāngjiǎ, yīkào lǚdài xíngshǐ de gāngtiě jùshòu.",
             "Để phá thế bế tắc, người Anh bí mật chế tạo quái vật thép bọc giáp dày chạy bằng xích xe."),
            ("为了保密，制造厂对外宣称这些铁箱子是运往俄国的水箱，“坦克”（Tank）这个名字便沿用至今。",
             "Wèile bǎomì, zhìzàochǎng duìwài xuānchēng zhèxiē tiěxiāngzi shì yùn wǎng Éguó de shuǐxiāng, “tǎnkè” (Tank) zhè gè míngzi biàn yányòng zhìjīn.",
             "Để giữ bí mật, người ta ngụy trang chúng là bể chứa nước (Tank) chở sang Nga, tên gọi xe tăng bắt đầu từ đó."),
            ("一九一六年，英国坦克首次出现在索姆河战场，所向披靡地碾压铁丝网并跨越壕沟。",
             "Yī-jiǔ-yī-liù nián, Yīngguó tǎnkè shǒucì chūxiàn zài Suǒmǔhé zhànchǎng, suǒxiàng-pīmǐ de niǎnyā tiěsīwǎng bìng kuàyuè háogōu.",
             "Năm 1916, xe tăng Anh lần đầu xuất trận tại Somme, nghiền nát dây thép gai và vượt rãnh hào dễ dàng."),
            ("凭借强大的火力、防护力与越野机动性，坦克成为了二十世纪当之无愧的“陆战之王”。",
             "Píngjiè qiángdà de huǒlì, fánghùlì yǔ yuèyě jīdòngxìng, tǎnkè chéngwéi le èrshí shìjì dāngzhī-wúkuì de “lùzhàn zhī wáng”.",
             "Với hỏa lực mạnh mẽ, giáp kiên cố và cơ động việt dã, xe tăng trở thành vua chiến trường trên bộ của thế kỷ 20.")
        ],
        "preferred_spotlight": ["秘密", "保护", "突破", "出现"],
        "quiz": [
            {"id": "q1", "question_vi": "Tại sao xe tăng lại có tên gọi là 'Tank'?", "options_vi": ["Bí mật ngụy trang là 'bể nước' (Water Tank)", "Đặt theo tên người chế tạo", "Tên một thị trấn nước Anh"], "answer": 0, "explanation_vi": "Quân đội Anh ngụy trang xe thành các thùng nước (Tank) chở hàng."},
            {"id": "q2", "question_vi": "Xe tăng ra đời nhằm phá vỡ thế trận nào?", "options_vi": ["Thế trận chiến hào bế tắc thời Thế chiến I", "Hải chiến ban đêm", "Chiến tranh trên không"], "answer": 0, "explanation_vi": "Đột phá phòng tuyến hào sâu và dây thép gai kiên cố."},
            {"id": "q3", "question_vi": "Ba yếu tố cốt lõi của xe tăng là gì?", "options_vi": ["Hỏa lực, vỏ giáp bảo vệ và độ cơ động vượt địa hình", "Tốc độ bay và radar", "Khả năng lặn sâu"], "answer": 0, "explanation_vi": "Hỏa lực, giáp phòng hộ và khả năng vượt chướng ngại vật."}
        ]
    })

    # 9. 窃听器
    stories.append({
        "id": "wanwu_story_009",
        "chapter_no": 9,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 85,
        "book_page_end": 97,
        "page_display": "Trang 85 - 97",
        "title": {"zh": "窃听器：冷战“明星”武器", "vi": "Máy nghe trộm: Vũ khí ngôi sao thời Chiến tranh Lạnh"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🎙️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 85 - 97 · Cuộc đấu trí tình báo công nghệ cao: từ món quà chạm khắc gỗ chứa thiết bị thụ động đến trận chiến bảo mật thông tin.",
        "sentences_data": [
            ("在没有硝烟的冷战情报战场上，微小的窃听器成为了最隐蔽却最具威力的情报武器。",
             "Zài méiyǒu xiāoyān de Lěngzhàn qíngbào zhànchǎng shàng, wēixiǎo de qiètīngqì chéngwéi le zuì yǐnbì què zuì jù wēilì de qíngbào wǔqì.",
             "Trên mặt trận tình báo Chiến tranh Lạnh không khói súng, máy nghe lén tí hon là vũ khí ngầm đáng sợ nhất."),
            ("一九四五年，苏联少先队员向美国驻苏大使赠送了一面精美的美国国徽木雕工艺品。",
             "Yī-jiǔ-sì-wǔ nián, Sūlián shǎoxiānduìyuán xiàng Měiguó zhù Sū dàshǐ zèngsòng le yí miàn jīngměi de Měiguó guóhuī mùdiāo gōngyìpǐn.",
             "Năm 1945, thiếu nhi Liên Xô tặng Đại sứ Mỹ bức chạm khắc quốc huy Mỹ tinh xảo bằng gỗ."),
            ("谁也没有料到，这件挂在大使办公室整整八年的国徽内部，竟然隐藏着一种无需电源的被动窃听装置。",
             "Shéi yě méiyǒu liàodào, zhè jiàn guà zài dàshǐ bàngōngshì zhěngzhěng bā nián de guóhuī nèibù, jìngrán yǐncáng zhe yì zhǒng wúxū diànyuán de bèidòng qiètīng zhuāngzhì.",
             "Không ai ngờ bên trong bức phù điêu treo 8 năm ở phòng đại sứ lại gắn máy nghe lén thụ động không cần pin."),
            ("只有当特定频率的无线电微波射向它时，它才会将房间里的谈话声波反射回去。",
             "Zhǐyǒu dāng tèdìng pínlǜ de wúxiàndiàn wēibō shèxiàng tā shí, tā cái huì jiāng fángjiān lǐ de tánhuà shēngbō fǎnshè huíqù.",
             "Chỉ khi có chùm sóng vô tuyến chiếu vào, màng rung mới phản hồi âm thanh cuộc trò chuyện ra ngoài."),
            ("这项被称为“金唇”的绝密发明，揭开了现代无线电电子对抗与防窃密技术的序幕。",
             "Zhè xiàng bèi chēng wéi “Jīnchún” de juémì fāmíng, jiēkāi le xiàndài wúxiàndiàn diànzǐ duìkàng yǔ fáng-qièmì jìshù de xùmù.",
             "Thiết bị 'Môi Vàng' huyền thoại này đã mở màn cho công nghệ tác chiến điện tử và bảo mật hiện đại.")
        ],
        "preferred_spotlight": ["武器", "技术", "礼物", "隐藏"],
        "quiz": [
            {"id": "q1", "question_vi": "Thiết bị nghe lén 'Môi Vàng' được giấu trong vật phẩm nào?", "options_vi": ["Bức chạm gỗ quốc huy Mỹ treo tường phòng đại sứ", "Chiếc bút máy", "Đôi giày"], "answer": 0, "explanation_vi": "Nó được giấu trong bức phù điêu quốc huy Mỹ suốt 8 năm."},
            {"id": "q2", "question_vi": "Điểm độc đáo nhất của thiết bị nghe lén này là gì?", "options_vi": ["Không cần pin nguồn điện bên trong", "Rất to lớn", "Có đèn nhấp nháy"], "answer": 0, "explanation_vi": "Thiết bị thụ động, chỉ kích hoạt khi bị chiếu sóng vi ba từ ngoài."},
            {"id": "q3", "question_vi": "Cuộc chiến nghe lén đã thúc đẩy lĩnh vực nào phát triển?", "options_vi": ["Kỹ thuật bảo mật và tác chiến điện tử", "Kỹ thuật đúc gang", "Kỹ thuật in ấn"], "answer": 0, "explanation_vi": "Thúc đẩy các công nghệ chống nghe lén và bảo mật thông tin."}
        ]
    })

    # 10. 人种
    stories.append({
        "id": "wanwu_story_010",
        "chapter_no": 10,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 97,
        "book_page_end": 107,
        "page_display": "Trang 97 - 107",
        "title": {"zh": "人种：“造物主”留下的谜团", "vi": "Chủng tộc: Bí ẩn đấng tạo hóa để lại"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🌍",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 97 - 107 · Nguồn gốc các chủng tộc loài người: thích nghi khí hậu tự nhiên và bằng chứng di truyền học chứng minh 'tất cả là một nhà'.",
        "sentences_data": [
            ("人类的不同肤色与样貌差异，曾经是困扰近代科学家几个世纪的未解之谜。",
             "Rénlèi de bùtóng fūsè yǔ yàngmào chāyì, céngjīng shì kùnrǎo jìndài kēxuéjiā jǐ gè shìjì de wèijiě zhī mǐ.",
             "Sự khác biệt màu da và nhân diện từng làm đau đầu giới khoa học suốt nhiều thế kỷ."),
            ("传统的人类学通常把全球人类划分为黄种人、白种人、黑种人和棕种人四大群体。",
             "Chuántǒng de rénlèixué tōngcháng bǎ quánqiú rénlèi huàfēn wéi huángzhǒngrén, báizhǒngrén, hēizhǒngrén hé zōngzhǒngrén sì dà qúntǐ.",
             "Nhân chủng học truyền thống thường chia loài người làm 4 nhóm chính: da vàng, da trắng, da đen và da nâu."),
            ("现代科学研究表明，肤色的深浅本质上是人体为适应不同纬度紫外线照射而进化的自然结果。",
             "Xiàndài kēxué yánjiū biǎomíng, fūsè de shēnqiǎn běnzhì shàng shì réntǐ wèi shìyìng bùtóng wěidù zǐwàixiàn zhàoshè ér jìnhuà de zìrán jiéguǒ.",
             "Khoa học chỉ ra sắc da tiến hóa để thích ứng với lượng bức xạ tia cực tím ở từng vĩ độ địa lý."),
            ("赤道附近的居民需要更多黑色素来阻挡紫外线伤害，而高纬度地区的人群则进化出浅肤色以便合成维生素D。",
             "Chìdào fùjìn de jūmín xūyào gèng duō hēisèsù lái zǔdǎng zǐwàixiàn shānghài, ér gāo wěidù dìqū de rénqún zé jìnhuà chū qiǎn fūsè yǐbiàn héchéng wéishēngsù D.",
             "Vùng xích đạo cần nhiều sắc tố đen chống nắng, còn xứ hàn đới da sáng để tổng hợp vitamin D."),
            ("基因DNA测序彻底证实，当今全人类都源自同一个共同的古老祖先，在生物学上彼此完全平等。",
             "Jīyīn DNA cèxù chèdǐ zhèngshí, dāngjīn quán rénlèi dōu yuánzì tóng yí gè gòngtóng de gǔlǎo zǔxiān, zài shēngwùxué shàng bǐcǐ wánquán píngděng.",
             "Giải mã DNA khẳng định toàn bộ nhân loại chung một gốc tổ tiên, bình đẳng hoàn toàn về mặt sinh học.")
        ],
        "preferred_spotlight": ["科学", "研究", "自然", "完全"],
        "quiz": [
            {"id": "q1", "question_vi": "Màu da người khác nhau chủ yếu do yếu tố nào hình thành?", "options_vi": ["Thích nghi với mức độ tia cực tím tại từng vĩ độ", "Do ăn các loại thực phẩm khác nhau", "Do tập luyện thể thao"], "answer": 0, "explanation_vi": "Da tiến hóa để thích nghi với cường độ ánh nắng mặt trời."},
            {"id": "q2", "question_vi": "Tại sao người xứ lạnh ôn đới thường có làn da sáng?", "options_vi": ["Giúp cơ thể dễ hấp thụ ánh nắng để tổng hợp vitamin D", "Vì thích màu trắng", "Do không khí lạnh"], "answer": 0, "explanation_vi": "Da sáng giúp tổng hợp vitamin D thuận lợi ở nơi ít nắng."},
            {"id": "q3", "question_vi": "Khoa học di truyền DNA chứng minh điều gì về nhân loại?", "options_vi": ["Toàn nhân loại cùng chung một gốc tổ tiên và hoàn toàn bình đẳng", "Mỗi chủng tộc có nguồn gốc sinh vật khác nhau", "Người da trắng xuất hiện trước"], "answer": 0, "explanation_vi": "Tất cả con người hiện đại đều có chung tổ tiên chung."}
        ]
    })

    # 11. 外星人
    stories.append({
        "id": "wanwu_story_011",
        "chapter_no": 11,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 107,
        "book_page_end": 115,
        "page_display": "Trang 107 - 115",
        "title": {"zh": "外星人：一种理所当然的存在", "vi": "Người ngoài hành tinh: Sự tồn tại đương nhiên"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "👽",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 107 - 115 · Khám phá xác suất sự sống ngoài Trái Đất: phương trình Drake, nghịch lý Fermi và hành trình tìm kiếm nền văn minh vũ trụ.",
        "sentences_data": [
            ("浩瀚无垠的宇宙中，人类是否是唯一的孤独智慧生命？这个问题吸引了无数仰望星空的人。",
             "Hàohàn-wúyín de yǔzhòu zhōng, rénlèi shìfǒu shì wéiyī de gūdú zhìhuì shēngmìng? Zhè gè wèntí xīyǐn le wúshù yǎngwàng xīngkōng de rén.",
             "Giữa vũ trụ bao la vô tận, con người có cô đơn một mình không? Câu hỏi này cuốn hút muôn thế hệ."),
            ("银河系拥有上千亿颗恒星，而整个可观测宇宙中的星系数量更是以万亿来计算。",
             "Yínhéxì yōngyǒu shàng qiān yì kē héngxīng, ér zhěnggè kě guāncè yǔzhòu zhōng de xīngxì shùliàng gèng shì yǐ wànyì lái jìsuàn.",
             "Ngân Hà có hàng trăm tỷ ngôi sao, và vũ trụ quan sát được có tới hàng ngàn tỷ thiên hà."),
            ("从概率学的角度来看，在如此庞大的星球基数上，地球绝不可能是产生生命的唯一孤岛。",
             "Cóng gàilǜxué de jiǎodù lái kàn, zài rúcǐ pángdà de xīngqiú jīshù shàng, dìqiú jué bù kěnéng shì chǎnshēng shēngmìng de wéiyī gūdǎo.",
             "Dưới góc độ xác suất, với số lượng hành tinh khổng lồ, Trái Đất khó lòng là ốc đảo duy nhất có sự sống."),
            ("著名物理学家费米提出了著名的“费米悖论”：如果外星人普遍存在，为什么我们还没有见到他们？",
             "Zhùmíng wùlǐ xuéjiā Fèimǐ tíchū le zhùmíng de “Fèimǐ bèilùn”: Rúguǒ wàixīngrén pǔbiàn cúnzài, wèishénme wǒmen hái méiyǒu jiàndào tāmen?",
             "Nhà vật lý Fermi đưa ra nghịch lý nổi tiếng: Nếu văn minh ngoài hành tinh đầy rẫy, tại sao chưa thấy họ?"),
            ("科学家们正通过巨型射电望远镜不断向宇宙深空发射和搜寻信号，期待解开这个终极之谜。",
             "Kēxuéjiā men zhèng tōngguò jùxíng shèdiàn wàngyuǎnjìng búduàn xiàng yǔzhòu shēnkōng fāshè hé sōuxún xìnhào, qīdài jiěkāi zhè gè zhōngjí zhī mǐ.",
             "Các nhà khoa học dùng kính viễn vọng vô tuyến khổng lồ dò tìm tín hiệu để giải mã bí ẩn tối thượng này.")
        ],
        "preferred_spotlight": ["宇宙", "生命", "地球", "著名"],
        "quiz": [
            {"id": "q1", "question_vi": "Tại sao các nhà khoa học tin rằng có sự sống ngoài Trái Đất?", "options_vi": ["Số lượng hành tinh trong vũ trụ quá lớn theo xác suất", "Đã tìm thấy tàu vũ trụ", "Được thấy trên tivi"], "answer": 0, "explanation_vi": "Vũ trụ có hàng ngàn tỷ thiên hà với vô số hành tinh tương tự."},
            {"id": "q2", "question_vi": "Nội dung chính của 'Nghịch lý Fermi' là gì?", "options_vi": ["Nếu người ngoài hành tinh đông đảo, tại sao ta chưa thấy bằng chứng?", "Trái Đất là trung tâm vũ trụ", "Con người không thể chế tạo tên lửa"], "answer": 0, "explanation_vi": "Mâu thuẫn giữa xác suất cao và sự vắng bóng dấu vết liên lạc."},
            {"id": "q3", "question_vi": "Nhân loại dùng phương tiện gì để tìm kiếm tín hiệu vũ trụ?", "options_vi": ["Kính viễn vọng vô tuyến khổng lồ", "Tàu ngầm đáy biển", "La bàn cổ"], "answer": 0, "explanation_vi": "Sử dụng kính thiên văn vô tuyến để thu phát sóng không gian."}
        ]
    })

    # 12. 彗星
    stories.append({
        "id": "wanwu_story_012",
        "chapter_no": 12,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 115,
        "book_page_end": 124,
        "page_display": "Trang 115 - 124",
        "title": {"zh": "彗星：天上的流浪者", "vi": "Sao chổi: Kẻ lang thang trên bầu trời"},
        "topic": "nature_wildlife",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "☄️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 115 - 124 · Bí mật của những 'quả cầu tuyết bẩn': từ quan niệm dân gian 'sao chổi' đến nguồn gốc nước và sự sống trên Trái Đất.",
        "sentences_data": [
            ("晴朗的夜空中，有时会出现一种拖着长长明亮尾巴的神秘天体，这就是彗星。",
             "Qínglǎng de yèkōng zhōng, yǒushí huì chūxiàn yì zhǒng tuō zhe chángcháng míngliàng wěiba de shénmì tiāntǐ, zhè jiù shì huìxīng.",
             "Trên bầu trời đêm thanh vắng, đôi khi xuất hiện thiên thể có chiếc đuôi dài sáng rực rỡ: sao chổi."),
            ("因为它的尾巴看起来像一把倒挂的扫帚，中国民间常形象地把它叫做“扫帚星”。",
             "Yīnwèi tā de wěiba kàn qǐlái xiàng yì bǎ dàoguà de sàozhou, Zhōngguó mínjiān cháng xíngxiàng de bǎ tā jiàozuò “sàozhou xīng”.",
             "Vì chiếc đuôi trông như cây chổi treo ngược, dân gian thường gọi quen là 'sao chổi'."),
            ("科学研究发现，彗星本质上是太阳系边缘由冰块、尘埃和冰冻气体组成的大型“脏雪球”。",
             "Kēxué yánjiū fāxiàn, huìxīng běnzhì shàng shì tàiyángxì biānyuán yóu bīngkuài, chén'āi hé bīngdòng qìtǐ zǔchéng de dàxíng “zàng xuěqiú”.",
             "Khoa học phát hiện sao chổi thực chất là những 'quả cầu tuyết bẩn' gồm băng đá, bụi và khí đông lạnh."),
            ("当彗星接近太阳时，太阳的热量使冰层升华，在太阳风的吹拂下形成了长达数百万公里的辉煌彗尾。",
             "Dāng huìxīng jiējìn tàiyáng shí, tàiyáng de rèliàng shǐ bīngcéng shēnghuá, zài tàiyángfēng de chuīfú xià xíngchéng le cháng dá shùbǎi wàn gōnglǐ de huīhuáng huìwěi.",
             "Khi tới gần mặt trời, hơi nóng làm băng thăng hoa, gió mặt trời thổi dạt tạo thành chiếc đuôi triệu km."),
            ("著名天文学家哈雷计算出哈雷彗星约每七十六年造访地球一次，证实了彗星运行同样遵循引力法则。",
             "Zhùmíng tiānwén xuéjiā Hālěi jìsuàn chū Hālěi huìxīng yuē měi qīshíliù nián zàofǎng dìqiú yí cì, zhèngshí le huìxīng yùnxíng tóngyàng zūnxún yǐnlì fǎzé.",
             "Nhà thiên văn Halley tính ra chu kỳ 76 năm của sao chổi Halley, chứng minh nó tuân theo định luật vạn vật hấp dẫn.")
        ],
        "preferred_spotlight": ["出现", "太阳", "发现", "科学"],
        "quiz": [
            {"id": "q1", "question_vi": "Bản chất vật chất của sao chổi là gì?", "options_vi": ["Quả cầu tuyết bẩn gồm băng đá, bụi và khí đóng băng", "Khối sắt nóng chảy", "Hành tinh khí"], "answer": 0, "explanation_vi": "Sao chổi được mệnh danh là quả cầu tuyết bẩn chứa băng và bụi."},
            {"id": "q2", "question_vi": "Tại sao đuôi sao chổi chỉ xuất hiện khi đến gần mặt trời?", "options_vi": ["Nhiệt lượng mặt trời làm băng thăng hoa và gió mặt trời thổi dạt", "Do trời mưa", "Do va chạm hành tinh"], "answer": 0, "explanation_vi": "Băng thăng hoa thành bụi khí bị gió mặt trời thổi ngược hướng."},
            {"id": "q3", "question_vi": "Sao chổi Halley quay lại thăm Trái Đất sau chu kỳ bao nhiêu năm?", "options_vi": ["Khoảng 76 năm", "Khoảng 10 năm", "Khoảng 100 năm"], "answer": 0, "explanation_vi": "Chu kỳ quỹ đạo của sao chổi Halley là khoảng 75-76 năm."}
        ]
    })

    # 13. 陨石
    stories.append({
        "id": "wanwu_story_013",
        "chapter_no": 13,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 124,
        "book_page_end": 133,
        "page_display": "Trang 124 - 133",
        "title": {"zh": "陨石：天外的来客", "vi": "Thiên thạch: Vị khách từ ngoài vũ trụ"},
        "topic": "nature_wildlife",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪨",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 124 - 133 · Khám phá những mảnh đá vũ trụ rơi xuống Trái Đất: kho tàng thông tin vô giá về sự hình thành của hệ Mặt Trời.",
        "sentences_data": [
            ("中国是世界上最早、最系统观测与记载陨石现象的国家，《竹书纪年》中就记载了四千年前的陨石雨。",
             "Zhōngguó shì shìjiè shàng zuì zǎo, zuì xìtǒng guāncè yǔ jìzǎi yǔnshí xiànxiàng de guójiā, “Zhúshū Jìnián” zhōng jiù jìzǎi le sìqiān nián qián de yǔnshíyǔ.",
             "Trung Quốc ghi chép thiên thạch sớm nhất thế giới, sách cổ Trúc Thư Kỷ Niên đã ghi nhận mưa thiên thạch 4.000 năm trước."),
            ("陨石是太阳系中的小行星或流星体穿过地球大气层后，未完全燃烧而坠落到地面的残骸。",
             "Yǔnshí shì tàiyángxì zhōng de xiǎoxíngxīng huò liúxīngtǐ chuānguò dìqiú dàqìcéng hòu, wèi wánquán ránshāo ér zhuìluò dào dìmiàn de cánhái.",
             "Thiên thạch là tàn tích của tiểu hành tinh xuyên qua bầu khí quyển chưa cháy hết rơi xuống đất."),
            ("按照主要成分的不同，科学家把陨石分为石陨石、铁陨石和石铁陨石三大类。",
             "Ànzhào zhǔyào chéngfèn de bùtóng, kēxuéjiā bǎ yǔnshí fēnwéi shíyǔnshí, tiěyǔnshí hé shítiě yǔnshí sān dà lèi.",
             "Căn cứ vào thành phần, các nhà khoa học chia làm 3 loại: thiên thạch đá, thiên thạch sắt và thiên thạch đá-sắt."),
            ("陨石保留了太阳系诞生初期最原始的化学信息，堪称研究宇宙起源的“无价之宝”。",
             "Yǔnshí bǎoliú le tàiyángxì dànshēng chūqī zuì yuánshǐ de huàxué xìnxī, kānchēng yánjiū yǔzhòu qǐyuán de “wújià zhī bǎo”.",
             "Thiên thạch lưu giữ thông tin hóa học thuở sơ khai của hệ Mặt Trời, là báu vật nghiên cứu vũ trụ."),
            ("很多古代文明甚至把天降陨铁视作神明的恩赐，用来锻造削铁如泥的神兵宝剑。",
             "Hěn duō gǔdài wénmíng shènzhì bǎ tiānjiàng yǔntiě shìzuò shénmíng de ēncì, yòng lái duànzào xiāotiě-rúní de shénbīng bǎojiàn.",
             "Nhiều nền văn minh cổ coi sắt trời ban này là quà tặng của thần linh, dùng rèn nên kiếm báu sắc bén.")
        ],
        "preferred_spotlight": ["地球", "信息", "研究", "历史"],
        "quiz": [
            {"id": "q1", "question_vi": "Thiên thạch rơi xuống Trái Đất là gì?", "options_vi": ["Mảnh vỡ tiểu hành tinh chưa cháy hết trong khí quyển", "Đá từ miệng núi lửa", "Cát bụi nhân tạo"], "answer": 0, "explanation_vi": "Là tàn tích thiên thể xuyên qua khí quyển Trái Đất."},
            {"id": "q2", "question_vi": "Tại sao thiên thạch được ví như báu vật nghiên cứu?", "options_vi": ["Lưu giữ vật chất sơ khai thuở hệ Mặt Trời hình thành", "Làm đồ trang sức", "Có thể ăn được"], "answer": 0, "explanation_vi": "Lưu giữ thông tin nguyên sơ của hệ Mặt Trời cách đây 4,5 tỷ năm."},
            {"id": "q3", "question_vi": "Cổ nhân thời xưa thường dùng thiên thạch sắt vào việc gì?", "options_vi": ["Rèn kiếm báu sắc bén", "Xây nhà", "Làm nồi nấu ăn"], "answer": 0, "explanation_vi": "Dùng rèn vũ khí quý giá trước khi thuật luyện kim phát triển."}
        ]
    })

    # 14. 石油
    stories.append({
        "id": "wanwu_story_014",
        "chapter_no": 14,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 133,
        "book_page_end": 141,
        "page_display": "Trang 133 - 141",
        "title": {"zh": "石油：最富争议的资源", "vi": "Dầu mỏ: Nguồn tài nguyên tranh cãi nhất"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🛢️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 133 - 141 · Khám phá 'vàng đen' của nền kinh tế hiện đại: từ nguồn gốc hữu cơ và vô cơ đến vai trò huyết mạch công nghiệp toàn cầu.",
        "sentences_data": [
            ("石油被誉为现代工业的“黑色黄金”，是驱动现代社会运转的最重要能源血液。",
             "Shíyóu bèi yùwéi xiàndài gōngyè de “hēisè huángjīn”, shì qūdòng xiàndài shèhuì yùnzhuǎn de zuì zhòngyào néngyuán xuèyè.",
             "Dầu mỏ được xưng tụng là 'vàng đen', là mạch máu năng lượng tối quan trọng của kinh tế thế giới."),
            ("北宋科学家沈括在《梦溪笔谈》中最早正式提出了“石油”这一名称，并预言此物大行于世。",
             "Běisòng kēxuéjiā Shěn Kuò zài “Mèngxī Bǐtán” zhōng zuìzǎo zhèngshì tíchū le “shíyóu” zhè yí míngchēng, bìng yùyán cǐ wù dà xíng yú shì.",
             "Nhà khoa học Thẩm Quát thời Bắc Tống lần đầu dùng tên 'Thạch du' và tiên tri nó sẽ phổ biến thiên hạ."),
            ("关于石油的成因，主流学说认为是由数亿年前的古代海洋浮游生物和藻类遗骸沉积变质形成的。",
             "Guānyú shíyóu de chéngyīn, zhǔliú xuéshuō rènwéi shì yóu shù yì nián qián de gǔdài hǎiyáng fúyóu shēngwù hé zǎolèi yíhái chénjī biànzhì xíngchéng de.",
             "Thuyết chủ lưu cho rằng dầu mỏ hình thành từ xác sinh vật phù du và tảo biển chôn vùi hàng triệu năm."),
            ("从汽车燃油、飞机航油，到我们日常使用的塑料、合成纤维甚至药物，石油制品无处不在。",
             "Cóng qìchē rányóu, fēijī hángyóu, dào wǒmen rìcháng shǐyòng de sùliào, héchéng xiānwéi shènzhì yàowù, shíyóu zhìpǐn wúchù-bùzài.",
             "Từ xăng dầu xe cộ, nhựa, sợi vải tổng hợp đến dược phẩm, chế phẩm dầu mỏ hiện diện khắp mọi nơi."),
            ("合理利用并积极开发绿色清洁替代能源，是人类社会迈向可持续发展的重要课题。",
             "Hélǐ lìyòng bìng jījí kāifā lǜsè qīngjié tìdài néngyuán, shì rénlèi shèhuì màixiàng kě-chíxù fāzhǎn de zhòngyào kètí.",
             "Khai thác hợp lý và chuyển đổi sang năng lượng xanh là bài toán trọng yếu của phát triển bền vững.")
        ],
        "preferred_spotlight": ["社会", "重要", "科学", "影响"],
        "quiz": [
            {"id": "q1", "question_vi": "Ai là người đầu tiên đặt ra danh xưng 'Thạch Du' (Dầu mỏ)?", "options_vi": ["Thẩm Quát (沈括) trong Mộng Khê Bút Đàm", "Lý Bạch", "Trương Hành"], "answer": 0, "explanation_vi": "Nhà khoa học Bắc Tống Thẩm Quát ghi lại trong sách Mộng Khê Bút Đàm."},
            {"id": "q2", "question_vi": "Theo thuyết sinh vật, dầu mỏ bắt nguồn từ đâu?", "options_vi": ["Xác sinh vật biển và tảo cổ đại lắng đọng", "Từ lá cây rụng", "Từ đất sét tự nhiên"], "answer": 0, "explanation_vi": "Từ sinh vật phù du và tảo biển chôn vùi dưới đáy sâu qua triệu năm."},
            {"id": "q3", "question_vi": "Dầu mỏ được mệnh danh là gì trong ngành công nghiệp?", "options_vi": ["Vàng đen (黑色黄金)", "Vàng trắng", "Kim cương xanh"], "answer": 0, "explanation_vi": "Dầu mỏ được coi là vàng đen của nền kinh tế."}
        ]
    })

    # 15. 科学实验
    stories.append({
        "id": "wanwu_story_015",
        "chapter_no": 15,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 141,
        "book_page_end": 152,
        "page_display": "Trang 141 - 152",
        "title": {"zh": "科学实验：大胆且“疯狂”", "vi": "Thí nghiệm khoa học: Táo bạo và điên rồ"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🔬",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 141 - 152 · Những thí nghiệm táo bạo trong lịch sử: từ khám phá điện của Franklin đến tinh thần dấn thân vì chân lý khoa học.",
        "sentences_data": [
            ("人类认识世界、战胜未知的每一步飞跃，都离不开无数勇敢而大胆的科学实验。",
             "Rénlèi rènshi shìjiè, zhànshèng wèizhī de měi yí bù fēiyuè, dōu lí bù kāi wúshù yǒnggǎn ér dàdǎn de kēxué shíyàn.",
             "Mỗi bước tiến chinh phục thế giới của nhân loại đều gắn liền với những thí nghiệm khoa học quả cảm."),
            ("一七五二年，富兰克林冒着生命危险在雷雨天放风筝，成功证实了雷电就是天上的电荷。",
             "Yī-qī-wǔ-èr nián, Fùlánkèlín màozhe shēngmìng wēixiǎn zài léiyǔ tiān fàng fēngzheng, chénggōng zhèngshí le léidiàn jiù shì tiānshàng de diànhè.",
             "Năm 1752, Franklin mạo hiểm thả diều trong mưa dông, chứng minh sấm sét chính là hiện tượng điện."),
            ("居里夫人为了提炼出纯净的放射性元素镭，常年在简陋破旧的工棚里日夜艰苦劳作。",
             "Jūlǐ fūrén wèile tíliàn chū chúnjìng de fàngshèxìng yuánsù léi, chángnián zài jiǎnlòu pòjiù de gōngpéng lǐ rìyè jiānkǔ láozuò.",
             "Bà Curie để chiết xuất radium đã miệt mài trong nhà kho tồi tàn bất chấp phóng xạ độc hại."),
            ("有些实验在当时看来匪夷所思甚至疯狂，但正是这种打破常规的探索推动了文明的进步。",
             "Yǒuxiē shíyàn zài dāngshí kànlái fěiyí-suǒsī shènzhì fēngkuáng, dàn zhèng shì zhè zhǒng dǎpò chángguī de tànsuǒ tuīdòng le wénmíng de jìnbù.",
             "Có những thí nghiệm thuở ấy bị coi là điên rồ, nhưng chính sự bứt phá ấy đã thúc đẩy văn minh tiến bước."),
            ("今天，现代科学在保持大胆探索精神的同时，也更加注重科学伦理与对生命的敬畏。",
             "Jīntiān, xiàndài kēxué zài bǎochí dàdǎn tànsuǒ jīngshén de tóngshí, yě gèngjiā zhùzhòng kēxué lúnlǐ yǔ duì shēngmìng de jìngwèi.",
             "Ngày nay, khoa học vừa đề cao tinh thần khám phá, vừa tuân thủ đạo đức và trân trọng sự sống.")
        ],
        "preferred_spotlight": ["科学", "实验", "危险", "成功"],
        "quiz": [
            {"id": "q1", "question_vi": "Franklin thả diều trong mưa dông để chứng minh điều gì?", "options_vi": ["Sấm sét chính là dòng điện tự nhiên", "Gió mùa hè rất mạnh", "Diều bay cao nhất"], "answer": 0, "explanation_vi": "Chứng minh sấm sét tự nhiên cùng bản chất với dòng điện."},
            {"id": "q2", "question_vi": "Bà Curie đã kiên trì nghiên cứu tìm ra nguyên tố nào?", "options_vi": ["Nguyên tố phóng xạ Radium", "Vàng ròng", "Sắt"], "answer": 0, "explanation_vi": "Chiết xuất radium và polonium mở ra kỷ nguyên hạt nhân."},
            {"id": "q3", "question_vi": "Thí nghiệm khoa học ngày nay cần kết hợp với yếu tố nào?", "options_vi": ["Đạo đức khoa học và tôn trọng sự sống", "Chỉ cần nhanh chóng", "Không cần quy tắc"], "answer": 0, "explanation_vi": "Cần gắn liền với luân lý đạo đức và an toàn sinh học."}
        ]
    })

    # 16. 婴儿喂养
    stories.append({
        "id": "wanwu_story_016",
        "chapter_no": 16,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 152,
        "book_page_end": 163,
        "page_display": "Trang 152 - 163",
        "title": {"zh": "婴儿喂养：母亲与乳母之争", "vi": "Nuôi con bằng sữa: Cuộc chiến mẹ ruột và nhũ mẫu"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🍼",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 152 - 163 · Lịch sử nuôi dạy trẻ sơ sinh: từ chế độ vú nuôi trong hoàng gia cổ đại đến khoa học dinh dưỡng sữa mẹ hiện đại.",
        "sentences_data": [
            ("婴儿喂养不仅关系到每个家庭的幸福，更是一部折射人类社会阶层变迁的文化史。",
             "Yīng'ér wèiyǎng bùjǐn guānxì dào měi gè jiātíng de xìngfú, gèng shì yì bù zhéshè rénlèi shèhuì jiēcéng biànqiān de wénhuàshǐ.",
             "Nuôi nấng trẻ thơ không chỉ là hạnh phúc gia đình, mà còn là trang sử văn hóa về các giai tầng xã hội."),
            ("在古代王公贵族家庭中，生下婴儿后雇佣健康的乳母哺乳，曾是一种极为普遍的社会风尚。",
             "Zài gǔdài wánggōng guìzú jiātíng zhōng, shēng xià yīng'ér hòu gùyōng jiànkāng de rǔmǔ bǔrǔ, céng shì yì zhǒng jíwéi pǔbiàn de shèhuì fēngshàng.",
             "Trong giới quý tộc xưa, thuê nhũ mẫu khỏe mạnh nuôi con là tập quán hết sức phổ biến."),
            ("直到近代医学与解剖学的成熟，医生们才深刻认识到初乳中富含各种不可替代的抗体与免疫成分。",
             "Zhídào jìndài yīxué yǔ jiěpǒuxué de chéngshú, yīshēng men cái shēnkè rènshi dào chūrǔ zhōng fùhán gèzhǒng bùkě tìdài de kàngtǐ yǔ miǎnyì chéngfèn.",
             "Đến thời y học cận đại, bác sĩ mới chứng minh sữa mẹ dồi dào kháng thể miễn dịch tự nhiên quý giá."),
            ("母亲亲自母乳喂养不仅能为新生儿提供最佳营养，更能建立起母子之间不可割舍的情感纽带。",
             "Mǔqīn qīnzì mǔrǔ wèiyǎng bùjǐn néng wèi xīnshēng'ér tígōng zuì jiā yíngyǎng, gèng néng jiànlì qǐ mǔ-zǐ zhījiān bùkě gēshě de qínggǎn niǔdài.",
             "Người mẹ tự nuôi con bằng sữa mẹ mang lại dưỡng chất tốt nhất và gắn kết tình mẫu tử thiêng liêng."),
            ("今天，世界卫生组织大力倡导母乳喂养，让每一个新生命都能在最自然健康的母爱中茁壮成长。",
             "Jīntiān, Shìjiè Wèishēng Zǔzhī dàlì chàngdǎo mǔrǔ wèiyǎng, ràng měi yí gè xīn shēngmìng dōu néng zài zuì zìrán jiànkāng de mǔ'ài zhōng zhuózhuàng chéngzhǎng.",
             "Hiện nay, WHO khuyến khích nuôi con bằng sữa mẹ để mỗi đứa trẻ lớn lên trong nguồn dưỡng chất an lành nhất.")
        ],
        "preferred_spotlight": ["健康", "营养", "社会", "自然"],
        "quiz": [
            {"id": "q1", "question_vi": "Trong giới quý tộc thời xưa, việc thuê vú nuôi (nhũ mẫu) là biểu hiện của điều gì?",
             "options_vi": ["Một tập tục phân tầng xã hội thịnh hành", "Bắt buộc theo luật", "Không ai muốn làm"], "answer": 0, "explanation_vi": "Thuê vú nuôi từng là thói quen phổ biến của tầng lớp quyền quý."},
            {"id": "q2", "question_vi": "Khoa học hiện đại chỉ ra sữa mẹ có ưu điểm gì vượt trội?",
             "options_vi": ["Chứa kháng thể tự nhiên và dưỡng chất hoàn hảo", "Để được rất lâu", "Có vị ngọt nhân tạo"], "answer": 0, "explanation_vi": "Sữa mẹ chứa kháng thể tự nhiên quý giá bảo vệ trẻ sơ sinh."},
            {"id": "q3", "question_vi": "Nuôi con bằng sữa mẹ giúp ích gì cho tình cảm mẹ con?",
             "options_vi": ["Tạo sợi dây gắn kết tâm lý sâu sắc thiêng liêng", "Không có tác dụng gì", "Chỉ tốn thời gian"], "answer": 0, "explanation_vi": "Tăng cường liên kết tình cảm mật thiết giữa mẹ và bé."}
        ]
    })

    # 17. 征婚广告
    stories.append({
        "id": "wanwu_story_017",
        "chapter_no": 17,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 163,
        "book_page_end": 174,
        "page_display": "Trang 163 - 174",
        "title": {"zh": "征婚广告：社会发展的一面镜子", "vi": "Quảng cáo kết hôn: Tấm gương phản chiếu xã hội"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "💌",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 163 - 174 · Lịch sử quảng cáo tìm bạn trăm năm: từ 'lời mai mối' trên báo giấy thế kỷ 17 đến thời kỳ mai mối số hiện đại.",
        "sentences_data": [
            ("从古代“父母之命、媒妁之言”到现代自主寻找幸福，征婚广告是社会观念变迁的生动镜子。",
             "Cóng gǔdài “fùmǔ zhī mìng, méishuò zhī yán” dào xiàndài zìzhǔ xúnzhǎo xìngfú, zhēnghūn guǎnggào shì shèhuì guānniàn biànqiān de shēngdòng jìngzi.",
             "Từ 'cha mẹ đặt đâu con ngồi đấy' đến tự do tìm hạnh phúc, quảng cáo tìm bạn đời là tấm gương phản chiếu xã hội."),
            ("一六九五年，英国的一家农业报刊上刊登了世界上第一则征婚广告，引发了轰动。",
             "Yī-liù-jiǔ-wǔ nián, Yīngguó de yì jiā nóngyè bàokān shàng kāndēng le shìjiè shàng dì-yī zé zhēnghūn guǎnggào, yǐnfā le hōngdòng.",
             "Năm 1695, một tờ báo nông nghiệp nước Anh đăng mẩu quảng cáo kén duyên đầu tiên trên thế giới."),
            ("近代清末民初，随着新思想的传播，中国报纸上也开始大量出现追求自由恋爱的征婚启事。",
             "Jìndài Qīngmò Mínchū, suízhe xīn sīxiǎng de chuánbō, Zhōngguó bàozhǐ shàng yě kāishǐ dàliàng chūxiàn zhuīqiú zìyóu liàn'ài de zhēnghūn qǐshì.",
             "Cuối thời Thanh đầu thời Dân quốc, báo chí xuất hiện nhiều mục tìm bạn trăm năm hướng tới tự do hôn nhân."),
            ("人们在广告中写下自己的才学、志趣与择偶期望，打破了封建门第观念的束缚。",
             "Rénmen zài guǎnggào zhōng xiěxià zìjǐ de cáixué, zhìqù yǔ zé'ǒu qīwàng, dǎpò le fēngjiàn méndì guānniàn de shùfù.",
             "Người trẻ viết rõ tài năng, sở thích và tiêu chuẩn bạn đời, phá tan rào cản 'môn đăng hộ đối' phong kiến."),
            ("今天，互联网和社交媒体让寻找伴侣更加便捷，但人们对真诚爱情的追求始终未曾改变。",
             "Jīntiān, hùliánwǎng hé shèjiāo méitǐ ràng xúnzhǎo bànlǚ gèngjiā biànjié, dàn rénmen duì zhēnchéng àiqíng de zhuīqiú shǐzhōng wèicéng gǎibiàn.",
             "Internet giúp việc tìm kiếm bạn đời tiện lợi hơn, nhưng khao khát tình yêu chân thành thì bất biến.")
        ],
        "preferred_spotlight": ["社会", "广告", "幸福", "改变"],
        "quiz": [
            {"id": "q1", "question_vi": "Quảng cáo kết hôn đầu tiên xuất hiện khi nào?", "options_vi": ["Năm 1695 tại nước Anh", "Thời cổ đại La Mã", "Mới có từ năm 2000"], "answer": 0, "explanation_vi": "Xuất hiện năm 1695 trên báo chí nước Anh."},
            {"id": "q2", "question_vi": "Tại Trung Quốc, quảng cáo tìm bạn đời bùng nổ vào giai đoạn nào?",
             "options_vi": ["Cuối thời Thanh - đầu thời Dân quốc với trào lưu tự do hôn nhân", "Thời nhà Đường", "Thời nhà Tống"], "answer": 0, "explanation_vi": "Bùng nổ khi tân văn hóa và tư tưởng tự do yêu đương lan rộng."},
            {"id": "q3", "question_vi": "Mục đích lớn nhất của quảng cáo kết hôn thời cận đại là gì?",
             "options_vi": ["Phá bỏ ràng buộc môn đăng hộ đối, tìm người tâm đầu ý hợp", "Khoe khoang của cải", "Tìm người làm công"], "answer": 0, "explanation_vi": "Chủ động tìm kiếm hạnh phúc theo sở thích và lý tưởng cá nhân."}
        ]
    })

    # 18. 厕所
    stories.append({
        "id": "wanwu_story_018",
        "chapter_no": 18,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 174,
        "book_page_end": 187,
        "page_display": "Trang 174 - 187",
        "title": {"zh": "厕所：折射文明进程的一个侧影", "vi": "Nhà vệ sinh: Góc khuất phản chiếu tiến trình văn minh"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🚽",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 174 - 187 · Lịch sử vệ sinh công cộng: từ rãnh nước ngầm La Mã cổ đại đến chiếc bồn cầu xả nước thay đổi sức khỏe nhân loại.",
        "sentences_data": [
            ("历史学家常说，人类文明的真正成熟，往往是从第一个公共卫生设施的建立开始的。",
             "Lìshǐ xuéjiā cháng shuō, rénlèi wénmíng de zhēnzhèng chéngshú, wǎngwǎng shì cóng dì-yī gè gōnggòng wèishēng shèshī de jiànlì kāishǐ de.",
             "Các sử gia nhận định sự trưởng thành của văn minh thường khởi nguồn từ công trình vệ sinh công cộng đầu tiên."),
            ("古罗马时期就修建了宏伟的公共排水系统，但现代意义上的抽水马桶直到十六世纪末才被发明。",
             "Gǔ Luómǎ shíqī jiù xiūjiàn le hóngwěi de gōnggòng páishuǐ xìtǒng, dàn xiàndài yìyì shàng de chōushuǐ mǎtǒng zhídào shíliù shìjì mò cái bèi fāmíng.",
             "Thời La Mã đã có hệ thống cống ngầm, nhưng bồn cầu xả nước hiện đại đến cuối thế kỷ 16 mới ra đời."),
            ("一五九六年，英国爵士哈灵顿为伊丽莎白一世女王发明了第一座带水箱与冲水阀门的马桶。",
             "Yī-wǔ-jiǔ-liù nián, Yīngguó juéshì Hālíngdùn wèi Yīlìshābái Yīshì nǚwáng fāmíng le dì-yī zuò dài shuǐxiāng yǔ chōngshuǐ fámén de mǎtǒng.",
             "Năm 1596, Sir Harrington chế tạo bồn cầu có két xả nước đầu tiên cho Nữ hoàng Elizabeth I."),
            ("冲水马桶与现代下水道网络的普及，彻底阻断了霍乱等严重传染病的滋生传播，拯救了数以亿计的生命。",
             "Chōushuǐ mǎtǒng yǔ xiàndài xiàshuǐdào wǎngluò de pǔjí, chèdǐ zǔduàn le huòluàn děng yánzhòng chuánrǎnbìng de zīshēng chuándì, zhèngjiù le shù yǐ yì jì de shēngmìng.",
             "Bồn cầu xả nước và cống ngầm hiện đại đã dập tắt dịch tả và các bệnh truyền nhiễm, cứu sống hàng trăm triệu người."),
            ("今天，干净整洁的卫生间已经成为衡量一个国家公共健康与社会文明程度的重要标志。",
             "Jīntiān, gānjìng zhěngjié de wèishēngjiān yǐjīng chéngwéi héngliáng yí gè guójiā gōnggòng jiànkāng yǔ shèhuì wénmíng chéngdù de zhòngyào biāozhì.",
             "Ngày nay, nhà vệ sinh sạch sẽ là thước đo chuẩn xác về mức độ văn minh và sức khỏe cộng đồng của mỗi quốc gia.")
        ],
        "preferred_spotlight": ["历史", "发明", "健康", "社会"],
        "quiz": [
            {"id": "q1", "question_vi": "Ai là người chế tạo chiếc bồn cầu xả nước đầu tiên năm 1596?",
             "options_vi": ["Sir John Harrington cho Nữ hoàng Elizabeth I", "James Watt", "Newton"], "answer": 0, "explanation_vi": "Harrington phát minh bồn cầu có két xả nước dâng lên Nữ hoàng Anh."},
            {"id": "q2", "question_vi": "Hệ thống bồn cầu xả nước và cống ngầm có công lao vĩ đại nào?",
             "options_vi": ["Chặn đứng dịch tả và các bệnh lây nhiễm, cứu sống hàng trăm triệu người", "Giúp tiết kiệm nước", "Làm cảnh đẹp thành phố"], "answer": 0, "explanation_vi": "Ngăn chặn dịch bệnh ô nhiễm nguồn nước hiệu quả nhất trong lịch sử."},
            {"id": "q3", "question_vi": "Nhà vệ sinh sạch sẽ hiện nay phản ánh điều gì?",
             "options_vi": ["Trình độ văn minh và mức độ chăm sóc sức khỏe cộng đồng", "Sự xa hoa lãng phí", "Chỉ phục vụ khách du lịch"], "answer": 0, "explanation_vi": "Là thước đo chuẩn mực về văn minh và vệ sinh của một xã hội."}
        ]
    })

    # 19. 隐私权
    stories.append({
        "id": "wanwu_story_019",
        "chapter_no": 19,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 187,
        "book_page_end": 197,
        "page_display": "Trang 187 - 197",
        "title": {"zh": "隐私权：从无到有不过百年", "vi": "Quyền riêng tư: Từ không đến có chưa đầy trăm năm"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🔒",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 187 - 197 · Lịch sử quyền riêng tư: từ bài báo pháp lý kinh điển năm 1890 của Warren & Brandeis đến kỷ nguyên bảo vệ dữ liệu số.",
        "sentences_data": [
            ("不偷看他人日记、不偷拆私人信件，今天已被公认为每个人理应受到保护的基本权利。",
             "Bù tōukàn tārén rìjì, bù tōuchāi sīrén xìnjiàn, jīntiān yǐ bèi gōngrèn wéi měi gè rén lǐyīng shòudào bǎohù de jīběn quánlì.",
             "Không xem lén nhật ký, không bóc trộm thư từ, ngày nay được công nhận là quyền riêng tư cơ bản của mỗi người."),
            ("然而在人类漫长的历史中，“隐私权”作为一个法学概念出现其实不过短短一百多年。",
             "Rán'ér zài rénlèi màncháng de lìshǐ zhōng, “yǐnsīquán” zuòwéi yí gè fǎxué gàiniàn chūxiàn qíshí búguò duǎnduǎn yìbǎi duō nián.",
             "Thế nhưng trong dòng chảy lịch sử, khái niệm pháp lý quyền riêng tư mới ra đời hơn một trăm năm."),
            ("一八九零年，两位美国年轻法学家沃伦与布兰代斯发表了著名的《论隐私权》论文。",
             "Yī-bā-jiǔ-líng nián, liǎng wèi Měiguó niánqīng fǎxuéjiā Wòlún yǔ Bùlándàisī fābiǎo le zhùmíng de “Lùn Yǐnsīquán” lùnwén.",
             "Năm 1890, hai học giả luật trẻ Warren và Brandeis xuất bản bài luận kinh điển Luận về quyền riêng tư."),
            ("当时便携相机的发明导致报纸记者滥用偷拍，促使他们提出了“独处而不受打扰的权利”。",
             "Dāngshí biànxié xiàngjī de fāmíng dǎozhì bàozhǐ jìzhě lànyòng tōupāi, cùshǐ tāmen tíchū le “dúchǔ ér bú shòu dǎrǎo de quánlì”.",
             "Sự ra đời của máy ảnh cầm tay khiến phóng viên chụp lén tràn lan, thúc đẩy họ nêu quyền được yên tĩnh một mình."),
            ("在当今大数据与人工智能时代，保护个人数字信息隐私已成为全球公民社会的最重大挑战之一。",
             "Zài dāngjīn dà-shùjù yǔ réngōng-zhìnéng shídài, bǎohù gèrén shùzì xìnxī yǐnsī yǐ chéngwéi quánqiú gōngmín shèhuì de zuì zhòngdà tiǎozhàn zhī yī.",
             "Trong kỷ nguyên dữ liệu lớn và AI, bảo vệ quyền riêng tư số đang là thách thức hàng đầu của toàn nhân loại.")
        ],
        "preferred_spotlight": ["保护", "权利", "时代", "社会"],
        "quiz": [
            {"id": "q1", "question_vi": "Khái niệm quyền riêng tư ra đời cách đây khoảng bao lâu?",
             "options_vi": ["Hơn 100 năm trước (năm 1890)", "Từ thời cổ đại Hy Lạp", "Mới có từ năm 2010"], "answer": 0, "explanation_vi": "Bài luận mở đường về quyền riêng tư được xuất bản năm 1890."},
            {"id": "q2", "question_vi": "Sự phát minh nào vào cuối thế kỷ 19 đã thúc đẩy sự ra đời của quyền riêng tư?",
             "options_vi": ["Máy ảnh cầm tay gọn nhẹ gây nạn chụp lén của báo chí", "Điện thoại thông minh", "Máy in báo"], "answer": 0, "explanation_vi": "Máy ảnh nhỏ gọn giúp cánh săn ảnh chụp trộm đời tư người khác."},
            {"id": "q3", "question_vi": "Định nghĩa kinh điển nhất của Brandeis về quyền riêng tư là gì?",
             "options_vi": ["Quyền được yên tĩnh một mình mà không bị quấy rầy", "Quyền có nhiều tiền", "Quyền được giấu đồ đạc"], "answer": 0, "explanation_vi": "The right to be let alone - quyền được để yên mà không bị dòm ngó."}
        ]
    })

    # 20. 航班安检
    stories.append({
        "id": "wanwu_story_020",
        "chapter_no": 20,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 197,
        "book_page_end": 209,
        "page_display": "Trang 197 - 209",
        "title": {"zh": "航班安检：血泪教训倒逼而生", "vi": "An ninh hàng không: Sinh ra từ bài học xương máu"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🛫",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 197 - 209 · Lịch sử an ninh sân bay: từ thời kỳ lên máy bay thoải mái như xe buýt đến hệ thống soi quét nhiều lớp bảo vệ bầu trời.",
        "sentences_data": [
            ("今天乘坐飞机时严格的安检流程，并非一开始就存在，而是由一系列血泪教训倒逼出来的。",
             "Jīntiān chéngzuò fēijī shí yángé de ānjiǎn liúchéng, bìngfēi yì kāishǐ jiù cúnzài, érshì yóu yí xìliè xuèlèi jiàoxun dǎobī chūlái de.",
             "Quy trình kiểm tra an ninh hàng không nghiêm ngặt ngày nay được đúc kết từ nhiều bài học xương máu."),
            ("在民航业发展初期，旅客登机就像乘坐火车或巴士一样随意，行李甚至不需要开箱检查。",
             "Zài mínhángyè fāzhǎn chūqī, lǚkè dēngjī jiù xiàng chéngzuò huǒchē huò bāshì yíyàng suíyì, xíngli shènzhì bù xūyào kāixiāng jiǎnchá.",
             "Thuở sơ khai của hàng không, hành khách lên phi cơ thoải mái như lên xe buýt, không cần soi chiếu hành lý."),
            ("二十世纪六七十年代，全球劫机事件频繁发生，促使各大国际机场安装了金属探测门与行李X光机。",
             "Èrshí shìjì liù-qīshí niándài, quánqiú jiéjī shìjiàn pínfán fāshēng, cùshǐ gè dà guójì jīchǎng ānzhuāng le jīnshǔ tàncèmén yǔ xíngli X-guāng jī.",
             "Thập niên 60-70 thế kỷ 20, nạn không tặc hoành hành buộc các phi trường lắp cổng từ và máy quét X-quang."),
            ("二零零一年“九一一”恐怖袭击后，全球航空安全标准再次升级，连液体、打火机和刀具都受到严格限制。",
             "Èr-líng-líng-yī nián “Jiǔ-Yī-Yī” kǒngbù xíjī hòu, quánqiú hángkōng ānquán biāozhǔn zàicì shēngjí, lián yètǐ, dǎhuǒjī hé dāojù dōu shòudào yángé xiànzhì.",
             "Sau sự kiện 11/9/2001, an ninh sân bay siết chặt tối đa, cấm chất lỏng, bật lửa và dao nhọn lên cabin."),
            ("看似繁琐复杂的安检检查，用最严谨的技术防线默默守护着千万万旅客的生命安全。",
             "Kànsì fánsuǒ fùzá de ānjiǎn jiǎnchá, yòng zuì yánjǐn de jìshù fángxiàn mòmò shǒuhù zhe qiānwànwàn lǚkè de shēngmìng ānquán.",
             "Những khâu kiểm tra tưởng chừng phiền phức ấy là hàng rào công nghệ âm thầm bảo vệ sinh mệnh hàng triệu hành khách.")
        ],
        "preferred_spotlight": ["安全", "检查", "技术", "生命"],
        "quiz": [
            {"id": "q1", "question_vi": "Thời kỳ đầu của ngành hàng không, việc lên máy bay diễn ra thế nào?",
             "options_vi": ["Rất tự do thoải mái như lên xe buýt, không cần soi chiếu", "Phải kiểm tra cả ngày", "Phải mặc đồ bảo hộ"], "answer": 0, "explanation_vi": "Ban đầu hành khách lên máy bay không hề có cửa soi an ninh."},
            {"id": "q2", "question_vi": "Sự kiện nào dẫn đến việc lắp đặt cổng từ và máy chiếu X-quang tại sân bay?",
             "options_vi": ["Làn sóng không tặc cướp máy bay thập niên 60-70", "Mất hành lý thất lạc", "Máy bay bay quá nhanh"], "answer": 0, "explanation_vi": "Làn sóng cướp máy bay buộc các sân bay trang bị máy quét kim loại."},
            {"id": "q3", "question_vi": "Ý nghĩa tối thượng của quy trình an ninh sân bay là gì?",
             "options_vi": ["Bảo đảm tuyệt đối tính mạng của hành khách trên từng chuyến bay", "Làm phiền hành khách", "Bán đồ uống tại sảnh"], "answer": 0, "explanation_vi": "Bảo vệ sinh mạng và an toàn cho phi hành đoàn và hành khách."}
        ]
    })

    # 21. 诺贝尔科学奖
    stories.append({
        "id": "wanwu_story_021",
        "chapter_no": 21,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 209,
        "book_page_end": 219,
        "page_display": "Trang 209 - 219",
        "title": {"zh": "诺贝尔科学奖：获奖是非之争一直存在", "vi": "Giải thưởng Nobel khoa học: Tranh cãi chưa bao giờ dứt"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🏅",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 209 - 219 · Đằng sau tấm huy chương danh giá nhất hành tinh: di chúc của Alfred Nobel và những tranh luận về đóng góp khoa học cá nhân và tập thể.",
        "sentences_data": [
            ("诺贝尔奖被公认为人类科技领域荣誉最高的桂冠，激励着无数科学家攀登知识的高峰。",
             "Nuòbèi'ěr Jiǎng bèi gōngrèn wéi rénlèi kējì lǐngyù róngyù zuì gāo de guìguān, jīlì zhe wúshù kēxuéjiā pāndēng zhīshi de gāofēng.",
             "Giải Nobel được xem là vinh quang tột đỉnh trong khoa học, thôi thúc bao nhà trí thức chinh phục đỉnh cao tri thức."),
            ("发明炸药积累巨额财富的瑞典科学家诺贝尔立下遗嘱，将全部财产设立奖项奖励造福人类的杰出贡献者。",
             "Fāmíng zhàyào jīlěi jù'é cáifù de Ruìdiǎn kēxuéjiā Nuòbèi'ěr lìxià yízhǔ, jiāng quánbù cáichǎn shèlì jiǎngxiàng jiǎnglì zàofú rénlèi de jiéchū gòngxiànzhě.",
             "Nhà sáng chế thuốc nổ Alfred Nobel đã lập di chúc hiến toàn bộ tài sản làm quỹ trao thưởng cho người cống hiến cho nhân loại."),
            ("一九零一年首届诺贝尔奖颁发以来，物理、化学与生理学或医学奖见证了人类重大科学突破。",
             "Yī-jiǔ-líng-yī nián shǒujiè Nuòbèi'ěr Jiǎng bānfā yǐlái, wùlǐ, huàxué yǔ shēnglǐxué huò yīxué jiǎng jiànzhèng le rénlèi zhòngdà kēxué tūpò.",
             "Từ năm 1901 đến nay, các giải Nobel vật lý, hóa học và y học đã chứng kiến những phát kiến đột phá vĩ đại."),
            ("然而由于规定每个奖项单次获奖人数不能超过三人，现代大型科研团队中的署名归属常引发热议。",
             "Rán'ér yóuyú guīdìng měi gè jiǎngxiàng dān cì huòjiǎng rénshù bù néng chāoguò sān rén, xiàndài dàxíng kēyán tuánduì zhōng de shǔmíng guīshǔ cháng yǐnfā rèyì.",
             "Tuy nhiên quy định tối đa 3 người nhận giải mỗi năm thường dấy lên tranh cãi trong các dự án khoa học tập thể lớn."),
            ("无论争议如何，诺贝尔奖所弘扬的探索真理、造福全人类的精神，始终激励着科学世界的步伐。",
             "Wúlùn zhēngyì rúhé, Nuòbèi'ěr Jiǎng suǒ hóngyáng de tànsuǒ zhēnlǐ, zàofú quán rénlèi de jīngshén, shǐzhōng jīlì zhe kēxué shìjiè de bùfá.",
             "Dù có tranh luận, lý tưởng khám phá chân lý và phụng sự nhân loại của giải Nobel luôn thôi thúc khoa học tiến bước.")
        ],
        "preferred_spotlight": ["科学", "重要", "世界", "成功"],
        "quiz": [
            {"id": "q1", "question_vi": "Giải Nobel do ai sáng lập bằng di chúc?", "options_vi": ["Alfred Nobel - nhà phát minh thuốc nổ", "Einstein", "Newton"], "answer": 0, "explanation_vi": "Do nhà hóa học Thụy Điển Alfred Nobel lập di chúc hiến tặng tài sản."},
            {"id": "q2", "question_vi": "Theo quy chế, mỗi giải Nobel khoa học được trao cho tối đa bao nhiêu người mỗi lần?",
             "options_vi": ["Tối đa 3 người", "Tối đa 10 người", "Không giới hạn số người"], "answer": 0, "explanation_vi": "Mỗi giải thưởng được trao cho tối đa không quá 3 cá nhân."},
            {"id": "q3", "question_vi": "Mục đích thiêng liêng nhất của giải Nobel là gì?",
             "options_vi": ["Tôn vinh những cống hiến vĩ đại nhất mang lại lợi ích cho toàn nhân loại", "Để thu hút du lịch Thụy Điển", "Để kiếm tiền"], "answer": 0, "explanation_vi": "Vinh danh những người đem lại lợi ích lớn nhất cho nhân loại."}
        ]
    })

    # 22. 养老金
    stories.append({
        "id": "wanwu_story_022",
        "chapter_no": 22,
        "level": "HSK4",
        "book_volume": 1,
        "book_page_start": 219,
        "book_page_end": 232,
        "page_display": "Trang 219 - 232",
        "title": {"zh": "养老金：缘起互助互济", "vi": "Lương hưu: Bắt nguồn từ tương trợ lẫn nhau"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "👵",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 219 - 232 · Hành trình của quỹ hưu trí: từ các hội ái hữu tương trợ thời công nghiệp hóa đến trụ cột an sinh xã hội hiện đại.",
        "sentences_data": [
            ("“老有所养”自古以来就是人类社会对安宁尊严晚年生活的美好期盼。",
             "“Lǎo yǒu suǒ yǎng” zìgǔ yǐlái jiù shì rénlèi shèhuì duì ānníng zūnyán wǎnnián shēnghuó de měihǎo qīpàn.",
             "'Tuổi già được phụng dưỡng' từ xưa tới nay luôn là khát vọng về cuộc sống lúc xế chiều bình yên và tôn nghiêm."),
            ("工业革命以前，老人晚年的照料主要完全依靠家族内部的子女赡养。",
             "Gōngyè gémìng yǐqián, lǎorén wǎnnián de zhàoliào zhǔyào wánquán yīkào jiāzú nèibù de zǐnǚ shànyǎng.",
             "Trước cách mạng công nghiệp, việc chăm sóc người già hoàn toàn trông cậy vào con cháu trong gia tộc."),
            ("十九世纪末，德国铁血宰相俾斯麦为了稳定社会秩序，创立了世界上第一个国家法定的养老金保险制度。",
             "Shíjiǔ shìjì mò, Déguó tiěxuè zǎixiàng Bǐsīmài wèile wěndìng shèhuì zhìxù, chuànglì le shìjiè shàng dì-yī gè guójiā fǎdìng de yǎnglǎojīn bǎoxiǎn zhìdù.",
             "Cuối thế kỷ 19, thủ tướng Đức Bismarck đã sáng lập hệ thống bảo hiểm hưu trí nhà nước đầu tiên trên thế giới."),
            ("这种由国家、企业雇主与个人共同缴纳保险费的模式，迅速成为现代福利国家的基石。",
             "Zhè zhǒng yóu guójiā, qǐyè gùzhǔ yǔ gèrén gòngtóng jiǎonà bǎoxiǎnfèi de móshì, xùnsù chéngwéi xiàndài fúlì guójiā de jīshí.",
             "Mô hình cùng đóng góp giữa Nhà nước, người sử dụng lao động và người lao động đã trở thành nền móng an sinh."),
            ("健全的可持续养老金体系，如同一张坚实的社会安全网，为每位辛勤工作的人撑起温暖的晚年天空。",
             "Jiànquán de kě-chíxù yǎnglǎojīn tǐxì, rútóng yì zhāng jiānshí de shèhuì ānquánwǎng, wèi měi wèi xīnqín gōngzuò de rén chēng qǐ wēnxīn de wǎnnián tiānkōng.",
             "Hệ thống hưu trí bền vững như tấm lưới an sinh vững chãi, nâng đỡ tuổi già ấm áp cho những người cả đời lao động.")
        ],
        "preferred_spotlight": ["社会", "国家", "生活", "工作"],
        "quiz": [
            {"id": "q1", "question_vi": "Quốc gia nào ban hành đạo luật bảo hiểm hưu trí nhà nước đầu tiên trên thế giới?",
             "options_vi": ["Nước Đức dưới thời Thủ tướng Bismarck", "Nước Mỹ", "Nước Anh"], "answer": 0, "explanation_vi": "Nước Đức ban hành luật bảo hiểm hưu trí xã hội đầu tiên vào cuối thế kỷ 19."},
            {"id": "q2", "question_vi": "Mô hình quỹ hưu trí hiện đại dựa trên sự đóng góp của các bên nào?",
             "options_vi": ["Nhà nước, doanh nghiệp và cá nhân người lao động", "Chỉ cá nhân tự đóng", "Chỉ người thân chu cấp"], "answer": 0, "explanation_vi": "Ba trụ cột: Nhà nước, doanh nghiệp sử dụng lao động và cá nhân đóng góp."},
            {"id": "q3", "question_vi": "Ý nghĩa lớn nhất của hệ thống hưu trí là gì?",
             "options_vi": ["Bảo đảm sự độc lập tài chính và cuộc sống an yên khi về già", "Khuyến khích nghỉ việc sớm", "Thay thế con cháu"], "answer": 0, "explanation_vi": "Bảo đảm an sinh, tôn nghiêm và sự tự chủ tài chính cho người cao tuổi."}
        ]
    })

    return stories


def main():
    stories = get_volume1_stories()
    manifest_path = READINGS_DIR / "manifest.json"

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    # Clean existing volume 1 stories from manifest
    vol1_ids = {s["id"] for s in stories}
    manifest = [m for m in manifest if m["id"] not in vol1_ids]

    new_vol1_entries = []
    print(f"Building {len(stories)} stories for Volume 1...")

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
        img_rel = extract_illustration(sdata["book_page_start"], sdata["book_page_end"], sid)

        story_obj = {
            "id": sid,
            "chapter_no": sdata["chapter_no"],
            "level": sdata["level"],
            "series": "wanwu",
            "book_volume": sdata["book_volume"],
            "book_page_start": sdata["book_page_start"],
            "book_page_end": sdata["book_page_end"],
            "page_display": sdata["page_display"],
            "title": sdata["title"],
            "topic": sdata["topic"],
            "topic_vi": sdata["topic_vi"],
            "icon": sdata["icon"],
            "cover_image": img_rel,
            "illustration": img_rel,
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

        print(f"[+] {sid} ({sdata['title']['zh']}) - {sdata['page_display']} - 100% Pinyin guaranteed.")

        new_vol1_entries.append({
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
            "cover_image": img_rel,
            "illustration": img_rel,
            "estimatedMinutes": sdata["estimatedMinutes"],
            "description_vi": sdata["description_vi"],
            "sentence_count": len(sentences),
            "sentences_count": len(sentences),
            "spotlight_count": len(spotlight),
            "words_count": sum(len(s["tokens"]) for s in sentences),
            "file": f"database/readings/hsk4/{sid}.json",
            "path": f"database/readings/hsk4/{sid}.json"
        })

    # Sort all wanwu stories strictly by book page
    existing_wanwu = [m for m in manifest if m.get("series") == "wanwu"]
    non_wanwu = [m for m in manifest if m.get("series") != "wanwu"]

    all_wanwu = new_vol1_entries + existing_wanwu
    all_wanwu.sort(key=lambda x: x.get("book_page_start", 0))

    final_manifest = all_wanwu + non_wanwu

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(final_manifest, f, ensure_ascii=False, indent=2)

    print(f"\n[✓] Finished building Volume 1 ({len(stories)} stories). Manifest now has {len(all_wanwu)} Wanwu stories.")


if __name__ == "__main__":
    main()
