import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useGameStore, persistCampaignState } from '../store'
import { fetchScenarios, exportScenario, fetchCampaigns, createCampaign, checkNeo4j, deleteCampaign, deleteScenario } from '../api'

const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const PlayIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)
const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
)
const ExportIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
  </svg>
)
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)
const EditIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

export default function Home() {
  const { t } = useI18n()
  const { scenarios, setScenarios } = useGameStore()
  const navigate = useNavigate()
  const [campaignsMap, setCampaignsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

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
      .catch((err) => {
        setLoadError(err?.message || t('error.backendOffline'))
      })
      .finally(() => setLoading(false))
  }, [])

  const warnIfNeo4jDown = async () => {
    const ok = await checkNeo4j()
    if (!ok) alert(t('error.neo4jDown'))
  }

  const playCampaign = async (scenario) => {
    try {
      await warnIfNeo4jDown()
      const campaigns = campaignsMap[scenario.id] || []
      if (campaigns.length > 0) {
        persistCampaignState(campaigns[0].id, { scenario })
        navigate(`/play/${campaigns[0].id}`)
      } else {
        const { campaign, scenario: scenarioData } = await createCampaign(scenario.id)
        persistCampaignState(campaign.id, { scenario: scenarioData })
        navigate(`/play/${campaign.id}`)
      }
    } catch {
      alert(t('error.createFailed'))
    }
  }

  const startNewCampaign = async (scenario) => {
    if (!window.confirm(t('error.newAdventure'))) return
    try {
      await warnIfNeo4jDown()
      const { campaign, scenario: scenarioData } = await createCampaign(scenario.id)
      persistCampaignState(campaign.id, { scenario: scenarioData })
      navigate(`/play/${campaign.id}`)
    } catch {
      alert(t('error.createFailed'))
    }
  }

  const handleDeleteAdventures = async (scenarioId) => {
    const campaigns = campaignsMap[scenarioId] || []
    if (campaigns.length === 0) return
    if (!confirm(t('error.deleteAdventures', { count: campaigns.length }))) return
    try {
      for (const c of campaigns) await deleteCampaign(scenarioId, c.id)
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
    } catch {
      alert(t('generic.error'))
    }
  }

  return (
    <div className="bg-[var(--bg-base)]">
      {/* Hero */}
      <div className="border-b border-[var(--border-subtle)]">
        <div className="max-w-2xl mx-auto px-4 py-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--border-default)] bg-[var(--accent-muted)] text-[var(--text-secondary)] text-xs font-medium mb-4">
            <span className="status-dot status-dot-live" />
            <span>AI Narrative · Neo4j Graph</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)] mb-3 tracking-tight">
            {t('home.title')}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed max-w-xl mx-auto mb-6">
            {t('home.subtitle')}
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[rgba(200,200,216,0.32)] bg-[rgba(200,200,216,0.15)] text-[var(--text-primary)] font-semibold text-sm hover:bg-[rgba(200,200,216,0.22)] hover:border-[rgba(200,200,216,0.48)] transition-all duration-200"
          >
            <PlusIcon />
            {t('home.cta')}
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t('home.scenarios')}</h2>
            <span className="text-[10px] font-mono text-[var(--text-tertiary)] bg-[var(--accent-muted)] px-1.5 py-0.5 rounded-full border border-[var(--border-subtle)]">
              {scenarios.length}
            </span>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="card p-4 space-y-2">
                <div className="skeleton h-4 w-3/4 rounded" />
                <div className="skeleton h-3 w-1/2 rounded" />
                <div className="skeleton h-10 w-full rounded" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && loadError && (
          <div className="card p-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--error)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-secondary)] font-medium mb-1">{t('error.backendOffline')}</p>
            <p className="text-xs text-[var(--text-tertiary)] mb-4">{loadError}</p>
            <button
              onClick={() => { setLoadError(null); setLoading(true); fetchScenarios().then((data) => { setScenarios(data); setLoading(false) }).catch((err) => { setLoadError(err?.message || t('error.backendOffline')); setLoading(false) }) }}
              className="px-4 py-2 rounded-xl border border-[var(--border-default)] bg-[var(--accent-muted)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--accent)]/20 transition-all"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !loadError && scenarios.length === 0 && (
          <div className="card p-8 text-center">
            <div className="w-10 h-10 rounded-xl bg-[var(--accent-muted)] border border-[var(--border-default)] flex items-center justify-center mx-auto mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--text-tertiary)]">
                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <p className="text-sm text-[var(--text-secondary)] font-medium mb-1">{t('home.empty')}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{t('home.emptyHint')}</p>
          </div>
        )}

        {/* Scenario list */}
        {!loading && scenarios.length > 0 && (
          <div className="space-y-3">
            {scenarios.map((s, idx) => {
              const campaigns = campaignsMap[s.id] || []
              return (
                <div
                  key={s.id}
                  className="card p-4 hover:border-[var(--border-strong)] transition-all duration-200"
                  style={{ animationDelay: `${idx * 60}ms` }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-mono text-[var(--text-disabled)] mb-0.5 uppercase tracking-widest">
                        {s.id.split('-')[0]}
                      </div>
                      <h3 className="text-base font-semibold text-[var(--text-primary)] truncate">{s.title}</h3>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 line-clamp-2 leading-relaxed">
                        {s.description || s.tone_instructions || ''}
                      </p>
                      {/* Identity badges */}
                      {(s.protagonist_name || s.narrative_pov || s.writing_style) && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {s.protagonist_name && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--accent-muted)] border border-[var(--border-subtle)] text-[var(--accent)] font-medium">
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="inline mr-1" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                              {s.protagonist_name}
                            </span>
                          )}
                          {s.narrative_pov && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--info)] border border-[rgba(96,165,250,0.2)] text-[var(--info)] font-medium">
                              {s.narrative_pov === 'first_person' ? 'Ngôi 1' :
                               s.narrative_pov === 'second_person' ? 'Ngôi 2' :
                               s.narrative_pov === 'third_person' ? 'Ngôi 3' :
                               s.narrative_pov === 'omniscient' ? 'Toàn Biết' :
                               s.narrative_pov === 'multiple_pov' ? 'Đa Nhân Vật' : s.narrative_pov}
                            </span>
                          )}
                          {s.writing_style && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--purple)] border border-[rgba(139,92,246,0.2)] text-[var(--purple)] font-medium">
                              {s.writing_style === 'chinh_thong' ? 'Chính Thống' :
                               s.writing_style === 'hao_sang' ? 'Hào Sảng' :
                               s.writing_style === 'lanh_khot' ? 'Lãnh Khốc' :
                               s.writing_style === 'tho_mong' ? 'Thơ Mộng' :
                               s.writing_style === 'hai_huoc' ? 'Hài Hước' :
                               s.writing_style === 'kich_tinh' ? 'Kịch Tính' : s.writing_style}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2 pt-2.5 border-t border-[var(--border-subtle)]">
                    <button
                      onClick={() => playCampaign(s)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl border border-[rgba(200,200,216,0.32)] bg-[rgba(200,200,216,0.15)] text-[var(--text-primary)] font-semibold text-sm hover:bg-[rgba(200,200,216,0.22)] hover:border-[rgba(200,200,216,0.48)] transition-all duration-150"
                    >
                      <PlayIcon />
                      {campaigns.length > 0 ? t('generic.play') : t('scenario.submit')}
                    </button>

                    {campaigns.length > 0 && (
                      <button
                        onClick={() => startNewCampaign(s)}
                        className="px-3 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] border border-[var(--border-default)] hover:bg-[var(--accent-muted)] hover:text-[var(--text-primary)] transition-all duration-150"
                        title={t('generic.newAdventure')}
                      >
                        {t('generic.new')}
                      </button>
                    )}

                    <button
                      onClick={() => navigate(`/edit/${s.id}`)}
                      className="p-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all duration-150"
                      title={t('generic.edit')}
                    >
                      <EditIcon />
                    </button>

                    <button
                      onClick={() => exportScenario(s.id, s.title).catch(() => alert(t('error.exportFailed')))}
                      className="p-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] transition-all duration-150"
                      title={t('generic.export')}
                    >
                      <ExportIcon />
                    </button>

                    {campaigns.length > 0 && (
                      <button
                        onClick={() => handleDeleteAdventures(s.id)}
                        className="p-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] hover:border-[rgba(248,113,113,0.2)] transition-all duration-150"
                        title={`${t('generic.delete')} ${t('nav.library')}`}
                      >
                        <RefreshIcon />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeleteScenario(s.id)}
                      className="p-2 rounded-xl border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] hover:border-[rgba(248,113,113,0.2)] transition-all duration-150"
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
