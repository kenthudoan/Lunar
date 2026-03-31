import { useState, useEffect, useMemo } from 'react'
import Modal from '../UI/Modal'
import { useI18n } from '../../i18n'

const CATEGORIES = [
  { id: null,          labelKey: 'journal.all' },
  { id: 'DISCOVERY',            labelKey: 'journal.discovery' },
  { id: 'COMBAT',               labelKey: 'journal.combat' },
  { id: 'DECISION',             labelKey: 'journal.decision' },
  { id: 'RELATIONSHIP_CHANGE',  labelKey: 'journal.relationship' },
  { id: 'WORLD_EVENT',          labelKey: 'journal.worldEvent' },
]

const CATEGORY_LABEL_KEY = Object.fromEntries(
  CATEGORIES.filter((c) => c.id !== null).map((c) => [c.id, c.labelKey])
)

const DOT_COLORS = {
  DISCOVERY:           '#fbbf24',
  COMBAT:              '#f87171',
  DECISION:            '#94a3b8',
  RELATIONSHIP_CHANGE: '#4ade80',
  WORLD_EVENT:         '#60a5fa',
}

const GROUP_ORDER = ['journal.today', 'journal.yesterday', 'journal.thisWeek', 'journal.lastWeek', 'journal.older']

function timeGroup(entry) {
  if (!entry.created_at) return 'journal.older'
  try {
    const d = new Date(entry.created_at)
    const now = new Date()
    const diff = now - d
    const day = 86_400_000
    if (diff < day)         return 'journal.today'
    if (diff < 2 * day)     return 'journal.yesterday'
    if (diff < 7 * day)     return 'journal.thisWeek'
    if (diff < 14 * day)    return 'journal.lastWeek'
    return 'journal.older'
  } catch {
    return 'journal.older'
  }
}

export default function JournalPanel({ open, onClose, entries = [], onRefresh }) {
  const { t } = useI18n()
  const [filter, setFilter] = useState(null)
  const [collapsedGroups, setCollapsedGroups] = useState({})
  const [expandedEntries, setExpandedEntries] = useState(false)

  useEffect(() => {
    if (open) { setFilter(null); setExpandedEntries(false) }
  }, [open])

  useEffect(() => {
    if (open && entries.length === 0 && onRefresh) onRefresh()
  }, [open])

  const filtered = filter ? entries.filter((e) => e.category === filter) : entries

  const grouped = useMemo(() => {
    const sorted = [...filtered].reverse()
    const groups = {}
    for (const entry of sorted) {
      const g = timeGroup(entry)
      if (!groups[g]) groups[g] = []
      groups[g].push(entry)
    }
    return Object.entries(groups).sort((a, b) => {
      const ia = GROUP_ORDER.indexOf(a[0])
      const ib = GROUP_ORDER.indexOf(b[0])
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
  }, [filtered])

  const toggleGroup = (g) =>
    setCollapsedGroups((prev) => ({ ...prev, [g]: !prev[g] }))

  const showAll = expandedEntries || filtered.length <= 8
  const visibleGroups = showAll ? grouped : grouped.slice(0, 2)
  const hiddenCount = grouped.slice(2).reduce((s, [, e]) => s + e.length, 0)

  return (
    <Modal open={open} onClose={onClose} title={t('panel.journal')} size="lg">
      {/* Category filters */}
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
            {t(c.labelKey)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={onRefresh}
            className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] transition-all"
            title={t('journal.refresh')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>
          </button>
        </div>
      </div>

      {/* Timeline entries */}
      <div className="p-4 max-h-[60vh] overflow-y-auto scrollbar">
        {filtered.length === 0 && (
          <p className="text-center text-[var(--text-tertiary)] text-sm py-8">{t('journal.empty')}</p>
        )}

        {grouped.length === 0 && filtered.length > 0 && (
          <p className="text-center text-[var(--text-tertiary)] text-sm py-8">{t('journal.empty')}</p>
        )}

        {visibleGroups.map(([group, groupEntries], gi) => (
          <div key={group}>
            {/* Group header */}
            <button
              onClick={() => toggleGroup(group)}
              className="flex items-center gap-2 w-full text-left mb-2 mt-3 first:mt-0 group"
            >
              {gi === 0 && <div className="w-px h-3 bg-[var(--border-subtle)]" />}
              <div className="flex items-center gap-1.5">
                <svg
                  width="10" height="10" viewBox="0 0 10 10"
                  className={`text-[var(--text-disabled)] transition-transform ${collapsedGroups[group] ? '-rotate-90' : ''}`}
                  fill="currentColor"
                >
                  <path d="M3 2l4 3-4 3V2z" />
                </svg>
                <span className="text-[11px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest">
                  {t(group)}
                </span>
                <span className="text-[10px] text-[var(--text-disabled)] font-mono">
                  {groupEntries.length}
                </span>
              </div>
            </button>

            {/* Entries */}
            {!collapsedGroups[group] && (
              <div className="space-y-0 relative">
                {/* Vertical timeline line */}
                {groupEntries.length > 1 && (
                  <div
                    className="absolute top-3 bottom-3 left-[19px] w-px bg-[var(--border-subtle)]"
                    style={{ zIndex: 0 }}
                  />
                )}

                {groupEntries.map((entry, ei) => {
                  const dot = DOT_COLORS[entry.category] || '#94a3b8'
                  const time = entry.created_at?.slice(11, 16) || ''
                  return (
                    <div key={ei} className="flex gap-3 py-1.5 pl-1 group/row" style={{ position: 'relative', zIndex: 1 }}>
                      {/* Dot */}
                      <div className="relative shrink-0" style={{ paddingTop: '6px' }}>
                        <div
                          className="w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-base)]"
                          style={{ backgroundColor: dot }}
                        />
                      </div>

                      {/* Card */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="text-[10px] font-bold uppercase tracking-widest font-mono px-1.5 py-0.5 rounded"
                            style={{ color: dot, backgroundColor: dot + '1a' }}>
                            {t(CATEGORY_LABEL_KEY[entry.category] ?? 'journal.decision')}
                          </span>
                          {time && (
                            <span className="text-[10px] text-[var(--text-disabled)] font-mono">{time}</span>
                          )}
                        </div>
                        <p className="text-[var(--text-secondary)] text-sm font-light leading-relaxed break-words">
                          {entry.summary}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}

        {/* Show more */}
        {!showAll && hiddenCount > 0 && (
          <button
            onClick={() => setExpandedEntries(true)}
            className="mt-3 w-full text-center text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] py-2 rounded-lg hover:bg-[var(--accent-muted)] transition-all"
          >
            {t('journal.showMore', { n: hiddenCount })}
          </button>
        )}

        {showAll && grouped.length > 3 && (
          <button
            onClick={() => setExpandedEntries(false)}
            className="mt-3 w-full text-center text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] py-2 rounded-lg hover:bg-[var(--accent-muted)] transition-all"
          >
            {t('journal.collapse')}
          </button>
        )}
      </div>
    </Modal>
  )
}
