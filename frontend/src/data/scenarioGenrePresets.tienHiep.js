/**
 * Tiên Hiệp — thể loại con + preset mặc định (tiếng Việt, độ chi tiết export JSON).
 */

export const tienHiepGenre = {
  id: 'tien_hiep',
  label: { vi: 'Tiên Hiệp', en: 'Xianxia' },
  icon: '⚔',
  subGenres: [
    {
      id: 'tu_tien_co_dien',
      label: { vi: 'Tu tiên cổ điển', en: 'Classic cultivation' },
      preset: {
        title: 'Thanh Vân Đệ Nhất Giới',
        description:
          'Trong thế giới tu tiên nơi kiếm ý xuyên không, khí vận quyết định số mệnh — một kẻ vô danh mang theo bí mật của cả một tộc cổ, bước vào vòng xoáy tranh chấp giữa các đại sect, nơi mỗi bước chân đều có thể là bước cuối cùng.\n',
        tone_instructions:
          'Viết theo phong cách tiên hiệp cổ điển: từ ngữ trang trọng, giàu hình ảnh, nhiều ẩn dụ thi vị. Giọng văn nghiêm cẩn nhưng không khô khan. Nhấn mạnh:\n- Xung đột nội tâm: đấu với chính mình trước khi đấu với kẻ thù\n- Quy luật nghiệp báo: hành động trong quá khứ định hình hiện tại\n- Tình cảm kìm nén: tình yêu, tình sư đồ, tình huynh đệ — không nói ra mà thể hiện qua hành động\n- Không gian tĩnh lặng: núi tuyết, sương mù, đom đóm, tiếng chuông chùa\n- Sát thương mang tính hệ quả: không chết ngay, mà tàn phế → đau đớn → hối hận\n- Xây dựng thế lực từ nhỏ đến lớn, mỗi chiến thắng đều có cái giá\n- Tôn trọng trí tuệ của người đọc — không giải thích quá, để subtext tự nói\n- Mỗi NPC có động cơ riêng, không hoàn toàn thiện hay ác\n- Phong cách tương tự: Kim Dũng "Đấu Phá Thương Khung", Ngô Công "Tuyệt Thế Võ Thần"',
        opening_narrative:
          'Đêm cuối thu, núi Thanh Vân chìm trong sương.\n\nNgươi tỉnh dậy trên một tấm bình phong cổ trong căn phòng nhỏ của Lưu Giá Trai — nơi sư phụ đã nuôi dưỡng ngươi suốt mười sáu năm, không một lần nói về lai lịch, không một lần nhắc đến gia tộc.\n\nBên ngoài, tiếng gió vi vu qua khe cửa sổ bằng giấy mỏng. Sư phụ ngồi bên bếp lò, tay cầm một quyển sách cũ, ánh mắt không rời khỏi ngọn lửa.\n\n"Ba tháng nữa là Đại Chiến Tu Tiên Hội," sư phụ nói, giọng bình thản như sóng vuốt đá. "Ngươi có thể không đi. Nhưng nếu ngươi muốn biết mình là ai — đây là con đường duy nhất."\n\nNgươi nhìn xuống bàn tay mình. Trên mu bàn tay phải, một vết sẹo hình lưỡi liềm đỏ như máu khô — vết thương mà ngươi không nhớ đã có từ bao giờ, nhưng mỗi khi động đến, lại thấy tim đập nhanh như có ai đó đang gào thét trong lồng ngực.\n\nNgoài cửa sổ, trăng tròn treo lơ lửng giữa nền trời đêm, và xa xa, tiếng chuông từ Thanh Dao Cung vang vọng qua sương.\n\nNgày mai, ngươi sẽ rời núi.',
        language: 'vi',
        lore_text:
          'Bạn có thể bổ sung thêm — AI sẽ mở rộng thế giới từ đây.\n\nHỆ THỐNG TU LUYỆN: Chia thành chín bước — Hấp Khí → Trúc Cơ → Kim Đan → Nguyên Thần → Thái Ất → Đại Thừa → Chân Tiên → Đại La → Tiên Nhân. Mỗi bước chia sơ/trung/thượng cảnh. Hấp Khí sống tối đa 100 năm, Trúc Cơ 200 năm, Kim Đan 500 năm, Nguyên Thần 1000 năm.\n\nTHANH DAO CUNG (Trung ương): Công pháp chính đạo, đệ tử nổi tiếng thanh tâm quỷ dạ. Trụ sở trên đỉnh Thanh Dao, mây trắng quanh năm như thác đổ. Cấm kết duyên với người ngoài.\n\nVÕ THÁNH ĐIỆN (Phía đông): Võ đạo, thân thể là căn bản. Đệ tử trung thực, thẳng thắn. Điện chủ Võ Nhất Minh — "Một Kiếm Phá Sơn".\n\nĐẠO HOA TÔNG (Phía nam): Y thuật, trận pháp, cổ văn. Nơi ẩn náu những căn tính dị biệt.\n\nVÔ TÀ LÂU (Ngầm): Không ai biết chủ nhân, hoạt động trong bóng tối của mọi sect. Biểu tượng: con dơi đen trên nền bạc.\n\nBẮC MẠCH VƯƠNG TRIỀU: Vương triều thế tục có tu sĩ bảo vệ hoàng gia. Vương tử thứ ba đang âm mưu củng cố quyền lực.\n\nTHIÊN MA GIÁO: Tà giáo bị phong ấn 300 năm trước. Bí mật: không phải tà giáo, mà là những tu sĩ phát hiện sự thật về nguồn gốc tu luyện.',
      },
    },
    {
      id: 'ma_dao_ta_tu',
      label: { vi: 'Ma đạo tà tu', en: 'Demonic cultivation' },
      preset: {
        title: 'Huyết Nguyệt Ma Đồ',
        description:
          'Ma đạo không chỉ là công pháp — là giá phải trả. Ngươi sống trong thế giới nơi chính tà không còn ranh giới: mỗi lần đột phá đều cần máu hoặc linh hồn, và những kẻ tự xưng chính đạo cũng giấu tội ác dưới lớp hương khói.\n',
        tone_instructions:
          'Phong cách u ám, bạo liệt, đạo đức xám đậm. Nhấn mạnh:\n- Ma công có "giá": phản hồi thể xác, tâm trí, quan hệ — không miễn phí\n- Kẻ thù và đồng minh đổi vai theo lợi ích; lời thề dễ vỡ hơn kiếm\n- Cảnh tượng: huyết trận, nguyệt thực, sương đen, xương cốt lộ thiên\n- Đối thoại ngắn, sắc; nội tâm nhiều hoài nghi và tự khinh bỉ\n- NPC ma tu có lý do riêng — không phải quái vật mặc định\n- Tránh giải thích lore dài trong thoại; để hành động và hiện tượng kể\n- Chiến đấu: hậu quả lâu dài — độc, nguyền, vết ma khí ăn vào kinh mạch',
        opening_narrative:
          'Trăng máu treo trên vách núi Vạn Cốt.\n\nNgươi quỳ trước một bia đá nứt, trên đó khắc chữ cổ đã mờ: "Ai uống máu minh chủ, mang nợ ba đời." Một giọt máu từ ngón tay ngươi thấm vào đá — và từ dưới lòng đất, tiếng thì thầm như sương tràn lên gáy.\n\n"Đệ tử thứ bảy," một bóng đen không khuôn mặt nói phía sau lưng, "ngươi còn đường lui. Một bước nữa — là Ma Đồ."\n\nGió mang mùi sắt và hương trầm lẫn lộn. Xa xa, đuốc của tu sĩ chính đạo đang truy lùng dấu vết ma khí. Ngươi biết: từ đêm nay, không còn làng quê nào dám cho ngươi nương náu.\n\nBàn tay ngươi siết chặt. Ma ấn dưới da nóng ran — như thứ đang đói.',
        language: 'vi',
        lore_text:
          'MA ĐẠO CỐT LÕI: Tu luyện bằng "tâm ma" và ngoại lực (linh hồn, máu tộc, di vật). Đột phá càng nhanh — tâm ma càng sâu.\n\nVẠN CỐT SƠN: Nơi các phe ma đạo hội họp ngầm. Lệnh bài bằng xương ngón, mỗi mảnh thuộc một huyết mạch.\n\nTHIÊN HÀ MINH: Liên minh chính đạo truy sát ma tu; nội bộ có kẻ bán tin cho ma môn.\n\nHUYẾT NGUYỆT ĐIỂN: Công pháp truyền miệng; mỗi tầng cần một "chứng" — ký ức hoặc mạng người.\n\nBÍ MẬT THẾ GIỚI: Linh khí thiên địa đang cạn; chính đạo che giấu vì sợ hoảng loạn. Ma đạo khai thác thứ họ gọi là "dư âm linh" — phần còn sót của kỷ nguyên cổ.',
      },
    },
    {
      id: 'phe_vat_nghich_thien',
      label: { vi: 'Phế vật nghịch thiên', en: 'Underdog ascension' },
      preset: {
        title: 'Côn Lôn Kiếm Tàn',
        description:
          'Bị xem là phế linh căn, bị họ hàng ruồng bỏ, bị đệ tử ngoại môn giẫm lên — ngươi chỉ còn một thanh kiếm gãy và lời nguyền không ai tin. Nhưng chính từ đáy vực, con đường nghịch thiên mở ra: không phải do trời ban, mà do ngươi chọn trả giá.\n',
        tone_instructions:
          'Nhịp truyện: nhục → ganh → đột phá → lặng lại suy ngẫm. Giọng văn:\n- Đoạn ngoại hình/tiếng cười chế nhạo ngắn, sắc — không lặp lại cliché quá nhiều\n- Chiến thắng ban đầu nhỏ nhưng có ý nghĩa hệ thống (kinh mạch, ý chí, mưu)\n- NPC: kẻ khinh ngươi hôm qua có thể cần ngươi ngày mai — đừng hắc hóa họ vô cớ\n- Thể hiện "nghịch thiên" qua lựa chọn đạo đức: cướp cơ duyên hay chờ thời\n- Cảnh luyện tập: mồ hôi, máu, đêm không ngủ, kiếm ý mơ hồ\n- Tránh power creep vô hạn — mỗi tầng mới có đối thủ xứng tầm và cái giá mới',
        opening_narrative:
          'Sân luyện kiếm lúc bình minh, sương còn đọng trên đá.\n\n"Ba chiêu." Đệ tử nội môn đứng trước mặt ngươi, mũi kiếm chĩa xuống đất như thể ngươi không đáng cho hắn giơ cao. "Ba chiêu mà ngươi đỡ được — ta cho ngươi ở lại tông môn thêm một tháng."\n\nNgươi siết chuôi thanh kiếm tập gỗ. Trong cơ thể, linh khí như sợi chỉ gãy — đúng như sư trưởng đã phán: phế căn.\n\nNhưng đêm qua, trong giấc mơ, có tiếng kim loại va vào nhau. Một bóng người không mặt đặt lên tay ngươi một mảnh kiếm rỉ, thì thầm: "Phế là do người đo — không phải do trời."\n\nChuông tông môn vang. Hôm nay là ngày thí luyện. Và ngươi biết: nếu thua, ngươi sẽ bị đuổi xuống núi — nơi không ai sống sót trở lại.',
        language: 'vi',
        lore_text:
          'TÔNG MÔN THIÊN KIẾM: Chia nội/ngoại môn; tài nguyên dồn cho "thiên tài". Phế căn bị giao việc dơ bẩn hoặc làm lá chắn nhiệm vụ.\n\nCÔN LÔN ẤN: Truyền thuyết về kiếm thánh từng chém rách trời; chỉ còn mảnh vỡ tản mạn — ai hợp được mảnh sẽ nghe thấy "kiếm ca".\n\nHẮC PHONG LÂU: Thương hội bán tin, đan dược, và… mạng người. Không hỏi lai lịch.\n\nĐOẠT THIÊN ĐÀI: Nơi đệ tử các tông tranh tài công khai; thua có khi mất cả tu vi.\n\nQUY TẮC NGẦM: Phế vật không được khóc trước mặt nội môn — nhưng được phép sống sót bằng mọi giá ngoài tầm nhìn họ.',
      },
    },
    {
      id: 'thuong_co_bi_canh',
      label: { vi: 'Thượng cổ bí cảnh', en: 'Ancient secret realms' },
      preset: {
        title: 'Cửu U Diệt Trận',
        description:
          'Các bí cảnh thượng cổ không phải kho báu — là nhà tù của thứ từng bị lịch sử xóa tên. Ngươi bước vào giới hạn nơi thời gian gập lại: một bước có thể là ngàn năm, một câu nói có thể đánh thức thứ không nên tỉnh.\n',
        tone_instructions:
          'Không gian: mê hoặc, quy mô, im lặng đáng sợ. Nhấn mạnh:\n- Bí cảnh có "luật" riêng — trọng lực, ký ức, cấm ngôn\n- Di tích kể chuyện: phù văn mòn, tượng vỡ, máu khô thành khoáng\n- Sinh vật: không la lớn; chúng săn bằng kiên nhẫn\n- Đội ngũ/NPC: ai vào trước đã mất — chỉ còn dấu vết hoặc bóng ma\n- Ngươi (người chơi) là mắt xích cuối: chọn phá trận hay lấp trận\n- Tránh spoil toàn bộ bí mật sớm — mỗi tầng bí cảnh một mảnh ghép\n- Giọng văn trang trọng, chậm, nhiều cảm giác da gà',
        opening_narrative:
          'Cổng đá không có cửa — chỉ có khe hở như vết dao cắt không khí.\n\nNgươi đặt tay lên phù văn. Đá nóng bất thường, như thể bên trong vẫn còn máu chảy. Một luồng sáng xanh lục rạch qua mí mắt — và tiếng gió biến thành tiếng người hát, xa xăm, không lời.\n\n"Người thứ mười một," giọng nói không biết từ đâu vọng lại. "Mười người trước không ra. Ngươi vẫn vào?"\n\nPhía sau lưng, đồng đội cầm đuốc run run. Phía trước, sương đen cuộn như thủy triều ngược. Trên cổ ngươi, bùa hộ mệnh nóng dần — dấu hiệu có thứ đang gọi tên ngươi từ sâu trong trận.\n\nNgươi bước qua khe. Ánh sáng mặt trời tắt như bị bóp nghẹt.',
        language: 'vi',
        lore_text:
          'CỬU U: Chín tầng không gian chồng lên nhau; mỗi tầng một "Diệt" — Diệt Thân, Diệt Danh, Diệt Ký Ức… (có thể mở rộng trong chơi).\n\nTHƯỢNG CỔ MINH ƯỚC: Các tông môn từng hiến tế đệ tử để lấp trận; sử sách bị đốt, chỉ còn truyền miệng méo mó.\n\nLINH MẠCH CHẾT: Khu vực linh khí đông cứng thành tinh thể — chạm vào có thể thấy ảo ảnh của người chết.\n\nẢNH TỒN: Sinh vật không có bóng; săn bằng cách bắt chước tiếng người thân của nạn nhân.\n\nMỤC TIÊU ẨN: Phá trận có thể thả thứ ra ngoài — hoặc củng cố phong ấn bằng sinh mệnh người mới.',
      },
    },
  ],
}
