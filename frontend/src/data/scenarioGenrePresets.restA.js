const P = (title, description, tone_instructions, opening_narrative, lore_text) => ({
  title,
  description,
  tone_instructions,
  opening_narrative,
  language: 'vi',
  lore_text,
})

const sg = (id, vi, en, preset) => ({ id, label: { vi, en }, preset })

export const otherGenresPartA = [
  {
    id: 'huyen_huyen',
    label: { vi: 'Huyền Huyễn', en: 'Xuanhuan' },
    icon: '🌀',
    subGenres: [
      sg(
        'di_gioi_ma_phap',
        'Dị giới ma pháp',
        'Otherworld magic',
        P(
          'Vương Quốc Ánh Sao',
          'Ngươi bước qua một cánh cổng không ai giải thích được — và thứ đợi bên kia không phải "dị giới thân thiện" trong sách cổ, mà là một lục địa đang nứt vỡ vì ma pháp thừa, nơi mỗi phe đều muốn biến ngươi thành chìa khóa hoặc vật tế.',
          'Phong cách huyền huyễn rộng: đế quốc, học viện, guild, cổ tịch. Nhấn mạnh:\n- Ma pháp có quy tắc chi phí (tinh thần, vật liệu, thời gian hồi)\n- Chính trị phe phái xen lẫn cá nhân đắc tội\n- Cảnh quan kỳ ảo nhưng có logic địa lý — không random\n- NPC có phe, có bí mật; lời hứa có thể là bẫy\n- Tránh "info dump"; lore mở qua hiện tượng và tranh chấp\n- Trận chiến phép: hậu quả môi trường (cháy rừng, nứt đất, câm lặng ma thuật)',
          'Sáng sớm, sương mù trên cánh đồng ánh lên màu tím — không phải vì mặt trời, mà vì những vết nứt không khí còn sót lại sau đêm địch tập.\n\nNgươi nằm bên đống tro của một xe buôn. Xung quanh, tiếng chuông từ tháp canh xa xa vang như cảnh báo. Một lá thư khô máu dính vào tay áo ngươi, chỉ còn mấy chữ đọc được: "Đừng tin người mang nhẫn bạc."\n\nPhía trước là con đường đá dẫn tới thành cổ. Phía sau — bóng người đang lần theo dấu ma lực ngươi vừa vô tình giải phóng.\n\nNgươi đứng dậy. Gió mang mùi lưu huỳnh và hoa lạ. Đây không còn là nhà.',
          'LỤC ĐỊA THẤT TINH: Bảy thành bang nối với nhau bằng cổng dịch chuyển — phí đi lại đắt, dễ bị theo dõi.\n\nHỌC VIỆN NGÂN NGUYỆT: Đào tạo pháp sư chiến đấu; nội bộ chia tông "lý trí" và "bản năng".\n\nCÔNG HỘI THẢM THÚ: Săn quái và thu ma hạch; hợp đồng có điều khoản chết người.\n\nCẤM THƯ CỔ: Một số phép bị xóa tên; ai đọc to sẽ bị "ăn ngược" ký ức.\n\nMẤT CÂN BẰNG: Ma lực dồn ở thành lớn — nông thôn thiếu bảo hộ, dễ sinh dị biến.',
        ),
      ),
      sg(
        'long_toe_de_quoc',
        'Long tộc & đế quốc',
        'Dragons & empire',
        P(
          'Long Ấn Thiên Triều',
          'Rồng không còn là truyền thuyết — họ là tầng lớp thống trị bằng huyết mạch, và đế quốc loài người chỉ tồn tại nếu biết quỳ đúng lúc, đứng dậy đúng thời điểm. Ngươi kẹt giữa lòng long thành: một bước sai là diệt tộc, một bước đúng là đổi sử.',
          'Tone hoành tráng, nghi lễ, uy nghi. Nhấn mạnh:\n- Danh phận huyết thống vs chọn lựa cá nhân\n- Chính trị hôn nhân, hiến tế, minh ước bằng rồng lửa\n- Cảnh quan: cung điện nổi, cầu xương, vườn ngọc\n- Đối thoại nhiều ẩn ý; kẻ cười có thể đang đo dao\n- Chiến tranh: không chỉ quân đội — cả "long uy" đè lên tâm trí\n- Người chơi có thể là con lai, sứ giả, hoặc kẻ mang ấn giả',
          'Tiếng sừng vang ba lần — triều hội bắt đầu.\n\nNgươi quỳ trong sảnh đá đen, trần nhà khắc long văn sống động dưới ánh đuốc xanh. Trên ngai cao, bóng dài của Thái tử Long tộc kéo xuống như lưỡi dao. "Ngươi mang mùi của kẻ phá ấn," hắn nói, giọng như sấm trong bình.\n\nViên đại thần bên cạnh cười khẽ: "Hoặc là khách quý, hoặc là tế phẩm — tùy ngươi chọn cách trả lời."\n\nNgoài cửa sổ hình vòng cung, thành phố loài người nhỏ bé như mô hình. Ngươi cảm thấy ấm ở cổ tay — ấn long mà không ai thừa nhận đã trao cho ngươi đang sáng dần.\n\nMột cơn gió nóng từ hướng long huyệt thổi tới, mang theo tiếng gầm xa xăm như nhắc nhở: thời gian không đứng về phía ngươi.',
          'THIÊN LONG ĐIỆN: Trung tâm quyền lực Long tộc; mỗi trụ cột là xương cổ long hóa thạch.\n\nẤN LONG GIẢ: Tộc danh dự — ai mang ấn mà không phải huyết thống bị săn.\n\nMINH ƯỚC SẮT MÁU: 300 năm hòa bình giữa người và long — đang rạn nứt vì một vụ ám sát chưa có thủ phạm.\n\nHẮC LONG PHÁI: Phản loạn trong Long tộc; tin rằng loài người chỉ nên là nô lệ linh khí.\n\nNGŨ HÀNH LONG TỊCH: Năm di tích, mỗi nơi giữ một mảnh "tim rồng" — gom đủ có thể đổi vương vị.',
        ),
      ),
      sg(
        'thanh_chien_lien_minh',
        'Thánh chiến liên minh',
        'Holy war alliance',
        P(
          'Liên Minh Thần Diệt',
          'Các tộc và giáo phái từng tự xưng là ánh sáng — giờ họ cầm chung một thanh kiếm hộ thần để đối đầu thứ họ gọi là "tà niệm hóa thực". Chiến tranh không còn là đất đai; là niềm tin biến thành vũ khí.',
          'Quy mô chiến tranh + tôn giáo hư cấu. Nhấn mạnh:\n- Tín ngưỡng có phép (thiên phạt, ban phước, tẩy não nhẹ)\n- Liên minh nội bộ đầy nghi kỵ — thắng trận vẫn có thể thua chính trị\n- Đạo đức xám: cứu nhiều người có thể hy sinh ít người\n- Cảnh chiến: cờ hiệu, tụng kinh, ánh sáng chói, tro bay\n- NPC: tướng quân, giáo hoàng phó, gián điệp đức tin\n- Người chơi có thể là kẻ nghi ngờ cả hai phe',
          'Trại liên minh trải trên đồi đất đỏ. Lính gác mang giáp trắng khảm ngọc — mỗi viên ngọc là một lời thề không được phép thất hứa.\n\nNgươi được dẫn vào lều chỉ huy. Bản đồ da trải ra: một vùng đen lan như mực từ "Cột Tà". "Ba ngày nữa nó nuốt làng biên giới," chỉ huy nói. "Chúng ta cần một người vào trong và sống sót để mang về mẫu."\n\n"Ngươi không phải tín đồ," y nhìn ngươi. "Vậy tại sao ngươi còn thở ở đây?"\n\nNgoài lều, tiếng cầu nguyện hòa với tiếng rèn kiếm. Trên tay ngươi, một vết bỏng hình thánh giá tự xuất hiện từ đêm qua — như thể ai đó đã chọn ngươi mà không hỏi.',
          'THÁNH KIẾM ARDEL: Vũ khí tập thể — cần đủ tín đồ đồng bộ niệm mới phát huy.\n\nCỘT TÀ: Hiện tượng ăn ký ức công cộng; dân làng quên tên nhau.\n\nHẮC GIÁO ĐỒNG TỬ: Phe đối lập cho rằng "ánh sáng" mới là tà vì kiểm soát tư tưởng.\n\nHIẾN TẾ TÌNH BÁO: Một số nhiệm vụ yêu cầu đưa người vào vùng đen để "nghe" tà niệm — tỷ lệ điên cao.\n\nĐÌNH CHIẾN GIẢ: Một nhóm thứ ba muốn phá cả hai phe để mở "cánh cửa thứ ba".',
        ),
      ),
    ],
  },
  {
    id: 'vo_hiep',
    label: { vi: 'Võ Hiệp', en: 'Wuxia' },
    icon: '🏯',
    subGenres: [
      sg(
        'giang_ho_hiep_khach',
        'Giang hồ hiệp khách',
        'Rivers & lakes',
        P(
          'Tứ Hải Kiếm Ca',
          'Giang hồ không thuộc về triều đình — thuộc về danh tiếng, món nợ, và những thanh kiếm chưa ra khỏi vỏ. Ngươi là kẻ lang bạt: một lần cứu người có thể mở ra mối thù ba đời, một lần im lặng có thể cứu cả thành phố.',
          'Võ hiệp cổ điển: khinh công, ám khí, môn phái, yên ổn bề ngoài. Nhấn mạnh:\n- Danh dự có giá; đôi khi phải chọn giữa "đúng" và "đẹp"\n- Đối thoại kiểu ẩn dụ, châm ngôn ngắn\n- Võ công có phong cách cá nhân (kiếm nhanh, chưởng nặng, ám khí lạ)\n- Quan hệ sư đồ, kết bái, ân oán gia tộc\n- Triều đình chỉ lộ diện khi giang hồ đụng đến biên giới hoặc dân\n- Tránh thần thông quá đà — giữ căng thẳng thể xác',
          'Quán trọ ven sông đèn đỏ lay động.\n\nNgươi vừa đặt chén trà xuống đã nghe tiếng kiếm rung trên gác. Một thiếu niên máu me leo cầu thang, tay ôm hộp gỗ nhỏ: "Cứu… họ sắp tới."\n\nChủ quán khẽ lắc đầu như khuyên ngươi đừng dính vào. Ngoài cửa, mưa như thép.\n\nNgươi đứng dậy. Ngoài hiên, bảy bóng người áo đen đứng thành hàng — không nói, chỉ chờ một tín hiệu.\n\nTrong hộp gỗ, tiếng lạch cạch như xương. Không phải vàng — là thứ khiến người ta giết nhau mà không cần lý do.',
          'MINH KIẾM LÂU: Bảng xếp hạng võ lâm; ai lên hạng nhanh sẽ bị thách đấu.\n\nTHẤT TINH BANG: Bang phái trộm cắp "danh nghĩa" — chỉ lấy của kẻ tham quan.\n\nPHI ƯNG MÔN: Sát thủ nhận lệnh bằng lông chim; hủy lệnh phải trả bằng một ngón tay.\n\nCỔ CHÂN KINH (TÀI LIỆU): Truyền thuyết có thể là bẫy của triều đình.\n\nÂN OÁN THẺ: Một số gia tộc ghi nợ máu bằng thẻ tre — đốt thẻ là khai chiến.',
        ),
      ),
      sg(
        'mon_phai_tranh_ba',
        'Môn phái tranh bá',
        'Sect rivalry',
        P(
          'Thiên Sơn Tứ Tông',
          'Bốn tông môn cùng ngự trên một dãy núi — nước, lửa, kiếm, đan — họ dạy đệ tử rằng chỉ có một con đường đúng. Nhưng khi linh mạch núi bắt đầu khô, "đúng" trở thành từ nguy hiểm nhất.',
          'Nội bộ môn phái + tranh tài. Nhấn mạnh:\n- Quy củ, hình phạt, thi đấu nội môn\n- Sư huynh đệ: ganh đua và gánh nặng kỳ vọng\n- Bí công, cấm địa, hầm ngầm giữa các tông\n- NPC trưởng lão: mỗi người một phe ngầm\n- Người chơi có thể là đệ tử ngoại môn hoặc khách ký danh\n- Kỳ thi liên tông quyết định phân chia tài nguyên linh mạch',
          'Chuông tông vang, sương tan.\n\nNgươi đứng giữa sân đá — hàng trăm đệ tử xếp hình như thể cả núi đang thở. Trưởng môn giọng không cao nhưng chạm xương: "Năm nay, ai mang về "Tâm Thủy" sẽ được vào tầng ba tàng kinh."\n\nSư huynh bên cạnh khẽ nói: "Tâm Thủy ở hố sâu giữa tứ tông. Đi một mình là chết. Đi cùng người khác… có thể chết chậm hơn."\n\nTrên vách núi xa, cờ của tông đối địch phất — họ cũng chuẩn bị xuống hố.\n\nTrong tay ngươi, lệnh bài đệ tử nóng bất thường — như cảnh báo có người đang dùng phép theo dõi.',
          'TÔNG THỦY: Thiên phú trị thương, cấm sát sinh vô cớ — nhưng được phép "phế võ".\n\nTÔNG HOẢ: Công pháp bạo; đệ tử dễ tẩu hỏa nếu tâm không vững.\n\nTÔNG KIẾM: Coi kiếm ý cao hơn chiêu thức; kẻ ăn gian kiếm ý bị trục xuất.\n\nTÔNG ĐAN: Nắm dược liệu; nghi ngờ đầu độc luôn là mặc định.\n\nLINH MẠCH THIÊN SƠN: Đang suy — có tin đồn do một trận pháp cổ bị ai đó cố tình mở một khe.',
        ),
      ),
      sg(
        'am_sat_tinh_anh',
        'Ám sát & tinh anh',
        'Assassins & spies',
        P(
          'Vô Ảnh Hành',
          'Giang hồ có mặt sáng — hiệp khách, bang chủ. Và mặt tối: những kẻ không tên, không dấu vết, chỉ để lại một nốt chấm mực trên bảng phong thưởng. Ngươi được huấn luyện để trở thành câu hỏi, không phải câu trả lời.',
          'Tăng tension, stealth, tâm lý. Nhấn mạnh:\n- Nhiệm vụ có nhiều cách hoàn thành — không chỉ đánh\n- Hậu quả đạo đức: giết sai người mở nhánh mới\n- Đối phương cũng thông minh — bẫy, mồi nhử, phản gián\n- Cảnh: mái ngói, hẻm mưa, mật thất, hầm rượu\n- Tránh siêu năng lực; giữ võ thuật "đủ tin được"\n- Mối quan hệ handler–sát thủ đầy bất tín',
          'Ngươi tỉnh trong phòng không cửa sổ. Một lá thư treo bằng dao găm trên bàn — không tên người gửi, chỉ có danh sách ba dòng và một chữ "Hạn: trăng tròn".\n\nGiọng nói sau tấm bình phong: "Lần này không phải giết. Lần này là mang về đúng thứ họ nghĩ ngươi sẽ mang về — và để họ tin."\n\nNgươi mở danh sách. Dòng đầu là một quan chức. Dòng hai là một đứa trẻ. Dòng ba là tên ngươi — gạch chân hai lần.\n\nTiếng chuông canh vang. Ngươi buộc dây giày. Trong giang hồ, tin giả đắt hơn vàng thật.',
          'HÀNH HỘI VÔ ẢNH: Tổ chức phi hình; liên lạc bằng mật hiệu trên quạt.\n\nBẢNG HUYẾT THƯỞNG: Ai treo thưởng không bao giờ lộ diện — tiền đến từ hố đen.\n\nPHI ƯNG SỨ: Mật điệp của triều đình thuê ngoài; xung đột lợi ích với giang hồ.\n\nẢNH TỬ: Sát thủ bị phản bội; sống sót phải đổi mặt — nghề nghiệp không cho phép hai lần.\n\nLỆNH "KHÔNG TỒN TẠI": Một số mục tiêu chính thức không có trong hồ sơ — giết xong như chưa từng có.',
        ),
      ),
    ],
  },
  {
    id: 'do_thi',
    label: { vi: 'Đô Thị', en: 'Urban' },
    icon: '🌃',
    subGenres: [
      sg(
        'di_nang_do_thi',
        'Dị năng đô thị',
        'Superpower city',
        P(
          'Thành Phố Linh Sóng',
          'Sau sự kiện "Đêm Trắng", một bộ phận dân số thức tỉnh dị năng — không phải siêu anh hùng trong truyện tranh, mà là người bị theo dõi, đăng ký, và thuê mướn. Ngươi sống trong thành phố nơi app điện thoại biết ngươi mạnh đến mức nào trước cả ngươi.',
          'Hiện đại, nhanh, xen hài đen nhẹ. Nhấn mạnh:\n- Pháp lý xã hội với dị năng (giấy phép, cấm khu vực)\n- Công ty tư nhân săn "ứng viên"\n- Hậu quả đời thường: hóa đơn, CCTV, MXH\n- Phe: chính phủ, tập đoàn, hội tự do, giáo phái\n- Chiến đấu trong hẻm, chung cư, ga metro — không phá hủy vô tội vạ trừ khi có lý do\n- Người chơi chọn giữ bí mật hay "nổi tiếng"',
          'Điện thoại rung lúc 2:14 sáng — tin nhắn ẩn danh: "Họ biết ngươi không phải loại F."\n\nNgươi nhìn ra cửa sổ chung cư. Đèn đường nhấp nháy theo nhịp như ai đó đang test sóng. Trong gương, đồng tử ngươi co lại một nhịp — ký hiệu dị năng kích hoạt mà ngươi tưởng đã học cách nén.\n\nCửa gõ ba tiếng. Không phải hàng xóm — họ không bao giờ gõ đúng nhịp.\n\nNgươi thở ra. Tối nay, hoặc là chạy, hoặc là lần đầu ngươi dùng thứ đó một cách cố ý.',
          'CỤC ĐĂNG KÝ LINH SÓNG: Cấp hạng A–F; hạng chưa đăng ký bị coi là "nguy cơ công cộng".\n\nTẬP ĐOÀN HELIOS: Thu thập dữ liệu dị năng; tin đồn thí nghiệm người.\n\nHỘI NGƯỠNG: Nhóm tự do — muốn công khai sức mạnh; bị gán nhãn khủng bố.\n\nKHU 13: Lô chung cư cũ nơi sóng lạ làm hỏng thiết bị — nơi ẩn náu của kẻ không hạng.\n\nHỢP ĐỒNG ĐÊM: Chợ đen thuê dị nhân làm việc "xám" — không bảo hiểm, không luật.',
        ),
      ),
      sg(
        'hao_mon_thuong_chien',
        'Hào môn thương chiến',
        'Elite corporate war',
        P(
          'Kim Đài Thượng Lưu',
          'Ở tầng penthouse, chiến tranh không có máu — có cổ phần, scandal, và những bữa tiệc mà ly champagne đắt hơn cả năm lương người bình thường. Ngươi bước vào vòng xoáy khi một lá thư thừa kế và một bản hợp đồng đổi mạng người được ký cùng một loại mực.',
          'Kịch tính quyền lực, thời trang, bóng tối tài chính. Nhấn mạnh:\n- Đối thoại sắc bén; subtext tình dục/quyền lực\n- Truyền thông và PR là vũ khí\n- Gia tộc, hôn nhân liên minh, phản bội\n- Bạo lực tinh thần, đôi khi bạo lực thật (vệ sĩ, "tai nạn")\n- Người chơi có thể là luật sư, con nuôi, hoặc cờ trong tay cổ đông\n- Giữ căng thẳng: mỗi chiến thắng đều có bằng chứng có thể lật',
          'Thang máy riêng mở ra sảnh kính đen. Ngươi được mời tới "bữa tối gia đình" — mười hai người, mười hai nụ cười không chạm mắt.\n\nÔng chủ tịch gõ muỗng: "Chúng ta có một kẻ thứ ba trong thương vụ sáp nhập. Ta muốn biết là ai trước khi báo chí biết."\n\nNgười phụ nữ bên trái ngươi nhét vào tay một chiếc USB nhỏ. Người đàn ông bên phải nhấc ly: "Uống đi. Ở đây, tỉnh táo là khiếm nhã."\n\nNgoài cửa kính, thành phố như mạch vàng. Trong túi ngươi, điện thoại rung — tin nhắn từ số lạ: "Đừng uống."\n\nNgươi nhìn ly. Nhìn USB. Nhìn gương — phía sau lưng mình, camera nhỏ như hạt gạo.',
          'TẬP ĐOÀN KIM ĐÀI: Đa ngành; nhánh bất động sản dính tin đồn đuổi dân để lấy đất.\n\nQUỸ THIÊN LONG: Quỹ đầu tư bí mật của ba gia tộc — ai rút trước làm sập thị trường.\n\nHỘI ĐỒNG CỐ VẤN "ÁNH SÁNG": PR cao cấp chuyên biến tội ác thành "hiểu lầm".\n\nTHỎA THUẬN MÁU: Truyền thuyết đô thị — ký tên bằng máu thật trong phòng kín tầng hầm.\n\nNGƯỜI THỪA KẾ ẨN: Một di chúc thứ hai chưa công bố đang lưu hành trong giới luật sư đen.',
        ),
      ),
      sg(
        'y_thuat_than_thanh',
        'Y thuật siêu phàm',
        'Miracle medicine',
        P(
          'Bệnh Viện Thứ Chín',
          'Có những ca bệnh không nằm trong sổ ICD — chúng đáp ứng với cảm xúc, ký ức, hoặc lời nguyền gia tộc. Ngươi là bác sĩ (hoặc kẻ mang "kim châm linh") đi giữa khoa học và huyền học, nơi mỗi ca mổ có thể mở ra cánh cửa không nên mở.',
          'Y kịch + huyền bí y học. Nhấn mạnh:\n- Triệu chứng kỳ lạ có logic nội tại\n- Đạo đức: cứu một người vs cứu nhiều người\n- Bệnh viện như mê cung: khoa ẩn, hầm, sổ bệnh án khóa\n- NPC bệnh nhân, y tá, giám đốc, đại diện dược phẩm\n- Căng thẳng cao trong ca cấp cứu / nghi thức\n- Tránh "chữa bằng niềm tin" vô căn — luôn có giá',
          'Còi cấp cứu xé đêm.\n\nNgươi chạy xuống phòng mổ dự phòng — không có trên bản đồ công khai. Bệnh nhân: thanh niên, tim ngừng đập nhưng não vẫn "nói chuyện" qua monitor bằng sóng lạ.\n\nTrưởng khoa thì thầm: "Ca này không được ghi. Nếu cậu thấy thứ gì… quên, hoặc cậu sẽ ở lại đây lâu hơn bệnh nhân."\n\nĐèn phòng mổ chớp. Trên da bệnh nhân, vân như bản đồ hiện ra rồi tan.\n\nNgươi cầm dao mổ. Tay run không phải vì sợ máu — vì ngươi nghe thấy tiếng gọi tên mình từ trong cơ thể người lạ.',
          'KHOA 0: Xử lý "bệnh siêu hình"; chỉ nhân viên có huyết thống đặc biệt được vào.\n\nDƯỢC PHẨM NGUYỆT LAN: Thuốc an thần làm giảm "tiếng vọng" — nghiện cao, thị trường chợ đen bùng nổ.\n\nHỘI ĐỒNG ĐẠO ĐỨC GIẢ: Che giấu thí nghiệm; đổi lấy ngân sách.\n\nBỆNH "KHÓA KÝ ỨC": Bệnh nhân quên tên người thân theo từng đợt — có liên quan đến một sự kiện hỏa hoạn 12 năm trước.\n\nKIM CHÂM LINH: Kỹ thuật cổ truyền hiếm — châm đúng huyệt có thể "kéo" bệnh ra thành vật thể.',
        ),
      ),
    ],
  },
  {
    id: 'kinh_di',
    label: { vi: 'Kinh Dị', en: 'Horror' },
    icon: '👻',
    subGenres: [
      sg(
        'quy_di_dan_gian',
        'Quỷ dị dân gian',
        'Folk horror',
        P(
          'Làng Không Tên',
          'Người già nói: đừng hỏi tên làng sau nửa đêm. Ngươi về quê chôn cất người thân — và phát hiện sổ tộc không ghi tên ai qua đời sau năm 1997, chỉ có dấu mộc hình móng vuốt.',
          'Kinh dị chậm, âm thanh, tâm lý. Nhấn mạnh:\n- Quy tắc dân gian (cúng, kiêng, giờ giấc)\n- Không giải thích quá sớm — sợ từ việc "sai một chi tiết nhỏ"\n- NPC thân thiện đáng ngờ\n- Cảnh: nếp nhà, nghĩa địa, đình làng, rừng tre\n- Bạo lực hạn chế nhưng hậu quả tâm lý nặng\n- Người chơi có thể phá luật và trả giá',
          'Xe khách dừng bên đường đất đỏ. Tài xế không nhìn ngươi khi nói: "Xuống đây là gần nhất rồi đấy."\n\nNgươi kéo vali qua cầu tre kêu cót két. Sương dày như vải. Một bà cụ ngồi bệt ven đường đếm hạt gạo — đếm đi đếm lại, không bao giờ đủ một nắm.\n\n"Cháu về nhà ai?" bà hỏi. Giọng bà không phát ra từ miệng — mà từ sau gáy ngươi.\n\nNgươi quay lại. Không có ai.\n\nPhía trước, đèn lồng treo trước cổng làng nhấp nháy theo nhịp tim ngươi.',
          'QUY TẮC LÀNG: Không gọi tên người chết sau 23 giờ; không nhận đồ lạ từ khách.\n\nGIẾNG CŨ: Nước trong vắt nhưng phản chiếu chậm vài giây — ai uống sẽ thấy mình đứng sau lưng mình.\n\nSỔ TỘC GIẢ: Bản sao lưu trong nhà thờ họ; bản thật chôn dưới gốc đa.\n\nLỄ "NUÔI LINH": Truyền thuyết nuôi thứ không phải người để làng được mùa — lễ đến hạn.\n\nKHÁCH LẠ: Ngươi — người mang huyết nhưng không mang "phước làng".',
        ),
      ),
      sg(
        'benh_vien_kinh_di',
        'Bệnh viện 0 giờ',
        'Hospital horror',
        P(
          'Khoa Ẩn Tầng Hầm',
          'Bệnh viện lớn nhất thành phố có tầng B3 không có trên thang máy. Y tá mới vào làm được dặn: nếu thang dừng ở B3, đừng bước ra — trừ khi có tiếng gọi tên mình từ trong… đúng họ tên đầy đủ.',
          'Không gian hành lang, đèn huỳnh quang, im lặng. Nhấn mạnh:\n- Âm thanh: xe đẩy, máy bơm, tiếng bước không khớp\n- Quy tắc nội bộ như ritual\n- Bệnh nhân "không tồn tại" trên hệ thống\n- NPC: đêm trực là nhân vật then chốt\n- Tiết tấu: nghỉ thở — shock nhỏ — nghỉ dài\n- Kết nối y học + tâm linh mơ hồ',
          'Ca trực đêm của ngươi bắt đầu lúc 23:40.\n\nHệ thống bệnh án đơ: một mã bệnh nhân nhấp nháy màu đỏ — không có tên, chỉ có ảnh chụp hành lang trống. Ghi chú: "Đừng nhìn gương phòng 214 quá 3 giây."\n\nNgươi đi kiểm tra. Phòng 214 trống giường, nhưng gương mờ như có người thở phía sau.\n\nThang máy kêu ding. Bảng hiển thị: B3.\n\nNgươi chưa bấm B3. Cửa mở. Hành lang phía trước ẩm và lạnh như tủ lạnh — nhưng ngửi mùi thuốc sát trùng quen thuộc.\n\nMột giọng gọi tên ngươi — đúng họ, đúng tên, đúng cả tên đệm mà ít ai biết.',
          'PHÒNG 214: Gương lắp năm 1998 — cùng năm vụ hỏa hoạn không có thi thể.\n\nMÃ BN-NULL: Bệnh nhân khỏe mạnh trên giấy nhưng liên tục "tái nhập viện" trong camera.\n\nKHO THUỐC MẤT: Một lô thuốc an thần không nhãn — ai tiêm sẽ ngủ và mơ cùng một căn phòng.\n\nY TÁ ĐÊM THỨ 7: Vị trí luôn trống trên sơ đồ nhân sự nhưng có chữ ký trong biên bản.\n\nB3: Không phải tầng — là "khe" giữa hai đêm.',
        ),
      ),
      sg(
        'lang_nguyen',
        'Làng nguyền',
        'Cursed village',
        P(
          'Hồi Ức Đọng Nước',
          'Làng bên hồ có tục: mỗi năm hạ một chiếc thuyền giấy chở tên người chết để "hồ nhớ". Năm nay, thuyền của ngươi tự chạy ngược dòng — dù gió không đổi chiều.',
          'Kinh dị sinh thái + tâm lý tập thể. Nhấn mạnh:\n- Phong tục như ma thuật mềm\n- Nước, phản chiếu, sương\n- Cộng đồng im lặng đồng loạt\n- Người chơi là "người ngoài" mang ký ức khác\n- Twist từ lịch sử làng\n- Giữ hy vọng mong manh — không u ám vô nghĩa',
          'Ngươi thuê phòng nhà dân cuối làng. Cửa sổ nhìn ra mặt hồ phẳng như gương đen.\n\nChủ nhà không cho ngươi mở rèm sau 21 giờ. "Hồ nhìn lại," bà nói, rồi cười như xin lỗi — nhưng mắt bà không cười.\n\nĐêm đầu, ngươi nghe tiếng mái chèo. Không có thuyền. Tiếng nước vỗ như ai bước lên bờ từ phía hồ.\n\nSáng hôm sau, dân làng kéo nhau ra bến, mặt tái. Trên mặt nước, một vòng tròn lá sen xoay — giữa vòng tròn là tên ngươi, viết bằng vỏ cá.\n\nNgươi chưa kể ai tên đầy đủ của mình.',
          'TỤC HỒ NHỚ: Dân làng tin hồ giữ ký ức thay họ — quên là mất, mất là… có chỗ trống cho thứ khác vào.\n\nLÁ SEN TỰ XOAY: Dấu hiệu "hồ chọn" người gánh nợ năm nay.\n\nNHÀ KHÔNG RÈM: Gia đình nào bị "nhìn thấy" trong đêm sẽ biến mất khỏi ảnh tập thể.\n\nTHUYỀN GIẤY NGƯỢC DÒNG: Ai thấy sẽ mơ về tai nạn chưa từng xảy ra — nhưng vẫn đau.\n\nBÍ MẬT 1986: Một lần cúng sai khiến cả làng quên mất một ngày — ngày đó vẫn còn, chỉ không ai nhớ.',
        ),
      ),
    ],
  },
]
