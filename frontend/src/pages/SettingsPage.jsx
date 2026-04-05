import { useState } from 'react'
import { useI18n } from '../i18n'
import { useGameStore } from '../store'

const PROVIDERS = [
  { id: 'deepseek',  label: 'DeepSeek',  models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'anthropic', label: 'Anthropic', models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'] },
  { id: 'openai',   label: 'OpenAI',    models: ['gpt-4o', 'gpt-4o-mini'] },
]

const LANGUAGES = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
]

export default function SettingsPage() {
  const { t, locale, setLocale } = useI18n()
  const { llmProvider, llmModel, temperature, maxTokens, updateSettings } = useGameStore()

  const [provider, setProvider] = useState(llmProvider)
  const [model, setModel] = useState(llmModel)
  const [temp, setTemp] = useState(temperature)
  const [tokens, setTokens] = useState(maxTokens)
  const [saved, setSaved] = useState(false)

  const currentProviderModels = PROVIDERS.find((p) => p.id === provider)?.models || []

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    const providerModels = PROVIDERS.find((p) => p.id === newProvider)?.models || []
    setModel(providerModels[0] || '')
  }

  const handleSave = () => {
    updateSettings({
      llmProvider: provider,
      llmModel: model,
      temperature: temp,
      maxTokens: tokens,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

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
        <h2 className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-4">
          {t('settings.llm')}
        </h2>

        <div className="space-y-4">
          {/* Provider */}
          <div>
            <label className="label">{t('settings.provider')}</label>
            <select
              value={provider}
              onChange={(e) => handleProviderChange(e.target.value)}
              className="input select w-full"
            >
              {PROVIDERS.map((p) => (
                <option key={p.id} value={p.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Model */}
          <div>
            <label className="label">{t('settings.model')}</label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="input select w-full"
            >
              {currentProviderModels.map((m) => (
                <option key={m} value={m} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{t('settings.temperature')}</label>
              <span className="text-xs font-mono text-[var(--text-secondary)]">{temp.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={temp}
              onChange={(e) => setTemp(parseFloat(e.target.value))}
              className="w-full accent-white h-1.5 bg-[var(--accent-muted)] rounded-full appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[var(--text-disabled)] mt-1">
              <span>{t('settings.precise')}</span>
              <span>{t('settings.balanced')}</span>
              <span>{t('settings.creative')}</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">{t('settings.maxTokens')}</label>
              <span className="text-xs font-mono text-[var(--text-secondary)]">{tokens}</span>
            </div>
            <input
              type="range"
              min={256}
              max={8192}
              step={256}
              value={tokens}
              onChange={(e) => setTokens(parseInt(e.target.value))}
              className="w-full accent-white h-1.5 bg-[var(--accent-muted)] rounded-full appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[var(--text-disabled)] mt-1">
              <span>{t('settings.short')}</span>
              <span>{t('settings.standard')}</span>
              <span>{t('settings.extended')}</span>
            </div>
          </div>

          <button onClick={handleSave} className="btn btn-primary w-full">
            {saved ? `✓ ${t('settings.saved')}` : t('settings.apply')}
          </button>
        </div>
      </div>

      {/* About */}
      <div className="card p-5">
        <h2 className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
          {t('settings.about')}
        </h2>
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
