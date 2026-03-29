import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useGameStore } from '../store'
import { fetchScenarios, fetchCampaigns } from '../api'

function CampaignRow({ campaign, scenarioTitle, onDelete }) {
  const { t } = useI18n()
  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-elevated)] rounded-xl hover:bg-[var(--accent-muted)] transition-colors">
      <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] border border-[var(--border-default)] flex items-center justify-center text-[var(--text-secondary)] text-xs font-bold">
        {campaign.id?.charAt(0).toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{scenarioTitle}</p>
        <p className="text-[10px] text-[var(--text-tertiary)] font-mono">ID: {campaign.id}</p>
      </div>
      <button
        onClick={() => onDelete(campaign.id)}
        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] transition-all"
        title={t('generic.delete')}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      </button>
    </div>
  )
}

export default function Library() {
  const { t } = useI18n()
  const { scenarios, setScenarios } = useGameStore()
  const [campaignsMap, setCampaignsMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

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

  const allCampaigns = Object.entries(campaignsMap).flatMap(([scenarioId, campaigns]) =>
    campaigns.map((c) => ({ ...c, scenarioTitle: scenarios.find((s) => s.id === scenarioId)?.title || 'Unknown' }))
  )

  const filtered = filter
    ? allCampaigns.filter((c) => c.scenarioTitle.toLowerCase().includes(filter.toLowerCase()))
    : allCampaigns

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{t('nav.library')}</h1>
        <p className="text-sm text-[var(--text-tertiary)]">
          {allCampaigns.length} cuộc phiêu lưu được ghi nhận
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Tìm kiếm..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)] focus:outline-none focus:border-[var(--border-focus)]"
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-xl" />)}
        </div>
      )}

      {/* Empty */}
      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 card p-8">
          <p className="text-[var(--text-secondary)] font-medium mb-2">
            {filter ? 'Không tìm thấy cuộc phiêu lưu nào.' : 'Chưa có cuộc phiêu lưu nào.'}
          </p>
          {!filter && (
            <Link to="/create" className="btn btn-secondary btn-sm mt-3">
              {t('nav.create')}
            </Link>
          )}
        </div>
      )}

      {/* List */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((campaign) => (
            <CampaignRow
              key={campaign.id}
              campaign={campaign}
              scenarioTitle={campaign.scenarioTitle}
              onDelete={(id) => {
                // TODO: wire to delete campaign
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
