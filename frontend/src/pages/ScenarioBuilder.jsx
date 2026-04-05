import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useI18n } from '../i18n'
import { resolveEntityValue } from '../i18n/index.js'
import { createScenario, importScenario, expandScenario, updateScenario, createCampaign, addStoryCard, getStoryCards } from '../api'
import RankListView from '../components/RankListView'
import { otherGenresPartA } from '../data/scenarioGenrePresets.restA'
import { otherGenresPartB } from '../data/scenarioGenrePresets.restB'
import { tienHiepGenre } from '../data/scenarioGenrePresets.tienHiep'

// ---- Entity type config ----
const ENTITY_TYPES = [
  { key: 'rank',     labelKey: 'entity.rank',     icon: '⚡', color: 'var(--warning)',   bgColor: 'var(--warning-muted)' },
  { key: 'faction',  labelKey: 'entity.faction',  icon: '🏴', color: 'var(--accent)',    bgColor: 'var(--accent-muted)' },
  { key: 'secret',   labelKey: 'entity.secret',    icon: '🗝', color: 'var(--purple)',   bgColor: 'rgba(139,92,246,0.08)' },
  { key: 'location', labelKey: 'entity.location', icon: '🗺', color: 'var(--success)',  bgColor: 'var(--success-muted)' },
  { key: 'npc',      labelKey: 'entity.npc',       icon: '🎭', color: 'var(--info)',     bgColor: 'rgba(96,165,250,0.08)' },
  { key: 'item',     labelKey: 'entity.item',       icon: '💎', color: 'var(--error)',    bgColor: 'var(--error-muted)' },
]

const ENTITY_FIELDS = {
  rank:     [{ key: 'name', labelKey: 'entity.name', placeholder: true }, { key: 'description', labelKey: 'entity.description' }, { key: 'sub_tiers', labelKey: 'entity.subTiers', placeholder: true }, { key: 'parent', labelKey: 'entity.parent', placeholder: true }],
  faction:  [{ key: 'name', labelKey: 'entity.name', placeholder: true }, { key: 'description', labelKey: 'entity.description' }, { key: 'leader', labelKey: 'entity.leader', placeholder: true }, { key: 'alignment', labelKey: 'entity.alignment', placeholder: true }, { key: 'influence', labelKey: 'entity.influence', isNumber: true }],
  secret:   [{ key: 'name', labelKey: 'entity.name', placeholder: true }, { key: 'description', labelKey: 'entity.description' }, { key: 'revealed_to', labelKey: 'entity.revealedTo', placeholder: true }],
  location: [{ key: 'name', labelKey: 'entity.name', placeholder: true }, { key: 'description', labelKey: 'entity.description' }, { key: 'faction', labelKey: 'entity.faction', placeholder: true }],
  npc:      [
    { key: 'name', labelKey: 'entity.name', placeholder: true },
    { key: 'description', labelKey: 'entity.description' },
    { key: 'faction', labelKey: 'entity.faction', placeholder: true },
    { key: 'role', labelKey: 'entity.role', placeholder: true },
    { key: 'realm', labelKey: 'entity.realm', placeholder: true },
    { key: 'sub_tier', labelKey: 'entity.subTier', isSelect: true },
    { key: 'tier', labelKey: 'entity.tier', placeholder: true },
  ],
  item:     [{ key: 'name', labelKey: 'entity.name', placeholder: true }, { key: 'description', labelKey: 'entity.description' }, { key: 'rarity', labelKey: 'entity.rarity', placeholder: true }, { key: 'owner', labelKey: 'entity.owner', placeholder: true }],
}

// ---- Genre config ----
const ALL_GENRE_CATEGORIES = [
  { id: 'basic', label: { vi: 'Cơ Bản', en: 'Basic' }, icon: '⭐', genres: [
    { id: 'fantasy', label: { vi: 'Fantasy', en: 'Fantasy' }, icon: '⚔', tone: { vi: 'Ao tuong, huyen thoai, cao trao. Hanh dong phép thuật được cho phép. Phát triển thế giới rộng mở.', en: 'Epic, mythic, grand scale. Magical actions allowed. Vast open world.' } },
    { id: 'scifi', label: { vi: 'Khoa Học Viễn Tưởng', en: 'Sci-Fi' }, icon: '🚀', tone: { vi: 'Hiện đại, logic, phát hiện. Công nghệ cao cấp có sẵn. Khám phá vũ trụ và các hành tinh.', en: 'Modern, logical, investigative. Advanced tech available. Space and planetary exploration.' } },
    { id: 'cyberpunk', label: { vi: 'Cyberpunk', en: 'Cyberpunk' }, icon: '💀', tone: { vi: 'U ám, nguy cơ, phản điệp. Internet và AI xâm nhập đời sống. Công nghệ nan giải, đạo đức mờ ám.', en: 'Dark, gritty, noir. Tech infiltrates daily life. Moral ambiguity, corporate dominance.' } },
    { id: 'horror', label: { vi: 'Kinh Dị', en: 'Horror' }, icon: '🩸', tone: { vi: 'Màn chơi, u ám, dây nạ. Sợ hãi và khám phá. Không có bến đỗ an toàn — mọi thứ đều đáng sợ.', en: 'Eerie, unsettling, dread. Fear and discovery. No safe havens — everything can be terrifying.' } },
  ]},
  { id: tienHiepGenre.id, label: tienHiepGenre.label, icon: tienHiepGenre.icon, genres: tienHiepGenre.subGenres.map((sg) => ({ id: sg.id, label: sg.label, icon: null, tone: null, ...sg.preset ? { preset: sg.preset } : {} })) },
  ...otherGenresPartA.map((cat) => ({ id: cat.id, label: cat.label, icon: cat.icon, genres: cat.subGenres.map((sg) => ({ id: sg.id, label: sg.label, icon: null, tone: null, ...sg.preset ? { preset: sg.preset } : {} })) })),
  ...otherGenresPartB.map((cat) => ({ id: cat.id, label: cat.label, icon: cat.icon, genres: cat.subGenres.map((sg) => ({ id: sg.id, label: sg.label, icon: null, tone: null, ...sg.preset ? { preset: sg.preset } : {} })) })),
]

