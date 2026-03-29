import { useState } from 'react'
import Modal from '../UI/Modal'

const TABS = [
  { id: 'npc', label: 'NPC', icon: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> },
  { id: 'event', label: 'Sự Kiện', icon: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg> },
  { id: 'plot', label: 'Cốt Truyện', icon: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></svg> },
]

export default function PlotGeneratorPanel({ open, onClose, campaignId, language = 'en' }) {
  const [tab, setTab] = useState('npc')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const generate = async (type) => {
    setLoading(true)
    setResult(null)
    try {
      const { generateContent } = await import('../../api')
      const data = await generateContent(campaignId, type, language)
      setResult({ type, data })
    } catch {
      setResult({ type, data: null, error: 'Generation failed.' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Tạo Cốt Truyện" size="md">
      <div className="p-4 space-y-4">
        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setResult(null) }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all border ${tab === t.id ? 'bg-[var(--accent-muted)] border-[var(--border-strong)] text-[var(--text-primary)]' : 'bg-transparent border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)]'}`}
            >
              <t.icon />
              {t.label}
            </button>
          ))}
        </div>

        {/* Description */}
        <p className="text-sm text-[var(--text-tertiary)] font-light leading-relaxed">
          {tab === 'npc' && 'Tạo một NPC độc đáo với tính cách, mục tiêu và bí mật.'}
          {tab === 'event' && 'Tạo một cuộc gặp gỡ hoặc sự kiện ngẫu nhiên.'}
          {tab === 'plot' && 'Tạo một móc câu cốt truyện cho nhiệm vụ hoặc nhánh câu chuyện mới.'}
        </p>

        {/* Generate */}
        <button
          onClick={() => generate(tab)}
          disabled={loading}
          className="w-full btn btn-primary"
        >
          {loading ? (
            <><svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang tạo...</>
          ) : `Tạo ${TABS.find((t) => t.id === tab)?.label}`}
        </button>

        {/* Result */}
        {result?.error && (
          <div className="p-4 rounded-xl bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] text-[var(--error)] text-sm">{result.error}</div>
        )}
        {result?.data && result.type === 'npc' && (
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">{result.data.name}</h3>
              <span className="badge badge-warning">Power {result.data.power_level}/10</span>
            </div>
            <p className="text-sm text-[var(--text-secondary)]">{result.data.appearance}</p>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div><span className="text-[var(--text-tertiary)] uppercase tracking-wider text-[10px] font-bold block mb-1">Personality</span><p className="text-[var(--text-secondary)]">{result.data.personality}</p></div>
              <div><span className="text-[var(--text-tertiary)] uppercase tracking-wider text-[10px] font-bold block mb-1">Goal</span><p className="text-[var(--text-secondary)]">{result.data.goal}</p></div>
              <div className="col-span-2"><span className="text-[var(--text-tertiary)] uppercase tracking-wider text-[10px] font-bold block mb-1">Secret</span><p className="text-[var(--text-secondary)] italic">{result.data.secret}</p></div>
            </div>
          </div>
        )}
        {result?.data && result.type === 'event' && (
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] space-y-2">
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{result.data.title}</h3>
            <p className="text-sm text-[var(--text-secondary)] font-light leading-relaxed">{result.data.description}</p>
            {result.data.choices?.length > 0 && (
              <div>
                <span className="text-[var(--text-tertiary)] uppercase tracking-wider text-[10px] font-bold block mb-2">Lựa chọn</span>
                {result.data.choices.map((c, i) => <div key={i} className="text-sm text-[var(--text-secondary)] py-0.5"><span className="text-[var(--text-tertiary)] font-mono text-xs mr-2">{i + 1}.</span>{c}</div>)}
              </div>
            )}
          </div>
        )}
        {result?.data && result.type === 'plot' && (
          <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <p className="text-sm text-[var(--text-secondary)] font-light italic leading-relaxed">{typeof result.data === 'string' ? result.data : result.data.text}</p>
          </div>
        )}
      </div>
    </Modal>
  )
}
