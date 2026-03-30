import { useState } from 'react'
import Modal from '../UI/Modal'
import { useI18n } from '../../i18n'

const PRESETS = [
  { labelKey: 'timeskip.1hour', seconds: 3600 },
  { labelKey: 'timeskip.8hours', seconds: 28800 },
  { labelKey: 'timeskip.1day', seconds: 86400 },
  { labelKey: 'timeskip.3days', seconds: 259200 },
  { labelKey: 'timeskip.1week', seconds: 604800 },
  { labelKey: 'timeskip.1month', seconds: 2592000 },
]

export default function TimeskipModal({ open, onClose, campaignId, onTimeskip }) {
  const { t } = useI18n()
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
    <Modal open={open} onClose={() => { onClose(); reset() }} title={t('panel.timeskip')} size="md">
      <div className="p-4 space-y-4">
        {!summary ? (
          <>
            <p className="text-sm text-[var(--text-tertiary)] font-light leading-relaxed">
              {t('timeskip.description')}
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
                  {t(p.labelKey)}
                </button>
              ))}
            </div>
            <button
              onClick={handleTimeskip}
              disabled={!selected || loading}
              className="w-full btn btn-primary"
            >
              {loading ? (
                <><svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>{t('timeskip.worldEvolving')}</>
              ) : t('timeskip.execute', { label: selected ? t(selected.labelKey) : '' })}
            </button>
          </>
        ) : (
          <>
            <div className="text-center">
              <span className="text-[10px] uppercase tracking-widest text-[var(--text-tertiary)] font-bold">
                {selected ? `${t(selected.labelKey)} ${t('timeskip.passed')}` : t('timeskip.passed')}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <p className="text-[var(--text-secondary)] text-sm font-light leading-relaxed italic">
                {summary}
              </p>
            </div>
            <button onClick={() => { onClose(); reset() }} className="w-full btn btn-secondary">
              {t('timeskip.continue')}
            </button>
          </>
        )}
      </div>
    </Modal>
  )
}
