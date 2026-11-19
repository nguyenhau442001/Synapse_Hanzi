#!/usr/bin/env python3
"""
tools/build_wanwu_volume3.py
Builds Volume 3 (Chapters 43 to 63) of 《万物有意思》:
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


def get_volume3_stories():
    stories = []
    prebuilt = {s["title"]["zh"].split("：")[0].replace("“", "").replace("”", "").strip(): s for s in get_all_book_stories()}

    # Helper to adapt prebuilt story
    def adapt_prebuilt(key, sid, ch_no, sp, ep, vi_title=None):
        raw = prebuilt[key]
        raw["id"] = sid
        raw["chapter_no"] = ch_no
        raw["book_volume"] = 3
        raw["book_page_start"] = sp
        raw["book_page_end"] = ep
        raw["page_display"] = f"Trang {sp} - {ep}"
        if vi_title:
            raw["title"]["vi"] = vi_title
        raw["description_vi"] = f"📖 Trang {sp} - {ep} · {raw['description_vi'].split('·')[-1].strip() if '·' in raw['description_vi'] else raw['description_vi']}"
        return raw

    # 43. 姓名
    stories.append({
        "id": "wanwu_story_043",
        "chapter_no": 43,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 441,
        "book_page_end": 456,
        "page_display": "Trang 441 - 456",
        "title": {"zh": "姓名：历代取名时尚", "vi": "Họ và tên: Phong cách đặt tên qua các triều đại"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "📜",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 441 - 456 · Sự phân biệt cổ xưa giữa 'Họ' và 'Thị', tục đặt tên chữ và xu hướng đặt tên qua các thời kỳ lịch sử.",
        "sentences_data": [
            ("在中国古代，‘姓’与‘氏’最初有着非常严格的区别，代表着血缘与贵族阶层。",
             "Zài Zhōngguó gǔdài, ‘xìng’ yǔ ‘shì’ zuìchū yǒuzhe fēicháng yángé de qūbié, dàibiǎo zhe xuèyuán yǔ guìzú jiēcéng.",
             "Vào thời cổ đại Trung Quốc, 'Họ' và 'Thị' ban đầu có sự phân biệt vô cùng nghiêm ngặt, đại diện cho huyết thống và giai tầng quý tộc."),
            ("‘姓’源于母系氏族社会，因此很多古老的大姓如姬、姜、姒都带有女字旁。",
             "‘Xìng’ yuányú mǔxì shìzú shèhuì, yīncǐ hěn duō gǔlǎo de dàxìng rú Jī, Jiāng, Sì dōu dàiyǒu nǚ zì páng.",
             "'Họ' bắt nguồn từ xã hội thị tộc mẫu hệ, vì vậy nhiều dòng họ cổ xưa như Cơ, Khương, Tự đều mang bộ Nữ."),
            ("古人除了有名之外，成年举行冠礼后还会取‘字’，朋友同辈之间通常称字以示尊敬。",
             "Gǔrén chúle yǒu míng zhīwài, chéngnián jǔxíng guānlǐ hòu hái huì qǔ ‘zì’, péngyou tóngbèi zhījiān tōngcháng chēng zì yǐ shì zūnjìng.",
             "Cổ nhân ngoài tên húy, khi trưởng thành làm lễ đội mũ còn đặt thêm 'tên chữ', bạn bè đồng trang lứa gọi chữ để tỏ lòng tôn kính."),
            ("例如著名诗人李白字太白，杜甫字子美，名与字之间往往蕴含着互补或相近的文化寓意。",
             "Lìrú zhùmíng shīrén Lǐ Bái zì Tàibái, Dù Fǔ zì Zǐměi, míng yǔ zì zhījiān wǎngwǎng yùnhán zhe hùbǔ huò xiāngjìn de wénhuà yùyì.",
             "Ví dụ thi tiên Lý Bạch tự Thái Bạch, Đỗ Phủ tự Tử Mỹ; tên và chữ thường hàm chứa ý nghĩa văn hóa tương đồng hoặc bổ trợ lẫn nhau."),
            ("秦汉以后，姓氏逐渐合二为一，演变成为今天人人皆有的中华百家姓家族标志。",
             "Qín-Hàn yǐhòu, xìngshì zhújiàn hé'èr-wéiyī, yǎnbiàn chéngwéi jīntiān rénrén jiē yǒu de Zhōnghuá bǎijiāxìng jiāzú biāozhì.",
             "Sau thời Tần Hán, họ và thị dần hợp nhất làm một, phát triển thành biểu tượng dòng họ trong Bách Gia Tính mà ai ai ngày nay cũng có.")
        ],
        "preferred_spotlight": ["严格", "文化", "著名", "标志"],
        "quiz": [
            {"id": "q1", "question_vi": "Tại sao nhiều dòng họ cổ đại như Cơ (姬), Khương (姜) đều mang bộ Nữ (女)?",
             "options_vi": ["Bắt nguồn từ xã hội thị tộc mẫu hệ thời nguyên thủy", "Do phụ nữ thích thêu thùa", "Do hoàng đế ra lệnh"], "answer": 0, "explanation_vi": "Thời nguyên thủy theo mẫu hệ nên họ (姓) mang bộ Nữ ghi nhớ dòng máu mẹ."},
            {"id": "q2", "question_vi": "Người xưa thường dùng 'tên chữ' (字) trong hoàn cảnh nào?",
             "options_vi": ["Bạn bè, đồng nghiệp gọi nhau hàng ngày để thể hiện sự lịch thiệp, tôn trọng", "Chỉ dùng khi phạm tội", "Chỉ dùng khi viết chúc thư"], "answer": 0, "explanation_vi": "Tên húy thường do trưởng bối gọi, còn bạn bè xưng hô bằng 'chữ' để bày tỏ lòng kính trọng."},
            {"id": "q3", "question_vi": "Nhà thơ Lý Bạch có tên chữ là gì?",
             "options_vi": ["Thái Bạch", "Tử Mỹ", "Đông Pha"], "answer": 0, "explanation_vi": "Lý Bạch tự Thái Bạch, hiệu Thanh Liên Cư Sĩ."}
        ]
    })

    # 44. 汉字
    stories.append(adapt_prebuilt("汉字", "wanwu_story_044", 44, 456, 468, "Chữ Hán: Mã gen của nền văn hóa Trung Hoa"))

    # 45. 书信传递
    stories.append({
        "id": "wanwu_story_045",
        "chapter_no": 45,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 468,
        "book_page_end": 477,
        "page_display": "Trang 468 - 477",
        "title": {"zh": "书信传递：从邮驿到邮局", "vi": "Bưu tín: Từ trạm dịch ngựa phi đến bưu cục hiện đại"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "✉️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 468 - 477 · Trạm dịch ngựa phi 'ngày đi tám trăm dặm', thư từ bằng thẻ tre, lụa và sự ra đời của dịch vụ bưu chính.",
        "sentences_data": [
            ("在没有电话和网络的漫长古代，书信是人们维系亲情与国家传递政令的唯一桥梁。",
             "Zài méiyǒu diànhuà hé wǎnglù de màncháng gǔdài, shūxìn shì rénmen wéixì qīnqíng yǔ guójiā chuándì zhènglìng de wéiyī qiáoliáng.",
             "Trong thời cổ đại xa xôi chưa có điện thoại và mạng internet, thư từ là cây cầu duy nhất gắn kết tình thân và truyền đạt chiếu chỉ quốc gia."),
            ("早在周代，官方就建立了完备的邮驿制度，沿途每隔几十里设立驿站供给马匹和食宿。",
             "Zǎo zài Zhōudài, guānfāng jiù jiànlì le wánbèi de yóuyì zhìdù, yántú měi gé jǐshí lǐ shèlì yìzhàn gōngjǐ mǎpǐ hé shí-sù.",
             "Từ thời nhà Chu, triều đình đã xây dựng chế độ trạm dịch hoàn chỉnh, dọc đường cách vài chục dặm lại đặt trạm cung cấp ngựa, cơm nước."),
            ("遇到紧急军情，驿卒们日夜兼程、快马加鞭，创造了‘八百里加急’的神速传奇。",
             "Yùdào jǐnjí jūnqíng, yìzúmen rìyè-jiānchéng, kuàimǎ-jiābiān, chuàngzào le ‘bābǎilǐ jiājí’ de shénsù chuánqí.",
             "Gặp quân tình khẩn cấp, các trạm dịch chạy suốt ngày đêm, quất ngựa phi nhanh tạo nên huyền thoại thần tốc 'hỏa tốc 800 dặm'."),
            ("而普通百姓则常常依靠行商托带‘家书’，唐诗中便有‘烽火连三月，家书抵万金’的动人感叹。",
             "Ér pǔtōng bǎixìng zé chángcháng yīkào hángshāng tuōdài ‘jiāshū’, Tángshī zhōng biàn yǒu ‘fēnghuǒ lián sānyuè, jiāshū dǐ wànjīn’ de dòngrén gǎntàn.",
             "Còn dân thường thường nhờ thương lái mang 'thư nhà', thi ca đời Đường từng thốt lên xúc động: 'Chiến hỏa liền ba tháng, thư nhà đáng vạn vàng'."),
            ("近代以来，绿色邮筒与邮政网络的普及，让信息传递更加安全便捷地飞向千家万户。",
             "Jìndài yǐlái, lǜsè yóutǒng yǔ yóuzhèng wǎnglù de pǔjí, ràng xìnxī chuándì gèngjiā ānquán biànjié de fēixiàng qiānjiā-wànhù.",
             "Thời cận đại, hòm thư màu xanh và mạng lưới bưu điện phổ cập đã giúp việc gửi trao thông tin đến với muôn nhà an toàn, tiện lợi hơn.")
        ],
        "preferred_spotlight": ["建立", "制度", "安全", "信息"],
        "quiz": [
            {"id": "q1", "question_vi": "Trong hệ thống trạm dịch cổ đại, cụm từ nào thể hiện tốc độ chuyển thư quân cơ khẩn cấp nhất?",
             "options_vi": ["Bát bách lý gia cấp (Hỏa tốc tám trăm dặm)", "Đi bộ túc tắc", "Thả bồ câu một tháng"], "answer": 0, "explanation_vi": "'Bát bách lý gia cấp' là mức truyền tin khẩn cấp nhất của trạm ngựa thời xưa."},
            {"id": "q2", "question_vi": "Câu thơ 'Chiến hỏa liền ba tháng, thư nhà đáng vạn vàng' của nhà thơ nào?",
             "options_vi": ["Đỗ Phủ", "Lý Bạch", "Bạch Cư Dị"], "answer": 0, "explanation_vi": "Đỗ Phủ sáng tác bài Xuân vọng chứa câu thơ nổi tiếng về nỗi nhớ gia đình trong loạn lạc."},
            {"id": "q3", "question_vi": "Màu sắc truyền thống của hòm thư bưu điện ở nhiều nơi là màu gì?",
             "options_vi": ["Màu xanh lá cây", "Màu tím hoa cà", "Màu đen sẫm"], "answer": 0, "explanation_vi": "Hòm thư bưu chính truyền thống thường mang sắc xanh lá cây biểu tượng hy vọng và hòa bình."}
        ]
    })

    # 46. 翻译
    stories.append({
        "id": "wanwu_story_046",
        "chapter_no": 46,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 477,
        "book_page_end": 488,
        "page_display": "Trang 477 - 488",
        "title": {"zh": "翻译：文化的“摆渡人”", "vi": "Dịch thuật: 'Người lái đò' đưa văn hóa qua sông"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🌐",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 477 - 488 · Từ công cuộc dịch kinh Phật của Đường Huyền Trang tại Nhạn Tháp đến chuẩn mực 'Tín - Đạt - Nhã' của Nghiêm Phục.",
        "sentences_data": [
            ("翻译就像一座横跨在不同语言与文明之间的桥梁，促进了人类智慧的分享与交融。",
             "Fānyì jiù xiàng yí zuò héngkuà zài bùtóng yǔyán yǔ wénmíng zhījiān de qiáoliáng, cùjìn le rénlèi zhìhuì de fēnxiǎng yǔ jiāoróng.",
             "Dịch thuật tựa như cây cầu bắc qua các ngôn ngữ và nền văn minh khác nhau, thúc đẩy sự sẻ chia và giao hòa trí tuệ nhân loại."),
            ("唐代高僧玄奘历经千辛万苦西行取经，归国后在大雁塔主持翻译了数千卷梵文佛典。",
             "Tángdài gāosēng Xuánzàng lìjīng qiānxīn-wànkǔ xīxíng qǔjīng, guīguó hòu zài Dàyàntǎ zhǔchí fānyì le shùqiān juàn Fànwén fódiǎn.",
             "Thời Đường, cao tăng Huyền Trang trải muôn vàn gian khổ sang Tây Trúc thỉnh kinh, về nước đã chủ trì dịch hàng ngàn quyển kinh Phật chữ Phạn tại tháp Đại Nhạn."),
            ("玄奘治学严谨，创立了‘五种不翻’的原则，成为中国翻译史上的崇高丰碑。",
             "Xuánzàng zhìxué yánjǐn, chuànglì le ‘wǔ zhǒng bù fān’ de yuánzé, chéngwéi Zhōngguó fānyì shǐ shàng de chónggāo fēngbēi.",
             "Ngài Huyền Trang nghiên cứu nghiêm cẩn, lập ra nguyên tắc 'Năm phép không dịch' (Ngũ bất phiên), trở thành tượng đài trong lịch sử dịch thuật."),
            ("近代启蒙思想家严复系统翻译了西方科学与哲学经典，提出了‘信、达、雅’的卓越翻译标准。",
             "Jìndài qǐméng sīxiǎngjiā Yán Fù xìtǒng fānyì le xīfāng kēxué yǔ zhéxué jīngdiǎn, tíchū le ‘xìn, dá, yǎ’ de zhuóyuè fānyì biāozhǔn.",
             "Nhà tư tưởng khai sáng Nghiêm Phục thời cận đại đã dịch các tác phẩm khoa học và triết học phương Tây, đề ra tiêu chuẩn 'Tín, Đạt, Nhã' mẫu mực."),
            ("今天，无论是文学交流还是科技合作，优秀的翻译者始终扮演着推动世界前行的文化摆渡人角色。",
             "Jīntiān, wúlùn shì wénxué jiāoliú háishì kējì hézuò, yōuxiù de fānyìzhě shǐzhōng bànyǎn zhe tuīdòng shìjiè qiánxíng de wénhuà bǎidùrén juésè.",
             "Ngày nay, dù là giao lưu văn học hay hợp tác công nghệ, các dịch giả xuất sắc luôn đóng vai người lái đò đưa tri thức tiến bước.")
        ],
        "preferred_spotlight": ["翻译", "促进", "成为", "标准"],
        "quiz": [
            {"id": "q1", "question_vi": "Cao tăng Đường Huyền Trang đã dịch kinh Phật chữ Phạn tại địa điểm nổi tiếng nào?",
             "options_vi": ["Tháp Đại Nhạn (Tây An)", "Cố Cung Bắc Kinh", "Chùa Thiếu Lâm"], "answer": 0, "explanation_vi": "Đường Huyền Trang dịch kinh tại Dịch kinh viện ở Đại Nhạn Tháp (Tây An)."},
            {"id": "q2", "question_vi": "Tiêu chuẩn dịch thuật kinh điển 'Tín, Đạt, Nhã' (信、达、雅) do ai đề xướng?",
             "options_vi": ["Học giả Nghiêm Phục", "Lỗ Tấn", "Từ Vạn Thọ"], "answer": 0, "explanation_vi": "Nghiêm Phục đề ra chuẩn 'Tín' (trung thành), 'Đạt' (thông suốt), 'Nhã' (trang nhã)."},
            {"id": "q3", "question_vi": "Hình ảnh ẩn dụ nào thường được dùng để ca ngợi vai trò của các dịch giả?",
             "options_vi": ["Người lái đò văn hóa đưa tri thức qua sông", "Người canh gác cổng thành", "Thợ mộc đóng thuyền"], "answer": 0, "explanation_vi": "Dịch giả được ví như người lái đò đưa người đọc vượt qua rào cản ngôn ngữ đến bến bờ hiểu biết."}
        ]
    })

    # 47. 治水
    stories.append(adapt_prebuilt("治水", "wanwu_story_047", 47, 488, 497, "Trị thủy: Từ 'Đục Long Môn' đến kỳ tích 'Đô Giang Yển'"))

    # 48. 运河
    stories.append({
        "id": "wanwu_story_048",
        "chapter_no": 48,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 497,
        "book_page_end": 507,
        "page_display": "Trang 497 - 507",
        "title": {"zh": "运河：因河而兴，因河而亡", "vi": "Kênh đào Đại Vận Hà: Dòng sông định đoạt hưng thịnh"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🛶",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 497 - 507 · Công trình thủy lợi nhân tạo dài nhất thế giới kết nối đôi bờ nam bắc, chuyên chở lúa gạo và lưu thông kinh tế nghìn năm.",
        "sentences_data": [
            ("中国京杭大运河是世界上开凿最早、里程最长的人工水利通道。",
             "Zhōngguó Jīng-Háng Dàyùnhé shì shìjiè shàng kāizáo zuì zǎo, lǐchéng zuì cháng de réngōng shuǐlì tōngdào.",
             "Kênh đào Bắc Kinh - Hàng Châu của Trung Quốc là tuyến thủy lợi nhân tạo đào sớm nhất và dài nhất trên thế giới."),
            ("隋炀帝时期动员了数百万民工开凿运河，将长江、黄河与海河等五大水系贯通起来。",
             "Suí Yángdì shíqī dòngyuán le shùbǎiwàn míngōng kāizáo yùnhé, jiāng Chángjiāng, Huánghé yǔ Hǎihé děng wǔdà shuǐxì guàntōng qǐlái.",
             "Thời Tùy Dượng Đế đã huy động hàng triệu dân phu đào kênh, thông suốt 5 hệ thống sông lớn gồm Trường Giang, Hoàng Hà và Hải Hà."),
            ("大运河的通航极大地促进了南方丰饶粮食和丝绸向北方京城的‘漕运’输送。",
             "Dàyùnhé de tōngháng jídà de cùjìn le nánfāng fēngráo liángshi hé sīchóu xiàng běifāng jīngchéng de ‘cáoyùn’ shūsòng.",
             "Việc thông thuyền trên Đại Vận Hà thúc đẩy mạnh mẽ hoạt động 'vận tải lương thảo' chở lúa gạo, tơ lụa trù phú từ phương nam lên kinh đô phương bắc."),
            ("沿河两岸的扬州、苏州和临清等商业重镇因河而兴，繁华盛极一时。",
             "Yánhé liǎng'àn de Yángzhōu, Sūzhōu hé Línqīng děng shāngyè zhòngzhèn yīn hé ér xīng, fánhuá shèngjí-yìshí.",
             "Hai bên bờ kênh, các đô thị thương nghiệp như Dương Châu, Tô Châu, Lâm Thanh nhờ con sông đào mà thịnh vượng tột bậc một thời."),
            ("如今，历经千年风霜的大运河已被列入世界文化遗产名录，重现生态与文化的秀丽风采。",
             "Rújīn, lìjīng qiānnián fēngshuāng de Dàyùnhé yǐ bèi lièrù Shìjiè Wénhuà Yíchǎn mínglù, chóngxiàn shēngtài yǔ wénhuà de xiùlì fāngcǎi.",
             "Ngày nay, trải qua ngàn năm dâu bể, Đại Vận Hà đã được ghi danh vào Di sản Văn hóa Thế giới, tái hiện vẻ đẹp sinh thái và văn hóa rạng ngời.")
        ],
        "preferred_spotlight": ["最早", "促进", "商业", "文化"],
        "quiz": [
            {"id": "q1", "question_vi": "Đại Vận Hà kết nối hai thành phố lớn nào ở hai đầu?",
             "options_vi": ["Bắc Kinh và Hàng Châu", "Tây An và Thành Đô", "Quảng Châu và Côn Minh"], "answer": 0, "explanation_vi": "Kênh mang tên Kinh - Hàng nối liền thủ đô Bắc Kinh và Hàng Châu (Chiết Giang)."},
            {"id": "q2", "question_vi": "Hoàng đế triều đại nào đã hạ lệnh mở rộng quy mô lớn kết nối các hệ thống sông của Đại Vận Hà?",
             "options_vi": ["Tùy Dượng Đế (nhà Tùy)", "Hán Cao Tổ", "Càn Long"], "answer": 0, "explanation_vi": "Tùy Dượng Đế đã huy động đại quy mô dân phu đào thông kênh Vận Hà nối nam bắc."},
            {"id": "q3", "question_vi": "Chức năng kinh tế trọng yếu nhất của kênh đào trong hàng trăm năm lịch sử là gì?",
             "options_vi": ["Chuyên chở lúa gạo, tơ lụa và hàng hóa từ phương nam lên kinh đô", "Làm hồ câu cá", "Chặn gió bão biển"], "answer": 0, "explanation_vi": "Đại Vận Hà đóng vai trò huyết mạch chuyển vận lương thực quốc gia (Tào vận)."}
        ]
    })

    # 49. 铁路
    stories.append({
        "id": "wanwu_story_049",
        "chapter_no": 49,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 507,
        "book_page_end": 519,
        "page_display": "Trang 507 - 519",
        "title": {"zh": "铁路：“一日千里”艰辛路", "vi": "Đường sắt: Hành trình 'ngày đi ngàn dặm' gian nan"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🚂",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 507 - 519 · Tuyến đường sắt Bắc Kinh - Trương Gia Khẩu tự thiết kế đầu tiên của kỹ sư Chiêm Thiên Hữu với đường ray hình chữ Nhân.",
        "sentences_data": [
            ("十九世纪蒸汽火车的轰鸣声，开启了人类陆地交通高速飞奔的新时代。",
             "Shíjiǔ shìjì zhēngqì huǒchē de hōngmíngshēng, kāiqǐ le rénlèi lùdì jiāotōng gāosù fēibēn de xīn shídài.",
             "Tiếng còi tàu hỏa hơi nước thế kỷ 19 đã mở ra kỷ nguyên mới cho giao thông mặt đất với tốc độ phi nước đại."),
            ("近代中国修建铁路步履维艰，不仅技术落后，路权更是屡屡遭到外国列强的觊觎与控制。",
             "Jìndài Zhōngguó xiūjiàn tiělù bùlǚ-wéijiān, bùjǐn jìshù luòhòu, lùquán gèng shì lǚlǚ zāodào wàiguó lièqiáng de jìyú yǔ kòngzhì.",
             "Xây dựng đường sắt thời cận đại ở Trung Quốc vô cùng chật vật, kỹ thuật lạc hậu lại liên tục bị các cường quốc kiểm soát."),
            ("一九零五年，杰出工程师詹天佑顶住巨大的外界压力，主持修建由中国人完全自主设计的京张铁路。",
             "Yī-jiǔ-líng-wǔ nián, jiéchū gōngchéngshī Zhān Tiānyòu dǐngzhù jùdà de wàijiè yālì, zhǔchí xiūjiàn yóu Zhōngguó rén wánquán zìzhǔ shèjì de Jīng-Zhāng tiělù.",
             "Năm 1905, kỹ sư kiệt xuất Chiêm Thiên Hữu vượt qua áp lực nặng nề, chủ trì xây dựng tuyến đường sắt Kinh - Trương do người Trung Quốc tự thiết kế."),
            ("面对关沟险峻的地形，詹天佑巧妙设计了‘人’字形折返铁轨，成功解决了列车爬大坡的难题。",
             "Miànduì Guāngōu xiǎnjùn de dìxíng, Zhān Tiānyòu qiǎomiào shèjì le ‘rén’ zìxíng zhéfǎn tiěguǐ, chénggōng jiějué le lièchē pá dàpō de nántí.",
             "Đối mặt với địa hình hiểm trở vùng Quan Câu, ông khéo léo thiết kế đường ray chữ 'Nhân' (人) gập chữ chi, vượt dốc ngoạn mục."),
            ("如今中国高铁网络纵横四海，飞驰的高速列车展现了当代科技与工程建设的飞跃发展。",
             "Rújīn Zhōngguó gāotiě wǎnglù zònghéng sìhǎi, fēichí de gāosù lièchē zhǎnxiàn le dāngdài kējì yǔ gōngchéng jiànshè de fēiyuè fāzhǎn.",
             "Giờ đây mạng lưới đường sắt cao tốc trải rộng muôn phương, những chuyến tàu cao tốc lướt nhanh thể hiện bước nhảy vọt công nghệ hiện đại.")
        ],
        "preferred_spotlight": ["交通", "技术", "成功", "发展"],
        "quiz": [
            {"id": "q1", "question_vi": "Kỹ sư kiệt xuất nào đã thiết kế tuyến đường sắt Kinh - Trương nổi tiếng?",
             "options_vi": ["Chiêm Thiên Hữu (詹天佑)", "Lỗ Tấn", "Đặng Tiểu Bình"], "answer": 0, "explanation_vi": "Chiêm Thiên Hữu là cha đẻ của ngành đường sắt tự thiết kế đầu tiên tại Trung Quốc."},
            {"id": "q2", "question_vi": "Sáng tạo độc đáo nào giúp đoàn tàu leo qua sườn núi dốc hiểm trở ở Bát Đạt Lĩnh?",
             "options_vi": ["Thiết kế đường ray ngoặc chữ 'Nhân' (人字形)", "Dùng bóng bay nâng tàu", "Dùng dây thừng kéo"], "answer": 0, "explanation_vi": "Đường ray hình chữ Nhân với 2 đầu kéo giúp tàu giảm độ dốc và đổi hướng an toàn."},
            {"id": "q3", "question_vi": "Đặc trưng lớn nhất của mạng lưới đường sắt hiện đại ngày nay là gì?",
             "options_vi": ["Tàu điện cao tốc chạy êm và tốc độ cao hàng trăm km/h", "Vẫn đốt củi chạy hơi nước", "Chạy trên đường gỗ"], "answer": 0, "explanation_vi": "Tàu cao tốc chạy điện hiện đại di chuyển với tốc độ trên 300 km/h."}
        ]
    })

    # 50. 自来水
    stories.append({
        "id": "wanwu_story_050",
        "chapter_no": 50,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 519,
        "book_page_end": 534,
        "page_display": "Trang 519 - 534",
        "title": {"zh": "自来水：招股集资引“甜水”", "vi": "Nước máy: Góp vốn đưa dòng 'nước ngọt' về phố"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🚰",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 519 - 534 · Từ giếng nước đắng chát thời xưa đến việc kêu gọi cổ phần xây dựng nhà máy nước sạch hiện đại.",
        "sentences_data": [
            ("清澈干净的自来水拧开龙头即来，在今天看来是再普通不过的日常生活便利。",
             "Qīngchè gānjìng de zìláishuǐ nǐngkāi lóngtóu jí lái, zài jīntiān kànlái shì zài pǔtōng bùguò de rìcháng shēnghuó biànlì.",
             "Nước máy trong veo mở vòi là chảy, ngày nay được xem là tiện nghi sinh hoạt bình thường hết đỗi."),
            ("然而在百年前的清末北京，城里水井大多水质苦咸，普通居民只能向挑水夫购买昂贵的甜井水。",
             "Rán'ér zài bǎinián qián de Qīngmò Běijīng, chénglǐ shuǐjǐng dàduō shuǐzhì kǔxián, pǔtōng jūmín zhǐ néng xiàng tiāoshuǐfū gòumǎi ángguì de tiánjǐngshuǐ.",
             "Thế nhưng trăm năm trước ở Bắc Kinh cuối triều Thanh, nước giếng trong thành đa phần mặn chát, dân chúng phải mua nước gánh đắt đỏ."),
            ("一九零八年，清政府批准成立了京师自来水股份有限公司，通过向社会招股筹集建设资金。",
             "Yī-jiǔ-líng-bā nián, Qīng zhèngfǔ pīzhǔn chénglì le Jīngshī Zìláishuǐ Gǔfèn Yǒuxiàn Gōngsī, tōngguò xiàng shèhuì zhāogǔ chóují jiànshè zījīn.",
             "Năm 1908, triều đình chuẩn thuận thành lập Công ty Nước máy Cổ phần Kinh Sư, phát hành cổ phiếu quyên vốn xây dựng."),
            ("工人们铺设地下管道，在孙河引水净化，并建造了高耸的水塔向全城加压供水。",
             "Gōngrénmen pūshè dìxià guǎndào, zài Sūnhé yǐnshuǐ jìnghuà, bìng jiànzào le gāosǒng de shuǐtǎ xiàng quánchéng jiāyā gōngshuǐ.",
             "Công nhân đào đặt đường ống ngầm, lấy nước sông Tôn Hà lọc sạch và dựng tháp nước cao vút để tăng áp lực cấp nước toàn thành."),
            ("自来水的普及不仅彻底改善了城市的公共卫生条件，也悄然推动了市民现代生活观念的转变。",
             "Zìláishuǐ de pǔjí bùjǐn chèdǐ gǎishàn le chéngshì de gōnggòng wèishēng tiáojiàn, yě qiǎorán tuīdòng le shìmín xiàndài shēnghuó guānniàn de zhuǎnbiàn.",
             "Phổ cập nước sạch không chỉ cải thiện triệt để vệ sinh công cộng mà còn thúc đẩy bước chuyển trong nếp sống đô thị hiện đại.")
        ],
        "preferred_spotlight": ["普通", "成立", "条件", "推动"],
        "quiz": [
            {"id": "q1", "question_vi": "Trước khi có nước máy, nguồn nước giếng ở nội thành Bắc Kinh thời xưa có vị gì?",
             "options_vi": ["Vị mặn đắng, khó uống", "Vị ngọt như mật ong", "Vị thơm mùi hoa cúc"], "answer": 0, "explanation_vi": "Nước giếng đào nông ở nội thành thời đó thường bị nhiễm phèn chua mặn lợ."},
            {"id": "q2", "question_vi": "Công ty nước máy đầu tiên ở Bắc Kinh năm 1908 huy động vốn bằng hình thức nào?",
             "options_vi": ["Phát hành cổ phiếu huy động vốn trong xã hội", "Vay vàng của cướp biển", "Thu thuế thú cưng"], "answer": 0, "explanation_vi": "Công ty Nước máy Kinh Sư được thành lập theo mô hình công ty cổ phần kêu gọi vốn."},
            {"id": "q3", "question_vi": "Công trình nước máy sạch mang lại lợi ích to lớn nhất cho thành phố là gì?",
             "options_vi": ["Nâng cao vệ sinh môi trường, phòng chống dịch bệnh truyền nhiễm từ nguồn nước bẩn", "Làm đường phố ngập lụt", "Làm nước đổi màu đỏ"], "answer": 0, "explanation_vi": "Nguồn nước sạch tiệt trùng giúp chấm dứt các đợt dịch tả và cải thiện sức khỏe người dân."}
        ]
    })

    # 51. 筷子
    stories.append(adapt_prebuilt("筷子", "wanwu_story_051", 51, 534, 545, "Đôi đũa: Chiếc đòn bẩy tuyệt diệu"))

    # 52. 扇子
    stories.append(adapt_prebuilt("扇子", "wanwu_story_052", 52, 545, 557, "Chiếc quạt: Gió mát bốn mùa không ngơi nghỉ"))

    # 53. 风筝
    stories.append(adapt_prebuilt("风筝", "wanwu_story_053", 53, 557, 565, "Con diều: Thiết bị bay sớm nhất thời Ngụy Tấn"))

    # 54. 伞
    stories.append(adapt_prebuilt("伞", "wanwu_story_054", 54, 565, 574, "Chiếc ô: Phát minh lãng mạn nhất che chở mưa nắng"))

    # 55. 棋
    stories.append(adapt_prebuilt("棋", "wanwu_story_055", 55, 574, 587, "Cờ vây và Cờ tướng: Tinh hoa đối kháng trí tuệ trên bàn vuông"))

    # 56. 牌坊
    stories.append({
        "id": "wanwu_story_056",
        "chapter_no": 56,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 587,
        "book_page_end": 595,
        "page_display": "Trang 587 - 595",
        "title": {"zh": "牌坊：明清时代社会导向标", "vi": "Cổng bài phường: Cột mốc chuẩn mực đạo đức thời Minh Thanh"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "⛩️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 587 - 595 · Kiến trúc cổng vòm bằng đá và gỗ khắc ghi công trạng khoa cử, lòng hiếu thảo và khí tiết thời phong kiến.",
        "sentences_data": [
            ("牌坊是中国传统建筑文化中极具特色的一种纪念性门洞式建筑。",
             "Páifāng shì Zhōngguó chuántǒng jiànzhù wénhuà zhōng jí jù tèsè de yí zhǒng jǐniànxìng méndòngshì jiànzhù.",
             "Bài phường là dạng kiến trúc cổng vòm kỷ niệm mang đậm nét đặc trưng trong văn hóa kiến trúc truyền thống Trung Hoa."),
            ("牌坊最早起源于古代里坊制度的坊门，后来逐渐演变成为表彰功德与忠孝节义的崇高载体。",
             "Páifāng zuìzǎo qǐyuán yú gǔdài lǐfāng zhìdù de fāngmén, hòulái zhújiàn yǎnbiàn chéngwéi biǎozhāng gōngdé yǔ zhōngxiào-jiéyì de chónggāo zàitǐ.",
             "Bài phường khởi thủy từ cổng ngõ trong quy hoạch phường xóm cổ, sau dần biến thành công trình tôn vinh công đức, trung hiếu tiết nghĩa."),
            ("在明清时代，无论是金榜题名的状元进士，还是仁义行善的乡贤名臣，都可以奉旨立坊表彰。",
             "Zài Míng-Qīng shídài, wúlùn shì jīnbǎng-tímíng de zhuàngyuan jìnshì, háishì rényì xíngshàn de xiāngxián míngchén, dōu kěyǐ fèngzhǐ lìfāng biǎozhāng.",
             "Thời Minh Thanh, dù là trạng nguyên đỗ đạt khoa bảng hay bậc hiền tài nhân nghĩa, đều có thể vâng chỉ vua ban dựng cổng biểu dương."),
            ("徽州古村落里的石雕牌坊工艺极其精湛，四柱三楼飞檐翘角，巍然屹立数百年不倒。",
             "Huīzhōu gǔcūnluò lǐ de shídiāo páifāng gōngyì jíqí jīngzhàn, sì zhù sān lóu fēiyán-qiàojiǎo, wēirán yìlì shùbǎi nián bù dǎo.",
             "Các cổng bài phường điêu khắc đá tại làng cổ Huy Châu có tay nghề tinh xảo, bốn cột ba tầng mái cong sừng sững hàng trăm năm."),
            ("牌坊上的每道题字和图案不仅记录了家族荣耀，更折射出古代社会的道德追求与文化取向。",
             "Páifāng shàng de měi dào tízì hé tú'àn bùjǐn jìlù le jiāzú róngyào, gèng zhéshè chū gǔdài shèhuì de dàodé zhuīqiú yǔ wénhuà qǔxiàng.",
             "Từng nét chữ và hoa văn trên bài phường không chỉ ghi lại vinh quang gia tộc mà còn phản chiếu chuẩn mực đạo đức của xã hội xưa.")
        ],
        "preferred_spotlight": ["传统", "建筑", "文化", "社会"],
        "quiz": [
            {"id": "q1", "question_vi": "Cổng bài phường trong xã hội cổ đại được dựng lên với mục đích chính là gì?",
             "options_vi": ["Tôn vinh đỗ đạt khoa cử, công trạng hoặc đạo đức hiếu nghĩa", "Làm chuồng ngựa", "Làm kho chứa ngũ cốc"], "answer": 0, "explanation_vi": "Bài phường được triều đình phê chuẩn dựng lên để ghi nhận tấm gương công đức tiêu biểu."},
            {"id": "q2", "question_vi": "Địa danh nào nổi tiếng với các cụm bài phường đá cổ điêu khắc tinh xảo?",
             "options_vi": ["Vùng đất Huy Châu (An Huy)", "Đảo Hải Nam", "Sa mạc Gobi"], "answer": 0, "explanation_vi": "Huy Châu nổi tiếng với các cổng bài phường đá chạm trổ công phu."},
            {"id": "q3", "question_vi": "Nguồn gốc ban đầu của bài phường xuất phát từ đâu?",
             "options_vi": ["Cổng ranh giới các khối phố (phường môn) trong các đô thị cổ", "Bến phà vượt sông", "Hàng rào vườn hoa"], "answer": 0, "explanation_vi": "Khởi nguyên bài phường là cổng ra vào các ô bàn cờ Lý Phường thời cổ."}
        ]
    })

    # 57. 中轴
    stories.append({
        "id": "wanwu_story_057",
        "chapter_no": 57,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 595,
        "book_page_end": 606,
        "page_display": "Trang 595 - 606",
        "title": {"zh": "中轴：皇帝的龙椅坐歪了吗？", "vi": "Trục trung tâm: Ghế rồng của hoàng đế có bị lệch?"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🏛️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 595 - 606 · Trục trung tâm dài 7.8 km của Bắc Kinh từ Vĩnh Định Môn đến Tháp Chuông Trống và bí ẩn thiên văn học cổ.",
        "sentences_data": [
            ("北京中轴线南起永定门，北至钟鼓楼，全长近八公里，被誉为北京古城的‘灵魂脊梁’。",
             "Běijīng zhōngzhóuxiàn nán qǐ Yǒngdìngmén, běi zhì Zhōnggǔlóu, quáncháng jìn bā gōnglǐ, bèi yù wéi Běijīng gǔchéng de ‘línghún jǐliang’.",
             "Trục trung tâm Bắc Kinh phía nam khởi từ Vĩnh Định Môn, bắc tới Tháp Chuông Trống, dài gần 8 km, được ví như 'xương sống linh hồn' kinh thành cổ."),
            ("紫禁城三大殿正是端坐在这条笔直严整的对称轴线上，彰显着中国古代天人合一与秩序井然的哲学美学。",
             "Zǐjìnchéng sān dàdiàn zhèngshì duānzuò zài zhè tiáo bǐzhí yánzhěng de duìchèn zhóuxiàn shàng, zhāngxiǎn zhe Zhōngguó gǔdài tiānrén-héyī yǔ zhìxù-jǐngrán de zhéxué měixué.",
             "Ba đại điện Cố Cung nằm ngay ngắn trên trục đối xứng chuẩn mực này, tôn vinh triết lý thiên nhân hợp nhất và trật tự nghiêm minh."),
            ("现代测绘学者通过高精度卫星定位惊奇地发现，中轴线相对于现代真子午线存在约两度的微小偏角。",
             "Xiàndài cèhuì xuézhě tōngguò gāojīngdù wèixīng dìngwèi jīngqí de fāxiàn, zhōngzhóuxiàn xiāngduì yú xiàndài zhēn zǐwǔxiàn cúnzài yuē liǎng dù de wēixiǎo piānjiǎo.",
             "Các nhà đo đạc hiện đại dùng định vị vệ tinh ngạc nhiên nhận thấy trục trung tâm hơi chếch khoảng hai độ so với kinh tuyến thật."),
            ("学者推测，这或许是因为元代规划大都时以当时北极星的位置作为测定基准，才留下了这道迷人的时空印记。",
             "Xuézhě tuīcè, zhè huòxǔ shì yīnwèi Yuándài guīhuà dàdū shí yǐ dāngshí Běijíxīng de wèizhì zuòwéi cèdìng jīzhǔn, cái liúxià le zhè dào mírén de shíkōng yìnjì.",
             "Các học giả suy đoán có thể khi nhà Nguyên quy hoạch Đại Đô đã lấy vị trí sao Bắc Cực lúc bấy giờ làm chuẩn đo, tạo nên dấu ấn thiên văn kỳ thú."),
            ("这条贯穿历史与现代的壮丽轴线，如今成功被联合国教科文组织评定为世界文化遗产。",
             "Zhè tiáo guànchuān lìshǐ yǔ xiàndài de zhuànglì zhóuxiàn, rújīn chénggōng bèi Liánhéguó Jiàokēwén Zǔzhī píngdìng wéi Shìjiè Wénhuà Yíchǎn.",
             "Trục kiến trúc tráng lệ xuyên suốt lịch sử và hiện đại này nay đã vinh dự được UNESCO công nhận là Di sản Văn hóa Thế giới.")
        ],
        "preferred_spotlight": ["发现", "成功", "文化", "历史"],
        "quiz": [
            {"id": "q1", "question_vi": "Trục trung tâm cổ kính nổi tiếng của Bắc Kinh kéo dài giữa hai địa danh nào?",
             "options_vi": ["Từ Vĩnh Định Môn đến Tháp Chuông Trống", "Từ Vạn Lý Trường Thành đến biển Bột Hải", "Từ Di Hòa Viên đến Sân bay"], "answer": 0, "explanation_vi": "Trục trung tâm Bắc Kinh dài 7.8 km chạy từ cổng Vĩnh Định Môn tới Tháp Chuông Trống."},
            {"id": "q2", "question_vi": "Độ lệch nhỏ khoảng hai độ của trục trung tâm kinh thành được giải thích do đâu?",
             "options_vi": ["Người xưa đo theo vị trí sao Bắc Cực ở bầu trời thời nhà Nguyên", "Thợ xây bị trượt thước đo", "Do động đất xê dịch"], "answer": 0, "explanation_vi": "Quy hoạch thời Nguyên dùng trục ngắm thiên văn hướng thẳng vào sao Bắc Cực thời điểm đó."},
            {"id": "q3", "question_vi": "Công trình nào tọa lạc ngay vị trí trái tim của trục trung tâm Bắc Kinh?",
             "options_vi": ["Tử Cấm Thành (Cố Cung)", "Nhà ga xe lửa", "Chợ hoa quả"], "answer": 0, "explanation_vi": "Tử Cấm Thành với các đại điện lớn nằm chính giữa vị trí uy nghiêm nhất của trục."}
        ]
    })

    # 58. “样式雷”
    stories.append({
        "id": "wanwu_story_058",
        "chapter_no": 58,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 606,
        "book_page_end": 618,
        "page_display": "Trang 606 - 618",
        "title": {"zh": "“样式雷”：清代二百年的建筑传奇", "vi": "'Dạng Thức Lôi': Huyền thoại kiến trúc hoàng gia hai trăm năm"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🏯",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 606 - 618 · Gia tộc họ Lôi đảm nhận thiết kế Tử Cấm Thành, Di Hòa Viên và mô hình烫样 độc bản suốt 8 thế hệ triều Thanh.",
        "sentences_data": [
            ("在清代长达两百多年的岁月里，有一个家族代代担任皇家建筑设计总负责人，他们就是著名的‘样式雷’。",
             "Zài Qīngdài cháng dá liǎngbǎi duō nián de suìyuè lǐ, yǒu yí gè jiāzú dàidài dānrèn huángjiā jiànzhù shèjì zǒng fùzérén, tāmen jiùshì zhùmíng de ‘Yàngshì Léi’.",
             "Suốt hơn hai trăm năm triều Thanh, có một gia tộc đời đời đảm nhận chức tổng công trình sư thiết kế hoàng gia, đó chính là danh gia 'Dạng Thức Lôi'."),
            ("从故宫太和殿的重建，到圆明园、颐和园与承德避暑山庄，清代五分之一的世界遗产均出自雷氏家族之手。",
             "Cóng Gùgōng Tàihédiàn de chóngjiàn, dào Yuánmíngyuán, Yíhéyuán yǔ Chéngdé Bìshǔ Shānzhuāng, Qīngdài wǔfēnzhīyī de shìjiè yíchǎn jūn chūzì Léi shì jiāzú zhī shǒu.",
             "Từ trùng tu điện Thái Hòa Cố Cung đến Viên Minh Viên, Di Hòa Viên và Sơn Trang Tránh Nóng Thừa Đức, một phần năm di sản thế giới thời Thanh đều do nhà họ Lôi thiết kế."),
            ("雷家独创了精妙绝伦的‘烫样’制作工艺，用纸板、木头和沥粉制成立体逼真的建筑模型供皇帝审阅。",
             "Léi jiā dúchuàng le jīngmiào-juélún de ‘tàngyàng’ zhìzuò gōngyì, yòng zhǐbǎn, mùtou hé lìfěn zhìchéng lìtǐ bīzhēn de jiànzhù móxíng gòng huángdì shěnyuè.",
             "Nhà họ Lôi sáng tạo nghệ thuật làm 'mô hình bỏng' (thang dạng) độc đáo, dùng bìa giấy, gỗ tạo thành mô hình không gian sống động dâng hoàng đế duyệt định."),
            ("这些烫样的屋顶甚至可以一层层掀开，里面的梁柱榫卯结构、彩画细节一览无余。",
             "Zhèxiē tàngyàng de wūdǐng shènzhì kěyǐ yìcéngcéng xiānkāi, lǐmiàn de liángzhù sǔnmǎo jiégòu, cǎihuà xìjié yìlǎn-wúyú.",
             "Mái của các mô hình này thậm chí có thể mở từng tầng, để lộ kết cấu xà cột mộng ngàm và hoa văn tỉ mỉ bên trong rõ mồn một."),
            ("如今留存下来的数万件样式雷建筑图档，被联合国列入《世界记忆名录》，彰显着东方工匠的非凡造诣。",
             "Rújīn liúcún xiàlái de shùwàn jiàn Yàngshì Léi jiànzhù túdàng, bèi Liánhéguó lièrù 《Shìjiè Jìyì Mínglù》, zhāngxiǎn zhe dōngfāng gōngjiàng de fēifán zàoyì.",
             "Hàng vạn bản vẽ và tài liệu Dạng Thức Lôi lưu truyền đến nay đã được UNESCO ghi vào Ký ức Thế giới, tỏa sáng tài năng bậc thầy của thợ thủ công phương Đông.")
        ],
        "preferred_spotlight": ["著名", "建筑", "制造", "详细"],
        "quiz": [
            {"id": "q1", "question_vi": "Gia tộc 'Dạng Thức Lôi' (样式雷) giữ vai trò gì trong triều đình nhà Thanh?",
             "options_vi": ["Tổng chỉ huy thiết kế các công trình cung điện và lăng tẩm hoàng gia suốt hơn 200 năm", "Thuyền trưởng chỉ huy hải quân", "Đầu bếp hoàng cung"], "answer": 0, "explanation_vi": "Họ Lôi qua 8 thế hệ đã thiết kế gần như toàn bộ các công trình kiến trúc hoàng gia đỉnh cao thời Thanh."},
            {"id": "q2", "question_vi": "'Thang dạng' (烫样) do gia tộc Lôi sáng tạo là thứ gì?",
             "options_vi": ["Mô hình kiến trúc 3D thu nhỏ tinh xảo có thể mở từng lớp mái ra xem bên trong", "Bánh rán nhân đậu", "Ấm đun nước bằng đồng"], "answer": 0, "explanation_vi": "'Thang dạng' là mô hình kiến trúc ba chiều chi tiết được dựng để hoàng đế xem trước khi xây dựng thực tế."},
            {"id": "q3", "question_vi": "Kho tài liệu bản vẽ của Dạng Thức Lôi được vinh danh ở danh hiệu quốc tế nào?",
             "options_vi": ["Ký ức Thế giới của UNESCO", "Kỷ lục Guinness nhà cao tầng", "Giải vô địch hội họa"], "answer": 0, "explanation_vi": "Bản vẽ Dạng Thức Lôi được UNESCO vinh danh trong Ký ức Thế giới (Memory of the World)."}
        ]
    })

    # 59. 民乐
    stories.append({
        "id": "wanwu_story_059",
        "chapter_no": 59,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 618,
        "book_page_end": 633,
        "page_display": "Trang 618 - 633",
        "title": {"zh": "民乐：古老声音的流变", "vi": "Âm nhạc dân tộc: Dòng chảy âm thanh cổ xưa"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪕",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 618 - 633 · Ngũ cung 'Cung, Thương, Giốc, Chủy, Vũ' và hành trình hòa quyện của cổ cầm, nhị hồ, đàn tỳ bà qua các thời đại.",
        "sentences_data": [
            ("中国传统民族音乐拥有数千年的深厚底蕴，琴声悠扬如高山流水，令人心驰神往。",
             "Zhōngguó chuántǒng mínzú yīnyuè yǒuzhe shùqiān nián de shēnhòu dǐyùn, qínshēng yōuyáng rú gāoshān-liúshuǐ, lìng rén xīnchí-shénwǎng.",
             "Âm nhạc dân tộc truyền thống Trung Hoa có chiều sâu ngàn năm, tiếng đàn thanh thoát như núi cao nước chảy, cuốn hút tâm can."),
            ("古人以‘宫、商、角、徵、羽’五声为基础音律，讲究‘乐者天地之和’的自然审美情趣。",
             "Gǔrén yǐ ‘gōng, shāng, jué, zhǐ, yǔ’ wǔshēng wéi jīchǔ yīnlǜ, jiǎngjiù ‘yuè zhě tiāndì zhī hé’ de zìrán shěnměi qíngqù.",
             "Cổ nhân lấy năm cung 'Cung, Thương, Giốc, Chủy, Vũ' làm thang âm cơ bản, đề cao vẻ đẹp tự nhiên 'âm nhạc là hòa khí của đất trời'."),
            ("在古代文人的案头，古琴不仅是一种乐器，更是修身养性、抒发情怀的精神伴侣。",
             "Zài gǔdài wénrén de àntóu, gǔqín bùjǐn shì yì zhǒng yuèqì, gèng shì xiūshēn-yǎngxìng, shūfā qínghuái de jīngshén bànlǚ.",
             "Trên bàn đọc của văn nhân xưa, cổ cầm không đơn thuần là nhạc cụ mà còn là người bạn tri kỷ để tu tâm dưỡng tính, gửi gắm tâm tư."),
            ("汉唐以来，琵琶、二胡等源自西域的异域乐器逐渐融入华夏乐章，演化出丰富多彩的民乐体系。",
             "Hàn-Táng yǐlái, pípá, èrhú děng yuánzì xīyù de yìyù yuèqì zhújiàn róngrù Huáxià yuèzhāng, yǎnhuà chū fēngfù-duōcǎi de mínyuè tǐxì.",
             "Từ thời Hán Đường, các nhạc cụ du nhập từ Tây Vực như tỳ bà, nhị hồ đã hòa nhập vào nhạc khúc Hoa Hạ, làm giàu cho nền âm nhạc."),
            ("现代民乐融合交响乐编曲技法，让传统竹笛与古筝在国际舞台上奏响震撼人心的华美乐章。",
             "Xiàndài mínyuè rónghé jiāoxiǎngyuè biānqǔ jìfǎ, ràng chuántǒng zhúdí yǔ gǔzhēng zài guójì wǔtái shàng zòuxiǎng zhènhàn-rénxīn de huáměi yuèzhāng.",
             "Âm nhạc dân tộc ngày nay kết hợp cùng nghệ thuật phối khí giao hưởng, đưa tiếng sáo trúc và đàn tranh ngân vang khắp vũ đài quốc tế.")
        ],
        "preferred_spotlight": ["传统", "音乐", "基础", "丰富"],
        "quiz": [
            {"id": "q1", "question_vi": "Hệ thống ngũ cung cơ bản trong âm nhạc cổ truyền gồm những nốt nào?",
             "options_vi": ["Cung, Thương, Giốc, Chủy, Vũ (宫、商、角、徵、羽)", "Đồ, Rê, Mi, Pha, Son", "Một, Hai, Ba, Bốn, Năm"], "answer": 0, "explanation_vi": "Ngũ thanh truyền thống phương Đông là Cung, Thương, Giốc, Chủy, Vũ."},
            {"id": "q2", "question_vi": "Nhạc cụ nào được coi là biểu tượng thanh cao tu tâm dưỡng tính của văn nhân cổ đại?",
             "options_vi": ["Đàn Cổ Cầm (古琴)", "Kèn đồng", "Trống trận"], "answer": 0, "explanation_vi": "Cổ Cầm đứng đầu trong 'Cầm Kỳ Thi Họa' đại diện cho học vấn thanh nhã."},
            {"id": "q3", "question_vi": "Những nhạc cụ nào bắt nguồn từ Tây Vực sau đó được hòa nhập thành nhạc cụ dân tộc quen thuộc?",
             "options_vi": ["Tỳ bà và đàn Nhị hồ", "Chuông đồng", "Khánh đá"], "answer": 0, "explanation_vi": "Tỳ bà và nhị hồ (chữ Hồ nghĩa là người phương bắc/Tây Vực) được du nhập và bản địa hóa xuất sắc."}
        ]
    })

    # 60. “大圣”
    stories.append({
        "id": "wanwu_story_060",
        "chapter_no": 60,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 633,
        "book_page_end": 645,
        "page_display": "Trang 633 - 645",
        "title": {"zh": "“大圣”：俺老孙来也", "vi": "Tề Thiên Đại Thánh: Lão Tôn tới đây!"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🐒",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 633 - 645 · Hình tượng Tôn Ngộ Không trong Tây Du Ký: cội nguồn văn học dân gian và biểu tượng tự do, bất khuất.",
        "sentences_data": [
            ("只要提起头戴金箍、手握如意金箍棒的美猴王孙悟空，几乎每个中国人都能讲出一段精彩故事。",
             "Zhǐyào tíqǐ tóu dài jīngū, shǒu wò rúyì-jīngūbàng de Měihóuwáng Sūn Wùkōng, jīhū měi gè Zhōngguó rén dōu néng jiǎngchū yí duàn jīngcǎi gùshi.",
             "Chỉ cần nhắc tới Mỹ Hầu Vương Tôn Ngộ Không đầu đeo vòng kim cô, tay cầm gậy Như Ý, hầu như người nào cũng kể được câu chuyện ly kỳ."),
            ("在明代吴承恩的古典名著《西游记》中，孙悟空被塑造成为一位神通广大、蔑视强权的齐天大圣。",
             "Zài Míngdài Wú Chéng'ēn de gǔdiǎn míngzhù 《Xīyóujì》 zhōng, Sūn Wùkōng bèi sùzào chéngwéi yí wèi shéntōng-guǎngdà, mièshì qiángquán de Qítiān Dàshèng.",
             "Trong danh tác cổ điển Tây Du Ký của Ngô Thừa Ân đời Minh, Tôn Ngộ Không được khắc họa là Tề Thiên Đại Thánh thần thông quảng đại, không sợ cường quyền."),
            ("学者研究发现，孙悟空的文学形象可能融合了印度史诗中的神猴哈奴曼以及中国古代无支祁水怪传说。",
             "Xuézhě yánjiū fāxiàn, Sūn Wùkōng de wénxué xíngxiàng kěnéng rónghé le Yìndù shǐshī zhōng de shénhóu Hānǔmàn yǐjí Zhōngguó gǔdài Wúzhīqí shuǐguài chuánshuō.",
             "Nghiên cứu văn học chỉ ra hình tượng Ngộ Không có thể giao thoa từ thần khỉ Hanuman trong sử thi Ấn Độ và truyền thuyết vượn nước Vô Chi Kỳ."),
            ("在历经九九八十一难的取经路上，大圣机智勇敢、降妖除魔，始终忠诚护送师父唐僧到达西天。",
             "Zài lìjīng jiǔjiǔ-bāshíyī nàn de qǔjīng lùshàng, Dàshèng jīzhì yǒnggǎn, xiángyāo-chúmó, shǐzhōng zhōngchéng hùsòng shīfu Tángsēng dàodá xītiān.",
             "Trên đường thỉnh kinh qua 81 kiếp nạn, Đại Thánh mưu trí dũng cảm hàng yêu trừ ma, trước sau một lòng trung thành hộ tống sư phụ Đường Tăng đến Tây phương."),
            ("孙悟空那份不畏艰难、追求自由与正义的叛逆精神，让他成为了跨越国界与时空的超级文化符号。",
             "Sūn Wùkōng nà fèn bú wèi jiānnán, zhuīqiú zìyóu yǔ zhèngyì de pànnì jīngshén, ràng tā chéngwéi le kuàyuè guójiè yǔ shíkōng de chāojí wénhuà fúhào.",
             "Tinh thần bất khuất trước gian nguy, hướng tới tự do và chính nghĩa đã biến Tôn Ngộ Không thành biểu tượng văn hóa trường tồn qua thời gian.")
        ],
        "preferred_spotlight": ["故事", "研究", "发现", "文化"],
        "quiz": [
            {"id": "q1", "question_vi": "Tác giả danh tác 'Tây Du Ký' thời nhà Minh là ai?",
             "options_vi": ["Ngô Thừa Ân (吴承恩)", "La Quán Trung", "Thi Nại Am"], "answer": 0, "explanation_vi": "Ngô Thừa Ân là tác giả tiểu thuyết thần thoại kinh điển Tây Du Ký."},
            {"id": "q2", "question_vi": "Binh khí hộ thân nổi tiếng của Tôn Ngộ Không là gì?",
             "options_vi": ["Gậy Như Ý Kim Cô Bổng (lấy từ Long Cung)", "Cây chổi quét nhà", "Thanh bảo kiếm bằng gỗ"], "answer": 0, "explanation_vi": "Như Ý Kim Cô Bổng vốn là Định Hải Thần Châm của Đông Hải Long Cung."},
            {"id": "q3", "question_vi": "Hình tượng Tôn Ngộ Không đại diện cho phẩm chất tinh thần nào được yêu mến nhất?",
             "options_vi": ["Mưu trí dũng cảm, yêu chuộng tự do và không sợ khó khăn cường quyền", "Lười biếng chỉ thích ăn ngủ", "Hay ghen ghét bạn bè"], "answer": 0, "explanation_vi": "Đại Thánh tượng trưng cho lòng quả cảm diệt trừ cái ác và tinh thần tự do phóng khoáng."}
        ]
    })

    # 61. 国服
    stories.append({
        "id": "wanwu_story_061",
        "chapter_no": 61,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 645,
        "book_page_end": 651,
        "page_display": "Trang 645 - 651",
        "title": {"zh": "国服：穿过岁月的华裳", "vi": "Quốc phục: Y phục hoa mỹ vượt tháng năm"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "👘",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 645 - 651 · Tiến trình phát triển trang phục từ Thâm y thời Chu Hán, áo cổ tròn thời Đường đến nét đẹp quốc phục ngày nay.",
        "sentences_data": [
            ("服饰不仅是人类遮体御寒的日常衣物，更是展现民族文化与礼仪制度的重要载体。",
             "Fúshì bùjǐn shì rénlèi zhētǐ yùhán de rìcháng yīwù, gèng shì zhǎnxiàn mínzú wénhuà yǔ lǐyí zhìdù de zhòngyào zàitǐ.",
             "Trang phục không chỉ là y phục mặc che thân chống rét mỗi ngày, mà còn là phương tiện quan trọng thể hiện văn hóa và lễ nghi dân tộc."),
            ("中国自古被称为‘衣冠上国、礼仪之邦’，历朝历代的服饰形制都有着严格而典雅的规范。",
             "Zhōngguó zìgǔ bèi chēng wéi ‘yīguān-shàngguó, lǐyí zhī bāng’, lìcháo-lìdài de fúshì xíngzhì dōu yǒuzhe yángé ér diǎnyǎ de guīfàn.",
             "Trung Quốc từ xưa được mệnh danh là 'Đất nước y quan, xứ sở lễ nghi', quy chế trang phục mỗi triều đại đều có chuẩn mực thanh nhã."),
            ("先秦汉代的‘深衣’将衣与裳上下缝合在一起，宽袍大袖展现出端庄沉稳的君子之风。",
             "Xiān-Qín-Hàndài de ‘shēnyī’ jiāng yī yǔ cháng shàngxià fénghé zài yìqǐ, kuānpáo-dàxiù zhǎnxiàn chū duānzhuāng chénwěn de jūnzǐ zhī fēng.",
             "Mẫu áo 'Thâm y' thời Tiên Tần và Hán may liền vạt áo trên với thân váy dưới, vạt rộng tay dài biểu hiện phong thái đoan chính của người quân tử."),
            ("盛唐时期的服饰则绚丽奔放，圆领袍衫与齐胸襦裙展现了当时开放包容的帝国盛世气象。",
             "Shèngtáng shíqī de fúshì zé xuànlì bēnfàng, yuánlǐng páoshān yǔ qíxiōng rúqún zhǎnxiàn le dāngshí kāifàng bāoróng de dìguó shèngshì qìxiàng.",
             "Trang phục thời Thịnh Đường lại rực rỡ phóng khoáng, áo vạt cổ tròn và váy nhu quần ngang ngực phản ánh khí thế phồn hoa cởi mở."),
            ("如今，以汉服为代表的传统服饰热潮在年轻一代中兴起，焕发出蓬勃的文化自信与现代活力。",
             "Rújīn, yǐ hànfú wéi dàibiǎo de chuántǒng fúshì rècháo zài niánqīng yídài zhōng xīngqǐ, huànfā chū péngbó de wénhuà zìxìn yǔ xiàndài huólì.",
             "Ngày nay, làn sóng cổ phục Hán phục đang nở rộ trong giới trẻ, tỏa ra niềm tự hào văn hóa tràn đầy sức sống thời hiện đại.")
        ],
        "preferred_spotlight": ["展示", "文化", "制度", "严格"],
        "quiz": [
            {"id": "q1", "question_vi": "Kiểu trang phục cổ xưa nào may nối thân áo trên và vạt váy dưới thành một thể thống nhất?",
             "options_vi": ["Thâm y (深衣) thời Tiên Tần và Hán", "Áo sơ mi thắt cà vạt", "Áo mưa tiện lợi"], "answer": 0, "explanation_vi": "Thâm y may liền vạt trên và dưới tượng trưng cho sự ngay thẳng và quy củ."},
            {"id": "q2", "question_vi": "Trang phục thời Thịnh Đường phản ánh nét đặc trưng xã hội nào?",
             "options_vi": ["Sự phồn hoa, cởi mở, tự tin và màu sắc phóng khoáng", "Sự buồn bã cô lập", "Sự tiết kiệm không dám nhuộm vải"], "answer": 0, "explanation_vi": "Thời Đường giao lưu quốc tế rộng rãi nên y phục tươi sáng, thanh thoát và tự do."},
            {"id": "q3", "question_vi": "Trang phục truyền thống ngày nay đang được thế hệ trẻ đón nhận bằng cách nào?",
             "options_vi": ["Mặc Hán phục dạo phố, chụp ảnh và biểu diễn tôn vinh văn hóa truyền thống", "Đem đốt hết", "Cấm không cho ai xem"], "answer": 0, "explanation_vi": "Giới trẻ ngày càng say mê mặc trang phục truyền thống để lan tỏa nét đẹp cổ điển."}
        ]
    })

    # 62. 旗袍
    stories.append({
        "id": "wanwu_story_062",
        "chapter_no": 62,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 651,
        "book_page_end": 662,
        "page_display": "Trang 651 - 662",
        "title": {"zh": "旗袍：“九翘三弯”东方韵", "vi": "Sườn xám Kỳ Bào: Nét duyên phương Đông 'Chín uốn ba cong'"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "👗",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 651 - 662 · Hành trình lột xác từ áo choàng rộng của phụ nữ Mãn Thanh đến trang phục tôn vinh đường nét người phụ nữ Thượng Hải.",
        "sentences_data": [
            ("旗袍剪裁流畅，立领盘扣，是极具代表性的中国女性传统礼服。",
             "Qípáo jiǎncái liúchàng, lìlǐng pánkòu, shì jí jù dàibiǎoxìng de Zhōngguó nǚxìng chuántǒng lǐfú.",
             "Kỳ bào (sườn xám) có đường cắt mượt mà, cổ đứng cài khuy tết, là trang phục dạ hội truyền thống tiêu biểu của phái nữ Trung Hoa."),
            ("旗袍原本源自清代满族旗人妇女的宽大长袍，线条平直宽松，以保暖端庄为主。",
             "Qípáo yuánběn yuánzì Qīngdài Mǎnzú qírén fùnǚ de kuāndà chángpáo, xiàntiáo píngzhí kuānsōng, yǐ bǎowǎn duānzhuāng wéizhǔ.",
             "Kỳ bào vốn khởi nguồn từ áo trường bào thụng của phụ nữ Bát Kỳ thời Thanh, đường may suông rộng cốt giữ ấm và kín đáo."),
            ("二十世纪二十年代，西方修身立体剪裁理念传入上海，新式旗袍应运而生。",
             "Èrshí shìjì èrshí niándài, xīfāng xiūshēn lìtǐ jiǎncái lǐniàn chuánrù Shànghǎi, xīnshì qípáo yìngyùn'érshēng.",
             "Thập niên 1920, kỹ thuật cắt may lập thể ôm dáng của phương Tây du nhập Thượng Hải, khai sinh ra áo sườn xám cách tân thời thượng."),
            ("设计师收紧了腰身，配以精巧的手工花扣与开衩裙摆，完美烘托出女性优雅婀娜的曲线。",
             "Shèjìshī shōujǐn le yāoshēn, pèi yǐ jīngqiǎo de shǒugōng huākòu yǔ kāichà qúnbǎi, wánměi hōngtuō chū nǚxìng yōuyǎ ē'nuó de qūxiàn.",
             "Các nhà thiết kế chiết eo thon gọn, kết hợp khuy hoa tết tay và đường xẻ tà tinh tế, tôn lên trọn vẹn đường cong duyên dáng của người phụ nữ."),
            ("如今旗袍频频亮相国际时尚盛会与重大外交场合，向世界展示着含蓄而高雅的东方神韵。",
             "Rújīn qípáo pínpín liàngxiàng guójì shíshàng shènghuì yǔ zhòngdà wàijiāo chǎnghé, xiàng shìjiè zhǎnshì zhe hánxù ér gāoyǎ de dōngfāng shényùn.",
             "Ngày nay, sườn xám thường xuyên xuất hiện trên các sàn diễn thời trang quốc tế và dịp ngoại giao trọng đại, quảng bá nét duyên kín đáo phương Đông.")
        ],
        "preferred_spotlight": ["传统", "西方", "设计", "展示"],
        "quiz": [
            {"id": "q1", "question_vi": "Kỳ bào (sườn xám) ban đầu có nguồn gốc từ trang phục của tộc người nào?",
             "options_vi": ["Áo choàng dài của phụ nữ Bát Kỳ (người Mãn Châu thời Thanh)", "Trang phục người Viking", "Áo kimono Nhật Bản"], "answer": 0, "explanation_vi": "Kỳ bào vốn là y phục của phụ nữ các kỳ người Mãn (Bát Kỳ)."},
            {"id": "q2", "question_vi": "Thành phố nào là cái nôi ra đời của kiểu sườn xám cách tân ôm dáng thời thượng thập niên 1920?",
             "options_vi": ["Thượng Hải (上海)", "Trùng Khánh", "Côn Minh"], "answer": 0, "explanation_vi": "Thượng Hải thập niên 1920-1930 là trung tâm thời trang khai sinh ra sườn xám tân thời tân tiến."},
            {"id": "q3", "question_vi": "Chi tiết thủ công tinh xảo nào là điểm nhấn đặc trưng trên cổ áo sườn xám?",
             "options_vi": ["Nút khuy hoa tết tay (bàn khấu 盘扣)", "Khóa kéo kim loại to bản", "Dây thừng gai"], "answer": 0, "explanation_vi": "Những chiếc khuy bện bằng dải vải tết hình hoa lá tinh xảo là linh hồn thủ công của kỳ bào."}
        ]
    })

    # 63. 年画
    stories.append({
        "id": "wanwu_story_063",
        "chapter_no": 63,
        "level": "HSK4",
        "book_volume": 3,
        "book_page_start": 662,
        "book_page_end": 675,
        "page_display": "Trang 662 - 675",
        "title": {"zh": "年画：历史风物跃然纸上", "vi": "Tranh Tết: Nét phong vật lịch sử trên trang giấy đỏ"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🧧",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 662 - 675 · Tranh khắc gỗ dân gian đón xuân từ thần giữ cửa Môn Thần đến tranh em bé ôm cá chép cầu phúc đầu năm.",
        "sentences_data": [
            ("每逢新春佳节，千家万户总喜欢在大门和墙壁上张贴色彩喜庆的年画，祈求来年五谷丰登、吉祥安康。",
             "Měiféng xīnchūn jiājié, qiānjiā-wànhù zǒng xǐhuan zài dàmén hé qiángbì shàng zhāngtiē sècǎi xǐqìng de niánhuà, qǐqiú láinián wǔgǔ-fēngdēng, jíxiáng ānkāng.",
             "Mỗi dịp Tết đến xuân về, muôn nhà đều thích dán những bức tranh Tết rực rỡ lên cửa lớn và vách tường, cầu mong mùa màng bội thu, cát tường an khang."),
            ("年画最早可以追溯到古代辟邪驱鬼的‘门神’，人们在桃木板上绘制秦琼、尉迟恭等威武将军的画像。",
             "Niánhuà zuìzǎo kěyǐ zhuīsù dào gǔdài bìxié qūguǐ de ‘ménshén’, rénmen zài táomùbǎn shàng huìzhì Qín Qióng, Yùchí Gōng děng wēiwǔ jiāngjūn de huàxiàng.",
             "Tranh Tết khởi thủy từ tục vẽ 'Môn Thần' trừ tà, người xưa vẽ chân dung các dũng tướng uy nghiêm như Tần Thúc Bảo, Uất Trì Cung trên thẻ gỗ đào."),
            ("宋代以后，木版水印技术的成熟推动了年画的大量印制，题材扩展到民间戏曲、神话故事与市井生活。",
             "Sòngdài yǐhòu, mùbǎn shuǐyìn jìshù de chéngshú tuīdòng le niánhuà de dàliàng yìnzhì, tícái kuòzhǎn dào mínjiān xìqǔ, shénhuà gùshi yǔ shìjǐng shēnghuó.",
             "Sau thời Tống, kỹ thuật in mộc bản phát triển đã nhân bản tranh Tết rộng rãi, đề tài mở rộng sang tuồng tích sân khấu và nếp sống dân gian."),
            ("天津杨柳青、苏州桃花坞和山东潍坊成为了名扬全国的三大木版年画产地。",
             "Tiānjīn Yángliǔqīng, Sūzhōu Táohuāwù hé Shāndōng Wéifāng chéngwéi le míngyáng quánguó de sān dà mùbǎn niánhuà chǎndì.",
             "Dương Liễu Thanh (Thiên Tân), Đào Hoa Ổ (Tô Châu) và Duy Phường (Sơn Đông) trở thành ba cái nôi làm tranh mộc bản nức tiếng khắp nước."),
            ("年画中‘胖娃娃抱大鲤鱼’的经典构图寓意‘连年有余’，寄托着老百姓对美好生活最纯朴热烈的情感期盼。",
             "Niánhuà zhōng ‘pàng wáwa bào dà lǐyú’ de jīngdiǎn gòutú yùyì ‘liánnián yǒuyú’, jìtuō zhe lǎobǎixìng duì měihǎo shēnghuó zuì chúnpǔ rèliè de qínggǎn qīpàn.",
             "Hình tượng em bé bụ bẫm ôm cá chép lớn mang ý nghĩa 'Liên niên hữu dư' (quanh năm dư dả), gửi gắm ước mong mộc mạc về cuộc sống ấm no.")
        ],
        "preferred_spotlight": ["经常", "故事", "技术", "生活"],
        "quiz": [
            {"id": "q1", "question_vi": "Thể loại tranh Tết nguyên thủy bắt nguồn từ hình thức nào?",
             "options_vi": ["Tranh vẽ hai vị tướng giữ cửa (Môn Thần) dán trừ tà trên cánh cửa", "Tranh phong cảnh Tây phương", "Bản đồ hải trình"], "answer": 0, "explanation_vi": "Ban đầu tranh Môn Thần vẽ Tần Quỳnh và Uất Trì Cung được dán trước cửa để giữ nhà bình an."},
            {"id": "q2", "question_vi": "Kỹ thuật nào đã giúp tranh Tết được sản xuất hàng loạt phục vụ đông đảo người dân từ thời Tống?",
             "options_vi": ["Kỹ thuật in khắc gỗ (mộc bản thủy ấn)", "Chụp ảnh kỹ thuật số", "Vẽ từng nét thủ công trên lụa"], "answer": 0, "explanation_vi": "Kỹ thuật in mộc bản giúp sản xuất số lượng lớn tranh với chi phí bình dân."},
            {"id": "q3", "question_vi": "Bức tranh em bé ôm cá chép lớn mang thông điệp chúc phúc cát tường gì?",
             "options_vi": ["'Liên niên hữu dư' (năm nào cũng sung túc, của cải dư thừa)", "Chúc đi câu được nhiều cá", "Khuyên ăn chay"], "answer": 0, "explanation_vi": "Chữ Ngư (cá 鱼) đồng âm với Dư (dư dả 余), biểu tượng quanh năm no đủ sung túc."}
        ]
    })

    return stories


def main():
    stories = get_volume3_stories()
    print(f"Building Volume 3 ({len(stories)} stories)...")
    for sdata in stories:
        res = build_and_save_story(sdata)
        print(f"  [+] {res['id']}: {res['title']['zh']} ({res['page_display']}) - 100% Pinyin guaranteed.")

    update_manifest_all()


if __name__ == "__main__":
    main()