// ---- Text field config for Step 2 / Step 3 ----
const TEXT_FIELDS = [
  { key: 'tone_instructions', labelKey: 'scenario.tone', placeholder: { vi: 'VD: Nghiêm túc, đạo đức xám...', en: 'e.g. Dark, gritty, morally grey...' }, rows: 3 },
  { key: 'lore_text', labelKey: 'scenario.lore', placeholder: { vi: 'Lịch sử thế giới, các sự kiện lớn...', en: 'World history, major events...' }, rows: 8 },
  { key: 'opening_narrative', labelKey: 'scenario.opening', placeholder: { vi: 'VD: Bạn tỉnh dậy trong một căn phòng tối...', en: 'e.g. You wake in a dark room...' }, rows: 6 },
]

// ---- POV options ----
const POV_OPTIONS = [
  { value: 'first_person',  label: { vi: 'Ngôi 1 — Tôi', en: 'First Person — I' } },
  { value: 'second_person',  label: { vi: 'Ngôi 2 — Bạn', en: 'Second Person — You' } },
  { value: 'third_person',  label: { vi: 'Ngôi 3 — Hắn/Cô ấy', en: 'Third Person — He/She' } },
  { value: 'omniscient',     label: { vi: 'Ngôi Toàn Biết', en: 'Omniscient' } },
  { value: 'multiple_pov',  label: { vi: 'Ngôi Đa Nhân Vật', en: 'Multiple POV' } },
]

// ---- Writing Style options ----
const WRITING_STYLE_OPTIONS = [
  { value: 'chinh_thong', label: { vi: 'Chính Thống', en: 'Orthodox' } },
  { value: 'hao_sang',    label: { vi: 'Hào Sảng', en: 'Heroic' } },
  { value: 'lanh_khot',   label: { vi: 'Lãnh Khốc', en: 'Dark / Brutal' } },
  { value: 'tho_mong',    label: { vi: 'Thơ Mộng', en: 'Poetic / Dreamy' } },
  { value: 'hai_huoc',    label: { vi: 'Hài Hước', en: 'Humorous' } },
  { value: 'kich_tinh',   label: { vi: 'Kịch Tính', en: 'Suspenseful' } },
]

// ---- Helper ----
function entityId(e) {
  return e._id || `${e.type}-${e.name}`
}

