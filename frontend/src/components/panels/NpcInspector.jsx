import { useState, useEffect } from 'react'
import Modal from '../UI/Modal'
import { useI18n } from '../../i18n'

/** Strip Vietnamese diacritics so slug matches backend normalization. */
function _stripDiacritics(text) {
  return String(text)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
}

const THOUGHT_LABELS = {
  feeling: { labelKey: 'npc.feeling', color: 'text-amber-400' },
  goal: { labelKey: 'npc.goal', color: 'text-emerald-400' },
  opinion_of_player: { labelKey: 'npc.opinion', color: 'text-[var(--text-secondary)]' },
  secret_plan: { labelKey: 'npc.secret', color: 'text-rose-400' },
}

// ── Single NPC card ────────────────────────────────────────────────────────────

function NpcCard({ npc, powerSystem, language, expanded, onToggle }) {
  const { t } = useI18n()

  return (
    <div className="rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] overflow-hidden transition-all">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-[var(--accent-muted)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] text-xs font-bold">
            {npc.name?.charAt(0).toUpperCase() || '?'}
          </div>
          <div className="text-left">
            <span className="text-sm font-semibold text-[var(--text-primary)] block">{npc.name}</span>
            {/* Quick power preview (primary axis only) */}
            {npc.progression && powerSystem && (
              <div className="flex items-center gap-1.5 mt-0.5">
                {Object.entries(npc.progression).slice(0, 3).map(([axisId, prog]) => {
                  const axis = powerSystem.axes?.find(a => a.axis_id === axisId)
                  if (!axis) return null
                  const pct = Math.min(100, Math.round(((prog.raw_value || 0) / (axis.normalization_max || 100)) * 100))
                  return (
                    <div key={axisId} className="flex items-center gap-0.5">
                      <div className="w-8 h-1 rounded-full bg-[var(--bg-base)] overflow-hidden">
                        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[var(--text-tertiary)]">
            {Object.keys(npc.thoughts || {}).length} {t('npc.thoughts')}
          </span>
          <svg
            width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className={`text-[var(--text-tertiary)] transition-transform ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-[var(--border-subtle)] pt-3">
          {/* Thoughts */}
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
  )
}

// ── Main NPC Inspector ─────────────────────────────────────────────────────────

export default function NpcInspector({ open, onClose, campaignId, language = 'vi' }) {
  const { t } = useI18n()
  const [npcs, setNpcs] = useState([])
  const [powerSystem, setPowerSystem] = useState(null)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const fetchNpcs = async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      const { fetchNpcMinds, fetchCampaignPowerSystem } = await import('../../api')
      const [npcData, psData] = await Promise.allSettled([
        fetchNpcMinds(campaignId),
        fetchCampaignPowerSystem(campaignId),
      ])
      setNpcs(npcData.status === 'fulfilled' ? (npcData.value || []) : [])
      setPowerSystem(psData.status === 'fulfilled' ? (psData.value || null) : null)
    } catch {
      setNpcs([])
      setPowerSystem(null)
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
        {loading && (
          <p className="text-center text-[var(--text-tertiary)] text-sm py-8">{t('generic.loading')}</p>
        )}

        {!loading && npcs.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[var(--text-tertiary)] text-sm">{t('npc.empty')}</p>
          </div>
        )}

        {npcs.map((npc, i) => (
          <NpcCard
            key={i}
            npc={npc}
            powerSystem={powerSystem}
            language={language}
            expanded={expanded === i}
            onToggle={() => setExpanded(expanded === i ? null : i)}
          />
        ))}
      </div>
    </Modal>
  )
}
