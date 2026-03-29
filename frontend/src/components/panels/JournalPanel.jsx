import { useState, useEffect } from 'react'
import Modal from '../UI/Modal'

const CATEGORIES = [
  { id: null,       label: 'Tất Cả' },
  { id: 'DISCOVERY',           label: 'Khám Phá' },
  { id: 'COMBAT',              label: 'Chiến Đấu' },
  { id: 'DECISION',            label: 'Quyết Định' },
  { id: 'RELATIONSHIP_CHANGE', label: 'Quan Hệ' },
  { id: 'WORLD_EVENT',         label: 'Sự Kiện Thế Giới' },
]

const CATEGORY_COLORS = {
  DISCOVERY:           'text-amber-400 bg-[rgba(251,191,36,0.1)] border-[rgba(251,191,36,0.2)]',
  COMBAT:              'text-rose-400 bg-[rgba(248,113,113,0.1)] border-[rgba(248,113,113,0.2)]',
  DECISION:            'text-[var(--text-secondary)] bg-[var(--accent-muted)] border-[var(--border-default)]',
  RELATIONSHIP_CHANGE:  'text-emerald-400 bg-[rgba(74,222,128,0.1)] border-[rgba(74,222,128,0.2)]',
  WORLD_EVENT:         'text-[var(--text-secondary)] bg-[var(--accent-muted)] border-[var(--border-default)]',
}

export default function JournalPanel({ open, onClose, entries = [], onRefresh }) {
  const [filter, setFilter] = useState(null)

  useEffect(() => {
    if (open && entries.length === 0 && onRefresh) onRefresh()
  }, [open])

  const filtered = filter ? entries.filter((e) => e.category === filter) : entries

  return (
    <Modal open={open} onClose={onClose} title="Nhật Ký" size="lg">
      {/* Filters */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
        {CATEGORIES.map((c) => (
          <button
            key={c.id ?? 'all'}
            onClick={() => setFilter(c.id)}
            className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest font-mono transition-all border
              ${filter === c.id
                ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--border-strong)]'
                : 'text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)]'
              }`}
          >
            {c.label}
          </button>
        ))}
        <div className="ml-auto">
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] transition-all"
            title="Làm mới"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          </button>
        </div>
      </div>

      {/* Entries */}
      <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto scrollbar">
        {filtered.length === 0 && (
          <p className="text-center text-[var(--text-tertiary)] text-sm py-8">Không có mục nào được ghi nhận.</p>
        )}
        {[...filtered].reverse().map((entry, i) => (
          <div key={i} className="p-3.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-widest font-mono px-2 py-0.5 rounded border ${CATEGORY_COLORS[entry.category] || CATEGORY_COLORS.DECISION}`}>
                {entry.category?.replace(/_/g, ' ') || 'LOG'}
              </span>
              <span className="text-[10px] text-[var(--text-disabled)] font-mono">
                {entry.created_at?.slice(11, 19) || ''}
              </span>
            </div>
            <p className="text-[var(--text-secondary)] text-sm font-light leading-relaxed">{entry.summary}</p>
          </div>
        ))}
      </div>
    </Modal>
  )
}
