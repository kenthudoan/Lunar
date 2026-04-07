import { useState } from 'react'
import Modal from '../UI/Modal'
import { useGameStore } from '../../store'
import { useI18n } from '../../i18n'

const READING_FONTS = [
  { id: 'font-prose',     label: { vi: 'Mặc định (Lora)', en: 'Default (Lora)' },      cssFamily: 'var(--font-prose)' },
  { id: 'font-reading-1', label: { vi: 'Be Vietnam Pro',   en: 'Be Vietnam Pro' },        cssFamily: 'var(--font-reading-1)' },
  { id: 'font-reading-2', label: { vi: 'Inter',            en: 'Inter' },               cssFamily: 'var(--font-reading-2)' },
  { id: 'font-reading-3', label: { vi: 'Merriweather',     en: 'Merriweather' },         cssFamily: 'var(--font-reading-3)' },
]

export default function SettingsPanel({ open, onClose }) {
  const { t } = useI18n()
  const { readingFont, fontSize, streamDeliverySpeed, updateSettings } = useGameStore()

  const [font, setFont] = useState(readingFont || 'font-prose')
  const [size, setSize] = useState(fontSize || 16.5)
  const [delSpeedIdx, setDelSpeedIdx] = useState(() => {
    const map = { 'instant': 0, 'fast': 1, 'normal': 2, 'moderate': 3, 'slow120': 4, 'slow130': 5, 'slow': 6, 'typewriter': 7 }
    return map[streamDeliverySpeed] ?? 0
  })
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    updateSettings({
      readingFont: font,
      fontSize: size,
      streamDeliverySpeed: ['instant', 'fast', 'normal', 'moderate', 'slow120', 'slow130', 'slow', 'typewriter'][delSpeedIdx],
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const lang = localStorage.getItem('lunar_language') || 'en'

  return (
    <Modal open={open} onClose={onClose} title={t('panel.settings')} size="md">
      <div className="p-4 space-y-5">

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

        {/* Stream Delivery Speed */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label mb-0">{lang === 'vi' ? 'Tốc Độ Server' : 'Stream Delivery'}</label>
            <span className="text-xs font-mono text-[var(--text-secondary)]">
              {['0ms', '5ms', '20ms', '60ms', '120ms', '130ms', '150ms', '350ms'][delSpeedIdx]}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={7}
            step={1}
            value={delSpeedIdx}
            onChange={(e) => setDelSpeedIdx(parseInt(e.target.value))}
            className="w-full accent-white h-1.5 bg-[var(--accent-muted)] rounded-full appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-[var(--text-disabled)] mt-1">
            <span>{lang === 'vi' ? 'Tức thì' : 'Instant'}</span>
            <span>{lang === 'vi' ? 'Chậm' : 'Slow'}</span>
            <span>{lang === 'vi' ? 'Chậm nhất' : 'Slowest'}</span>
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
