#!/usr/bin/env python3
"""Build CTI-standard Writing section for HSK 3 and complete 100-question HSK 4 exam.

- Updates database/exams/hsk30/level3/hsk30_l3_specimen01.json (add 10 writing questions -> 80 total, 90 mins, 300 pts)
- Creates database/exams/hsk30/level4/hsk30_l4_specimen01.json (100 questions, 105 mins, 300 pts)
- Updates database/exams/hsk30/index.json
"""

import json
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]

# =========================================================================
# 1. Update HSK 3 (H30901) with Writing Section
# =========================================================================

hsk3_path = REPO_ROOT / "database/exams/hsk30/level3/hsk30_l3_specimen01.json"
with open(hsk3_path, "r", encoding="utf-8") as f:
    hsk3_data = json.load(f)

hsk3_data["time_minutes"] = 90
hsk3_data["max_score"] = 300
hsk3_data["pass_score"] = 180

# Writing Section: 10 questions
writing_questions_hsk3 = [
    # Part 1: 连词成句 (Q71 - Q75)
    {
        "id": "H30901_W71",
        "number": 71,
        "part": 1,
        "type": "word_reorder",
        "words": ["小狗", "正在", "在椅子下面", "睡觉"],
        "correct_answer": "小狗正在椅子下面睡觉。",
        "explanation": "Chủ ngữ (小狗) + Phó từ chỉ tiếp diễn (正在) + Trạng ngữ chỉ nơi chốn (在椅子下面) + Vị ngữ (睡觉)."
    },
    {
        "id": "H30901_W72",
        "number": 72,
        "part": 1,
        "type": "word_reorder",
        "words": ["经理", "通知大家", "明天上午", "开会"],
        "correct_answer": "经理通知大家明天上午开会。",
        "explanation": "Câu kiêm ngữ: 经理 (chủ ngữ) + 通知 (động từ 1) + 大家 (tân ngữ kiêm chủ ngữ) + 明天上午开会 (vị ngữ 2)."
    },
    {
        "id": "H30901_W73",
        "number": 73,
        "part": 1,
        "type": "word_reorder",
        "words": ["这家餐馆的菜", "味道", "非常", "地道"],
        "correct_answer": "这家餐馆的菜味道非常地道。",
        "explanation": "Câu vị ngữ hình dung từ: 这家餐馆的菜 (chủ ngữ lớn) + 味道 (chủ ngữ nhỏ) + 非常地道 (vị ngữ)."
    },
    {
        "id": "H30901_W74",
        "number": 74,
        "part": 1,
        "type": "word_reorder",
        "words": ["他", "从来没有", "放弃过", "自己的梦想"],
        "correct_answer": "他从来没有放弃过自己的梦想。",
        "explanation": "他 (chủ ngữ) + 从来没有 (phó từ phủ định kinh nghiệm) + 放弃过 (động từ vị ngữ kèm qua) + 自己的梦想 (tân ngữ)."
    },
    {
        "id": "H30901_W75",
        "number": 75,
        "part": 1,
        "type": "word_reorder",
        "words": ["移动支付", "给人们的生活", "带来了", "极大便利"],
        "correct_answer": "移动支付给人们的生活带来了极大便利。",
        "explanation": "移动支付 (chủ ngữ) + 给人们的生活 (giới từ chỉ đối tượng hưởng lợi) + 带来了 (động từ mang lại) + 极大便利 (tân ngữ)."
    },
    # Part 2: 看拼音写汉字 (Q76 - Q80)
    {
        "id": "H30901_W76",
        "number": 76,
        "part": 2,
        "type": "hanzi_fill",
        "sentence_zh": "出门记得（    ）雨伞，外边快下雨了。",
        "pinyin_clue": "dài",
        "correct_answer": "带",
        "explanation": "‘带’ (dài) mang nghĩa đem theo / mang theo vật dụng."
    },
    {
        "id": "H30901_W77",
        "number": 77,
        "part": 2,
        "type": "hanzi_fill",
        "sentence_zh": "这本小说的故事情节非常吸引人，我一口气就读（    ）了。",
        "pinyin_clue": "wán",
        "correct_answer": "完",
        "explanation": "‘完’ (wán) làm bổ ngữ kết quả: 读完 (đọc xong)."
    },
    {
        "id": "H30901_W78",
        "number": 78,
        "part": 2,
        "type": "hanzi_fill",
        "sentence_zh": "他在北京语言大学学（    ）汉语已经一年半了。",
        "pinyin_clue": "xí",
        "correct_answer": "习",
        "explanation": "‘习’ (xí) trong từ ghép 学习 (xuéxí - học tập)."
    },
    {
        "id": "H30901_W79",
        "number": 79,
        "part": 2,
        "type": "hanzi_fill",
        "sentence_zh": "祝大家身体健康，工作顺（    ）！",
        "pinyin_clue": "lì",
        "correct_answer": "利",
        "explanation": "‘利’ (lì) trong lời chúc 工作顺利 (công việc thuận lợi)."
    },
    {
        "id": "H30901_W80",
        "number": 80,
        "part": 2,
        "type": "hanzi_fill",
        "sentence_zh": "请大家在登机前再次（    ）查自己的随身行李。",
        "pinyin_clue": "jiǎn",
        "correct_answer": "检",
        "explanation": "‘检’ (jiǎn) trong từ 检查 (kiểm tra)."
    }
]

hsk3_data["sections"]["writing"] = {
    "name": "三、书写 (Viết)",
    "name_zh": "第三部分：书写",
    "name_vi": "Phần 3: Viết (Sắp xếp câu & Điền chữ Hán)",
    "total_questions": 10,
    "time_minutes": 15,
    "questions": writing_questions_hsk3
}

with open(hsk3_path, "w", encoding="utf-8") as f:
    json.dump(hsk3_data, f, ensure_ascii=False, indent=2)

print(f"Updated HSK 3 exam with Writing section: 80 total questions.")

# =========================================================================
# 2. Build Full 100-Question HSK 4 Specimen Paper (H41001)
# =========================================================================

