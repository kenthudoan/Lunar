import { useState, useEffect } from 'react'
import Modal from '../UI/Modal'

const TIER_STYLES = {
  SHORT: { label: 'Tinh Thể Ngắn', color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--accent-muted)] border-[var(--border-default)]' },
  LONG:  { label: 'Tinh Thể Vĩnh Cửu', color: 'text-amber-400', bg: 'bg-[rgba(251,191,36,0.08)] border-[rgba(251,191,36,0.2)]' },
}

export default function MemoryInspector({ open, onClose, campaignId }) {
  const [crystals, setCrystals] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCrystals = async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      const { fetchMemoryCrystals } = await import('../../api')
      const data = await fetchMemoryCrystals(campaignId)
      setCrystals(data)
    } catch {
      setCrystals([])
    } finally {
      setLoading(false)
    }
  }

  const handleCrystallize = async () => {
    setLoading(true)
    try {
      const { crystallizeMemory } = await import('../../api')
      await crystallizeMemory(campaignId)
      await fetchCrystals()
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchCrystals()
  }, [open, campaignId])

  return (
    <Modal open={open} onClose={onClose} title="Tinh Thể Ký Ức" size="md">
      <div className="p-4 space-y-3">
        {loading && crystals.length === 0 && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="p-4 rounded-xl border border-[var(--border-subtle)] space-y-2">
                <div className="skeleton h-3 w-24 rounded" />
                <div className="skeleton h-3 w-full rounded" />
                <div className="skeleton h-3 w-4/5 rounded" />
              </div>
            ))}
          </div>
        )}

        {!loading && crystals.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[var(--text-tertiary)] text-sm">Chưa có tinh thể ký ức nào được hình thành.</p>
          </div>
        )}

        {crystals.map((crystal, i) => {
          const style = TIER_STYLES[crystal.tier] || TIER_STYLES.SHORT
          return (
            <div key={i} className={`p-4 rounded-xl border ${style.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[10px] uppercase tracking-widest font-bold ${style.color}`}>
                  {style.label}
                </span>
                <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                  {crystal.event_count} sự kiện đã nén
                </span>
              </div>
              <p className="text-[var(--text-secondary)] text-sm font-light leading-relaxed">
                {crystal.content}
              </p>
            </div>
          )
        })}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4">
        <button
          onClick={handleCrystallize}
          disabled={loading}
          className="w-full btn btn-secondary"
        >
          {loading ? (
            <><svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Đang kết tinh...</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5H18l-3.7 2.7 1.4 4.3L12 12l-3.7 2.5 1.4-4.3L6 7.5h4.5z" /></svg>Kết Tinh Ký Ức Gần Đây</>
          )}
        </button>
      </div>
    </Modal>
  )
}
