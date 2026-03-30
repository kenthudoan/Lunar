import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useGameStore } from '../store'
import { useI18n } from '../i18n'

export default function Register() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const register = useGameStore((s) => s.register)
  const [form, setForm] = useState({ email: '', username: '', password: '', confirmPassword: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (form.password !== form.confirmPassword) {
      setError(t('error.passwordMismatch'))
      return
    }
    if (form.password.length < 6) {
      setError(t('error.passwordTooShort'))
      return
    }
    setLoading(true)
    try {
      await register({ email: form.email, username: form.username, password: form.password })
      navigate('/')
    } catch (err) {
      setError(err.message || t('error.registerFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--accent-muted)] border border-[var(--border-default)] mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--accent)]">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">{t('register.title')}</h1>
          <p className="text-sm text-[var(--text-secondary)]">{t('register.subtitle')}</p>
        </div>

        {/* Form */}
        <div className="card p-6 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                {t('register.email')}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                required
                placeholder="you@example.com"
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[var(--accent-muted)] border border-[var(--border-default)]
                  text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)]
                  focus:outline-none focus:border-[var(--border-focus)] focus:bg-[var(--accent-glow)]
                  transition-all
                "
              />
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                {t('register.username')}
              </label>
              <input
                type="text"
                value={form.username}
                onChange={set('username')}
                required
                minLength={2}
                maxLength={50}
                placeholder={t('register.usernamePlaceholder')}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[var(--accent-muted)] border border-[var(--border-default)]
                  text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)]
                  focus:outline-none focus:border-[var(--border-focus)] focus:bg-[var(--accent-glow)]
                  transition-all
                "
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                {t('register.password')}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                required
                minLength={6}
                maxLength={128}
                placeholder={t('register.passwordPlaceholder')}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[var(--accent-muted)] border border-[var(--border-default)]
                  text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)]
                  focus:outline-none focus:border-[var(--border-focus)] focus:bg-[var(--accent-glow)]
                  transition-all
                "
              />
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-widest text-[var(--text-tertiary)]">
                {t('register.confirmPassword')}
              </label>
              <input
                type="password"
                value={form.confirmPassword}
                onChange={set('confirmPassword')}
                required
                minLength={6}
                placeholder={t('register.confirmPasswordPlaceholder')}
                className="
                  w-full px-4 py-3 rounded-xl
                  bg-[var(--accent-muted)] border border-[var(--border-default)]
                  text-sm text-[var(--text-primary)] placeholder-[var(--text-disabled)]
                  focus:outline-none focus:border-[var(--border-focus)] focus:bg-[var(--accent-glow)]
                  transition-all
                "
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] text-[var(--error)] text-sm">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="
                w-full py-3 rounded-xl font-semibold text-sm
                bg-[rgba(200,200,216,0.15)] border border-[rgba(200,200,216,0.32)]
                text-[var(--text-primary)]
                hover:bg-[rgba(200,200,216,0.22)] hover:border-[rgba(200,200,216,0.48)]
                transition-all duration-150
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {loading ? t('register.submitting') : t('register.submit')}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--border-subtle)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[var(--bg-base)] text-[var(--text-disabled)]">
                {t('generic.or')}
              </span>
            </div>
          </div>

          {/* Login link */}
          <p className="text-center text-sm text-[var(--text-secondary)]">
            {t('register.hasAccount')}{' '}
            <Link to="/login" className="font-semibold text-[var(--accent)] hover:underline">
              {t('register.loginNow')}
            </Link>
          </p>
        </div>

        {/* Back link */}
        <p className="text-center mt-4">
          <Link to="/" className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
            ← {t('generic.backHome')}
          </Link>
        </p>
      </div>
    </div>
  )
}