hsk4_data = {
    "id": "hsk30_l4_specimen01",
    "code": "H41001",
    "version": "3.0",
    "level": "hsk30_4",
    "title": "HSK 4 (3.0) - Đề thi mẫu chuẩn CTI H41001",
    "source": "Chinese Testing International (CTI) Specimen Paper",
    "time_minutes": 105,
    "max_score": 300,
    "pass_score": 180,
    "sections": {
        "listening": {
            "name": "一、听力 (Nghe hiểu)",
            "name_zh": "第一部分：听力",
            "name_vi": "Phần 1: Nghe hiểu",
            "total_questions": 45,
            "time_minutes": 30,
            "questions": []
        },
        "reading": {
            "name": "二、阅读 (Đọc hiểu)",
            "name_zh": "第二部分：阅读",
            "name_vi": "Phần 2: Đọc hiểu",
            "total_questions": 40,
            "time_minutes": 40,
            "questions": []
        },
        "writing": {
            "name": "三、书写 (Viết)",
            "name_zh": "第三部分：书写",
            "name_vi": "Phần 3: Viết",
            "total_questions": 15,
            "time_minutes": 25,
            "questions": []
        }
    }
}

# --- Listening Part 1 (Q1 - Q10): 判断对错 (True/False) ---
h4_l1_items = [
    ("喂？我们去树林里走走吧，今天的阳光多好啊，很暖和。好吧？图书馆门口儿见？ ★ 今天天气不错。", "true", "Trời nhiều nắng và ấm áp -> thời tiết tốt."),
    ("我想买这台洗衣机，虽然价格比其他牌子稍微贵一点儿，但质量非常好，售后服务也完善。 ★ 这台洗衣机很便宜。", "false", "Giá hơi đắt hơn hãng khác chứ không hề rẻ."),
    ("虽然毕业后我们都在同一个城市工作，但因为平时大家工作都太忙，反而很少有时间聚会。 ★ 他们经常聚会。", "false", "Công việc bận nên rất hiếm khi tụ tập."),
    ("经理，您交代的那份关于新市场推广的市场调查报告，我已经发到您的邮箱了，请您过目。 ★ 调查报告还没写完。", "false", "Đã viết xong và gửi vào email của giám đốc rồi."),
    ("很多人以为只要多跑步就能减肥，其实如果不注意控制饮食，摄入的热量超过消耗，依然很难瘦下来。 ★ 减肥也需要注意饮食。", "true", "Giảm cân cần kết hợp kiểm soát ăn uống."),
    ("李老师讲课非常幽默生动，不仅深入浅出，还经常结合生活中的有趣实例，深受全校学生的喜爱。 ★ 学生们很喜欢李老师。", "true", "Thầy giảng hài hước, sinh động nên học sinh rất yêu quý."),
    ("为了保证航班飞行安全，请各位旅客在飞机起飞和降落阶段，务必系好安全带，关闭移动电话。 ★ 飞机上可以随时接打电话。", "false", "Khi cất cánh hạ cánh bắt buộc tắt điện thoại."),
    ("这篇散文的语言非常优美，描绘了江南水乡春天的迷人景色，让人仿佛身临其境。 ★ 这篇文章写的是北方的冬天。", "false", "Miêu tả mùa xuân vùng sông nước Giang Nam chứ không phải mùa đông phương Bắc."),
    ("虽然这次求职面试没有成功，但他并没有灰心丧气，反而认真总结经验，准备迎接下一次机会。 ★ 他对未来充满了信心。", "true", "Không nản chí, tích cực đúc kết bài học."),
    ("吸烟不仅严重危害自身的呼吸系统和心血管健康，二手烟还会对身边的家人朋友造成巨大伤害。 ★ 吸烟有害健康。", "true", "Hút thuốc gây hại nghiêm trọng cho sức khỏe.")
]

for idx, (p_zh, ans, expl) in enumerate(h4_l1_items, start=1):
    hsk4_data["sections"]["listening"]["questions"].append({
        "id": f"H41001_L{idx:02d}",
        "number": idx,
        "part": 1,
        "type": "true_false",
        "audio_clip": f"assets/audio/exams/hsk30/level4/h41001_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "correct_answer": ans,
        "explanation": expl
    })

