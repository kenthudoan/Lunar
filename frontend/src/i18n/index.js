// ============================================
// LUNAR i18n — Internationalization
// ============================================

import { create } from 'zustand'

// ---------------------------------------------------------------------------
// Sub-stage presets (shared by PowerSystemEditor and RankListView)
// ---------------------------------------------------------------------------

export const VI_SUBS = [
  { key: 'so_ky',    name: 'Sơ Kỳ' },
  { key: 'trung_ky', name: 'Trung Kỳ' },
  { key: 'hau_ky',   name: 'Hậu Kỳ' },
]
export const EN_SUBS = [
  { key: 'early', name: 'Early' },
  { key: 'mid',   name: 'Mid' },
  { key: 'late',  name: 'Late' },
]
export const PT_SUBS = [
  { key: 'iniciante',     name: 'Iniciante' },
  { key: 'intermediario', name: 'Intermediário' },
  { key: 'avancado',      name: 'Avançado' },
]

export function getSubStages(locale) {
  if (locale === 'vi') return VI_SUBS
  if (locale === 'pt-br') return PT_SUBS
  return EN_SUBS
}

// ---------------------------------------------------------------------------
// Entity display name maps — resolve internal keys to human-readable names
// Used across ScenarioBuilder, WorldMap, LoreExpander, NPC Inspector
// ---------------------------------------------------------------------------

export const SUB_TIER_MAP = {
  so_ky: 'Sơ Kỳ', trung_ky: 'Trung Kỳ', hau_ky: 'Hậu Kỳ',
  early: 'Sơ Kỳ', mid: 'Trung Kỳ', late: 'Hậu Kỳ',
  tier_1: 'Tier 1', tier_2: 'Tier 2', tier_3: 'Tier 3',
}

export const LOCATION_TYPE_MAP = {
  city: 'Thành Thị', town: 'Thị Trấn', village: 'Làng', forest: 'Rừng',
  mountain: 'Núi', river: 'Sông', cave: 'Hang Động', lake: 'Hồ',
  temple: 'Đền', castle: 'Thành Trì', tavern: 'Quán Rượu',
  ruins: 'Tàn Tích', battlefield: 'Chiến Trường',
  // LLM / lore often emits Vietnamese slugs instead of English enum keys
  nui: 'Núi', núi: 'Núi', non_nui: 'Núi', son_lam: 'Sơn Lâm',
  thanh_thi: 'Thành Thị', thi_tran: 'Thị Trấn', lang_que: 'Làng',
  rung: 'Rừng', song: 'Sông', hang_dong: 'Hang Động',
  den_chua: 'Đền', quan_tuu: 'Quán Rượu', tan_tich: 'Tàn Tích',
}

export const FACTION_TYPE_MAP = {
  sect: 'Môn Phái', guild: 'Hội', order: 'Giáo Đoàn',
  kingdom: 'Vương Quốc', empire: 'Đế Chế', clan: 'Gia Tộc',
  faction: 'Phe Phái', alliance: 'Liên Minh', syndicate: 'Tổ Chức',
  mon_phai: 'Môn Phái', môn_phai: 'Môn Phái',
  hoi: 'Hội', giao_doan: 'Giáo Đoàn', vuong_quoc: 'Vương Quốc',
  de_che: 'Đế Chế', gia_toc: 'Gia Tộc', phe_phai: 'Phe Phái',
  lien_minh: 'Liên Minh', to_chuc: 'Tổ Chức',
}

export const ITEM_TYPE_MAP = {
  weapon: 'Vũ Khí', armor: 'Giáp', potion: 'Dược Phẩm',
  scroll: 'Thần Chú', artifact: 'Thần Khí', ring: 'Nhẫn',
  amulet: 'Bùa', material: 'Tài Liệu', material2: 'Nguyên Liệu',
  book: 'Sách', key: 'Chìa Khóa', treasure: 'Bảo Vật',
  vu_khi: 'Vũ Khí', vũ_khí: 'Vũ Khí', giap: 'Giáp',
  duoc_pham: 'Dược Phẩm', than_chu: 'Thần Chú', than_khi: 'Thần Khí',
  nhan: 'Nhẫn', bua: 'Bùa', nguyen_lieu: 'Nguyên Liệu',
  sach: 'Sách', chia_khoa: 'Chìa Khóa', bao_vat: 'Bảo Vật',
}

export const ITEM_RARITY_MAP = {
  common: 'Phổ Thông', uncommon: 'Hiếm', rare: 'Cực Hiếm',
  epic: 'Cực Phẩm', legendary: 'Truyền Thuyết', mythic: 'Thần Thoại',
}

export const NPC_ROLE_MAP = {
  leader: 'Lãnh Đạo', elder: 'Trưởng Lão', disciple: 'Đệ Tử',
  merchant: 'Thương Nhân', guard: 'Vệ Binh', spy: 'Gián Điệp',
  scholar: 'Học Giả', healer: 'Trị Liện Sư', assassin: 'Sát Thủ',
  noble: 'Quý Tộc', servant: 'Tì Nhân', traveler: 'Lữ Khách',
  rival: 'Địch Thủ', master: 'Sư Phụ', apprentice: 'Đồ Đệ',
}

export const ENTITY_ALIGNMENT_MAP = {
  lawful_good: 'Thiện Chính', neutral_good: 'Thiện Trung Lập',
  chaotic_good: 'Thiện Hỗn Loạn', lawful_neutral: 'Trung Lập Chính',
  true_neutral: 'Trung Lập', chaotic_neutral: 'Hỗn Loạn Trung Lập',
  lawful_evil: 'Ác Chính', neutral_evil: 'Ác Trung Lập',
  chaotic_evil: 'Ác Hỗn Loạn',
}

/** Cultivation / custom realm slugs (ASCII) → readable Vietnamese */
export const REALM_SLUG_MAP_VI = {
  luyen_khi: 'Luyện Khí', luyen_khi_ky: 'Luyện Khí Kỳ',
  hap_khi: 'Hấp Khí', hap_khi_ky: 'Hấp Khí Kỳ',
  truc_co: 'Trúc Cơ', truc_co_ky: 'Trúc Cơ Kỳ',
  kim_dan: 'Kim Đan', kim_dan_ky: 'Kim Đan Kỳ',
  nguyen_than: 'Nguyên Thần', nguyen_than_ky: 'Nguyên Thần Kỳ',
  thai_at: 'Thái Ất', thai_at_ky: 'Thái Ất Kỳ',
  dai_thua: 'Đại Thừa', dai_thua_ky: 'Đại Thừa Kỳ',
  chan_tien: 'Chân Tiên', chan_tien_ky: 'Chân Tiên Kỳ',
  dai_la: 'Đại La', dai_la_ky: 'Đại La Kỳ',
  tien_nhan: 'Tiên Nhân', tien_nhan_ky: 'Tiên Nhân Kỳ',
  tu_chan: 'Tu Chân', tu_tien: 'Tu Tiên', ma_dao: 'Ma Đạo',
  vo_than: 'Võ Thần', vo_su: 'Võ Sư', vo_gia: 'Võ Giả',
}

