import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { createScenario, importScenario } from '../api'
import { otherGenresPartA } from '../data/scenarioGenrePresets.restA'
import { otherGenresPartB } from '../data/scenarioGenrePresets.restB'
import { tienHiepGenre } from '../data/scenarioGenrePresets.tienHiep'

// ---- Genre Presets ----
const GENRES = [
  {
    id: 'fantasy',
    label: { vi: 'Fantasy', en: 'Fantasy' },
    icon: '⚔',
    tone: { vi: 'Ao tuong, huyền thoại, cao trào. Hanh dong phép thuật duoc cho phep. Phat trien the gioi rong mo.', en: 'Epic, mythic, grand scale. Magical actions allowed. Vast open world.' },
  },
  {
    id: 'scifi',
    label: { vi: 'Khoa Học Viễn Tưởng', en: 'Sci-Fi' },
    icon: '🚀',
    tone: { vi: 'Hiện đại, logic, phát hiện. Công nghệ cao cấp có sẵn. Khám phá vũ trụ và các hành tinh.', en: 'Modern, logical, investigative. Advanced tech available. Space and planetary exploration.' },
  },
  {
    id: 'cyberpunk',
    label: { vi: 'Cyberpunk', en: 'Cyberpunk' },
    icon: '💀',
    tone: { vi: 'U ám, nguy cơ, phản điệp. Internet va AI xam nhập đoi song. Công nghệ nan giới, đạo đức mờ ám.', en: 'Dark, gritty, noir. Tech infiltrates daily life. Moral ambiguity, corporate dominance.' },
  },
  {
    id: 'horror',
    label: { vi: 'Kinh Dị', en: 'Horror' },
    icon: '🩸',
    tone: { vi: 'Manchay, u an, day nạ. Sợ hãi và khám phá. Không có siêu nhiên nào biết trước — mọi thứ đều đáng sợ.', en: 'Eerie, unsettling, dread. Fear and discovery. No safe havens — everything can be terrifying.' },
  },
  {
    id: 'historical',
    label: { vi: 'Lịch Sử', en: 'Historical' },
    icon: '📜',
    tone: { vi: 'Chân thực, chi tiết, nhập vai. Không có ma thuật. Lịch sử được nghiên cứu kỹ.', en: 'Authentic, detailed, immersive. No magic. Well-researched historical accuracy.' },
  },
  {
    id: 'mystery',
    label: { vi: 'Bí Ẩn', en: 'Mystery' },
    icon: '🔍',
    tone: { vi: 'Hồi hộp, suy luận, bất ngờ. Người chơi là thám tử. Câu đố cần được giải mã qua hành động.', en: 'Thrilling, deductive, surprising. Player is the detective. Puzzles solved through action.' },
  },
]

// ---- All genre categories (basic + presets) ----
const ALL_GENRE_CATEGORIES = [
  { id: 'basic', label: { vi: 'Cơ Bản', en: 'Basic' }, icon: '⭐', genres: GENRES },
  { id: tienHiepGenre.id, label: tienHiepGenre.label, icon: tienHiepGenre.icon, genres: tienHiepGenre.subGenres.map((sg) => ({ id: sg.id, label: sg.label, icon: null, tone: null, preset: sg.preset })) },
  ...otherGenresPartA.map((cat) => ({ id: cat.id, label: cat.label, icon: cat.icon, genres: cat.subGenres.map((sg) => ({ id: sg.id, label: sg.label, icon: null, tone: null, preset: sg.preset })) })),
  ...otherGenresPartB.map((cat) => ({ id: cat.id, label: cat.label, icon: cat.icon, genres: cat.subGenres.map((sg) => ({ id: sg.id, label: sg.label, icon: null, tone: null, preset: sg.preset })) })),
]

const LANGS = [
  { value: 'vi', label: 'Tiếng Việt' },
  { value: 'en', label: 'English' },
]