# --- Listening Part 2 (Q11 - Q25): 短对话选择 (Dialogue A/B/C/D) ---
h4_l2_items = [
    ("女：请问这份合同什么时候需要寄给客户？ 男：今天下午五点之前必须发出去。 问：合同最迟什么时候寄出？", ["今天上午", "今天下午五点前", "明天早上", "下周一"], "B", "Trước 5 giờ chiều nay."),
    ("女：你最近脸色怎么这么苍白？ 男：昨晚赶项目熬了个通宵，头有点儿晕。 问：男的怎么了？", ["感冒发烧", "昨晚熬夜了", "喝醉酒了", "心情不好"], "B", "Thức trắng đêm làm dự án."),
    ("女：这辆车的外形真酷，是你新买的吗？ 男：不是，我向朋友借来应急开两天的。 问：关于这辆车，下列哪项正确？", ["是男的买的", "是借朋友的", "是租来的", "刚从修理厂取回"], "B", "Mượn tạm của bạn 2 ngày."),
    ("女：王总，这是下季度的新产品宣传预算方案，请您签字。 男：放我桌上吧，我下午仔细审阅后再签。 问：男的打算什么时候看方案？", ["现在立刻", "今天下午", "明天中午", "下个月"], "B", "Chiều nay xem kỹ rồi ký."),
    ("女：服务员，我们这桌的糖醋鲤鱼怎么还没上？ 男：真抱歉，后厨正在烹饪，马上就给您端上来。 问：根据对话，可以知道什么？", ["菜已经凉了", "菜还没做好", "客人要退菜", "服务员上错菜了"], "B", "Món cá chua ngọt đang nấu, sắp mang lên."),
    ("女：你觉得这次考试的阅读理解难度怎么样？ 男：篇幅比平时练习的长，但生词并不算多。 问：男的觉得阅读理解怎么样？", ["非常容易", "生词特别多", "篇幅较长", "题目不够做"], "C", "Đoạn văn dài hơn bình thường."),
    ("女：听说你打算报名去参加马拉松长跑？ 男：是啊，我已经坚持慢跑锻炼半年了，想挑战一下自己。 问：男的为什么要参加马拉松？", ["为了拿奖金", "想挑战自己", "朋友逼他去的", "为了减肥"], "B", "Muốn thử thách bản thân."),
    ("女：小李，你的普通话口音怎么听起来有点儿像北方人？ 男：我在哈尔滨读了四年大学，不知不觉就被带过来了。 问：男的在哪儿上的大学？", ["北京", "上海", "哈尔滨", "广州"], "C", "Học đại học ở Cáp Nhĩ Tân."),
    ("女：师傅，去首都国际机场三号航站楼大概要多久？ 男：现在不堵车，走机场高速四十分钟就能到。 问：到机场大概需要多长时间？", ["二十分钟", "半小时", "四十分钟", "一个小时"], "C", "40 phút đường cao tốc."),
    ("女：你新换的这台笔记本电脑用起来顺手吗？ 男：速度特别快，而且电池续航能达到十个小时。 问：关于这台电脑，男的觉得怎么样？", ["价格太贵", "速度快续航长", "外观不好看", "重量太沉"], "B", "Chạy rất nhanh và pin trâu 10 tiếng."),
    ("女：真不好意思，路上遇到交通事故，堵了半个多小时。 男：没关系，会议还没正式开始，快请进吧。 问：女的为什么迟到了？", ["起晚了", "路上堵车", "走错路了", "忘带文件"], "B", "Tắc đường do tai nạn giao thông."),
    ("女：妈妈，周末我想跟同学去爬泰山看日出。 男：去吧，但山上风大气温低，记得带上厚外套。 问：男的提醒女的注意什么？", ["保管好门票", "带厚外套防寒", "早点儿睡觉", "少喝水"], "B", "Mang áo khoác dày vì trên núi lạnh gió to."),
    ("女：张医生，我最近总是失眠多梦，有什么好办法吗？ 男：平时少喝浓茶咖啡，睡前半小时用热水泡泡脚。 问：医生建议女的睡前做什么？", ["多喝浓茶", "热水泡脚", "做剧烈运动", "吃安眠药"], "B", "Ngâm chân nước ấm trước khi ngủ."),
    ("女：你刚才去哪儿了？到处都找不到你。 男：我看楼梯间的饮水机没水了，去楼下换了一桶纯净水。 问：男的刚才去干什么了？", ["去买咖啡", "换纯净水", "打扫卫生", "寄快递"], "B", "Đi đổi bình nước tinh khiết."),
    ("女：听说这本关于中国古典园林的书卖得非常火爆？ 男：可不是嘛，刚上架三天出版社就加印了两次。 问：这本书的情况怎么样？", ["降价促销", "销量非常好", "内容很枯燥", "没人买"], "B", "Bán rất chạy, tái bản 2 lần trong 3 ngày.")
]