/** Same slugs → English (for locale === 'en') */
export const REALM_SLUG_MAP_EN = {
  luyen_khi: 'Qi Refining', luyen_khi_ky: 'Qi Refining Stage',
  hap_khi: 'Qi Gathering', hap_khi_ky: 'Qi Gathering Stage',
  truc_co: 'Foundation', truc_co_ky: 'Foundation Stage',
  kim_dan: 'Golden Core', kim_dan_ky: 'Golden Core Stage',
  nguyen_than: 'Nascent Soul', nguyen_than_ky: 'Nascent Soul Stage',
  thai_at: 'Soul Transformation', thai_at_ky: 'Soul Transformation Stage',
  dai_thua: 'Mahayana', dai_thua_ky: 'Mahayana Stage',
  chan_tien: 'True Immortal', chan_tien_ky: 'True Immortal Stage',
  dai_la: 'Great Luo', dai_la_ky: 'Great Luo Stage',
  tien_nhan: 'Immortal', tien_nhan_ky: 'Immortal Stage',
  tu_chan: 'Cultivation', tu_tien: 'Immortal Cultivation', ma_dao: 'Demonic Path',
  vo_than: 'Martial God', vo_su: 'Martial Master', vo_gia: 'Martial Artist',
}

function normalizeSlug(value) {
  return String(value).trim().toLowerCase().replace(/\s+/g, '_')
}

// ---------------------------------------------------------------------------
// Entity attribute value resolver
// Looks up internal keys in the above maps and returns human-readable names.
// Falls back to the original value if no mapping exists.
// Optional locale: 'vi' | 'en' — when omitted, uses lunar_language from localStorage or 'vi'.
// ---------------------------------------------------------------------------

export function resolveEntityValue(key, value, locale) {
  if (value === null || value === undefined) return value
  const loc =
    locale ||
    (typeof localStorage !== 'undefined' && localStorage.getItem('lunar_language')) ||
    'vi'
  const isEn = loc === 'en'

  if (typeof value === 'number' && key === 'sub_tier') {
    const idx = Number(value)
    if (idx >= 1 && idx <= 3) {
      const labels = isEn ? ['', 'Early', 'Mid', 'Late'] : ['', 'Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ']
      return labels[idx] || String(value)
    }
  }

  if (typeof value !== 'string') return value
  const raw = String(value).trim()
  const norm = normalizeSlug(raw)

  if (key === 'sub_tier' || key === 'tier') {
    const sub = SUB_TIER_MAP[raw] || SUB_TIER_MAP[norm]
    if (sub) return sub
    if (key === 'sub_tier' && /^[123]$/.test(raw)) {
      return isEn ? ['Early', 'Mid', 'Late'][Number(raw) - 1] : ['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ'][Number(raw) - 1]
    }
    return value
  }

  if (key === 'location_type') {
    return LOCATION_TYPE_MAP[raw] || LOCATION_TYPE_MAP[norm] || value
  }
  if (key === 'faction_type') {
    return FACTION_TYPE_MAP[raw] || FACTION_TYPE_MAP[norm] || value
  }
  if (key === 'item_type') {
    return ITEM_TYPE_MAP[raw] || ITEM_TYPE_MAP[norm] || value
  }
  if (key === 'rarity') {
    return ITEM_RARITY_MAP[raw] || ITEM_RARITY_MAP[norm] || value
  }
  if (key === 'role') {
    return NPC_ROLE_MAP[raw] || NPC_ROLE_MAP[norm] || value
  }
  if (key === 'alignment') {
    return ENTITY_ALIGNMENT_MAP[raw] || ENTITY_ALIGNMENT_MAP[norm] || value
  }

  if (key === 'realm') {
    const rm = isEn ? REALM_SLUG_MAP_EN : REALM_SLUG_MAP_VI
    return rm[raw] || rm[norm] || value
  }

  return value
}

// ---------------------------------------------------------------------------
// Translation store
// ---------------------------------------------------------------------------

