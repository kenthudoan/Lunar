import { useState, useEffect } from 'react'
import Modal from '../UI/Modal'
import { useI18n } from '../../i18n'

const THOUGHT_LABELS = {
  feeling: { labelKey: 'npc.feeling', color: 'text-amber-400' },
  goal: { labelKey: 'npc.goal', color: 'text-emerald-400' },
  opinion_of_player: { labelKey: 'npc.opinion', color: 'text-[var(--text-secondary)]' },
  secret_plan: { labelKey: 'npc.secret', color: 'text-rose-400' },
}

export default function NpcInspector({ open, onClose, campaignId }) {
  const { t } = useI18n()
  const [npcs, setNpcs] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const fetchNpcs = async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      const { fetchNpcMinds } = await import('../../api')
      const data = await fetchNpcMinds(campaignId)
      setNpcs(data)
    } catch {
      setNpcs([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) fetchNpcs()
  }, [open, campaignId])

  return (
    <Modal open={open} onClose={onClose} title={t('panel.npcMinds')} size="md">
      <div className="p-4 space-y-3">
        {loading && <p className="text-center text-[var(--text-tertiary)] text-sm py-8">{t('generic.loading')}</p>}

        {!loading && npcs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[var(--text-tertiary)] text-sm">{t('npc.empty')}</p>
          </div>
        )}

        {npcs.map((npc, i) => (
          <div key={i} className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden transition-all">
            <button
              onClick={() => setExpanded(expanded === i ? null : i)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--accent-muted)] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] text-xs font-bold">
                  {npc.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{npc.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-tertiary)]">{Object.keys(npc.thoughts || {}).length} {t('npc.thoughts')}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-[var(--text-tertiary)] transition-transform ${expanded === i ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9" /></svg>
              </div>
            </button>

            {expanded === i && (
              <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)] pt-3">
                {Object.entries(npc.thoughts || {}).map(([key, thought]) => {
                  const meta = THOUGHT_LABELS[key] || { labelKey: key, color: 'text-[var(--text-tertiary)]' }
                  return (
                    <div key={key}>
                      <span className={`text-[10px] uppercase tracking-widest font-bold ${meta.color} block mb-1.5`}>
                        {t(meta.labelKey)}
                      </span>
                      <p className="text-sm text-[var(--text-secondary)] font-light leading-relaxed pl-3 border-l-2 border-[var(--border-subtle)]">
                        {thought.value}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </Modal>
  )
}