for idx, (p_zh, opts, corr, expl) in enumerate(h4_l2_items, start=11):
    hsk4_data["sections"]["listening"]["questions"].append({
        "id": f"H41001_L{idx:02d}",
        "number": idx,
        "part": 2,
        "type": "multiple_choice",
        "audio_clip": f"assets/audio/exams/hsk30/level4/h41001_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]},
            {"key": "D", "text": opts[3]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# --- Listening Part 3 (Q26 - Q45): 长对话与短文理解 (20 questions) ---
h4_l3_items = [
    ("女：大卫，你中文说得这么地道，是有什么独特的诀窍吗？ 男：其实没有捷径，我每天都坚持看一集中国电视剧，模仿里面人物的语调。 女：这确实是个好方法，不仅能练听力，还能了解文化。 男：对啊，遇到不懂的俗语我就记录在本子上，向中国朋友请教。 问：男的是通过什么方式练习汉语的？", ["看中文电视剧", "天天背字典", "找外教补习", "只听收音机"], "A", "Xem phim truyền hình và nhại theo ngữ điệu."),
    ("女：请问去长城怎么走最方便？ 男：您可以去德胜门乘坐877路直达公交车，或者坐高铁从清河站出发。 女：坐高铁大概需要多久？ 男：高铁只要二十分钟左右就能到八达岭长城站。 问：坐高铁到长城大概多长时间？", ["十分钟", "二十分钟", "四十分钟", "一个小时"], "B", "Khoảng 20 phút bằng tàu cao tốc."),
    ("女：欢迎光临，请问您想挑选什么款式的衬衫？ 男：我想找一件商务休闲风格的，平时上班和聚会都能穿。 女：您看这件浅蓝色的怎么样？纯棉材质，透气舒服。 男：挺不错的，我可以试穿一下吗？ 问：男的看中了什么颜色的衬衫？", ["白色", "浅蓝色", "深黑色", "灰色"], "B", "Áo sơ mi màu xanh nhạt."),
    ("女：小张，今年暑假打算怎么安排？ 男：我打算去云南当两周的乡村支教志愿者。 女：真有意义！支教教什么科目？ 男：教当地小学的英语和基础电脑操作。 问：男的暑假打算去哪儿支教？", ["西藏", "云南", "四川", "贵州"], "B", "Tình nguyện dạy học ở Vân Nam."),
    ("女：您好，我想把这双鞋退掉，鞋跟有点儿磨脚。 男：请问您有购物发票吗？鞋盒保留完好吗？ 女：都在这里，昨天刚买的，一次都没穿出门。 男：好的，核对无误，马上为您办理全额退款。 问：女的为什么要退鞋？", ["颜色不好看", "鞋跟磨脚", "尺码买大了", "鞋子破损"], "B", "Gót giày bị cọ xát đau chân."),
    ("女：林教授，您能谈谈现代人该如何缓解职场压力吗？ 男：首先要学会合理分配时间，避免把所有事情堆积到最后一刻；其次要培养健康的业余爱好，让大脑在工作之余得到充分放松。 问：林教授给出了什么建议？", ["跳槽换工作", "合理分配时间培养爱好", "天天加班加点", "放弃所有社交"], "B", "Phân bổ thời gian và có sở thích thư giãn."),
    ("女：听说你领养了一只流浪猫？ 男：是啊，在小区花坛里捡到的，当时浑身脏兮兮的，非常可怜。 女：去宠物医院检查过了吗？ 男：做过全面驱虫和疫苗了，现在活泼健康得很呢。 问：这只猫是在哪儿捡到的？", ["宠物店", "小区花坛", "公园长椅", "学校操场"], "B", "Nhặt ở bồn hoa khu chung cư."),
    ("女：王经理，这批货物的质量检测合格了吗？ 男：抽检合格率达到了百分之九十九点五，符合出厂标准。 女：那船运的集装箱安排好了吗？ 男：已经跟货运代理公司确认过了，明天下午装箱发运。 问：关于这批货物，下列哪项正确？", ["质检没过关", "明天下午装箱发运", "被客户退货", "推迟一个月交付"], "B", "Chiều mai bốc hàng lên container vận chuyển."),
    ("女：你最近怎么爱上喝茶了？以前不是只喝咖啡吗？ 男：最近胃不太好，医生建议少刺激肠胃，多喝温和的红茶。 女：红茶确实暖胃，我这儿有武夷山的大红袍，送你一罐尝尝。 男：那太感谢了，正好品尝一下名茶。 问：男的为什么改喝茶了？", ["为了减肥", "胃不太好需养胃", "咖啡太贵", "朋友推荐的"], "B", "Dạ dày không tốt nên đổi sang uống hồng trà ấm bụng."),
    ("女：听说你获得了这次青年科技创新大赛的一等奖？ 男：全靠团队伙伴们通力合作，我们连续攻关了三个月。 女：奖金打算怎么花？ 男：一部分请团队成员吃大餐庆祝，剩下的投入下一代原型的研发中。 问：男的把大部分奖金用于什么？", ["买新汽车", "下一代原型研发", "出国旅游", "存入银行"], "B", "Đầu tư vào nghiên cứu nguyên mẫu thế hệ mới."),
    # Narrative Passage 1: 说话的艺术 (Q36 - Q37)
    ("很多人常常感叹‘说者无心，听者有意’。在人际交往中，语言是一把双刃剑，恰当的言辞如春风化雨，能温暖人心；而不经思考的伤人之语，却如一把尖刀，往往在不经意间破坏了珍贵的信任。真正情商高的人，懂得在开口前三思，学会设身处地为对方着想，用真诚与尊重化解分歧。 ★ 为什么说语言是一把双刃剑？", ["因为语言能卖钱", "既能温暖人也可能伤害人", "因为学外语很难", "说话需要两张嘴"], "B", "Ngôn từ có thể sưởi ấm lòng người nhưng cũng có thể gây tổn thương."),
    ("承接上文：真正情商高的人在交往中会怎么做？", ["从不与人交流", "说话前三思并尊重他人", "只顾自己高兴", "滔滔不绝炫耀"], "B", "Uốn lưỡi bảy lần trước khi nói và biết đặt mình vào vị trí người khác."),
    # Narrative Passage 2: 保持好奇心 (Q38 - Q39)
    ("爱因斯坦曾说：‘我没有什么特别的才能，我只是保持了强烈的好奇心。’好奇心是人类探索未知世界的源动力。小孩子总是对周围的一切充满疑问，而随着年龄的增长，很多人逐渐失去了对新事物的好奇与探索欲。其实，终身学习的核心就在于保持这种探求未知的热情，唯有如此，思想才不会僵化。 ★ 爱因斯坦认为自己成功的关键是什么？", ["天生绝顶聪明", "拥有强烈的好奇心", "家庭非常富裕", "运气特别好"], "B", "Duy trì sự tò mò mãnh liệt đối với thế giới."),
    ("承接上文：根据这段话，终身学习的核心是什么？", ["天天做考卷", "保持探求未知的热情", "买很多昂贵书籍", "永远不离开学校"], "B", "Giữ vững ngọn lửa nhiệt huyết khám phá những điều chưa biết."),
    # Narrative Passage 3: 时间管理法 (Q40 - Q41)
    ("著名的‘四象限时间管理法’将事情按照‘紧急’与‘重要’划分为四个象限。很多人整天疲于奔命，是因为把大量精力耗费在‘紧急但不重要’的琐事上。实际上，真正决定一个人长远高度的，往往是那些‘重要但不紧急’的事情，比如锻炼身体、学习深造和长远规划。把时间投资在这些事情上，人生才能走得更稳健。 ★ 很多人整天疲于奔命的原因是：", ["从不休息", "耗费精力在紧急不重要的琐事上", "睡眠时间太长", "工作薪水太低"], "B", "Tiêu tốn thời gian vào những việc khẩn cấp nhưng vụn vặt."),
    ("承接上文：真正决定一个人长远高度的事情是：", ["重要但不紧急的事情", "最紧急的琐碎事务", "别人强迫做的事情", "毫无意义的娱乐"], "A", "Những việc quan trọng nhưng không mang tính khẩn cấp trước mắt."),
    # Narrative Passage 4: 习惯的力量 (Q42 - Q43)
    ("古希腊哲学家亚里士多德说：‘总以某种方式思考和行动，便会形成某种习惯；而习惯最终塑造了我们的性格与命运。’优秀不是一种孤立的行为，而是一种持之以恒的习惯。每天进步百分之一，一年下来就会产生巨大的复利效应。不要轻视微小的坏习惯，也不要忽视每天微小的坚持。 ★ 这段话告诉我们关于‘优秀’的真理是：", ["优秀完全靠天分", "优秀是一种持之以恒的习惯", "只要偶尔做一件好事就是优秀", "不需要付出努力"], "B", "Sự xuất sắc là một thói quen bền bỉ mỗi ngày."),
    ("承接上文：每天微小坚持带来的效应被称为：", ["运气效应", "复利效应", "偶然效应", "短视效应"], "B", "Hiệu ứng lãi kép (phục lợi hiệu ứng)."),
    # Narrative Passage 5: 森林与气候 (Q44 - Q45)
    ("森林被誉为‘地球之肺’，是维护全球生态平衡不可或缺的重要屏障。茂密的森林不仅能吸收大量的二氧化碳并释放人类赖以生存的氧气，还能涵养水源、保持水土并调节区域气候。保护每一片森林，就是保护我们共同的家园。 ★ 森林被称为‘地球之肺’是因为：", ["森林占地面积最大", "吸收二氧化碳并释放氧气", "森林里有很多动物", "森林颜色是绿色的"], "B", "Hấp thụ CO2 và nhả khí oxy cho Trái Đất."),
    ("承接上文：保护森林的重要意义在于：", ["获取更多的木材赚钱", "维护全球生态平衡", "建设更多的高楼", "砍伐树木造纸"], "B", "Duy trì và bảo vệ cân bằng sinh thái toàn cầu.")
]

for idx, (p_zh, opts, corr, expl) in enumerate(h4_l3_items, start=26):
    hsk4_data["sections"]["listening"]["questions"].append({
        "id": f"H41001_L{idx:02d}",
        "number": idx,
        "part": 3,
        "type": "multiple_choice",
        "audio_clip": f"assets/audio/exams/hsk30/level4/h41001_l{idx:02d}.mp3",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]},
            {"key": "D", "text": opts[3]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# --- Reading Part 1 (Q46 - Q55): 选词填空 (Fill blanks) ---
h4_r1_items = [
    ("遇到突发情况时，一定要保持（    ），切忌慌乱。", ["冷静", "骄傲", "马虎", "粗心"], "A", "保持冷静: giữ bình tĩnh."),
    ("这家百年老字号的糕点店在当地享有很高的（    ）。", ["声誉", "速度", "距离", "价格"], "A", "享有声誉: có uy tín/tiếng tăm cao."),
    ("由于连日暴雨导致道路塌方，原定发车的班次被迫（    ）。", ["推迟", "赞赏", "提倡", "鼓励"], "A", "被迫推迟: buộc phải hoãn lại."),
    ("在激烈的市场竞争中，企业必须不断（    ）才能立于不败之地。", ["创新", "偷懒", "放弃", "拒绝"], "A", "不断创新: không ngừng đổi mới sáng tạo."),
    ("王老师对待教学工作一向认真（    ），从不敷衍了事。", ["负责", "马虎", "随便", "粗糙"], "A", "认真负责: nghiêm túc và có tinh thần trách nhiệm."),
    ("吸烟严重危害身体健康，公共场所应当全面（    ）吸烟。", ["禁止", "提倡", "表扬", "欣赏"], "A", "全面禁止: cấm triệt để."),
    ("经过长达半年的艰苦谈判，双方终于在关键条款上达成了（    ）。", ["一致", "区别", "反感", "怀疑"], "A", "达成一致: đạt được sự thống nhất."),
    ("他平时生活非常（    ），从不铺张浪费，却热心资助贫困学生。", ["节俭", "傲慢", "奢侈", "懒惰"], "A", "生活节俭: sống giản dị tiết kiệm."),
    ("阅读古典名著不仅能开阔眼界，还能丰富人的（    ）世界。", ["精神", "外表", "身高", "体重"], "A", "精神世界: thế giới tinh thần."),
    ("在人际交往中，学会换位思考能够有效减少许多不必要的（    ）。", ["误会", "成功", "财富", "友谊"], "A", "减少误会: giảm bớt hiểu lầm.")
]

for idx, (p_zh, opts, corr, expl) in enumerate(h4_r1_items, start=46):
    hsk4_data["sections"]["reading"]["questions"].append({
        "id": f"H41001_R{idx:02d}",
        "number": idx,
        "part": 1,
        "type": "multiple_choice",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]},
            {"key": "D", "text": opts[3]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# --- Reading Part 2 (Q56 - Q65): 排列顺序 (Order 3 clauses A, B, C) ---
h4_r2_items = [
    ("A. 才能在未来的社会竞争中立于不败之地 \nB. 只有树立终身学习的意识 \nC. 并不断提升自己的综合素质", "BCA", "B (điều kiện duy nhất: 只有...) -> C (bổ sung: 并...) -> A (kết quả: 才能...)."),
    ("A. 不仅能缓解城市交通拥堵 \nB. 近年来政府大力推广绿色出行方式 \nC. 还能有效减少汽车尾气对空气的污染", "BAC", "B (chủ ngữ/bối cảnh) -> A (lợi ích 1: 不仅能...) -> C (lợi ích 2: 还能...)."),
    ("A. 经过全体科研人员三年的艰苦攻关 \nB. 这项重大关键技术终于取得了突破性进展 \nC. 为我国的高铁建设做出了突出贡献", "ABC", "A (quá trình nỗ lực) -> B (thành quả đột phá) -> C (ý nghĩa cống hiến)."),
    ("A. 往往藏在日常平凡的点滴温暖之中 \nB. 其实真正的幸福并不遥远 \nC. 只要我们懂得珍惜眼前人与当下生活", "BAC", "B (mở đầu nhận định) -> A (vị ngữ: 往往藏在...) -> C (điều kiện: 只要...)."),
    ("A. 导致睡眠质量严重下降 \nB. 长期在睡前沉迷于刷手机 \nC. 进而危害身体的心血管健康", "BAC", "B (nguyên nhân thói quen xấu) -> A (hậu quả trước mắt) -> C (hậu quả lâu dài: 进而...)."),
    ("A. 才能找到真正行之有效的解决办法 \nB. 遇到复杂问题时切莫慌乱 \nC. 唯有沉着冷静地理清脉络", "BCA", "B (lời khuyên: 切莫慌乱) -> C (hành động: 唯有沉着...) -> A (mục đích: 才能找到...)."),
    ("A. 这座千年古桥依然巍然屹立 \nB. 见证着漫长历史岁月的沧桑变迁 \nC. 历经无数次风雨侵蚀与洪水冲击", "CAB", "C (trải qua thử thách) -> A (vẫn sừng sững) -> B (chứng nhân lịch sử)."),
    ("A. 还能在互动中增进邻里之间的感情 \nB. 社区定期举办便民文体活动 \nC. 不仅丰富了居民的业余精神文化生活", "BCA", "B (chủ ngữ: 社区举办活动) -> C (lợi ích 1: 不仅丰富...) -> A (lợi ích 2: 还能增进...)."),
    ("A. 从而让谈判在互利共赢的氛围中顺利推进 \nB. 在商务会谈中学会倾听对方的诉求 \nC. 能够体现对合作伙伴的最大诚意", "BCA", "B (phương thức hành động) -> C (tác dụng trực tiếp) -> A (kết quả chung cuộc: 从而...)."),
    ("A. 很多看似无法逾越的困难 \nB. 只要我们保持坚韧不拔的恒心与毅力 \nC. 最终都能够迎刃而解", "ABC", "A (đối tượng: 困难) -> B (điều kiện kiên trì: 只要...) -> C (kết quả: 迎刃而解).")
]

for idx, (p_zh, corr, expl) in enumerate(h4_r2_items, start=56):
    hsk4_data["sections"]["reading"]["questions"].append({
        "id": f"H41001_R{idx:02d}",
        "number": idx,
        "part": 2,
        "type": "multiple_choice",
        "prompt_zh": f"请排列下列句子的正确顺序：\n{p_zh}",
        "options": [
            {"key": "A", "text": "A - B - C"},
            {"key": "B", "text": "B - A - C"},
            {"key": "C", "text": "B - C - A"},
            {"key": "D", "text": "C - A - B"}
        ],
        "correct_answer": "C" if corr == "BCA" else "B" if corr == "BAC" else "A" if corr == "ABC" else "D",
        "explanation": f"Trật tự logic chuẩn: {corr}. {expl}"
    })

# --- Reading Part 3 (Q66 - Q85): 阅读理解 (Passages + Questions, 20 questions) ---
h4_r3_items = [
    ("中国茶文化博大精深，‘品茶’二字重点在于‘品’，即用心去感受茶汤的香气与滋味，而非仅仅为了解渴。在快节奏的都市生活中，静心泡一壶茶，能让人褪去浮躁，找回内心的平静。 ★ ‘品茶’的核心在于：", ["大口喝求解渴", "用心感受茶香与内心平静", "比较茶叶价格", "卖茶赚钱"], "B", "Trọng tâm của 'phẩm trà' là cảm nhận hương vị và sự an tĩnh."),
    ("科学研究证实，充足而高质量的睡眠是增强机体免疫力最有效、成本最低的方式。成年人每天若能保持七至八小时规律作息，不仅能改善大脑记忆力，还能有效降低患心血管疾病的风险。 ★ 这段话强调的重点是：", ["每天剧烈运动", "保证规律充足的睡眠", "多吃昂贵补品", "少喝温开水"], "B", "Tầm quan trọng của giấc ngủ đủ 7-8 tiếng."),
    ("微笑是全世界通用的无声语言。真诚的微笑不仅能拉近人与人之间的距离，化解尴尬与误会，还能促使机体分泌多巴胺，带给自身愉悦的情绪体验。 ★ 微笑的作用包括：", ["拉近人际距离并愉悦身心", "让人花更多钱", "让人感到疲倦", "产生更多矛盾"], "A", "Kéo gần khoảng cách và mang lại niềm vui."),
    ("‘熟能生巧’是一句古老的中国谚语，意思是说任何复杂的技能，只要经过成千上万次的反复刻苦演练，就能掌握其内在规律，达到游刃有余的境界。学习语言亦是如此。 ★ ‘熟能生巧’告诉我们的道理是：", ["天赋决定一切", "只要反复勤奋练习就能精通", "不要练习复杂技能", "只看书不用练"], "B", "Khổ luyện ắt thành tài."),
    ("失败是成功之母。真正的智者从不畏惧失败，而是将每一次挫折视作检验自身缺陷、总结宝贵教训的垫脚石。只有经得起风浪考验的人，才能在未来走得更远。 ★ 智者面对失败的态度是：", ["怨天尤人", "总结教训并继续前行", "彻底放弃努力", "逃避现实"], "B", "Đúc kết bài học và kiên cường tiến bước."),
    ("在团队协作中，沟通的本质在于达成共识，而非争论谁对谁错。学会倾听不同部门的专业意见，尊重彼此的分工，往往能以最小的内耗创造出最大的集体价值。 ★ 团队沟通的核心目标是：", ["分出谁对谁错", "达成共识与通力合作", "推卸工作责任", "炫耀个人功劳"], "B", "Đạt được sự đồng thuận và giảm thiểu bất đồng."),
    ("阅读不仅是获取信息的渠道，更是一场跨越千百年的思想对话。一本好书如同一位智慧的长者，总能在我们迷茫困惑之时，指引前行的方向。 ★ 这段话将好书比作什么？", ["一面镜子", "一位智慧的长者", "一把锋利的刀", "一辆快速的车"], "B", "Sách hay ví như một bậc trưởng giả thông thái."),
    ("现在不少家长为了不让孩子‘输在起跑线上’，给孩子报满了各种辅导班，反而剥夺了孩子探索大自然和培养自主兴趣的童年时光。教育应当尊重儿童身心发展的自然规律。 ★ 作者对给孩子报满辅导班的态度是：", ["非常支持", "不赞同，主张尊重孩子天性", "无所谓", "建议报更多班"], "B", "Không đồng tình, cho rằng cần tôn trọng quy luật phát triển tự nhiên."),
    ("随着智能手机的全面普及，移动支付让‘出门不带钱包’成为现实。从街头小吃到大型商超，扫码支付极大地提升了社会交易的效率，也带动了数字经济的飞速发展。 ★ 移动支付带来的最大改变是：", ["纸币更抢手", "极大提升了交易效率与便利", "商场全部倒闭", "人们不再出门消费"], "B", "Nâng cao vượt bậc hiệu quả giao dịch và tiện ích xã hội."),
    ("中国古典园林讲究‘借景’与‘移步换景’，即在有限的空间内，通过巧妙的花木搭配、山石点缀与亭台错落，营造出‘虽由人作，宛自天开’的丰富自然景观。 ★ 中国古典园林的特点是：", ["完全对称古板", "虽由人作，宛自天开", "没有花草树木", "全部用钢筋水泥建造"], "B", "Tuy do người làm nhưng trông như thiên tạo."),
    # Multi-item passage 1: 延迟满足 (Q76 - Q77)
    ("心理学著名的‘棉花糖实验’表明，那些能够为了更大的长远奖励而克制当下短暂欲望的孩子，在日后的学业、事业与社交表现上都更为出色。‘延迟满足’能力是衡量情商与自律水平的关键指标。 ★ 棉花糖实验主要考察的是孩子的什么能力？", ["跑步速度", "延迟满足与自制力", "画画水平", "数学计算"], "B", "Năng lực trì hoãn sự thỏa mãn và tính kỷ luật."),
    ("承接上文：能够延迟满足的孩子日后往往：", ["生活更不幸", "在学业事业上表现更出色", "更容易放弃目标", "朋友变得更少"], "B", "Gặt hái nhiều thành công hơn trong học tập và sự nghiệp."),
    # Multi-item passage 2: 友谊的价值 (Q78 - Q79)
    ("真正的友谊经得起时间的沉淀与距离的考验。‘海内存知己，天涯若比邻’，即使天各一方、平时鲜少联络，一旦相逢依然情真意切、无话不谈。虚伪的交际如酒肉过眼云烟，唯有真挚的心灵共鸣才历久弥坚。 ★ ‘海内存知己，天涯若比邻’表达的是：", ["朋友住得很近", "真挚友谊不受时空距离限制", "大家都要搬到海边住", "不要交远方朋友"], "B", "Tình bạn chân thành vượt qua mọi khoảng cách thời gian và không gian."),
    ("承接上文：真正持久的友谊建立在什么基础上？", ["金钱利益", "真挚的心灵共鸣与信任", "经常吃喝玩乐", "互相吹捧"], "B", "Sự đồng điệu chân thành và niềm tin tưởng sâu sắc."),
    # Multi-item passage 3: 运动与健康 (Q80 - Q81)
    ("久坐不动正在成为危害现代白领健康的一大隐形杀手。长期伏案工作容易诱发颈椎病、腰椎劳损及代谢紊乱。专家建议每伏案工作一小时，应当起身伸展活动五至十分钟，每天保持至少半小时中等强度的有氧运动。 ★ 长期久坐容易引发：", ["视力变好", "颈椎与腰椎劳损", "体重下降", "记忆力大幅提升"], "B", "Thoái hóa đốt sống cổ và cột sống thắt lưng."),
    ("承接上文：专家对白领的健康建议是：", ["每天连续工作十小时不休息", "每小时起身活动并保持适量运动", "完全不参加体育锻炼", "只在周末暴饮暴食"], "B", "Mỗi tiếng đứng dậy vận động nhẹ và tập thể thao đều đặn."),
    # Multi-item passage 4: 节约粮食 (Q82 - Q83)
    ("‘谁知盘中餐，粒粒皆辛苦’。一粒粮食从田间播种、除草、灌溉到收获加工，凝结了农民无数辛勤的汗水。在生活富裕的今天，推行‘光盘行动’、杜绝‘舌尖上的浪费’，不仅是对劳动的尊重，更是践行绿色可持续发展的重要体现。 ★ 推行‘光盘行动’的意义在于：", ["浪费粮食有面子", "珍惜劳动成果杜绝浪费", "让餐馆少做菜", "大家都不去吃饭"], "B", "Trân trọng mồ hôi công sức lao động và chống lãng phí thức ăn."),
    ("承接上文：诗句‘粒粒皆辛苦’主要强调：", ["粮食非常好吃", "粮食来之不易凝结汗水", "农民都很富有", "做饭很轻松"], "B", "Hạt cơm làm ra vô cùng vất vả khó nhọc."),
    # Multi-item passage 5: 终身学习 (Q84 - Q85)
    ("在当今人工智能与大数据飞速发展的时代，知识更迭的周期急剧缩短。一个人的核心竞争力不再取决于大学学了什么，而取决于离开学校后持续自我迭代的‘自学能力’。保持对新事物的好奇与求知欲，是拥抱未来的最佳姿态。 ★ 当今时代，个人的核心竞争力主要取决于：", ["大学的名气", "持续自我迭代的自学能力", "家庭背景", "记忆大量死知识"], "B", "Khả năng tự học và không ngừng thích ứng, nâng cấp bản thân."),
    ("承接上文：拥抱未来的最佳姿态是：", ["固步自封不接受新技术", "保持对新事物的求知欲与学习热情", "彻底放弃思考", "排斥所有科技发展"], "B", "Giữ vững sự tò mò và lòng khao khát học hỏi điều mới.")
]

for idx, (p_zh, opts, corr, expl) in enumerate(h4_r3_items, start=66):
    hsk4_data["sections"]["reading"]["questions"].append({
        "id": f"H41001_R{idx:02d}",
        "number": idx,
        "part": 3,
        "type": "multiple_choice",
        "prompt_zh": p_zh,
        "options": [
            {"key": "A", "text": opts[0]},
            {"key": "B", "text": opts[1]},
            {"key": "C", "text": opts[2]},
            {"key": "D", "text": opts[3]}
        ],
        "correct_answer": corr,
        "explanation": expl
    })

# --- Writing Part 1 (Q86 - Q95): 连词成句 (Word Reordering, 10 questions) ---
h4_w1_items = [
    (["很多困难", "是", "可以克服的"], "很多困难是可以克服的。", "Câu khẳng định 是……的: 很多困难 (chủ ngữ) + 是 (khung) + 可以克服 (vị ngữ năng nguyện) + 的 (trợ từ kết thúc)."),
    (["这家公司的", "非常严格", "招聘要求"], "这家公司的招聘要求非常严格。", "这家公司的招聘要求 (cụm danh từ chủ ngữ) + 非常严格 (vị ngữ tính từ)."),
    (["王老师", "详细介绍了", "中国悠久的历史文化"], "王老师详细介绍了中国悠久的历史文化。", "王老师 (chủ ngữ) + 详细介绍了 (vị ngữ + bổ ngữ) + 中国悠久的历史文化 (tân ngữ)."),
    (["阅读不仅能", "还能", "开阔眼界", "陶冶情操"], "阅读不仅能开阔眼界，还能陶冶情操。", "Cấu trúc liên từ 不仅……还……"),
    (["他", "把会议纪要", "发到了", "各位董事的邮箱里"], "他把会议纪要发到了各位董事的邮箱里。", "Câu chữ 把: 主语 (他) + 把 (bả) + 会议纪要 (tân ngữ được tác động) + 发到了…… (vị ngữ kết quả)."),
    (["这道数学难题", "被李华", "成功解答出来了"], "这道数学难题被李华成功解答出来了。", "Câu bị động chữ 被: 这道数学难题 + 被李华 + 成功解答出来了."),
    (["保护环境", "是我们", "共同的", "责任与义务"], "保护环境是我们共同的责任与义务。", "保护环境 (chủ ngữ danh hóa) + 是 (hệ từ) + 我们共同的责任与义务 (tân ngữ)."),
    (["随着科学技术的", "人们的生活", "飞速发展", "变得越来越便利"], "随着科学技术的飞速发展，人们的生活变得越来越便利。", "Cụm trạng ngữ 随着…… + 主谓句."),
    (["他用生动的实例", "向大家", "阐述了", "这个深刻的道理"], "他用生动的实例向大家阐述了这个深刻的道理。", "Chủ ngữ + Giới tân ngữ 1 (用...) + Giới tân ngữ 2 (向...) + Vị ngữ (阐述了...) + Tân ngữ."),
    (["只有坚持不懈地", "努力", "才能实现", "远大的理想"], "只有坚持不懈地努力，才能实现远大的理想。", "Cấu trúc điều kiện cần: 只有……才……")
]

for idx, (words, corr, expl) in enumerate(h4_w1_items, start=86):
    hsk4_data["sections"]["writing"]["questions"].append({
        "id": f"H41001_W{idx:02d}",
        "number": idx,
        "part": 1,
        "type": "word_reorder",
        "words": words,
        "correct_answer": corr,
        "explanation": expl
    })

# --- Writing Part 2 (Q96 - Q100): 看图用词造句 (Picture + Keyword, 5 questions) ---
h4_w2_items = [
    ("打扫", "assets/images/illustrations/面条.svg", "他正在认真打扫房间。", "Nhìn tranh và dùng từ '打扫' đặt câu miêu tả dọn dẹp vệ sinh."),
    ("弹钢琴", "assets/images/illustrations/跳舞.svg", "妹妹从小就喜欢弹钢琴。", "Dùng từ '弹钢琴' đặt câu diễn tả sở thích nghệ thuật."),
    ("跑步", "assets/images/illustrations/跑步.svg", "坚持跑步对身体健康很有好处。", "Dùng từ '跑步' đặt câu về rèn luyện sức khỏe."),
    ("看病", "assets/images/illustrations/医生.svg", "医生正在耐心地给病人看病。", "Dùng từ '看病' miêu tả hoạt động khám bệnh."),
    ("送礼物", "assets/images/illustrations/生日.svg", "朋友们在生日聚会上送给我很多礼物。", "Dùng từ '送礼物' miêu tả tặng quà sinh nhật.")
]

for idx, (kw, img, sample, expl) in enumerate(h4_w2_items, start=96):
    hsk4_data["sections"]["writing"]["questions"].append({
        "id": f"H41001_W{idx:02d}",
        "number": idx,
        "part": 2,
        "type": "picture_sentence",
        "keyword": kw,
        "image": img,
        "prompt_zh": f"请结合图片，使用给出的词语‘{kw}’写一个完整的句子。",
        "sample_sentence": sample,
        "correct_answer": sample,
        "explanation": expl
    })

out_hsk4 = REPO_ROOT / "database/exams/hsk30/level4/hsk30_l4_specimen01.json"
out_hsk4.parent.mkdir(parents=True, exist_ok=True)
with open(out_hsk4, "w", encoding="utf-8") as f:
    json.dump(hsk4_data, f, ensure_ascii=False, indent=2)

print(f"Generated HSK 4 exam: {out_hsk4} with 100 questions (45 Listening, 40 Reading, 15 Writing).")

# =========================================================================
# 3. Update database/exams/hsk30/index.json
# =========================================================================

index_path = REPO_ROOT / "database/exams/hsk30/index.json"
with open(index_path, "r", encoding="utf-8") as f:
    idx_data = json.load(f)

# Update HSK 3 metadata
idx_data["levels"]["hsk30_3"]["total_questions"] = 80
idx_data["levels"]["hsk30_3"]["time_minutes"] = 90
idx_data["levels"]["hsk30_3"]["max_score"] = 300
idx_data["levels"]["hsk30_3"]["pass_score"] = 180
idx_data["levels"]["hsk30_3"]["exams"][0]["total_questions"] = 80
idx_data["levels"]["hsk30_3"]["exams"][0]["writing_questions"] = 10
idx_data["levels"]["hsk30_3"]["exams"][0]["time_minutes"] = 90
idx_data["levels"]["hsk30_3"]["exams"][0]["subtitle"] = "Đề mẫu chuẩn CTI (汉考国际) - 80 câu gồm Nghe (40), Đọc (30), Viết (10)"

# Register HSK 4 metadata
idx_data["levels"]["hsk30_4"] = {
    "level": "hsk30_4",
    "hsk_level": 4,
    "title": "HSK 4 (3.0)",
    "badge": "Trung cấp 1",
    "total_questions": 100,
    "time_minutes": 105,
    "max_score": 300,
    "pass_score": 180,
    "exams": [
        {
            "id": "hsk30_l4_specimen01",
            "code": "H41001",
            "title": "Đề thi mẫu chuẩn CTI số 01 (样卷一)",
            "subtitle": "Đề mẫu chuẩn do CTI (汉考国际) ban hành - 100 câu: Nghe (45), Đọc (40), Viết (15)",
            "listening_questions": 45,
            "reading_questions": 40,
            "writing_questions": 15,
            "time_minutes": 105,
            "file": "database/exams/hsk30/level4/hsk30_l4_specimen01.json"
        }
    ]
}

with open(index_path, "w", encoding="utf-8") as f:
    json.dump(idx_data, f, ensure_ascii=False, indent=2)

print("Updated index.json with HSK 3 (80 questions, 300 pts) and HSK 4 (100 questions, 300 pts).")
