import { useLocation, Link } from 'react-router-dom'
import { useI18n } from '../../i18n'

// Icon: Arrow Left
const ArrowLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="19" y1="12" x2="5" y2="12" />
    <polyline points="12 19 5 12 12 5" />
  </svg>
)

// Icon: Globe (language)
const GlobeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)

// Route metadata
const ROUTE_META = {
  '/':           { titleKey: 'nav.home',      showBack: false, showLang: false },
  '/create':     { titleKey: 'nav.create',    showBack: true,  showLang: false },
  '/play':       { titleKey: 'nav.play',      showBack: false, showLang: false },
  '/library':    { titleKey: 'nav.library',   showBack: false, showLang: true  },
  '/profile':    { titleKey: 'nav.profile',   showBack: false, showLang: true  },
  '/settings':   { titleKey: 'nav.settings',  showBack: false, showLang: true  },
  '/admin':      { titleKey: 'nav.admin',     showBack: false, showLang: true  },
}

function getRouteMeta(pathname) {
  // Exact match first
  if (ROUTE_META[pathname]) return ROUTE_META[pathname]
  // Prefix match for nested routes
  for (const [path, meta] of Object.entries(ROUTE_META)) {
    if (path !== '/' && pathname.startsWith(path)) return meta
  }
  return { titleKey: 'nav.home', showBack: true, showLang: true }
}

export default function Header({ title, titleKey, onBack, extra }) {
  const { t, locale, setLocale } = useI18n()
  const location = useLocation()
  const meta = getRouteMeta(location.pathname)

  const displayTitle = title || t(titleKey || meta.titleKey)

  const toggleLang = () => setLocale(locale === 'vi' ? 'en' : 'vi')

  return (
    <header
      className="
        h-[var(--header-height)] flex items-center justify-between
        px-4 md:px-6
        border-b border-[var(--border-subtle)]
        bg-[var(--bg-surface)]/80
        backdrop-blur-md
        sticky top-0 z-30
        gap-4
      "
    >
      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        {meta.showBack && (
          <button
            onClick={onBack || (() => window.history.back())}
            className="
              flex items-center justify-center w-8 h-8 rounded-lg
              text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
              hover:bg-[var(--accent-muted)]
              transition-all duration-150 flex-shrink-0
            "
            aria-label="Go back"
          >
            <ArrowLeftIcon />
          </button>
        )}
        <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">
          {displayTitle}
        </h1>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {extra}
        {meta.showLang && (
          <button
            onClick={toggleLang}
            className="
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg
              text-xs font-medium font-mono
              text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]
              hover:bg-[var(--accent-muted)]
              border border-[var(--border-subtle)] hover:border-[var(--border-default)]
              transition-all duration-150
            "
            title="Toggle language"
          >
            <GlobeIcon />
            <span className="uppercase">{locale}</span>
          </button>
        )}
      </div>
    </header>
  )
}