export default function ScenarioBuilder() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    tone_instructions: '',
    opening_narrative: '',
    language: 'vi',
    lore_text: '',
  })

  const [genre, setGenre] = useState(null)
  const [activeCategory, setActiveCategory] = useState('basic')
  const [importPayload, setImportPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const lang = localStorage.getItem('lunar_language') || 'en'

  const applyGenre = (g) => {
    if (g.preset) {
      // Full preset: apply all fields
      setGenre(g.id)
      setForm((f) => ({
        ...f,
        title: g.preset.title || f.title,
        description: g.preset.description || f.description,
        tone_instructions: g.preset.tone_instructions || f.tone_instructions,
        opening_narrative: g.preset.opening_narrative || f.opening_narrative,
        language: g.preset.language || lang,
        lore_text: g.preset.lore_text || f.lore_text,
      }))
    } else {
      // Basic genre: tone only
      setGenre(g.id)
      setForm((f) => ({
        ...f,
        tone_instructions: g.tone[lang] || g.tone.en,
        title: f.title || g.label[lang] || g.label.en,
      }))
    }
  }

  const currentCategories = ALL_GENRE_CATEGORIES

  const handleFileLoad = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target.result)
        if (!parsed.scenario || typeof parsed.scenario !== 'object' || Array.isArray(parsed.scenario)) {
          throw new Error('Invalid format')
        }
        setForm({
          title: parsed.scenario.title || '',
          description: parsed.scenario.description || '',
          tone_instructions: parsed.scenario.tone_instructions || '',
          opening_narrative: parsed.scenario.opening_narrative || '',
          language: parsed.scenario.language || 'vi',
          lore_text: parsed.scenario.lore_text || '',
        })
        setImportPayload(parsed)
        setError(null)
      } catch {
        setError('Invalid structure. Missing "scenario" object.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setLoading(true)
    setError(null)
    try {
      if (importPayload) {
        await importScenario({ ...importPayload, scenario: form })
      } else {
        await createScenario(form)
      }
      setSubmitted(true)
      setTimeout(() => navigate('/'), 800)
    } catch {
      setError(t('error.backendOffline'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-lg font-bold text-[var(--text-primary)] mb-4">{t('nav.create')}</h1>
        <form onSubmit={handleSubmit} className="space-y-4">

        {/* Genre category tabs */}
        <div className="card p-4 space-y-3">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            {lang === 'vi' ? 'Chọn Thể Loại' : 'Choose Genre'}
          </p>
          {/* Category tabs */}
          <div className="flex flex-wrap gap-1 mb-2">
            {currentCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[var(--accent-muted)] border-[var(--border-strong)] text-[var(--text-primary)]'
                    : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]'
                }`}
              >
                {cat.icon && <span>{cat.icon}</span>}
                <span>{cat.label[lang] || cat.label.en}</span>
              </button>
            ))}
          </div>
          {/* Sub-genre pills */}
          {(() => {
            const activeCat = currentCategories.find((c) => c.id === activeCategory)
            if (!activeCat) return null
            return (
              <div className="flex flex-wrap gap-1.5">
                {activeCat.genres.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => applyGenre(g)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                      genre === g.id
                        ? 'bg-[var(--accent)] border-[var(--border-strong)] text-white'
                        : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]'
                    }`}
                  >
                    {g.icon && <span>{g.icon}</span>}
                    <span>{g.label[lang] || g.label.en}</span>
                    {g.preset && (
                      <span className="ml-1 text-[9px] opacity-60">✨</span>
                    )}
                  </button>
                ))}
              </div>
            )
          })()}
        </div>

        {/* Core info */}
        <div className="card p-5 space-y-4">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{lang === 'vi' ? 'Bản Sắc Thế Giới' : 'World Identity'}</p>

          <div className="space-y-1">
            <label className="label text-sm">{t('scenario.title')} <span className="text-[var(--error)]">*</span></label>
            <input
              value={form.title}
              onChange={update('title')}
              placeholder={lang === 'vi' ? 'VD: Thế Giới Bóng Tối' : 'e.g. The Shattered Kingdoms'}
              required
              className="input text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1">
            <label className="label text-sm">{t('scenario.description')}</label>
            <textarea
              value={form.description}
              onChange={update('description')}
              placeholder={lang === 'vi' ? 'Mô tả ngắn về thế giới...' : 'A brief description...'}
              rows={2}
              className="input textarea text-sm resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-[var(--text-tertiary)]">{t('scenario.language')}</label>
            <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              {LANGS.map((l) => (
                <button
                  key={l.value}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, language: l.value }))}
                  className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all ${
                    form.language === l.value
                      ? 'bg-[var(--accent)] text-white'
                      : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tone */}
        <div className="card p-5 space-y-2">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('scenario.tone')}</p>
          <textarea
            value={form.tone_instructions}
            onChange={update('tone_instructions')}
            placeholder={lang === 'vi'
              ? 'VD: Nghiêm túc, đạo đức xám. Hành động bạo lực được phép nhưng không tỉ mỉ...'
              : 'e.g. Dark, gritty, morally grey. Violence allowed but not gratuitous...'}
            rows={4}
            className="input textarea text-sm resize-none"
          />
        </div>

        {/* Opening */}
        <div className="card p-5 space-y-2">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('scenario.opening')}</p>
          <textarea
            value={form.opening_narrative}
            onChange={update('opening_narrative')}
            placeholder={lang === 'vi'
              ? 'VD: Bạn tỉnh dậy trong một căn phòng tối. Không khí nồng nặc mùi máu...'
              : 'e.g. You wake in a dark room. The air is thick with the smell of blood...'}
            rows={5}
            className="input textarea text-sm resize-none"
          />
        </div>

        {/* Lore */}
        <div className="card p-5 space-y-2">
          <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">{t('scenario.lore')}</p>
          <textarea
            value={form.lore_text}
            onChange={update('lore_text')}
            maxLength={4000}
            placeholder={lang === 'vi'
              ? 'Dán chi tiết thế giới, lịch sử nhân vật, bối cảnh địa lý, phe phái...'
              : 'Paste world details, character backgrounds, geography, factions...'}
            rows={7}
            className="input textarea text-sm resize-none"
          />
        </div>

        {/* Import */}
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileLoad} />
            <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary text-xs">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              {t('scenario.import')}
            </button>
            {importPayload && (
              <span className="text-[10px] text-[var(--text-disabled)]">{t('scenario.imported')}</span>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-sm text-[var(--error)] bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] p-3 rounded-xl">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || !form.title.trim() || submitted}
          className="w-full btn btn-primary text-sm py-3"
        >
          {loading ? (
            <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : submitted ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="mr-2"><polyline points="20 6 9 17 4 12" /></svg>
          ) : null}
          {loading
            ? (importPayload ? (lang === 'vi' ? 'Đang xử lý...' : 'Processing...') : (lang === 'vi' ? 'Đang khởi tạo...' : 'Initializing...'))
            : submitted
            ? (lang === 'vi' ? 'Đã xong!' : 'Done!')
            : importPayload ? t('scenario.submitImport') : t('scenario.submit')}
        </button>

      </form>
      </div>
    </div>
  )
}
