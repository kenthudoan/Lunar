import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../i18n'
import { createScenario, importScenario } from '../api'

// ---- Genre Presets ----
const GENRES = [
  {
    id: 'fantasy',
    label: { vi: 'Fantasy', en: 'Fantasy' },
    icon: '⚔',
    description: { vi: 'Phép thuật, rồng, và những vương quốc cổ xưa', en: 'Magic, dragons, and ancient kingdoms' },
    tone: { vi: 'Ao tuong, huyền thoại, cao trào. Hanh dong phép thuật duoc cho phep. Phat trien the gioi rong mo.', en: 'Epic, mythic, grand scale. Magical actions allowed. Vast open world.' },
  },
  {
    id: 'scifi',
    label: { vi: 'Khoa Học Viễn Tưởng', en: 'Sci-Fi' },
    icon: '🚀',
    description: { vi: 'Công nghệ tương lai, vũ trụ, và những bí ẩn ngoài hành tinh', en: 'Future tech, space, and alien mysteries' },
    tone: { vi: 'Hiện đại, logic, phát hiện. Công nghệ cao cấp có sẵn. Khám phá vũ trụ và các hành tinh.', en: 'Modern, logical, investigative. Advanced tech available. Space and planetary exploration.' },
  },
  {
    id: 'cyberpunk',
    label: { vi: 'Cyberpunk', en: 'Cyberpunk' },
    icon: '💀',
    description: { vi: 'Công nghệ lấn át con người, tương lai u ám của đô thị', en: 'Tech over humanity, dystopian urban future' },
    tone: { vi: 'U ám, nguy cơ, phản điệp. Internet va AI xam nhập đoi song. Công nghệ nan giới, đạo đức mờ ám.', en: 'Dark, gritty, noir. Tech infiltrates daily life. Moral ambiguity, corporate dominance.' },
  },
  {
    id: 'horror',
    label: { vi: 'Kinh Dị', en: 'Horror' },
    icon: '🩸',
    description: { vi: 'Không khí căng thẳng, quái vật, và bí mật đen tối', en: 'Tense atmosphere, monsters, and dark secrets' },
    tone: { vi: 'Manchay, u an, day nạ. Sợ hãi và khám phá. Không có siêu nhiên nào biết trước — mọi thứ đều đáng sợ.', en: 'Eerie, unsettling, dread. Fear and discovery. No safe havens — everything can be terrifying.' },
  },
  {
    id: 'historical',
    label: { vi: 'Lịch Sử', en: 'Historical' },
    icon: '📜',
    description: { vi: 'Các sự kiện và thời đại lịch sử với chi tiết chân thực', en: 'Historical periods and events with authentic detail' },
    tone: { vi: 'Chân thực, chi tiết, nhập vai. Không có ma thuật. Lịch sử được nghiên cứu kỹ.', en: 'Authentic, detailed, immersive. No magic. Well-researched historical accuracy.' },
  },
  {
    id: 'mystery',
    label: { vi: ' Bí Ẩn', en: 'Mystery' },
    icon: '🔍',
    description: { vi: 'Điều tra, bí ẩn, và những manh mối cần giải mã', en: 'Investigation, secrets, and clues to unravel' },
    tone: { vi: 'Hồi hộp, suy luận, bất ngờ. Người chơi là thám tử. Câu đố cần được giải mã qua hành động.', en: 'Thrilling, deductive, surprising. Player is the detective. Puzzles solved through action.' },
  },
]

const LANGUAGES = [
  { value: 'en',    label: 'English' },
  { value: 'vi',    label: 'Tiếng Việt' },
  { value: 'pt-br', label: 'Português (BR)' },
]

// ---- Section Header ----
function SectionHeader({ number, title, description }) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-3 mb-1">
        <span className="w-6 h-6 rounded-full bg-[var(--accent-muted)] border border-[var(--border-default)] flex items-center justify-center text-[10px] font-bold font-mono text-[var(--text-secondary)]">
          {number}
        </span>
        <h2 className="text-base font-semibold text-[var(--text-primary)]">{title}</h2>
      </div>
      {description && (
        <p className="text-sm text-[var(--text-tertiary)] pl-9">{description}</p>
      )}
    </div>
  )
}

