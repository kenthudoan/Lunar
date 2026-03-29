// ============================================
// LUNAR i18n — Internationalization
// ============================================

import { create } from 'zustand'

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
    'action.placeholder.continue': 'Nhấn Enter để tiếp tục câu chuyện...',
    'action.send': 'Gửi',
    'action.continueKey': 'Ctrl + Enter để tiếp tục',

    // Panels
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
    'action.placeholder.continue': 'Press Enter to continue the story...',
    'action.send': 'Send',
    'action.continueKey': 'Ctrl + Enter to continue',

    // Panels
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
