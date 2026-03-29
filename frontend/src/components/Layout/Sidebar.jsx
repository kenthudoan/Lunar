import { NavLink, useLocation } from 'react-router-dom'
import { useI18n } from '../../i18n'

// Icon: Moon
const LunarIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)

// Icon: Home
const HomeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
)

// Icon: Plus
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

// Icon: Book Open
const BookIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
  </svg>
)

// Icon: User
const UserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

// Icon: Settings
const SettingsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
)

// Icon: Shield (admin)
const ShieldIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
)

// Icon: Log out
const LogOutIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
)

const NAV_ITEMS = [
  { to: '/',          icon: HomeIcon,    labelKey: 'nav.home',       end: true },
  { to: '/create',    icon: PlusIcon,    labelKey: 'nav.create' },
  { to: '/library',   icon: BookIcon,   labelKey: 'nav.library' },
  { to: '/profile',   icon: UserIcon,   labelKey: 'nav.profile' },
]

const NAV_BOTTOM = [
  { to: '/settings', icon: SettingsIcon, labelKey: 'nav.settings' },
  { to: '/admin',    icon: ShieldIcon,   labelKey: 'nav.admin' },
]

function SidebarLink({ to, icon: Icon, labelKey, end, onClick }) {
  const { t } = useI18n()

  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group
        ${isActive
          ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border border-[var(--border-default)]'
          : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] border border-transparent'
        }`
      }
    >
      <Icon />
      <span>{t(labelKey)}</span>
    </NavLink>
  )
}

export default function Sidebar({ collapsed = false, onNavigate }) {
  const { t } = useI18n()

  return (
    <aside
      className={`
        hidden md:flex flex-col h-screen sticky top-0
        bg-[var(--bg-surface)] border-r border-[var(--border-subtle)]
        transition-all duration-300
        ${collapsed ? 'w-[68px]' : 'w-[var(--sidebar-width)]'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center h-[var(--header-height)] border-b border-[var(--border-subtle)] px-4 ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-8 h-8 rounded-lg bg-[var(--accent-muted)] border border-[var(--border-default)] flex items-center justify-center text-[var(--accent)] flex-shrink-0">
          <LunarIcon />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[var(--text-primary)] leading-tight">Project Lunar</div>
            <div className="text-[10px] text-[var(--text-tertiary)] font-mono">v2.0</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto scrollbar">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              labelKey={item.labelKey}
              end={item.end}
              onClick={onNavigate}
            />
          ))}
        </div>

        <div className="my-3 border-t border-[var(--border-subtle)]" />

        <div className="space-y-1">
          {NAV_BOTTOM.map((item) => (
            <SidebarLink
              key={item.to}
              to={item.to}
              icon={item.icon}
              labelKey={item.labelKey}
              onClick={onNavigate}
            />
          ))}
        </div>
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-[var(--border-subtle)]">
          <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] transition-all duration-150">
            <LogOutIcon />
            <span>{t('nav.signout')}</span>
          </button>
        </div>
      )}
    </aside>
  )
}
