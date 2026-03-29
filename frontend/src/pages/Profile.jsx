import { useI18n } from '../i18n'

export default function Profile() {
  const { t, locale, setLocale } = useI18n()

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[var(--accent-muted)] border border-[var(--border-default)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-secondary)]" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-[var(--text-primary)]">Guest</h1>
          <p className="text-sm text-[var(--text-tertiary)]">@{locale === 'vi' ? 'khach' : 'guest'}</p>
        </div>
      </div>

      {/* Placeholder cards */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Tài Khoản</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
            <span className="text-sm text-[var(--text-secondary)]">Email</span>
            <span className="text-sm text-[var(--text-disabled)]">—</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
            <span className="text-sm text-[var(--text-secondary)]">{t('settings.title')}</span>
            <span className="text-sm text-[var(--text-disabled)]">—</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-[var(--text-secondary)]">{locale === 'vi' ? 'Ngôn ngữ' : 'Language'}</span>
            <span className="text-sm font-medium text-[var(--text-primary)] font-mono uppercase">{locale}</span>
          </div>
        </div>
        <p className="text-xs text-[var(--text-disabled)] leading-relaxed">
          {locale === 'vi'
            ? 'Tính năng tài khoản đang được phát triển. Backend hiện tại chưa hỗ trợ xác thực người dùng.'
            : 'Account features are in development. The current backend does not yet support user authentication.'
          }
        </p>
      </div>

      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">Thống Kê</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: locale === 'vi' ? 'Thế Giới' : 'Worlds', value: '—' },
            { label: locale === 'vi' ? 'Phiêu Lưu' : 'Adventures', value: '—' },
            { label: locale === 'vi' ? 'Hành Động' : 'Actions', value: '—' },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <div className="text-xl font-bold text-[var(--text-primary)]">{stat.value}</div>
              <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
