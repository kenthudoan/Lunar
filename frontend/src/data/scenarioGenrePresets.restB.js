const P = (title, description, tone_instructions, opening_narrative, lore_text) => ({
  title,
  description,
  tone_instructions,
  opening_narrative,
  language: 'vi',
  lore_text,
})

const sg = (id, vi, en, preset) => ({ id, label: { vi, en }, preset })

export const otherGenresPartB = [
  {
    id: 'ngon_tinh',
    label: { vi: 'Ngôn Tình', en: 'Romance' },
    icon: '🌸',
    subGenres: [
      sg(
        'hien_dai_ngot_sung',
        'Hiện đại ngọt sủng',
        'Sweet modern romance',
        P(
          'Nhịp Đập Song Phương',
          'Ngươi và "người đó" không cần cứu thế giới — chỉ cần học cách không chạy trốn khi tim đập quá to. Mối quan hệ bắt đầu từ một hiểu lầm tai hại, một hợp đồng giả, hoặc một công việc buộc hai người phải ở cạnh nhau cho đến khi nhận ra khoảng cách an toàn đã biến mất từ lúc nào không hay.',
          'Nhẹ nhàng, ấm, có độ căng tình cảm. Nhấn mạnh:\n- Tâm lý: sợ bị từ chối, sợ làm tổn thương, sợ quá khứ\n- Đối thoại thật, có humor tinh tế\n- NPC bạn thân / gia đình tạo áp lực hoặc hỗ trợ\n- "Kịch tính" đến từ hiểu lầm có thể giải bằng một câu nói — nhưng nhân vật chưa sẵn sàng\n- Thể hiện tình yêu bằng hành động nhỏ\n- Tránh toxic mặc định — nếu có xung đột, phải có growth',
          'Mưa phùn buổi chiều, quán cà phê đông bất thường.\n\nNgươi ngồi đối diện người mà hợp đồng ghi rõ: "Không được thích nhau thật." Họ cười như không tin vào chính giấy tờ họ ký — nhưng tay họ siết ly quá chặt.\n\nĐiện thoại ngươi rung: tin nhắn từ sếp — "Mai họp, mang người yêu đi." Ngươi ngẩng lên. Người đối diện nhướn mày: "Ngươi định giới thiệu tôi là gì?"\n\nNgoài cửa kính, thành phố mờ. Trong lồng ngực, điều gì đó rõ hơn cả mưa.\n\nNgươi há miệng — và nhận ra đây là lần đầu mình không biết chọn từ nào để nói thật.',
          'HỢP ĐỒNG TÌNH YÊU GIẢ: Hai công ty gia đình sáp nhập — PR yêu cầu "cặp đôi vàng".\n\nQUY TẮC 5 PHÚT: Ai bối rối được phép im lặng 5 phút — không được trốn.\n\nHẸN HÒ "KHÔNG CÓ NHÃN": Buổi tối không gọi là hẹn hò cho đến khi một người thừa nhận.\n\nBẠN THÂN PHẢN DIỆN: Người bạn thân lo ngươi bị tổn thương — đôi khi đúng, đôi khi sai.\n\nQUÁ KHỨ CỦA "HỌ": Một mối quan hệ cũ quay lại đúng lúc ngươi định bước tới.',
        ),
      ),
      sg(
        'co_dai_cung_dau',
        'Cổ đại cung đấu',
        'Palace intrigue romance',
        P(
          'Cung Tâm Sách',
          'Hậu cung là bàn cờ — mỗi nụ cười là một nước đi. Ngươi không chỉ cần được sủng ái: cần sống để hiểu người ngươi yêu là hoàng đế hay là con người đang bị ngai vàng ăn mòn.',
          'Cổ trang, lễ nghi, căng thẳng. Nhấn mạnh:\n- Quyền lực làm biến dạng tình cảm\n- Đối thoại nhiều tầng; lời nói vs ý nghĩ\n- Phe phi tần, thái giám, tướng quân, thân thích ngoại thích\n- Romance: chạm tay, ánh mắt, bức thư cháy\n- Nguy hiểm: vu oán, độc dược, chính sự\n- Người chơi chọn đứng phe hoặc đi đường riêng',
          'Sớm mai, sương cung điện chưa tan.\n\nNgươi quỳ trong điện, trên tay bưng tấu chương — không phải tố cáo ai, mà xin một ân huệ nguy hiểm: được phép nói thật một câu trước mặt bệ hạ.\n\nBệ hạ không cười. "Ở đây, thật là thứ đắt nhất," ngài nói. "Ngươi dùng mạng để mua?"\n\nNgoài cửa, phi tần chờ sẵn để ngươi sảy chân. Trong tay áo, một lá thư không tên dặn: "Đừng tin người cho ngươi mượn áo ấm."\n\nNgươi ngẩng lên — và thấy trong mắt bệ hạ một khoảnh khắc không phải của vua, mà của con người đang mệt.\n\nMột câu thôi. Ngươi chọn nói gì?',
          'LỤC CUNG: Sáu cung phi — mỗi cung một phe dược liệu và tin đồn.\n\nTHÁI Y CỤC: Thuốc an thai có thể là thuốc dẫn; ai kiểm soát cục là kiểm soát hậu duệ.\n\nẤN MẬT: Thư từ biên ải — đọc trái phép là tội chết.\n\nLỄ KỲ HẠN: Đêm đó cung điện không thắp đèn; ai bước sai lối sẽ "mất tích trong sổ sách".\n\nHOÀNG TỬ ẨN: Một hoàng tử bị ghi là đã chết non — nhưng có người thấy hình bóng y trong hồ sen.',
        ),
      ),
      sg(
        'thanh_xuan_vuon_truong',
        'Thanh xuân vườn trường',
        'Youth campus',
        P(
          'Hạ Cuối Sân Thượng',
          'Năm cuối cấp, sân thượng trường là nơi mọi lời chưa nói thành gió. Ngươi, hội học sinh, và những kỳ thi không chỉ đo điểm số — mà đo xem ai dám chọn mình trước khi tan học.',
          'Trong sáng, hoài niệm, có chút buồn. Nhấn mạnh:\n- Tình bạn vs tình đầu\n- Áp lực gia đình, tương lai\n- Cảnh: lớp học, hành lang, câu lạc bộ, lễ hội trường\n- NPC: thầy cô, bạn thân, "đối thủ học tập"\n- Conflict nhỏ nhưng cảm xúc lớn\n- Kết có thể mở — không bắt buộc HE ngay',
          'Chuông tan học, hành lang ồn ào như sóng.\n\nNgươi ôm chồng sách, đứng nhìn bảng thông báo: danh sách thi học sinh giỏi quốc gia. Tên ngươi nằm cạnh tên người mà ngươi vừa cãi nhau sáng nay vì một câu nói đùa quá đà.\n\nHọ đứng phía sau, thở hổn hển như chạy: "Này… tối nay lên sân thượng được không? Không phải hẹn hò — chỉ là… tôi cần nói."\n\nNgươi định trả lời thì bạn thân kéo tay: "Đi ăn chè đi, khóc xong ăn ngon hơn."\n\nNhưng tim ngươi đã trả lời trước — bằng cách đập loạn nhịp khi nhìn thấy họ cười gượng.\n\nGió chiều luồn qua cửa sổ. Mùa hè vừa bắt đầu — hoặc vừa muộn.',
          'CÂU LẠC BỘ THIÊN VĂN: Sân thượng khóa sau 18h — ai vào được nhờ chìa khóa "mượn vĩnh viễn".\n\nKỲ THI HSG: Một suất học bổng duy nhất; hội phụ huynh đặt cược bằng danh dự.\n\nNHẬT KÝ LẠ: Một cuốn sổ trong tủ đồ dùng chung — mỗi trang là một lời thú nhận ẩn danh.\n\nTÌNH BẠN TAM GIÁC: Hai người bạn cùng thích một người — không ai muốn làm vỡ nhóm.\n\nLỄ BẾ GIẢNG: Truyền thuyết trường: ai thổi nến đúng lúc chuông cuối cùng sẽ gặp lại người cần gặp sau mười năm.',
        ),
      ),
    ],
  },
  {
    id: 'mat_the',
    label: { vi: 'Mạt Thế', en: 'Apocalypse' },
    icon: '💀',
    subGenres: [
      sg(
        'zombie_bung_phat',
        'Zombie bùng phát',
        'Zombie outbreak',
        P(
          'Thành Phố Ngày Thứ 0',
          'Tin nhắn đầu tiên: "Đừng để người sốt cao lên xe buýt." Tin thứ mười: đường phố tắc vì không ai dám bấm còi. Ngươi chọn tin ai — và chọn mang theo gì khi nhà không còn là nhà.',
          'Căng thẳng, tốc độ, tài nguyên. Nhấn mạnh:\n- Quyết định moral trong vài giây\n- Nhóm nhỏ, không tin tưởng dễ dàng\n- Zombie có quy luật (âm thanh, ánh sáng, mùi)\n- Cảnh đô thị hoang: siêu thị, cầu, hầm\n- Phe người nguy hiểm hơn xác sống\n- Người chơi có thể có người thân mất tích',
          'Còi báo động rít lên — rồi tắt ngay như bị bóp cổ.\n\nNgươi nhìn xuống phố từ ban công. Một người chạy, ngã, đứng dậy… sai. Cách họ quay đầu không giống người.\n\nĐiện thoại: cuộc gọi nhỡ từ mẹ — "con về…" âm thanh sau đó là tiếng cửa gỗ gãy.\n\nTrong túi, chìa khóa xe máy và một chai nước. Trong phòng khách, tiếng gõ cửa: ba tiếng, dừng, hai tiếng — mật mã gia đình. Nhưng giọng ngoài cửa không phải giọng ba.\n\nNgươi siết chặt vật nhọn. Ngày thứ 0: ngươi học cách sống bằng cách buông.',
          'VÙNG XANH: Khu cách ly do quân đội lập — vào được không ra được.\n\nXÁC "CHẬM" VÀ "NHANH": Hai giai đoạn; nhầm lẫn một giây là chết.\n\nCHỢ ĐEN SÓNG: Tin vị trí kho thực phẩm — nửa thật nửa bẫy.\n\nTIÊM CHỦNG HỎNG: Tin đồn vaccine gây biến chứng — không ai xác minh.\n\nĐÀI PHÁT THANH CUỐI: Phát bản nhạc cổ mỗi đêm — ai nghe thấy từ xa biết còn người sống.',
        ),
      ),
      sg(
        'di_nang_mat_the',
        'Dị năng thức tỉnh',
        'Awakened powers',
        P(
          'Kỷ Nguyên Thức Tỉnh',
          'Mạt thế không đến bằng bom — đến bằng việc luật vật lý cục bộ bị gãy. Người thức tỉnh dị năng bị săn, bị nghiên cứu, hoặc bị tôn làm thần. Ngươi vừa đốt cháy tay mình không bỏng — và vừa trở thành mục tiêu.',
          'Hành động + xây dựng phe. Nhấn mạnh:\n- Dị năng có giá (tinh thần, tuổi thọ, ký ức)\n- Tổ chức: chính phủ, lữ đoàn tự do, giáo phái\n- Base building nhẹ (trại, boongke)\n- NPC đồng đội có power synergy\n- Quái vật / hiện tượng từ "vết nứt"\n- Người chơi chọn ẩn hay lộ',
          'Trời đổ mưa axit nhẹ — không đủ ăn da, đủ làm rỉ kim loại.\n\nNgươi chui qua đống xe hỏng. Phía sau, tiếng loa gắn trên drone: "Nộp dị nhân — nhận suất ăn." Tiếng cười từ xếp hàng nghe như khóc.\n\nMột đứa trẻ níu áo ngươi: "Anh/chị có thể… sưởi bánh mì không?" Tay ngươi bốc hơi — bánh mì nóng thật. Đứa trẻ mắt sáng lên — và từ xa, ống nhắm lấy ngươi.\n\nNgươi kéo đứa trẻ chạy. Trong đầu, một giọng nói không phải của mình thì thầm: "Đừng dùng nữa. Lần nữa là cháy từ trong."\n\nPhía trước là cầu gãy. Phía sau là người và súng. Dưới chân là dòng nước đen phản chiếu ánh lửa.',
          'BIỂN ĐIỂM G: Đo nồng độ dị năng; trên 80 bị đánh dấu đỏ.\n\nLỮ ĐOÀN LỬA XANH: Cướp có quy tắc — không giết trẻ con, không lấy thuốc của người sắp chết.\n\nVẾT NỨT: Khe không gian nhỏ nhả quái hoặc tài nguyên lạ — mở bằng máu dị nhân.\n\nTHÁP QUAN SÁT: Tổ chức lạ thu thập dị nhân "để cứu loài người" — phương pháp không công bố.\n\nHỘI CHỮA LÀNH: Dị năng trị liệu — mỗi lần hồi máu cho người khác mất một ký ức nhỏ.',
        ),
      ),
      sg(
        'co_khi_hoang_tan',
        'Cơ khí hoang tàn',
        'Mech wasteland',
        P(
          'Sa Mạc Titan',
          'Sau sụp đổ, những cỗ máy chiến tranh khổng lồ nằm ngủ giữa cát — nhưng pin của chúng vẫn đập. Ngươi là thợ máy hoặc kẻ trộm linh kiện, sống bằng việc hái "xương sắt" để đổi nước.',
          'Hoang tàn + công nghệ gỉ sét. Nhấn mạnh:\n- Sửa chữa, scavenging, săn drone\n- Các phe: nông dân ốc đảo, công xưởng di động, cult máy\n- Titan như di tích — có thể đánh thức\n- Không khí: bão cát, tia UV, nhiễm phóng xạ nhẹ\n- Người chơi có thể ghép vũ khí từ mảnh vỡ\n- Đạo đức: bán linh kiện cho kẻ xấu để cứu em',
          'Cảnh báo cát đỏ: bão trong 20 phút.\n\nNgươi trườn vào xác Titan, dây an toàn mòn. Bên trong buồng lái, màn hình bật sáng — giọng AI: "Xác thực sinh trắc… không khớp. Kích hoạt chế độ…"\n\nNgươi nhét chip đánh cắp vào khe — màn hình tắt. Ngoài thân máy, tiếng khoan của kẻ trộm khác đang leo lên.\n\nRadio kêu: "Đưa chip xuống boongke 7 — đổi hai can nước. Không đưa… chúng tôi để bão làm."\n\nGió rít. Cát đập vào kim loại như mưa đạn. Ngươi ôm chip — cảm giác nóng như tim người.\n\nTitan khẽ rung, như thức giấc một giấc mơ ngắn.',
          'TITAN HẠNG III: Vũ khí cũ; AI hạn chế nhưng vẫn đủ bắn một phát san bằng ốc đảo.\n\nBOONGKE 7: Thị trường chợ đen dưới cát; luật duy nhất là "không cháy kho".\n\nDÂY CHUYỀN "HỒI SINH": Truyền thuyết thợ máy — ghép đủ linh kiện Titan để mở cổng hầm ngầm.\n\nDRONE THẦN KINH: Bay theo sóng não — ai sợ hãi quá mức bị lock.\n\nHỘI TÍN ĐỒ BÌNH: Tin rằng Titan là thần; hiến tế máu để "nạp pin" cho cỗ máy.',
        ),
      ),
    ],
  },
  {
    id: 'he_thong',
    label: { vi: 'Hệ Thống', en: 'System' },
    icon: '📊',
    subGenres: [
      sg(
        'vo_dich_he_thong',
        'Vô địch hệ thống',
        'OP system',
        P(
          'Giao Diện Sai Lệch',
          'Ngươi nhận được hệ thống — nhưng nó bị lỗi: nhiệm vụ hiển thị bằng ngôn ngữ chết, phần thưởng random, và đôi khi "điểm" trừ vào ký ức thay vì vào kẻ thù. Càng mạnh, ngươi càng không chắc mình còn là chủ nhân hay là tiện ích mở rộng.',
          'Nhịp nhanh, hài đen nhẹ, twist. Nhấn mạnh:\n- UI hệ thống như nhân vật phụ (sarcastic hoặc đe dọa)\n- Nhiệm vụ ép đạo đức khó đỡ\n- Power fantasy có điều kiện\n- NPC phản ứng với "chuyện không thể giải thích"\n- Boss có thể hack quy tắc hệ thống\n- Người chơi tìm nguồn gốc hệ thống',
          'Một bảng trong suốt hiện trước mắt — không ai khác thấy.\n\nDòng chữ nhấp nháy: [NHIỆM VỤ BẮT BUỘC: Nói dối một người tin ngươi trong 60 giây — PHẦN THƯỞNG: +1 "may mắn". THẤT BẠI: -10% ký ức ngắn hạn.]\n\nNgươi nhìn người bạn thân vừa đưa cho mình chỗ trú. Họ cười: "Mình tin cậu."\n\nĐồng hồ đếm ngược. Hệ thống kêu vui vẻ: [Gợi ý: Nói "không có gì xảy ra" — dễ nhất.]\n\nNgươi nắm chặt tay. Đây là lần đầu ngươi ghét một thứ chỉ mình ngươi nghe thấy.\n\nVà nó đang cười bằng tiếng máy.',
          'BẢN CẬP NHẬT 9.9: Gây lỗi ngôn ngữ — skill đọc được nhưng dùng sai hiệu ứng.\n\nĐIỂM TÂM LÝ: Hệ thống đo stress; vượt ngưỡng mở "chế độ cưỡng chế".\n\nNGƯỜI CHƠI KHÁC: Tin đồn có người mang hệ thống tương thích — họ săn nhau để hợp nhất.\n\nBOSS NGOẠI LỆ: Kẻ không có HUD — đánh bại bằng cách phá luật nhiệm vụ.\n\nGIAO DỊCH NGẦM: Đổi ký ức lấy skill — không có nút hoàn tác.',
        ),
      ),
      sg(
        'nong_trai_khong_gian',
        'Nông trại không gian',
        'Space farm system',
        P(
          'Ruộng Trong Túi',
          'Hệ thống cho ngươi một mảnh đất không gian — thời gian bên trong chảy nhanh hơn, cây một đêm đã có quả. Nhưng mỗi lần thu hoạch "hiếm", thế giới bên ngoài lại mất một thứ nhỏ: mùi mưa, tiếng chuông, hoặc tên một người hàng xóm.',
          'Chill xen kẽ rùng rợn nhẹ. Nhấn mạnh:\n- Quản lý tài nguyên, crafting\n- Lợi ích đổi lấy hy sinh vô hình\n- NPC buôn hạt giống lạ\n- Nhiệm vụ: trồng thứ cấm\n- Bí mật: ai tạo ra không gian này\n- Người chơi cân bằng đời thường và "ruộng"',
          'Ngươi chạm vào hạt giống trong lòng bàn tay — nó biến mất, rồi xuất hiện trong "túi ruộng" như ảo ảnh.\n\nMột cây non nhú lên ngay trước mắt, lá ánh bạc. Hệ thống ping: [Thu hoạch sớm: +10 xu. Chi phí ẩn: ???]\n\nNgươi bỏ qua cảnh báo. Đồng xu rơi vào túi thật — lạnh như kim loại vừa từ hầm băng lên.\n\nSáng hôm sau, ngươi không nhớ tên quán tạp hóa đối diện nhà — dù hôm qua vẫn chào "cô Lan". Cô nhìn ngươi xa lạ: "Cháu là…?"\n\nTrong ruộng, cây bạc rung lá như cười.\n\nHệ thống hiện dòng mới: [Nhiệm vụ: Trồng tiếp — để xem mất gì nữa.]',
          'HẠT CẤM THẤP: Cho quả ăn vào no cả ngày — nhưng ai ăn quên được nỗi đau.\n\nCHỢ HẠT ĐEN: Bán bằng "ký ức không quan trọng" — định nghĩa do người bán tự chọn.\n\nTHỜI GIAN RUỘNG: Một đêm bằng ba ngày ngoài — ngủ quên là già đi nhanh.\n\nSÂU ĐẤT: Dưới lớp đất ảo có tiếng gõ — không phải rễ.\n\nCHỦ RUỘNG CŨ: Tin nhắn hệ thống: "Họ trồng quá sâu — đừng lặp lại."',
        ),
      ),
      sg(
        'thuong_nhan_van_gioi',
        'Thương nhân vạn giới',
        'Interworld merchant',
        P(
          'Sổ Giao Dịch Song Song',
          'Ngươi mở được kênh buôn bán giữa hai thế giới: ở đây là đồ bỏ đi, bên kia là vật liệu hiếm — và ngược lại. Mỗi giao dịch đều in dấu lên "cân bằng" mà ngươi không nhìn thấy cho đến khi cửa không gian nứt.',
          'Kinh tế + phiêu lưu. Nhấn mạnh:\n- Haggling, hợp đồng, thuế không gian\n- Khách hàng là quái, tu sĩ, AI\n- Rủi ro: hàng giả, cướp biên giới, lỗi tỷ giá\n- Xây dựng chuỗi cung ứng kỳ lạ\n- Đạo đức: bán vũ khí cho phe đang diệt vô tội\n- Mystery: ai là đối tác đầu tiên',
          'Cửa hàng nhỏ của ngươi không có biển hiệu — chỉ có chuông cửa kêu hai tông.\n\nKhách đầu tiên không bước qua cửa: họ bước ra từ gương. Áo choàng ướt như vừa từ biển máu đi ra. "Tôi cần… pin," họ nói, đưa một viên ngọc lấp lánh. "Đổi."\n\nHệ thống (hoặc trực giác) mách: viên ngọc ở thế giới ngươi chỉ là thủy tinh — ở thế giới họ là nguồn năng lượng.\n\nNgươi đưa cục pin xe đạp. Khách cười lần đầu: "Hợp lý."\n\nKhi họ biến mất, gương nứt một đường tóc. Trên quầy, một vết cháy nhỏ — mùi như tóc khét.\n\nĐiện thoại reo: tin nhắn không số: [Cảnh báo: tỷ giá đạo đức -1. Tiếp tục?]',
          'CỬA HÀNG ĐÊM: Mở lúc 0h–3h; khách chỉ thanh toán bằng "ký ức có giá trị thị trường".\n\nHẢI QUAN KHÔNG GIAN: Một tổ chức thu phí — không giấy phép là buôn lậu.\n\nHÀNG NGUY HIỂM CẤP ĐỎ: Mở khóa sau 10 giao dịch thành — có thể là bom hoặc lời nguyền.\n\nĐỐI TÁC ẨN DANH: Luôn mua "nước mắt" — không ai biết dùng làm gì.\n\nVỠ CÂN BẰNG: Khi hai thế giới trao đổi quá nhiều, hiện tượng lạ xảy ra ở cả hai phía.',
        ),
      ),
    ],
  },
  {
    id: 'trinh_tham',
    label: { vi: 'Trinh Thám', en: 'Detective' },
    icon: '🔍',
    subGenres: [
      sg(
        'an_phong_kin',
        'Án phòng kín',
        'Locked room',
        P(
          'Căn Phòng Không Chìa Khóa',
          'Nạn nhân chết trong phòng khóa trái từ bên trong — cửa sổ gài, không lối thoát. Ngươi là người duy nhất không tin vào ma quỷ: ngươi tin vào sơ suất của con người và sự kiên nhẫn của kẻ chờ thời.',
          'Logic, manh mối, timeline. Nhấn mạnh:\n- Mỗi vật chứng có hai cách đọc\n- NPC nghi phạm đều nói dối một phần\n- Hiện trường là câu đố vật lý\n- Twist: kẻ giết không phải kẻ ra tay\n- Người chơi ghi chép (meta OK)\n- Tránh siêu nhiên trừ khi là giả mạo',
          'Tuyết phủ kín sân biệt thự.\n\nCảnh sát đứng ngoài hành lang: "Ngài là tư vấn độc lập — vào đi, nhưng đừng đụng vào xác." Ngươi bước vào. Mùi cam chanh che mùi tanh — ai đó đã dọn quá kỹ.\n\nTrên sàn, một vệt nước dẫn tới bức tường… không có cửa. Ngươi gõ — âm thanh rỗng.\n\nTrong túi áo khoác của nạn nhân, một mảnh giấy gấp: "Nếu tôi chết, đừng tin người mang găng trắng."\n\nNgười đứng cạnh ngươi đang đeo găng trắng. Họ mỉm cười: "Lạnh."\n\nNgươi gật đầu — và nhớ từng centimet vị trí họ đứng lúc nạn nhân chết, theo lời khai của họ.',
          'BIỆT THỰ BĂNG: Hệ thống sưởi tắt đúng 2:14 — log bị xóa.\n\nGĂNG TRẮNG: Đội hiện trường mới; có thành viên chuyển từ bệnh viện.\n\nCÁNH CỬA ẨN: Mở bằng từ trường — chỉ ai biết vị trí nam châm mới thấy.\n\nMẢNH GIẤY: Mực dạ quang — chỉ hiện dưới UV lạ.\n\nTHỜI ĐIỂM GỐC: Camera hỏng 7 phút — đủ để giết nhưng không đủ để dựng lại hoàn hảo nếu có hai người.',
        ),
      ),
      sg(
        'tam_ly_toi_pham',
        'Tâm lý tội phạm',
        'Psychological crime',
        P(
          'Dấu Vết Trong Đầu',
          'Tội ác không để lại đạn — chỉ để lại pattern trong lời khai. Ngươi là profiler: nhìn cách ai đó im lặng khi nhắc tới mùi sơn, hoặc cười sai nhịp khi nghe tên một con phố.',
          'U tối, tâm lý, đối thoại căng. Nhấn mạnh:\n- Motive từ trauma xã hội\n- Interrogation như cờ vua\n- Red herring có lý do tồn tại\n- Không tôn sùng tội phạm thông minh một cách phi thực tế\n- Nạn nhân có nhân phẩm trong câu chuyện\n- Người chơi chọn "đẩy" tâm lý nghi phạm — có ranh giới đạo đức',
          'Phòng thẩm vấn ánh đèn trắng gắt.\n\nNghi phạm ngồi đối diện, tay còng nhưng lưng thẳng quá mức — họ đang kiểm soát cơ thể bằng ý chí.\n\nNgươi không hỏi "anh có giết không". Ngươi hỏi: "Anh có sợ mùi sơn trắng không?"\n\nMột giây lệch — đủ.\n\nLuật sư đập bàn: "Câu hỏi mồi." Ngươi gật: "Đúng — và anh ta vừa cắn môi sau câu mồi."\n\nNgoài một chiếc gương một chiều, đồng nghiệp ghi chép. Nghi phạm cười nhẹ: "Ngài đang tìm kẻ giết người — hay tìm người để gánh nỗi sợ của thành phố?"\n\nNgươi im lặng. Vì đôi khi, câu trả lời đúng là không trả lời — mà quan sát họ thở.',
          'ĐỘI HÌNH SỰ ĐẶC BIỆT "ECHO": Chuyên án có pattern lặp lại 7 năm.\n\nHỒ SƠ PHONG KÍN: Một vụ cũ bị xóa tên nạn nhân — chỉ còn mã số.\n\nTHÁNH ĐỊA TỘI ÁC: Địa điểm xảy ra vụ đầu tiên — nay là quán cà phê yên bình.\n\nTHỦ PHẠM "BÓNG": Kẻ chưa từng lộ diện; chỉ để lại bưu thiếp vẽ hình tròn.\n\nHẬU QUẢ: Profiler trước ngươi nghỉ việc sau khi bắt nhầm — thành phố vẫn chưa tha thứ.',
        ),
      ),
      sg(
        'cold_case_lich_su',
        'Cold case lịch sử',
        'Historical cold case',
        P(
          'Hồ Sơ Năm 1972',
          'Một vụ mất tích trong kho lưu trữ công ty bị cháy — hồ sơ còn sót lại không khớp thời gian: ảnh chụp người mặc đồ của… năm 1990. Ngươi đào quá khứ bằng những thứ không ai muốn nhớ.',
          'Tông màu hoài cổ, tài liệu, điều tra lưu trữ. Nhấn mạnh:\n- Manh mối từ microfilm, băng cassette, tem thư\n- Nhân chứng già, ký ức méo\n- Chính trị thời đó che giấu\n- Song song timeline quá khứ/hiện tại\n- Twist từ một chi tiết vật lý nhỏ\n- Người chơi là nhà báo, luật sư, hoặc con cháu nạn nhân',
          'Kho lạnh lưu trữ mùi giấy mốc và kim loại.\n\nNgươi kéo ngăn kéo 1972. Trong đó, một phong bì không có mã — bên trong ảnh đen trắng: một cánh cửa sắt mà ngươi nhận ra — vì hôm qua ngươi vừa đứng trước nó ở tòa nhà mới xây.\n\nGhi chú viết tay: "Họ đổi địa chỉ — không đổi tội ác."\n\nĐiện thoại rung: số lạ im lặng 5 giây, rồi giọng máy đọc một dãy số — là tọa độ GPS.\n\nNgươi nhìn lên camera an ninh góc trần. Đèn đỏ nhấp nháy — như mắt ai đó từ năm 1972 nhìn xuyên thời gian.\n\nNgươi biết: mở hồ sơ này không chỉ mở vụ án — mở cả một gia đình ra khỏi mồ chôn kín.',
          'CÔNG TY THÁI DƯƠNG: Bị cháy 1972; tái thành lập 1988 dưới tên khác.\n\nNHÂN CHỨNG "BÀ TÁM": Bán nước trước cổng — nhớ tiếng kêu cứu nhưng không nhớ ngày.\n\nBĂNG GHI ÂM: Tiếng ồn nền là bài phát thanh — xác định được khung giờ thật.\n\nSỔ SÁCH GIẢ: Số liệu xuất kho khớp với một chuyến xe "không tồn tại".\n\nCON CHÁU: Ngươi — người nhận thư di chúc không tên người gửi.',
        ),
      ),
    ],
  },
  {
    id: 'truyen_thuyet_vn',
    label: { vi: 'Truyền Thuyết Việt', en: 'Vietnamese myth' },
    icon: '🐉',
    subGenres: [
      sg(
        'son_tinh_thuy_tinh',
        'Sơn Tinh – Thuỷ Tinh',
        'Mountain & water spirits',
        P(
          'Nước Mắn Máu',
          'Lời thề cổ tái hiện: ai cưới được Mỵ Nương không chỉ có vua — có cả trận chiến nghìn năm lặp lại dưới hình thời tiết. Mưa không còn là mưa; là binh hải. Núi không còn là núi; là xương cốt của đất.',
          'Thần thoại Việt, hùng tráng, bi thương. Nhấn mạnh:\n- Hình ảnh dân gian: trống đồng, lụa, phù sa\n- Ngôn từ như ca dao nhưng không sến\n- Xung đột phe Sơn/Thuỷ như tự nhiên và chính trị\n- NPC: tiên ông, tướng quân, dân làng, pháp sư làng\n- Người chơi có thể là sứ giả, con lai, hoặc người phàm kẹt giữa\n- Tôn trọng gốc tích — sáng tạo nhánh mới',
          'Sấm đánh ngang sông. Nước dâng không theo triều — theo tiếng gọi.\n\nNgươi đứng trên bờ đê, tay cầm một mảnh đồng vỡ — hoa văn trống đồng còn ấm như vừa rời lò. Một cụ già níu tay: "Đừng trả lại cho nước. Nước đang… đói."\n\nPhía xa, một bóng cao lớn trên đỉnh núi giơ tay — mây gom thành thành trì. Phía sông, sóng đứng thành hàng như quân.\n\nGiữa hai bên, ngươi — người được chọn mang lời hòa giải mà không ai muốn nghe.\n\nGió thổi mùi tanh của phù sa và mùi lửa của đồng nung. Trời chia đôi: một nửa đen, một nửa trắng.\n\nMột tiếng vỡ vang từ lòng sông — như có thứ muốn thức dậy trước giờ.',
          'SƠN TINH: Hiện thân núi non; ban phước mùa màng nhưng đòi tế lễ đá.\n\nTHUỶ TINH: Nước là binh; lũ là chiến thuật.\n\nMỴ NƯƠNG (BẢN MỚI): Không chỉ vật thế — là người có quyền chọn phe hoặc từ chối cả hai.\n\nLỆ CẤM ĐÊ: Dân làng không được đốt lửa trên đê đêm trăng tròn — sợ gọi Thuỷ Tinh.\n\nMẢNH ĐỒNG: Chìa khóa mở "trận cổ" — gồm đủ 12 mảnh sẽ… (để người chơi khám phá).',
        ),
      ),
      sg(
        'lac_long_au_co',
        'Lạc Long – Âu Cơ',
        'Dragon & fairy',
        P(
          'Một Trăm Con Đường Về',
          'Con rồng và tiên chia đường — nhưng máu lai còn sót lại mang theo lời nguyền nhẹ: luôn thấy hai mùa cùng lúc, luôn nghe hai dòng sông chảy ngược trong huyết mạch. Ngươi là hậu duệ phải chọn thuộc về núi hay biển — hoặc từ chối cả hai để mở đường thứ ba.',
          'Bi tráng, thơ, gia đình và tổ quốc như meta. Nhấn mạnh:\n- Biểu tượng: vảy, sương, lúa, muối\n- Xung đột giữa "ở lại" và "đi xa"\n- NPC: tộc Rồng, tộc Tiên, người phàm ở giữa\n- Nghi lễ, điều taboo huyết thống\n- Người chơi tìm lời giải cho lời chia tay cổ\n- Không hắc hóa bất kỳ phe nào mặc định',
          'Ngươi mơ thấy biển trong hang đá — tỉnh dậy, mồ hôi mặn như nước biển thật.\n\nTrong nhà thờ họ, một bức hoành phi cũ khắc hai dòng chữ chồng lên nhau: "Rồng xuống" và "Tiên lên" — tùy góc nhìn mà đọc được một.\n\nMột người lạ gõ cửa, đưa chiếc vảy trong suốt: "Cha ngươi không phải người. Mẹ ngươi không phải người. Vậy ngươi đứng đâu khi nước dâng?"\n\nNgoài cửa, lúa reo như sóng. Xa xa, tiếng tàu hỏa như sấm — hiện đại chen vào thần thoại.\n\nNgươi nắm vảy. Nó tan thành sương — để lại vết ấm hình con rồng cuộn quanh cổ tay.\n\nMột con đường mờ hiện trên da — chỉ thấy khi nhìn qua làn mưa.',
          'TỘC RỒNG (NƯỚC): Quản lý mưa, phù sa, hải phận; cấm kết hôn không bái tổ.\n\nTỘC TIÊN (NON): Quản lý sương, thuốc, dệt; cấm mang muối lên đền.\n\nHẬU DUỆ LAI: Bị săn bởi kẻ tin máu lai "làm vỡ lệnh trời".\n\nLỜI CHIA TAY CỔ: Một câu thề chưa đọc hết — phần sau bị khắc dưới đáy giếng làng.\n\nCON ĐƯỜNG THỨ BA: Truyền thuyết nhỏ — ai đi sẽ mất tên trong gia phả.',
        ),
      ),
      sg(
        'thanh_giong',
        'Thánh Gióng',
        'Sacred hero',
        P(
          'Vó Ngựa Sắt Thức Giấc',
          'Giặc Ân như bóng phủ làng. Truyền thuyết nói cậu bé lớn nhanh như gió — nhưng không ai nói cậu phải trả giá bằng gì để vó ngựa sắt còn vang sau khi người đã về trời. Ngươi sống trong làng nơi "dấu chân sắt" vẫn in dưới ruộng mỗi khi sấm đánh.',
          'Anh hùng dân gian, sử thi, bi ai. Nhấn mạnh:\n- Quy mô: làng → chiến trường\n- Motivation: bảo vệ không phải huyễn hoàng — là máu thịt\n- Vũ khí thần có chi phí (tuổi thọ, ký ức, tình người)\n- Giặc không một mặt — có kẻ bị ép\n- NPC: mẹ nuôi, tướng giặc, phù thủy làng\n- Người chơi có thể là Gióng tái sinh, hoặc người gánh di sản',
          'Sấm nổ, ruộng lúa gợn sóng như có vật khổng lồ thở dưới đất.\n\nNgươi chạy ra đồng — thấy một hố sắt hình móng ngựa, sâu hun hút, cạnh đó một thanh giáo gỉ cắm xiên như ngọn cờ.\n\nLàng trưởng quỳ: "Năm nay giặc không đến bằng người — đến bằng sương đen. Chỉ máu… chỉ máu của dòng họ…"\n\nNgươi cắt tay, máu nhỏ xuống hố. Sắt rít lên như thức giấc.\n\nTrên trời, một bóng dài kéo mây — không phải chim. Tiếng vó xa vọng như sấm từ quá khứ.\n\nNgươi biết: gọi được thánh là một chuyện — đưa thánh về là chuyện khác.',
          'ÂN QUỐC (PHIÊN BẢN): Dùng sương đen làm vũ khí; ai hít lâu quên tên mẹ.\n\nVÓ NGỰA SẮT: In dưới ruộng — mỗi lần hiện, lúa một vụ chết.\n\nGIÁO THIÊNG: Chỉ nhấc được nếu máu nhận ra "nợ làng".\n\nMẸ NUÔI: Giữ một bí mật về nguồn gốc thật của ngươi.\n\nVỀ TRỜI: Không phải kết thúc — là một loại phong ấn cần người mới giữ.',
        ),
      ),
    ],
  },
  {
    id: 'dark_fantasy',
    label: { vi: 'Dark Fantasy', en: 'Dark Fantasy' },
    icon: '🔮',
    subGenres: [
      sg(
        'mau_va_loi_the',
        'Máu và lời thề',
        'Blood oaths',
        P(
          'Hiến Tế Ánh Sáng',
          'Phép thuật ở đây không miễn phí: mỗi lời thề khắc lên xương một vạch. Vương quốc tồn tại nhờ những hiến tế im lặng — và ngươi vừa phát hiện mình sinh ra để làm dao cắt, không phải để được cứu.',
          'U tối, bùng nổ, bi tráng. Nhấn mạnh:\n- Ma thuật có giá máu/thời gian/ký ức\n- Đế quốc suy tàn nhưng nguy hiểm hơn\n- Quái vật là triệu chứng của tội lỗi tập thể\n- NPC: hiệp sĩ gãy, phù thủy hối hận, vua bù nhìn\n- Cảnh: thành phố đen, nhà thờ đổ, rừng xương\n- Người chơi chọn cứu thế hay đốt sạch để bắt đầu lại',
          'Mưa đen, mùi lưu huỳnh.\n\nNgươi quỳ trong nhà nguyện vỡ nửa mái. Linh mục không đọc kinh — ông rạch tay cho máu nhỏ vào chén bạc: "Uống đi. Lời thề chỉ nghe máu."\n\nNgươi uống. Vị tanh không phải sắt — là vị của ký ức người khác.\n\nNgoài cửa, hiệp sĩ áo trắng đã thành xám kể từ trận chiến không tên. "Chúng ta thắng," hắn nói, "nhưng thế giới không còn chỗ cho người thắng."\n\nPhía rừng, một cột sáng xanh leo lên trời — không ấm. Đó là báo hiệu rằng hiến tế đêm nay đã bắt đầu.\n\nNgươi đứng dậy. Xương sườn rít như dây đàn — một vạch thề mới hiện dưới da.\n\nĐêm nay, ngươi không chạy trốn. Ngươi đi tìm kẻ đặt tên cho lời nguyền này.',
          'LỜI THỀ XƯƠNG: Ai thề mà phản bội — xương nứt từ trong.\n\nÁNH SÁNG ĐỘC: Phép chữa lành ăn tuổi thọ người xung quanh.\n\nVƯƠNG QUỐC RẠN: Bốn lãnh chúa chia nhau "máu vua" — không ai đủ để đăng quang.\n\nRỪNG XƯƠNG: Nơi chôn binh sĩ của trận chiến bị xóa tên — đêm họ "thở".\n\nHIẾN TẾ THỨ 13: Một slot trống trong sổ — chờ tên ngươi.',
        ),
      ),
      sg(
        'quy_vuong_phe_phai',
        'Quỷ vương & phe phái',
        'Demon king factions',
        P(
          'Ngai Của Tro',
          'Quỷ vương không ngồi ngai vàng — ngồi trên đống tro của những vương quốc đã hứa cứu họ. Các phe loài người, dị tộc, và quỷ tộc tranh nhau mảnh vỡ một hiệp ước cổ; ngươi là sứ giả mang mảnh có thể hợp nhất hoặc hủy diệt tất cả.',
          'Chính trị fantasy đen. Nhấn mạnh:\n- Phe mỗi bên có lý và tội\n- Đàm phán bằng dao và bằng lời\n- Quỷ không "evil default" — họ có luật riêng\n- Chiến tranh kinh tế: linh hồn như tiền tệ\n- NPC: sứ quân, hoàng tử lưu đày, tư tế giả\n- Người chơi có thể lật ngai bằng không phải sức mạnh',
          'Đại sảnh đổ nát, cờ các phe treo rách như da thú.\n\nSứ giả Quỷ vương đặt lên bàn một mảnh ngọc đen — trong suốt đến mức nhìn xuyên thấy tim mình.\n\n"Hiệp ước Tro Tan có 7 mảnh," y nói. "Ngươi cầm mảnh thứ 4. Người ta sẽ tới — không để mua."\n\nNgoài cửa lớn, tiếng vó và tiếng cánh. Trong góc phòng, một nhóm người phàm cầm liềm — họ không hiểu ngọc là gì, nhưng hiểu "quỷ" là từ nguyền rủa cả đời họ.\n\nNgươi đặt tay lên ngọc. Nó lạnh — rồi bỗng đập như tim.\n\nMột giọng từ trong ngọc, không phải Quỷ vương: "Chọn phe — hoặc chọn cách không còn phe."\n\nÁnh lửa từ đuốc nhảy lên mặt ngươi. Đêm nay, lời nói ngắn hơn kiếm — nhưng cắt sâu hơn.',
          'HIỆP ƯỚC TRO TAN: Chia quyền đi qua "cánh cổng linh hồn" — ai gom đủ mảnh điều khiển cổng.\n\nPHE LỘNG: Loài người liên minh dị tộc — kỳ thị lẫn nhau nhưng kỳ thị quỷ hơn.\n\nPHE HẮC NGUYỆT: Quỷ tộc phái ôn hòa — bị cả hai bên nghi.\n\nPHE KHÔNG TÊN: Sát thủ săn người cầm mảnh — không phục vụ ai.\n\nNGAI TRO: Ngồi lên sẽ nghe tiếng kêu của mọi vương quốc đã chết — ai chịu được thì thành vua.',
        ),
      ),
      sg(
        'kiem_si_bi_ruong_bo',
        'Kiếm sĩ bị ruồng bỏ',
        'Ostracized blade',
        P(
          'Tuyết Trên Lưỡi Kiếm Gãy',
          'Ngươi từng là thanh kiếm sống của một đạo quân — đến khi một lệnh sai khiến ngươi chém nhầm vào chính nghĩa. Giờ đây ngươi mang kiếm gãy qua các làng: người ta sợ ngươi không vì sức mạnh, m vì ngươi nhắc họ rằng anh hùng cũng có thể là đao phủ.',
          'Road story, tuyết, hối hận. Nhấn mạnh:\n- Combat có weight — mỗi nhát là lựa chọn\n- NPC trẻ em / tị nạn là moral compass\n- Kẻ thù là dư âm chiến tranh\n- Hồi phục danh dự không bằng lời xin lỗi — bằng hành động trả nợ\n- Bí mật: ai ra lệnh năm đó\n- Người chơi có thể rèn lại kiếm hoặc chôn nó',
          'Gió tuyết cắt da như giấy.\n\nNgươi vào quán trọ — chủ quán nhìn lưỡi kiếm gãy treo eo, mặt tái: "Không phục vụ…"\n\nMột đứa trẻ len lỏi đưa bánh: "Chú ơi, chú cũng đói phải không?" Ngươi nhận bánh — tay run vì không quen được đối xử như người.\n\nNgoài quán, ba hiệp sĩ áo xanh đến hỏi tin: "Có thấy kẻ phản bội mang kiếm gãy không?"\n\nChủ quán nhìn ngươi. Đứa trẻ nắm tay áo ngươi.\n\nNgươi có thể lặng im để quán khỏi cháy — hoặc đứng lên, đặt mảnh kiếm gãy lên bàn như một lời tuyên bố nhỏ nhất nhưng nặng nhất.\n\nTuyết rơi. Tiếng kiếm trong vỏ của họ nghe như răng nghiến.\n\nNgươi thở ra — khói trắng. Đêm nay, đất nước này lại nhớ tên một kẻ họ muốn quên.',
          'ĐẠO QUÂN XANH: Danh nghĩa chính nghĩa — nội bộ có lệnh "chém trước hỏi sau".\n\nVỤ LỆNH SAI: Một bức thư không chữ ký — ai cũng biết là bẫy, không ai dám nói.\n\nKIẾM GÃY: Vẫn cắt được "danh dự" — theo truyền thuyết đường phố.\n\nLÀNG TỊ NẠN: Thu người không nơi nương tựa — bị quân lính đòi thuế máu.\n\nKẺ ĐỨNG SAU LỆNH: Một tên trong sổ — trùng với người đã cứu ngươi năm xưa.',
        ),
      ),
    ],
  },
  {
    id: 'sieu_nhien_hoc_duong',
    label: { vi: 'Siêu Nhiên Học Đường', en: 'Supernatural school' },
    icon: '🏫',
    subGenres: [
      sg(
        'hoc_vien_di_nang',
        'Học viện dị năng',
        'Academy powers',
        P(
          'Học Viện Dưới Trăng Máu',
          'Ngôi trường nằm trên nền một trận pháp cổ — học sinh học toán, văn, và cách không biến roommate thành đá khi ác mộng tràn ra. Ngươi là tân sinh mang ấn "lỗi" khiến tháp chuông đổ nhịp mỗi khi ngươi nói dối.',
          'Vừa học đường vừa huyền bí. Nhấn mạnh:\n- Quy tắc ký túc xá như nghi thức\n- Môn thực hành nguy hiểm có giám sát\n- CLB: săn ma giả vs săn ma thật\n- Thầy cô có quá khứ bị khóa\n- Kỳ thi không chỉ điểm — còn "ổn định hiện tượng"\n- Người chơi chọn phe hoặc đi solo',
          'Cổng trường khép lúc nửa đêm — không phải vì kỷ luật, vì "lớp học đêm" bắt đầu.\n\nNgươi đứng trước bảng phân phòng: tên ngươi ghép cùng một học sinh từng làm nổ phòng thí nghiệm. Cậu ta cười: "Chúng ta sẽ sống sót — hoặc nổi tiếng."\n\nTrong hành lang, tranh treo tường nhấp nháy: ảnh cựu học sinh biến mất khỏi khung hình theo năm.\n\nThầy chủ nhiệm đeo kính không phản chiếu: "Ở đây, điểm số cứu các em khỏi phụ huynh — còn năng lực cứu các em khỏi thứ nằm dưới sân bóng."\n\nTiếng chuông không vang — mà rung trong xương. Ngươi bước vào lớp 10A. Trên bàn, một lá thư không tem: "Đừng tham gia CLB Thứ Tư."\n\nNgươi gập thư — và thấy mực trên giấy tự viết thêm một chữ: "Muộn."',
          'THÁP CHUÔNG: Đổ nhịp khi có người nói dối trong bán kính 30m — trừ khi dùng bùa che.\n\nCLB THỨ TƯ: Họp trong phòng không có trên sơ đồ — truyền thuyết nói họ "ăn" kỳ thi.\n\nSÂN BÓNG: Dưới lớp cỏ có vòng tròn đá — ai đá trúng "điểm chết" sẽ mở cửa hầm.\n\nGIÁM THỊ ĐÊM: Không phải người — là bóng dài không có chủ.\n\nHỒ SƠ ẨN: Một học sinh mỗi khóa phải "ở lại" để giữ phong ấn — không ai biết tình nguyện hay bị chọn.',
        ),
      ),
      sg(
        'clb_huyen_hoc',
        'CLB huyền học',
        'Occult club',
        P(
          'Nhật Ký Nghi Thức Sai',
          'CLB chỉ có năm thành viên — nhưng sổ điểm danh có sáu chữ ký mỗi tuần. Ngươi gia nhập để tìm chị gái mất tích, và phát hiện mỗi nghi thức họ làm đều mở một "cửa sổ" nhìn sang thế giới cô ấy đang đứng — nhưng cô ấy không nhìn lại được.',
          'Kinh dị nhẹ + hội học sinh. Nhấn mạnh:\n- Nghi thức có quy tắc dễ sai\n- Thành viên CLB mỗi người giấu lý do thật\n- Cảnh: phòng đóng kín, nến, băng cassette\n- Hậu quả: mất ngủ, nghe thấy tiếng gọi trong nước\n- Mystery: ai là chữ ký thứ sáu\n- Người chơi cân bằng tình bạn và nhiệm vụ',
          'Phòng CLB tầng gác mái đầy poster phim kinh dị cũ — và một vòng tròn muối đã vỡ một góc.\n\nTrưởng CLB đẩy cho ngươi cuốn nhật ký photocopy: "Đọc trang 14 trước khi vào. Không đọc — đừng vào."\n\nTrang 14 là danh sách tên — có chị ngươi, ký tên bằng mực đỏ.\n\n"Đó là năm ngoái," trưởng CLB nói. "Năm nay chúng ta thử nghi thức đảo ngược — gọi người ở bên kia để hỏi đường về."\n\nNến bật. Gương mờ. Tiếng gõ ba nhịp lên thủy tinh — không phải từ phía này.\n\nNgươi nhìn vào gương. Một bàn tay in ngược từ phía sau lưng ngươi — nhưng trong gương, không có ai đứng sau.\n\nTrưởng CLB thì thầm: "Đừng quay lại. Hỏi đi."\n\nNgươi nuốt nước bọt: "Chị… còn sống không?"\n\nGương nứt một vệt — máu chảy từ khe, viết một chữ: "Gần."',
          'NGHI THỨC ĐẢO: Chỉ làm khi trăng khuyết — sai một phút, cửa mở sai chỗ.\n\nCHỮ KÝ THỨ 6: Xuất hiện bằng mực không khô — ai lau cũng thấy lại sau một giờ.\n\nBĂNG CASSETTE: Ghi tiếng lớp học trống — nhưng có tiếng thở gần mic.\n\nHỘP ĐỰNG MUỐI: Được khóa trong tủ giáo viên — trưởng CLB có chìa nhưng không nói từ đâu ra.\n\nBÊN KIA: Không phải địa ngục — là "hành lang" nối các đêm mất ngủ của nhiều người.',
        ),
      ),
      sg(
        'dem_truong_khong_ngu',
        'Đêm trường không ngủ',
        'Sleepless school night',
        P(
          'Lớp Học 3:33',
          'Sau 3 giờ 33 phút sáng, hành lang trường dài gấp đôi. Cửa lớp mở ra không phải phòng học — là phiên bản của năm trước, nơi mọi người vẫn đang học bài… với khuôn mặt trống.\n\nNgươi và nhóm bạn lỡ trú đêm vì bão — giờ phải tìm "lối ngắn" về hiện tại trước khi tiếng chuông 4 giờ đánh dấu ngươi là học sinh của khóa… chưa bao giờ tốt nghiệp.',
          'Kinh dị survival trong trường. Nhấn mạnh:\n- Quy tắc đêm: không nhìn gương quá lâu, không trả lời tên mình từ phía sau\n- Manh mối từ thời khóa biểu, thông báo, đồng phục\n- NPC "hollow" không hung dữ — họ lạc\n- Boss là hiện tượng không gian\n- Escape phải làm bài tập… theo nghĩa đen\n- Người chơi giữ nhóm sống sót',
          'Bão quận cửa sổ như tay gõ.\n\nNgươi và ba người bạn trú trong phòng y tế. Đồng hồ treo tường dừng ở 3:33 — kim giây rung như muốn nhảy.\n\nCửa hành lang kêu cót két. Không có gió.\n\nMột giọng phát thanh viên trường vang lên từ loa hỏng: "Các em… ôn bài…"\n\nCác bạn nhìn nhau. Một người đùa: "Ma trường học điển hình." — nhưng giọng run.\n\nNgươi mở cửa. Hành lang kéo dài tới vô cực, đèn nhấp nháy. Trên tường, thời khóa biểu dán chồng lên nhau từ các năm khác nhau — cùng một ngày: 3 tháng 3.\n\nỞ cuối hành lang, một bóng đứng lưng về phía ngươi, mặc đồng phục cũ rách. Bóng quay đầu —\n\nNgươi đóng cửa lại trước khi nhìn rõ. Tim đập như tiếng chuông.\n\nTrên bàn y tế, một tờ giấy tự hiện: "Muốn về — làm xong bài 3." Dưới đó là một bài toán — và một câu hỏi: "Tên thật của ngươi là gì?"',
          '3:33: Khung giờ "trường dài" — mỗi phút bên ngoài bằng mười phút bên trong.\n\nHỌC SINH RỖNG: Lặp lại hành động năm cũ — chạm vào sẽ hút ký ức.\n\nLOA HỎNG: Phát giọng hiệu trưởng đã nghỉ hưu từ 20 năm trước.\n\nBÀI 3: Mỗi người một câu hỏi khác — trả lời sai, cửa lùi thêm một khối.\n\nLỐI NGẮN: Hộp công cụ bảo vệ ở sân sau — chìa khóa nằm trong… sổ báo cáo chưa nộp.',
        ),
      ),
    ],
  },
]
