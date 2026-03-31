import { useI18n } from '../i18n'
import { useGameStore } from '../store'

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
]

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n()
  const { llmProvider, llmModel, temperature, maxTokens } = useGameStore()

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-lg font-bold text-[var(--text-primary)]">{t('settings.title')}</h1>

      {/* Language */}
      <div className="card p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm text-[var(--text-secondary)]">{t('settings.language')}</span>
          <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.value}
                onClick={() => setLocale(lang.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                  locale === lang.value
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LLM Settings */}
      <div className="card p-5">
        <h2 className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.llm')}</h2>
        <div className="space-y-2">
          {[
            { label: t('settings.provider'), value: <span className="capitalize text-[var(--text-primary)]">{llmProvider}</span> },
            { label: t('settings.model'), value: <span className="font-mono text-[var(--text-primary)]">{llmModel}</span> },
            { label: t('settings.temperature'), value: <span className="font-mono text-[var(--text-primary)]">{temperature.toFixed(2)}</span> },
            { label: t('settings.maxTokens'), value: <span className="font-mono text-[var(--text-primary)]">{maxTokens}</span> },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between py-1.5 border-b border-[var(--border-subtle)] last:border-0">
              <span className="text-sm text-[var(--text-tertiary)]">{item.label}</span>
              <span className="text-sm font-medium">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--text-disabled)] mt-2">{t('settings.llmHint')}</p>
      </div>

      {/* About */}
      <div className="card p-5">
        <h2 className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('settings.about')}</h2>
        <div className="space-y-1 text-sm text-[var(--text-tertiary)]">
          <p>Version: <span className="font-mono text-[var(--text-secondary)]">2.0.0</span></p>
          <p>Frontend: <span className="font-mono text-[var(--text-secondary)]">React 19 + Vite + Zustand + Tailwind</span></p>
          <p>Backend: <span className="font-mono text-[var(--text-secondary)]">FastAPI + Neo4j + litellm</span></p>
        </div>
        <p className="text-xs text-[var(--text-disabled)] mt-2">{t('settings.aboutText')}</p>
      </div>
    </div>
  )
}
