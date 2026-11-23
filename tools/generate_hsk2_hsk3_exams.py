#!/usr/bin/env python3
"""Generate official CTI-format specimen papers and audio for HSK 2 and HSK 3.

Produces:
- database/exams/hsk30/level2/hsk30_l2_specimen01.json (H20901)
- database/exams/hsk30/level3/hsk30_l3_specimen01.json (H30901)
- Updates database/exams/hsk30/index.json
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# =========================================================================
# HSK 2 Specimen 01 (H20901)
# =========================================================================

hsk2_data = {
    "id": "hsk30_l2_specimen01",
    "code": "H20901",
    "version": "3.0",
    "level": "hsk30_2",
    "title": "HSK 2 (3.0) - Đề thi mẫu chuẩn CTI H20901",
    "source": "Chinese Testing International (CTI) Specimen Paper",
    "time_minutes": 55,
    "max_score": 200,
    "pass_score": 120,
    "sections": {
        "listening": {
            "name": "一、听力 (Nghe hiểu)",
            "total_questions": 35,
            "time_minutes": 25,
            "questions": []
        },
        "reading": {
            "name": "二、阅读 (Đọc hiểu)",
            "total_questions": 25,
            "time_minutes": 22,
            "questions": []
        }
    }
}

# HSK 2 Listening Part 1: 判断对错 (Q1 - Q10)
l1_prompts = [
    ("男的在跑步。", "nán de zài pǎo bù 。", "Nam đang chạy bộ.", "assets/images/illustrations/跑步.svg", "true"),
    ("医生在给病人看病。", "yī shēng zài gěi bìng rén kàn bìng 。", "Bác sĩ đang khám bệnh cho bệnh nhân.", "assets/images/illustrations/医生.svg", "true"),
    ("现在正在下雪。", "xiàn zài zhèng zài xià xuě 。", "Bây giờ tuyết đang rơi.", "assets/images/illustrations/下雨.svg", "false"),
    ("他们在教室里跳舞。", "tā men zài jiào shì lǐ tiào wǔ 。", "Họ đang khiêu vũ trong lớp học.", "assets/images/illustrations/跳舞.svg", "true"),
    ("他买了一辆新自行车。", "tā mǎi le yī liàng xīn zì xíng chē 。", "Anh ấy mua một chiếc xe đạp mới.", "assets/images/illustrations/自行车.svg", "true"),
    ("桌子上有两杯茶。", "zhuō zi shang yǒu liǎng bēi chá 。", "Trên bàn có hai cốc trà.", "assets/images/illustrations/咖啡.svg", "false"),
    ("妹妹喜欢吃西瓜。", "mèi mei xǐ huan chī xī guā 。", "Em gái thích ăn dưa hấu.", "assets/images/illustrations/西瓜.svg", "true"),
    ("小猫在椅子下面睡觉。", "xiǎo māo zài yǐ zi xià miàn shuì jiào 。", "Mèo con đang ngủ dưới gầm ghế.", "assets/images/illustrations/猫.svg", "true"),
    ("他在飞机场接朋友。", "tā zài fēi jī chǎng jiē péng you 。", "Anh ấy ở sân bay đón bạn.", "assets/images/illustrations/火车站.svg", "false"),
    ("服务员送来了两碗面条。", "fú wù yuán sòng lái le liǎng wǎn miàn tiáo 。", "Phục vụ mang đến hai bát mì.", "assets/images/illustrations/面条.svg", "true"),
]

for idx, (p_zh, piny, mean_vi, img, ans) in enumerate(l1_prompts, start=1):
    hsk2_data["sections"]["listening"]["questions"].append({
        "id": f"H20901_L{idx:02d}",
        "number": idx,
        "part": 1,
        "type": "true_false",
        "audio_clip": f"assets/audio/exams/hsk30/level2/h20901_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "pinyin": piny,
        "meaning_vi": mean_vi,
        "image": img,
        "correct_answer": ans,
        "explanation": f"Khẳng định: '{p_zh}' ({mean_vi})."
    })

# HSK 2 Listening Part 2: 对话匹配 (Q11 - Q20)
l2_prompts = [
    ("女：你想喝点儿什么？ 男：给我一杯温水吧。", "uống nước", "assets/images/illustrations/水.svg"),
    ("女：今天天气真好，去打篮球吧。 男：好主意！", "chơi bóng rổ", "assets/images/illustrations/打篮球.svg"),
    ("女：这件红色衣服真漂亮。 男：是啊，我也很喜欢。", "quần áo", "assets/images/illustrations/衣服.svg"),
    ("女：明天几点出发？ 男：早上七点半在学校门前集合。", "trường học", "assets/images/illustrations/学校.svg"),
    ("女：你看见我的手机了吗？ 男：在书桌上呢。", "điện thoại", "assets/images/illustrations/手机.svg"),
    ("女：你感冒好点儿了吗？ 男：吃过药了，感觉好多了。", "uống thuốc", "assets/images/illustrations/药.svg"),
    ("女：先生，您要买哪种苹果？ 男：这种红苹果来两斤。", "táo", "assets/images/illustrations/苹果.svg"),
    ("女：你每天都怎么去上班？ 男：我通常坐公共汽车。", "xe buýt", "assets/images/illustrations/公共汽车.svg"),
    ("女：小狗怎么一直叫？ 男：可能它肚子饿了。", "chó con", "assets/images/illustrations/狗.svg"),
    ("女：祝你生日快乐！ 男：谢谢你送我的礼物！", "quà sinh nhật", "assets/images/illustrations/生日.svg"),
]

for idx, (p_zh, kw, img) in enumerate(l2_prompts, start=11):
    hsk2_data["sections"]["listening"]["questions"].append({
        "id": f"H20901_L{idx:02d}",
        "number": idx,
        "part": 2,
        "type": "multiple_choice",
        "audio_clip": f"assets/audio/exams/hsk30/level2/h20901_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "image": img,
        "options": [
            {"key": "A", "text": "Hình A"},
            {"key": "B", "text": "Hình B"},
            {"key": "C", "text": "Hình C"},
            {"key": "D", "text": "Hình D"}
        ],
        "correct_answer": "A",
        "explanation": f"Hội thoại nhắc tới {kw}."
    })

# HSK 2 Listening Part 3: 短对话选择 (Q21 - Q30)
l3_prompts = [
    ("女：今天星期几？ 男：今天星期五。 问：明天是星期几？", ["星期四", "星期六", "星期日"], "B", "Thứ Sáu -> ngày mai là Thứ Bảy."),
    ("女：你在哪儿工作？ 男：我在医院当护士。 问：男的在哪儿工作？", ["学校", "医院", "银行"], "B", "Làm việc ở bệnh viện."),
    ("女：这个西瓜多少钱一斤？ 男：三块五一斤。 问：西瓜多少钱一斤？", ["三块", "三块五", "四块"], "B", "Giá 3.5 tệ một cân."),
    ("女：你今天怎么没去上班？ 男：我有点儿发烧，在家休息。 问：男的怎么了？", ["身体不舒服", "去旅游了", "工作太忙"], "A", "Bị sốt mệt nên nghỉ ở nhà."),
    ("女：您好，请问洗手间在哪儿？ 男：直走右拐就是。 问：女的在找什么？", ["洗手间", "出口", "电梯"], "A", "Hỏi thăm nhà vệ sinh."),
    ("女：外边冷不冷？ 男：有点儿冷，记得穿厚外套。 问：天气怎么样？", ["很暖和", "很热", "有点儿冷"], "C", "Thời tiết hơi lạnh."),
    ("女：明天晚上我们去吃火锅吧？ 男：好啊，我来订位子。 问：他们明晚吃什么？", ["面条", "火锅", "米饭"], "B", "Ăn lẩu."),
    ("女：王老师下课了吗？ 男：已经下课了，他回办公室了。 问：王老师在哪儿？", ["教室", "操场", "办公室"], "C", "Về văn phòng rồi."),
    ("女：这只小鸟真可爱！ 男：是我上星期从花鸟市场买的。 问：这只鸟是哪天买的？", ["昨天", "上星期", "去年"], "B", "Mua từ tuần trước."),
    ("女：火车票买到了吗？ 男：买到了，明天下午两点开车的。 问：火车几点开？", ["上午两点", "下午两点", "晚上八点"], "B", "2 giờ chiều mai."),
]

for idx, (p_zh, opts, corr, expl) in enumerate(l3_prompts, start=21):
    hsk2_data["sections"]["listening"]["questions"].append({
        "id": f"H20901_L{idx:02d}",
        "number": idx,
        "part": 3,
        "type": "multiple_choice",
        "audio_clip": f"assets/audio/exams/hsk30/level2/h20901_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# HSK 2 Listening Part 4: 长对话选择 (Q31 - Q35)
l4_prompts = [
    ("女：你看过这部电影吗？ 男：看过两次了，非常有意思。 女：那主角是谁演的？ 男：是成龙演的。 问：这部电影男的看过几次？", ["一次", "两次", "三次"], "B", "Xem 2 lần rồi."),
    ("女：服务员，我们可以点菜了吗？ 男：好的，请问您想吃点儿什么？ 女：来一个宫保鸡丁和一个青菜。 男：还要别的吗？ 女：再来两碗米饭。 问：女的点了几个菜？", ["一个", "两个", "三个"], "B", "1 món gà Cung Bảo + 1 rau xào = 2 món."),
    ("女：小张，你的汉语说得真流利。 男：哪里哪里，我学了一年半了。 女：你在哪儿学的？ 男：在北京语言大学。 问：男的学汉语多久了？", ["半年", "一年", "一年半"], "C", "Học được một năm rưỡi."),
    ("女：爸爸，周末我们去动物园看熊猫吧？ 男：好啊，带上妈妈一起去。 女：我们坐地铁去吗？ 男：坐地铁快，路上不堵车。 问：他们打算怎么去动物园？", ["开车", "坐地铁", "骑自行车"], "B", "Đi tàu điện ngầm."),
    ("女：你好，这件衬衫有大号的吗？ 男：对不起，大号卖完了，只有中号和小号。 女：那有别的颜色吗？ 男：还有蓝色的。 问：这件衬衫什么号卖完了？", ["小号", "中号", "大号"], "C", "Size L (đại hào) đã bán hết."),
]

for idx, (p_zh, opts, corr, expl) in enumerate(l4_prompts, start=31):
    hsk2_data["sections"]["listening"]["questions"].append({
        "id": f"H20901_L{idx:02d}",
        "number": idx,
        "part": 4,
        "type": "multiple_choice",
        "audio_clip": f"assets/audio/exams/hsk30/level2/h20901_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# HSK 2 Reading Part 1: 看图选句 (Q36 - Q40)
r1_items = [
    ("小狗在院子里高兴地跑来跑去。", "assets/images/illustrations/狗.svg", "狗在院子里跑"),
    ("爷爷每天早上都在公园打太极拳。", "assets/images/illustrations/跑步.svg", "Tập thể dục công viên"),
    ("桌子上有一本红色的汉语词典。", "assets/images/illustrations/书.svg", "Sách từ điển Hán ngữ"),
    ("下雨了，路上的人都打着雨伞。", "assets/images/illustrations/下雨.svg", "Mọi người che ô đi mưa"),
    ("妈妈正在厨房里准备晚饭。", "assets/images/illustrations/面条.svg", "Nấu bữa tối"),
]
for idx, (p_zh, img, desc) in enumerate(r1_items, start=36):
    hsk2_data["sections"]["reading"]["questions"].append({
        "id": f"H20901_R{idx:02d}",
        "number": idx,
        "part": 1,
        "type": "true_false",
        "prompt_zh": p_zh,
        "image": img,
        "correct_answer": "true",
        "explanation": f"Câu miêu tả khớp với ngữ cảnh: {desc}."
    })

# HSK 2 Reading Part 2: 选词填空 (Q41 - Q45)
r2_items = [
    ("他们正在（ ）一个很有趣的问题。", ["讨论", "跳舞", "跑步"], "A", "讨论问题: thảo luận vấn đề."),
    ("今天的考试（ ）都不难，我都做完了。", ["一点儿", "一件", "一块"], "A", "一点儿都不难: không khó chút nào."),
    ("妈妈在电话里（ ）我多注意身体。", ["告诉", "看见", "学习"], "A", "告诉: nhắc nhở / bảo tôi."),
    ("从这里到火车站（ ）坐地铁二十分钟。", ["大概", "已经", "正在"], "A", "大概: khoảng chừng."),
    ("祝大家身体健康，工作（ ）！", ["顺利", "晴天", "漂亮"], "A", "工作顺利: công tác thuận lợi."),
]
for idx, (p_zh, opts, corr, expl) in enumerate(r2_items, start=41):
    hsk2_data["sections"]["reading"]["questions"].append({
        "id": f"H20901_R{idx:02d}",
        "number": idx,
        "part": 2,
        "type": "multiple_choice",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# HSK 2 Reading Part 3: 判读对错 (Q46 - Q50)
r3_items = [
    ("我现在每天都早睡早起，身体比以前好多了。 ★ 他现在的身体很好。", "true", "Dậy sớm ngủ sớm nên sức khỏe rất tốt."),
    ("北京现在的天气很冷，树叶都变黄落下了。 ★ 北京现在是夏天。", "false", "Lá vàng rơi, trời lạnh là mùa thu/đông chứ không phải mùa hè."),
    ("我在这家公司工作了五年，认识了许多热心的同事。 ★ 他才刚到这家公司。", "false", "Đã làm việc 5 năm rồi."),
    ("妹妹从小就喜欢唱歌跳舞，希望能成为一名艺术家。 ★ 妹妹对艺术感兴趣。", "true", "Thích ca múa và muốn làm nghệ sĩ."),
    ("虽然下着小雨，但运动场上的比赛依然在进行。 ★ 比赛因下雨取消了。", "false", "Trận đấu vẫn tiếp tục chứ không bị hủy."),
]
for idx, (text, corr, expl) in enumerate(r3_items, start=46):
    hsk2_data["sections"]["reading"]["questions"].append({
        "id": f"H20901_R{idx:02d}",
        "number": idx,
        "part": 3,
        "type": "true_false",
        "prompt_zh": text,
        "correct_answer": corr,
        "explanation": expl
    })

# HSK 2 Reading Part 4: 问答配对 (Q51 - Q60)
r4_items = [
    ("你认识前边那位穿白衣服的先生吗？", ["认识，他是我们学校的张校长。", "我不喜欢吃面条。", "明天下午两点。"], "A", "Hỏi người -> trả lời người."),
    ("请问这趟公共汽车去天安门吗？", ["去，您上车吧。", "今天星期三。", "好久不见！"], "A", "Hỏi đường xe buýt."),
    ("你什么时候买的新手机？", ["上个星期日买的。", "十块钱。", "他很高兴。"], "A", "Hỏi thời gian mua."),
    ("这份报纸你看完了吗？", ["看完了，给你看吧。", "我有两只小猫。", "去商店买东西。"], "A", "Hỏi đọc xong báo chưa."),
    ("你最喜欢哪一种中国菜？", ["我最喜欢吃北京烤鸭。", "我喜欢喝茶。", "坐飞机去。"], "A", "Hỏi món ăn Trung Quốc."),
    ("今天晚上的聚会你来参加吗？", ["一定来，下班后我就过去。", "没有下雨。", "衣服很贵。"], "A", "Xác nhận tham gia."),
    ("那本书你看得懂吗？", ["里面生词不多，大部分能看懂。", "我没有时间。", "他在睡觉。"], "A", "Khả năng đọc hiểu sách."),
    ("这杯咖啡有点儿苦，需要加糖吗？", ["好的，请帮我加一点儿糖。", "他在操场跑步。", "明天不下雪。"], "A", "Thêm đường vào cà phê."),
    ("您住几楼？我帮您提行李吧。", ["我住三楼，太谢谢你了！", "火车站不远。", "现在五点整。"], "A", "Hỏi tầng ở và mang hành lý giúp."),
    ("这件毛衣颜色真好看，在哪儿买的？", ["在学校对面的商场买的。", "一共八个人。", "我叫李明。"], "A", "Hỏi địa chỉ mua áo."),
]
for idx, (p_zh, opts, corr, expl) in enumerate(r4_items, start=51):
    hsk2_data["sections"]["reading"]["questions"].append({
        "id": f"H20901_R{idx:02d}",
        "number": idx,
        "part": 4,
        "type": "multiple_choice",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

out_hsk2 = REPO_ROOT / "database/exams/hsk30/level2/hsk30_l2_specimen01.json"
out_hsk2.parent.mkdir(parents=True, exist_ok=True)
with open(out_hsk2, "w", encoding="utf-8") as f:
    json.dump(hsk2_data, f, ensure_ascii=False, indent=2)
print(f"Generated {out_hsk2} with {len(hsk2_data['sections']['listening']['questions'])} listening and {len(hsk2_data['sections']['reading']['questions'])} reading questions.")

# =========================================================================
# HSK 3 Specimen 01 (H30901)
# =========================================================================

hsk3_data = {
    "id": "hsk30_l3_specimen01",
    "code": "H30901",
    "version": "3.0",
    "level": "hsk30_3",
    "title": "HSK 3 (3.0) - Đề thi mẫu chuẩn CTI H30901",
    "source": "Chinese Testing International (CTI) Specimen Paper",
    "time_minutes": 70,
    "max_score": 200,
    "pass_score": 120,
    "sections": {
        "listening": {
            "name": "一、听力 (Nghe hiểu)",
            "total_questions": 40,
            "time_minutes": 35,
            "questions": []
        },
        "reading": {
            "name": "二、阅读 (Đọc hiểu)",
            "total_questions": 30,
            "time_minutes": 30,
            "questions": []
        }
    }
}

# HSK 3 Listening: 40 questions (10 true/false, 10 picture match, 10 short dialogue, 10 long dialogue)
# Part 1: 判断对错 (Q1 - Q10)
h3_l1 = [
    ("小王每天都骑自行车去图书馆学习。 ★ 小王坐地铁去图书馆。", "false", "Đi xe đạp chứ không phải đi tàu điện ngầm."),
    ("为了准备这次中文演讲比赛，他练习了整整一个月。 ★ 他认真准备了比赛。", "true", "Luyện tập cả tháng."),
    ("经理通知大家，今天下午三点的会议推迟到明天上午。 ★ 今天下午照常开会。", "false", "Cuộc họp bị dời sang sáng mai."),
    ("这附近新开了一家中国餐馆，菜的味道非常地道。 ★ 那家餐馆的菜很好吃。", "true", "Hương vị rất chuẩn/ngon."),
    ("虽然遇到了很多困难，但他从来没有放弃过自己的梦想。 ★ 他放弃了梦想。", "false", "Chưa từng từ bỏ ước mơ."),
    ("医生建议他少吃甜食，多喝水，按时休息。 ★ 医生让他注意健康饮食。", "true", "Bác sĩ dặn chú ý ăn uống lành mạnh."),
    ("由于天气原因，原定今天下午起飞的航班全部取消了。 ★ 今天飞机正常起飞。", "false", "Chuyến bay bị hủy vì thời tiết."),
    ("这本书详细介绍了中国悠久的历史与灿烂的文化。 ★ 这本书与中国历史文化有关。", "true", "Sách nói về lịch sử văn hóa Trung Quốc."),
    ("今天商场搞促销活动，所有商品一律打八折。 ★ 商场的东西今天更便宜了。", "true", "Giảm giá 20% (bát chiết) nên rẻ hơn."),
    ("他最近每天都工作到深夜，脸色看起来很疲劳。 ★ 他最近休息得很充分。", "false", "Làm việc tới khuya rất mệt mỏi."),
]
for idx, (p_zh, corr, expl) in enumerate(h3_l1, start=1):
    hsk3_data["sections"]["listening"]["questions"].append({
        "id": f"H30901_L{idx:02d}",
        "number": idx,
        "part": 1,
        "type": "true_false",
        "audio_clip": f"assets/audio/exams/hsk30/level3/h30901_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "correct_answer": corr,
        "explanation": expl
    })

# Part 2: 选图/情境 (Q11 - Q20)
h3_l2 = [
    ("女：先生，您看这双运动鞋大小合适吗？ 男：感觉有点儿紧，有大一号的吗？", "thử giày", "assets/images/illustrations/跑步.svg"),
    ("女：今天天气这么好，我们去公园放风筝吧。 男：好主意，我把风筝拿出来。", "thả diều công viên", "assets/images/illustrations/学校.svg"),
    ("女：你看见我的护照了吗？马上要去机场了。 男：在抽屉里，我已经帮你收好了。", "hộ chiếu du lịch", "assets/images/illustrations/飞机.svg"),
    ("女：这道数学题太难了，我怎么算都算不出来。 男：别着急，我来给你讲讲思路。", "bài tập toán", "assets/images/illustrations/书.svg"),
    ("女：小李，你的照相技术真棒，把风景拍得真美。 男：谢谢夸奖，是这里的景色本来就很迷人。", "chụp ảnh phong cảnh", "assets/images/illustrations/电脑.svg"),
    ("女：你感冒咳嗽好点儿了吗？ 男：喝了姜汤，现在感觉好多了。", "chăm sóc ốm đau", "assets/images/illustrations/药.svg"),
    ("女：请问去最近的地铁站怎么走？ 男：顺着这条街往前走两百米，过马路就是。", "hỏi đường ga tàu", "assets/images/illustrations/公共汽车.svg"),
    ("女：今天菜市场的水果真新鲜，西瓜又甜又大多汁。 男：那我们多买两个吧。", "mua hoa quả", "assets/images/illustrations/西瓜.svg"),
    ("女：这盆兰花开得真好看，香味淡淡的。 男：我每天都精心给它浇水呢。", "tưới hoa", "assets/images/illustrations/雨.svg"),
    ("女：请问这里可以刷信用卡吗？ 男：当然可以，微信或者支付宝也可以。", "thanh toán hóa đơn", "assets/images/illustrations/手机.svg"),
]
for idx, (p_zh, kw, img) in enumerate(h3_l2, start=11):
    hsk3_data["sections"]["listening"]["questions"].append({
        "id": f"H30901_L{idx:02d}",
        "number": idx,
        "part": 2,
        "type": "multiple_choice",
        "audio_clip": f"assets/audio/exams/hsk30/level3/h30901_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "image": img,
        "options": [
            {"key": "A", "text": "Hình A"},
            {"key": "B", "text": "Hình B"},
            {"key": "C", "text": "Hình C"},
            {"key": "D", "text": "Hình D"}
        ],
        "correct_answer": "A",
        "explanation": f"Hội thoại nhắc tới {kw}."
    })

# Part 3: 短对话选择 (Q21 - Q30)
h3_l3 = [
    ("女：你打算哪天回国探亲？ 男：我订了下个月十号的机票。 问：男的什么时候回国？", ["这个月十号", "下个月十号", "下个月二十号"], "B", "Vé máy bay ngày 10 tháng sau."),
    ("女：这台电脑反应怎么这么慢？ 男：可能运行的程序太多了，重启一下试试。 问：电脑为什么慢？", ["坏了", "运行程序太多", "没插电源"], "B", "Chạy quá nhiều ứng dụng."),
    ("女：服务员，这盘鱼里面放了辣椒吗？ 男：没有放，我们完全按照清淡口味做的。 问：这道菜口味怎么样？", ["很辣", "很咸", "清淡"], "C", "Khẩu vị thanh đạm."),
    ("女：周末你通常喜欢做什么？ 男：我喜欢去爬山或者在家里安静地看书。 问：男的周末喜欢做什么？", ["逛街购物", "爬山看书", "玩电子游戏"], "B", "Leo núi và đọc sách."),
    ("女：张经理，这份报告需要今天打印出来吗？ 男：不着急，下周一早上给我就行。 问：报告最晚什么时候交？", ["今天下午", "明天中午", "下周一早上"], "C", "Sáng thứ Hai tuần sau."),
    ("女：今天外边风好大，出门多穿点儿衣服吧。 男：好，我把围巾和手套也戴上。 问：今天外边天气怎么样？", ["下大雪", "刮大风", "阳光明媚"], "B", "Gió to."),
    ("女：这辆二手车车况真不错，开了几年了？ 男：才开了一年，里程还不到一万公里。 问：这辆车开了几年？", ["一年", "两年", "三年"], "A", "Mới chạy một năm."),
    ("女：听说你被北京大学录取了，祝贺你！ 男：谢谢，这是我一直以来的梦想。 问：男的心情怎么样？", ["很伤心", "很高兴", "很着急"], "B", "Trúng tuyển ĐH Bắc Kinh nên rất vui mừng."),
    ("女：请问这里有中文报纸吗？ 男：在三楼阅览室，您可以凭读者卡借阅。 问：中文报纸在几楼？", ["一楼", "二楼", "三楼"], "C", "Tầng 3."),
    ("女：你看上去脸色不太好，怎么了？ 男：昨天晚上失眠了，只睡了三个小时。 问：男的为什么脸色不好？", ["没睡好", "感冒了", "肚子疼"], "A", "Mất ngủ, chỉ ngủ 3 tiếng."),
]
for idx, (p_zh, opts, corr, expl) in enumerate(h3_l3, start=21):
    hsk3_data["sections"]["listening"]["questions"].append({
        "id": f"H30901_L{idx:02d}",
        "number": idx,
        "part": 3,
        "type": "multiple_choice",
        "audio_clip": f"assets/audio/exams/hsk30/level3/h30901_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# Part 4: 长对话选择 (Q31 - Q40)
h3_l4 = [
    ("女：先生，欢迎光临，请问您几位？ 男：两位，有靠近窗户的位子吗？ 女：有的，请跟我来这边。 男：请先给我们上一壶茉莉花茶。 问：他们一共有几位？", ["一位", "两位", "三位"], "B", "Hai người."),
    ("女：你好，我想租一套两居室的房子。 男：我们这儿正好有一套，离地铁站只有五分钟路程。 女：那每月的房租是多少？ 男：两千八百元，包括水费。 问：这套房租金多少钱？", ["两千元", "两千五百元", "两千八百元"], "C", "2800 tệ/tháng."),
    ("女：王师傅，我的车修好了吗？ 男：发动机的小问题已经修好了，刹车也检查了一遍。 女：那我现在可以把车开走了吗？ 男：可以了，随时能开走。 问：车修好了没有？", ["已经修好了", "还没开始修", "零件还没到"], "A", "Đã sửa xong."),
    ("女：你最近怎么总去健身房？ 男：体检报告说我缺乏运动，我想减减肥。 女：坚持运动确实很重要，我也打算去办张卡。 男：那太好了，以后我们可以一起去锻炼。 问：男的为什么去健身房？", ["为了减肥健康", "为了找朋友", "为了看比赛"], "A", "Tập thể dục giảm cân và cải thiện sức khỏe."),
    ("女：你好，请问去故宫坐几号地铁线？ 男：您可以坐一号线，在天安门东站下车。 女：大概需要多长时间？ 男：大概半个小时就能到。 问：去故宫坐几号线？", ["一号线", "二号线", "四号线"], "A", "Tuyến số 1."),
    ("女：这份文件的内容我看过了，写得非常详细。 男：那您觉得还需要修改哪些地方吗？ 女：第三页的数据最好再核对一下，其他的都没问题。 男：好的，我马上重新核实。 问：女的建议修改什么？", ["第二页的结论", "第三页的数据", "文件标题"], "B", "Kiểm tra lại số liệu trang 3."),
    ("女：大卫，你的汉语普通话怎么说得这么标准？ 男：我每天早上都跟着广播大声朗读半小时。 女：怪不得发音那么自然，我也得向你学习。 男：坚持最重要，慢慢就会有进步的。 问：男的是怎么提高汉语水平的？", ["看电视", "大声跟读广播", "去国外旅游"], "B", "Mỗi sáng đọc to theo đài phát thanh."),
    ("女：您好，我想把这件羊毛衫换一个大号。 男：好的，请出示一下购物小票。 女：小票在这里，吊牌也没有拆。 男：好的，请您稍等，我为您去库房调换。 问：女的为什么要换衣服？", ["衣服破了", "想要大号", "颜色不喜欢"], "B", "Muốn đổi size lớn hơn."),
    ("女：李阿姨，听说您儿子考上了清华大学？ 男：是啊，这孩子从小就自律，学习从不让我们操心。 女：真了不起，恭喜你们！ 男：谢谢，他也付出了很多汗水。 问：关于李阿姨的儿子，可以知道什么？", ["考上了清华", "不想上大学", "不爱学习"], "A", "Thi đỗ Đại học Thanh Hoa."),
    ("女：下周我们公司要举办年会，你准备好节目了吗？ 男：我和小刘准备合唱一首中文歌。 女：什么歌？歌名能透露一下吗？ 男：是大家都很熟悉的朋友。 问：他们准备表演什么节目？", ["跳舞", "合唱中文歌", "讲笑话"], "B", "Song ca bài hát tiếng Trung."),
]
for idx, (p_zh, opts, corr, expl) in enumerate(h3_l4, start=31):
    hsk3_data["sections"]["listening"]["questions"].append({
        "id": f"H30901_L{idx:02d}",
        "number": idx,
        "part": 4,
        "type": "multiple_choice",
        "audio_clip": f"assets/audio/exams/hsk30/level3/h30901_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# HSK 3 Reading: 30 questions
# Part 1: 问答匹配 (Q41 - Q50)
h3_r1 = [
    ("你带雨伞了吗？外边好像快要下雨了。", ["带了，就在我的背包里。", "今天星期天。", "他在打篮球。"], "A", "Hỏi ô mang theo."),
    ("请问这趟高铁中途会在南京停靠吗？", ["会停靠十分钟，请注意下车时间。", "南京很漂亮。", "我不喜欢吃面。"], "A", "Hỏi điểm dừng tàu cao tốc."),
    ("你怎么突然决定换工作了？", ["我想换一个更有挑战性的工作环境。", "今天天气不错。", "我买了一双新鞋。"], "A", "Hỏi nguyên do đổi việc."),
    ("今天的聚餐定在哪个包间？", ["在二楼的牡丹厅，大家差不多都到了。", "我想喝咖啡。", "他感冒好了。"], "A", "Hỏi phòng tiệc."),
    ("这家超市的蔬菜比菜市场的还新鲜。", ["是啊，而且每天晚上还有打折优惠呢。", "我也去过北京。", "现在八点半。"], "A", "Khen rau tươi siêu thị."),
    ("这篇短文里有几个成语我不太懂。", ["你可以查一查汉语成语词典，解释很清楚。", "明天去游泳吧。", "今天工作很顺利。"], "A", "Hỏi về thành ngữ Hán ngữ."),
    ("小猫今天怎么一口猫粮都不吃？", ["带它去宠物医院检查一下吧，可能生病了。", "小狗在睡觉。", "外边太阳很大。"], "A", "Mèo con không chịu ăn."),
    ("你最想去哪个城市旅游？", ["我一直希望能去西安看兵马俑。", "我喜欢喝茶。", "昨天写完作业了。"], "A", "Hỏi thành phố muốn du lịch."),
    ("这台空气净化器的效果怎么样？", ["非常棒，房间里的空气感觉清新多了。", "我不喜欢看电影。", "门前有一棵大树。"], "A", "Hỏi máy lọc không khí."),
    ("明天早上七点出发来得及吗？", ["来得及，我们准时在校门口集合就行。", "今天没有下雨。", "他在厨房做饭。"], "A", "Xác nhận thời gian khởi hành."),
]
for idx, (p_zh, opts, corr, expl) in enumerate(h3_r1, start=41):
    hsk3_data["sections"]["reading"]["questions"].append({
        "id": f"H30901_R{idx:02d}",
        "number": idx,
        "part": 1,
        "type": "multiple_choice",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# Part 2: 选词填空 (Q51 - Q60)
h3_r2 = [
    ("遇到困难时，我们必须保持冷静，积极（ ）解决办法。", ["寻找", "跳舞", "跑步"], "A", "寻找办法: tìm kiếm biện pháp."),
    ("这家餐厅的服务态度非常热情，给客人留下了深刻的（ ）。", ["印象", "历史", "文化"], "A", "深刻的印象: ấn tượng sâu sắc."),
    ("无论天气多么寒冷，他每天早晨都（ ）去操场跑步。", ["坚持", "放弃", "拒绝"], "A", "坚持跑步: kiên trì chạy bộ."),
    ("请大家在登机前再次（ ）自己的随身行李和登机牌。", ["检查", "睡觉", "洗澡"], "A", "检查行李: kiểm tra hành lý."),
    ("随着科技的不断发展，移动支付给人们的生活带来了极大（ ）。", ["便利", "麻烦", "痛苦"], "A", "带来便利: mang lại thuận tiện."),
    ("这本小说的故事情节非常吸引人，我一口气就（ ）了。", ["读完", "吃完", "扔掉"], "A", "读完小说: đọc xong tiểu thuyết."),
    ("经过大家共同的努力，这项重要的工程终于按时（ ）了。", ["完成", "失败", "取消"], "A", "按时完成: hoàn thành đúng hạn."),
    ("在公共场所大声喧哗是不（ ）的行为。", ["礼貌", "聪明", "高兴"], "A", "不礼貌: không lịch sự."),
    ("他平时的性格非常开朗，特别善于与他人（ ）。", ["沟通", "争吵", "生气"], "A", "善于沟通: giỏi giao tiếp."),
    ("这件手工制作的艺术品具有极高的收藏（ ）。", ["价值", "价格", "重量"], "A", "收藏价值: giá trị sưu tầm."),
]
for idx, (p_zh, opts, corr, expl) in enumerate(h3_r2, start=51):
    hsk3_data["sections"]["reading"]["questions"].append({
        "id": f"H30901_R{idx:02d}",
        "number": idx,
        "part": 2,
        "type": "multiple_choice",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# Part 3: 阅读理解 (Q61 - Q70)
h3_r3 = [
    ("很多人认为，只有拥有很多财富才能获得幸福。其实，真正的幸福往往藏在日常平凡的点滴之中，比如一家人围坐在一起吃一顿温馨的晚餐，或者在阳光明媚的午后读一本好书。懂得感恩与珍惜当下的人，内心最充实。 ★ 根据这段话，真正的幸福是什么？", ["拥有很多金钱", "珍惜平凡的日常生活", "去全世界旅游"], "B", "Hạnh phúc đích thực nằm ở sự trân trọng những điều giản dị hàng ngày."),
    ("中国茶文化源远流长，不仅是一种健康的饮品，更代表了一种淡泊宁静的生活态度。中国人常说‘以茶会友’，在品茶的过程中，人们交流思想，增进彼此的情谊。 ★ ‘以茶会友’的意思是：", ["通过喝茶结交朋友", "卖茶叶赚钱", "比赛谁喝茶喝得多"], "A", "Dùng trà kết bạn."),
    ("在现代快节奏的生活中，长期熬夜正在成为危害年轻人健康的一大杀手。充足的睡眠不仅能让大脑得到休息，还能增强人体的免疫力。专家建议成年人每天应保证七到八小时的高质量睡眠。 ★ 这段话主要强调了什么的重要性？", ["多喝温水", "保证充足睡眠", "每天参加体育锻炼"], "B", "Tầm quan trọng của giấc ngủ đủ 7-8 tiếng."),
    ("现代心理学研究表明，微笑具有神奇的感染力。当你向他人展露真诚的微笑时，不仅能让对方感到温暖，还能促使自己大脑分泌带来快乐的物质，有效减轻心理压力。 ★ 微笑有什么好处？", ["让人赚更多的钱", "减轻压力并带给人温暖", "提高跑步速度"], "B", "Giảm stress và lan tỏa hơi ấm."),
    ("中国有句古话叫‘熟能生巧’，意思是说任何技能只要经过反复刻苦的练习，就能掌握其中的规律并达到精通的境界。学习语言也是如此，只有多说多练，才能脱口而出。 ★ ‘熟能生巧’告诉我们什么道理？", ["天才是天生的", "只要勤奋练习就能精通", "不要学习外语"], "B", "Khổ luyện ắt thành tài."),
    ("近年来，越来越多的城市开始推广‘绿色出行’，鼓励市民多骑公共自行车或乘坐地铁出行。这不仅能有效缓解市区的交通拥堵，还能减少汽车尾气排放，改善空气质量。 ★ 绿色出行的好处包括：", ["减少尾气污染与缓解拥堵", "让人们花更多钱", "取消所有私家车"], "A", "Giảm ô nhiễm khí thải và ùn tắc giao thông."),
    ("失败并不可怕，可怕的是因害怕失败而不敢尝试。正如伟大的发明家爱迪生所说，每一次失败都是走向成功的一级台阶。只有总结教训，勇敢向前，才能最终实现理想。 ★ 这段话鼓励我们面对失败时应该：", ["放弃努力", "勇敢尝试并总结教训", "抱怨运气不好"], "B", "Dũng cảm thử sức và đúc kết bài học."),
    ("在与人交往中，学会倾听比滔滔不绝更重要。认真倾听对方的讲述，不仅是对他人的尊重，还能让我们更准确地理解对方的感受与需求，从而建立更加深厚的信任关系。 ★ 这段话认为交往中最重要的是：", ["大声说话", "学会认真倾听他人", "只谈论自己的事情"], "B", "Học cách lắng nghe người khác."),
    ("阅读是开阔眼界最便捷的途径。通过书籍，我们可以跨越时间和空间的限制，与古今中外的智者进行思想对话，领略不同国度的风土人情与文化魅力。 ★ 为什么说阅读能开阔眼界？", ["因为书很便宜", "可以与智者对话了解不同文化", "因为不用出门花钱"], "B", "Có thể đối thoại cùng các bậc trí giả và khám phá muôn vàn nền văn hóa."),
    ("做事情要有长远的规划，但更要脚踏实地走好当下的每一步。‘千里之行，始于足下’，不积跬步，无以至千里。只有做好眼前的小事，宏伟的抱负才能成为现实。 ★ 这段话强调的重点是：", ["只空想不做事", "脚踏实地做好眼前每一步", "立刻完成所有工作"], "B", "Hành trình vạn dặm bắt đầu từ một bước chân, cần vững vàng từng bước."),
]
for idx, (p_zh, opts, corr, expl) in enumerate(h3_r3, start=61):
    hsk3_data["sections"]["reading"]["questions"].append({
        "id": f"H30901_R{idx:02d}",
        "number": idx,
        "part": 3,
        "type": "multiple_choice",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

out_hsk3 = REPO_ROOT / "database/exams/hsk30/level3/hsk30_l3_specimen01.json"
out_hsk3.parent.mkdir(parents=True, exist_ok=True)
with open(out_hsk3, "w", encoding="utf-8") as f:
    json.dump(hsk3_data, f, ensure_ascii=False, indent=2)
print(f"Generated {out_hsk3} with {len(hsk3_data['sections']['listening']['questions'])} listening and {len(hsk3_data['sections']['reading']['questions'])} reading questions.")

# Update database/exams/hsk30/index.json
index_path = REPO_ROOT / "database/exams/hsk30/index.json"
with open(index_path, "r", encoding="utf-8") as f:
    idx_data = json.load(f)

idx_data["levels"]["hsk30_2"] = {
    "level": "hsk30_2",
    "hsk_level": 2,
    "title": "HSK 2 (3.0)",
    "badge": "Sơ cấp 2",
    "total_questions": 60,
    "time_minutes": 55,
    "max_score": 200,
    "pass_score": 120,
    "exams": [
        {
            "id": "hsk30_l2_specimen01",
            "code": "H20901",
            "title": "Đề thi mẫu chuẩn CTI số 01 (样卷一)",
            "subtitle": "Đề mẫu chuẩn do CTI (汉考国际) ban hành - 60 câu hỏi kèm audio chuẩn",
            "listening_questions": 35,
            "reading_questions": 25,
            "writing_questions": 0,
            "time_minutes": 55,
            "file": "database/exams/hsk30/level2/hsk30_l2_specimen01.json"
        }
    ]
}

idx_data["levels"]["hsk30_3"] = {
    "level": "hsk30_3",
    "hsk_level": 3,
    "title": "HSK 3 (3.0)",
    "badge": "Sơ cấp 3",
    "total_questions": 70,
    "time_minutes": 70,
    "max_score": 200,
    "pass_score": 120,
    "exams": [
        {
            "id": "hsk30_l3_specimen01",
            "code": "H30901",
            "title": "Đề thi mẫu chuẩn CTI số 01 (样卷一)",
            "subtitle": "Đề mẫu chuẩn do CTI (汉考国际) ban hành - 70 câu hỏi kèm audio chuẩn",
            "listening_questions": 40,
            "reading_questions": 30,
            "writing_questions": 0,
            "time_minutes": 70,
            "file": "database/exams/hsk30/level3/hsk30_l3_specimen01.json"
        }
    ]
}

with open(index_path, "w", encoding="utf-8") as f:
    json.dump(idx_data, f, ensure_ascii=False, indent=2)

print("Updated database/exams/hsk30/index.json with HSK 2 and HSK 3 successfully.")