const translations = {
  // ---- Vietnamese (default) ----
  vi: {
    // Navigation
    'nav.home': 'Trang Chủ',
    'nav.create': 'Tạo Thế Giới',
    'nav.play': 'Chơi',
    'nav.settings': 'Cài Đặt',
    'nav.library': 'Thư Viện',
    'nav.profile': 'Hồ Sơ',
    'nav.admin': 'Quản Trị',
    'nav.signout': 'Đăng Xuất',

    // Home
    'home.title': 'Project Lunar',
    'home.subtitle': 'Nền tảng phiêu lưu kể chuyện được điều khiển bởi AI. Tạo thế giới. Sống cuộc phiêu lưu.',
    'home.cta': 'Xây Dựng Thế Giới Mới',
    'home.empty': 'Chưa có thế giới nào được tạo.',
    'home.emptyHint': 'Bắt đầu bằng cách xây dựng một thế giới mới.',
    'home.scenarios': 'Thế Giới Của Bạn',
    'home.units': 'đơn vị',

    // Scenario
    'scenario.title': 'Tiêu đề',
    'scenario.description': 'Mô tả',
    'scenario.tone': 'Giọng điệu & Chỉ dẫn',
    'scenario.opening': 'Câu Mở Đầu',
    'scenario.lore': 'Lore & Lịch Sử',
    'scenario.loreHint': 'Hệ thống sẽ tự động trích xuất thực thể từ nội dung này.',
    'scenario.language': 'Ngôn ngữ',
    'scenario.submit': 'Khởi Tạo Thế Giới',
    'scenario.import': 'Nhập Từ File',
    'scenario.imported': 'Đã tải dữ liệu',
    'scenario.submitImport': 'Thực Thi Nhập',
    'scenario.aiExpand': 'AI mở rộng',
    'scenario.analyzing': 'Đang phân tích...',
    'scenario.adventureName': 'Tên Cuộc Phiêu Lưu',
    'scenario.adventureNameHint': 'Đặt tên cho phiêu lưu này. Bạn có thể có nhiều phiêu lưu trong cùng thế giới.',

    // Entity types
    'entity.rank': 'Cấp Bậc',
    'entity.faction': 'Thế Lực',
    'entity.secret': 'Bí Ẩn',
    'entity.location': 'Địa Điểm',
    'entity.npc': 'Nhân Vật',
    'entity.item': 'Vật Phẩm',
    'entity.name': 'Tên',
    'entity.description': 'Mô Tả',
    'entity.parent': 'Cấp Trên',
    'entity.leader': 'Người Lãnh Đạo',
    'entity.alignment': 'Xu Hướng',
    'entity.influence': 'Ảnh Hưởng',
    'entity.revealedTo': 'Biết Bí Mật',
    'entity.role': 'Vai Trò',
    'entity.powerLevel': 'Cấp Sức Mạnh',
    'entity.realm': 'Cảnh Giới',
    'entity.subTiers': 'Tiểu Cấp',
    'entity.subTier': 'Tiểu Cấp',
    'entity.tier': 'Trình Độ',
    'entity.rarity': 'Độ Hiếm',
    'entity.owner': 'Chủ Sở Hữu',

    // Game Canvas
    'canvas.unknownWorld': 'Tọa độ không xác định',
    'canvas.offline': 'NGOẠI TUYẾN',
    'canvas.disconnect': 'Ngắt Kết Nối',
    'canvas.combat': 'Chiến Đấu',
    'canvas.narrator': 'Người Kể Chuyện',
    'canvas.missionLog': 'Nhật Ký',
    'canvas.rewind': 'Hoàn Tác Hành Động',

    // Action Input
    'action.do': 'Hành Động',
    'action.say': 'Nói',
    'action.continue': 'Tiếp Tục',
    'action.meta': 'Hệ Thống',
    'action.doHint': 'Thực hiện một hành động vật lý',
    'action.sayHint': 'Nói hoặc giao tiếp',
    'action.continueHint': 'Để câu chuyện tự diễn ra',
    'action.metaHint': 'Hỏi người kể chuyện về trạng thái thế giới',
    'action.placeholder.do': 'Mô tả hành động của bạn...',
    'action.placeholder.say': 'Nhập lời thoại...',
    'action.placeholder.meta': 'Nhập câu hỏi hệ thống...',
    'action.placeholder.waiting': 'Đang nhận tín hiệu...',
    'action.placeholder.awaitNarrator': 'Đang chờ người kể tường thuật xong…',
    'action.placeholder.recoveryFirst': 'Nhấn «Tiếp tục» trên banner vàng để hoàn tất lượt đang dở.',
    'action.placeholder.continue': 'Nhấn Enter để tiếp tục câu chuyện...',
    'action.send': 'Gửi',
    'action.continueKey': 'Ctrl + Enter để tiếp tục',

    // Panels
    'panel.tools': 'Công Cụ',
    'panel.inventory': 'Hành Trang',
    'panel.worldMap': 'Bản Đồ Thế Giới',
    'panel.plotGenerator': 'Tạo Cốt Truyện',
    'panel.timeskip': 'Tua Thời Gian',
    'panel.npcMinds': 'Tâm Trí NPC',
    'panel.memoryCrystals': 'Tinh Thể Ký Ức',
    'panel.settings': 'Cài Đặt',
    'panel.journal': 'Nhật Ký',

    // Inventory
    'inventory.empty': 'Chưa có vật phẩm nào.',
    'inventory.carried': 'Đang Mang',
    'inventory.usedLost': 'Đã Dùng / Đã Mất',
    'inventory.use': 'Dùng',
    'inventory.drop': 'Vứt',

    // Journal
    'journal.all': 'Tất Cả',
    'journal.discovery': 'Khám Phá',
    'journal.combat': 'Chiến Đấu',
    'journal.decision': 'Quyết Định',
    'journal.relationship': 'Quan Hệ',
    'journal.worldEvent': 'Sự Kiện Thế Giới',
    'journal.empty': 'Không có mục nào được ghi nhận.',
    'journal.refresh': 'Làm mới',
    'journal.today': 'Hôm Nay',
    'journal.yesterday': 'Hôm Qua',
    'journal.thisWeek': 'Tuần Này',
    'journal.lastWeek': 'Tuần Trước',
    'journal.older': 'Trước Đó',
    'journal.showMore': 'Hiển thị thêm {n} mục',
    'journal.collapse': 'Thu gọn',

    // Progression & Tribulation
    'tribulation.arrived': 'Thiên Kiếp Giáng Lâm',
    'tribulation.success': 'Đột phá thành công!',
    'tribulation.failed': 'Thiên kiếp thất bại',
    'tribulation.roll': 'Roll',
    'progression.pill': 'Ăn đan dược',
    'progression.insight': 'Ngộ đạo',
    'progression.breakthrough': 'Đột phá',
    'progression.advance': 'Tu lực tăng',

    // Memory
    'memory.empty': 'Chưa có tinh thể ký ức nào được hình thành.',
    'memory.crystallize': 'Kết Tinh Ký Ức Gần Đây',
    'memory.crystallizing': 'Đang kết tinh...',
    'memory.short': 'Tinh Thể Ngắn',
    'memory.long': 'Tinh Thể Vĩnh Cửu',
    'memory.events': 'sự kiện đã nén',

    // NPC
    'npc.feeling': 'Cảm Xúc',
    'npc.goal': 'Mục Tiêu Hiện Tại',
    'npc.opinion': 'Ý Kiến Về Người Chơi',
    'npc.secret': 'Kế Hoạch Bí Mật',
    'npc.empty': 'Chưa phát hiện tâm trí NPC nào.',
    'npc.thoughts': 'suy nghĩ',

    // Timeskip
    'timeskip.description': 'Di chuyển thời gian. Thế giới sẽ phản ứng — NPC di chuyển, phe phái thay đổi, tin đồn lan truyền.',
    'timeskip.execute': 'Tua {label}',
    'timeskip.worldEvolving': 'Thế giới đang thay đổi...',
    'timeskip.continue': 'Tiếp Tục',
    'timeskip.passed': 'đã trôi qua',

    // Settings
    'settings.title': 'Cài Đặt',
    'settings.provider': 'Nhà Cung Cấp LLM',
    'settings.model': 'Mô Hình',
    'settings.temperature': 'Nhiệt Độ',
    'settings.temperatureDesc': 'Độ ngẫu nhiên của văn bản đầu ra',
    'settings.maxTokens': 'Token Tối Đa',
    'settings.maxTokensDesc': 'Độ dài tối đa của phản hồi',
    'settings.apply': 'Áp Dụng',
    'settings.saved': 'Đã lưu!',
    'settings.precise': 'Chính xác',
    'settings.balanced': 'Cân bằng',
    'settings.creative': 'Sáng tạo',
    'settings.short': 'Ngắn',
    'settings.standard': 'Tiêu chuẩn',
    'settings.extended': 'Mở rộng',
    'settings.llm': 'Cài Đặt LLM',
    'settings.llmHint': 'Thay đổi cài đặt LLM trong phiên chơi bằng nút Cài Đặt trên màn hình Play.',
    'settings.about': 'Về Project Lunar',
    'settings.aboutText': 'Một nền tảng phiêu lưu kể chuyện được điều khiển bởi AI. Tạo thế giới. Sống cuộc phiêu lưu.',

    // Plot Generator
    'plot.title': 'Tạo Cốt Truyện',
    'plot.npc': 'NPC',
    'plot.event': 'Sự Kiện',
    'plot.arc': 'Cung Truyện',
    'plot.npcDesc': 'Tạo một NPC độc đáo với tính cách, mục tiêu và bí mật dựa trên bối cảnh thế giới của bạn.',
    'plot.eventDesc': 'Tạo một cuộc gặp gỡ ngẫu nhiên hoặc sự kiện với các lựa chọn rẽ nhánh cho kịch bản hiện tại.',
    'plot.arcDesc': 'Tạo một móc câu cốt truyện hấp dẫn cho nhiệm vụ hoặc nhánh câu chuyện mới.',
    'plot.generate': 'Tạo {type}',
    'plot.generating': 'Đang tạo...',
    'plot.injectIntoStory': 'Tiêm vào truyện',
    'plot.injecting': 'Đang tiêm...',
    'plot.injectedOk': 'Đã tiêm!',
    'plot.injectFailed': 'Tiêm thất bại.',
    'plot.powerLevel': 'Cấp độ sức mạnh',
    'plot.personality': 'Tính cách',
    'plot.secret': 'Bí mật',
    'plot.choices': 'Lựa chọn',

    // World Map
    'map.title': 'Bản Đồ Thế Giới',
    'map.nodes': 'nút · {links} liên kết',
    'map.empty': 'Chưa có dữ liệu thế giới. Chơi để tạo bản đồ.',
    'map.loading': 'Đang lập bản đồ...',
    'map.search': 'Tìm kiếm thế giới...',
    'map.searchClear': 'Xóa kết quả',

    // Generic
    'generic.close': 'Đóng',
    'generic.cancel': 'Hủy',
    'generic.confirm': 'Xác nhận',
    'generic.delete': 'Xóa',
    'generic.edit': 'Sửa',
    'generic.loading': 'Đang tải...',
    'generic.error': 'Đã xảy ra lỗi.',
    'generic.retry': 'Thử lại',
    'generic.new': 'Mới',
    'generic.play': 'Chơi',
    'generic.export': 'Xuất',
    'generic.newAdventure': 'Cuộc phiêu lưu mới',

    // Errors
    'error.backendOffline': 'Tín hiệu mất. Không thể kết nối với hệ thống backend.',
    'error.exportFailed': 'Xuất thất bại.',
    'error.createFailed': 'Khởi tạo thất bại.',
    'error.rewindFailed': 'Hoàn tác thất bại.',
    'error.deleteConfirm': 'Xóa thế giới này và TẤT CẢ cuộc phiêu lưu của nó? Điều này không thể hoàn tác.',
    'error.deleteAdventures': 'Xóa {count} cuộc phiêu lưu của thế giới này? Toàn bộ tiến trình sẽ mất.',
    'error.newAdventure': 'Bắt đầu cuộc phiêu lưu mới? Tiến trình hiện tại sẽ được giữ riêng.',
    'error.rewindConfirm': 'Hoàn tác hành động cuối? Điều này không thể hoàn tác.',
    'error.neo4jDown': 'Neo4j không chạy. Bản đồ thế giới sẽ không khả dụng trong phiên này.\n\nĐể bật, khởi động Neo4j qua Docker:\ndocker-compose up -d neo4j',

    // Play page
    'play.chapter.opening': 'Mở Đầu',
    'play.chapter.barLabel': 'Lượt · {count}',
    'play.chapter.prev': 'Chương trước',
    'play.chapter.next': 'Chương sau',
    'play.chapter.jump': 'Chọn chương',
    'play.chapter.current': 'đang diễn ra',
    'play.chapter.live': 'Live',
    'play.chapter.viewing': 'VIEWING CH.{n}',
    'play.chapter.viewingOldHint': 'Bạn đang xem chương cũ — câu chuyện đang tiếp diễn ở chương hiện tại',
    'play.chapter.returnToCurrent': 'Quay về chương hiện tại',
    'play.opening.badge': 'Mở Đầu · {title}',
    'play.campaignMissing': 'Không tìm thấy chiến dịch',
    'play.campaignMissingHint': 'URL không chứa ID chiến dịch hợp lệ.',
    'play.campaignFetchFailed': 'Không thể kết nối với máy chủ. Vui lòng thử lại.',
    'generic.backHome': 'Quay về trang chủ',
    'generic.or': 'hoặc',

    // Login
    'login.title': 'Chào trở lại',
    'login.subtitle': 'Đăng nhập để tiếp tục cuộc phiêu lưu của bạn',
    'login.email': 'Email',
    'login.password': 'Mật khẩu',
    'login.submit': 'Đăng nhập',
    'login.submitting': 'Đang đăng nhập...',
    'login.noAccount': 'Chưa có tài khoản?',
    'login.registerNow': 'Đăng ký ngay',
    'error.loginFailed': 'Đăng nhập thất bại. Vui lòng thử lại.',

    // Register
    'register.title': 'Tạo tài khoản',
    'register.subtitle': 'Bắt đầu cuộc phiêu lưu của riêng bạn',
    'register.email': 'Email',
    'register.username': 'Tên người chơi',
    'register.usernamePlaceholder': 'Tên hiển thị của bạn',
    'register.password': 'Mật khẩu',
    'register.passwordPlaceholder': 'Ít nhất 6 ký tự',
    'register.confirmPassword': 'Xác nhận mật khẩu',
    'register.confirmPasswordPlaceholder': 'Nhập lại mật khẩu',
    'register.submit': 'Tạo tài khoản',
    'register.submitting': 'Đang đăng ký...',
    'register.hasAccount': 'Đã có tài khoản?',
    'register.loginNow': 'Đăng nhập',
    'error.registerFailed': 'Đăng ký thất bại. Vui lòng thử lại.',

    // Profile
    'profile.backgroundColor': 'Màu nền',
    'profile.emoji': 'Biểu tượng',
    'profile.confirmDelete': 'Xác nhận xóa',
    'profile.errorUsernameEmpty': 'Username không được trống.',
    'profile.profileSaved': 'Cập nhật thông tin thành công.',
    'profile.errorCurrentPasswordRequired': 'Nhập mật khẩu hiện tại.',
    'profile.deleteAccount': 'Xóa tài khoản',
    'profile.deleteAccountMessage': 'Xóa vĩnh viễn. Hành động này không thể hoàn tác.',
    'profile.joined': 'Tham gia {date}',
    'profile.stats': 'Thống Kê Cá Nhân',
    'profile.worlds': 'Thế Giới',
    'profile.adventures': 'Phiêu Lưu',
    'profile.actions': 'Hành Động',
    'profile.editProfile': 'Chỉnh Sửa Hồ Sơ',
    'profile.username': 'Username',
    'profile.usernamePlaceholder': 'Nhập username...',
    'profile.bio': 'Bio',
    'profile.bioPlaceholder': 'Giới thiệu về bạn...',
    'profile.saveProfile': 'Lưu thông tin',
    'profile.saving': 'Đang lưu...',
    'profile.saved': 'Đã lưu ✓',
    'profile.changePassword': 'Đổi Mật Khẩu',
    'profile.currentPassword': 'Mật khẩu hiện tại',
    'profile.newPassword': 'Mật khẩu mới',
    'profile.newPasswordPlaceholder': 'Tối thiểu 6 ký tự',
    'profile.confirmNewPassword': 'Xác nhận mật khẩu mới',
    'profile.confirmNewPasswordPlaceholder': 'Nhập lại mật khẩu mới',
    'profile.passwordChanged': 'Đổi mật khẩu thành công!',
    'profile.changingPassword': 'Đang đổi...',
    'profile.dangerZone': 'Vùng Nguy Hiểm',
    'profile.deleteAccountLabel': 'Xóa tài khoản',
    'profile.deleteAccountDesc': 'Vĩnh viễn xóa tài khoản và toàn bộ dữ liệu của bạn. Hành động này không thể hoàn tác.',
    'profile.newPasswordMin': 'Mật khẩu mới tối thiểu 6 ký tự.',
    'profile.passwordMismatch': 'Mật khẩu mới không khớp.',
    'profile.permanentDelete': 'Xóa vĩnh viễn.',

    // Admin
    'admin.loadFailed': 'Không tải được thông tin.',
    'admin.usernameEmpty': 'Username không được trống.',
    'admin.saved': 'Đã lưu thay đổi.',
    'admin.deleting': 'Đang xóa...',
    'admin.confirmDelete': 'Xác nhận xóa',
    'admin.deleteAccount': 'Xóa tài khoản',
    'admin.deleteUserConfirm': 'Xóa tài khoản này? Toàn bộ dữ liệu sẽ mất.',
    'admin.deleteScenarioConfirm': 'Xóa thế giới này? Toàn bộ phiêu lưu sẽ mất.',
    'admin.deleteCampaignConfirm': 'Xóa phiêu lưu này? Hành động này không thể hoàn tác.',
    'admin.deleted': 'Đã xóa thành công.',
    'admin.userDetails': 'Chi Tiết Người Dùng',
    'admin.joined': 'Tham gia',
    'admin.lastLogin': 'Đăng nhập cuối',
    'admin.isAdmin': 'Có quyền admin',
    'admin.isRegularUser': 'Người dùng thường',
    'admin.saving': 'Đang lưu...',
    'admin.save': 'Lưu thay đổi',
    'admin.loadUsersFailed': 'Không tải được danh sách người dùng.',
    'admin.loadScenariosFailed': 'Không tải được danh sách thế giới.',
    'admin.loadCampaignsFailed': 'Không tải được danh sách phiêu lưu.',
    'admin.overview': 'Tổng Quan',
    'admin.users': 'Người Dùng',
    'admin.scenarios': 'Thế Giới',
    'admin.campaigns': 'Phiêu Lưu',
    'admin.subtitle': 'Quản trị hệ thống Project Lunar',
    'admin.quickLinks': 'Đường Dẫn Nhanh',
    'admin.manageUsers': 'Quản Lý Người Dùng',
    'admin.manageScenarios': 'Quản Lý Thế Giới',
    'admin.manageCampaigns': 'Quản Lý Phiêu Lưu',
    'admin.viewEvents': 'Xem Sự Kiện',
    'admin.searchUsers': 'Tìm username, email...',
    'admin.table.user': 'Người dùng',
    'admin.table.email': 'Email',
    'admin.table.role': 'Vai trò',
    'admin.table.joined': 'Tham gia',
    'admin.table.lastLogin': 'Đăng nhập cuối',
    'admin.table.world': 'Thế Giới',
    'admin.table.creator': 'Người tạo',
    'admin.table.language': 'Ngôn ngữ',
    'admin.table.campaigns': 'Phiêu Lưu',
    'admin.table.createdAt': 'Tạo lúc',
    'admin.table.campaign': 'Phiêu Lưu',
    'admin.noUsers': 'Không có người dùng.',
    'admin.noScenarios': 'Không có thế giới nào.',
    'admin.noCampaigns': 'Không có phiêu lưu nào.',
    'admin.roleUser': 'User',
    'admin.details': 'Chi tiết',
    'admin.prev': '←',
    'admin.next': '→',
    'admin.stats.worlds': 'Thế Giới',
    'admin.stats.campaigns': 'Phiêu Lưu',
    'admin.stats.users': 'Người Dùng',
    'admin.stats.events': 'Sự Kiện',

    // Library
    'library.adventuresRecorded': '{n} cuộc phiêu lưu được ghi nhận',
    'library.search': 'Tìm kiếm...',
    'library.notFound': 'Không tìm thấy cuộc phiêu lưu nào.',
    'library.empty': 'Chưa có cuộc phiêu lưu nào.',
    'library.deleteAdventureConfirm': 'Xóa cuộc phiêu lưu này?',
    'library.deleteFailed': 'Xóa thất bại.',

    // Timeskip presets
    'timeskip.1hour': '1 Giờ',
    'timeskip.8hours': '8 Giờ',
    'timeskip.1day': '1 Ngày',
    'timeskip.3days': '3 Ngày',
    'timeskip.1week': '1 Tuần',
    'timeskip.1month': '1 Tháng',

    // Misc
    'home.badge': 'AI Narrative Engine · Neo4j Knowledge Graph',
    'combat.active': 'Combat Active',

    // Map / World node attributes
    'map.attr.description': 'Mô tả',
    'map.attr.power_level': 'Cấp sức mạnh',
    'map.attr.location_type': 'Loại địa điểm',
    'map.attr.faction_type': 'Loại phe phái',
    'map.attr.item_type': 'Loại vật phẩm',
    'map.attr.role': 'Vai trò',
    'map.attr.status': 'Trạng thái',
    'map.attr.mood': 'Tâm trạng',
    'map.attr.goal': 'Mục tiêu',
    'map.attr.faction': 'Phe phái',
    'map.attr.leader': 'Người lãnh đạo',
    'map.attr.members': 'Thành viên',
    'map.attr.influence': 'Ảnh hưởng',
    'map.attr.danger_level': 'Mức nguy hiểm',
    'map.attr.rarity': 'Độ hiếm',
    'map.attr.material': 'Chất liệu',
    'map.attr.history': 'Lịch sử',
    'map.attr.appearance': 'Ngoại hình',
    'map.attr.personality': 'Tính cách',
    'map.attr.secret': 'Bí mật',
  },

  // ---- English ----
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.create': 'Create World',
    'nav.play': 'Play',
    'nav.settings': 'Settings',
    'nav.library': 'Library',
    'nav.profile': 'Profile',
    'nav.admin': 'Admin',
    'nav.signout': 'Sign Out',

    // Home
    'home.title': 'Project Lunar',
    'home.subtitle': 'AI-powered narrative adventure platform. Create worlds. Live adventures.',
    'home.cta': 'Build New World',
    'home.empty': 'No worlds created yet.',
    'home.emptyHint': 'Start by building a new world.',
    'home.scenarios': 'Your Worlds',
    'home.units': 'units',

    // Scenario
    'scenario.title': 'Title',
    'scenario.description': 'Description',
    'scenario.tone': 'Tone & Directives',
    'scenario.opening': 'Opening Narrative',
    'scenario.lore': 'Lore & History',
    'scenario.loreHint': 'The system will auto-extract entities from this content.',
    'scenario.language': 'Language',
    'scenario.submit': 'Initialize World',
    'scenario.import': 'Import from File',
    'scenario.imported': 'Data loaded',
    'scenario.submitImport': 'Execute Import',
    'scenario.aiExpand': 'AI Expand',
    'scenario.analyzing': 'Analyzing...',
    'scenario.adventureName': 'Adventure Name',
    'scenario.adventureNameHint': 'Name this adventure. You can have multiple adventures in the same world.',

    // Entity types
    'entity.rank': 'Rank / Power Level',
    'entity.faction': 'Faction',
    'entity.secret': 'Secret',
    'entity.location': 'Location',
    'entity.npc': 'Character',
    'entity.item': 'Item',
    'entity.name': 'Name',
    'entity.description': 'Description',
    'entity.parent': 'Parent Level',
    'entity.leader': 'Leader',
    'entity.alignment': 'Alignment',
    'entity.influence': 'Influence',
    'entity.revealedTo': 'Known To',
    'entity.role': 'Role',
    'entity.powerLevel': 'Power Level',
    'entity.realm': 'Realm',
    'entity.subTiers': 'Sub-Tiers',
    'entity.subTier': 'Sub-Tier',
    'entity.tier': 'Tier',
    'entity.rarity': 'Rarity',
    'entity.owner': 'Owner',

    // Game Canvas
    'canvas.unknownWorld': 'Unknown Coordinates',
    'canvas.offline': 'OFFLINE',
    'canvas.disconnect': 'Disconnect',
    'canvas.combat': 'Combat',
    'canvas.narrator': 'Narrator',
    'canvas.missionLog': 'Mission Log',
    'canvas.rewind': 'Undo Last Action',

    // Action Input
    'action.do': 'Do',
    'action.say': 'Say',
    'action.continue': 'Continue',
    'action.meta': 'Meta',
    'action.doHint': 'Perform a physical action',
    'action.sayHint': 'Speak or communicate',
    'action.continueHint': 'Let the story flow',
    'action.metaHint': 'Ask the narrator about world state',
    'action.placeholder.do': 'Describe your action...',
    'action.placeholder.say': 'Enter your dialogue...',
    'action.placeholder.meta': 'Enter system command...',
    'action.placeholder.waiting': 'Receiving transmission...',
    'action.placeholder.awaitNarrator': 'Waiting for the narrator to finish this turn…',
    'action.placeholder.recoveryFirst': 'Tap Continue on the yellow banner to finish the interrupted turn.',
    'action.placeholder.continue': 'Press Enter to continue the story...',
    'action.send': 'Send',
    'action.continueKey': 'Ctrl + Enter to continue',

    // Panels
    'panel.tools': 'Tools',
    'panel.inventory': 'Inventory',
    'panel.worldMap': 'World Map',
    'panel.plotGenerator': 'Plot Generator',
    'panel.timeskip': 'Time Skip',
    'panel.npcMinds': 'NPC Minds',
    'panel.memoryCrystals': 'Memory Crystals',
    'panel.settings': 'Settings',
    'panel.journal': 'Journal',

    // Inventory
    'inventory.empty': 'No items yet.',
    'inventory.carried': 'Carried',
    'inventory.usedLost': 'Used / Lost',
    'inventory.use': 'Use',
    'inventory.drop': 'Drop',

    // Journal
    'journal.all': 'All',
    'journal.discovery': 'Discovery',
    'journal.combat': 'Combat',
    'journal.decision': 'Decision',
    'journal.relationship': 'Relationship',
    'journal.worldEvent': 'World Event',
    'journal.empty': 'No entries recorded.',
    'journal.refresh': 'Refresh',
    'journal.today': 'Today',
    'journal.yesterday': 'Yesterday',
    'journal.thisWeek': 'This Week',
    'journal.lastWeek': 'Last Week',
    'journal.older': 'Earlier',
    'journal.showMore': 'Show {n} more entries',
    'journal.collapse': 'Collapse',

    // Progression & Tribulation
    'tribulation.arrived': 'Heavenly Tribulation Descends',
    'tribulation.success': 'Breakthrough successful!',
    'tribulation.failed': 'Tribulation failed',
    'tribulation.roll': 'Roll',
    'progression.pill': 'Consumed a pill',
    'progression.insight': 'Sudden enlightenment',
    'progression.breakthrough': 'Breakthrough',
    'progression.advance': 'Power increased',

    // Memory
    'memory.empty': 'No memory crystals formed yet.',
    'memory.crystallize': 'Crystallize Recent Events',
    'memory.crystallizing': 'Crystallizing...',
    'memory.short': 'Short Crystal',
    'memory.long': 'Permanent Crystal',
    'memory.events': 'events compressed',

    // NPC
    'npc.feeling': 'Feeling',
    'npc.goal': 'Current Goal',
    'npc.opinion': 'Opinion of Player',
    'npc.secret': 'Secret Plan',
    'npc.empty': 'No NPC minds detected yet.',
    'npc.thoughts': 'thoughts',

    // Timeskip
    'timeskip.description': 'Advance narrative time. The world will react — NPCs move, factions shift, rumors spread.',
    'timeskip.execute': 'Skip {label}',
    'timeskip.worldEvolving': 'World is evolving...',
    'timeskip.continue': 'Continue',
    'timeskip.passed': 'has passed',

    // Settings
    'settings.title': 'Settings',
    'settings.provider': 'LLM Provider',
    'settings.model': 'Model',
    'settings.temperature': 'Temperature',
    'settings.temperatureDesc': 'Randomness of text output',
    'settings.maxTokens': 'Max Tokens',
    'settings.maxTokensDesc': 'Maximum response length',
    'settings.apply': 'Apply Settings',
    'settings.saved': 'Saved!',
    'settings.precise': 'Precise',
    'settings.balanced': 'Balanced',
    'settings.creative': 'Creative',
    'settings.short': 'Short',
    'settings.standard': 'Standard',
    'settings.extended': 'Extended',
    'settings.llm': 'LLM Settings',
    'settings.llmHint': 'Change LLM settings during a play session using the Settings button on the Play screen.',
    'settings.about': 'About Project Lunar',
    'settings.aboutText': 'An AI-powered narrative adventure platform. Create worlds. Live adventures.',

    // Plot Generator
    'plot.title': 'Plot Generator',
    'plot.npc': 'NPC',
    'plot.event': 'Event',
    'plot.arc': 'Plot Arc',
    'plot.npcDesc': 'Generate a unique NPC with personality, goals, and secrets based on your world context.',
    'plot.eventDesc': 'Create a random encounter or event with branching choices for your current scenario.',
    'plot.arcDesc': 'Generate a compelling plot hook for a new quest or story branch.',
    'plot.generate': 'Generate {type}',
    'plot.generating': 'Generating...',
    'plot.injectIntoStory': 'Inject into story',
    'plot.injecting': 'Injecting...',
    'plot.injectedOk': 'Injected!',
    'plot.injectFailed': 'Injection failed.',
    'plot.powerLevel': 'Power Level',
    'plot.personality': 'Personality',
    'plot.secret': 'Secret',
    'plot.choices': 'Choices',

    // World Map
    'map.title': 'World Map',
    'map.nodes': 'nodes · {links} links',
    'map.empty': 'No world data yet. Play to populate the graph.',
    'map.loading': 'Mapping world topology...',
    'map.search': 'Search world facts...',
    'map.searchClear': 'Clear results',

    // Generic
    'generic.close': 'Close',
    'generic.cancel': 'Cancel',
    'generic.confirm': 'Confirm',
    'generic.delete': 'Delete',
    'generic.edit': 'Edit',
    'generic.loading': 'Loading...',
    'generic.error': 'An error occurred.',
    'generic.retry': 'Retry',
    'generic.new': 'New',
    'generic.play': 'Play',
    'generic.export': 'Export',
    'generic.newAdventure': 'New Adventure',

    // Errors
    'error.backendOffline': 'Signal lost. Failed to connect to backend systems.',
    'error.exportFailed': 'Export failed.',
    'error.createFailed': 'Initialization failed.',
    'error.rewindFailed': 'Rewind failed.',
    'error.deleteConfirm': 'Delete this scenario and ALL its adventures? This cannot be undone.',
    'error.deleteAdventures': 'Delete {count} adventures for this scenario? All progress will be lost.',
    'error.newAdventure': 'Start a new adventure? Your current progress will be kept separately.',
    'error.rewindConfirm': 'Undo the last action? This cannot be reversed.',
    'error.neo4jDown': 'Neo4j is not running. The World Map will not be available during this session.\n\nTo enable it, start Neo4j via Docker:\ndocker-compose up -d neo4j',

    // Play page
    'play.chapter.opening': 'Opening',
    'play.chapter.barLabel': 'Turns · {count}',
    'play.chapter.prev': 'Previous chapter',
    'play.chapter.next': 'Next chapter',
    'play.chapter.jump': 'Jump to chapter',
    'play.chapter.current': 'current',
    'play.chapter.live': 'Live',
    'play.chapter.viewing': 'VIEWING CH.{n}',
    'play.chapter.viewingOldHint': 'You are viewing an old chapter — the story continues in the current chapter',
    'play.chapter.returnToCurrent': 'Return to current chapter',
    'play.opening.badge': 'Opening · {title}',
    'play.campaignMissing': 'Campaign not found',
    'play.campaignMissingHint': 'URL does not contain a valid campaign ID.',
    'play.campaignFetchFailed': 'Unable to connect to the server. Please try again.',
    'generic.backHome': 'Back to home',
    'generic.or': 'or',

    // Login
    'login.title': 'Welcome back',
    'login.subtitle': 'Sign in to continue your adventure',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.submit': 'Sign In',
    'login.submitting': 'Signing in...',
    'login.noAccount': "Don't have an account?",
    'login.registerNow': 'Sign up now',
    'error.loginFailed': 'Sign in failed. Please try again.',

    // Register
    'register.title': 'Create account',
    'register.subtitle': 'Start your own adventure',
    'register.email': 'Email',
    'register.username': 'Player name',
    'register.usernamePlaceholder': 'Your display name',
    'register.password': 'Password',
    'register.passwordPlaceholder': 'At least 6 characters',
    'register.confirmPassword': 'Confirm password',
    'register.confirmPasswordPlaceholder': 'Re-enter password',
    'register.submit': 'Create Account',
    'register.submitting': 'Creating account...',
    'register.hasAccount': 'Already have an account?',
    'register.loginNow': 'Sign in',
    'error.registerFailed': 'Registration failed. Please try again.',

    // Profile
    'profile.backgroundColor': 'Background color',
    'profile.emoji': 'Emoji',
    'profile.confirmDelete': 'Confirm deletion',
    'profile.errorUsernameEmpty': 'Username cannot be empty.',
    'profile.profileSaved': 'Profile updated successfully.',
    'profile.errorCurrentPasswordRequired': 'Enter your current password.',
    'profile.deleteAccount': 'Delete Account',
    'profile.deleteAccountMessage': 'Permanently delete. This action cannot be undone.',
    'profile.joined': 'Joined {date}',
    'profile.stats': 'Personal Stats',
    'profile.worlds': 'Worlds',
    'profile.adventures': 'Adventures',
    'profile.actions': 'Actions',
    'profile.editProfile': 'Edit Profile',
    'profile.username': 'Username',
    'profile.usernamePlaceholder': 'Enter username...',
    'profile.bio': 'Bio',
    'profile.bioPlaceholder': 'Tell us about yourself...',
    'profile.saveProfile': 'Save Profile',
    'profile.saving': 'Saving...',
    'profile.saved': 'Saved ✓',
    'profile.changePassword': 'Change Password',
    'profile.currentPassword': 'Current Password',
    'profile.newPassword': 'New Password',
    'profile.newPasswordPlaceholder': 'At least 6 characters',
    'profile.confirmNewPassword': 'Confirm New Password',
    'profile.confirmNewPasswordPlaceholder': 'Re-enter new password',
    'profile.passwordChanged': 'Password changed successfully!',
    'profile.changingPassword': 'Changing...',
    'profile.dangerZone': 'Danger Zone',
    'profile.deleteAccountLabel': 'Delete account',
    'profile.deleteAccountDesc': 'Permanently delete your account and all your data. This action cannot be undone.',
    'profile.newPasswordMin': 'New password must be at least 6 characters.',
    'profile.passwordMismatch': 'New passwords do not match.',
    'profile.permanentDelete': 'Delete permanently.',

    // Admin
    'admin.loadFailed': 'Failed to load information.',
    'admin.usernameEmpty': 'Username cannot be empty.',
    'admin.saved': 'Changes saved.',
    'admin.deleting': 'Deleting...',
    'admin.confirmDelete': 'Confirm deletion',
    'admin.deleteAccount': 'Delete Account',
    'admin.deleteUserConfirm': 'Delete this account? All data will be lost.',
    'admin.deleteScenarioConfirm': 'Delete this world? All adventures will be lost.',
    'admin.deleteCampaignConfirm': 'Delete this adventure? This action cannot be undone.',
    'admin.deleted': 'Deleted successfully.',
    'admin.userDetails': 'User Details',
    'admin.joined': 'Joined',
    'admin.lastLogin': 'Last login',
    'admin.isAdmin': 'Has admin privileges',
    'admin.isRegularUser': 'Regular user',
    'admin.saving': 'Saving...',
    'admin.save': 'Save Changes',
    'admin.loadUsersFailed': 'Failed to load users list.',
    'admin.loadScenariosFailed': 'Failed to load worlds list.',
    'admin.loadCampaignsFailed': 'Failed to load adventures list.',
    'admin.overview': 'Overview',
    'admin.users': 'Users',
    'admin.scenarios': 'Worlds',
    'admin.campaigns': 'Adventures',
    'admin.subtitle': 'Project Lunar System Administration',
    'admin.quickLinks': 'Quick Links',
    'admin.manageUsers': 'Manage Users',
    'admin.manageScenarios': 'Manage Worlds',
    'admin.manageCampaigns': 'Manage Adventures',
    'admin.viewEvents': 'View Events',
    'admin.searchUsers': 'Search username, email...',
    'admin.table.user': 'User',
    'admin.table.email': 'Email',
    'admin.table.role': 'Role',
    'admin.table.joined': 'Joined',
    'admin.table.lastLogin': 'Last login',
    'admin.table.world': 'World',
    'admin.table.creator': 'Creator',
    'admin.table.language': 'Language',
    'admin.table.campaigns': 'Adventures',
    'admin.table.createdAt': 'Created',
    'admin.table.campaign': 'Adventure',
    'admin.noUsers': 'No users found.',
    'admin.noScenarios': 'No worlds found.',
    'admin.noCampaigns': 'No adventures found.',
    'admin.roleUser': 'User',
    'admin.details': 'Details',
    'admin.prev': '←',
    'admin.next': '→',
    'admin.stats.worlds': 'Worlds',
    'admin.stats.campaigns': 'Adventures',
    'admin.stats.users': 'Users',
    'admin.stats.events': 'Events',

    // Library
    'library.adventuresRecorded': '{n} adventures recorded',
    'library.search': 'Search...',
    'library.notFound': 'No adventures found.',
    'library.empty': 'No adventures yet.',
    'library.deleteAdventureConfirm': 'Delete this adventure?',
    'library.deleteFailed': 'Delete failed.',

    // Timeskip presets
    'timeskip.1hour': '1 Hour',
    'timeskip.8hours': '8 Hours',
    'timeskip.1day': '1 Day',
    'timeskip.3days': '3 Days',
    'timeskip.1week': '1 Week',
    'timeskip.1month': '1 Month',

    // Misc
    'home.badge': 'AI Narrative Engine · Neo4j Knowledge Graph',
    'combat.active': 'Combat Active',

    // Map / World node attributes
    'map.attr.description': 'Description',
    'map.attr.power_level': 'Power Level',
    'map.attr.location_type': 'Location Type',
    'map.attr.faction_type': 'Faction Type',
    'map.attr.item_type': 'Item Type',
    'map.attr.role': 'Role',
    'map.attr.status': 'Status',
    'map.attr.mood': 'Mood',
    'map.attr.goal': 'Goal',
    'map.attr.faction': 'Faction',
    'map.attr.leader': 'Leader',
    'map.attr.members': 'Members',
    'map.attr.influence': 'Influence',
    'map.attr.danger_level': 'Danger Level',
    'map.attr.rarity': 'Rarity',
    'map.attr.material': 'Material',
    'map.attr.history': 'History',
    'map.attr.appearance': 'Appearance',
    'map.attr.personality': 'Personality',
    'map.attr.secret': 'Secret',
  },
}

// Language detection
function getBrowserLanguage() {
  const stored = localStorage.getItem('lunar_language')
  if (stored && (stored === 'vi' || stored === 'en')) return stored
  const browser = navigator.language.split('-')[0]
  return browser === 'vi' ? 'vi' : 'en'
}

export const useI18n = create((set, get) => ({
  locale: getBrowserLanguage(),
  translations,

  setLocale: (locale) => {
    localStorage.setItem('lunar_language', locale)
    set({ locale })
  },

  t: (key, params = {}) => {
    const { locale, translations: t } = get()
    const lang = t[locale] || t.en
    let text = lang[key] || t.en[key] || key

    // Replace {param} placeholders
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), v)
    })

    return text
  },
}))
