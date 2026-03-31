import { useEffect, useState, useRef } from 'react'
import { useI18n } from '../i18n'
import { useGameStore } from '../store'
import { updateProfile, changePassword, deleteAccount, fetchUserStats } from '../api'

// ---- Avatar picker ----
const AVATAR_COLORS = [
  { bg: '#1a1a2e', border: '#4a4a8a', text: '#a0a0ff' },
  { bg: '#2d1b3d', border: '#7b3fa0', text: '#d4a0ff' },
  { bg: '#1b2d1b', border: '#3a7a3a', text: '#90d090' },
  { bg: '#2d1b1b', border: '#8a3a3a', text: '#ff9090' },
  { bg: '#1b2d2d', border: '#3a7a7a', text: '#90d0d0' },
  { bg: '#2d2d1b', border: '#8a8a3a', text: '#d0d090' },
]
const AVATAR_EMOJIS = ['🧙', '🧝', '🧛', '🧚', '🦊', '🐉', '⚔️', '🗡️', '🏹', '🔮', '🌙', '⭐', '🌊', '🔥', '❄️', '⚡', '🌿', '🌸', '🎭', '👑']

function AvatarPicker({ value, onChange }) {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef()

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const raw = typeof value === 'string' ? value.trim() : ''
  const isEmojiAvatar = /^e:/i.test(raw)
  const emoji = isEmojiAvatar ? raw.slice(2) : null
  const colorKey = (() => {
    if (!raw) return 65
    const idx = isEmojiAvatar ? 2 : 0
    const cp = raw.codePointAt(idx)
    return cp !== undefined && !Number.isNaN(cp) ? cp : 65
  })()
  const { bg, border, text } = AVATAR_COLORS[Math.floor(colorKey % AVATAR_COLORS.length)]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl transition-transform hover:scale-105 border-2"
        style={{ background: bg, borderColor: border, color: text, textShadow: emoji ? 'none' : '0 0 8px currentColor' }}
      >
        {emoji ? (
          <span style={{ fontSize: '1.5rem', color: '#f4f4f8', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.45))' }}>{emoji}</span>
        ) : (
          <span>{String.fromCodePoint(raw.charCodeAt(0) || 65)}</span>
        )}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-50 p-3 rounded-xl border border-[var(--border-default)] w-56" style={{ background: 'var(--bg-elevated)' }}>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{t('profile.backgroundColor')}</p>
          <div className="grid grid-cols-6 gap-1.5 mb-3">
            {AVATAR_COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => { onChange(String.fromCharCode(65 + i)); setOpen(false) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-transform hover:scale-110"
                style={{ background: c.bg, borderColor: c.border, borderWidth: 2, color: c.text }}
              >
                {String.fromCharCode(65 + i)}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider mb-2">{t('profile.emoji')}</p>
          <div className="grid grid-cols-5 gap-1">
            {AVATAR_EMOJIS.map((e) => (
              <button
                key={e}
                onClick={() => { onChange(`e:${e}`); setOpen(false) }}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-[var(--accent-muted)] transition-colors"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---- Toast ----
function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${
      type === 'error' ? 'bg-[var(--error-muted)] border-[var(--error)] text-[var(--error)]' :
      'bg-[var(--success-muted)] border-[var(--success)] text-[var(--success)]'
    }`}>
      {message}
    </div>
  )
}

// ---- Confirm modal ----
function ConfirmModal({ title, message, onConfirm, onCancel }) {
  const { t } = useI18n()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="card p-6 max-w-sm w-full mx-4 space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)]">{title}</h3>
        <p className="text-sm text-[var(--text-secondary)]">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn btn-ghost text-sm">{t('generic.cancel')}</button>
          <button onClick={onConfirm} className="btn btn-danger text-sm">{t('profile.confirmDelete')}</button>
        </div>
      </div>
    </div>
  )
}

export default function Profile() {
  const { t } = useI18n()
  const { user, updateUser, logout } = useGameStore()
  const [stats, setStats] = useState({ total_scenarios: 0, total_campaigns: 0, total_events: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  const [editUsername, setEditUsername] = useState('')
  const [editBio, setEditBio] = useState('')
  const [editAvatar, setEditAvatar] = useState('')
  const [editingProfile, setEditingProfile] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)

  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwSuccess, setPwSuccess] = useState(false)
  const [changingPw, setChangingPw] = useState(false)
  const [pwOpen, setPwOpen] = useState(false)

  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    fetchUserStats().then(setStats).catch(() => {}).finally(() => setLoadingStats(false))
  }, [])

  useEffect(() => {
    if (user) {
      setEditUsername(user.username || '')
      setEditBio(user.bio || '')
      setEditAvatar(user.avatar || 'A')
    }
  }, [user])

  const handleSaveProfile = async () => {
    if (!editUsername.trim()) {
      setToast({ message: t('profile.errorUsernameEmpty'), type: 'error' })
      return
    }
    setEditingProfile(true)
    try {
      const updated = await updateProfile({ username: editUsername.trim(), bio: editBio.trim() || null, avatar: editAvatar })
      updateUser(updated)
      setToast({ message: t('profile.profileSaved'), type: 'success' })
      setProfileSaved(true)
      setTimeout(() => { setProfileSaved(false); setEditingProfile(false) }, 2000)
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
      setEditingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    setPwError('')
    if (!oldPw) { setPwError(t('profile.errorCurrentPasswordRequired')); return }
    if (newPw.length < 6) { setPwError(t('profile.newPasswordMin')); return }
    if (newPw !== confirmPw) { setPwError(t('profile.passwordMismatch')); return }
    setChangingPw(true)
    try {
      await changePassword(oldPw, newPw)
      setOldPw('')
      setNewPw('')
      setConfirmPw('')
      setPwSuccess(true)
      setTimeout(() => { setPwSuccess(false); setPwOpen(false) }, 3000)
    } catch (e) {
      setPwError(e.message)
    } finally {
      setChangingPw(false)
    }
  }

  const handleDeleteAccount = async () => {
    setDeleting(true)
    try {
      await deleteAccount()
      logout()
      window.location.href = '/'
    } catch (e) {
      setToast({ message: e.message, type: 'error' })
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const createdDate = user?.created_at ? new Date(user.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' }) : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <h1 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t('nav.profile')}</h1>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {showDeleteModal && (
        <ConfirmModal
          title={t('profile.deleteAccount')}
          message={t('profile.deleteAccountMessage')}
          onConfirm={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Header */}
      <div className="card p-5">
        {!editingProfile ? (
          <div className="flex items-center gap-3">
            {user?.avatar ? (
              <AvatarPicker value={user.avatar} onChange={() => {}} />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-default)] flex items-center justify-center text-xl font-bold text-[var(--text-tertiary)]">
                {String.fromCodePoint(user?.username?.charCodeAt(0) || 65)}
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-0.5">
              <h1 className="text-base font-bold text-[var(--text-primary)] truncate">{user?.username || '—'}</h1>
              <p className="text-sm text-[var(--text-tertiary)] truncate">{user?.email || '—'}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {user?.is_admin && <span className="badge badge-warning text-[8px]">Admin</span>}
                {createdDate && <span className="text-[10px] text-[var(--text-disabled)]">{t('profile.joined', { date: createdDate })}</span>}
              </div>
            </div>
            <button onClick={() => setEditingProfile(true)} className="btn btn-ghost text-xs shrink-0">
              {t('profile.editProfile')}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <AvatarPicker value={editAvatar} onChange={setEditAvatar} />
              <div className="flex-1 space-y-2">
                <input
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  maxLength={50}
                  className="input w-full text-sm"
                  placeholder={t('profile.usernamePlaceholder')}
                />
                <textarea
                  value={editBio}
                  onChange={(e) => setEditBio(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className="input w-full text-sm resize-none"
                  placeholder={t('profile.bioPlaceholder')}
                />
                <p className="text-[10px] text-[var(--text-disabled)] text-right">{editBio.length}/500</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditingProfile(false)} className="btn btn-ghost text-xs">{t('generic.cancel')}</button>
              <button onClick={handleSaveProfile} disabled={profileSaved} className={`btn btn-primary text-xs ${profileSaved ? 'opacity-80' : ''}`}>
                {profileSaved ? t('profile.saved') : t('profile.saveProfile')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="card p-5">
        <h2 className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('profile.stats')}</h2>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: t('profile.worlds'), value: stats.total_scenarios, color: 'text-[var(--accent)]' },
            { label: t('profile.adventures'), value: stats.total_campaigns, color: 'text-[var(--info)]' },
            { label: t('profile.actions'), value: stats.total_events, color: 'text-[var(--warning)]' },
          ].map((s) => (
            <div key={s.label} className="text-center p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <div className={`text-lg font-bold ${s.color}`}>{loadingStats ? '—' : s.value}</div>
              <div className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Password */}
      <div className="card p-5">
        <h2 className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">{t('profile.changePassword')}</h2>
        {!pwOpen ? (
          <button onClick={() => setPwOpen(true)} className="btn btn-ghost text-xs w-full">{t('profile.changePassword')}</button>
        ) : (
          <div className="space-y-2">
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-tertiary)]">{t('profile.currentPassword')}</label>
              <input type="password" value={oldPw} onChange={(e) => setOldPw(e.target.value)} className="input w-full text-sm" placeholder="••••••••" />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-tertiary)]">{t('profile.newPassword')}</label>
              <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className="input w-full text-sm" placeholder={t('profile.newPasswordPlaceholder')} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-[var(--text-tertiary)]">{t('profile.confirmNewPassword')}</label>
              <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className="input w-full text-sm" placeholder={t('profile.confirmNewPasswordPlaceholder')} />
            </div>
            {pwError && <p className="text-xs text-[var(--error)]">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-[var(--success)]">{t('profile.passwordChanged')}</p>}
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setPwOpen(false); setOldPw(''); setNewPw(''); setConfirmPw(''); setPwError('') }} className="btn btn-ghost text-xs">{t('generic.cancel')}</button>
              <button onClick={handleChangePassword} disabled={changingPw} className="btn btn-primary text-xs">{changingPw ? t('profile.changingPassword') : t('profile.changePassword')}</button>
            </div>
          </div>
        )}
      </div>

      {/* Danger zone */}
      <div className="card p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-tertiary)] flex-1">{t('profile.deleteAccountDesc')}</p>
          <button onClick={() => setShowDeleteModal(true)} className="btn btn-danger text-xs shrink-0">
            {t('profile.deleteAccountLabel')}
          </button>
        </div>
      </div>
    </div>
  )
}
