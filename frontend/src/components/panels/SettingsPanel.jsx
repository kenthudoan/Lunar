import { useState } from 'react'
import Modal from '../UI/Modal'
import { useGameStore } from '../../store'
import { useI18n } from '../../i18n'

const PROVIDERS = [
  { id: 'deepseek',  label: 'DeepSeek',  models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'anthropic', label: 'Anthropic', models: ['claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6'] },
  { id: 'openai',   label: 'OpenAI',    models: ['gpt-4o', 'gpt-4o-mini'] },
]

const READING_FONTS = [
  { id: 'font-prose',     label: { vi: 'Mặc định (Lora)', en: 'Default (Lora)' },      cssFamily: 'var(--font-prose)' },
  { id: 'font-reading-1', label: { vi: 'Be Vietnam Pro',   en: 'Be Vietnam Pro' },        cssFamily: 'var(--font-reading-1)' },
  { id: 'font-reading-2', label: { vi: 'Inter',            en: 'Inter' },               cssFamily: 'var(--font-reading-2)' },
  { id: 'font-reading-3', label: { vi: 'Merriweather',     en: 'Merriweather' },         cssFamily: 'var(--font-reading-3)' },
]

const FONT_SIZES = [13, 14, 15, 16, 16.5, 17, 18, 19, 20, 21, 22]

export default function SettingsPanel({ open, onClose }) {
  const { t } = useI18n()
  const { llmProvider, llmModel, temperature, maxTokens, readingFont, fontSize, updateSettings } = useGameStore()
  const [provider, setProvider] = useState(llmProvider)
  const [model, setModel] = useState(llmModel)
  const [temp, setTemp] = useState(temperature)
  const [tokens, setTokens] = useState(maxTokens)
  const [font, setFont] = useState(readingFont || 'font-prose')
  const [size, setSize] = useState(fontSize || 16.5)
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
      readingFont: font,
      fontSize: size,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const lang = localStorage.getItem('lunar_language') || 'en'

  return (
    <Modal open={open} onClose={onClose} title={t('panel.settings')} size="md">
      <div className="p-4 space-y-5">
        {/* Provider */}
        <div>
          <label className="label">{t('settings.provider')}</label>
          <select value={provider} onChange={(e) => handleProviderChange(e.target.value)} className="input select">
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">{p.label}</option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div>
          <label className="label">{t('settings.model')}</label>
          <select value={model} onChange={(e) => setModel(e.target.value)} className="input select">
            {currentProviderModels.map((m) => (
              <option key={m} value={m} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">{m}</option>
            ))}
          </select>
        </div>

        {/* Temperature */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">{t('settings.temperature')}</label>
            <span className="text-xs font-mono text-[var(--text-secondary)]">{temp.toFixed(2)}</span>
          </div>
          <input type="range" min={0} max={2} step={0.05} value={temp} onChange={(e) => setTemp(parseFloat(e.target.value))} className="w-full accent-white h-1.5 bg-[var(--accent-muted)] rounded-full appearance-none cursor-pointer" />
          <div className="flex justify-between text-[9px] text-[var(--text-disabled)] mt-1">
            <span>{t('settings.precise')}</span><span>{t('settings.balanced')}</span><span>{t('settings.creative')}</span>
          </div>
        </div>

        {/* Max Tokens */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">{t('settings.maxTokens')}</label>
            <span className="text-xs font-mono text-[var(--text-secondary)]">{tokens}</span>
          </div>
          <input type="range" min={256} max={8192} step={256} value={tokens} onChange={(e) => setTokens(parseInt(e.target.value))} className="w-full accent-white h-1.5 bg-[var(--accent-muted)] rounded-full appearance-none cursor-pointer" />
          <div className="flex justify-between text-[9px] text-[var(--text-disabled)] mt-1">
            <span>{t('settings.short')}</span><span>{t('settings.standard')}</span><span>{t('settings.extended')}</span>
          </div>
        </div>

        {/* Divider */}
        <div className="divider" />

        {/* Reading Font */}
        <div>
          <label className="label">{lang === 'vi' ? 'Font Đọc Truyện' : 'Reading Font'}</label>
          <div className="grid grid-cols-2 gap-2">
            {READING_FONTS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFont(f.id)}
                style={{ fontFamily: f.cssFamily }}
                className={`
                  px-3 py-2.5 rounded-xl border text-sm transition-all text-left
                  ${font === f.id
                    ? 'bg-[var(--accent-muted)] border-[var(--border-strong)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]'
                  }
                `}
              >
                {f.label[lang] || f.label.en}
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">{lang === 'vi' ? 'Cỡ Chữ' : 'Font Size'}</label>
            <span className="text-xs font-mono text-[var(--text-secondary)]">{size}px</span>
          </div>
          <input
            type="range"
            min={13}
            max={22}
            step={1}
            value={size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            className="w-full accent-white h-1.5 bg-[var(--accent-muted)] rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--text-disabled)] mt-1">
            <span>A</span>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                <span style={{ fontSize: 10 }} className="text-[var(--text-secondary)] leading-none">A</span>
              </div>
            </div>
            <span style={{ fontSize: 14 }}>A</span>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 rounded border border-[var(--border-subtle)] flex items-center justify-center overflow-hidden">
                <span style={{ fontSize: 13 }} className="text-[var(--text-secondary)] leading-none">A</span>
              </div>
            </div>
            <span>A</span>
          </div>
          {/* Preview */}
          <div
            className="mt-3 px-3 py-2.5 rounded-xl bg-[var(--accent-muted)] border border-[var(--border-subtle)]"
            style={{ fontFamily: READING_FONTS.find((f) => f.id === font)?.cssFamily, fontSize: `${size}px`, lineHeight: 1.7 }}
          >
            <span className="text-[9px] uppercase tracking-widest text-[var(--text-disabled)] block mb-1">
              {lang === 'vi' ? 'Xem trước' : 'Preview'}
            </span>
            Ngươi tỉnh dậy trong bóng tối. Không khí nồng nặc mùi máu. Một tiếng động nhỏ phía sau rèm...
          </div>
        </div>

        {/* Save */}
        <button onClick={handleSave} className="w-full btn btn-primary">
          {saved ? `✓ ${t('settings.saved')}` : t('settings.apply')}
        </button>
      </div>
    </Modal>
  )
}
