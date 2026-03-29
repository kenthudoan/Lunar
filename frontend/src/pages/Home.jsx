import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useGameStore } from '../store'
import { fetchScenarios, exportScenario, fetchCampaigns, createCampaign, checkNeo4j, deleteCampaign, deleteScenario } from '../api'

// Icon: Plus
const PlusIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

// Icon: Power (play)
const PlayIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

// Icon: Trash
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)

// Icon: Export
const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)

// Icon: Refresh
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" />
    <path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

export default function Home() {
  const { t } = useI18n()
  const { scenarios, setScenarios, setActiveScenario, setActiveCampaignId, clearMessages } = useGameStore()
  const navigate = useNavigate()
  const [campaignsMap, setCampaignsMap] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchScenarios()
      .then((data) => {
        setScenarios(data)
        data.forEach((s) =>
          fetchCampaigns(s.id)
            .then((camps) => setCampaignsMap((prev) => ({ ...prev, [s.id]: camps })))
            .catch(() => {})
        )
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const warnIfNeo4jDown = async () => {
    const ok = await checkNeo4j()
    if (!ok) {
      alert(t('error.neo4jDown'))
    }
  }

  const playCampaign = async (scenario) => {
    try {
      await warnIfNeo4jDown()
      const campaigns = campaignsMap[scenario.id] || []
      if (campaigns.length > 0) {
        setActiveScenario(scenario)
        setActiveCampaignId(campaigns[0].id)
        navigate('/play')
      } else {
        const campaign = await createCampaign(scenario.id)
        setActiveScenario(scenario)
        setActiveCampaignId(campaign.id)
        clearMessages()
        navigate('/play')
      }
    } catch {
      alert(t('error.createFailed'))
    }
  }

  const startNewCampaign = async (scenario) => {
    if (!window.confirm(t('error.newAdventure'))) return
    try {
      await warnIfNeo4jDown()
      const campaign = await createCampaign(scenario.id)
      setActiveScenario(scenario)
      setActiveCampaignId(campaign.id)
      clearMessages()
      navigate('/play')
    } catch {
      alert(t('error.createFailed'))
    }
  }

  const handleDeleteAdventures = async (scenarioId) => {
    const campaigns = campaignsMap[scenarioId] || []
    if (campaigns.length === 0) return
    if (!confirm(t('error.deleteAdventures', { count: campaigns.length }))) return
    try {
      for (const c of campaigns) {
        await deleteCampaign(scenarioId, c.id)
      }
      setCampaignsMap((prev) => ({ ...prev, [scenarioId]: [] }))
    } catch {
      alert(t('generic.error'))
    }
  }

  const handleDeleteScenario = async (scenarioId) => {
    if (!window.confirm(t('error.deleteConfirm'))) return
    try {
      await deleteScenario(scenarioId)
      setScenarios(scenarios.filter((s) => s.id !== scenarioId))
      try {
        const stored = localStorage.getItem('lunar_activeScenario')
        if (stored) {
          const parsed = JSON.parse(stored)
          if (parsed.id === scenarioId) {
            useGameStore.getState().clearSession()
          }
        }
      } catch {}
    } catch {
      alert(t('generic.error'))
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[var(--border-subtle)]">
        {/* Background texture */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-base)] via-transparent to-[var(--bg-base)]" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-radial from-[var(--accent-glow)] to-transparent opacity-40" />
        </div>

        <div className="relative max-w-3xl mx-auto px-6 py-16 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-default)] bg-[var(--accent-muted)] text-[var(--text-secondary)] text-xs font-medium mb-6">
            <span className="status-dot status-dot-live" />
            <span>AI Narrative Engine · Neo4j Knowledge Graph</span>
          </div>

          {/* Title */}
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--text-primary)] mb-4 tracking-tight">
            {t('home.title')}
          </h1>

          <p className="text-[var(--text-secondary)] text-base leading-relaxed max-w-xl mx-auto mb-10">
            {t('home.subtitle')}
          </p>

          {/* CTA */}
          <Link
            to="/create"
            className="
              inline-flex items-center gap-2 px-6 py-3 rounded-xl
              bg-[var(--accent)] text-[var(--text-inverse)]
              font-semibold text-sm
              hover:bg-[var(--accent-hover)]
              shadow-[var(--shadow-md)]
              hover:shadow-[var(--shadow-lg)]
              transition-all duration-200
            "
          >
            <PlusIcon />
            {t('home.cta')}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('home.scenarios')}</h2>
            <span className="text-xs font-mono text-[var(--text-tertiary)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
              {scenarios.length} {t('home.units')}
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="card p-6 space-y-3">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-10 w-full rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && scenarios.length === 0 && (
          <div className="card p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[var(--accent-muted)] border border-[var(--border-default)] flex items-center justify-center mx-auto mb-4">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)]">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <p className="text-[var(--text-secondary)] font-medium mb-1">{t('home.empty')}</p>
            <p className="text-[var(--text-tertiary)] text-sm">{t('home.emptyHint')}</p>
          </div>
        )}

        {/* Scenario list */}
        {!loading && scenarios.length > 0 && (
          <div className="space-y-4">
            {scenarios.map((s, idx) => {
              const campaigns = campaignsMap[s.id] || []
              return (
                <div
                  key={s.id}
                  className="card p-5 hover:border-[var(--border-strong)] transition-all duration-200"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1 min-w-0">
                      {/* Hash tag */}
                      <div className="text-[10px] font-mono text-[var(--text-tertiary)] mb-1 uppercase tracking-widest">
                        {s.id.split('-')[0]}
                      </div>
                      {/* Title */}
                      <h3 className="text-lg font-semibold text-[var(--text-primary)] truncate">
                        {s.title}
                      </h3>
                      {/* Description */}
                      <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2 leading-relaxed">
                        {s.description || s.tone_instructions || ''}
                      </p>
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-3 border-t border-[var(--border-subtle)]">
                    {/* Primary action */}
                    <button
                      onClick={() => playCampaign(s)}
                      className="
                        flex-1 flex items-center justify-center gap-2
                        px-4 py-2.5 rounded-xl
                        bg-[var(--accent)] text-[var(--text-inverse)]
                        font-semibold text-sm
                        hover:bg-[var(--accent-hover)]
                        transition-all duration-150
                      "
                    >
                      <PlayIcon />
                      {campaigns.length > 0 ? t('generic.play') : t('scenario.submit')}
                    </button>

                    {/* Secondary actions */}
                    {campaigns.length > 0 && (
                      <button
                        onClick={() => startNewCampaign(s)}
                        className="
                          px-4 py-2.5 rounded-xl
                          text-sm font-medium
                          text-[var(--text-secondary)] border border-[var(--border-default)]
                          hover:bg-[var(--accent-muted)] hover:text-[var(--text-primary)]
                          transition-all duration-150
                        "
                        title={t('generic.newAdventure')}
                      >
                        {t('generic.new')}
                      </button>
                    )}

                    {/* Icon buttons */}
                    <button
                      onClick={() => exportScenario(s.id, s.title).catch(() => alert(t('error.exportFailed')))}
                      className="
                        p-2.5 rounded-xl border border-[var(--border-subtle)]
                        text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]
                        hover:bg-[var(--accent-muted)]
                        transition-all duration-150
                      "
                      title={t('generic.export')}
                    >
                      <ExportIcon />
                    </button>

                    {campaigns.length > 0 && (
                      <button
                        onClick={() => handleDeleteAdventures(s.id)}
                        className="
                          p-2.5 rounded-xl border border-[var(--border-subtle)]
                          text-[var(--text-tertiary)] hover:text-[var(--error)]
                          hover:bg-[var(--error-muted)] hover:border-[rgba(248,113,113,0.2)]
                          transition-all duration-150
                        "
                        title={`${t('generic.delete')} ${t('nav.library')}`}
                      >
                        <RefreshIcon />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteScenario(s.id)}
                      className="
                        p-2.5 rounded-xl border border-[var(--border-subtle)]
                        text-[var(--text-tertiary)] hover:text-[var(--error)]
                        hover:bg-[var(--error-muted)] hover:border-[rgba(248,113,113,0.2)]
                        transition-all duration-150
                      "
                      title={t('generic.delete')}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
