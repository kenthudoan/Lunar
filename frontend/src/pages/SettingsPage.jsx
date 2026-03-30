import { useI18n } from '../i18n'
import { useGameStore } from '../store'

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
]

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n()
  const { llmProvider, llmModel, temperature, maxTokens, updateSettings } = useGameStore()

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-[var(--text-primary)]">{t('settings.title')}</h1>

      {/* Language */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.language')}</h2>
        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.value}
              onClick={() => setLocale(lang.value)}
              className={`
                w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all border
                ${locale === lang.value
                  ? 'bg-[var(--accent-muted)] border-[var(--border-strong)] text-[var(--text-primary)]'
                  : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
                }
              `}
            >
              <span className="text-sm font-medium">{lang.label}</span>
              {locale === lang.value && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--success)]">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* LLM Settings */}
      <div className="card p-5 space-y-4">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.llm')}</h2>

        <div className="space-y-1">
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
            <span className="text-sm text-[var(--text-secondary)]">{t('settings.provider')}</span>
            <span className="text-sm font-medium text-[var(--text-primary)] capitalize">{llmProvider}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
            <span className="text-sm text-[var(--text-secondary)]">{t('settings.model')}</span>
            <span className="text-sm font-mono text-[var(--text-primary)]">{llmModel}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--border-subtle)]">
            <span className="text-sm text-[var(--text-secondary)]">{t('settings.temperature')}</span>
            <span className="text-sm font-mono text-[var(--text-primary)]">{temperature.toFixed(2)}</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-[var(--text-secondary)]">{t('settings.maxTokens')}</span>
            <span className="text-sm font-mono text-[var(--text-primary)]">{maxTokens}</span>
          </div>
        </div>

        <p className="text-xs text-[var(--text-disabled)]">
          {t('settings.llmHint')}
        </p>
      </div>

      {/* About */}
      <div className="card p-5 space-y-3">
        <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('settings.about')}</h2>
        <div className="space-y-2 text-sm text-[var(--text-tertiary)]">
          <p>Version: <span className="font-mono text-[var(--text-secondary)]">2.0.0</span></p>
          <p>Frontend: <span className="font-mono text-[var(--text-secondary)]">React 19 + Vite + Zustand + Tailwind</span></p>
          <p>Backend: <span className="font-mono text-[var(--text-secondary)]">FastAPI + Neo4j + litellm</span></p>
          <p className="pt-2 text-xs">
            {t('settings.aboutText')}
          </p>
        </div>
      </div>
    </div>
  )
}
