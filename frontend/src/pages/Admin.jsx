import { useI18n } from '../i18n'

export default function Admin() {
  const { t } = useI18n()

  const STATS = [
    { label: 'Tổng Thế Giới', value: '—', color: 'text-[var(--accent)]' },
    { label: 'Tổng Cuộc Phiêu Lưu', value: '—', color: 'text-[var(--info)]' },
    { label: 'Người Dùng', value: '—', color: 'text-[var(--success)]' },
    { label: 'API Calls Tháng Này', value: '—', color: 'text-[var(--warning)]' },
  ]

  const SECTIONS = [
    {
      title: 'Quản Lý Người Dùng',
      description: 'Xem và quản lý tài khoản người dùng.',
      status: 'development',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      title: 'Quản Lý Nội Dung',
      description: 'Kiểm duyệt thế giới và kịch bản được chia sẻ.',
      status: 'development',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      ),
    },
    {
      title: 'Thanh Toán',
      description: 'Quản lý subscription và billing.',
      status: 'future',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      ),
    },
    {
      title: 'Logs & Monitoring',
      description: 'Theo dõi API calls, lỗi, và hiệu suất hệ thống.',
      status: 'future',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{t('nav.admin')}</h1>
        <p className="text-sm text-[var(--text-tertiary)]">Quản trị hệ thống Project Lunar.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STATS.map((stat) => (
          <div key={stat.label} className="card p-4 text-center">
            <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <div key={section.title} className="card p-5">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] flex-shrink-0">
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">{section.title}</h3>
                  <span className={`badge text-[8px] ${section.status === 'development' ? 'badge-warning' : section.status === 'future' ? 'badge-info' : 'badge-default'}`}>
                    {section.status === 'development' ? 'Đang phát triển' : section.status === 'future' ? 'Sắp tới' : 'Có sẵn'}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-tertiary)]">{section.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