// ================================================================
// COMPONENT
// ================================================================
export default function ScenarioBuilder() {
  const { scenarioId } = useParams()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const isEditMode = Boolean(scenarioId)
  const lang = localStorage.getItem('lunar_language') || 'vi'

  // Step
  const [step, setStep] = useState(isEditMode ? 3 : 1)

  // Step 1
  const [form, setForm] = useState({
    title: '',
    description: '',
    protagonist_name: '',
    narrative_pov: 'first_person',
    writing_style: 'chinh_thong',
    tone_instructions: '',
    opening_narrative: '',
    language: 'vi',
    lore_text: '',
    power_system_id: null,
  })

  // Step 2 — entities
  const [entities, setEntities] = useState([])
  const [activeEntityType, setActiveEntityType] = useState('rank')
  const [editTarget, setEditTarget] = useState(null) // null=view, {_new:true}=add, {_id}=edit
  const [entityDraft, setEntityDraft] = useState({})
  const [adventureName, setAdventureName] = useState('')

  // Power system (multi-axis) — populated by AI expand, edited in Cấp Bậc tab
  const [powerSystemDraft, setPowerSystemDraft] = useState(null)

  // Shared
  const [loading, setLoading] = useState(false)
  const [loadingScenario, setLoadingScenario] = useState(isEditMode)
  const [error, setError] = useState(null)
  const [importPayload, setImportPayload] = useState(null)
  const [isExpanding, setIsExpanding] = useState(false)
  const [expandPhase, setExpandPhase] = useState('genre')
  const [genre, setGenre] = useState(null)
  const [activeCategory, setActiveCategory] = useState('basic')

  // Cycle through loading stages while expanding
  useEffect(() => {
    if (!isExpanding) { setExpandPhase('genre'); return }
    const phases = ['genre', 'story', 'chars', 'lore']
    let idx = 0
    const tick = () => {
      idx = (idx + 1) % phases.length
      setExpandPhase(phases[idx])
    }
    const id = setInterval(tick, 1800)
    return () => clearInterval(id)
  }, [isExpanding])

  // ---- Load existing scenario ----
  if (isEditMode && loadingScenario) {
    import('../api').then(async ({ getScenario }) => {
      try {
        const s = await getScenario(scenarioId)
        setForm({
          title: s.title || '',
          description: s.description || '',
          protagonist_name: s.protagonist_name || '',
          narrative_pov: s.narrative_pov || 'first_person',
          writing_style: s.writing_style || 'chinh_thong',
          tone_instructions: s.tone_instructions || '',
          opening_narrative: s.opening_narrative || '',
          language: s.language || 'vi',
          lore_text: s.lore_text || '',
          power_system_id: s.power_system_id || null,
        })
        // Load power system JSON blob if present
        if (s.power_system_id) {
          try {
            const ps = JSON.parse(s.power_system_id)
            if (ps && ps.axes) {
              setPowerSystemDraft(ps)
              setPsEditorKey((k) => k + 1)
            }
          } catch {
            // Not JSON or invalid — ignore
          }
        }
        // Entities are stored as story cards — fetch and map them
        import('../api').then(async ({ getStoryCards }) => {
          try {
            const cards = await getStoryCards(scenarioId)
            if (Array.isArray(cards)) {
              const typeMap = { FACTION: 'faction', LOCATION: 'location', NPC: 'npc', ITEM: 'item', LORE: 'secret', RANK: 'rank' }
              const mapped = cards.map((c, i) => ({
                _id: c.id || `card-${i}`,
                type: typeMap[c.card_type?.toUpperCase()] || 'secret',
                name: c.name || '',
                ...(c.content || {}),
              }))
              setEntities(mapped)
            } else {
              setEntities([])
            }
          } catch {
            setEntities([])
          }
        })
      } catch {
        setError(t('generic.error'))
      } finally {
        setLoadingScenario(false)
      }
    })
  }

  // ---- Derived ----
  const entitiesOfType = entities.filter((e) => e.type === activeEntityType)
  const isAdding = editTarget && editTarget._new
  const isEditing = editTarget && !editTarget._new

  const getEntityLabel = (type) => {
    const def = ENTITY_TYPES.find((d) => d.key === type)
    return def ? t(def.labelKey) : type
  }
  const getEntityColor = (type) => {
    const def = ENTITY_TYPES.find((d) => d.key === type)
    return def ? def.color : 'var(--text-primary)'
  }
  const getEntityBg = (type) => {
    const def = ENTITY_TYPES.find((d) => d.key === type)
    return def ? def.bgColor : 'var(--bg-elevated)'
  }
  const getEntityIcon = (type) => {
    const def = ENTITY_TYPES.find((d) => d.key === type)
    return def ? def.icon : '📦'
  }

  // ---- Handlers ----
  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))
  const updateDraft = (key) => (e) => setEntityDraft((f) => ({ ...f, [key]: e.target.value }))

  const applyGenre = (g) => {
    setGenre(g.id)
    setForm((f) => ({
      ...f,
      title: g.preset?.title || f.title,
      description: g.preset?.description || f.description,
    }))
  }

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
        const loaded = parsed.scenario
        setForm({
          title: loaded.title || '',
          description: loaded.description || '',
          protagonist_name: loaded.protagonist_name || '',
          narrative_pov: loaded.narrative_pov || 'first_person',
          writing_style: loaded.writing_style || 'chinh_thong',
          tone_instructions: loaded.tone_instructions || '',
          opening_narrative: loaded.opening_narrative || '',
          language: loaded.language || 'vi',
          lore_text: loaded.lore_text || '',
        })
        if (loaded.entities) setEntities(Array.isArray(loaded.entities) ? loaded.entities : [])
        setImportPayload(parsed)
        setError(null)
      } catch {
        setError('Invalid structure. Missing "scenario" object.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleStep1Next = async () => {
    if (!form.title.trim()) return
    setStep(2)
    setError(null)
    setExpandPhase('genre')

    // Animate through phases so the UI feels alive
    const timers = [
      setTimeout(() => setExpandPhase('story'), 1800),
      setTimeout(() => setExpandPhase('chars'), 4000),
      setTimeout(() => setExpandPhase('lore'), 7000),
    ]

    try {
      const result = await expandScenario({
        title: form.title,
        description: form.description,
        language: form.language,
        genre_id: genre || null,
        lore_text: form.lore_text || '',
      })
      if (result.suggestions) {
        setForm((f) => ({
          ...f,
          ...result.suggestions,
        }))
      }
      if (result.entities && Array.isArray(result.entities)) {
        setEntities(result.entities.map((e, i) => ({ ...e, _id: `ai-${i}-${Date.now()}` })))
      }
      // Populate multi-axis power system from AI
      if (result.power_system) {
        setPowerSystemDraft(result.power_system)
      }
      setStep(3)
    } catch {
      setError(t('error.backendOffline'))
      setStep(1)
    } finally {
      timers.forEach(clearTimeout)
    }
  }

  const startAddEntity = (type) => {
    const defs = ENTITY_FIELDS[type] || []
    const init = { type }
    defs.forEach((f) => {
      init[f.key] = f.isNumber ? 5 : f.key === 'sub_tier' ? 2 : ''
    })
    setEditTarget({ _new: true, type })
    setEntityDraft(init)
  }

  const startEditEntity = (entity) => {
    setEditTarget({ ...entity })
    setEntityDraft({ ...entity })
  }

  const cancelEdit = () => {
    setEditTarget(null)
    setEntityDraft({})
  }

  const saveEntity = () => {
    if (!entityDraft.name?.trim()) return
    const key = entityDraft._id || `new-${Date.now()}`
    const finalEntity = { ...entityDraft, _id: key }
    if (entityDraft._id) {
      setEntities((prev) => prev.map((e) => (entityId(e) === entityDraft._id ? finalEntity : e)))
    } else {
      setEntities((prev) => [...prev, finalEntity])
    }
    cancelEdit()
  }

  const deleteEntity = (entity) => {
    setEntities((prev) => prev.filter((e) => entityId(e) !== entityId(entity)))
    if (editTarget && entityId(editTarget) === entityId(entity)) cancelEdit()
  }

  const regenerateEntities = async () => {
    if (isExpanding) return
    setIsExpanding(true)
    cancelEdit()
    try {
      const result = await expandScenario({
        title: form.title,
        description: form.description,
        language: form.language,
        genre_id: genre || null,
        lore_text: form.lore_text || '',
      })
      if (result.entities && Array.isArray(result.entities)) {
        setEntities(result.entities.map((e, i) => ({ ...e, _id: `ai-${i}-${Date.now()}` })))
      }
      if (result.suggestions) {
        setForm((f) => ({ ...f, ...result.suggestions }))
      }
      if (result.power_system) {
        setPowerSystemDraft(result.power_system)
      }
    } catch {
      // silently fail
    } finally {
      setIsExpanding(false)
    }
  }

  // ── Power system save handler — removed (ranks are now simple entities) ──

  const buildFinalForm = () => {
    // Include power system (multi-axis JSON blob) for campaign startup
    const final = { ...form }
    if (powerSystemDraft) {
      final.power_system_id = JSON.stringify(powerSystemDraft)
    }
    return final
  }

  const _syncEntitiesToCards = async (sid) => {
    // Delete existing cards for this scenario
    const existing = await getStoryCards(sid)
    // No delete endpoint needed for simplicity — we'll overwrite via scenario.recreate approach
    // For now, just add new ones (duplicates are acceptable on re-edit; user can delete extras)
    for (const e of entities) {
      if (!e.name?.trim()) continue
      const content = {}
      Object.entries(e).forEach(([k, v]) => {
        if (k !== 'type' && k !== '_id' && k !== 'name' && v !== undefined && v !== null && String(v).trim()) {
          content[k] = v
        }
      })
      // Map frontend entity type key to StoryCardType value
      const typeMap = { rank: 'RANK', faction: 'FACTION', secret: 'LORE', location: 'LOCATION', npc: 'NPC', item: 'ITEM' }
      const cardType = typeMap[e.type] || 'LORE'
      await addStoryCard(sid, { card_type: cardType, name: e.name, content })
    }
  }

  const handleEnterWorld = async () => {
    setLoading(true)
    setError(null)
    try {
      const finalForm = buildFinalForm()
      if (isEditMode) {
        await updateScenario(scenarioId, finalForm)
        await _syncEntitiesToCards(scenarioId)
        navigate('/')
      } else if (importPayload) {
        const imported = await importScenario({ ...importPayload, scenario: { ...finalForm } })
        await _syncEntitiesToCards(imported.id)
        navigate('/')
      } else {
        const saved = await createScenario(finalForm)
        await _syncEntitiesToCards(saved.id)
        const { campaign } = await createCampaign(saved.id, adventureName || undefined)
        navigate(`/play/${campaign.id}`)
      }
    } catch {
      setError(t('error.backendOffline'))
    } finally {
      setLoading(false)
    }
  }

  // ================================================================
  // RENDER
  // ================================================================
  if (loadingScenario) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-[var(--text-tertiary)] text-sm">{t('generic.loading')}</div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--bg-base)]">
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          {isEditMode && (
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-muted)] transition-all"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <h1 className="text-lg font-bold text-[var(--text-primary)]">
            {isEditMode ? (lang === 'vi' ? 'Chỉnh Sửa Thế Giới' : 'Edit World') : t('nav.create')}
          </h1>
        </div>

        {/* Step progress */}
        {!isEditMode && (
          <div className="mb-8">
            <div className="flex items-center gap-3">
              {/* Step 1 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                step === 1
                  ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                  : step < 1
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-disabled)] border border-[var(--border-subtle)]'
                    : 'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--border-default)]'
              }`}>
                {step > 1 ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '1'}
              </div>
              {/* Connector 1-2 */}
              <div className={`h-1 flex-1 min-w-4 rounded-full transition-all ${
                step > 1 ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'
              }`} />
              {/* Step 2 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                step === 2
                  ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                  : step < 2
                    ? 'bg-[var(--bg-elevated)] text-[var(--text-disabled)] border border-[var(--border-subtle)]'
                    : 'bg-[var(--accent-muted)] text-[var(--accent)] border border-[var(--border-default)]'
              }`}>
                {step > 2 ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '2'}
              </div>
              {/* Connector 2-3 */}
              <div className={`h-1 flex-1 min-w-4 rounded-full transition-all ${
                step > 2 ? 'bg-[var(--accent)]' : 'bg-[var(--border-subtle)]'
              }`} />
              {/* Step 3 */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition-all ${
                step === 3
                  ? 'bg-[var(--accent)] text-[var(--bg-base)]'
                  : 'bg-[var(--bg-elevated)] text-[var(--text-disabled)] border border-[var(--border-subtle)]'
              }`}>
                {step > 3 ? (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : '3'}
              </div>
            </div>
          </div>
        )}

        {/* ============================================= */}
        {/* STEP 1 */}
        {/* ============================================= */}
        {step === 1 ? (
          <div className="space-y-4">
            {/* Genre */}
            <div className="card p-5 space-y-3">
              <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                {lang === 'vi' ? 'Chọn Thể Loại' : 'Choose Genre'}
              </p>
              {/* Category tabs */}
              <div className="flex flex-wrap gap-1">
                {ALL_GENRE_CATEGORIES.map((cat) => (
                  <button key={cat.id} type="button" onClick={() => setActiveCategory(cat.id)}
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                      activeCategory === cat.id
                        ? 'bg-[var(--accent-muted)] border-[var(--border-strong)] text-[var(--text-primary)] font-medium'
                        : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]'
                    }`}>
                    {cat.icon && <span>{cat.icon}</span>}
                    <span>{cat.label[lang] || cat.label.en}</span>
                  </button>
                ))}
              </div>
              {/* Sub-genre pills */}
              {(() => {
                const activeCat = ALL_GENRE_CATEGORIES.find((c) => c.id === activeCategory)
                if (!activeCat) return null
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {activeCat.genres.map((g) => (
                      <button key={g.id} type="button" onClick={() => applyGenre(g)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-all ${
                          genre === g.id
                            ? 'bg-[var(--accent)] border-[var(--border-strong)] text-white'
                            : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]'
                        }`}>
                        {g.icon && <span>{g.icon}</span>}
                        <span>{g.label[lang] || g.label.en}</span>
                      </button>
                    ))}
                  </div>
                )
              })()}
            </div>

            {/* Identity */}
            <div className="card p-5 space-y-4">
              <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                {lang === 'vi' ? 'Bản Sắc Thế Giới' : 'World Identity'}
              </p>
              <div className="space-y-1">
                <label className="label text-xs">{t('scenario.title')} <span className="text-[var(--error)]">*</span></label>
                <input
                  value={form.title}
                  onChange={update('title')}
                  placeholder={lang === 'vi' ? 'VD: Thế Giới Bóng Tối' : 'e.g. The Shattered Kingdoms'}
                  className="input text-sm"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="label text-xs">{t('scenario.description')}</label>
                <textarea
                  value={form.description}
                  onChange={update('description')}
                  placeholder={lang === 'vi' ? 'Mô tả ngắn về thế giới...' : 'A brief description...'}
                  rows={2}
                  className="input textarea text-sm resize-none"
                />
              </div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-[var(--text-tertiary)]">{t('scenario.language')}</label>
                <div className="flex gap-1 p-1 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
                  {[{ value: 'vi', label: 'Tiếng Việt' }, { value: 'en', label: 'English' }].map((l) => (
                    <button key={l.value} type="button" onClick={() => setForm((f) => ({ ...f, language: l.value }))}
                      className={`px-2.5 py-0.5 rounded-md text-xs font-medium transition-all ${
                        form.language === l.value ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'
                      }`}>
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Import */}
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileLoad} />
                <button type="button" onClick={() => fileRef.current?.click()} className="btn btn-secondary text-xs">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                  {t('scenario.import')}
                </button>
                {importPayload && <span className="text-[10px] text-[var(--text-disabled)]">{t('scenario.imported')}</span>}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-[var(--error)] bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] p-3 rounded-xl">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleStep1Next}
              disabled={!form.title.trim()}
              className="w-full btn btn-primary text-sm py-3"
            >
              {lang === 'vi' ? 'Tiếp Tục →' : 'Continue →'}
            </button>
          </div>
        ) : step === 2 ? (
          // =============================================
          // STEP 2 — AI CRAFTING SCREEN
          // =============================================
          <div className="flex flex-col items-center space-y-6">
            <div className="text-center space-y-1">
              <h2 className="text-base font-bold text-[var(--text-primary)] animate-pulse" style={{ animationDuration: '2s' }}>
                {lang === 'vi' ? 'AI đang kiến tạo thế giới...' : 'AI is crafting your world...'}
              </h2>
              <p className="text-xs text-[var(--text-tertiary)]">
                {lang === 'vi' ? 'Vui lòng chờ' : 'Please wait'}
                <span className="inline-block animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
                <span className="inline-block animate-pulse" style={{ animationDelay: '300ms' }}>.</span>
                <span className="inline-block animate-pulse" style={{ animationDelay: '600ms' }}>.</span>
              </p>
            </div>

            {/* Stage tracker */}
            <div className="w-full max-w-sm space-y-3">
              {[
                {
                  key: 'genre',
                  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>,
                  label: lang === 'vi' ? 'Phân tích thể loại' : 'Analyzing genre',
                  labelDone: lang === 'vi' ? 'Hoàn tất thể loại' : 'Genre done',
                },
                {
                  key: 'story',
                  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>,
                  label: lang === 'vi' ? 'Xây dựng cốt truyện' : 'Building storyline',
                  labelDone: lang === 'vi' ? 'Hoàn tất cốt truyện' : 'Storyline done',
                },
                {
                  key: 'chars',
                  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>,
                  label: lang === 'vi' ? 'Tạo nhân vật' : 'Creating characters',
                  labelDone: lang === 'vi' ? 'Hoàn tất nhân vật' : 'Characters done',
                },
                {
                  key: 'lore',
                  icon: <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
                  label: lang === 'vi' ? 'Rút tri thức thế giới' : 'Extracting world lore',
                  labelDone: lang === 'vi' ? 'Hoàn tất tri thức' : 'Lore done',
                },
              ].map((stage, idx) => {
                // Determine stage state based on expandPhase
                let state = 'pending'
                const phaseOrder = ['genre', 'story', 'chars', 'lore']
                const currentIdx = phaseOrder.indexOf(expandPhase)
                if (currentIdx > idx) state = 'done'
                else if (currentIdx === idx) state = 'active'
                const isDone = state === 'done'
                const isActive = state === 'active'
                return (
                  <div key={stage.key} className={`flex items-center gap-3 transition-all duration-300 ${isActive ? 'opacity-100' : isDone ? 'opacity-60' : 'opacity-30'}`}>
                    {/* Icon circle */}
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                      isDone
                        ? 'bg-[var(--accent)] text-white'
                        : isActive
                          ? 'bg-[var(--accent-muted)] border border-[var(--accent)] text-[var(--accent)]'
                          : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-disabled)]'
                    }`}>
                      {isDone ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : isActive ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="animate-spin" style={{ animationDuration: '1s' }}>
                          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                      ) : (
                        stage.icon
                      )}
                    </div>
                    {/* Label */}
                    <span className={`text-xs font-medium flex-1 ${
                      isActive
                        ? 'text-[var(--text-primary)]'
                        : isDone
                          ? 'text-[var(--text-tertiary)]'
                          : 'text-[var(--text-disabled)]'
                    }`}>
                      {isDone ? stage.labelDone : stage.label}
                    </span>
                    {/* Subtle dot for active */}
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse flex-shrink-0" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Genre indicator */}
            {genre && (
              <div className="px-4 py-2 rounded-full bg-[var(--accent-muted)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)]">
                {(() => {
                  for (const cat of ALL_GENRE_CATEGORIES) {
                    const g = cat.genres.find((sg) => sg.id === genre)
                    if (g) return `${cat.icon} ${cat.label[lang] || cat.label.en} › ${g.label[lang] || g.label.en}`
                  }
                  return genre
                })()}
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-sm text-[var(--error)] bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] p-3 rounded-xl">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}
          </div>
        ) : (
          // =============================================
          // STEP 3 — REVIEW & EDIT
          // =============================================
          <div className="space-y-5">

            {/* Section header */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[var(--accent-muted)] flex items-center justify-center flex-shrink-0">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)]" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <div>
                <h2 className="text-base font-bold text-[var(--text-primary)]">{form.title}</h2>
                <p className="text-xs text-[var(--text-tertiary)]">{lang === 'vi' ? 'Chỉnh sửa thế giới của bạn' : 'Edit your world'}</p>
              </div>
            </div>

            {/* Seed hint */}
            <div className="flex items-start gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)] flex-shrink-0 mt-0.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                {lang === 'vi'
                  ? 'Các chi tiết bên dưới chỉ là hạt giống để AI hiểu thế giới của bạn. Nội dung chi tiết, mô tả và tương tác sẽ được tạo khi bạn bắt đầu chơi.'
                  : 'The details below are seeds to help AI understand your world. Full content, descriptions, and interactions are generated as you play.'}
              </p>
            </div>

            {/* Entity editor card */}
            <div className="card overflow-hidden">

              {/* Tab bar */}
              <div className="p-4 border-b border-[var(--border-subtle)] space-y-2">
                <p className="text-[10px] font-semibold text-[var(--text-disabled)] uppercase tracking-wider">
                  {lang === 'vi' ? 'Các thành phần thế giới do AI tạo — nhấn để xem / sửa' : 'World components generated by AI — tap to view / edit'}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {ENTITY_TYPES.map((et) => {
                    const count = entities.filter((e) => e.type === et.key).length
                    const active = activeEntityType === et.key
                    return (
                      <button key={et.key} type="button"
                        onClick={() => { setActiveEntityType(et.key); cancelEdit() }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                          active ? 'border-[var(--border-strong)]' : 'border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]'
                        }`}
                        style={active ? { backgroundColor: et.bgColor, color: et.color } : {}}>
                        <span>{et.icon}</span>
                        <span>{t(et.labelKey)}</span>
                        <span className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          active ? 'bg-black/10' : 'bg-[var(--bg-base)]'
                        }`}>{count}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Rank tab note — ranks are simple entities now */}
              </div>

              {/* Content: ADD/EDIT form OR view list */}
              {editTarget !== null ? (
                // ADD / EDIT FORM
                <div className="p-4 bg-[var(--bg-base)] border-t border-[var(--border-subtle)] space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                      style={{ backgroundColor: getEntityBg(activeEntityType) }}>
                      {getEntityIcon(activeEntityType)}
                    </div>
                    <p className="text-xs font-bold text-[var(--text-primary)]">
                      {isEditing ? (lang === 'vi' ? 'Sửa' : 'Edit') : (lang === 'vi' ? 'Thêm mới' : 'Add new')} {getEntityLabel(activeEntityType)}
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(ENTITY_FIELDS[activeEntityType] || []).map((fDef) => (
                      <div key={fDef.key} className="space-y-1">
                        <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                          {t(fDef.labelKey)}
                        </label>
                        {fDef.isNumber ? (
                          <div className="flex items-center gap-3">
                            <input
                              type="range" min="1" max="10"
                              value={entityDraft[fDef.key] || 5}
                              onChange={updateDraft(fDef.key)}
                              className="flex-1 accent-[var(--accent)]"
                            />
                            <span className="text-xs font-mono text-[var(--text-secondary)] w-6 text-center">
                              {entityDraft[fDef.key] || 5}
                            </span>
                          </div>
                        ) : fDef.key === 'sub_tier' ? (
                          <div className="flex gap-1.5">
                            {[1, 2, 3].map((val) => {
                              const labels = { 1: lang === 'vi' ? 'Sơ Kỳ' : 'Early', 2: lang === 'vi' ? 'Trung Kỳ' : 'Mid', 3: lang === 'vi' ? 'Hậu Kỳ' : 'Late' }
                              const isActive = Number(entityDraft[fDef.key]) === val
                              return (
                                <button key={val} type="button"
                                  onClick={() => setEntityDraft((d) => ({ ...d, [fDef.key]: val }))}
                                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                    isActive
                                      ? 'bg-[var(--warning-muted)] border-[var(--border-strong)] text-[var(--warning)]'
                                      : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)]'
                                  }`}>
                                  {labels[val]}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <textarea
                            value={entityDraft[fDef.key] || ''}
                            onChange={updateDraft(fDef.key)}
                            placeholder={fDef.placeholder ? (lang === 'vi' ? 'Nhập...' : 'Enter...') : ''}
                            rows={fDef.key === 'description' ? 2 : 1}
                            className="input textarea text-xs resize-none w-full"
                          />
                        )}
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <button type="button" onClick={saveEntity}
                        disabled={!entityDraft.name?.trim()}
                        className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                        {lang === 'vi' ? 'Lưu' : 'Save'}
                      </button>
                      <button type="button" onClick={cancelEdit}
                        className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-tertiary)] text-xs hover:text-[var(--text-secondary)] transition-all">
                        {lang === 'vi' ? 'Hủy' : 'Cancel'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                // VIEW MODE
                <div className="divide-y divide-[var(--border-subtle)]">
                  {/* RANK TAB → RankListView (all edits inline) */}
                  {activeEntityType === 'rank' ? (
                    <div className="p-4">
                      <RankListView
                        powerSystem={powerSystemDraft}
                        language={lang}
                        onChange={(data) => setPowerSystemDraft(data)}
                      />
                    </div>
                  ) : (
                    // All other entity types — list view
                    entitiesOfType.length === 0 ? (
                      // Empty state
                      <div className="p-8 text-center space-y-3">
                        <div className="w-12 h-12 rounded-full mx-auto flex items-center justify-center text-2xl"
                          style={{ backgroundColor: getEntityBg(activeEntityType) }}>
                          {getEntityIcon(activeEntityType)}
                        </div>
                        <div>
                          <p className="text-sm text-[var(--text-tertiary)]">
                            {lang === 'vi' ? 'Chưa có mục nào loại này' : 'No items of this type yet'}
                          </p>
                          <p className="text-xs text-[var(--text-disabled)] mt-1">
                            {lang === 'vi' ? 'Nhấn nút bên dưới để tạo mới' : 'Tap the button below to add one'}
                          </p>
                        </div>
                        <button type="button" onClick={() => startAddEntity(activeEntityType)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--accent)] text-white text-xs font-semibold hover:opacity-90 transition-all">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                          </svg>
                          {lang === 'vi' ? 'Thêm' : 'Add'} {getEntityLabel(activeEntityType)}
                        </button>
                      </div>
                    ) : (
                      // Has items
                      <>
                        {entitiesOfType.map((entity) => (
                          <div key={entityId(entity)} className="p-4 hover:bg-[var(--accent-muted)]/20 transition-colors group">
                            <div className="flex items-start gap-3">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-base mt-0.5"
                                style={{ backgroundColor: getEntityBg(entity.type) }}>
                                {getEntityIcon(entity.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-[var(--text-primary)]">{entity.name}</p>
                                <div className="mt-1 space-y-0.5">
                                  {Object.entries(entity)
                                    .filter(([k, v]) => k !== 'type' && k !== '_id' && k !== 'name' && v !== undefined && v !== null && String(v).trim() && String(v) !== '0')
                                    .map(([k, v]) => (
                                      <p key={k} className="text-[11px] text-[var(--text-tertiary)]">
                                        <span className="text-[10px] font-bold uppercase tracking-wider mr-1">{t(`entity.${k}`) || k}:</span>
                                        {k === 'sub_tiers' ? (
                                          <span className="inline-flex gap-1 flex-wrap">
                                            {String(v).split(',').map((tier, i) => (
                                              <span key={i} className="inline-block px-1.5 py-0.5 rounded bg-[var(--warning-muted)] text-[var(--warning)] text-[10px] font-medium">{tier.trim()}</span>
                                            ))}
                                          </span>
                                        ) : k === 'sub_tier' ? (
                                          <span className="inline-block px-1.5 py-0.5 rounded bg-[var(--warning-muted)] text-[var(--warning)] text-[10px] font-medium">
                                            {entity.type === 'npc' ? (['Sơ Kỳ', 'Trung Kỳ', 'Hậu Kỳ'][Number(v) - 1] || v) : resolveEntityValue(k, String(v), locale)}
                                          </span>
                                        ) : (
                                          <span>{resolveEntityValue(k, String(v), locale)}</span>
                                        )}
                                      </p>
                                    ))}
                                </div>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button type="button" onClick={() => startEditEntity(entity)}
                                  className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all"
                                  title={lang === 'vi' ? 'Sửa' : 'Edit'}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                  </svg>
                                </button>
                                <button type="button" onClick={() => deleteEntity(entity)}
                                  className="p-1.5 rounded-lg text-[var(--text-disabled)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] transition-all"
                                  title={lang === 'vi' ? 'Xóa' : 'Delete'}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* Add more button */}
                        <div className="p-3 bg-[var(--bg-base)] border-t border-[var(--border-subtle)]">
                          <button type="button" onClick={() => startAddEntity(activeEntityType)}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-[var(--border-subtle)] text-[var(--text-disabled)] text-xs hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-muted)] transition-all">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            {lang === 'vi' ? 'Thêm' : 'Add'} {getEntityLabel(activeEntityType)}
                          </button>
                        </div>
                      </>
                    )
                  )}
                </div>
              )}
            </div>

            {/* Narrative Identity */}
            <div className="card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent)]" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                </svg>
                <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {lang === 'vi' ? 'Bản Sắc Ngôn Ngữ' : 'Narrative Identity'}
                </p>
              </div>

              {/* Protagonist Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {lang === 'vi' ? 'Tên Nhân Vật Chính' : 'Protagonist Name'}
                </label>
                <input
                  value={form.protagonist_name || ''}
                  onChange={update('protagonist_name')}
                  placeholder={lang === 'vi' ? 'VD: Lâm Động' : 'e.g. Linh Dong'}
                  className="input text-sm"
                />
                <p className="text-[10px] text-[var(--text-disabled)]">
                  {lang === 'vi' ? 'Tên nhân vật chính của bạn. Để trống để tự chọn.' : 'Your main character name. Leave blank to choose later.'}
                </p>
              </div>

              {/* POV */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  POV / {lang === 'vi' ? 'Ngôi Kể' : 'Narrative POV'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {POV_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((f) => ({ ...f, narrative_pov: opt.value }))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        form.narrative_pov === opt.value
                          ? 'bg-[var(--accent)] border-[var(--border-strong)] text-white'
                          : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]'
                      }`}>
                      {opt.label[lang] || opt.label.en}
                    </button>
                  ))}
                </div>
              </div>

              {/* Writing Style */}
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {lang === 'vi' ? 'Phong Cách Viết' : 'Writing Style'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {WRITING_STYLE_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button"
                      onClick={() => setForm((f) => ({ ...f, writing_style: opt.value }))}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        form.writing_style === opt.value
                          ? 'bg-[var(--accent)] border-[var(--border-strong)] text-white'
                          : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]'
                      }`}>
                      {opt.label[lang] || opt.label.en}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Text fields */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--text-tertiary)]" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                </svg>
                <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {lang === 'vi' ? 'Văn Bản Chi Tiết' : 'Detailed Text'}
                </p>
              </div>
              {TEXT_FIELDS.map((field) => (
                <div key={field.key} className="card p-5 space-y-2">
                  <label className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                    {t(field.labelKey)}
                  </label>
                  <textarea
                    value={form[field.key] || ''}
                    onChange={update(field.key)}
                    placeholder={field.placeholder[lang]}
                    rows={field.rows}
                    className="input textarea text-sm resize-none"
                  />
                </div>
              ))}
            </div>

            {/* Adventure name */}
            {!isEditMode && (
              <div className="card p-5 space-y-2">
                <p className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {t('scenario.adventureName')}
                </p>
                <input
                  value={adventureName}
                  onChange={(e) => setAdventureName(e.target.value)}
                  placeholder={lang === 'vi' ? 'VD: Hành trình đầu tiên' : 'e.g. My First Adventure'}
                  className="input text-sm"
                />
                <p className="text-[10px] text-[var(--text-disabled)] -mt-1">{t('scenario.adventureNameHint')}</p>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-[var(--error)] bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] p-3 rounded-xl">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                {error}
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3">
              {!isEditMode && (
                <button type="button" onClick={() => setStep(1)}
                  className="px-4 py-3 rounded-xl border border-[var(--border-default)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--accent-muted)] hover:text-[var(--text-primary)] transition-all">
                  ← {lang === 'vi' ? 'Quay lại' : 'Back'}
                </button>
              )}
              <button
                type="button"
                onClick={handleEnterWorld}
                disabled={loading || !form.title.trim()}
                className={`${isEditMode ? 'w-full' : 'flex-1'} btn btn-primary text-sm py-3`}
              >
                {loading ? (
                  <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                    <polygon points="5 3 19 12 5 21 5 3" />
                  </svg>
                )}
                {loading
                  ? (isEditMode ? (lang === 'vi' ? 'Đang lưu...' : 'Saving...') : (lang === 'vi' ? 'Đang bước vào...' : 'Entering...'))
                  : isEditMode ? (lang === 'vi' ? 'Lưu Thay Đổi' : 'Save Changes')
                    : (lang === 'vi' ? 'Bước Vào Thế Giới' : 'Enter World')}
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
