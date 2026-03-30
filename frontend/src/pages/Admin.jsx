import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n'
import {
  fetchAdminStats,
  fetchAdminUsers,
  deleteAdminUser,
  fetchAdminUser,
  updateAdminUser,
  deleteAdminScenario,
  deleteAdminCampaign,
  fetchAdminScenarios,
} from '../api'

const PAGE_SIZE = 20

// ---- Confirm modal ----
function ConfirmModal({ title, message, onConfirm, onCancel, loading, overlayZClass = 'z-50' }) {
  const { t } = useI18n()
  return (
    <div className={`fixed inset-0 ${overlayZClass} flex items-center justify-center bg-black/60 backdrop-blur-sm`}>
      <div className="card p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn btn-ghost text-sm" disabled={loading}>{t('generic.cancel')}</button>
          <button onClick={onConfirm} className="btn btn-danger text-sm" disabled={loading}>
            {loading ? t('admin.deleting') : t('admin.confirmDelete')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---- Toast ----
function Toast({ message, type, onClose, zClass = 'z-50' }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 ${zClass} px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${
      type === 'error'
        ? 'bg-[var(--error-muted)] border-[var(--error)] text-[var(--error)]'
        : 'bg-[var(--success-muted)] border-[var(--success)] text-[var(--success)]'
    }`}>
      {message}
    </div>
  )
}

// ---- User detail drawer ----
function UserDrawer({ userId, onClose, onUpdated, onDeleted }) {
  const { t, locale } = useI18n()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editUsername, setEditUsername] = useState('')
  const [isAdmin, setIsAdmin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!userId) return
    fetchAdminUser(userId)
      .then((u) => {
        setUser(u)
        setEditUsername(u.username)
        setIsAdmin(u.is_admin)
      })
      .catch(() => setToast({ message: t('admin.loadFailed'), type: 'error' }))
      .finally(() => setLoading(false))
  }, [userId])

  const handleSave = async () => {
    if (!editUsername.trim()) {
      setToast({ message: t('admin.usernameEmpty'), type: 'error' })
      return
    }
    setSaving(true)
    try {
      const updated = await updateAdminUser(userId, { username: editUsername.trim(), is_admin: isAdmin })
      setUser(updated)
      onUpdated(updated)
      setToast({ message: t('admin.saved'), type: 'success' })
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteAdminUser(userId)
      onDeleted(userId)
      onClose()
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
      setConfirmDelete(false)
    }
  }

  const createdDate = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })
    : null
  const lastLoginDate = user?.last_login
    ? new Date(user.last_login).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  /* Portal to document.body so fixed + full viewport height are not clipped by layout/main (flex ancestors). */
  const drawer = (
    <>
      <div
        className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm min-h-[100dvh]"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed top-0 right-0 z-[110] h-[100dvh] w-80 overflow-y-auto overscroll-contain border-l border-[var(--border-default)] px-5 py-6 pb-8"
        style={{ background: 'var(--bg-elevated)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-user-drawer-title"
      >
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} zClass="z-[115]" />}
        {confirmDelete && (
          <ConfirmModal
            title={t('admin.deleteAccount')}
            message={t('admin.deleteUserConfirm')}
            onConfirm={handleDelete}
            onCancel={() => setConfirmDelete(false)}
            loading={saving}
            overlayZClass="z-[120]"
          />
        )}

        <div className="flex items-center justify-between mb-5">
          <h3 id="admin-user-drawer-title" className="text-sm font-bold text-[var(--text-primary)]">{t('admin.userDetails')}</h3>
          <button onClick={onClose} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading && <div className="space-y-2"><div className="skeleton h-4 w-3/4" /><div className="skeleton h-4 w-1/2" /><div className="skeleton h-4 w-2/3" /></div>}

        {!loading && user && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold border-2"
                style={{
                  background: '#1a1a2e',
                  borderColor: '#4a4a8a',
                  color: '#a0a0ff',
                  textShadow: '0 0 8px currentColor',
                }}>
                {user.avatar?.startsWith('e:') ? user.avatar.slice(2) : (user.username.charAt(0).toUpperCase())}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{user.username}</p>
                <p className="text-xs text-[var(--text-tertiary)]">{user.email}</p>
                {user.is_admin && <span className="badge badge-warning text-[8px]">Admin</span>}
              </div>
            </div>

            {user.bio && (
              <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-default)] rounded-lg p-2 mb-4">{user.bio}</p>
            )}

            <div className="space-y-1 mb-5">
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">{t('admin.joined')}</span>
                <span className="text-[var(--text-secondary)]">{createdDate || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">{t('admin.lastLogin')}</span>
                <span className="text-[var(--text-secondary)]">{lastLoginDate || '—'}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">{t('admin.stats.worlds')}</span>
                <span className="text-[var(--accent)]">{user.stats?.total_scenarios ?? 0}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-tertiary)]">{t('admin.stats.campaigns')}</span>
                <span className="text-[var(--info)]">{user.stats?.total_campaigns ?? 0}</span>
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-[var(--border-subtle)]">
              <div className="space-y-1">
                <label className="text-xs text-[var(--text-tertiary)]">{t('admin.table.user')}</label>
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  maxLength={50}
                  className="input w-full text-sm"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-tertiary)]">{isAdmin ? t('admin.isAdmin') : t('admin.isRegularUser')}</p>
                  <p className="text-[10px] text-[var(--text-disabled)]">{isAdmin ? t('admin.isAdmin') : t('admin.isRegularUser')}</p>
                </div>
                <button
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isAdmin ? 'bg-[var(--accent)]' : 'bg-[var(--border-default)]'}`}
                >
                  <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${isAdmin ? 'translate-x-5' : 'translate-x-1'}`} />
                </button>
              </div>

              <button onClick={handleSave} disabled={saving} className="btn btn-primary w-full text-sm">
                {saving ? t('admin.saving') : t('admin.save')}
              </button>
            </div>

            <div className="pt-3 mt-3 border-t border-[var(--border-subtle)]">
              <button
                onClick={() => setConfirmDelete(true)}
                className="btn btn-danger w-full text-sm"
              >
                {t('admin.deleteAccount')}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  )

  return typeof document !== 'undefined' ? createPortal(drawer, document.body) : null
}

export default function Admin() {
  const { t, locale } = useI18n()
  const [stats, setStats] = useState({ total_users: 0, total_scenarios: 0, total_campaigns: 0, total_events: 0 })
  const [loadingStats, setLoadingStats] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')

  // Users state
  const [allUsers, setAllUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [userSearch, setUserSearch] = useState('')
  const [userPage, setUserPage] = useState(0)
  const [selectedUser, setSelectedUser] = useState(null)

  // Scenarios state
  const [scenarios, setScenarios] = useState([])
  const [loadingScenarios, setLoadingScenarios] = useState(true)
  const [scenarioPage, setScenarioPage] = useState(0)
  const [scenarioSearch, setScenarioSearch] = useState('')

  // Campaigns state
  const [campaigns, setCampaigns] = useState([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  const [campaignPage, setCampaignPage] = useState(0)

  // Common
  const [toast, setToast] = useState(null)
  const [confirm, setConfirm] = useState(null) // { type, id, message }

  // Stats
  useEffect(() => {
    fetchAdminStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoadingStats(false))
  }, [])

  // Users loader
  const loadUsers = () => {
    setLoadingUsers(true)
    fetchAdminUsers()
      .then(setAllUsers)
      .catch(() => setToast({ message: t('admin.loadUsersFailed'), type: 'error' }))
      .finally(() => setLoadingUsers(false))
  }

  useEffect(() => { if (activeTab === 'users') loadUsers() }, [activeTab])

  // Scenarios loader
  const loadScenarios = () => {
    setLoadingScenarios(true)
    fetchAdminScenarios()
      .then((data) => setScenarios(Array.isArray(data) ? data : []))
      .catch(() => setToast({ message: t('admin.loadScenariosFailed'), type: 'error' }))
      .finally(() => setLoadingScenarios(false))
  }

  useEffect(() => { if (activeTab === 'scenarios') loadScenarios() }, [activeTab])

  // Campaigns loader
  const loadCampaigns = () => {
    setLoadingCampaigns(true)
    fetchAdminScenarios()
      .then((data) => {
        const all = []
        ;(Array.isArray(data) ? data : []).forEach((s) => {
          if (s.campaigns) s.campaigns.forEach((c) => all.push({ ...c, scenario_title: s.title }))
        })
        setCampaigns(all)
      })
      .catch(() => setToast({ message: t('admin.loadCampaignsFailed'), type: 'error' }))
      .finally(() => setLoadingCampaigns(false))
  }

  useEffect(() => { if (activeTab === 'campaigns') loadCampaigns() }, [activeTab])

  // Filtered + paginated helpers
  const filterPage = (list, search, page) =>
    list.filter((item) => {
      const q = search.toLowerCase()
      return (
        (item.username || '').toLowerCase().includes(q) ||
        (item.email || '').toLowerCase().includes(q) ||
        (item.title || '').toLowerCase().includes(q)
      )
    }).slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const filteredUsers = filterPage(allUsers, userSearch, userPage)
  const filteredScenarios = filterPage(scenarios, scenarioSearch, scenarioPage)
  const totalUserPages = Math.ceil(
    allUsers.filter((u) =>
      (u.username + u.email).toLowerCase().includes(userSearch.toLowerCase())
    ).length / PAGE_SIZE
  )
  const totalScenarioPages = Math.ceil(
    scenarios.filter((s) => (s.title || '').toLowerCase().includes(scenarioSearch.toLowerCase())).length / PAGE_SIZE
  )

  // Delete actions
  const handleDeleteScenario = (scenarioId, title) => {
    setConfirm({
      type: 'scenario',
      id: scenarioId,
      message: t('admin.deleteScenarioConfirm'),
    })
  }

  const handleDeleteCampaign = (campaignId, name) => {
    setConfirm({
      type: 'campaign',
      id: campaignId,
      message: t('admin.deleteCampaignConfirm'),
    })
  }

  const executeDelete = async () => {
    try {
      if (confirm.type === 'user') await deleteAdminUser(confirm.id)
      if (confirm.type === 'scenario') await deleteAdminScenario(confirm.id)
      if (confirm.type === 'campaign') await deleteAdminCampaign(confirm.id)
      setToast({ message: t('admin.deleted'), type: 'success' })
      if (confirm.type === 'user') setAllUsers((p) => p.filter((u) => u.id !== confirm.id))
      if (confirm.type === 'scenario') setScenarios((p) => p.filter((s) => s.id !== confirm.id))
      if (confirm.type === 'campaign') setCampaigns((p) => p.filter((c) => c.id !== confirm.id))
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
    } finally {
      setConfirm(null)
    }
  }

  const TABS = [
    { id: 'overview', label: t('admin.overview') },
    { id: 'users', label: t('admin.users') },
    { id: 'scenarios', label: t('admin.scenarios') },
    { id: 'campaigns', label: t('admin.campaigns') },
  ]

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {confirm && (
        <ConfirmModal
          title={t('admin.confirmDelete')}
          message={confirm.message}
          onConfirm={executeDelete}
          onCancel={() => setConfirm(null)}
          loading={false}
        />
      )}
      {selectedUser && (
        <UserDrawer
          userId={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUpdated={(updated) => setAllUsers((p) => p.map((u) => u.id === updated.id ? updated : u))}
          onDeleted={(id) => setAllUsers((p) => p.filter((u) => u.id !== id))}
        />
      )}

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">{t('nav.admin')}</h1>
        <p className="text-sm text-[var(--text-tertiary)]">{t('admin.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-subtle)] w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-[var(--accent-muted)] text-[var(--text-primary)]'
                : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('admin.stats.worlds'), value: stats.total_scenarios, color: 'text-[var(--accent)]' },
              { label: t('admin.stats.campaigns'), value: stats.total_campaigns, color: 'text-[var(--info)]' },
              { label: t('admin.stats.users'), value: stats.total_users, color: 'text-[var(--success)]' },
              { label: t('admin.stats.events'), value: stats.total_events, color: 'text-[var(--warning)]' },
            ].map((s) => (
              <div key={s.label} className="card p-4 text-center">
                <div className={`text-2xl font-bold ${s.color}`}>{loadingStats ? '—' : s.value}</div>
                <div className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h2 className="text-sm font-semibold text-[var(--text-primary)] mb-3">{t('admin.quickLinks')}</h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: t('admin.manageUsers'), count: stats.total_users, tab: 'users' },
                { label: t('admin.manageScenarios'), count: stats.total_scenarios, tab: 'scenarios' },
                { label: t('admin.manageCampaigns'), count: stats.total_campaigns, tab: 'campaigns' },
                { label: t('admin.viewEvents'), count: stats.total_events, tab: 'overview' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => item.tab !== 'overview' && setActiveTab(item.tab)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${
                    item.tab !== 'overview'
                      ? 'hover:bg-[var(--accent-muted)] cursor-pointer'
                      : 'opacity-50 cursor-default'
                  }`}
                >
                  <div className="text-sm font-medium text-[var(--text-primary)]">{item.label}</div>
                  <div className="ml-auto text-xs text-[var(--text-tertiary)]">{item.count}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== USERS ===== */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              value={userSearch}
              onChange={(e) => { setUserSearch(e.target.value); setUserPage(0) }}
              placeholder={t('admin.searchUsers')}
              className="input flex-1 text-sm"
            />
            <button onClick={loadUsers} className="btn btn-ghost text-sm shrink-0">{t('generic.retry')}</button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {[t('admin.table.user'), t('admin.table.email'), t('admin.table.role'), t('admin.table.joined'), t('admin.table.lastLogin'), ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingUsers && [1, 2, 3].map((i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td></tr>
                  ))}
                  {!loadingUsers && filteredUsers.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">{t('admin.noUsers')}</td></tr>
                  )}
                  {!loadingUsers && filteredUsers.map((user) => {
                    const lastLogin = user.last_login
                      ? new Date(user.last_login).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: '2-digit' })
                      : '—'
                    const created = new Date(user.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: '2-digit' })
                    return (
                      <tr key={user.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--accent-muted)] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                              style={{ background: '#1a1a2e', color: '#a0a0ff', border: '1px solid #4a4a8a' }}>
                              {user.avatar?.startsWith('e:') ? user.avatar.slice(2) : user.username.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-[var(--text-primary)]">{user.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[var(--text-secondary)]">{user.email}</td>
                        <td className="px-4 py-3">
                          {user.is_admin
                            ? <span className="badge badge-warning text-[8px]">Admin</span>
                            : <span className="text-[var(--text-disabled)] text-xs">{t('admin.roleUser')}</span>}
                        </td>
                        <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs">{created}</td>
                        <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs">{lastLogin}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              onClick={() => setSelectedUser(user.id)}
                              className="px-2 py-1 rounded text-xs text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all"
                            >
                              {t('admin.details')}
                            </button>
                            <button
                              onClick={() => setConfirm({ type: 'user', id: user.id, message: t('admin.deleteUserConfirm') })}
                              className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] transition-all"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {totalUserPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={userPage === 0} onClick={() => setUserPage((p) => p - 1)}
                className="btn btn-ghost text-xs disabled:opacity-30">{t('admin.prev')}</button>
              <span className="text-xs text-[var(--text-tertiary)]">{userPage + 1} / {totalUserPages}</span>
              <button disabled={userPage >= totalUserPages - 1} onClick={() => setUserPage((p) => p + 1)}
                className="btn btn-ghost text-xs disabled:opacity-30">{t('admin.next')}</button>
            </div>
          )}
        </div>
      )}

      {/* ===== SCENARIOS ===== */}
      {activeTab === 'scenarios' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              value={scenarioSearch}
              onChange={(e) => { setScenarioSearch(e.target.value); setScenarioPage(0) }}
              placeholder={t('admin.searchUsers')}
              className="input flex-1 text-sm"
            />
            <button onClick={loadScenarios} className="btn btn-ghost text-sm shrink-0">{t('generic.retry')}</button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {[t('admin.table.world'), t('admin.table.creator'), t('admin.table.language'), t('admin.table.campaigns'), t('admin.table.createdAt'), ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingScenarios && [1, 2, 3].map((i) => (
                    <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td></tr>
                  ))}
                  {!loadingScenarios && filteredScenarios.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-[var(--text-tertiary)]">{t('admin.noScenarios')}</td></tr>
                  )}
                  {!loadingScenarios && filteredScenarios.map((s) => (
                    <tr key={s.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--accent-muted)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{s.title || s.name || '—'}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{s.user_id ? s.user_id.slice(0, 8) + '...' : '—'}</td>
                      <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs uppercase">{s.language || 'en'}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{s.campaigns?.length ?? 0}</td>
                      <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs">{new Date(s.created_at || s.createdAt || Date.now()).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteScenario(s.id, s.title || s.name)}
                          className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] transition-all"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {totalScenarioPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={scenarioPage === 0} onClick={() => setScenarioPage((p) => p - 1)}
                className="btn btn-ghost text-xs disabled:opacity-30">{t('admin.prev')}</button>
              <span className="text-xs text-[var(--text-tertiary)]">{scenarioPage + 1} / {totalScenarioPages}</span>
              <button disabled={scenarioPage >= totalScenarioPages - 1} onClick={() => setScenarioPage((p) => p + 1)}
                className="btn btn-ghost text-xs disabled:opacity-30">{t('admin.next')}</button>
            </div>
          )}
        </div>
      )}

      {/* ===== CAMPAIGNS ===== */}
      {activeTab === 'campaigns' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 justify-end">
            <button onClick={loadCampaigns} className="btn btn-ghost text-sm">{t('generic.retry')}</button>
          </div>

          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)]">
                    {[t('admin.table.campaign'), t('admin.table.world'), t('admin.table.createdAt'), ''].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loadingCampaigns && [1, 2, 3].map((i) => (
                    <tr key={i}><td colSpan={4} className="px-4 py-3"><div className="skeleton h-4 rounded" /></td></tr>
                  ))}
                  {!loadingCampaigns && campaigns.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-8 text-center text-[var(--text-tertiary)]">{t('admin.noCampaigns')}</td></tr>
                  )}
                  {!loadingCampaigns && campaigns.map((c) => (
                    <tr key={c.id} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--accent-muted)] transition-colors">
                      <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{c.name || c.title || '—'}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] text-xs">{c.scenario_title || '—'}</td>
                      <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs">{new Date(c.created_at || c.createdAt || Date.now()).toLocaleDateString('vi-VN', { day: '2-digit', month: 'short', year: '2-digit' })}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteCampaign(c.id, c.name || c.title)}
                          className="p-1.5 rounded text-[var(--text-tertiary)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] transition-all"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {Math.ceil(campaigns.length / PAGE_SIZE) > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={campaignPage === 0} onClick={() => setCampaignPage((p) => p - 1)}
                className="btn btn-ghost text-xs disabled:opacity-30">{t('admin.prev')}</button>
              <span className="text-xs text-[var(--text-tertiary)]">{campaignPage + 1} / {Math.ceil(campaigns.length / PAGE_SIZE)}</span>
              <button disabled={campaignPage >= Math.ceil(campaigns.length / PAGE_SIZE) - 1} onClick={() => setCampaignPage((p) => p + 1)}
                className="btn btn-ghost text-xs disabled:opacity-30">{t('admin.next')}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
