#!/usr/bin/env python3
"""
tools/build_wanwu_volume4.py
Builds Volume 4 (Chapters 64 to 85) of 《万物有意思》:
- Guaranteed 100% Pinyin coverage on all Chinese character tokens
- Sino-Vietnamese (Hán-Việt) on every token
- High-quality Vietnamese translations
- 3 comprehension quiz questions per chapter
- WebP illustration linked to book page
"""

import sys
from pathlib import Path
from wanwu_builder_common import build_and_save_story, update_manifest_all

REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT / "tools"))
from build_wanwu_book_series import get_all_book_stories


def get_volume4_stories():
    stories = []
    prebuilt = {s["title"]["zh"].split("：")[0].replace("“", "").replace("”", "").strip(): s for s in get_all_book_stories()}

    def adapt_prebuilt(key, sid, ch_no, sp, ep, vi_title=None):
        raw = prebuilt[key]
        raw["id"] = sid
        raw["chapter_no"] = ch_no
        raw["book_volume"] = 4
        raw["book_page_start"] = sp
        raw["book_page_end"] = ep
        raw["page_display"] = f"Trang {sp} - {ep}"
        if vi_title:
            raw["title"]["vi"] = vi_title
        raw["description_vi"] = f"📖 Trang {sp} - {ep} · {raw['description_vi'].split('·')[-1].strip() if '·' in raw['description_vi'] else raw['description_vi']}"
        return raw

    # 64. 钱荒
    stories.append({
        "id": "wanwu_story_064",
        "chapter_no": 64,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 675,
        "book_page_end": 685,
        "page_display": "Trang 675 - 685",
        "title": {"zh": "钱荒：困扰千年的治国难题", "vi": "Nạn khan tiền: Bài toán kinh tế nhức nhối ngàn năm"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪙",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 675 - 685 · Nạn thiếu tiền đồng thời Tống và phát minh tiền giấy Giao Tử sớm nhất thế giới ở Tứ Xuyên.",
        "sentences_data": [
            ("在中国古代商品经济繁荣的宋代，市场上却经常发生铜钱严重短缺的‘钱荒’现象。",
             "Zài Zhōngguó gǔdài shāngpǐn jīngjì fánróng de Sòngdài, shìchǎng shàng què jīngcháng fāshēng tóngqián yánzhòng duǎnquē de ‘qiánhuāng’ xiànxiàng.",
             "Vào thời Tống khi kinh tế thương nghiệp hưng thịnh, trên thị trường lại thường xuyên xảy ra nạn 'khan tiền' đồng nghiêm trọng."),
            ("由于铜矿开采有限，加之大量铜钱流向海外贸易或被民间熔铸成铜器，货币严重供不应求。",
             "Yóuyú tóngkuàng kāicǎi yǒuxiàn, jiāzhī dàliàng tóngqián liúxiàng hǎiwài màoyì huò bèi mínjiān róngzhù chéng tóngqì, huòbì yánzhòng gōngbùyìngqiú.",
             "Do quặng đồng khai thác hạn chế, tiền đồng lại chảy ra nước ngoài hoặc bị đúc thành đồ đồng gia dụng, khiến tiền tệ thiếu hụt lớn."),
            ("在商业发达的四川地区，由于铁钱沉重不易携带，富商们联合发行了名为‘交子’的纸质凭证。",
             "Zài shāngyè fādá de Sìchuān dìqū, yóuyú tiěqián chénzhòng bùyì xiédài, fùshāngmen liánhé fāxíng le míngwéi ‘jiāozǐ’ de zhǐzhì píngzhèng.",
             "Tại đất Tứ Xuyên sầm uất, vì tiền sắt quá nặng nề khó mang theo, các phú thương đã cùng phát hành tín phiếu giấy gọi là 'Giao Tử'."),
            ("这是人类历史上最早出现的纸币，后来被北宋官方正式接管并设立专营机构印发。",
             "Zhè shì rénlèi lìshǐ shàng zuì zǎo chūxiàn de zhǐbì, hòulái bèi Běisòng guānfāng zhèngshì jiēguǎn bìng shèlì zhuānyíng jīgòu yìnfā.",
             "Đây là tiền giấy xuất hiện sớm nhất trong lịch sử nhân loại, sau đó được triều đình Bắc Tống tiếp quản và lập cơ quan phát hành."),
            ("纸币的诞生有效缓解了货币短缺危机，开创了人类金融货币体系崭新的历史篇章。",
             "Zhǐbì de dànshēng yǒuxiào huǎnjiě le huòbì duǎnquē wēijī, kāichuàng le rénlèi jīnróng huòbì tǐxì zhǎnxīn de lìshǐ piānzhāng.",
             "Sự ra đời của tiền giấy giải tỏa hữu hiệu khủng hoảng thiếu tiền, mở ra trang sử mới cho hệ thống tiền tệ thế giới.")
        ],
        "preferred_spotlight": ["经济", "发生", "商业", "正式"],
        "quiz": [
            {"id": "q1", "question_vi": "Loại tiền giấy đầu tiên trên thế giới xuất hiện tại khu vực nào ở Trung Quốc?",
             "options_vi": ["Vùng đất Tứ Xuyên (Bắc Tống)", "Bán đảo Sơn Đông", "Đảo Đài Loan"], "answer": 0, "explanation_vi": "Tiền giấy Giao Tử ra đời đầu tiên tại Tứ Xuyên vào thời Bắc Tống."},
            {"id": "q2", "question_vi": "Tên gọi của tờ tiền giấy sớm nhất lịch sử nhân loại là gì?",
             "options_vi": ["Giao Tử (交子)", "Bảo sao", "Đô la"], "answer": 0, "explanation_vi": "Tiền giấy thời Tống có tên gọi là Giao Tử."},
            {"id": "q3", "question_vi": "Nguyên nhân chính dẫn tới nạn 'khan tiền' (钱荒) thời cổ đại là gì?",
             "options_vi": ["Khai thác kim loại hạn chế trong khi thương mại bùng nổ, tiền đồng bị tích trữ hoặc đúc thành đồ dùng", "Người dân không thích mua bán", "Hoàng đế cấm xài tiền"], "answer": 0, "explanation_vi": "Sự phát triển mạnh mẽ của buôn bán vượt xa sản lượng đúc tiền đồng dẫn tới khan hiếm tiền mặt."}
        ]
    })

    # 65. 腊赐
    stories.append({
        "id": "wanwu_story_065",
        "chapter_no": 65,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 685,
        "book_page_end": 691,
        "page_display": "Trang 685 - 691",
        "title": {"zh": "腊赐：汉代始有年终奖", "vi": "Lạp tứ: Thưởng tết nguyên đán thời Hán"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🧧",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 685 - 691 · Chế độ thưởng tết bằng tiền bạc, thịt bò, rượu ngon và tơ lụa của các vị hoàng đế dành cho quan lại.",
        "sentences_data": [
            ("年终岁尾领取一笔丰厚的年终奖，是现代职场人一年中最期盼的欣喜时刻。",
             "Niánzhōng-suìwěi lǐngqǔ yì bǐ fēnghòu de niánzhōngjiǎng, shì xiàndài zhíchǎngrén yì nián zhōng zuì qīpàn de xīnxǐ shíkè.",
             "Cuối năm nhận một khoản tiền thưởng tết hậu hĩnh là khoảnh khắc người đi làm mong đợi nhất sau một năm vất vả."),
            ("其实早在两千多年前的东汉时期，朝廷就已经建立了制度化的年终奖励——‘腊赐’。",
             "Qíshí zǎo zài liǎngqiān duō nián qián de Dōnghàn shíqī, cháotíng jiù yǐjīng jiànlì le zhìdùhuà de niánzhōng jiǎnglì——‘Làcì’.",
             "Thực ra hơn hai ngàn năm trước thời Đông Hán, triều đình đã lập ra chế độ khen thưởng cuối năm quy củ gọi là 'Lạp tứ'."),
            ("每逢岁末‘腊日’祭祀之后，皇帝会根据官员品级赏赐大量的钱币、牛肉、美酒以及上等丝绸。",
             "Měiféng suìmò ‘Làrì’ jìsì zhīhòu, huángdì huì gēnjù guānyuán pǐnjí shǎngcì dàliàng de qiánbì, niúròu, měijiǔ yǐjí shàngděng sīchóu.",
             "Mỗi dịp tế lễ cuối năm ngày Lạp Nhật, hoàng đế căn cứ phẩm hàm ban thưởng lượng lớn tiền tài, thịt bò, rượu ngon và lụa là."),
            ("高级官员如大将军、三公所领取的腊赐极其丰厚，甚至超过了他们一整年的日常俸禄收入。",
             "Gāojí guānyuán rú dàjiāngjūn, sāngōng suǒ lǐngqǔ de làcì jíqí fēnghòu, shènzhì chāoguò le tāmen yì zhěng nián de rìcháng fènglù shōurù.",
             "Quan lại cấp cao như Đại tướng quân, Tam công nhận phần thưởng cực kỳ lớn, thậm chí vượt qua cả bổng lộc cả một năm."),
            ("这项优厚待遇不仅体现了朝廷对百官辛劳的犒劳慰问，更在冬日里增添了阖家欢乐的年节温情。",
             "Zhè xiàng yōuhòu dàiyù bùjǐn tǐxiàn le cháotíng duì bǎiguān xīnláo de kàoláo wèiwèn, gèng zài dōngrì lǐ zēngtiān le héjiā-huānlè de niánjié wēnqíng.",
             "Chế độ đãi ngộ này không chỉ thể hiện sự thăm hỏi của hoàng cung mà còn mang đến không khí ấm áp sum vầy trong những ngày đông giá rét.")
        ],
        "preferred_spotlight": ["建立", "制度", "根据", "收入"],
        "quiz": [
            {"id": "q1", "question_vi": "Chế độ thưởng tết 'Lạp tứ' (腊赐) được ghi chép quy củ đầu tiên vào triều đại nào?",
             "options_vi": ["Thời Đông Hán", "Thời nhà Đường", "Thời nhà Thanh"], "answer": 0, "explanation_vi": "Hậu Hán Thư ghi chép rất rõ về khoản thưởng 'Lạp tứ' cuối năm của triều đình Đông Hán."},
            {"id": "q2", "question_vi": "Các vật phẩm thường được vua ban thưởng trong dịp Lạp tứ gồm những gì?",
             "options_vi": ["Tiền bạc, thịt bò, rượu ngon và gấm vóc lụa là", "Bột mì mốc", "Vỏ sò biển"], "answer": 0, "explanation_vi": "Quan chức nhận tiền đồng, bò ngon, rượu hảo hạng để ăn Tết sung túc."},
            {"id": "q3", "question_vi": "Quy mô phần thưởng tết của các đại thần cấp cao thời Hán có giá trị ra sao?",
             "options_vi": ["Rất lớn, có thể bằng hoặc vượt lương bổng cả năm", "Chỉ mang tính tượng trưng vài xu", "Chỉ là một củ cải"], "answer": 0, "explanation_vi": "Đại thần hàng Tam công được thưởng tới 20 vạn tiền và hàng trăm cân thịt."}
        ]
    })

    # 66. 假日
    stories.append({
        "id": "wanwu_story_066",
        "chapter_no": 66,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 691,
        "book_page_end": 696,
        "page_display": "Trang 691 - 696",
        "title": {"zh": "假日：国人休假始于秦汉", "vi": "Nghỉ lễ: Chế độ nghỉ phép khởi từ Tần Hán"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🏖️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 691 - 696 · Lệ 'Hưu mộc' tắm rửa nghỉ ngơi cứ 5 ngày một lần thời Hán và tuần nghỉ 'Tuần hưu' thời Đường.",
        "sentences_data": [
            ("忙碌工作之余能够享受法定节假日与双休日，是保障劳动者身心健康的基本制度。",
             "Mánglù gōngzuò zhīyú nénggòu xiǎngshòu fǎdìng jiérì yǔ shuāngxiūrì, shì bǎozhàng láodòngzhě shēnxīn jiànkāng de jīběn zhìdù.",
             "Sau giờ làm việc bận rộn được nghỉ ngơi ngày lễ và cuối tuần là chế độ cơ bản bảo vệ sức khỏe người lao động."),
            ("在古代中国，公务休假制度早在汉代就已经正式确立，被称为‘休沐’。",
             "Zài gǔdài Zhōngguó, gōngwù xiūjià zhìdù zǎo zài Hàndài jiù yǐjīng zhèngshì quèlì, bèi chēng wéi ‘xiūmù’.",
             "Ở Trung Quốc cổ đại, chế độ nghỉ phép công vụ từ thời Hán đã được xác lập chính thức với tên gọi 'Hưu mộc'."),
            ("根据汉律规定，官员在衙署连续办公五天后，可以获得一天假期回家沐浴洗头、探望妻儿。",
             "Gēnjù Hànlǜ guīdìng, guānyuán zài yáshǔ liánxù bàngōng wǔ tiān hòu, kěyǐ huòdé yì tiān jiàqī huíjiā mùyù xǐtóu, tànwàng qī'ér.",
             "Theo quy định luật Hán, quan lại làm việc 5 ngày liên tiếp trong nha môn sẽ được nghỉ 1 ngày về nhà tắm gội, thăm nom vợ con."),
            ("到了唐代，朝廷改为每十天休假一天，称为‘旬休’，同时在元宵、端午、中秋等传统佳节普遍放假三天至七天。",
             "Dàole Tángdài, cháotíng gǎiwéi měi shí tiān xiūjià yì tiān, chēng wéi ‘xúnxiū’, tóngshí zài Yuánxiāo, Duānwǔ, Zhōngqiū děng chuántǒng jiājié pǔbiàn fàngjià sān tiān zhì qī tiān.",
             "Đến thời Đường, đổi thành cứ 10 ngày nghỉ 1 ngày gọi là 'Tuần hưu', đồng thời các tiết Nguyên tiêu, Đoan ngọ, Trung thu đều cho nghỉ 3 đến 7 ngày."),
            ("古代休假不仅让官吏得以调养生息，也促进了节日民俗文化的世代传承与社会繁荣。",
             "Gǔdài xiūjià bùjǐn ràng guānlì déyǐ tiáoyǎng shēngxī, yě cùjìn le jiérì mínsú wénhuà de shìdài chuánchéng yǔ shèhuì fánróng.",
             "Chế độ nghỉ phép xưa không chỉ giúp quan lại hồi phục sức lực mà còn thúc đẩy phong tục tập quán phát triển bền vững.")
        ],
        "preferred_spotlight": ["正式", "规定", "传统", "促进"],
        "quiz": [
            {"id": "q1", "question_vi": "Chế độ nghỉ phép của quan chức thời Hán gọi là 'Hưu mộc' (休沐) có chu kỳ thế nào?",
             "options_vi": ["Làm việc 5 ngày được nghỉ 1 ngày để tắm gội, về với gia đình", "Làm việc 1 năm mới được nghỉ 1 giờ", "Không bao giờ được nghỉ"], "answer": 0, "explanation_vi": "Thời Hán quan lại cứ làm việc 5 ngày lại có 1 ngày nghỉ tắm gội (Hưu mộc)."},
            {"id": "q2", "question_vi": "Vào thời Đường, chu kỳ ngày nghỉ thông thường được đổi thành 'Tuần hưu' (旬休), tức là bao nhiêu ngày nghỉ 1 lần?",
             "options_vi": ["Cứ 10 ngày làm việc thì nghỉ 1 ngày", "Mỗi tháng nghỉ 29 ngày", "3 năm nghỉ 1 lần"], "answer": 0, "explanation_vi": "Một tuần thời xưa là 10 ngày (tuần giáp), quan chức được nghỉ ngày thứ 10."},
            {"id": "q3", "question_vi": "Thời Đường có cho nghỉ phép trong các dịp lễ tết truyền thống không?",
             "options_vi": ["Có, các dịp tết Nguyên Đán, Hàn Thực, Đoan Ngọ được nghỉ từ 3 đến 7 ngày", "Hoàn toàn cấm nghỉ", "Bắt làm ca đêm"], "answer": 0, "explanation_vi": "Triều Đường có lịch nghỉ lễ rất phong phú cho các đại lễ tiết trong năm."}
        ]
    })

    # 67. 临时工
    stories.append({
        "id": "wanwu_story_067",
        "chapter_no": 67,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 696,
        "book_page_end": 705,
        "page_display": "Trang 696 - 705",
        "title": {"zh": "临时工：从“白役”到“替罪羊”", "vi": "Lao động thời vụ: Từ 'Bạch dịch' nha môn đến phận gánh nạn"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "👥",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 696 - 705 · Những người phụ việc không biên chế trong quan nha cổ đại và số phận trôi nổi nơi công quyền.",
        "sentences_data": [
            ("在古代地方州县衙门里，除了朝廷正式任命的知县与有编制的正役差役之外，还有庞大的雇佣群体。",
             "Zài gǔdài dìfāng zhōuxiàn yámén lǐ, chúle cháotíng zhèngshì rènmìng de zhīxiàn yǔ yǒu biānzhì de zhèngyì chāiyì zhīwài, hái yǒu pángdà de gùyōng qúntǐ.",
             "Trong nha môn phủ huyện thời xưa, ngoài quan Tri huyện và sai dịch có biên chế chính thức, còn có lực lượng làm thuê đông đảo."),
            ("由于衙门事务繁重而编制名额严格受限，官员们往往私下招聘大量编制外的临时帮工，称为‘白役’。",
             "Yóuyú yámén shìwù fánzhòng ér biānzhì míng'é yángé shòuxiàn, guānyuánmen wǎngwǎng sīxià zhāopìn dàliàng biānzhìwài de línshí bānggōng, chēng wéi ‘báiyì’.",
             "Do việc quan bận rộn mà chỉ tiêu biên chế siết chặt, các quan thường tự tuyển thêm phụ việc thời vụ ngoài biên chế gọi là 'Bạch dịch'."),
            ("白役们虽然没有朝廷发放的固定薪饷，却常利用跟随公差下乡催粮纳税的机会谋取私利。",
             "Báiyìmen suīrán méiyǒu cháotíng fāfàng de gùdìng xīnxxiǎng, què cháng lìyòng gēnsuí gōngchāi xiàxiāng cuīliáng nàshuì de jīhuì móuqǔ sīlì.",
             "Đám bạch dịch dù không có lương bổng chính thức từ quốc khố, nhưng hay dựa bóng sai dịch xuống làng sách nhiễu kiếm tiền riêng."),
            ("一旦衙署发生徇私舞弊或激起民怨，官府往往立即将全部罪责推到这些白役身上，将其作为替罪羊开除法办。",
             "Yídàn yáshǔ fāshēng xùnsī-wǔbì huò jīqǐ mínyuàn, guānfǔ wǎngwǎng lìjí jiāng quánbù zuìzé tuī dào zhèxiē báiyì shēnshang, jiāng qí zuòwéi tìzuìyáng kāichú fǎbàn.",
             "Mỗi khi nha môn xảy ra tệ nạn gian lận bị phát giác, quan trên thường đổ vấy tội lỗi lên đầu đám bạch dịch làm bia đỡ đạn trừng phạt."),
            ("古代白役的生存困境，生动折射出封建基层官僚制度中管理失范与权力失衡的深层弊端。",
             "Gǔdài báiyì de shēngcún kùnjìng, shēngdòng zhéshè chū fēngjiàn jīcéng guānliáo zhìdù zhōng guǎnlǐ shīfàn yǔ quánlì shīhéng de shēncéng bìduān.",
             "Nghịch cảnh của bạch dịch phản chiếu mặt trái trong quản lý cơ chế hành chính và mất cân bằng quyền lực thời phong kiến.")
        ],
        "preferred_spotlight": ["正式", "严格", "发生", "管理"],
        "quiz": [
            {"id": "q1", "question_vi": "Trong nha môn phong kiến, 'Bạch dịch' (白役) là những người như thế nào?",
             "options_vi": ["Người làm việc thời vụ, giúp việc ngoài biên chế chính thức của triều đình", "Đầu bếp hoàng cung", "Quan đại thần"], "answer": 0, "explanation_vi": "Bạch dịch là lực lượng sai dịch làm việc tự phát ngoài biên chế công chức."},
            {"id": "q2", "question_vi": "Tại sao nha môn lại thuê nhiều lao động ngoài biên chế như vậy?",
             "options_vi": ["Việc quan nhiều nhưng chỉ tiêu biên chế chính thức bị triều đình giới hạn nghiêm ngặt", "Để đi săn bắn", "Để tổ chức thi ca múa"], "answer": 0, "explanation_vi": "Biên chế nhà nước ít ỏi không gánh nổi sổ sách, thu thuế nên quan huyện phải thuê thêm ngoài."},
            {"id": "q3", "question_vi": "Số phận thường thấy của các chân phụ việc 'Bạch dịch' khi xảy ra sai phạm là gì?",
             "options_vi": ["Bị quy hết trách nhiệm làm 'vật tế thần' gánh tội thay cho quan trên", "Được thăng chức tước vương", "Được thưởng nghìn lượng vàng"], "answer": 0, "explanation_vi": "Họ thường bị cách chức và đưa ra chịu đòn thay cho các sai phạm của cấp trên."}
        ]
    })

    # 68. 禁酒
    stories.append({
        "id": "wanwu_story_068",
        "chapter_no": 68,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 705,
        "book_page_end": 715,
        "page_display": "Trang 705 - 715",
        "title": {"zh": "禁酒：都是贪杯惹的祸", "vi": "Lệnh cấm rượu: Men say và những biến cố thời thế"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🍶",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 705 - 715 · Những sắc lệnh cấm rượu nghiêm ngặt để tiết kiệm lương thực và duy trì kỷ cương xã hội trong lịch sử.",
        "sentences_data": [
            ("美酒虽然能够增添宴席气氛与诗意灵感，但在古代却曾屡次遭到统治者的严厉查禁。",
             "Měijiǔ suīrán nénggòu zēngtiān yànxí qìfēn yǔ shīyì línggǎn, dàn zài gǔdài què céng lǚcì zāodào tǒngzhìzhě de yánlì chájìn.",
             "Rượu ngon dù tăng thêm không khí tiệc tùng và cảm hứng thơ ca, nhưng trong lịch sử đã nhiều lần bị triều đình ra lệnh cấm nghiêm ngặt."),
            ("商纣王因沉湎于酒色荒废政事导致灭亡，周公继位后颁布了中国历史上最早的禁酒法令《酒诰》。",
             "Shāng Zhòuwáng yīn chénmiǎn yú jiǔsè huāngfèi zhèngshì dǎozhì mièwáng, Zhōugōng jìwèi hòu bānbù le Zhōngguó lìshǐ shàng zuì zǎo de jìnjiǔ fǎlìng 《Jiǔgào》.",
             "Vua Trụ nhà Thương vì chìm đắm men rượu tửu sắc mà mất nước, Chu Công sau đó đã ban hành đạo luật cấm rượu sớm nhất mang tên Tửu Cáo."),
            ("在农耕时代，酿造大量酒水需要消耗极多的粮食，遇到灾荒战乱年份，朝廷必然颁布严格禁酒令以节约口粮。",
             "Zài nónggēng shídài, niàngzào dàliàng jiǔshuǐ xūyào xiāohào jí duō de liángshi, yùdào zāihuāng zhànluàn niánfèn, cháotíng bìrán bānbù yángé jìnjiǔlìng yǐ jiéyuē kǒuliáng.",
             "Thời kỳ nông nghiệp, nấu rượu tốn rất nhiều ngũ cốc, gặp năm mất mùa hạn hán triều đình buộc phải cấm rượu để dành lương thực."),
            ("三国时期的曹操为了保证军粮供给与整肃军纪，也曾坚决推行全境戒酒政策。",
             "Sānguó shíqī de Cáo Cāo wèile bǎozhèng jūnliáng gōngjǐ yǔ zhěngsù jūnjì, yě céng jiānjué tuīxíng quánjìng jièjiǔ zhèngcè.",
             "Thời Tam Quốc, Tào Tháo vì muốn đảm bảo quân lương và giữ nghiêm quân kỷ cũng thi hành triệt để chính sách cấm rượu."),
            ("从防灾备荒到专卖榷酒以充实国库，古代酒政的收放体现了国家治理在经济与民生之间的动态权衡。",
             "Cóng fángzāi-bèihuāng dào zhuānmài quèjiǔ yǐ chōngshí guókù, gǔdài jiǔzhèng de shōufàng tǐxiàn le guójiā zhìlǐ zài jīngjì yǔ mínshēng zhījiān de dòngtài quánhéng.",
             "Từ phòng dịch đói kém đến việc độc quyền bán rượu sung công, chính sách rượu xưa thể hiện sự cân đối linh hoạt của phép trị quốc.")
        ],
        "preferred_spotlight": ["历史", "严格", "保证", "经济"],
        "quiz": [
            {"id": "q1", "question_vi": "Văn bản pháp luật cấm rượu sớm nhất trong lịch sử Trung Quốc do Chu Công ban hành có tên là gì?",
             "options_vi": ["Tửu Cáo (酒诰)", "Luật Hình thư", "Kinh Thi"], "answer": 0, "explanation_vi": "Chu Công ban hành 'Tửu Cáo' răn dạy con cháu không được say sưa bỏ bê việc nước."},
            {"id": "q2", "question_vi": "Lý do quan trọng nhất khiến triều đình phong kiến thường cấm nấu rượu trong các năm đói kém là gì?",
             "options_vi": ["Nấu rượu hao tốn lượng lớn lúa gạo lương thực của dân", "Rượu làm hỏng ly sứ", "Cạn kiệt nguồn nước suối"], "answer": 0, "explanation_vi": "Ủ rượu tiêu tốn cực nhiều ngũ cốc nên khi mất mùa phải cấm triệt để giữ lương thực ăn."},
            {"id": "q3", "question_vi": "Nhân vật lịch sử thời Tam Quốc nào từng ra lệnh cấm rượu nghiêm ngặt để dồn lương thực nuôi quân?",
             "options_vi": ["Tào Tháo (曹操)", "Lưu Bị", "Tôn Quyền"], "answer": 0, "explanation_vi": "Tào Tháo ban hành lệnh cấm rượu để dự trữ lương thực đánh trận."}
        ]
    })

    # 69. 状元
    stories.append({
        "id": "wanwu_story_069",
        "chapter_no": 69,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 715,
        "book_page_end": 723,
        "page_display": "Trang 715 - 723",
        "title": {"zh": "状元：千年科举的特殊符号", "vi": "Trạng nguyên: Biểu tượng đỉnh cao khoa cử ngàn năm"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "📜",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 715 - 723 · Hành trình 'mười năm đèn sách' của sĩ tử đến ngày vinh quy bái tổ đứng đầu bảng vàng điện thí.",
        "sentences_data": [
            ("在中国实行了一千三百多年的科举考试制度中，‘状元’是所有读书人梦寐以求的最高荣耀。",
             "Zài Zhōngguó shíxíng le yìqiān-sānbǎi duō nián de kējǔ kǎoshì zhìdù zhōng, ‘zhuàngyuan’ shì suǒyǒu dúshūrén mèngmèi-yǐqiú de zuìgāo róngyào.",
             "Trong chế độ thi cử khoa bảng kéo dài hơn 1300 năm, 'Trạng nguyên' là vinh quang tột đỉnh mà mọi sĩ tử đèn sách đều mơ ước."),
            ("在殿试中获得第一名的举子被称为状元，不仅名列一甲第一，更能骑着高头大马巡游御街接受百姓喝彩。",
             "Zài diànshì zhōng huòdé dì-yī míng de jǔzǐ bèi chēng wéi zhuàngyuan, bùjǐn míngliè yījiǎ dì-yī, gèng néng qízhe gāotóu dàmǎ xúnyóu yùjiē jiēshòu bǎixìng hècǎi.",
             "Người đỗ đầu kỳ thi Điện được phong Trạng nguyên, cưỡi ngựa dong ruổi trên phố ngự tiền giữa muôn tiếng reo hò của dân chúng."),
            ("然而考中状元的概率极其微小，全国数以万计的饱学之士往往历经‘十年寒窗’苦读也未必能够中第。",
             "Rán'ér kǎozhòng zhuàngyuan de gàilǜ jíqí wēixiǎo, quánguó shù-yǐ-wàn-jì de bǎoxué-zhīshì wǎngwǎng lìjīng ‘shí nián hánchuāng’ kǔdú yě wèibì nénggòu zhòngdì.",
             "Thế nhưng xác suất đỗ trạng nguyên vô cùng nhỏ nhoi, hàng vạn bậc túc nho trải 'mười năm hàn cửa' khổ học chưa chắc đã đề tên bảng vàng."),
            ("历史上有许多名留青史的杰出状元，例如南宋宁死不屈的民族英雄文天祥，便以满腔正气名垂千古。",
             "Lìshǐ shàng yǒu xǔduō míngliú-qīngshǐ de jiéchū zhuàngyuan, lìrú Nánsòng nìngsǐ-bùqū de mínzú yīngxióng Wén Tiānxiáng, biàn yǐ mǎnqiāng zhèngqì míngchuí-qiāngǔ.",
             "Lịch sử từng chứng kiến những vị trạng nguyên kiệt xuất, như anh hùng dân tộc Văn Thiên Tường đời Nam Tống thà chết không khuất phục để lại tiết tháo ngàn thu."),
            ("科举制度虽然在清末废止，但尊重知识、发奋读书的文化基因依然在中华大地上代代相传。",
             "Kējǔ zhìdù suīrán zài Qīngmò fèizhǐ, dàn zūnzhòng zhīshi, fāfèn dúshū de wénhuà jīyīn yīrán zài Zhōnghuá dàdì shàng dàidài xiāngchuán.",
             "Khoa cử dẫu đã bãi bỏ cuối thời Thanh, nhưng truyền thống tôn trọng tri thức và nỗ lực học tập vẫn được kế thừa qua muôn đời.")
        ],
        "preferred_spotlight": ["制度", "接受", "历史", "文化"],
        "quiz": [
            {"id": "q1", "question_vi": "Trong các kỳ thi khoa cử cổ đại, danh hiệu 'Trạng nguyên' dành cho ai?",
             "options_vi": ["Người đỗ thứ nhất trong kỳ thi Điện (kỳ thi cao nhất do vua đích thân chủ trì)", "Người chạy bộ nhanh nhất", "Người giàu nhất làng"], "answer": 0, "explanation_vi": "Trạng nguyên là thủ khoa đỗ đầu kỳ thi Điện cao nhất."},
            {"id": "q2", "question_vi": "Vị trạng nguyên danh tiếng đời Nam Tống nổi tiếng với tấm lòng yêu nước thà chết không khuất phục là ai?",
             "options_vi": ["Văn Thiên Tường (文天祥)", "Tần Cối", "Viên Thế Khải"], "answer": 0, "explanation_vi": "Văn Thiên Tường đỗ trạng nguyên và để lại bài thơ 'Chính khí ca' bất hủ."},
            {"id": "q3", "question_vi": "Cụm từ dân gian nào thường dùng để ca ngợi quá trình học tập kiên trì của sĩ tử xưa?",
             "options_vi": ["Thập niên hàn song (Mười năm đèn sách khổ luyện bên song cửa)", "Một ngày hái hoa", "Nửa tháng câu cá"], "answer": 0, "explanation_vi": "'Mười năm hàn song' tượng trưng cho sự miệt mài học hỏi để thành tài."}
        ]
    })

    # 70. 和离
    stories.append({
        "id": "wanwu_story_070",
        "chapter_no": 70,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 723,
        "book_page_end": 734,
        "page_display": "Trang 723 - 734",
        "title": {"zh": "和离：一纸管窥唐人离婚", "vi": "Hòa ly: Bức thư ly hôn văn minh thời Đường"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "📜",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 723 - 734 · Bức thư 'Phóng thê thư' khai quật ở Đôn Hoàng chúc phúc đôi bên tự do êm thấm thời Thịnh Đường.",
        "sentences_data": [
            ("许多人以为中国古代婚姻全部是封建礼教束缚下的包办结合，女性毫无个人意愿。",
             "Xǔduō rén yǐwéi Zhōngguó gǔdài hūnyīn quánbù shì fēngjiàn lǐjiào shùfù xià de bāobàn jiéhé, nǚxìng háowú gèrén yìyuàn.",
             "Nhiều người ngỡ rằng hôn nhân cổ đại đều bị lễ giáo gò bó ép gả, người phụ nữ hoàn toàn không có tiếng nói riêng."),
            ("二十世纪在敦煌莫高窟藏经洞出土的唐代文献中，学者发现了令人惊叹的‘放妻书’。",
             "Èrshí shìjì zài Dūnhuáng Mògāokū cángjīngdòng chūtǔ de Tángdài wénxiàn zhōng, xuézhě fāxiàn le lìng rén jīngtàn de ‘Fàngqīshū’.",
             "Vào thế kỷ 20, trong các văn hiến thời Đường khai quật tại hang Mạc Cao Đôn Hoàng, các nhà nghiên cứu đã tìm thấy bản 'Phóng thê thư' kinh ngạc."),
            ("唐代法律中明确设立了‘和离’制度，即夫妻双方若感情不合，可以平等协商自愿解除婚约。",
             "Tángdài fǎlǜ zhōng míngquè shèlì le ‘hélí’ zhìdù, jí fūqī shuāngfāng ruò gǎnqíng bùhé, kěyǐ píngděng xiéshāng zìyuàn jiěchú hūnyuē.",
             "Luật pháp triều Đường quy định rõ chế độ 'Hòa ly': vợ chồng tình cảm không hợp có thể bình đẳng thương lượng chấm dứt hôn ước."),
            ("文书中温情写道：‘愿娘子相离之后，重梳蝉鬓，美扫娥眉，巧呈窈窕之姿，选聘高官之主’。",
             "Wénshū zhōng wēnqíng xiě dào: ‘Yuàn niángzǐ xiānglí zhīhòu, chóng shū chánbìn, měi sǎo éméi, qiǎo chéng yǎotiǎo zhī zī, xuǎnpìn gāoguān zhī zhǔ’.",
             "Lời thư ấm áp viết: 'Nguyện nàng sau khi chia tay, lại chải tóc mây vẽ lông mày đẹp, giữ vẻ yêu kiều chọn gả cho bậc tài ba xứng đáng'."),
            ("这份一千多年前的文书充满温和宽容与美好祝愿，展现了大唐社会开放自信的文明气象。",
             "Zhè fèn yìqiān duō nián qián de wénshū chōngmǎn wēnhé kuānróng yǔ měihǎo zhùyuàn, zhǎnxiàn le Dà Táng shèhuì kāifàng zìxìn de wénmíng qìxiàng.",
             "Bản văn tự hơn một ngàn năm trước chan chứa lời chúc an lành bao dung, thể hiện khí độ cởi mở và văn minh của thời Thịnh Đường.")
        ],
        "preferred_spotlight": ["发现", "法律", "制度", "社会"],
        "quiz": [
            {"id": "q1", "question_vi": "Văn bản ly hôn thời Đường 'Phóng thê thư' (放妻书) được tìm thấy ở đâu?",
             "options_vi": ["Hang Mạc Cao ở Đôn Hoàng (敦煌莫高窟)", "Lăng mộ Tần Thủy Hoàng", "Dưới đáy hồ Tây"], "answer": 0, "explanation_vi": "Văn bản được phát hiện trong kho tàng bản thảo hang Mạc Cao ở Đôn Hoàng."},
            {"id": "q2", "question_vi": "Chế độ 'Hòa ly' (和离) trong luật pháp thời Đường mang đặc điểm gì nổi bật?",
             "options_vi": ["Hai bên thuận tình hòa thuận chia tay khi hôn nhân không hạnh phúc và chúc phúc nhau", "Bắt phạt tù người vợ", "Tịch thu toàn bộ ruộng vườn"], "answer": 0, "explanation_vi": "Hòa ly là hình thức ly hôn hòa bình, hai bên đồng thuận giải thoát cho nhau."},
            {"id": "q3", "question_vi": "Lời dặn trong 'Phóng thê thư' thể hiện thái độ nào đối với người phụ nữ sau ly hôn?",
             "options_vi": ["Bao dung, tôn trọng và chân thành chúc người vợ tìm được hạnh phúc mới tốt đẹp hơn", "Nguyền rủa đối phương", "Cấm không cho ra đường"], "answer": 0, "explanation_vi": "Lời thư tao nhã chúc người vợ tái giá hạnh phúc thể hiện sự văn minh độ lượng."}
        ]
    })

    # 71. 磁铁
    stories.append({
        "id": "wanwu_story_071",
        "chapter_no": 71,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 734,
        "book_page_end": 744,
        "page_display": "Trang 734 - 744",
        "title": {"zh": "磁铁：从司南到超级储能王", "vi": "Nam châm: Từ chiếc muỗng Tư Nam đến công nghệ siêu từ tính"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🧲",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 734 - 744 · Từ dụng cụ định hướng bằng đá nam châm thời Chiến Quốc đến kim chỉ nam dẫn đường hàng hải thế giới.",
        "sentences_data": [
            ("磁铁具有吸引铁磁性金属和指示南北极的神奇属性，在人类科技探索中扮演着先驱角色。",
             "Cítiě jùyǒu xīyǐn tiěcíxìng jīnshǔ hé zhǐshì nán-běijí de shénqí shǔxìng, zài rénlèi kējì tànsuǒ zhōng bànyǎn zhe xiānqū juésè.",
             "Nam châm có đặc tính kỳ diệu hút kim loại sắt từ và chỉ rõ hai cực nam bắc, đóng vai trò tiên phong trong khám phá khoa học."),
            ("早在战国时期，中国古代先民就利用天然磁石琢磨成了世界上最早的指向仪器——‘司南’。",
             "Zǎo zài Zhànguó shíqī, Zhōngguó gǔdài xiānmín jiù lìyòng tiānrán císhí zhuómó chéng le shìjiè shàng zuì zǎo de zhǐxiàng yíqì——‘Sīnán’.",
             "Từ thời Chiến Quốc, người xưa đã mài giũa đá nam châm tự nhiên thành dụng cụ chỉ hướng sớm nhất thế giới gọi là 'Tư Nam'."),
            ("北宋学者沈括在《梦溪笔谈》中系统记载了人工磁化钢针的技术，发明了精巧实用的指南针。",
             "Běisòng xuézhě Shěn Kuò zài 《Mèngxī Bǐtán》 zhōng xìtǒng jìzǎi le réngōng cíhuà gāngzhēn de jìshù, fāmíng le jīngqiǎo shíyòng de zhǐnánzhēn.",
             "Học giả Thẩm Quát thời Bắc Tống trong 'Mộng Khê Bút Đàm' đã ghi chép kỹ thuật từ hóa kim thép, phát minh la bàn chỉ nam tiện dụng."),
            ("指南针应用于远洋航海，直接引领了地理大发现时代，推动了各大洲贸易与文化的蓬勃交流。",
             "Zhǐnánzhēn yìngyòng yú yuǎnyáng hánghǎi, zhíjiē yǐnlǐng le dìlǐ dàfāxiàn shídài, tuīdòng le gè dàzhōu màoyì yǔ wénhuà de péngbó jiāoliú.",
             "La bàn áp dụng vào ngành hàng hải viễn dương đã mở ra thời đại phát kiến địa lý, thúc đẩy giao thương toàn cầu bùng nổ."),
            ("今天，强大的超导磁铁更广泛应用于磁悬浮列车、医疗核磁共振成像与绿色储能技术之中。",
             "Jīntiān, qiángdà de chāodǎo cítǐě gèng guǎngfàn yìngyòng yú cíxuánfú lièchē, yīliáo hécí gòngzhèn chéngxiàng yǔ lǜsè chǔnéng jìshù zhī zhōng.",
             "Ngày nay, nam châm siêu dẫn được ứng dụng rộng rãi trong tàu đệm từ, chụp cộng hưởng từ (MRI) y tế và công nghệ tích trữ năng lượng.")
        ],
        "preferred_spotlight": ["科技", "最早", "技术", "应用"],
        "quiz": [
            {"id": "q1", "question_vi": "Thiết bị chỉ hướng bằng nam châm tự nhiên sớm nhất thời Chiến Quốc gọi là gì?",
             "options_vi": ["Tư Nam (司南)", "Điện thoại thông minh", "Đồng hồ cát"], "answer": 0, "explanation_vi": "Tư Nam có hình chiếc thìa bằng đá nam châm đặt trên đĩa đồng khắc phương hướng."},
            {"id": "q2", "question_vi": "Học giả Thẩm Quát đã ghi chép các phương pháp đặt kim chỉ nam trong tác phẩm nổi tiếng nào?",
             "options_vi": ["Mộng Khê Bút Đàm (梦溪笔谈)", "Tam Quốc Diễn Nghĩa", "Bản Thảo Cương Mục"], "answer": 0, "explanation_vi": "Mộng Khê Bút Đàm là bách khoa toàn thư khoa học cổ đại ghi lại phát minh la bàn."},
            {"id": "q3", "question_vi": "Ứng dụng của nam châm trong ngành giao thông vận tải hiện đại là gì?",
             "options_vi": ["Tàu đệm từ trường (Maglev) bay lướt trên đường ray", "Xe bò kéo", "Thuyền buồm gỗ"], "answer": 0, "explanation_vi": "Nam châm điện nâng đoàn tàu đệm từ chạy không ma sát với vận tốc cực cao."}
        ]
    })

    # 72. 地图
    stories.append({
        "id": "wanwu_story_072",
        "chapter_no": 72,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 744,
        "book_page_end": 753,
        "page_display": "Trang 744 - 753",
        "title": {"zh": "地图：从古到今的“神器”", "vi": "Bản đồ: 'Bảo bối' định vị địa lý từ xưa đến nay"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🗺️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 744 - 753 · 'Chế đồ lục thể' của Bùi Tú thời Tây Tấn và bản đồ tơ lụa Mã Vương Đôi đến bản đồ vệ tinh kỹ thuật số.",
        "sentences_data": [
            ("地图将广袤无垠的山川河海缩绘于方寸之间，是人类认识与探索地球空间最直观的工具。",
             "Dìtú jiāng guǎngmào-wúyín de shānchuān héhǎi suōhuì yú fāngcùn zhījiān, shì rénlèi rènshi yǔ tànsuǒ dìqiú kōngjiān zuì zhíguān de gōngjù.",
             "Bản đồ thu nhỏ non sông bờ cõi bao la lên một khuôn khổ, là công cụ trực quan nhất để loài người nhận thức và thám hiểm không gian địa lý."),
            ("长沙马王堆汉墓出土的三幅绘制在丝绸上的古代地图，精准展现了两千多年前的地形起伏与道路水网。",
             "Chángshā Mǎwángduī Hànmù chūtǔ de sān fú huìzhì zài sīchóu shàng de gǔdài dìtú, jīngzhǔn zhǎnxiàn le liǎngqiān duō nián qián de dìxíng qǐfú yǔ dàolù shuǐwǎng.",
             "Ba bức bản đồ vẽ trên lụa khai quật tại mộ Hán Mã Vương Đôi đã tái hiện chuẩn xác địa hình và mạng lưới giao thông đường thủy từ hai ngàn năm trước."),
            ("西晋著名地理学家裴秀总结创立了‘制图六体’理论，确立了比例尺、方向与高程测绘准则。",
             "Xījìn zhùmíng dìlǐ xuéjiā Péi Xiù zǒngjié chuànglì le ‘Zhìtú liùtǐ’ lǐlùn, quèlì le bǐlìchǐ, fāngxiàng yǔ gāochéng cèhuì zhǔnzé.",
             "Nhà địa lý Bùi Tú thời Tây Tấn đã đúc kết lý luận 'Chế đồ lục thể', xác lập tiêu chuẩn về tỷ lệ xích, phương hướng và độ cao."),
            ("在古代军事作战与国家治理中，精准的地形图被奉为不可外泄的战略机密与治国神器。",
             "Zài gǔdài jūnshì zuòzhàn yǔ guójiā zhìlǐ zhōng, jīngzhǔn de dìxíngtú bèi fèng wéi bùkě wàixiè de zhànlüè jīmì yǔ zhìguó shénqì.",
             "Trong quân sự và bang giao cổ đại, tấm bản đồ địa hình chính xác được xem là bí mật chiến lược và bảo bối trị quốc tối cao."),
            ("现代卫星遥感和数字导航软件的结合，让我们可以随时随地精准定位并畅行天下。",
             "Xiàndài wèixīng yáogǎn hé shùzì dǎoháng ruǎnjiàn de jiéhé, ràng wǒmen kěyǐ suíshí-suídì jīngzhǔn dìngwèi bìng chàngxíng tiānxià.",
             "Sự kết hợp giữa viễn thám vệ tinh và ứng dụng định vị số giúp chúng ta định vị chính xác mọi lúc mọi nơi và tự tin đi khắp thế gian.")
        ],
        "preferred_spotlight": ["工具", "著名", "准则", "结合"],
        "quiz": [
            {"id": "q1", "question_vi": "Nhà địa lý Bùi Tú thời Tây Tấn đã đề ra nguyên tắc vẽ bản đồ nổi tiếng nào?",
             "options_vi": ["Chế đồ lục thể (制图六体 - sáu nguyên tắc vẽ bản đồ gồm tỷ lệ, phương vị, cự ly)", "Vẽ tranh phong cảnh", "Đo bằng mắt thường"], "answer": 0, "explanation_vi": "Bùi Tú thiết lập 6 nguyên lý khoa học tạo nền móng cho bản đồ học phương Đông."},
            {"id": "q2", "question_vi": "Bản đồ cổ vẽ trên lụa có niên đại hơn 2000 năm được khai quật tại di chỉ nào?",
             "options_vi": ["Khu lăng mộ Mã Vương Đôi (Trường Sa, Hồ Nam)", "Hang đá Long Môn", "Cố Cung Bắc Kinh"], "answer": 0, "explanation_vi": "Bản đồ lụa Mã Vương Đôi có độ chuẩn xác đáng kinh ngạc từ thời Tây Hán."},
            {"id": "q3", "question_vi": "Công nghệ nào đóng vai trò định vị cốt lõi cho bản đồ số trên điện thoại thông minh hiện nay?",
             "options_vi": ["Định vị vệ tinh (GPS / Beidou)", "Quan sát hướng gió thổi", "Xem rêu mọc trên thân cây"], "answer": 0, "explanation_vi": "Các hệ thống vệ tinh định vị toàn cầu giúp điện thoại xác định tọa độ tức thì."}
        ]
    })

    # 73. 弓箭
    stories.append({
        "id": "wanwu_story_073",
        "chapter_no": 73,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 753,
        "book_page_end": 762,
        "page_display": "Trang 753 - 762",
        "title": {"zh": "弓箭：从狩猎战争到竞技健身", "vi": "Cung tên: Từ săn bắn, chiến trận đến thể thao đỉnh cao"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🏹",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 753 - 762 · Vũ khí tầm xa cổ xưa nhất, nghệ thuật chế tạo cung tên複合 và môn 'Xạ' trong Lục Nghệ của người quân tử.",
        "sentences_data": [
            ("弓箭是原始人类发明的最具威力的远程攻击武器，深刻改变了狩猎与战争的面貌。",
             "Gōngjiàn shì yuánshǐ rénlèi fāmíng de zuì jù wēilì de yuǎnchéng gōngjī wǔqì, shēnkè gǎibiàn le shòuliè yǔ zhànzhēng de miànmào.",
             "Cung tên là vũ khí tầm xa uy lực nhất do con người thời nguyên thủy sáng chế, làm thay đổi sâu sắc diện mạo săn bắn và chiến tranh."),
            ("中国古人掌握了精湛的复合弓制作工艺，采用木材、角质、牛筋和天然生漆层层粘合，弹性惊人。",
             "Zhōngguó gǔrén zhǎngwò le jīngzhàn de fùhégōng zhìzuò gōngyì, cǎiyòng mùcái, jiǎozhì, niújīn hé tiānrán shēngqī céngcéng zhānhé, tánxìng jīngrén.",
             "Người xưa nắm vững kỹ nghệ làm cung liên hợp, dùng gỗ, sừng, gân bò và sơn ta ép lớp, tạo nên sức bật đáng kinh ngạc."),
            ("在周代，‘射礼’被列为君子必须修习的‘六艺’之一，强调‘发而不中，反求诸己’的道德修养。",
             "Zài Zhōudài, ‘shèlǐ’ bèi liè wéi jūnzǐ bìxū xiūxí de ‘liùyì’ zhī yī, qiángdiào ‘fā ér bù zhòng, fǎn qiú zhū jǐ’ de dàodé xiūyǎng.",
             "Thời Chu, 'Xạ lễ' (bắn cung) được xếp vào 'Lục nghệ' người quân tử phải tu tập, đề cao đức tính khiêm nhường tự xét mình khi bắn trượt."),
            ("随着火药武器的兴起，弓箭逐渐退出了主力战场的舞台，转而向体育竞技与强身健体演进。",
             "Suízhe huǒyào wǔqì de xīngqǐ, gōngjiàn zhújiàn tuìchū le zhǔlì zhànchǎng de wǔtái, zhuǎn'ér xiàng tǐyù jìngjì yǔ qiángshēn-jiàntǐ yǎnjìn.",
             "Khi vũ khí thuốc súng xuất hiện, cung tên dần lui khỏi chiến trường, chuyển hóa thành môn thể thao rèn luyện thân thể dẻo dai."),
            ("现代奥林匹克射箭比赛要求运动员拥有极高的心理专注力，展现出力量与心性的完美平衡。",
             "Xiàndài Àolínpǐkè shèjiàn bǐsài yāoqiú yùndòngyuán yǒngyǒu jí gāo de xīnlǐ zhuānzhùlì, zhǎnxiàn chū lìliang yǔ xīnxìng de wánměi pínghéng.",
             "Thi đấu bắn cung Olympic hiện đại đòi hỏi sự tập trung tâm lý tuyệt đối, biểu hiện sự cân bằng hoàn hảo giữa sức mạnh và nội tâm.")
        ],
        "preferred_spotlight": ["发明", "改变", "掌握", "要求"],
        "quiz": [
            {"id": "q1", "question_vi": "Trong 'Lục nghệ' (sáu môn học chuẩn mực của người quân tử thời cổ), môn bắn cung được gọi là gì?",
             "options_vi": ["Xạ (射)", "Lễ (礼)", "Ngự (御)"], "answer": 0, "explanation_vi": "'Xạ' tức là bắn cung, vừa rèn luyện thể lực vừa tu dưỡng tâm tính tập trung."},
            {"id": "q2", "question_vi": "Chất liệu nào được người xưa phối hợp chế tác 'cung liên hợp' tăng cường độ đàn hồi?",
             "options_vi": ["Gỗ, sừng thú, gân bò và chất keo tự nhiên", "Đất sét nung", "Ống tre rỗng không"], "answer": 0, "explanation_vi": "Cung liên hợp phối hợp sừng chịu nén và gân chịu kéo tạo sức bật siêu mạnh."},
            {"id": "q3", "question_vi": "Sau khi súng đạn phát triển, cung tên chuyển hướng phục vụ lĩnh vực nào là chính?",
             "options_vi": ["Thể thao thi đấu bắn cung và rèn luyện thể chất", "Chặt cây lấy gỗ", "Chữa bệnh đau dạ dày"], "answer": 0, "explanation_vi": "Cung tên trở thành môn thể thao Olympic đề cao độ chính xác và điềm tĩnh."}
        ]
    })

    # 74. 珠算
    stories.append({
        "id": "wanwu_story_074",
        "chapter_no": 74,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 762,
        "book_page_end": 772,
        "page_display": "Trang 762 - 772",
        "title": {"zh": "珠算：拨动之间有乾坤", "vi": "Bàn tính gảy: Vũ điệu hạt châu xoay chuyển càn khôn"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🧮",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 762 - 772 · 'Máy tính cơ học' sớm nhất của phương Đông, thuật toán gảy hạt châu và Di sản văn hóa phi vật thể nhân loại.",
        "sentences_data": [
            ("算盘结构规整，梁上二珠、梁下五珠，被西方学者誉为‘世界上最早的便携式计算机’。",
             "Suànpán jiégòu guīzhěng, liángshàng èr zhū, liángxià wǔ zhū, bèi xīfāng xuézhě yù wéi ‘shìjiè shàng zuì zǎo de biànxiéshì jìsuànjī’.",
             "Bàn tính có cấu trúc vuông vắn, trên thanh ngang hai hạt, dưới thanh năm hạt, được các học giả phương Tây xưng tụng là 'chiếc máy tính xách tay sớm nhất thế giới'."),
            ("北宋著名画作《清明上河图》中，一家药铺的柜台上便清晰描绘着一把正在使用的古代算盘。",
             "Běisòng zhùmíng huàzuò 《Qīngmíng Shànghétú》 zhōng, yì jiā yàopù de guìtái shàng biàn qīngxī miáohuì zhe yì bǎ zhèngzài shǐyòng de gǔdài suànpán.",
             "Trong danh họa 'Thanh Minh Thượng Hà Đồ' thời Bắc Tống, trên quầy hiệu thuốc đã vẽ rõ nét chiếc bàn tính cổ đang được sử dụng."),
            ("珠算口诀简练押韵，手指上下翻飞拨动算珠，加减乘除甚至开方运算都能以惊人的速度瞬间完成。",
             "Zhūsuàn kǒujué jiǎnliàn yāyùn, shǒuzhǐ shàngxià fānfēi bōdòng suànzhū, jiā-jiǎn-chéng-chú shènzhì kāifāng yùnsuàn dōu néng yǐ jīngrén de sùdù shùnjiān wánchéng.",
             "Khẩu quyết tính toán ngắn gọn bắt vần, ngón tay thoăn thoắt gảy hạt, cộng trừ nhân chia hay khai căn đều hoàn thành chớp mắt."),
            ("二十世纪中叶，在研发中国第一颗原子弹的艰苦岁月里，科学家们正是用算盘核验了海量的关键数据。",
             "Èrshí shìjì zhōngyè, zài yánfā Zhōngguó dì-yī kē yuánzǐdàn de jiānkǔ suìyuè lǐ, kēxuéjiāmen zhèngshì yòng suànpán héyàn le hǎiliàng de guānjiàn shùjù.",
             "Giữa thế kỷ 20, trong những năm tháng gian khó nghiên cứu bom nguyên tử, các nhà khoa học đã dùng chính chiếc bàn tính để kiểm tra lượng dữ liệu khổng lồ."),
            ("二零一三年，中国珠算被正式列入联合国人类非物质文化遗产名录，彰显着东方数学智慧的璀璨光芒。",
             "Èr-líng-yī-sān nián, Zhōngguó zhūsuàn bèi zhèngshì lièrù Liánhéguó Rénlèi Fēiwùzhì Wénhuà Yíchǎn mínglù, zhāngxiǎn zhe dōngfāng shùxué zhìhuì de cuǐcàn guāngmáng.",
             "Năm 2013, bàn tính gảy đã được UNESCO công nhận là Di sản Văn hóa Phi vật thể của nhân loại, tỏa sáng trí tuệ toán học phương Đông.")
        ],
        "preferred_spotlight": ["最早", "著名", "完成", "正式"],
        "quiz": [
            {"id": "q1", "question_vi": "Bức tranh nổi tiếng nào thời Bắc Tống vẽ hình chiếc bàn tính gảy trên quầy hiệu thuốc?",
             "options_vi": ["Thanh Minh Thượng Hà Đồ (清明上河图)", "Nàng Mona Lisa", "Bách Điểu Triều Phụng"], "answer": 0, "explanation_vi": "Thanh Minh Thượng Hà Đồ khắc họa chi tiết bàn tính trong hiệu thuốc phố Biện Kinh."},
            {"id": "q2", "question_vi": "Trong thế kỷ 20, bàn tính gảy từng lập công lớn trong dự án khoa học trọng đại nào?",
             "options_vi": ["Kiểm tra và tính toán dữ liệu nghiên cứu bom nguyên tử", "Thiết kế máy bay giấy", "Đếm số hạt lúa mì"], "answer": 0, "explanation_vi": "Các nhà khoa học hạt nhân đã kết hợp bàn tính với máy tính cơ để đối chiếu số liệu tuyệt mật."},
            {"id": "q3", "question_vi": "Tổ chức UNESCO đã vinh danh Bàn tính gảy vào danh hiệu nào năm 2013?",
             "options_vi": ["Di sản Văn hóa Phi vật thể của nhân loại", "Kỷ lục thiết bị đắt nhất", "Đồ chơi của năm"], "answer": 0, "explanation_vi": "Bàn tính được UNESCO ghi danh là Di sản văn hóa phi vật thể của toàn nhân loại."}
        ]
    })

    # 75. 云南白药
    stories.append({
        "id": "wanwu_story_075",
        "chapter_no": 75,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 772,
        "book_page_end": 786,
        "page_display": "Trang 772 - 786",
        "title": {"zh": "云南白药：“百宝丹”的配方传奇", "vi": "Vân Nam Bạch Dược: Bí mật phương thuốc 'Bách Bảo Đan'"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "💊",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 772 - 786 · Phương thuốc thảo dược cầm máu thần kỳ do danh y Khúc Hoán Chương sáng chế năm 1902 cứu vạn sinh linh.",
        "sentences_data": [
            ("云南白药是中国中医药宝库中享有盛誉的传世神药，具有止血愈伤、活血化瘀的奇特疗效。",
             "Yúnnán Báiyào shì Zhōngguó zhōngyīyào bǎokù zhōng xiǎngyǒu shèngyù de chuánshì shényào, jùyǒu zhǐxuè yùshāng, huóxuè huàyū de qítè liáoxiào.",
             "Vân Nam Bạch Dược là phương thuốc danh tiếng trong kho tàng đông y, có công hiệu thần kỳ cầm máu vết thương, tiêu sưng giảm đau."),
            ("一九零二年，云南民间医师曲焕章历经多年艰辛跋涉，在深山采尝百草，研制出了神奇的‘曲焕章百宝丹’。",
             "Yī-jiǔ-líng-èr nián, Yúnnán mínjiān yīshī Qū Huànzhāng lìjīng duō nián jiānxīn báshè, zài shēnshān cǎi cháng bǎicǎo, yánzhì chū le shénqí de ‘Qū Huànzhāng Bǎibǎodān’.",
             "Năm 1902, thầy thuốc Khúc Hoán Chương qua nhiều năm lặn lội núi rừng nếm thử trăm cây cỏ, đã bào chế ra 'Khúc Hoán Chương Bách Bảo Đan'."),
            ("无论多么严重的刀伤出血，敷上这种白色粉末便能立竿见影地止住流血并迅速愈合伤口。",
             "Wúlùn duōme yánzhòng de dāoshāng chūxiě, fūshàng zhè zhǒng báisè fěnmò biàn néng lìgānjiànyǐng de zhǐzhù liúxiě bìng xùnsù yùhé shāngkǒu.",
             "Dù vết thương chém chảy máu nghiêm trọng đến đâu, rắc thứ bột trắng này lên là lập tức cầm máu và nhanh chóng lành miệng."),
            ("抗日战争期间的台儿庄战役中，数万瓶百宝丹紧急运往前线救治伤员，拯救了大量抗日将士的生命。",
             "Kàngrì zhànzhēng qījiān de Tái'érzhuāng zhànyì zhōng, shùwànpíng bǎibǎodān jǐnjí yùnqián wǎng qiánxiàn jiùzhì shāngyuán, zhěngjiù le dàliàng kàngrì jiàngshì de shēngmìng.",
             "Trong trận Đài Nhi Trang thời kháng chiến, hàng vạn lọ Bách Bảo Đan đã được khẩn cấp đưa ra mặt trận cứu sống vô số thương binh."),
            ("新中国成立后，曲氏家族无私献出秘方，国家将其列为绝密级中药保护品种，造福着亿万百姓。",
             "Xīn Zhōngguó chénglì hòu, Qū shì jiāzú wúsī xiànchū mìfāng, guójiā jiāng qí liè wéi juémìjí zhōngyào bǎohù pǐnzhǒng, zàofú zhe yìwàn bǎixìng.",
             "Gia tộc họ Khúc sau đó đã hiến tặng phương thuốc cho quốc gia, được đưa vào danh mục bảo mật cấp quốc gia bảo vệ sức khỏe nhân dân.")
        ],
        "preferred_spotlight": ["经常", "严重", "生命", "保护"],
        "quiz": [
            {"id": "q1", "question_vi": "Vân Nam Bạch Dược do danh y nào sáng chế vào năm 1902?",
             "options_vi": ["Khúc Hoán Chương (曲焕章)", "Lý Thời Trân", "Hoa Đà"], "answer": 0, "explanation_vi": "Thầy thuốc Khúc Hoán Chương là người sáng chế ra phương thuốc Bách Bảo Đan tại Vân Nam."},
            {"id": "q2", "question_vi": "Công hiệu nổi tiếng nhất của Vân Nam Bạch Dược là gì?",
             "options_vi": ["Cầm máu nhanh chóng, tiêu viêm giảm đau và mau liền sẹo", "Làm sáng mắt ban đêm", "Chữa rụng tóc"], "answer": 0, "explanation_vi": "Bạch Dược có khả năng cầm máu và làm lành các vết thương chảy máu cực kỳ thần tốc."},
            {"id": "q3", "question_vi": "Trong kháng chiến, thuốc này đã lập công lớn cứu chữa binh sĩ ở chiến dịch lịch sử nào?",
             "options_vi": ["Chiến dịch Đài Nhi Trang (台儿庄战役)", "Trận Xích Bích", "Trận Trường Bình"], "answer": 0, "explanation_vi": "Hàng vạn lọ thuốc gửi ra chiến trường Đài Nhi Trang đã cứu sống rất nhiều thương binh."}
        ]
    })

    # 76. 饺子
    stories.append(adapt_prebuilt("饺子", "wanwu_story_076", 76, 786, 795, "Bánh chẻo Sủi Cảo: 'Giao Nhĩ' lưu truyền ngàn năm"))

    # 77. 茶
    stories.append(adapt_prebuilt("茶", "wanwu_story_077", 77, 795, 804, "Trà: Chiếc lá phương Đông huyền diệu"))

    # 78. 胭脂稻
    stories.append({
        "id": "wanwu_story_078",
        "chapter_no": 78,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 804,
        "book_page_end": 810,
        "page_display": "Trang 804 - 810",
        "title": {"zh": "胭脂稻：粒粒贵如金的“御稻米”", "vi": "Lúa Yên Chi: Hạt ngọc đỏ quý hơn vàng của hoàng cung"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🌾",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 804 - 810 · Giống lúa gạo hạt đỏ ngát hương được trồng tại chân núi Ngọc Tuyền dành riêng cho bữa ăn hoàng đế.",
        "sentences_data": [
            ("清代古典文学名著《红楼梦》中，贾府贾母餐桌上常常出现一种珍贵无比的‘红稻米粥’。",
             "Qīngdài gǔdiǎn wénxué míngzhù 《Hónglóumèng》 zhōng, Jiǎfǔ Jiǎmǔ cānzhuō shàng chángcháng chūxiàn yì zhǒng zhēnguì wūbǐ de ‘hóngdàomǐzhōu’.",
             "Trong kiệt tác văn học 'Hồng Lâu Mộng', trên bàn ăn của Giả mẫu thường xuất hiện món cháo 'Hồng Đạo Mễ' quý hiếm vô song."),
            ("这种米粒色泽微红如胭脂、煮熟后香气扑鼻的特种水稻，便是名闻遐迩的‘胭脂稻’。",
             "Zhè zhǒng mǐlì sèzé wēihóng rú yānzhi, zhǔshú hòu xiāngqì-pūbí de tèzhǒng shuǐdào, biàn shì míngwén-xiá'ěr de ‘Yānzhidào’.",
             "Hạt gạo có sắc đỏ hồng phảng phất như phấn yên chi, khi nấu chín tỏa hương thơm ngào ngạt, đó chính là giống 'Lúa Yên Chi' nức tiếng."),
            ("相传康熙皇帝在京郊玉泉山行宫巡视农田时偶然发现了这种天然红穗稻谷，并亲自在御田中培育推广。",
             "Xiāngchuán Kāngxī huángdì zài jīngjiāo Yùquánshān xínggōng xúnshì nóngtián shí ǒurán fāxiàn le zhè zhǒng tiānrán hóngsuì dàogǔ, bìng qīnzì zài yùtián zhōng péiyù tuīguǎng.",
             "Tương truyền vua Khang Hy khi tuần du ruộng đồng chân núi Ngọc Tuyền tình cờ phát hiện nhánh lúa trổ bông đỏ tự nhiên và đích thân nhân giống."),
            ("由于对土壤、清泉水质和气候条件的要求极其苛刻，胭脂稻产量极低，历来专供皇室享用。",
             "Yóuyú duì tǔrǎng, qīngquán shuǐzhì hé qìhòu tiáojiàn de yāoqiú jíqí kēkè, Yānzhidào chǎnliàng jí dī, lìlái zhuāngōng huángshì xiǎngyòng.",
             "Do đòi hỏi nghiêm ngặt về đất đai, nguồn nước suối trong và khí hậu, sản lượng lúa rất thấp, xưa kia chỉ dành riêng cho hoàng thất thưởng thức."),
            ("今天农业科研人员采用现代生态育种技术成功复原了这一古老稻种，让昔日宫廷御米重归寻常人间。",
             "Jīntiān nóngyè kēyán rényuán cǎiyòng xiàndài shēngtài yùzhǒng jìshù chénggōng fùyuán le zhè yí gǔlǎo dàozhǒng, ràng xīrì gōngtíng yùmǐ chóngguī xúncháng rénjiān.",
             "Ngày nay các nhà khoa học nông nghiệp đã phục tráng thành công giống lúa quý này, đưa hạt ngọc cung đình xưa trở lại bàn ăn cuộc sống.")
        ],
        "preferred_spotlight": ["经常", "发现", "要求", "成功"],
        "quiz": [
            {"id": "q1", "question_vi": "Món cháo gạo đỏ quý hiếm trong tác phẩm 'Hồng Lâu Mộng' nấu từ loại gạo nào?",
             "options_vi": ["Gạo Yên Chi (胭脂米 / 胭脂稻)", "Gạo nếp cẩm thường", "Gạo lứt đỏ mua chợ"], "answer": 0, "explanation_vi": "Cháo Hồng Đạo Mễ của Giả mẫu được nấu từ giống gạo Yên Chi tiến vua."},
            {"id": "q2", "question_vi": "Vị hoàng đế nào thời Thanh đã tình cờ phát hiện nhánh lúa đỏ này ở ngoại ô Bắc Kinh?",
             "options_vi": ["Hoàng đế Khang Hy (康熙)", "Càn Long", "Gia Khánh"], "answer": 0, "explanation_vi": "Khang Hy phát hiện giống lúa đỏ tại Ngọc Tuyền Sơn và cho gieo trồng trong ngự điền."},
            {"id": "q3", "question_vi": "Tại sao gạo Yên Chi thời phong kiến lại cực kỳ hiếm và đắt đỏ?",
             "options_vi": ["Kén chọn nguồn nước suối tinh khiết và khí hậu đặc thù, sản lượng rất ít", "Vì hạt gạo làm bằng thủy tinh", "Vì cây lúa chỉ mọc vào mùa đông"], "answer": 0, "explanation_vi": "Lúa Yên Chi đòi hỏi thổ nhưỡng khắt khe nên sản lượng rất khan hiếm, chỉ hoàng tộc mới có."}
        ]
    })

    # 79. 盐
    stories.append({
        "id": "wanwu_story_079",
        "chapter_no": 79,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 810,
        "book_page_end": 817,
        "page_display": "Trang 810 - 817",
        "title": {"zh": "盐：历史的咸味道", "vi": "Muối: Vị mặn mòi chuyển động lịch sử"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🧂",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 810 - 817 · Chính sách độc quyền muối sắt 'Diêm thiết chuyên mại' của Quản Trọng giúp làm đầy quốc khố ngàn năm.",
        "sentences_data": [
            ("盐不仅是日常饮食中不可或缺的百味之首，更是一部关乎古代国家兴衰的政治经济史。",
             "Yán bùjǐn shì rìcháng yǐnshí zhōng bùkě huòquē de bǎiwèi zhī shǒu, gèng shì yí bù guānhū gǔdài guójiā xīngshuāi de zhèngzhì jīngjì shǐ.",
             "Muối chẳng những đứng đầu trăm vị trong ăn uống hàng ngày, mà còn là pho sử kinh tế chính trị liên quan đến hưng suy của quốc gia."),
            ("早在春秋时期，齐国名相管仲就提出了‘官山海’的国策，由国家统筹垄断食盐的生产与销售。",
             "Zǎo zài Chūnqiū shíqī, Qíguó míngxiàng Guǎn Zhòng jiù tíchū le ‘Guān shānhǎi’ de guócè, yóu guójiā tǒngchóu lǒngduàn shíyán de shēngchǎn yǔ xiāoshòu.",
             "Từ thời Xuân Thu, danh tướng Quản Trọng nước Tề đã đề xướng quốc sách 'Quan sơn hải', do nhà nước độc quyền sản xuất và phân phối muối ăn."),
            ("因为人人都离不开食盐，政府无需直接向百姓加征人头赋税，便能通过盐税获得极其充沛的国库财政收入。",
             "Yīnwèi rénrén dōu líbùkāi shíyán, zhèngfǔ wúxū zhíjiē xiàng bǎixìng jiāzhēng réntóu fùshuì, biàn néng tōngguò yánshuì huòdé jíqí chōngpèi de guókù cáizhèng shōurù.",
             "Bởi ai ai cũng cần muối ăn mỗi ngày, triều đình không cần đánh thuế thân vẫn thu về nguồn ngân khố dồi dào từ thuế muối."),
            ("汉武帝时期正式确立了‘盐铁专卖’法案，筹集了雄厚的财力击退匈奴、开拓疆土。",
             "Hàn Wǔdì shíqī zhèngshì quèlì le ‘Yántiě zhuānmài’ fǎ'àn, chóují le xiónghòu de cáilì jītuì Xiōngnú, kāituò jiāngtǔ.",
             "Thời Hán Vũ Đế xác lập đạo luật 'Độc quyền Muối Sắt', tạo nguồn tài chính hùng hậu đánh lui Hung Nô, mở rộng bờ cõi."),
            ("沿海煮海为盐、内陆开采井盐与池盐，洁白的盐晶见证着中国古代劳动人民非凡的生存智慧。",
             "Yánhǎi zhǔ hǎi wéi yán, nèilù kāicǎi jǐngyán yǔ chíyán, jiébái de yánjīng jiànzhèng zhe Zhōngguó gǔdài láodòng rénmín fēifán de shēngcún zhìhuì.",
             "Dọc biển nấu nước mặn thành muối, nội địa khoan giếng muối sâu nghìn trượng, hạt muối trắng ngần ghi dấu trí tuệ sinh tồn của nhân dân lao động.")
        ],
        "preferred_spotlight": ["历史", "政府", "收入", "正式"],
        "quiz": [
            {"id": "q1", "question_vi": "Vị tể tướng kiệt xuất thời Xuân Thu nào đã khởi xướng quốc sách độc quyền muối 'Quan sơn hải'?",
             "options_vi": ["Quản Trọng (管仲) nước Tề", "Khổng Tử", "Tôn Tử"], "answer": 0, "explanation_vi": "Quản Trọng giúp Tề Hoàn Công xưng bá nhờ chính sách kiểm soát muối và sắt."},
            {"id": "q2", "question_vi": "Tại sao thuế muối lại là nguồn thu ngân sách hoàn hảo nhất cho triều đình cổ đại?",
             "options_vi": ["Vì bất kỳ ai cũng cần ăn muối mỗi ngày, không thể bỏ được", "Vì muối có thể làm tiền xu", "Vì muối không bao giờ tan"], "answer": 0, "explanation_vi": "Muối là nhu yếu phẩm sống còn của mọi người dân, đánh thuế vào muối mang lại nguồn thu khổng lồ."},
            {"id": "q3", "question_vi": "Hán Vũ Đế sử dụng nguồn tài chính từ độc quyền muối sắt vào việc lớn nào?",
             "options_vi": ["Cung cấp quân nhu tài chính đánh lui giặc Hung Nô và mở mang bờ cõi", "Mua hoa hồng trồng quanh cung", "Xây dựng rạp hát"], "answer": 0, "explanation_vi": "Kinh phí từ muối sắt giúp triều Hán trang bị quân đội hùng mạnh giữ vững biên cương."}
        ]
    })

    # 80. 火锅
    stories.append(adapt_prebuilt("火锅", "wanwu_story_080", 80, 817, 824, "Lẩu nóng: Nhúng trọn hương vị ấm áp cuộc đời"))

    # 81. 豆腐
    stories.append(adapt_prebuilt("豆腐", "wanwu_story_081", 81, 824, 833, "Đậu phụ: Món chay kinh điển Trung Hoa sáng tạo"))

    # 82. 炼丹术
    stories.append({
        "id": "wanwu_story_082",
        "chapter_no": 82,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 833,
        "book_page_end": 843,
        "page_display": "Trang 833 - 843",
        "title": {"zh": "炼丹术：世上真有不死药？", "vi": "Thuật luyện đan: Liệu có thần dược trường sinh?"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🧪",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 833 - 843 · Giấc mộng bất tử của các hoàng đế cổ đại và phát minh thuốc súng bất ngờ từ lò luyện đan của đạo sĩ.",
        "sentences_data": [
            ("自古以来，追求健康长寿甚至长生不老，是许多古代帝王与贵族梦寐以求的执念。",
             "Zìgǔ-yǐlái, zhuīqiú jiànkāng chángshòu shènzhì chángshēng-bùlǎo, shì xǔduō gǔdài dìwáng yǔ guìzú mèngmèi-yǐqiú de zhíniàn.",
             "Từ xưa tới nay, mưu cầu trường thọ thậm chí trường sinh bất tử là nỗi khát khao cháy bỏng của bao bậc đế vương quý tộc."),
            ("秦始皇曾派遣徐福率领数千童男童海东渡蓬莱寻找仙药，而汉唐多位皇帝更沉迷于道士的‘外丹术’。",
             "Qín Shǐhuáng céng pàiqiǎn Xú Fú shuàilǐng shùqiān tóngnán-tóngnǚ dōngdù Pénglái xúnzhǎo xiānyào, ér Hàn-Táng duō wèi huángdì gèng chénmí yú dàoshì de ‘wàidānshù’.",
             "Tần Thủy Hoàng từng sai Từ Phúc dẫn nghìn đồng nam đồng nữ vượt biển tìm thuốc tiên, vua chúa Hán Đường lại mê muội thuật luyện đan."),
            ("道士们将丹砂、水银、硫黄与铅等重金属矿物放入密封丹炉中，用熊熊烈火长时间烧炼金丹。",
             "Dàoshìmen jiāng dānshā, shuǐyín, liúhuáng yǔ qiān děng zhòngjīnshǔ kuàngwù fàngrù mìfēng dānlú zhōng, yòng xióngxióng lièhuǒ cháng shíjiān shāoliàn jīndān.",
             "Các đạo sĩ cho chu sa, thủy ngân, lưu huỳnh và chì vào lò kín, dùng lửa đỏ nung luyện kim đan suốt ngày đêm."),
            ("这些重金属矿物不仅不能使人延年益寿，反而富含剧毒，多位皇帝因长期服用金丹导致铅汞中毒暴毙。",
             "Zhèxiē zhòngjīnshǔ kuàngwù bùjǐn bùnéng shǐ rén yánnián-yìshòu, fǎn'ér fùhán jùdú, duō wèi huángdì yīn chángqī fúyòng jīndān dǎozhì qiān-gǒng zhòngdú bàobì.",
             "Những khoáng chất này chẳng những không kéo dài tuổi thọ mà còn chứa kịch độc, nhiều vị hoàng đế trúng độc tử vong vì uống đan dược."),
            ("然而在屡屡发生丹炉起火爆炸的意外中，炼丹士们意外发明了改变世界军事历史的‘黑火药’。",
             "Rán'ér zài lǚlǚ fāshēng dānlú qǐhuǒ bàozhà de yìwài zhōng, liàndānshìmen yìwài fāmíng le gǎibiàn shìjiè jūnshì lìshǐ de ‘hēihuǒyào’.",
             "Dẫu vậy qua các vụ nổ lò đan, các đạo sĩ đã tình cờ sáng chế ra thuốc súng đen làm thay đổi lịch sử quân sự toàn cầu.")
        ],
        "preferred_spotlight": ["健康", "富", "发生", "发明"],
        "quiz": [
            {"id": "q1", "question_vi": "Thành phần chủ yếu trong các viên kim đan thời cổ là gì?",
             "options_vi": ["Khoáng chất kim loại nặng độc hại như thủy ngân, chu sa, chì và lưu huỳnh", "Bột gạo nếp", "Mật ong rừng"], "answer": 0, "explanation_vi": "Kim đan làm từ các khoáng vật độc chứa thủy ngân và chì gây ngộ độc mãn tính."},
            {"id": "q2", "question_vi": "Phát minh vĩ đại nào của nhân loại ra đời tình cờ từ các vụ nổ lò luyện đan của đạo sĩ?",
             "options_vi": ["Thuốc súng đen (火药)", "Tàu ngầm hạt nhân", "Đèn pin năng lượng mặt trời"], "answer": 0, "explanation_vi": "Hỗn hợp diêm tiêu, lưu huỳnh và than củi trong lò đan đã tạo ra thuốc súng."},
            {"id": "q3", "question_vi": "Hậu quả của việc uống kim đan trường sinh đối với nhiều vị vua chúa cổ đại là gì?",
             "options_vi": ["Bị ngộ độc kim loại nặng dẫn tới tổn thương tạng phủ và đoản thọ", "Trở nên bất tử bay lên trời", "Tự biết bay"], "answer": 0, "explanation_vi": "Nhiều hoàng đế nhà Đường qua đời sớm do nhiễm độc thủy ngân từ đan dược."}
        ]
    })

    # 83. 战马
    stories.append({
        "id": "wanwu_story_083",
        "chapter_no": 83,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 843,
        "book_page_end": 853,
        "page_display": "Trang 843 - 853",
        "title": {"zh": "战马：千乘之国与汗血宝马", "vi": "Chiến mã: Ngàn cỗ chiến xa và truyền kỳ Ngựa Hãn Huyết"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🐎",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 843 - 853 · Tầm vóc kỵ binh trên chiến trường cổ đại và cuộc thám hiểm Tây Vực tìm ngựa Hãn Huyết thời Hán Vũ Đế.",
        "sentences_data": [
            ("在火器问世之前的冷兵器战争时代，强健敏捷的战马是决定军队战斗力与国家安危的核心支柱。",
             "Zài huǒqì wènshì zhīqián de lěngbīngqì zhànzhēng shídài, qiángjiàn mǐnjié de zhànmǎ shì juédìng jūnduì zhàndòulì yǔ guójiā ānwēi de héxīn zhīzhù.",
             "Trước khi hỏa khí ra đời, chiến mã dũng mãnh là trụ cột quyết định sức mạnh chiến đấu của quân đội và sự an nguy bờ cõi."),
            ("春秋战国时期，诸侯国的综合国力常以拥有四匹马拉动的‘战车’数量来衡量，称作‘千乘之国’。",
             "Chūnqiū-Zhànguó shíqī, zhūhóuguó de zōnghé guólì cháng yǐ yǒngyǒu sì pǐ mǎ lādòng de ‘zhànchē’ shùliàng lái héngliáng, chēng zuò ‘qiān shèng zhī guó’.",
             "Thời Xuân Thu Chiến Quốc, thực lực chư hầu thường được đo bằng số lượng chiến xa bốn ngựa kéo, gọi là 'Thiên thừa chi quốc'."),
            ("汉武帝为了彻底战胜北方草原上骠悍的匈奴骑兵，曾两次派遣大军远征大宛国寻求传说中的‘天马’。",
             "Hàn Wǔdì wèile chèdǐ zhànshèng běifāng cǎoyuán shàng biàohàn de Xiōngnú qíbīng, céng liǎng cì pàiqiǎn dàjūn yuǎnzhēng Dàyuānguó xúnqiú chuánshuō zhōng de ‘Tiānmǎ’.",
             "Hán Vũ Đế nhằm đánh bại kỵ binh Hung Nô dũng mãnh, đã hai lần cử đại quân viễn chinh Đại Uyển tìm giống ngựa 'Thiên mã'."),
            ("这种奔跑后皮肤流出如鲜血般红色汗液的‘汗血宝马’耐力极其持久，极大提升了汉军骑兵的机动作战能力。",
             "Zhè zhǒng bēnpǎo hòu pífū liúchū rú xiānxuè bān hóngsè hànyè de ‘hànxuè bǎomǎ’ nàilì jíqí chījiǔ, jídà tíshēng le Hànjūn qíbīng de jīdòng zuòzhàn nénglì.",
             "Giống ngựa Hãn Huyết khi phi nước đại toát mồ hôi đỏ như máu, sức bền dẻo dai phi thường, nâng tầm khả năng cơ động của kỵ binh Hán."),
            ("战马的嘶鸣与铁蹄踏破黄沙，谱写了一曲曲保家卫国、波澜壮阔的英雄史诗。",
             "Zhànmǎ de sīmíng yǔ tiětí tàpò huángshā, pǔxiě le yìqǔqǔ bǎojiā-wèiguó, bōlán-zhuàngkuò de yīngxióng shǐshī.",
             "Tiếng hí vang và vó ngựa đạp cát vàng đã dệt nên những bản anh hùng ca dựng nước và giữ nước oanh liệt ngàn thu.")
        ],
        "preferred_spotlight": ["决定", "数量", "能力", "保护"],
        "quiz": [
            {"id": "q1", "question_vi": "Cụm từ 'Thiên thừa chi quốc' (千乘之国) thời Xuân Thu dùng chiến xa ngựa kéo để đo lường điều gì?",
             "options_vi": ["Thực lực kinh tế và quân sự hùng mạnh của một nước chư hầu", "Số lượng lừa nuôi trong thành", "Số chiếc xe kéo rác"], "answer": 0, "explanation_vi": "Mỗi chiến xa có 4 ngựa kéo và lính hộ vệ, 1000 cỗ xe tượng trưng cho cường quốc."},
            {"id": "q2", "question_vi": "Hán Vũ Đế cử quân viễn chinh Tây Vực đến nước Đại Uyển để tìm giống ngựa quý nào?",
             "options_vi": ["Ngựa Hãn Huyết (汗血宝马 / Thiên mã)", "Ngựa vằn châu Phi", "Ngựa gỗ đồ chơi"], "answer": 0, "explanation_vi": "Ngựa Hãn Huyết chạy nhanh, sức bền phi thường được phong làm Thiên Mã."},
            {"id": "q3", "question_vi": "Vai trò cốt lõi của ngựa chiến trên chiến trường trước thời đại súng ống là gì?",
             "options_vi": ["Tạo tốc độ cơ động thần tốc và sức mạnh càn quét kỵ binh", "Chỉ để kéo cày", "Làm thú cưng ngắm hoa"], "answer": 0, "explanation_vi": "Kỵ binh là lực lượng xung kích then chốt quyết định thắng bại trận đánh."}
        ]
    })

    # 84. 鸿门宴
    stories.append({
        "id": "wanwu_story_084",
        "chapter_no": 84,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 853,
        "book_page_end": 862,
        "page_display": "Trang 853 - 862",
        "title": {"zh": "鸿门宴：史上第一饭局", "vi": "Hồng Môn Yến: Bữa tiệc sinh tử lừng danh lịch sử"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "⚔️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 853 - 862 · Ván cờ chính trị sinh tử giữa Lưu Bang và Hạng Vũ: Điệu múa kiếm của Hạng Trang và khí phách Phàn Khoái.",
        "sentences_data": [
            ("公元前二零六年，在秦帝国轰然倒塌的乱世废墟上，楚霸王项羽与汉王刘邦在鸿门展开了一场惊心动魄的酒宴对决。",
             "Gōngyuánqián èr-líng-liù nián, zài Qín dìguó hōngrán dǎotā de luànshì fèixū shàng, Chǔ Bàwáng Xiàng Yǔ yǔ Hànwáng Liú Bāng zài Hóngmén zhǎnkāi le yì chǎng jīngxīn-dòngpò de jiǔyàn duìjué.",
             "Năm 206 TCN, trên đống hoang tàn sau khi nhà Tần sụp đổ, Sở Bá Vương Hạng Vũ và Hán Vương Lưu Bang đã đối đầu trong bữa tiệc nghẹt thở tại Hồng Môn."),
            ("这场看似推杯换盏的普通宴席，实则是争夺天下至高统治权的生死政治角力，被称为‘史上第一饭局’。",
             "Zhè chǎng kànsì tuībēi-huànzhǎn de pǔtōng yànxí, shí zé shì zhēngduó tiānxià zhìgāo tǒngzhìquán de shēngsǐ zhèngzhì jiǎolì, bèi chēng wéi ‘shǐshàng dì-yī fànjú’.",
             "Bữa tiệc ngỡ như cạn chén vui vẻ thực chất là cuộc đọ trí sinh tử tranh đoạt quyền thống trị thiên hạ."),
            ("席间谋士范增屡次举起佩玉示意项羽下令动手，大将项庄借口舞剑助兴，意图刺杀刘邦，留下了‘项庄舞剑，意在沛公’的千古名言。",
             "Xíjiān móushì Fàn Zēng lǚcì jǔqǐ pèiyù shìyì Xiàng Yǔ xiàlìng dòngshǒu, dàjiàng Xiàng Zhuāng jièkǒu wǔjiàn zhùxìng, yìtú cìshā Liú Bāng, liúxià le ‘Xiàng Zhuāng wǔjiàn, yì zài Pèigōng’ de qiāngǔ míngyán.",
             "Quân sư Phạm Tăng liên tục giơ ngọc quyết ra hiệu hạ sát, Hạng Trang mượn cớ múa kiếm giúp vui hòng ám hại Lưu Bang, để lại câu châm ngôn ngàn đời."),
            ("刘邦的大将樊哙持盾握剑闯入大帐义正词严怒斥项羽，刘邦随后借口如厕脱身返回汉军大营。",
             "Liú Bāng de dàjiàng Fán Kuài chídùn wòjiàn chuǎngrù dàzhàng yìzhèng-cíyán nùchì Xiàng Yǔ, Liú Bāng suíhòu jièkǒu rúcè tuōshēn fǎnhuí Hànjūn dàyíng.",
             "Dũng tướng Phàn Khoái ôm khiên cầm gươm xông thẳng vào trướng quát lớn, Lưu Bang liền mượn cớ đi vệ sinh trốn thoát về doanh trại."),
            ("项羽的犹豫不决让他错失了除掉对手的最佳时机，最终在四年后的垓下之战中兵败自刎，改变了历史走向。",
             "Xiàng Yǔ de yóuyù-bùjué ràng tā cuòshī le chúdiào duìshǒu de zuìjiā shíjī, zuìzhōng zài sì nián hòu de Gāixià zhī zhàn zhōng bīngbài zìwěn, gǎibiàn le lìshǐ zǒuxiàng.",
             "Sự do dự của Hạng Vũ khiến ông bỏ lỡ cơ hội ngàn vàng, để rồi 4 năm sau bại trận tại Cai Hạ phải tự vẫn, đổi thay dòng chảy lịch sử.")
        ],
        "preferred_spotlight": ["普通", "借口", "改变", "历史"],
        "quiz": [
            {"id": "q1", "question_vi": "Câu thành ngữ kinh điển nào bắt nguồn từ bữa tiệc Hồng Môn Yến?",
             "options_vi": ["Hạng Trang vũ kiếm, ý tại Bái Công (项庄舞剑，意在沛公)", "Họa hổ họa bì", "Đục tường trộm ánh sáng"], "answer": 0, "explanation_vi": "Hạng Trang múa kiếm bề ngoài là biểu diễn giúp vui nhưng thâm ý là ám sát Lưu Bang (Bái Công)."},
            {"id": "q2", "question_vi": "Viên dũng tướng nào đã dũng cảm cầm khiên xông vào trướng che chở cho Lưu Bang?",
             "options_vi": ["Phàn Khoái (樊哙)", "Hàn Tín", "Trương Lương"], "answer": 0, "explanation_vi": "Phàn Khoái xông vào uống cạn bát rượu lớn, ăn thịt sống khí thế ngất trời cản trở kế sát hại."},
            {"id": "q3", "question_vi": "Sai lầm chí mạng của Hạng Vũ trong bữa tiệc Hồng Môn là gì?",
             "options_vi": ["Do dự nhu nhược không quyết đoán hạ thủ, để Lưu Bang tìm cớ trốn thoát", "Uống say ngủ quên", "Làm mất thanh gươm quý"], "answer": 0, "explanation_vi": "Hạng Vũ không nghe lời Phạm Tăng, thả Lưu Bang về dẫn tới thất bại mất thiên hạ sau này."}
        ]
    })

    # 85. 和亲
    stories.append({
        "id": "wanwu_story_085",
        "chapter_no": 85,
        "level": "HSK4",
        "book_volume": 4,
        "book_page_start": 862,
        "book_page_end": 875,
        "page_display": "Trang 862 - 875",
        "title": {"zh": "和亲：公主琵琶忧怨多", "vi": "Hòa thân: Tiếng đàn tỳ bà của công chúa nơi biên cương"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪕",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 862 - 875 · Chính sách gả công chúa cầu hòa của các vương triều và hành trình vượt quan ải của nàng Vương Chiêu Quân.",
        "sentences_data": [
            ("在中国古代长达两千多年的边疆交往中，‘和亲’是一项通过联姻来换取边境和平的重要政治外交手段。",
             "Zài Zhōngguó gǔdài cháng dá liǎngqiān duō nián de biānjiāng jiāowǎng zhōng, ‘héqīn’ shì yí xiàng tōngguò liányīn lái huànqǔ biānjìng hépíng de zhòngyào zhèngzhì wàijiāo shǒuduàn.",
             "Suốt hơn hai ngàn năm bang giao biên cương, 'Hòa thân' là thủ đoạn ngoại giao quan trọng dùng hôn nhân đổi lấy hòa bình biên giới."),
            ("西汉建国初期国力孱弱，汉高祖刘邦在平城受困后，不得不开启了向北方匈奴和亲结盟的先例。",
             "Xīhàn jiànguó chūqī guólì chánruò, Hàn Gāozǔ Liú Bāng zài Píngchéng shòukùn hòu, bùdébù kāiqǐ le xiàng běifāng Xiōngnú héqīn jiéméng de xiānlì.",
             "Đầu thời Tây Hán thực lực còn non yếu, Hán Cao Tổ sau khi bị vây ở Bình Thành buộc phải mở đầu tiền lệ gả con gái cầu hòa với Hung Nô."),
            ("汉元帝时期，美丽聪慧的宫女王昭君自愿请缨远嫁匈奴呼韩邪单于，成就了流芳百世的‘昭君出塞’佳话。",
             "Hàn Yuándì shíqī, měilì cōnghuì de gōngnǚ Wáng Zhāojūn zìyuàn qǐngyīng yuǎnjià Xiōngnú Hūhánxié Chányú, chéngjiù le liúfāng-bǎishì de ‘Zhāojūn chūsài’ jiāhuà.",
             "Thời Hán Nguyên Đế, nàng cung nữ xinh đẹp tài ba Vương Chiêu Quân đã tình nguyện gả đi xa cho Thiền Vu Hung Nô, lập nên giai thoại 'Chiêu Quân xuất tái'."),
            ("昭君出塞不仅带来了北方边境长达数十年的和平安定与贸易往来，更将中原先进的耕作技术与文化传播到了广阔草原。",
             "Zhāojūn chūsài bùjǐn dàilái le běifāng biānjìng cháng dá shùshí nián de hépíng āndìng yǔ màoyì wǎnglái, gèng jiāng zhōngyuán xiānjìn de gēngzuò jìshù yǔ wénhuà chuánbō dào le guǎngkuò cǎoyuán.",
             "Chiêu Quân đi cống hồ mang lại hòa bình và giao thương suốt nhiều thập kỷ cho biên cương, truyền bá kỹ thuật canh tác và văn hóa Trung Nguyên lên thảo nguyên."),
            ("背井离乡的公主们怀抱琵琶北上，用柔弱的双肩承担起家国安宁的重任，值得后人永远铭记与赞颂。",
             "Bèijǐng-líxiāng de gōngzhǔmen huáibào pípá běishàng, yòng róuruò de shuāngjiān chéngdān qǐ jiāguó ānníng de zhòngrèn, zhíde hòurén yǒngyuǎn míngjì yǔ zànsòng.",
             "Những người con gái rời xa quê cha đất mẹ ôm đàn tỳ bà lên đường, gánh trên vai trọng trách non sông, xứng đáng được hậu thế đời đời ghi nhớ.")
        ],
        "preferred_spotlight": ["重要", "带来", "技术", "文化"],
        "quiz": [
            {"id": "q1", "question_vi": "Nhân vật lịch sử nổi tiếng nào gắn liền với giai thoại 'Chiêu Quân xuất tái' (昭君出塞)?",
             "options_vi": ["Vương Chiêu Quân (王昭君)", "Tây Thi", "Điêu Thuyền"], "answer": 0, "explanation_vi": "Vương Chiêu Quân tình nguyện đi hòa thân với Thiền vu Hung Nô để giữ yên bờ cõi."},
            {"id": "q2", "question_vi": "Ý nghĩa lịch sử quan trọng nhất của chuyến xuất tái của Vương Chiêu Quân là gì?",
             "options_vi": ["Mang lại hòa bình và giao lưu văn hóa, buôn bán suốt hơn nửa thế kỷ ở vùng biên giới", "Gây ra chiến tranh lớn", "Làm mất hết ngựa chiến"], "answer": 0, "explanation_vi": "Cuộc hòa thân mang lại nửa thế kỷ bình yên không tiếng đao kiếm giữa hai dân tộc."},
            {"id": "q3", "question_vi": "Nhạc cụ nào thường gắn liền với hình ảnh công chúa đi hòa thân trong thi ca hội họa?",
             "options_vi": ["Đàn Tỳ Bà (琵琶)", "Kèn đám cưới", "Chiêng đồng"], "answer": 0, "explanation_vi": "Hình ảnh nàng Chiêu Quân ôm cây đàn tỳ bà vượt quan ải là biểu tượng nghệ thuật kinh điển."}
        ]
    })

    return stories


def main():
    stories = get_volume4_stories()
    print(f"Building Volume 4 ({len(stories)} stories)...")
    for sdata in stories:
        res = build_and_save_story(sdata)
        print(f"  [+] {res['id']}: {res['title']['zh']} ({res['page_display']}) - 100% Pinyin guaranteed.")

    update_manifest_all()


if __name__ == "__main__":
    main()