export default function ScenarioBuilder() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [form, setForm] = useState({
    title: '',
    description: '',
    tone_instructions: '',
    opening_narrative: '',
    language: 'en',
    lore_text: '',
  })

  const [genre, setGenre] = useState(null)
  const [importPayload, setImportPayload] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  // Autofill from genre
  const applyGenre = (g) => {
    setGenre(g.id)
    const locale = localStorage.getItem('lunar_language') || 'en'
    setForm((f) => ({
      ...f,
      tone_instructions: g.tone[locale] || g.tone.en,
      title: f.title || g.label[locale] || g.label.en,
    }))
  }

  // Import JSON file
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
          language: parsed.scenario.language || 'en',
          lore_text: parsed.scenario.lore_text || '',
        })
        setImportPayload(parsed)
        setError(null)
      } catch (err) {
        setError(err.message === 'Invalid format' ? 'Invalid structure. Missing "scenario" object.' : 'Failed to parse JSON file.')
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
      let scenario
      if (importPayload) {
        scenario = await importScenario({ ...importPayload, scenario: form })
      } else {
        scenario = await createScenario(form)
      }
      setSubmitted(true)
      setTimeout(() => navigate('/'), 800)
    } catch {
      setError(t('error.backendOffline'))
    } finally {
      setLoading(false)
    }
  }

  const locale = localStorage.getItem('lunar_language') || 'en'

  return (
    <div className="min-h-screen bg-[var(--bg-base)]">
      {/* Topbar */}
      <div className="sticky top-[var(--header-height)] z-20 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/90 backdrop-blur-xl px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{t('nav.create')}</span>
            {genre && (
              <span className="text-xs text-[var(--text-tertiary)] bg-[var(--accent-muted)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                {GENRES.find((g) => g.id === genre)?.label[locale]}
              </span>
            )}
          </div>
          {importPayload && (
            <span className="badge badge-success">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
              {t('scenario.imported')}
            </span>
          )}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-10">

          {/* Section 1: Genre */}
          <section>
            <SectionHeader
              number={1}
              title={locale === 'vi' ? 'Chọn Thể Loại' : 'Choose Genre'}
              description={locale === 'vi' ? 'Chọn thể loại để bắt đầu hoặc bỏ qua để tự do.' : 'Select a genre for presets, or skip for full freedom.'}
            />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {GENRES.map((g) => {
                const isActive = genre === g.id
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => applyGenre(g)}
                    className={`
                      p-4 rounded-xl border text-left transition-all duration-200
                      ${isActive
                        ? 'bg-[var(--accent-muted)] border-[var(--border-strong)] shadow-[var(--shadow-glow)]'
                        : 'bg-[var(--bg-surface)] border-[var(--border-subtle)] hover:border-[var(--border-default)] hover:bg-[var(--bg-elevated)]'
                      }
                    `}
                  >
                    <div className="text-2xl mb-2">{g.icon}</div>
                    <div className={`text-sm font-semibold mb-1 ${isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>
                      {g.label[locale]}
                    </div>
                    <div className="text-[11px] text-[var(--text-tertiary)] leading-relaxed hidden sm:block">
                      {g.description[locale]}
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          {/* Section 2: Core Identity */}
          <section>
            <SectionHeader
              number={2}
              title={locale === 'vi' ? 'Bản Sắc Thế Giới' : 'World Identity'}
              description={locale === 'vi' ? 'Tiêu đề và mô tả cơ bản của thế giới.' : 'The basic title and description of your world.'}
            />
            <div className="space-y-4">
              <div>
                <label className="label">{t('scenario.title')} <span className="text-[var(--error)]">*</span></label>
                <input
                  value={form.title}
                  onChange={update('title')}
                  placeholder={locale === 'vi' ? 'VD: Thế Giới Bóng Tối — Quốc Gia Đổ Nát' : 'e.g. The Shattered Kingdoms'}
                  required
                  className="input"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">{t('scenario.description')}</label>
                <textarea
                  value={form.description}
                  onChange={update('description')}
                  placeholder={locale === 'vi' ? 'Một lời mô tả ngắn về thế giới của bạn...' : 'A brief description of your world...'}
                  rows={2}
                  className="input textarea"
                />
              </div>
              <div>
                <label className="label">{t('scenario.language')}</label>
                <select value={form.language} onChange={update('language')} className="input select">
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Section 3: Tone */}
          <section>
            <SectionHeader
              number={3}
              title={t('scenario.tone')}
              description={locale === 'vi' ? 'Giọng điệu, luật lệ, và bầu không khí của thế giới. Đây sẽ ảnh hưởng đến cách AI kể chuyện.' : 'Tone, rules, and atmosphere of the world. This influences how the AI narrates.'}
            />
            <textarea
              value={form.tone_instructions}
              onChange={update('tone_instructions')}
              placeholder={
                locale === 'vi'
                  ? 'VD: Nghiêm túc, hồi hộp, đạo đức xám xịt. Hành động bạo lực được cho phép nhưng không tỉ mỉ. Mọi quyết định có hậu quả thực sự...'
                  : 'e.g. Dark, gritty, morally grey. Violence is allowed but not gratuitous. Every choice has real consequences...'
              }
              rows={4}
              className="input textarea"
            />
          </section>

          {/* Section 4: Opening */}
          <section>
            <SectionHeader
              number={4}
              title={t('scenario.opening')}
              description={locale === 'vi' ? 'Câu chuyện mở đầu — đoạn văn đầu tiên được trình bày cho người chơi khi bắt đầu.' : 'The opening narrative — the first passage presented to the player.'}
            />
            <textarea
              value={form.opening_narrative}
              onChange={update('opening_narrative')}
              placeholder={
                locale === 'vi'
                  ? 'VD: Bạn tỉnh dậy trong một căn phòng tối. Không khí nồng nặc mùi máu. Một tiếng rên rỉ vọng lại từ hành lang...'
                  : 'e.g. You wake in a dark room. The air is thick with the smell of blood. A groan echoes from the corridor...'
              }
              rows={5}
              className="input textarea"
            />
          </section>

          {/* Section 5: Lore */}
          <section>
            <SectionHeader
              number={5}
              title={t('scenario.lore')}
              description={t('scenario.loreHint')}
            />
            <textarea
              value={form.lore_text}
              onChange={update('lore_text')}
              placeholder={
                locale === 'vi'
                  ? 'Dán chi tiết thế giới, lịch sử nhân vật, bối cảnh địa lý, phe phái, và mọi thứ bạn muốn AI biết về thế giới này...'
                  : 'Paste world details, character backgrounds, geography, factions, and anything you want the AI to know about this world...'
              }
              rows={8}
              className="input textarea"
            />
          </section>

          {/* Section 6: Import */}
          <section>
            <SectionHeader
              number={6}
              title={locale === 'vi' ? 'Hoặc Nhập Từ File' : 'Or Import from File'}
              description={locale === 'vi' ? 'Tải lên file JSON đã export trước đó. Dữ liệu sẽ đè lên các trường bên trên.' : 'Upload a previously exported JSON file. Data will overwrite the fields above.'}
            />
            <div className="flex items-center gap-4">
              <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileLoad} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="btn btn-secondary btn-sm"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                {t('scenario.import')}
              </button>
              {importPayload && (
                <span className="badge badge-success">
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /></svg>
                  {t('scenario.imported')}
                </span>
              )}
            </div>
          </section>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-xl bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] flex items-center gap-3 text-[var(--error)] text-sm font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
              {error}
            </div>
          )}

          {/* Submit */}
          <div className="pt-4 border-t border-[var(--border-subtle)]">
            <button
              type="submit"
              disabled={loading || !form.title.trim() || submitted}
              className="w-full btn btn-primary btn-lg"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {importPayload ? (locale === 'vi' ? 'Đang xử lý nhập...' : 'Processing Import...') : (locale === 'vi' ? 'Đang khởi tạo...' : 'Initializing...')}
                </>
              ) : submitted ? (
                <>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                  {locale === 'vi' ? 'Đã xong!' : 'Done!'}
                </>
              ) : (
                importPayload ? t('scenario.submitImport') : t('scenario.submit')
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}
