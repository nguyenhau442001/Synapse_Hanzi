#!/usr/bin/env python3
"""
tools/build_wanwu_volume2.py
Builds Volume 2 (Chapters 23 to 42) of 《万物有意思》:
- Guaranteed 100% Pinyin coverage on all Chinese character tokens
- Sino-Vietnamese (Hán-Việt) on every token
- High-quality Vietnamese translations
- 3 comprehension quiz questions per chapter
- WebP illustration linked to book page
"""

from wanwu_builder_common import build_and_save_story, update_manifest_all


def get_volume2_stories():
    stories = []

    # 23. 辣椒
    stories.append({
        "id": "wanwu_story_023",
        "chapter_no": 23,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 232,
        "book_page_end": 241,
        "page_display": "Trang 232 - 241",
        "title": {"zh": "辣椒：点燃味觉的火辣传奇", "vi": "Ớt: Huyền thoại cay nồng đánh thức vị giác"},
        "topic": "food_lifestyle",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🌶️",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 232 - 241 · Hành trình của trái ớt từ rừng nhiệt đới châu Mỹ, trong socola của người Maya cổ đến món cay nổi tiếng toàn cầu.",
        "sentences_data": [
            ("近年来，辣味风行各地，川菜、湘菜等经典菜系越来越受到人们的喜爱。",
             "Jìnnián lái, làwèi fēngxíng gèdì, Chuāncài, Xiāngcài děng jīngdiǎn càixì yuèláiyuè shòudào rénmen de xǐ'ài.",
             "Những năm gần đây, vị cay thịnh hành khắp nơi, các trường phái ẩm thực Tứ Xuyên, Hồ Nam ngày càng được ưa chuộng."),
            ("中国是世界上的辣椒生产与消费大国，许多人无辣不欢。",
             "Zhōngguó shì shìjiè shàng de làjiāo shēngchǎn yǔ xiāofèi dàguó, xǔduō rén wú là bù huān.",
             "Trung Quốc là quốc gia sản xuất và tiêu thụ ớt hàng đầu thế giới, nhiều người không có vị cay thì không thấy ngon miệng."),
            ("然而在古代，中国原本并没有辣椒，这道火辣的风味起源于美洲的墨西哥一带。",
             "Rán'ér zài gǔdài, Zhōngguó yuánběn bìng méiyǒu làjiāo, zhè dào huǒlà de fēngwèi qǐyuán yú Měizhōu de Mòxīgē yídài.",
             "Tuy nhiên vào thời cổ đại, Trung Quốc vốn không có ớt, hương vị cay nồng này bắt nguồn từ vùng Mexico châu Mỹ."),
            ("古代玛雅人很早就开始食用辣椒，他们甚至把辣椒和可可混合在一起制作饮品。",
             "Gǔdài Mǎyǎ rén hěn zǎo jiù kāishǐ shíyòng làjiāo, tāmen shènzhì bǎ làjiāo hé kěkě hùnhé zài yìqǐ zhìzuò yǐnpǐn.",
             "Người Maya cổ đại từ rất sớm đã sử dụng ớt, họ thậm chí trộn ớt với cacao để pha chế thức uống."),
            ("哥伦布航海到达美洲后，发现了这种红色的果实，并将其带回欧洲。",
             "Gēlúnbù hánghǎi dàodá Měizhōu hòu, fāxiàn le zhè zhǒng hóngsè de guǒshí, bìng jiāng qí dàihuí Ōuzhōu.",
             "Sau khi Columbus vượt biển đến châu Mỹ, ông đã phát hiện loài quả đỏ này và mang nó trở về châu Âu."),
            ("明代末年，辣椒通过海上丝绸之路传入中国，起初只被当作观赏植物栽培。",
             "Míngdài mònián, làjiāo tōngguò hǎishàng sīchóuzhīlù chuánrù Zhōngguó, qǐchū zhǐ bèi dàngzuò guānshǎng zhíwù zāipéi.",
             "Vào cuối triều Minh, ớt theo Con đường Tơ lụa trên biển truyền vào Trung Quốc, ban đầu chỉ được trồng như cây cảnh."),
            ("后来人们发现辣椒具有驱寒开胃的功效，才逐渐成为厨房中不可缺少的调味品。",
             "Hòulái rénmen fāxiàn làjiāo jùyǒu qūhán kāiwèi de gōngxiào, cái zhújiàn chéngwéi chúfáng zhōng bùkě quēshǎo de tiáowèipǐn.",
             "Về sau con người phát hiện ớt có tác dụng trừ hàn kích thích vị giác, mới dần trở thành gia vị không thể thiếu trong căn bếp.")
        ],
        "preferred_spotlight": ["世界", "开始", "发现", "缺少"],
        "quiz": [
            {"id": "q1", "question_vi": "Ớt có nguồn gốc ban đầu từ đâu?", "options_vi": ["Vùng Mexico ở châu Mỹ", "Đông Nam Á", "Tây Á"], "answer": 0, "explanation_vi": "Ớt có nguồn gốc nguyên sản tại châu Mỹ (vùng Mexico ngày nay)."},
            {"id": "q2", "question_vi": "Ai là người mang ớt từ châu Mỹ về châu Âu?", "options_vi": ["Columbus", "Marco Polo", "Magellan"], "answer": 0, "explanation_vi": "Columbus phát hiện quả ớt khi đến châu Mỹ và mang về châu Âu."},
            {"id": "q3", "question_vi": "Khi mới truyền vào Trung Quốc thời nhà Minh, ớt được dùng làm gì?", "options_vi": ["Làm cây cảnh ngắm hoa trái", "Làm thuốc nhuộm tóc", "Làm thức ăn gia súc"], "answer": 0, "explanation_vi": "Ban đầu ớt chỉ được trồng trong vườn hoa làm cây cảnh thưởng thức."}
        ]
    })

    # 24. 黄瓜
    stories.append({
        "id": "wanwu_story_024",
        "chapter_no": 24,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 241,
        "book_page_end": 248,
        "page_display": "Trang 241 - 248",
        "title": {"zh": "黄瓜：漂洋过海3000年", "vi": "Dưa chuột: Hành trình vượt đại dương 3000 năm"},
        "topic": "food_lifestyle",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🥒",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 241 - 248 · Nguồn gốc loài dưa chuột từ chân dãy Himalaya đến cái tên 'Hồ qua' của Trương Khiên thời Hán.",
        "sentences_data": [
            ("黄瓜清脆爽口，是夏天餐桌上最受欢迎的蔬菜之一。",
             "Huángguā qīngcuì shuǎngkǒu, shì xiàtiān cānzhuō shàng zuì shòuyuānyíng de shūcài zhī yī.",
             "Dưa chuột giòn ngọt thanh mát, là một trong những món rau được ưa chuộng nhất trên bàn ăn mùa hè."),
            ("黄瓜的原产地是喜马拉雅山南麓的热带雨林，距今已有三千多年的栽培历史。",
             "Huángguā de yuánchǎndì shì Xǐmǎlāyǎshān nánlù de rèdài yǔlín, jùjīn yǐ yǒu sānqiān duō nián de zāipéi lìshǐ.",
             "Quê hương ban đầu của dưa chuột là những cánh rừng mưa nhiệt đới dưới chân phía nam dãy Himalaya, có hơn 3000 năm lịch sử trồng trọt."),
            ("西汉时期，张骞出使西域，把这种特别的瓜果种子带回了中原。",
             "Xīhàn shíqī, Zhāng Qiān chūshǐ xīyù, bǎ zhè zhǒng tèbié de guāguǒ zhǒngzǐ dàihuí le zhōngyuán.",
             "Thời Tây Hán, Trương Khiên đi sứ Tây Vực, đã mang hạt giống của loài quả dưa đặc biệt này về vùng Trung Nguyên."),
            ("因为是从西域胡人地区传入的，所以古人最早把它叫做“胡瓜”。",
             "Yīnwèi shì cóng xīyù hùrén dìqū chuánrù de, suǒyǐ gǔrén zuìzǎo bǎ tā jiàozuò “húguā”.",
             "Bởi vì truyền vào từ vùng đất của các tộc người Hồ ở Tây Vực, nên người xưa ban đầu gọi nó là 'Hồ qua'."),
            ("到了后赵时期，皇帝石勒下令改名，胡瓜才正式被称为“黄瓜”。",
             "Dàole Hòuzhào shíqī, huángdì Shílè xiàlìng gǎimíng, húguā cái zhèngshì bèi chēng wéi “huángguā”.",
             "Đến thời Hậu Triệu, hoàng đế Thạch Lặc hạ lệnh đổi tên, Hồ qua mới chính thức được gọi là 'Hoàng qua' (dưa chuột)."),
            ("黄瓜成熟时表皮其实会变成黄色，现代人吃的青绿色黄瓜只是嫩果状态。",
             "Huángguā chéngshú shí biǎopí qíshí huì biànchéng huángsè, xiàndàirén chī de qīnglǜsè huángguā zhǐshì nènguǒ zhuàngtài.",
             "Dưa chuột khi chín già vỏ ngoài thực ra chuyển sang màu vàng ươm, quả dưa màu xanh mà người hiện đại ăn chỉ là lúc quả còn non.")
        ],
        "preferred_spotlight": ["特别", "正式", "受到", "历史"],
        "quiz": [
            {"id": "q1", "question_vi": "Dưa chuột ban đầu được Trương Khiên mang về có tên gọi là gì?", "options_vi": ["Hồ qua (胡瓜)", "Thanh qua (青瓜)", "Bí đao (冬瓜)"], "answer": 0, "explanation_vi": "Ban đầu dưa chuột được gọi là 'Hồ qua' vì đến từ Tây Vực."},
            {"id": "q2", "question_vi": "Dưa chuột có nguồn gốc tự nhiên từ đâu?", "options_vi": ["Vùng chân núi phía nam dãy Himalaya", "Bắc Cực", "Bắc Mỹ"], "answer": 0, "explanation_vi": "Dưa chuột bắt nguồn từ rừng nhiệt đới dưới chân dãy Himalaya ở Nam Á."},
            {"id": "q3", "question_vi": "Tại sao dưa chuột lại có chữ 'hoàng' (vàng) trong tên tiếng Hán?", "options_vi": ["Khi chín già vỏ quả sẽ chuyển sang màu vàng", "Hoa dưa chuột màu đỏ", "Ruột dưa màu tím"], "answer": 0, "explanation_vi": "Khi chín tự nhiên hoàn toàn, quả dưa chuột sẽ ngả sang màu vàng ươm."}
        ]
    })

    # 25. 莲子
    stories.append({
        "id": "wanwu_story_025",
        "chapter_no": 25,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 248,
        "book_page_end": 256,
        "page_display": "Trang 248 - 256",
        "title": {"zh": "莲子：形似航天器密封舱", "vi": "Hạt sen: 'Khoang kín phi thuyền' của tự nhiên"},
        "topic": "nature_wildlife",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪷",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 248 - 256 · Sức sống bền bỉ nghìn năm của hạt sen cổ đại nhờ cấu trúc vỏ kín đặc biệt tựa khoang tàu vũ trụ.",
        "sentences_data": [
            ("在中国传统文化中，莲花出淤泥而不染，被视为君子品格的象征。",
             "Zài Zhōngguó chuántǒng wénhuà zhōng, liánhuā chū yūní ér bù rǎn, bèi shìwéi jūnzǐ pǐngé de xiàngzhēng.",
             "Trong văn hóa truyền thống Trung Hoa, hoa sen gần bùn mà chẳng hôi tanh mùi bùn, được xem là biểu tượng của người quân tử."),
            ("荷花结出的果实莲子，更是大自然中生命力最顽强的种子之一。",
             "Héhuā jiéchū de guǒshí liánzǐ, gèng shì dàzìrán zhōng shēngmìnglì zuì wánqiáng de zhǒngzǐ zhī yī.",
             "Hạt sen kết ra từ hoa sen lại là một trong những hạt giống có sức sống dẻo dai nhất trong tự nhiên."),
            ("考古学家曾经在千年古墓中挖掘出埋藏了一千多年的古代莲子。",
             "Kǎogǔ xuéjiā céngjīng zài qiānnián gǔmù zhōng wājué chū máicáng le yìqiān duō nián de gǔdài liánzǐ.",
             "Các nhà khảo cổ từng khai quật được những hạt sen cổ chôn vùi hơn một nghìn năm trong các ngôi mộ cổ."),
            ("科学家对这些古莲子进行培育实验，令人惊奇的是，它们竟然重新发芽开出了美丽的花朵。",
             "Kēxuéjiā duì zhèxiē gǔliánzǐ jìnxíng péiyù shíyàn, lìng rén jīngqí de shì, tāmen jìngrán chóngxīn fāyá kāichū le měilì de huāduǒ.",
             "Các nhà khoa học tiến hành thử nghiệm gieo trồng hạt sen cổ, điều kỳ diệu là chúng vẫn nảy mầm và nở ra những đóa hoa rực rỡ."),
            ("莲子之所以能沉睡千年依然存活，秘密就在于它坚硬无比的种皮。",
             "Liánzǐ zhī suǒyǐ néng chénshuì qiānnián yīrán cúnhuó, mìmì jiù zàiyú tā jiānyìng wūbǐ de zhǒngpí.",
             "Hạt sen sở dĩ có thể ngủ say ngàn năm mà vẫn sống sót, bí mật nằm ở lớp vỏ hạt cứng cáp khác thường."),
            ("莲子的外壳就像航天器的密封舱一样，既完全隔绝水汽，又具备完美的透气平衡保护胚芽。",
             "Liánzǐ de wàiké jiù xiàng hángtiānqì de mìfēngcāng yíyàng, jì wánquán géjué shuǐqì, yòu jùbèi wánměi de tòuqì pínghéng bǎohù pēiyá.",
             "Vỏ ngoài của hạt sen tựa như khoang kín của phi thuyền không gian, vừa cách ly độ ẩm hoàn toàn vừa giữ cân bằng khí bảo vệ mầm sống.")
        ],
        "preferred_spotlight": ["文化", "传统", "实验", "保护"],
        "quiz": [
            {"id": "q1", "question_vi": "Hạt sen cổ chôn vùi nghìn năm có đặc tính kỳ diệu nào?",
             "options_vi": ["Vẫn có thể nảy mầm và nở hoa khi được gieo trồng", "Biến thành đá quý trong suốt", "Tự phát sáng trong đêm"], "answer": 0, "explanation_vi": "Hạt sen cổ ngàn năm vẫn giữ được sức sống và nảy mầm nở hoa."},
            {"id": "q2", "question_vi": "Tại sao hạt sen có thể bảo quản mầm sống lâu như vậy?",
             "options_vi": ["Vỏ hạt cực kỳ cứng và kín như khoang phi thuyền", "Nhờ ngâm trong dầu", "Nhờ đóng băng vĩnh cửu"], "answer": 0, "explanation_vi": "Lớp vỏ ngoài cực dày và kín giúp bảo vệ phôi mầm khỏi oxy hóa và độ ẩm bên ngoài."},
            {"id": "q3", "question_vi": "Hoa sen thường tượng trưng cho điều gì trong văn hóa truyền thống?",
             "options_vi": ["Phẩm cách thanh cao của người quân tử", "Sự giàu sang hào nhoáng", "Chiến thắng trên sa trường"], "answer": 0, "explanation_vi": "Hoa sen tượng trưng cho khí tiết thanh cao 'gần bùn mà chẳng hôi tanh mùi bùn'."}
        ]
    })

    # 26. 香蕉
    stories.append({
        "id": "wanwu_story_026",
        "chapter_no": 26,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 256,
        "book_page_end": 265,
        "page_display": "Trang 256 - 265",
        "title": {"zh": "香蕉：改变世界的水果", "vi": "Chuối: Thứ quả làm thay đổi thế giới"},
        "topic": "food_lifestyle",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🍌",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 256 - 265 · Lịch sử thuần dưỡng giống chuối nhiệt đới và tác động to lớn đến chuỗi cung ứng nông sản toàn cầu.",
        "sentences_data": [
            ("香蕉软糯香甜，富含丰富的钾元素，是世界上贸易量最大的热带水果之一。",
             "Xiāngjiāo ruǎnnuò xiāngtián, fùhán fēngfù de jiǎ yuánsù, shì shìjiè shàng màoyìliàng zuìdà de rèdài shuǐguǒ zhī yī.",
             "Quả chuối thơm mềm ngọt ngào, giàu hàm lượng kali, là một trong những loại trái cây nhiệt đới có lượng giao thương lớn nhất thế giới."),
            ("野生香蕉其实充满了坚硬的黑色籽粒，果肉极少，几乎无法直接吞咽食用。",
             "Yěshēng xiāngjiāo qíshí chōngmǎn le jiānyìng de hēisè zǐlì, guǒròu jí shǎo, jīhū wúfǎ zhíjiē tūnyàn shíyòng.",
             "Chuối rừng hoang dã thực chất chứa đầy những hạt cứng màu đen, rất ít thịt quả, hầu như không thể nuốt trực tiếp."),
            ("数千年前，东南亚的早期居民发现了无籽的天然变异品种，并开始人工分株繁殖。",
             "Shùqiān nián qián, Dōngnányà de zǎoqī jūmín fāxiàn le wú zǐ de tiānrán biànyì pǐnzhǒng, bìng kāishǐ réngōng fēnzhū fánzhí.",
             "Vài ngàn năm trước, cư dân cổ vùng Đông Nam Á đã phát hiện ra giống chuối đột biến tự nhiên không hạt và nhân giống sinh sản vô tính."),
            ("现代全球超市中销售的香蕉几乎全部属于华蕉品种，它们全部来自同一种基因克隆。",
             "Xiàndài quánqiú chāoshì zhōng xiāoshòu de xiāngjiāo jīhū quánbù shǔyú Huájiāo pǐnzhǒng, tāmen quánbù láizì tóng yì zhǒng jīyīn kèlóng.",
             "Gần như toàn bộ chuối bán trong siêu thị hiện đại đều thuộc giống chuối Cavendish, tất cả đều nhân bản từ cùng một kiểu gen."),
            ("由于缺乏遗传多样性，现代香蕉更容易受到真菌疾病的威胁，科学家正在积极培育新品种。",
             "Yóuyú quēfá yíchuán duōyàngxìng, xiàndài xiāngjiāo gèng róngyì shòudào zhēnjūn jíbìng de wēixié, kēxuéjiā zhèngzài jījí péiyù xīn pǐnzhǒng.",
             "Do thiếu tính đa dạng di truyền, cây chuối hiện đại dễ bị đe dọa bởi nấm bệnh, các nhà khoa học đang tích cực lai tạo giống mới.")
        ],
        "preferred_spotlight": ["丰富", "世界", "超市", "积极"],
        "quiz": [
            {"id": "q1", "question_vi": "Quả chuối rừng hoang dã thời xa xưa có đặc điểm gì?",
             "options_vi": ["Chứa rất nhiều hạt cứng màu đen và ít thịt quả", "Hoàn toàn không có vỏ", "Vỏ màu xanh lam phát sáng"], "answer": 0, "explanation_vi": "Chuối hoang dã nguyên thủy chứa đầy hạt cứng và rất ít ruột."},
            {"id": "q2", "question_vi": "Phần lớn chuối thương phẩm trên thị trường ngày nay được nhân giống bằng cách nào?",
             "options_vi": ["Nhân giống vô tính (chiết nhánh, cấy mô từ cùng dòng gen)", "Thụ phấn nhờ chim ưng", "Gieo hạt dại trong cát sa mạc"], "answer": 0, "explanation_vi": "Chuối ăn ngày nay là giống tam bội không hạt, nhân giống hoàn toàn bằng nhân bản vô tính."},
            {"id": "q3", "question_vi": "Thách thức lớn nhất đối với cây chuối hiện đại là gì?",
             "options_vi": ["Thiếu đa dạng di truyền nên dễ bị nấm bệnh tấn công hàng loạt", "Cây mọc quá cao không với tới", "Chim thích ăn vỏ chuối"], "answer": 0, "explanation_vi": "Tính đồng nhất di truyền khiến chuối dễ bị các chủng nấm bệnh Panama tàn phá."}
        ]
    })

    # 27. 葡萄酒
    stories.append({
        "id": "wanwu_story_027",
        "chapter_no": 27,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 265,
        "book_page_end": 275,
        "page_display": "Trang 265 - 275",
        "title": {"zh": "葡萄酒：盛宴的主角", "vi": "Rượu vang: Nhân vật chính của những bữa tiệc lớn"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🍷",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 265 - 275 · Lịch sử ủ rượu nho cổ đại từ vùng Kavkaz, văn hóa tiệc rượu Hy Lạp - La Mã đến thi ca Đường thi.",
        "sentences_data": [
            ("葡萄酒色泽醇厚，香气迷人，是世界上历史最悠久的酿造酒之一。",
             "Pútáojiǔ sèzé chúnhòu, xiāngqì mírén, shì shìjiè shàng lìshǐ zuì yōujiǔ de niàngzàojiǔ zhī yī.",
             "Rượu vang có màu sắc nồng đượm, hương thơm quyến rũ, là một trong những loại rượu lên men có lịch sử lâu đời nhất thế giới."),
            ("考古发现证明，早在八千年前的高加索和两河流域，人类就已经开始用陶罐酿造葡萄酒。",
             "Kǎogǔ fāxiàn zhèngmíng, zǎo zài bāqiān nián qián de Gāojiāsuǒ hé liǎnghé liùyù, rénlèi jiù yǐjīng kāishǐ yòng táoguàn niàngzào pútáojiǔ.",
             "Phát hiện khảo cổ chứng minh từ tám ngàn năm trước tại vùng Kavkaz và Lưỡng Hà, con người đã bắt đầu ủ rượu vang bằng bình gốm."),
            ("在古希腊和古罗马文明中，葡萄酒不仅是盛大宴会的主角，还被赋予了神圣的宗教意义。",
             "Zài gǔ Xīlà hé gǔ Luómǎ wénmíng zhōng, pútáojiǔ bùjǐn shì shèngdà yànhuì de zhǔjué, hái bèi fùyǔ le shénshèng de zōngjiào yìyì.",
             "Trong nền văn minh Hy Lạp và La Mã cổ đại, rượu vang không chỉ là tâm điểm tiệc tùng mà còn mang ý nghĩa tôn giáo thiêng liêng."),
            ("汉代张骞通西域之后，优良的葡萄品种与酿酒技术也传入了中原大地。",
             "Hàndài Zhāng Qiān tōng xīyù zhīhòu, yōuliáng de pútáo pǐnzhǒng yǔ niàngjiǔ jìshù yě chuánrù le zhōngyuán dàdì.",
             "Sau khi Trương Khiên thời Hán thông thương Tây Vực, giống nho hảo hạng và kỹ thuật làm rượu cũng truyền vào Trung Nguyên."),
            ("唐代诗人王翰留下了“葡萄美酒夜光杯，欲饮琵琶马上催”的千古名句，见证了中外文化的交融。",
             "Tángdài shīrén Wáng Hàn liúxià le “pútáo měijiǔ yèguāngbēi, yù yǐn pípá mǎshàng cuī” de qiāngǔ míngjù, jiànzhèng le zhōngwài wénhuà de jiāoróng.",
             "Nhà thơ Vương Hàn đời Đường đã để lại câu thơ ngàn đời: 'Bồ đào mỹ tửu dạ quang bôi', minh chứng cho sự giao thoa văn hóa rực rỡ.")
        ],
        "preferred_spotlight": ["证明", "技术", "文化", "历史"],
        "quiz": [
            {"id": "q1", "question_vi": "Dấu tích làm rượu vang sớm nhất của nhân loại cách ngày nay bao nhiêu năm?",
             "options_vi": ["Khoảng 8000 năm trước ở vùng Kavkaz", "Khoảng 500 năm trước", "Mới xuất hiện thời cận đại"], "answer": 0, "explanation_vi": "Khảo cổ chứng minh con người làm rượu vang từ khoảng 8000 năm trước."},
            {"id": "q2", "question_vi": "Câu thơ 'Bồ đào mỹ tửu dạ quang bôi' miêu tả loại rượu nào?",
             "options_vi": ["Rượu nho (rượu vang)", "Rượu nếp cái", "Rượu ngô"], "answer": 0, "explanation_vi": "'Bồ đào' (葡萄) trong tiếng Hán cổ chính là quả nho, rượu bồ đào là rượu vang."},
            {"id": "q3", "question_vi": "Kỹ thuật làm rượu vang và giống nho truyền vào Trung Nguyên vào thời kỳ nào?",
             "options_vi": ["Thời nhà Hán sau chuyến đi sứ của Trương Khiên", "Thời nhà Thanh", "Thời Tam Quốc"], "answer": 0, "explanation_vi": "Trương Khiên thời Tây Hán đã mang giống nho và cách ủ rượu từ Tây Vực về."}
        ]
    })

    # 28. 冰激凌
    stories.append({
        "id": "wanwu_story_028",
        "chapter_no": 28,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 275,
        "book_page_end": 282,
        "page_display": "Trang 275 - 282",
        "title": {"zh": "冰激凌：混搭甜品2000年", "vi": "Kem lạnh: Món tráng miệng biến hóa suốt 2000 năm"},
        "topic": "food_lifestyle",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🍨",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 275 - 282 · Nguồn gốc món tráng miệng lạnh từ băng tuyết ướp mật ong thời cổ đại đến kem sữa hiện đại.",
        "sentences_data": [
            ("冰激凌口感丝滑清凉，是炎炎夏日里最能给人们带来快乐的冷饮甜品。",
             "Bīngjīlíng kǒugǎn sīhuá qīngliáng, shì yányán xiàrì lǐ zuì néng gěi rénmen dàilái kuàilè de lěngyǐn tiánpǐn.",
             "Kem có vị ngọt mát lạnh mềm mịn, là món đồ ngọt giải nhiệt mang lại niềm vui lớn nhất trong ngày hè oi bức."),
            ("早在两千多年前，古罗马贵族就让士兵从高山上运回积雪，混合蜂蜜与果汁享用。",
             "Zǎo zài liǎngqiān duō nián qián, gǔ Luómǎ guìzú jiù ràng shìbīng cóng gāoshān shàng yùnhuí jīxuě, hùnhé fēngmì yǔ guǒzhī xiǎngyòng.",
             "Hơn hai ngàn năm trước, giới quý tộc La Mã cổ đại đã sai binh lính gùi băng tuyết từ đỉnh núi cao về trộn mật ong và nước ép trái cây để thưởng thức."),
            ("在中国唐代，工匠发明了一种名为“酥山”的冷食，用奶油淋在碎冰上并插上鲜花装饰。",
             "Zài Zhōngguó Tángdài, gōngjiàng fāmíng le yì zhǒng míngwéi “sūshān” de lěngshí, yòng nǎiyóu lín zài suìbīng shàng bìng chāshàng xiānhuā zhuāngshì.",
             "Thời nhà Đường ở Trung Quốc, những người thợ khéo tay đã sáng chế món lạnh 'Tô Sơn', rưới kem bơ lên đá bào và cắm hoa tươi trang trí."),
            ("宋代街市上甚至出现了专门售卖冰酪和冰镇果汤的冷饮店铺。",
             "Sòngdài jiēshì shàng shènzhì chūxiàn le zhuānmén shòumài bīnglào hé bīngzhèn guǒtāng de lěngyǐn diànpù.",
             "Vào thời nhà Tống, trên phố phường đã xuất hiện những cửa hàng chuyên bán sữa đông ướp lạnh và nước quả ướp đá."),
            ("到了十九世纪，人工制冷技术的突破和冰淇淋搅拌机的发明，让这项昔日的宫廷甜品飞入寻常百姓家。",
             "Dàole shíjiǔ shìjì, réngōng zhìlěng jìshù de tūpò hé bīngqílín jiǎobànjī de fāmíng, ràng zhè xiàng xīrì de gōngtíng tiánpǐn fēirù xúncháng bǎixìng jiā.",
             "Đến thế kỷ 19, bước đột phá công nghệ làm lạnh nhân tạo và máy đánh kem đã đưa món tráng miệng cung đình xưa kia đến với mọi gia đình bình dân.")
        ],
        "preferred_spotlight": ["带来", "发明", "技术", "突破"],
        "quiz": [
            {"id": "q1", "question_vi": "Món tráng miệng lạnh 'Tô Sơn' thời Đường có cách chế biến thế nào?",
             "options_vi": ["Rưới kem bơ lên đá bào và cài hoa tươi trang trí", "Nướng bánh trên than hồng", "Hầm trong nồi áp suất"], "answer": 0, "explanation_vi": "Tô Sơn thời Đường là món kem sữa nhỏ giọt lên đá lạnh tạo hình tháp đẹp mắt."},
            {"id": "q2", "question_vi": "Người La Mã cổ đại làm món kem tuyết đầu tiên bằng cách nào?",
             "options_vi": ["Lấy tuyết trên núi cao trộn mật ong và nước quả", "Dùng tủ lạnh chạy điện", "Đun sôi rượu nho"], "answer": 0, "explanation_vi": "Quý tộc La Mã dùng tuyết mang từ đỉnh núi cao trộn hoa quả và mật ong."},
            {"id": "q3", "question_vi": "Điều gì giúp kem lạnh trở thành món ăn phổ thông trong thế kỷ 19?",
             "options_vi": ["Công nghệ làm lạnh nhân tạo và máy khuấy kem ra đời", "Mùa đông kéo dài quanh năm", "Bỏ cấm đường mía"], "answer": 0, "explanation_vi": "Kỹ thuật làm lạnh cơ học giúp sản xuất kem quy mô công nghiệp với chi phí rẻ."}
        ]
    })

    # 29. 奶酪
    stories.append({
        "id": "wanwu_story_029",
        "chapter_no": 29,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 282,
        "book_page_end": 293,
        "page_display": "Trang 282 - 293",
        "title": {"zh": "奶酪：香臭总宜人", "vi": "Phô mai: Vị béo nồng đậm đà qua thời gian"},
        "topic": "food_lifestyle",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🧀",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 282 - 293 · Phát minh tình cờ từ túi đựng sữa bằng dạ dày gia súc của người du mục đến hàng nghìn loại phô mai hảo hạng.",
        "sentences_data": [
            ("奶酪营养极其丰富，被誉为乳品中的“黄金”，深受世界各地美食家的赞赏。",
             "Nǎilào yíngyǎng jíqí fēngfù, bèi yù wéi rǔpǐn zhōng de “huángjīn”, shēn shòu shìjiè gèdì měishíjiā de zànshǎng.",
             "Phô mai cực kỳ giàu dinh dưỡng, được mệnh danh là 'vàng mười' trong các sản phẩm từ sữa, được người sành ăn khắp thế giới khen ngợi."),
            ("传说数千年前，一位中东游牧民把鲜奶装进羊胃制成的小水囊里横穿沙漠。",
             "Chuánshuō shùqiān nián qián, yí wèi Zhōngdōng yóumùmín bǎ xiānnǎi zhuāngjìn yángwèi zhìchéng de xiǎoshuǐnáng lǐ héngchuān shāmò.",
             "Tương truyền ngàn năm trước, một người du mục Trung Đông đã đựng sữa tươi trong chiếc túi làm bằng dạ dày cừu vượt sa mạc."),
            ("在烈日照耀和胃液凝乳酶的作用下，鲜奶凝固成了半固态的白色凝乳，这就是最初的奶酪。",
             "Zài lièrì zhàoyào hé wèiyè níngrǔméi de zuòyòng xià, xiānnǎi nínggù chéng le bàn gùtài de báisè níngrǔ, zhè jiùshì zuìchū de nǎilào.",
             "Dưới ánh nắng gay gắt và tác động của men rennet trong dạ dày động vật, sữa đã đông tụ thành khối sữa đặc màu trắng, chính là phô mai nguyên sơ."),
            ("制作奶酪不仅让多余的鲜奶得到了长久保存，还大大降低了乳糖含量，更易被人体吸收。",
             "Zhìzuò nǎilào bùjǐn ràng duōyú de xiānnǎi dédào le chángjiǔ bǎocún, hái dàdà jiàngdī le rǔtáng hánliàng, gèng yì bèi réntǐ xīshōu.",
             "Chế biến phô mai không chỉ bảo quản được nguồn sữa dư thừa lâu dài mà còn giảm đáng kể lượng đường lactose, giúp cơ thể dễ hấp thụ hơn."),
            ("如今全球有数千种不同风味的奶酪，从奶香浓郁到气味独特，展现了微生物发酵的奇妙魅力。",
             "Rújīn quánqiú yǒu shùqiān zhǒng bùtóng fēngwèi de nǎilào, cóng nǎixiāng nóngyù dào qìwèi dètè, zhǎnxiàn le wēishēngwù fājiào de qímiào mèilì.",
             "Ngày nay toàn cầu có hàng ngàn loại phô mai với hương vị phong phú, biểu hiện sức quyến rũ kỳ diệu của quá trình lên men vi sinh vật.")
        ],
        "preferred_spotlight": ["丰富", "作用", "降低", "表现"],
        "quiz": [
            {"id": "q1", "question_vi": "Phô mai được phát hiện tình cờ từ hiện tượng nào?",
             "options_vi": ["Men rennet trong túi dạ dày cừu làm đông tụ sữa tươi", "Sữa bị cháy khét trên lửa", "Trộn sữa với giấm nuôi"], "answer": 0, "explanation_vi": "Túi đựng sữa làm bằng dạ dày động vật tiết ra men rennet tự nhiên làm đông sữa."},
            {"id": "q2", "question_vi": "Ưu điểm lớn nhất của việc làm phô mai đối với người xưa là gì?",
             "options_vi": ["Bảo quản nguồn sữa tươi giàu dinh dưỡng lâu dài", "Làm sữa đổi màu đen", "Khiến sữa bốc cháy"], "answer": 0, "explanation_vi": "Phô mai giúp người chăn nuôi bảo quản sữa cả năm mà không bị ôi thiu."},
            {"id": "q3", "question_vi": "Quá trình chính tạo nên hàng nghìn loại phô mai khác nhau là gì?",
             "options_vi": ["Lên men vi sinh vật", "Nướng bánh lò vi sóng", "Ướp đường mía"], "answer": 0, "explanation_vi": "Các chủng vi sinh vật và nấm mốc khác nhau tạo ra mùi vị và cấu trúc riêng cho từng loại phô mai."}
        ]
    })

    # 30. 香水
    stories.append({
        "id": "wanwu_story_030",
        "chapter_no": 30,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 293,
        "book_page_end": 302,
        "page_display": "Trang 293 - 302",
        "title": {"zh": "香水：4000年光阴的味道", "vi": "Nước hoa: Hương thơm đọng lại suốt 4000 năm"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🌸",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 293 - 302 · Từ hương trầm tế thần ở Ai Cập cổ đại đến kỹ thuật chưng cất tinh dầu và kinh đô nước hoa Grasse.",
        "sentences_data": [
            ("一缕清幽优雅的香气，往往能够唤起人们内心深处最美好的记忆与情感。",
             "Yì lǚ qīngyōu yōuyǎ de xiāngqì, wǎngwǎng nénggòu huànqǐ rénmen nèixīn shēnchù zuì měihǎo de jìyì yǔ qínggǎn.",
             "Một làn hương thanh tao trang nhã thường khơi dậy những ký ức và cảm xúc đẹp đẽ nhất nơi sâu thẳm tâm hồn con người."),
            ("香水最初起源于古埃及，当时人们燃烧乳香和没药用来祭祀神灵，祈求庇佑。",
             "Xiāngshuǐ zuìchū qǐyuán yú gǔ Āijí, dāngshí rénmen ránshāo rǔxiāng hé mòyào yòng lái jìsì shénlíng, qǐqiú bìyòu.",
             "Nước hoa ban đầu bắt nguồn từ Ai Cập cổ đại, khi đó người ta đốt nhũ hương và mộc dược để tế thần cầu mong che chở."),
            ("古埃及艳后克利奥帕特拉非常喜爱芳香植物，她常在出巡的船帆上涂抹昂贵香油。",
             "Gǔ Āijí yànhòu Kèlì'àopàtèlā fēicháng xǐ'ài fāngxiāng zhíwù, tā cháng zài chūxún de chuánfān shàng túmǒ ángguì xiāngyóu.",
             "Nữ hoàng Cleopatra của Ai Cập cổ đại vô cùng yêu chuộng hương thơm, bà thường thoa dầu thơm đắt đỏ lên cánh buồm thuyền."),
            ("中世纪时期，阿拉伯学者发明了先进的植物蒸馏器，提炼出纯净高浓度的花香精油。",
             "Zhōngshìjì shíqī, Ālābó xuézhě fāmíng le xiānjìn de zhíwù zhēngliúqì, tíliàn chū chúnjìng gāonóngdù de huāxiāng jīngyóu.",
             "Thời Trung Cổ, các học giả Ả Rập đã sáng chế máy chưng cất tinh dầu tiên tiến, chiết xuất ra tinh dầu hoa nguyên chất nồng độ cao."),
            ("到了近代，法国南部的格拉斯凭借得天独厚的气候种植了大量花卉，成为了闻名全球的“香水之都”。",
             "Dàole jìndài, Fǎguó nánbù de Gélāsī píngjiè détiāndúhòu de qìhòu zhòngzhí le dàliàng huāhuì, chéngwéi le wénmíng quánqiú de “xiāngshuǐ zhī dū”.",
             "Đến thời cận đại, thị trấn Grasse ở miền nam nước Pháp nhờ khí hậu ưu đãi đã trồng bạt ngàn hoa thơm, trở thành 'kinh đô nước hoa' vang danh toàn cầu.")
        ],
        "preferred_spotlight": ["经常", "发明", "植物", "成为"],
        "quiz": [
            {"id": "q1", "question_vi": "Nước hoa nguyên thủy ở Ai Cập cổ đại được dùng với mục đích chính nào?",
             "options_vi": ["Đốt hương liệu để tế lễ các vị thần", "Tẩy rửa sàn nhà", "Xua đuổi dã thú"], "answer": 0, "explanation_vi": "Thuở ban đầu hương trầm được dùng trong các nghi lễ thờ cúng thần linh Ai Cập."},
            {"id": "q2", "question_vi": "Sáng chế nào của học giả Ả Rập đã nâng tầm ngành chế tạo nước hoa?",
             "options_vi": ["Thiết bị chưng cất tinh dầu hoa bằng hơi nước", "Máy sấy khô hoa hồng", "Bình gốm không tráng men"], "answer": 0, "explanation_vi": "Máy chưng cất hơi nước cho phép chiết xuất tinh dầu thơm cô đặc tinh khiết."},
            {"id": "q3", "question_vi": "Địa danh nào ở nước Pháp được mệnh danh là 'Thủ phủ nước hoa thế giới'?",
             "options_vi": ["Thị trấn Grasse ở miền nam", "Thành phố Lyon", "Bến cảng Marseille"], "answer": 0, "explanation_vi": "Grasse là trung tâm trồng hoa và điều chế hương liệu nổi tiếng nhất thế giới."}
        ]
    })

    # 31. 烟草
    stories.append({
        "id": "wanwu_story_031",
        "chapter_no": 31,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 302,
        "book_page_end": 314,
        "page_display": "Trang 302 - 314",
        "title": {"zh": "烟草：爱恨之间的纠结", "vi": "Thuốc lá: Vòng xoáy trớ trêu trong lịch sử nhân loại"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🍂",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 302 - 314 · Nghi lễ nguyên thủy của thổ dân châu Mỹ, sự lan rộng toàn cầu và nhận thức khoa học về sức khỏe hiện đại.",
        "sentences_data": [
            ("烟草是一种原产于美洲大陆的茄科植物，在人类历史上引发了深远的争论。",
             "Yāncǎo shì yì zhǒng yuánchǎn yú Měizhōu dàlù de qiékē zhíwù, zài rénlèi lìshǐ shàng yǐnfā le shēnyuǎn de zhēnglùn.",
             "Thuốc lá là loài cây thuộc họ cà có nguồn gốc từ đại lục châu Mỹ, gây ra những cuộc tranh luận sâu sắc trong lịch sử loài người."),
            ("美洲印第安人早在几千年前就开始使用烟草，通常在宗教祭祀或部落议和仪式上点燃吸食。",
             "Měizhōu Yìndì'ānrén zǎo zài jǐqiān nián qián jiù kāishǐ shǐyòng yāncǎo, tōngcháng zài zōngjiào jìsì huò bùluò yìhé yíshì shàng diǎnrán xīshí.",
             "Người bản địa châu Mỹ từ ngàn năm trước đã dùng thuốc lá, thường châm lửa hút trong các nghi lễ tế thần hoặc hòa giải giữa các bộ lạc."),
            ("哥伦布船队将烟草带回欧洲后，一度被西方医生误认为是可以治疗各种疾病的“神药”。",
             "Gēlúnbù chuánduì jiāng yāncǎo dàihuí Ōuzhōu hòu, yídù bèi xīfāng yīshēng wùrèn wéi shì kěyǐ zhìliáo gèzhǒng jíbìng de “shényào”.",
             "Sau khi đoàn thám hiểm Columbus mang thuốc lá về châu Âu, các bác sĩ phương Tây từng lầm tưởng đó là 'thần dược' trị bách bệnh."),
            ("到了二十世纪，医学研究明确证实烟草中的尼古丁具有强烈的成瘾性，燃烧烟雾更会危害呼吸健康。",
             "Dàole èrshí shìjì, yīxué yánjiū míngquè zhèngshí yāncǎo zhōng de nígǔdīng jùyǒu qiángliè de chéngyǐnxìng, ránshāo yānwù gèng huì wēihài hūxī jiànkāng.",
             "Đến thế kỷ 20, nghiên cứu y học xác nhận nicotine trong thuốc lá gây nghiện mạnh và khói thuốc đe dọa nghiêm trọng đến hệ hô hấp."),
            ("如今，世界各国普遍推行控烟政策，倡导健康的生活方式。",
             "Rújīn, shìjiè gèguó pǔbiàn tuīxíng kòngyān zhèngcè, chàngdǎo jiànkāng de shēnghuó fāngshì.",
             "Ngày nay, các quốc gia trên thế giới đều đẩy mạnh chính sách kiểm soát thuốc lá, khuyến khích lối sống lành mạnh.")
        ],
        "preferred_spotlight": ["历史", "研究", "健康", "生活"],
        "quiz": [
            {"id": "q1", "question_vi": "Người bản địa châu Mỹ ban đầu dùng thuốc lá vào dịp nào?",
             "options_vi": ["Nghi lễ tế thần hoặc hòa giải giữa các bộ lạc", "Nấu cháo bồi bổ", "Làm thức ăn gia súc"], "answer": 0, "explanation_vi": "Người da đỏ dùng tẩu thuốc lá trong các nghi lễ tôn giáo và ký ước hòa bình."},
            {"id": "q2", "question_vi": "Khi mới du nhập vào châu Âu thời Phục hưng, thuốc lá từng bị ngộ nhận là gì?",
             "options_vi": ["Một loại thần dược có thể chữa được bách bệnh", "Loại gia vị ngọt như đường", "Nhiên liệu chạy tàu hỏa"], "answer": 0, "explanation_vi": "Nhiều bác sĩ châu Âu thời đó tin rằng thuốc lá có thể trị bệnh đau đầu và cảm mạo."},
            {"id": "q3", "question_vi": "Chất nào trong lá thuốc lá gây nghiện mạnh được y học hiện đại xác nhận?",
             "options_vi": ["Nicotine", "Vitamin C", "Đường glucose"], "answer": 0, "explanation_vi": "Chất nicotine tác động lên hệ thần kinh trung ương gây nghiện cao."}
        ]
    })

    # 32. 琥珀
    stories.append({
        "id": "wanwu_story_032",
        "chapter_no": 32,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 314,
        "book_page_end": 325,
        "page_display": "Trang 314 - 325",
        "title": {"zh": "琥珀：树的精灵", "vi": "Hổ phách: Linh hồn hóa thạch của loài cây"},
        "topic": "nature_wildlife",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "✨",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 314 - 325 · Nhựa cây hóa thạch hàng chục triệu năm lưu giữ sinh vật cổ đại như chiếc hộp thời gian kỳ vĩ.",
        "sentences_data": [
            ("琥珀晶莹剔透，色泽金黄温润，是自然界中极为罕见的有机宝石。",
             "Hǔpò jīngyíng-tītòu, sèzé jīnhuáng wēnrùn, shì zìránjiè zhōng jíwéi hǎnjiàn de yǒujī bǎoshí.",
             "Hổ phách trong suốt lấp lánh, ánh sắc vàng ấm áp, là loại đá quý hữu cơ vô cùng hiếm gặp trong tự nhiên."),
            ("数千万年前，古代松柏等植物受到损伤时会分泌出大量粘稠的树脂。",
             "Shùqiānwàn nián qián, gǔdài sōngbǎi děng zhíwù shòudào sǔnshāng shí huì fēnmì chū dàliàng niánchóu de shùzhī.",
             "Hàng chục triệu năm trước, các loài cây lá kim cổ đại khi bị thương tổn đã tiết ra lượng lớn nhựa cây quánh đặc."),
            ("树脂滴落下来时，偶尔会将附近路过的小昆虫、落叶或花瓣包裹在其中。",
             "Shùzhī dīluò xiàlái shí, ǒu'ěr huì jiāng fùjìn lùguò de xiǎo kūnchóng, luòyè huò huābàn bāoguǒ zài qízhōng.",
             "Khi giọt nhựa rơi xuống, đôi khi bọc gọn những chú côn trùng nhỏ, lá rụng hoặc cánh hoa đi ngang qua."),
            ("经过漫长地质年代的高温高压石化过程，这些树脂最终蜕变成为坚硬的琥珀。",
             "Jīngguò màncháng dìzhì niándài de gāowēn gāoyā shíhuà guòchéng, zhèxiē shùzhī zuìzhōng tuìbiàn chéngwéi jiānyìng de hǔpò.",
             "Trải qua quá trình hóa thạch dưới nhiệt độ và áp suất cao qua các kỷ địa chất, lớp nhựa cây này đã hóa thành hổ phách cứng cáp."),
            ("琥珀完整保存了远古生物的立体形态甚至羽毛细节，被科学家视为珍贵的时间胶囊。",
             "Hǔpò wánzhěng bǎocún le yuǎngǔ shēngwù de lìtǐ xíngtài shènzhì yǔmáo xìjié, bèi kēxuéjiā shìwéi zhēnguì de shíjiān jiāonáng.",
             "Hổ phách lưu giữ nguyên vẹn hình thái không gian ba chiều và từng chi tiết lông vũ của sinh vật cổ, được giới khoa học coi là khoang thời gian quý giá.")
        ],
        "preferred_spotlight": ["自然", "植物", "经过", "科学家"],
        "quiz": [
            {"id": "q1", "question_vi": "Hổ phách thực chất được hình thành từ chất liệu gì?",
             "options_vi": ["Nhựa cây hóa thạch qua hàng chục triệu năm", "Thủy tinh núi lửa đông nguội", "Bột đá nghiền mịn ép chặt"], "answer": 0, "explanation_vi": "Hổ phách là nhựa cây hóa thạch của các loài thực vật cổ đại."},
            {"id": "q2", "question_vi": "Tại sao hổ phách lại có giá trị nghiên cứu khoa học cực cao?",
             "options_vi": ["Lưu giữ nguyên vẹn cấu trúc côn trùng và sinh vật cổ đại", "Có thể ăn được", "Tỏa nhiệt vĩnh cửu"], "answer": 0, "explanation_vi": "Hổ phách bọc giữ xác sinh vật tiền sử như chiếc hộp thời gian còn nguyên vẹn."},
            {"id": "q3", "question_vi": "Màu sắc phổ biến và đặc trưng nhất của hổ phách là gì?",
             "options_vi": ["Màu vàng trong suốt óng ả", "Màu đen kịt như than", "Màu xanh da trời sẫm"], "answer": 0, "explanation_vi": "Hổ phách tự nhiên nổi tiếng nhất với sắc vàng kim ấm áp lấp lánh."}
        ]
    })

    # 33. 测谎仪
    stories.append({
        "id": "wanwu_story_033",
        "chapter_no": 33,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 325,
        "book_page_end": 334,
        "page_display": "Trang 325 - 334",
        "title": {"zh": "测谎仪：从测量脉搏开始", "vi": "Máy phát hiện nói dối: Khởi nguồn từ nhịp đập mạch máu"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "💓",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 325 - 334 · Nguyên lý sinh lý học của máy đo nói dối qua nhịp thở, mạch đập và điện trở da từ thế kỷ 19.",
        "sentences_data": [
            ("当一个人说谎时，内心往往会不由自主地产生紧张、焦虑等情绪波动。",
             "Dāng yí gè rén shuōhuǎng shí, nèixīn wǎngwǎng huì bùyóu-zìzhǔ de chǎnshēng jǐnzhāng, jiāolǜ děng qíngxù bōdòng.",
             "Khi một người nói dối, trong lòng thường vô thức nảy sinh cảm xúc căng thẳng, âu lo dao động."),
            ("十九世纪末，意大利犯罪学家龙勃罗梭发现人在撒谎时脉搏会发生微弱变化，并尝试用于案件调查。",
             "Shíjiǔ shìjì mò, Yìdàlì fànzuì xuéjiā Lóngbólóusuō fāxiàn rén zài sāhuǎng shí màibó huì fāshēng wēiruò biànhuà, bìng chángshì yòngyú ànjiàn diàochá.",
             "Cuối thế kỷ 19, nhà tội phạm học Lombroso người Ý phát hiện nhịp mạch thay đổi khi nói dối và đã thử nghiệm trong điều tra vụ án."),
            ("二十世纪初，科学家在此基础上发明了能够同时监测呼吸、血压和心率的多道测谎仪。",
             "Èrshí shìjì chū, kēxuéjiā zài cǐ jīchǔ shàng fāmíng le nénggòu tóngshí jiāncè hūxī, xuèyā hé xīnlǜ de duōdào cèhuǎngyí.",
             "Đầu thế kỷ 20, các nhà khoa học đã chế tạo ra máy ghi đa nghiệm có thể theo dõi đồng thời nhịp thở, huyết áp và nhịp tim."),
            ("现代先进测谎设备还会测定手掌微量出汗导致的皮肤电反应。",
             "Xiàndài xiānjìn cèhuǎng shèbèi hái huì cèdìng shǒuzhǎng wēiliàng chūhàn dǎozhì de pífū diànfǎnyìng.",
             "Thiết bị đo nói dối tiên tiến hiện đại còn đo cả phản ứng điện trở da do lòng bàn tay toát mồ hôi li ti gây ra."),
            ("不过，测谎仪测量的本质是人体的自主神经生理反应，因此其结果主要作为侦查辅助参考。",
             "Búguò, cèhuǎngyí cèliáng de běnzhì shì réntǐ de zìzhǔ shénjīng shēnglǐ fǎnyìng, yīncǐ qí jiéguǒ zhǔyào zuòwéi zhēnchá fǔzhù cānkǎo.",
             "Dẫu vậy, bản chất của máy là đo phản ứng sinh lý thần kinh thực vật, do đó kết quả chủ yếu mang tính hỗ trợ tham khảo điều tra.")
        ],
        "preferred_spotlight": ["发生", "调查", "基础", "主要"],
        "quiz": [
            {"id": "q1", "question_vi": "Nguyên lý cơ bản giúp máy phát hiện nói dối hoạt động là gì?",
             "options_vi": ["Đo phản ứng sinh lý tự nhiên như tim đập nhanh, toát mồ hôi khi căng thẳng", "Đọc trực tiếp suy nghĩ trong đầu", "Chụp tia X hộp sọ"], "answer": 0, "explanation_vi": "Khi nói dối, sự lo lắng gây biến động nhịp tim, nhịp thở và độ ẩm da."},
            {"id": "q2", "question_vi": "Nhà khoa học nào khởi xướng việc quan sát nhịp mạch để điều tra nói dối?",
             "options_vi": ["Lombroso người Ý", "Edison", "Newton"], "answer": 0, "explanation_vi": "Lombroso là người đầu tiên ghi nhận biến đổi nhịp mạch khi đối tượng nói dối."},
            {"id": "q3", "question_vi": "Trong pháp luật hiện đại, kết quả máy đo nói dối thường đóng vai trò gì?",
             "options_vi": ["Tài liệu tham khảo hỗ trợ định hướng điều tra", "Bằng chứng duy nhất để tuyên án", "Chứng chỉ chứng nhận vô tội tuyệt đối"], "answer": 0, "explanation_vi": "Kết quả máy đo chủ yếu hỗ trợ cơ quan điều tra chứ không phải chứng cứ duy nhất trước tòa."}
        ]
    })

    # 34. 黑匣子
    stories.append({
        "id": "wanwu_story_034",
        "chapter_no": 34,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 334,
        "book_page_end": 344,
        "page_display": "Trang 334 - 344",
        "title": {"zh": "黑匣子：空难“第一见证人”", "vi": "Hộp đen: 'Nhân chứng số một' trong thảm họa hàng không"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "📦",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 334 - 344 · Thiết bị ghi dữ liệu chuyến bay và âm thanh buồng lái màu cam nổi bật giúp giải mã an toàn bay thế giới.",
        "sentences_data": [
            ("每当发生重大飞行事故，搜救人员总是全力以赴寻找失事客机的“黑匣子”。",
             "Měidāng fāshēng zhòngdà fēixíng shìgù, sōujiù rényuán zǒngshì quánlì-yǐfù xúnzhǎo shīshì kèjī de “hēixiázǐ”.",
             "Mỗi khi xảy ra tai nạn bay nghiêm trọng, đội cứu hộ luôn dốc toàn lực tìm kiếm chiếc 'hộp đen' của máy bay gặp nạn."),
            ("令人意想不到的是，黑匣子的外观实际上并不是黑色，而是极其醒目的亮橙色。",
             "Lìng rén yìxiǎngbùdào de shì, hēixiázǐ de wàiguān shíjì shàng bìng búshì hēisè, érshì jíqí xǐngmù de liàngchéngsè.",
             "Điều bất ngờ là diện mạo thực tế của hộp đen không hề có màu đen, mà được sơn màu cam sáng vô cùng nổi bật."),
            ("二十世纪五十年代，澳大利亚科学家沃伦在客机坠毁调查中萌生了记录飞行数据的构想。",
             "Èrshí shìjì wǔshí niándài, Àodàlìyà kēxuéjiā Wòlún zài kèjī zhuìhuǐ diàochá zhōng méngshēng le jìlù fēixíng shùjù de gòuxiǎng.",
             "Vào thập niên 1950, nhà khoa học người Úc David Warren trong quá trình điều tra máy bay rơi đã nảy ra ý tưởng ghi lại dữ liệu bay."),
            ("现代客机通常配备两个黑匣子，分别记录驾驶舱内部语音和上千项飞行运行参数。",
             "Xiàndài kèjī tōngcháng pèibèi liǎng gè hēixiázǐ, fēnbié jìlù jiàshǐcāng nèibù yǔyīn hé shàngqiān xiàng fēixíng yùnxíng cānshù.",
             "Máy bay chở khách hiện đại thường lắp hai hộp đen: một máy ghi giọng nói buồng lái và một máy ghi hàng nghìn tham số vận hành bay."),
            ("黑匣子由高强度钛合金外壳保护，能够承受千度高温烈火与深海高压，为改进飞行安全立下了汗马功劳。",
             "Hēixiázǐ yóu gāoqiángdù tàihéjīn wàiké bǎohù, nénggòu chéngshòu qiāndù gāowēn lièhuǒ yǔ shēnhǎi gāoyā, wèi gǎijìn fēixíng ānquán lìxià le hànmǎ gōngláo.",
             "Hộp đen được bảo vệ bởi lớp vỏ titan siêu bền, chịu được lửa cháy nghìn độ và áp lực biển sâu, lập công lớn giúp cải thiện an toàn bay.")
        ],
        "preferred_spotlight": ["发生", "调查", "保护", "安全"],
        "quiz": [
            {"id": "q1", "question_vi": "Vỏ ngoài của hộp đen máy bay thực tế có màu gì?",
             "options_vi": ["Màu cam sáng dễ nhận diện", "Màu đen tuyền", "Màu xám tro"], "answer": 0, "explanation_vi": "Hộp đen được sơn màu cam dạ quang để đội cứu hộ dễ tìm kiếm."},
            {"id": "q2", "question_vi": "Một chiếc máy bay thương mại thông thường mang theo mấy chiếc hộp đen?",
             "options_vi": ["2 chiếc (ghi âm buồng lái và ghi dữ liệu bay)", "10 chiếc", "Không cần mang hộp nào"], "answer": 0, "explanation_vi": "Bao gồm CVR (ghi âm buồng lái) và FDR (ghi dữ liệu kỹ thuật bay)."},
            {"id": "q3", "question_vi": "Hộp đen được chế tạo để chịu đựng điều kiện khắc nghiệt nào?",
             "options_vi": ["Va đập cực mạnh, nhiệt độ lửa nghìn độ và áp suất biển sâu", "Chỉ dùng trong phòng điều hòa", "Không được chạm vào nước"], "answer": 0, "explanation_vi": "Hộp đen bọc hợp kim chịu nhiệt và va đập siêu cấp để bảo toàn dữ liệu sau tai nạn."}
        ]
    })

    # 35. 机器人
    stories.append({
        "id": "wanwu_story_035",
        "chapter_no": 35,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 344,
        "book_page_end": 353,
        "page_display": "Trang 344 - 353",
        "title": {"zh": "机器人：是福还是祸？", "vi": "Robot: Niềm hạnh phúc hay nỗi lo của tương lai?"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🤖",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 344 - 353 · Từ vở kịch văn học Séc năm 1920 đến thời đại cánh tay robot công nghiệp và trí tuệ nhân tạo.",
        "sentences_data": [
            ("“机器人”一词最早出现在一九二零年捷克作家的戏剧作品中，原意是指从事苦役的劳工。",
             "“Jīqìrén” yì cí zuìzǎo chūxiàn zài yī-jiǔ-èr-líng nián Jiékè zuòjiā de xìjù zuòpǐn zhōng, yuányì shì zhǐ cóngshì kǔyì de láogōng.",
             "Từ 'robot' xuất hiện lần đầu trong vở kịch năm 1920 của nhà văn Tiệp Khắc, nghĩa gốc ám chỉ người làm lao dịch khổ sai."),
            ("随着现代科技的发展，机器人早已从科幻小说中的想象走进了各行各业的现实生产之中。",
             "Suízhe xiàndài kējì de fāzhǎn, jīqìrén zǎoyǐ cóng kēhuàn xiǎoshuō zhōng de xiǎngxiàng zǒujìn le gèháng-gèyè de xiànshí shēngchǎn zhī zhōng.",
             "Cùng với sự phát triển khoa học công nghệ, robot từ trí tưởng tượng trong truyện viễn tưởng đã bước vào các dây chuyền sản xuất thực tế."),
            ("在汽车装配工厂里，自动机械臂能够不知疲倦、精准高效地完成焊接与喷漆等繁重作业。",
             "Zài qìchē zhuāngpèi gōngchǎng lǐ, zìdòng jīxièbì nénggòu bùzhī píjuàn, jīngzhǔn gāoxiào de wánchéng hànjiē yǔ pēnqī děng fánzhòng zuòyè.",
             "Trong các nhà máy lắp ráp ô tô, những cánh tay cơ học tự động làm việc không biết mệt mỏi, hàn và sơn chuẩn xác hiệu quả."),
            ("而在医院手术室和危险探测救援现场，特种机器人更是成为了医生与救援人员得力的助手。",
             "Ér zài yīyuàn shǒushùshì hé wēixiǎn tàncè jiùyuán xiànchǎng, tèzhǒng jīqìrén gèng shì chéngwéi le yīshēng yǔ jiùyuán rényuán délì de zhùshǒu.",
             "Trong phòng phẫu thuật bệnh viện hay hiện trường cứu hộ hiểm nguy, các robot chuyên dụng trở thành trợ thủ đắc lực."),
            ("面对人工智能时代，人类需要制定严密合理的伦理规范，确保机器人始终造福社会。",
             "Miànduì réngōng zhìnéng shídài, rénlèi xūyào zhìdìng yánmì hélǐ de lúnlǐ guīfàn, quèbǎo jīqìrén shǐzhōng zàofú shèhuì.",
             "Đối diện kỷ nguyên trí tuệ nhân tạo, nhân loại cần xây dựng chuẩn mực đạo đức hợp lý để robot luôn phục vụ đời sống con người.")
        ],
        "preferred_spotlight": ["科技", "发展", "现实", "社会"],
        "quiz": [
            {"id": "q1", "question_vi": "Từ 'robot' xuất hiện lần đầu tiên ở đâu?",
             "options_vi": ["Trong một vở kịch của nhà văn Tiệp Khắc năm 1920", "Trong kinh Phật cổ", "Trên bảng quảng cáo máy tính Mỹ"], "answer": 0, "explanation_vi": "Nhà văn Karel Capek đưa từ 'robot' vào vở kịch R.U.R năm 1920."},
            {"id": "q2", "question_vi": "Cánh tay robot công nghiệp được ứng dụng rộng rãi nhất ở ngành nào?",
             "options_vi": ["Dây chuyền lắp ráp ô tô và sản xuất điện tử", "Chèo thuyền câu cá", "Gieo mạ đồng ruộng"], "answer": 0, "explanation_vi": "Robot công nghiệp đảm nhận các việc hàn ráp ô tô chính xác, bền bỉ."},
            {"id": "q3", "question_vi": "Yếu tố quan trọng để đảm bảo công nghệ robot và AI phục vụ tốt cho loài người là gì?",
             "options_vi": ["Xây dựng các quy tắc đạo đức và an toàn hợp lý", "Cấm hoàn toàn việc học hành", "Tắt toàn bộ mạng Internet"], "answer": 0, "explanation_vi": "Cần xây dựng khung pháp lý và đạo đức công nghệ an toàn."}
        ]
    })

    # 36. 塑料
    stories.append({
        "id": "wanwu_story_036",
        "chapter_no": 36,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 353,
        "book_page_end": 374,
        "page_display": "Trang 353 - 374",
        "title": {"zh": "塑料：百年历程功与过", "vi": "Đồ nhựa: Công và tội sau hành trình trăm năm"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🥤",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 353 - 374 · Từ phát minh nhựa tổng hợp Bakelite năm 1907 làm thay đổi nền công nghiệp đến bài toán tái chế rác thải hiện đại.",
        "sentences_data": [
            ("从我们手中的水杯、键盘到飞机的零部件，塑料制品几乎无处不在。",
             "Cóng wǒmen shǒuzhōng de shuǐbēi, jiànpán dào fēijī de língbùjiàn, sùliào zhìpǐn jīhū wúchù-bùzài.",
             "Từ chiếc cốc uống nước, bàn phím trên tay đến các linh kiện máy bay, đồ nhựa dường như có mặt ở khắp mọi nơi."),
            ("一九零七年，化学家贝克兰成功合成了人类历史上第一种完全人工制造的塑料——酚醛塑料。",
             "Yī-jiǔ-líng-qī nián, huàxuéjiā Bèikèlán chénggōng héchéng le rénlèi lìshǐ shàng dì-yī zhǒng wánquán réngōng zhìzào de sùliào——fēnquán sùliào.",
             "Năm 1907, nhà hóa học Baekeland đã tổng hợp thành công loại nhựa nhân tạo hoàn toàn đầu tiên trong lịch sử mang tên Bakelite."),
            ("塑料轻便坚固、价格低廉且易于加工塑形，迅速引发了一场席卷全球的材料革命。",
             "Sùliào qīngbiàn jiāngù, jiàgé dīlián qiě yìyú jiāgōng sùxíng, xùnsù yǐnfā le yì chǎng xíjuǎn quánqiú de cáiliào gémìng.",
             "Nhựa nhẹ bền, giá thành rẻ lại dễ tạo khuôn, nhanh chóng khơi mào cuộc cách mạng vật liệu trên toàn thế giới."),
            ("然而，塑料难以降解的特性也给全球生态环境带来了沉重的“白色污染”负担。",
             "Rán'ér, sùliào nányǐ jiàngjiě de tèxìng yě gěi quánqiú shēngtài huánjìng dàilái le chénzhòng de “báisè wūrǎn” fùdān.",
             "Tuy vậy, đặc tính khó phân hủy sinh học của nhựa cũng mang lại gánh nặng ô nhiễm trắng nghiêm trọng cho môi trường sinh thái."),
            ("今天，开发生物可降解环保新材料与加强塑料循环利用，已成为全球共同的努力方向。",
             "Jīntiān, kāifā shēngwù kějiàngjiě huánbǎo xīn cáiliào yǔ jiāqiáng sùliào xúnhuán lìyòng, yǐ chéngwéi quánqiú gòngtóng de nǔlì fāngxiàng.",
             "Hôm nay, việc phát triển vật liệu mới tự phân hủy và tăng cường tái chế nhựa đã trở thành hướng phấn đấu chung của toàn thế giới.")
        ],
        "preferred_spotlight": ["历史", "制造", "价格", "共同"],
        "quiz": [
            {"id": "q1", "question_vi": "Loại nhựa tổng hợp nhân tạo đầu tiên do ai phát minh năm 1907?",
             "options_vi": ["Nhà hóa học Baekeland (nhựa Bakelite)", "Anh em nhà Wright", "Nobel"], "answer": 0, "explanation_vi": "Baekeland tổng hợp thành công nhựa tổng hợp đầu tiên vào năm 1907."},
            {"id": "q2", "question_vi": "Đặc tính nào của nhựa gây lo ngại lớn nhất cho môi trường tự nhiên?",
             "options_vi": ["Rất khó phân hủy sinh học tự nhiên kéo dài hàng trăm năm", "Tan biến quá nhanh trong nước", "Tự bốc cháy khi trời mưa"], "answer": 0, "explanation_vi": "Rác thải nhựa mất hàng thế kỷ để phân hủy, gây ra vấn nạn ô nhiễm trắng."},
            {"id": "q3", "question_vi": "Giải pháp bảo vệ môi trường đối với rác thải nhựa hiện nay là gì?",
             "options_vi": ["Phát triển nhựa tự phân hủy và đẩy mạnh tái chế tuần hoàn", "Đổ toàn bộ xuống đáy biển", "Cấm tuyệt đối sản xuất mọi máy bay"], "answer": 0, "explanation_vi": "Tái chế và nghiên cứu nhựa sinh học dễ phân hủy là giải pháp bền vững."}
        ]
    })

    # 37. 疫苗
    stories.append({
        "id": "wanwu_story_037",
        "chapter_no": 37,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 374,
        "book_page_end": 383,
        "page_display": "Trang 374 - 383",
        "title": {"zh": "疫苗：隔离病毒的“防火墙”", "vi": "Vắc-xin: 'Bức tường lửa' ngăn cách độc tố vi rút"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "💉",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 374 - 383 · Từ khám phá đậu bò của Edward Jenner năm 1796 đến khi nhân loại thanh toán hoàn toàn bệnh đậu mùa.",
        "sentences_data": [
            ("疫苗是人类现代医学史上最伟大的发明之一，拯救了数以亿计宝贵的生命。",
             "Yìmiáo shì rénlèi xiàndài yīxué shǐ shàng zuì wěidà de fāmíng zhī yī, zhěngjiù le shù-yǐ-yì-jì bǎoguì de shēngmìng.",
             "Vắc-xin là một trong những phát minh vĩ đại nhất lịch sử y học hiện đại, cứu sống hàng trăm triệu sinh mạng quý giá."),
            ("在古代，天花病毒曾经夺去了无数人的生命，造成极大的恐慌与痛苦。",
             "Zài gǔdài, tiānhuā bìngdú céngjīng duóqù le wúshù rén de shēngmìng, zàochéng jídà de kǒnghuāng yǔ tòngkǔ.",
             "Thời xưa, virus đậu mùa từng cướp đi sinh mệnh của vô số người, gây nên nỗi hoang mang và đau thương to lớn."),
            ("十八世纪末，英国乡村医生琴纳注意到挤奶女工感染了温和的牛痘之后，便再也不会染上致命的天花。",
             "Shíbā shìjì mò, Yīngguó xiāngcūn yīshēng Qínnà zhùyì dào jǐnǎi nǚgōng gǎnrǎn le wēnhé de niúdòu zhīhòu, biàn zàiyě búhuì rǎnshàng zhìmìng de tiānhuā.",
             "Cuối thế kỷ 18, bác sĩ người Anh Jenner để ý thấy các cô vắt sữa bò sau khi nhiễm đậu bò nhẹ sẽ không bao giờ mắc bệnh đậu mùa chết người."),
            ("一七九六年，琴纳大胆进行了人类历史上第一例牛痘接种实验，成功开创了人工免疫防病的新纪元。",
             "Yī-qī-jiǔ-liù nián, Qínnà dàdǎn jìnxíng le rénlèi lìshǐ shàng dì-yī lì niúdòu jiēzhòng shíyàn, chénggōng kāichuàng le réngōng miǎnyì fángbìng de xīn jìyuán.",
             "Năm 1796, Jenner dũng cảm tiến hành ca cấy vắc-xin đậu bò đầu tiên, mở ra kỷ nguyên miễn dịch nhân tạo phòng chống dịch bệnh."),
            ("由于全球大规模接种疫苗，世界卫生组织在一九八零年庄严宣布，人类已在地球上彻底消灭了天花。",
             "Yóuyú quánqiú dàguīmó jiēzhòng yìmiáo, Shìjiè Wèishēng Zǔzhī zài yī-jiǔ-bā-líng nián zhuāngyán xuānbù, rénlèi yǐ zài dìqiú shàng chèdǐ xiāomiè le tiānhuā.",
             "Nhờ phổ cập tiêm chủng vắc-xin, Tổ chức Y tế Thế giới năm 1980 đã long trọng tuyên bố loài người đã xóa sổ hoàn toàn bệnh đậu mùa.")
        ],
        "preferred_spotlight": ["生命", "注意", "实验", "成功"],
        "quiz": [
            {"id": "q1", "question_vi": "Bác sĩ Edward Jenner phát minh vắc-xin đậu mùa nhờ quan sát đối tượng nào?",
             "options_vi": ["Những cô gái vắt sữa bò không mắc bệnh đậu mùa", "Chim bay trên trời", "Cây nấm sau mưa"], "answer": 0, "explanation_vi": "Jenner thấy phụ nữ vắt sữa nhiễm đậu bò lành tính thì có miễn dịch với bệnh đậu mùa."},
            {"id": "q2", "question_vi": "Bệnh truyền nhiễm nguy hiểm nào đã bị nhân loại xóa sổ hoàn toàn nhờ vắc-xin vào năm 1980?",
             "options_vi": ["Bệnh đậu mùa", "Bệnh cảm cúm thông thường", "Bệnh đau mắt đỏ"], "answer": 0, "explanation_vi": "Đậu mùa là căn bệnh truyền nhiễm đầu tiên bị quét sạch hoàn toàn khỏi Trái Đất."},
            {"id": "q3", "question_vi": "Cơ chế chính của vắc-xin là gì?",
             "options_vi": ["Kích hoạt hệ miễn dịch sinh kháng thể phòng thủ trước mầm bệnh", "Làm đông máu", "Tăng đường huyết"], "answer": 0, "explanation_vi": "Vắc-xin tập dượt cho hệ thống miễn dịch cách nhận diện và tiêu diệt virus."}
        ]
    })

    # 38. 麻醉剂
    stories.append({
        "id": "wanwu_story_038",
        "chapter_no": 38,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 383,
        "book_page_end": 393,
        "page_display": "Trang 383 - 393",
        "title": {"zh": "麻醉剂：消失的疼痛", "vi": "Thuốc gây mê: Nỗi đau đớn biến mất"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "💊",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 383 - 393 · Từ 'Ma phế tán' của danh y Hoa Đà đến buổi trình diễn ether gây mê năm 1846 làm thay đổi vĩnh viễn ngoại khoa.",
        "sentences_data": [
            ("在没有有效麻醉方法的古代，外科手术往往伴随着患者难以忍受的剧烈痛苦。",
             "Zài méiyǒu yǒuxiào mázuì fāngfǎ de gǔdài, wàikē shǒushù wǎngwǎng bànsuí zhe huànzhě nányǐ rěnshòu de jùliè tòngkǔ.",
             "Vào thời cổ chưa có phương pháp gây mê hiệu quả, phẫu thuật ngoại khoa luôn đi kèm đau đớn tột cùng ngoài sức chịu đựng."),
            ("中国东汉时期的著名医学家华佗发明了“麻沸散”，配制在酒中让病人饮服以减轻痛感。",
             "Zhōngguó Dōnghàn shíqī de zhùmíng yīxuéjiā Huà Tuó fāmíng le “Máfèisǎn”, pèizhì zài jiǔ zhōng ràng bìngrén yǐnfú yǐ jiǎnqīng tònggǎn.",
             "Danh y Hoa Đà thời Đông Hán đã sáng chế ra 'Ma phế tán', hòa vào rượu cho bệnh nhân uống để làm dịu cơn đau khi mổ xẻ."),
            ("一八四六年，美国牙医莫顿在波士顿医院公开演示了乙醚吸入麻醉手术，震惊了医学界。",
             "Yī-bā-sì-liù nián, Měiguó yáyī Mòdùn zài Bōshìdùn yīyuàn gōngkāi yǎnshì le yǐmí xīrù mázuì shǒushù, zhènjīng le yīxuéjiè.",
             "Năm 1846, nha sĩ Morton đã biểu diễn công khai ca phẫu thuật hít ether gây mê tại bệnh viện Boston, làm chấn động giới y học."),
            ("患者在完全无痛的沉睡中顺利完成了肿瘤切除，麻醉学从此正式诞生并迅速推广。",
             "Huànzhě zài wánquán wútòng de chénshuì zhōng shùnlì wánchéng le zhǒngliú qiēchú, mázuìxué cóngcǐ zhèngshì dànshēng bìng xùnsù tuīguǎng.",
             "Bệnh nhân êm đềm ngủ say không hề đau đớn và hoàn thành ca phẫu thuật cắt bỏ khối u, môn gây mê học chính thức ra đời."),
            ("现代麻醉技术精准严密，不仅彻底驱除了手术剧痛，更让复杂的心脑外科手术成为可能。",
             "Xiàndài mázuì jìshù jīngzhǔn yánmì, bùjǐn chèdǐ qūchú le shǒushù jùtòng, gèng ràng fùzá de xīn-nǎo wàikē shǒushù chéngwéi kěnéng.",
             "Kỹ thuật gây mê hiện đại chuẩn xác nghiêm ngặt, chẳng những xua tan cơn đau mà còn giúp các ca phẫu thuật tim não phức tạp thành hiện thực.")
        ],
        "preferred_spotlight": ["著名", "完成", "正式", "技术"],
        "quiz": [
            {"id": "q1", "question_vi": "Danh y nào thời Đông Hán ở Trung Quốc đã chế tạo ra 'Ma phế tán'?",
             "options_vi": ["Hoa Đà", "Biển Thước", "Lý Thời Trân"], "answer": 0, "explanation_vi": "Hoa Đà nổi tiếng là người phát minh thuốc gây mê thảo dược Ma phế tán."},
            {"id": "q2", "question_vi": "Chất khí gây mê nào được biểu diễn thành công tại Boston năm 1846?",
             "options_vi": ["Khí ether (hơi ete)", "Khí oxy", "Khí carbonic"], "answer": 0, "explanation_vi": "Morton đã dùng hơi ether để gây mê phẫu thuật không đau."},
            {"id": "q3", "question_vi": "Ý nghĩa lớn nhất của sự phát triển môn gây mê là gì?",
             "options_vi": ["Giúp phẫu thuật diễn ra an toàn, không đau đớn cho người bệnh", "Làm bệnh nhân ngủ suốt đời", "Làm vết thương đổi màu"], "answer": 0, "explanation_vi": "Thuốc gây mê giải phóng bệnh nhân khỏi nỗi đau đớn khủng khiếp và mở đường cho ngoại khoa phát triển."}
        ]
    })

    # 39. 维生素
    stories.append({
        "id": "wanwu_story_039",
        "chapter_no": 39,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 393,
        "book_page_end": 403,
        "page_display": "Trang 393 - 403",
        "title": {"zh": "维生素：生命元素", "vi": "Vitamin: Yếu tố nuôi dưỡng sự sống"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🍊",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 393 - 403 · Phát hiện vĩ đại về vi chất dinh dưỡng giải thoát loài người khỏi bệnh hoại huyết và phù thũng.",
        "sentences_data": [
            ("人体维持日常健康运转，不仅需要充足的蛋白质与热量，还需要微量的有机化合物。",
             "Réntǐ wéichí rìcháng jiànkāng yùnzhuǎn, bùjǐn xūyào chōngzú de dànbáizhì yǔ rèliàng, hái xūyào wēiliàng de yǒujī huàhéwù.",
             "Cơ thể duy trì hoạt động khỏe mạnh mỗi ngày không chỉ cần đầy đủ chất đạm và calo mà còn cần các vi chất hữu cơ."),
            ("在大航海时代，长时间在远洋航行的水手经常因缺乏新鲜蔬菜而患上可怕的坏血病。",
             "Zài dàhánghǎi shídài, cháng shíjiān zài yuǎnyáng hángxíng de shuǐshǒu jīngcháng yīn quēfá xīnxiān shūcài ér huànshàng kěpà de huàixuèbìng.",
             "Vào thời đại phát kiến địa lý, các thủy thủ lênh đênh lâu ngày trên biển thường mắc bệnh hoại huyết vì thiếu rau tươi."),
            ("后来英国海军发现，只要让船员定期食用新鲜柠檬和柑橘，就能神奇地预防这一疾病。",
             "Hòulái Yīngguó hǎijūn fāxiàn, zhǐyào ràng chuányuán dìngqī shíyòng xīnxiān níngméng hé gānjú, jiù néng shénqí de yùfáng zhè yí jíbìng.",
             "Sau này hải quân Anh phát hiện ra chỉ cần cho thủy thủ đoàn ăn chanh tươi định kỳ là có thể phòng ngừa căn bệnh này kỳ diệu."),
            ("二十世纪初，波兰化学家芬克首次提炼出了这种必需营养素，并创造了“维生素”一词。",
             "Èrshí shìjì chū, Bōlán huàxuéjiā Fēnkè shǒucì tíliàn chū le zhè zhǒng bìxū yíngyǎngsù, bìng chuàngzào le “wéishēngsù” yì cí.",
             "Đầu thế kỷ 20, nhà hóa học Ba Lan Casimir Funk đã chiết xuất được vi chất thiết yếu này và đặt ra thuật ngữ 'vitamin'."),
            ("均衡摄入各种水果蔬菜与粗粮，是现代人获取丰富维生素的最佳途径。",
             "Jūnhéng shèrù gèzhǒng shuǐguǒ shūcài yǔ cūliáng, shì xiàndàirén huòqǔ fēngfù wéishēngsù de zuìjiā tújìng.",
             "Ăn uống cân bằng các loại rau củ quả và ngũ cốc là con đường tốt nhất để người hiện đại bổ sung đầy đủ vitamin.")
        ],
        "preferred_spotlight": ["经常", "发现", "创造", "丰富"],
        "quiz": [
            {"id": "q1", "question_vi": "Thủy thủ viễn dương thời xưa hay mắc bệnh hoại huyết vì thiếu chất gì?",
             "options_vi": ["Vitamin C từ rau quả tươi", "Nước ngọt có ga", "Dầu mỡ động vật"], "answer": 0, "explanation_vi": "Thiếu hụt vitamin C gây ra chứng hoại huyết, rụng răng và chảy máu chân răng."},
            {"id": "q2", "question_vi": "Loại quả nào đã giúp hải quân Anh phòng chống hữu hiệu căn bệnh trên biển này?",
             "options_vi": ["Chanh tươi và cam quýt", "Chuối sấy khô", "Hạt tiêu đen"], "answer": 0, "explanation_vi": "Nước chanh tươi giàu vitamin C giúp đẩy lùi bệnh hoại huyết."},
            {"id": "q3", "question_vi": "Cách tốt nhất để người hiện đại hấp thụ đầy đủ các loại vitamin là gì?",
             "options_vi": ["Ăn uống đa dạng, cân bằng rau xanh, hoa quả và ngũ cốc", "Chỉ uống nước ngọt", "Chỉ ăn thịt mỡ"], "answer": 0, "explanation_vi": "Chế độ ăn phong phú rau quả tươi cung cấp tự nhiên và đầy đủ mọi vitamin cần thiết."}
        ]
    })

    # 40. 血型
    stories.append({
        "id": "wanwu_story_040",
        "chapter_no": 40,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 403,
        "book_page_end": 414,
        "page_display": "Trang 403 - 414",
        "title": {"zh": "血型：拯救生命的发现", "vi": "Nhóm máu: Phát hiện cứu sống muôn triệu người"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🩸",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 403 - 414 · Khám phá hệ nhóm máu ABO năm 1900 của Karl Landsteiner giúp việc truyền máu trở nên an toàn tuyệt đối.",
        "sentences_data": [
            ("在医学史上，输血曾经是一项充满巨大风险甚至致命危险的尝试。",
             "Zài yīxué shǐ shàng, shūxiě céngjīng shì yí xiàng chōngmǎn jùdà fēngxiǎn shènzhì zhìmìng wēixiǎn de chángshì.",
             "Trong lịch sử y học, việc truyền máu từng là thử nghiệm chứa đầy rủi ro nguy hiểm đến tính mạng."),
            ("早期的医生直接将别人的血液输给重伤患者，往往导致严重的血液凝集反应而危及生命。",
             "Zǎoqī de yīshēng zhíjiē jiāng biérén de xièyè shū gěi zhòngshāng huànzhě, wǎngwǎng dǎozhì yánzhòng de xièyè níngjí fǎnyìng ér wēijí shēngmìng.",
             "Các bác sĩ thời xưa truyền thẳng máu người này cho người bị thương, thường dẫn đến phản ứng ngưng kết máu trầm trọng đe dọa sinh mệnh."),
            ("一九零零年，奥地利科学家兰德斯坦纳发现人类红细胞表面存在不同的抗原，并首次提出了ABO血型系统。",
             "Yī-jiǔ-líng-líng nián, Àodìlì kēxuéjiā Lándéstǎinà fāxiàn rénlèi hóngxìbāo biǎomiàn cúnzài bùtóng de kàngyuán, bìng shǒucì tíchū le ABO xuèxíng xìtǒng.",
             "Năm 1900, nhà khoa học Áo Landsteiner phát hiện trên bề mặt hồng cầu có các kháng nguyên khác nhau và đề xuất hệ nhóm máu ABO."),
            ("这一突破性发现揭示了血型相符才能安全输血的秘密，为此他荣获了一九三零年诺贝尔生理学或医学奖。",
             "Zhè yí tūpòxìng fāxiàn jiēshì le xuèxíng xiāngfú cái néng ānquán shūxiě de mìmì, wèicǐ tā rónghuò le yī-jiǔ-sān-líng nián Nuòbèi'ěr shēnglǐxué huò yīxuéjiǎng.",
             "Khám phá mang tính đột phá này mở ra bí mật truyền máu an toàn, nhờ đó ông được trao giải Nobel Sinh lý và Y học năm 1930."),
            ("如今，血型配型已经成为现代医院急救、手术和献血救人中最基础也最重要的准则。",
             "Rújīn, xuèxíng pèixíng yǐjīng chéngwéi xiàndài yīyuàn jíjiù, shǒushù hé xiànxuè jiùrén zhōng zuì jīchǔ yě zuì zhòngyào de zhǔnzé.",
             "Giờ đây, xét nghiệm nhóm máu đã trở thành nguyên tắc cơ bản và tối quan trọng trong cấp cứu bệnh viện và hiến máu cứu người.")
        ],
        "preferred_spotlight": ["生命", "发现", "基础", "重要"],
        "quiz": [
            {"id": "q1", "question_vi": "Nhà khoa học nào đã khám phá ra hệ nhóm máu ABO vào năm 1900?",
             "options_vi": ["Karl Landsteiner", "Albert Einstein", "Louis Pasteur"], "answer": 0, "explanation_vi": "Karl Landsteiner phát hiện ra hệ nhóm máu ABO và nhận giải Nobel năm 1930."},
            {"id": "q2", "question_vi": "Tại sao việc truyền máu thời xưa hay dẫn đến tử vong?",
             "options_vi": ["Bất đồng nhóm máu gây ra hiện tượng đông vón hồng cầu trong mạch", "Do kim tiêm làm bằng vàng", "Do máu bị loãng"], "answer": 0, "explanation_vi": "Khi truyền nhầm nhóm máu không tương thích, kháng thể sẽ làm ngưng kết hồng cầu."},
            {"id": "q3", "question_vi": "Hệ thống nhóm máu phổ biến nhất được sử dụng trong bệnh viện là gì?",
             "options_vi": ["Hệ nhóm máu ABO (A, B, AB, O)", "Hệ chữ số La Mã", "Hệ màu sắc xanh đỏ"], "answer": 0, "explanation_vi": "Hệ ABO là tiêu chuẩn cơ bản nhất trong truyền máu lâm sàng."}
        ]
    })

    # 41. 病毒
    stories.append({
        "id": "wanwu_story_041",
        "chapter_no": 41,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 414,
        "book_page_end": 425,
        "page_display": "Trang 414 - 425",
        "title": {"zh": "病毒：看不见的天敌", "vi": "Vi rút: Kẻ thù vô hình của muôn loài"},
        "topic": "science_technology",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🔬",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 414 - 425 · Cấu trúc siêu vi thể và cuộc chiến không ngừng nghỉ giữa hệ miễn dịch với các mầm bệnh siêu nhỏ.",
        "sentences_data": [
            ("病毒是自然界中结构极其简单却威力惊人的微小存在，甚至无法被普通光学显微镜看见。",
             "Bìngdú shì zìránjiè zhōng jiégòu jíqí jiǎndān què wēilì jīngrén de wēixiǎo cúnzài, shènzhì wúfǎ bèi pǔtōng guāngxué xiǎnwéijìng kànjiàn.",
             "Vi rút là dạng tồn tại cực kỳ đơn giản nhưng có sức mạnh đáng kinh ngạc trong tự nhiên, kính hiển vi quang học thông thường không thể thấy."),
            ("十九世纪末，俄国植物学家伊万诺夫斯基在研究烟草花叶病时，发现了比细菌还要小得多的感染因子。",
             "Shíjiǔ shìjì mò, Éguó zhíwù xuéjiā Yīwànnuòfūsījī zài yánjiū yāncǎo huāyèbìng shí, fāxiàn le bǐ xìjūn hái yào xiǎo de duō de gǎnrǎn yīnzǐ.",
             "Cuối thế kỷ 19, nhà thực vật học người Nga Ivanovsky khi nghiên cứu bệnh khảm thuốc lá đã phát hiện tác nhân truyền nhiễm nhỏ hơn vi khuẩn rất nhiều."),
            ("病毒本身没有细胞结构，只能寄生在活细胞内利用宿主的能量进行自我复制。",
             "Bìngdú běnshēn méiyǒu xìbāo jiégòu, zhǐ néng jìshēng zài huó xìbāo nèi lìyòng xiùzhǔ de néngliàng jìnxíng zìwǒ fùzhì.",
             "Vi rút bản thân không có cấu trúc tế bào, chỉ có thể ký sinh trong tế bào sống và mượn năng lượng của vật chủ để nhân bản."),
            ("直到电子显微镜问世，人类才真正看清了病毒千姿百态的立体外貌。",
             "Zhídào diànzǐ xiǎnwéijìng wènshì, rénlèi cái zhēnzhèng kànqīng le bìngdú qiānzī-bǎitài de lìtǐ wàimào.",
             "Mãi đến khi kính hiển vi điện tử ra đời, con người mới thực sự nhìn rõ diện mạo ba chiều muôn hình vạn trạng của vi rút."),
            ("了解病毒的传播机理，有助于我们研发更有效的抗病毒药物，更好地守护公众健康。",
             "Liǎojiě bìngdú de chuánbō jīlǐ, yǒuzhùyú wǒmen yánfā gèng yǒuxiào de kàngbìngdú yàowù, gèng hǎo de shǒuhù gōngzhòng jiànkāng.",
             "Thấu hiểu cơ chế lây truyền của vi rút giúp chúng ta nghiên cứu các loại thuốc kháng vi rút hiệu quả, bảo vệ tốt hơn sức khỏe cộng đồng.")
        ],
        "preferred_spotlight": ["简单", "研究", "发现", "健康"],
        "quiz": [
            {"id": "q1", "question_vi": "Vi rút có cấu tạo sinh học khác với vi khuẩn ở điểm cơ bản nào?",
             "options_vi": ["Không có cấu trúc tế bào hoàn chỉnh, bắt buộc phải ký sinh trong tế bào sống", "Có lông mao bơi tự do trong nước", "Kích thước to bằng hạt đậu"], "answer": 0, "explanation_vi": "Vi rút chỉ gồm vỏ protein bọc vật liệu di truyền và không có cấu trúc tế bào tự lập."},
            {"id": "q2", "question_vi": "Thiết bị quang học nào đã giúp con người lần đầu nhìn thấy diện mạo thật sự của vi rút?",
             "options_vi": ["Kính hiển vi điện tử phóng đại siêu cấp", "Kính thiên văn ngắm sao", "Kính lúp cầm tay"], "answer": 0, "explanation_vi": "Kính hiển vi điện tử sử dụng chùm electron mới đủ độ phân giải soi thấy vi rút siêu nhỏ."},
            {"id": "q3", "question_vi": "Thực vật nào là đối tượng nghiên cứu giúp nhà khoa học Ivanovsky phát hiện ra vi rút?",
             "options_vi": ["Cây thuốc lá (bệnh khảm lá)", "Cây xương rồng sa mạc", "Cây bắp cải tím"], "answer": 0, "explanation_vi": "Bệnh đốm khảm trên lá cây thuốc lá đã dẫn tới phát hiện ra virus khảm thuốc lá (TMV)."}
        ]
    })

    # 42. 整形
    stories.append({
        "id": "wanwu_story_042",
        "chapter_no": 42,
        "level": "HSK4",
        "book_volume": 2,
        "book_page_start": 425,
        "book_page_end": 441,
        "page_display": "Trang 425 - 441",
        "title": {"zh": "整形：刀刃上的美丑之战", "vi": "Phẫu thuật tạo hình: Ranh giới y thuật và thẩm mỹ"},
        "topic": "culture_history",
        "topic_vi": "📚 Vạn vật thú vị",
        "icon": "🪞",
        "estimatedMinutes": 5,
        "description_vi": "📖 Trang 425 - 441 · Từ thuật ghép da tái tạo mũi của danh y Ấn Độ cổ đại đến y học tái tạo khuôn mặt cho thương binh.",
        "sentences_data": [
            ("许多人以为整形手术是现代流行文化的产物，其实它的医疗根源可以追溯到数千年前。",
             "Xǔduō rén yǐwéi zhěngxíng shǒushù shì xiàndài liúxíng wénhuà de chǎnwù, qíshí tā de yīliáo gēnyuán kěyǐ zhuīsù dào shùqiān nián qián.",
             "Nhiều người ngỡ rằng phẫu thuật thẩm mỹ là sản phẩm của văn hóa hiện đại, thực chất cội nguồn y khoa của nó bắt nguồn từ hàng ngàn năm trước."),
            ("早在公元前六世纪的古印度，著名外科医学家妙闻就发明了用额头皮瓣修复受损鼻子的手术方法。",
             "Zǎo zài gōngyuánqián liù shìjì de gǔ Yìndù, zhùmíng wàikē yīxuéjiā Miàowén jiù fāmíng le yòng étóu píbàn xiūfù shòusǔn bízǐ de shǒushù fāngfǎ.",
             "Từ thế kỷ 6 trước Công nguyên tại Ấn Độ cổ đại, danh y Sushruta đã sáng tạo cách dùng vạt da trán để tái tạo mũi bị thương tổn."),
            ("第一次世界大战期间，面对数以万计面部遭受重创的伤残士兵，现代整形外科应运而生。",
             "Dì-yī-cì shìjiè dàzhàn qījiān, miànduì shù-yǐ-wàn-jì miànbù zāoshòu zhòngchuāng de shāngcán shìbīng, xiàndài zhěngxíng wàikē yìngyùn'érshēng.",
             "Trong Thế chiến I, trước hàng vạn thương binh bị tổn thương nghiêm trọng vùng mặt, ngành phẫu thuật tạo hình hiện đại đã ra đời."),
            ("医生通过精湛的组织移植手术，帮助重伤员修复容貌并重获重返社会的信心与尊严。",
             "Yīshēng tōngguò jīngzhàn de zǔzhī yízhí shǒushù, bāngzhù zhòngshāngyuán xiūfù róngmào bìng chónghuò chóngfǎn shèhuì de xìnxīn yǔ zūnyán.",
             "Các bác sĩ qua kỹ thuật ghép mô khéo léo đã giúp thương binh hồi phục diện mạo, tìm lại niềm tin và phẩm giá hòa nhập xã hội."),
            ("如今，整形技术涵盖了先天畸形矫正、创伤修复以及美容外科，展现了医学的人文关怀。",
             "Rújīn, zhěngxíng jìshù hángài le xiāntiān jīxíng jiǎozhèng, chuāngshāng xiūfù yǐjí měiróng wàikē, zhǎnxiàn le yīxué de rénwén guānhuái.",
             "Ngày nay, phẫu thuật tạo hình bao gồm chỉnh hình dị tật bẩm sinh, tái tạo vết thương và thẩm mỹ, thể hiện sự quan tâm nhân văn của y học.")
        ],
        "preferred_spotlight": ["文化", "著名", "发明", "社会"],
        "quiz": [
            {"id": "q1", "question_vi": "Phẫu thuật tạo hình mũi đầu tiên trong lịch sử cổ đại được ghi chép ở đâu?",
             "options_vi": ["Tại Ấn Độ cổ đại (danh y Sushruta)", "Tại Ai Cập", "Tại Hy Lạp"], "answer": 0, "explanation_vi": "Danh y Sushruta ở Ấn Độ cổ đại đã thực hiện chuyển vạt da trán để tái tạo mũi."},
            {"id": "q2", "question_vi": "Sự kiện lịch sử lớn nào đã thúc đẩy ngành phẫu thuật tạo hình hiện đại ra đời?",
             "options_vi": ["Chiến tranh thế giới thứ nhất (chữa trị vết thương khuôn mặt cho binh sĩ)", "Thám hiểm Nam Cực", "Cuộc cách mạng công nghiệp hơi nước"], "answer": 0, "explanation_vi": "Nhu cầu tái tạo khuôn mặt biến dạng cho hàng vạn thương binh Thế chiến I đã hình thành nên môn tạo hình."},
            {"id": "q3", "question_vi": "Mục đích ban đầu và quan trọng nhất của phẫu thuật tạo hình là gì?",
             "options_vi": ["Khôi phục chức năng và diện mạo bị tổn thương, giúp người bệnh hòa nhập lại đời sống", "Chỉ để làm người mẫu chụp ảnh", "Làm thay đổi vân tay"], "answer": 0, "explanation_vi": "Y học tái tạo hướng tới phục hồi chức năng và thể diện nhân phẩm cho người bệnh tổn thương."}
        ]
    })

    return stories


def main():
    stories = get_volume2_stories()
    print(f"Building Volume 2 ({len(stories)} stories)...")
    for sdata in stories:
        res = build_and_save_story(sdata)
        print(f"  [+] {res['id']}: {res['title']['zh']} ({res['page_display']}) - 100% Pinyin guaranteed.")

    update_manifest_all()


if __name__ == "__main__":
    main()
