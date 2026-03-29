import { useState } from 'react'
import Modal from '../UI/Modal'

const PRESETS = [
  { label: '1 Giờ', seconds: 3600 },
  { label: '8 Giờ', seconds: 28800 },
  { label: '1 Ngày', seconds: 86400 },
  { label: '3 Ngày', seconds: 259200 },
  { label: '1 Tuần', seconds: 604800 },
  { label: '1 Tháng', seconds: 2592000 },
]

export default function TimeskipModal({ open, onClose, campaignId, onTimeskip }) {
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState(null)

  const handleTimeskip = async () => {
    if (!selected) return
    setLoading(true)
    setSummary(null)
    try {
      const { timeskip: apiTimeskip } = await import('../../api')
      const data = await apiTimeskip(campaignId, selected.seconds)
      setSummary(data.summary)
      onTimeskip?.(data)
    } catch {
      setSummary('Thời gian trôi qua, nhưng thế giới vẫn đứng yên...')
    } finally {
      setLoading(false)
    }
  }

  const reset = () => { setSummary(null); setSelected(null) }

  return (
    <Modal open={open} onClose={() => { onClose(); reset() }} title="Tua Thời Gian" size="md">
      <div className="p-4 space-y-4">
        {!summary ? (
          <>
            <p className="text-sm text-[var(--text-tertiary)] font-light leading-relaxed">
              Di chuyển thời gian. Thế giới sẽ phản ứng — NPC di chuyển, phe phái thay đổi, tin đồn lan truyền.
            </p>
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p.seconds}
                  onClick={() => setSelected(p)}
                  className={`
                    px-3 py-3 rounded-xl text-sm font-medium transition-all border
                    ${selected?.seconds === p.seconds
                      ? 'bg-[var(--accent-muted)] border-[var(--border-strong)] text-[var(--text-primary)] shadow-[var(--shadow-glow)]'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)] hover:text-[var(--text-primary)]'
                    }
                  `}
                >
                  {p.label}
                </button>
              ))}
            </div>
            <button
              onClick={handleTimeskip}
              disabled={!selected || loading}
              className="w-full btn btn-primary"
            >
              {loading ? (
                <><svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Thế giới đang thay đổi...</>
              ) : `Tua ${selected?.label || '...'}`}
            </button>
          </>
        ) : (
          <>
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-bold">
                {selected?.label} đã trôi qua
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <p className="text-[var(--text-secondary)] text-sm font-light leading-relaxed italic">
                {summary}
              </p>
            </div>
            <button onClick={() => { onClose(); reset() }} className="w-full btn btn-secondary">
              Tiếp Tục
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
