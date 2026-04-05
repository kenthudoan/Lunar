/**
 * PowerSystemEditor — compact hierarchical power system editor.
 *
 * Layout:
 * - "Cấp Bậc" section: horizontal stage chips, click to expand sub-stages
 * - "Đới / Chú / Dịch" section: sub-tier names in a compact grid
 * - Axis list: collapsible, each axis is a card
 * - AI generation: generates complete multi-level names automatically
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { VI_SUBS, EN_SUBS, PT_SUBS, getSubStages } from '../i18n'

/** Short labels in editor — long English text was crowding the row vs. the real stage name. */
const STAGE_STYLE_OPTIONS = [
  { value: 'early_mid_late', labelVi: 'Sơ / Trung / Hậu', labelEn: 'Early / Mid / Late' },
  { value: 'named_step',     labelVi: 'Cấp có tên',       labelEn: 'Named tiers' },
  { value: 'numeric_step',   labelVi: 'Số (1, 2, 3…)',   labelEn: 'Numeric' },
  { value: 'none',           labelVi: 'Không chia nhỏ',   labelEn: 'No sub-tiers' },
]

const VALID_STAGE_STYLES = new Set(STAGE_STYLE_OPTIONS.map(o => o.value))

function stageStyleLabel(opt, language) {
  return language === 'vi' ? opt.labelVi : opt.labelEn
}

const STAGE_STYLE_OPTIONS = [
  { value: 'early_mid_late', labelVi: 'Sơ / Trung / Hậu', labelEn: 'Early / Mid / Late' },
  { value: 'named_step',     labelVi: 'Cấp có tên',       labelEn: 'Named tiers' },
  { value: 'numeric_step',   labelVi: 'Số (1, 2, 3…)',   labelEn: 'Numeric' },
  { value: 'none',           labelVi: 'Không chia nhỏ',   labelEn: 'No sub-tiers' },
]

// ── Helpers ─────────────────────────────────────────────────────────────────

function uid() {
  return `id_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

function cloneDeep(obj) {
  return JSON.parse(JSON.stringify(obj))
}

/** Strip Vietnamese diacritics so slug matches backend normalization. */
function _stripDiacritics(text) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^\w]/g, '')
}

function _slugify(text) {
  return _stripDiacritics(String(text)).toLowerCase().replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, 48) || `stage`
}

/** Ensure API / older payloads always have valid stage_style (preview and rows share the same fields). */
function normalizeStage(stage, index, language = 'vi') {
  if (!stage || typeof stage !== 'object') {
    return {
      name: `stage_${index}`,
      order: index + 1,
      stage_style: 'none',
      sub_stages: [],
      weight: 1.0,
    }
  }
  const rawName = stage.name != null ? String(stage.name).trim() : ''
  // If name is empty, slugify → readable as fallback
  const resolvedName = rawName || (
    stage.slug != null
      ? String(stage.slug).replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
      : (language === 'vi' ? `Cấp ${index + 1}` : `Tier ${index + 1}`)
  )
  // slug: computed from name using same logic as backend (no diacritics → underscore)
  const slug = stage.slug != null && String(stage.slug).trim()
    ? String(stage.slug).trim()
    : _slugify(resolvedName)
  const stage_style = VALID_STAGE_STYLES.has(stage.stage_style) ? stage.stage_style : 'none'
  const sub_stages = Array.isArray(stage.sub_stages)
    ? stage.sub_stages.map((ss, j) => {
        if (typeof ss === 'string') {
          return { key: `sub_${index}_${j}`, name: ss }
        }
        if (ss && typeof ss === 'object') {
          const ssName = ss.name != null ? String(ss.name).trim() : ''
          const ssKey = String(ss.key ?? '').trim()
          const resolvedSsName = ssName || (ssKey ? ssKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '')
          return {
            key: ssKey || `sub_${index}_${j}`,
            name: resolvedSsName,
          }
        }
        return { key: `sub_${index}_${j}`, name: '' }
      })
    : []
  return {
    ...stage,
    name: resolvedName,
    slug,
    order: typeof stage.order === 'number' ? stage.order : index + 1,
    stage_style,
    sub_stages,
    weight: typeof stage.weight === 'number' ? stage.weight : 1.0,
  }
}

function normalizePowerSystem(raw, language = 'vi') {
  if (!raw || typeof raw !== 'object') return raw
  const axes = Array.isArray(raw.axes)
    ? raw.axes.map((axis, ai) => {
        if (!axis || typeof axis !== 'object') return axis
        const stages = Array.isArray(axis.stages)
          ? axis.stages.map((st, si) => normalizeStage(st, si, language))
          : []
        const axis_id =
          axis.axis_id ||
          (axis.axis_name && String(axis.axis_name).toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '').slice(0, 48)) ||
          `axis_${ai}`
        const axis_name = axis.axis_name != null && String(axis.axis_name).trim()
          ? String(axis.axis_name).trim()
          : axis.name != null && String(axis.name).trim()
            ? String(axis.name).trim()
            : ''
        return { ...axis, axis_id, axis_name, stages }
      })
    : []
  return { ...raw, axes }
}

// ── Sub-tier chip (compact pill for the sub-tier section) ────────────────────

function SubTierChip({ sub, onRename, disabled }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(sub.name)

  useEffect(() => { setVal(sub.name) }, [sub.name])

  return (
    <div className="flex items-center gap-1 group">
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { setEditing(false); onRename(val) }}
          onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onRename(val) } }}
          className="input text-[10px] py-0.5 px-1.5 w-20 bg-[var(--bg-base)]"
        />
      ) : (
        <span
          onClick={() => !disabled && setEditing(true)}
          className={`text-[10px] px-2 py-0.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-secondary)] ${!disabled ? 'hover:border-[var(--accent)] cursor-pointer' : 'opacity-60'}`}
        >
          {sub.name}
        </span>
      )}
    </div>
  )
}

// ── Stage row (compact row for the stage list) ───────────────────────────────

function StageRow({ stage, index, language, onChange, onRemove, disabled }) {
  const [expanded, setExpanded] = useState(false)
  const styleValue = VALID_STAGE_STYLES.has(stage.stage_style) ? stage.stage_style : 'none'
  const hasSubs = styleValue === 'early_mid_late' && stage.sub_stages?.length > 0
  const subs = getSubStages(language)
  const displayValue = stage.name != null ? String(stage.name) : ''

  const handleStyleChange = (newStyle) => {
    const newSubStages = newStyle === 'early_mid_late'
      ? subs.map((s, si) => ({ ...s, key: `${s.key}_${index}` }))
      : []
    onChange({ ...stage, stage_style: newStyle, sub_stages: newSubStages })
  }

  return (
    <div className="relative">
      {/* Name row + compact style select (dropdown label is not the stage name) */}
      <div className={`flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 px-3 py-2 rounded-xl border transition-all ${
        expanded
          ? 'border-[var(--accent)] bg-[var(--bg-elevated)]'
          : 'border-[var(--border-subtle)] bg-[var(--bg-base)] hover:border-[var(--border-default)]'
      }`}>
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {hasSubs ? (
            <button
              type="button"
              onClick={() => setExpanded(v => !v)}
              className="flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] text-[var(--text-disabled)] hover:text-[var(--accent)] transition-colors"
            >
              <svg
                width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                style={{ transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ) : (
            <div className="w-5 flex-shrink-0" />
          )}

          <span className="text-[9px] font-mono text-[var(--text-disabled)] w-3 text-right flex-shrink-0">
            {index + 1}
          </span>

          <input
            value={displayValue}
            onChange={e => onChange({ ...stage, name: e.target.value })}
            disabled={disabled}
            className="input text-xs font-medium min-w-0 flex-1 bg-[var(--bg-base)] sm:bg-transparent border border-[var(--border-subtle)] sm:border-none rounded-lg sm:rounded-none px-2 py-1 sm:p-0 shadow-none focus:ring-1 focus:ring-[var(--accent)] sm:focus:ring-0"
            placeholder={language === 'vi' ? 'Tên cấp (VD: Trúc Cơ)' : 'Stage name (e.g. Foundation)'}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={styleValue}
            onChange={e => handleStyleChange(e.target.value)}
            disabled={disabled}
            title={language === 'vi' ? 'Kiểu chia nhỏ trong cấp' : 'Sub-tier style'}
            className="input text-[9px] py-1.5 px-2 w-full sm:w-auto sm:max-w-[10rem] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg"
          >
            {STAGE_STYLE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{stageStyleLabel(o, language)}</option>
            ))}
          </select>

          {index > 0 && !disabled && (
            <button
              type="button"
              onClick={onRemove}
              className="text-[var(--text-disabled)] hover:text-[var(--error)] transition-colors flex-shrink-0 p-1"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded: show sub-stages inline */}
      {expanded && hasSubs && (
        <div className="mt-1 ml-8 mr-2 p-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)]">
          <div className="flex flex-wrap gap-1.5">
            {stage.sub_stages.map((sub, si) => (
              <SubTierChip
                key={sub.key || si}
                sub={sub}
                disabled={disabled}
                onRename={newName => {
                  const newSubs = [...stage.sub_stages]
                  newSubs[si] = { ...newSubs[si], name: newName }
                  onChange({ ...stage, sub_stages: newSubs })
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Axis card (collapsible) ──────────────────────────────────────────────────

function AxisCard({ axis, index, allAxes, language, onChange, onRemove, disabled }) {
  const [collapsed, setCollapsed] = useState(false)
  const isOnly = allAxes.length === 1
  const hasSubs = axis.stages.some(s => s.stage_style === 'early_mid_late' && s.sub_stages?.length > 0)
  const visibleStages = axis.stages

  // Compact preview: show first + last stage name
  const previewStages = visibleStages.length <= 4
    ? visibleStages.map(s => s.name)
    : [
        ...visibleStages.slice(0, 2).map(s => s.name),
        '…',
        ...visibleStages.slice(-1).map(s => s.name),
      ]

  return (
    <div className="border border-[var(--border-default)] rounded-2xl overflow-hidden bg-[var(--bg-elevated)]">
      {/* Axis header */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Primary toggle */}
        <button
          onClick={() => onChange({ ...axis, is_primary: !axis.is_primary })}
          disabled={disabled}
          className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all ${
            axis.is_primary
              ? 'bg-[var(--warning)] border-[var(--warning)]'
              : 'border-[var(--border-subtle)] hover:border-[var(--warning)]'
          }`}
        >
          {axis.is_primary && (
            <svg width="8" height="8" viewBox="0 0 24 24" fill="white" stroke="none">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
          )}
        </button>

        {/* Collapsed: show axis name + preview */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setCollapsed(v => !v)}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
              {axis.axis_name || (language === 'vi' ? 'Trục không tên' : 'Unnamed Axis')}
            </span>
            {!axis.visible && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full border border-[var(--border-subtle)] text-[var(--text-disabled)] shrink-0">
                🔒 AI
              </span>
            )}
          </div>
          {!collapsed && (
            <div className="text-[10px] text-[var(--text-disabled)] mt-0.5 truncate">
              {previewStages.join(' › ')}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Collapse toggle */}
          <button
            onClick={() => setCollapsed(v => !v)}
            className="p-1.5 rounded-lg text-[var(--text-disabled)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-base)] transition-all"
          >
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              style={{ transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Visibility */}
          <button
            onClick={() => onChange({ ...axis, visible: !axis.visible })}
            disabled={disabled}
            className={`p-1.5 rounded-lg border transition-all ${
              axis.visible
                ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
                : 'border-[var(--border-subtle)] text-[var(--text-disabled)]'
            }`}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {axis.visible
                ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></>
              }
            </svg>
          </button>

          {!isOnly && !disabled && (
            <button
              onClick={onRemove}
              className="p-1.5 rounded-lg text-[var(--text-disabled)] hover:text-[var(--error)] hover:border-[var(--error)] border border-transparent hover:border-current transition-all"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded: stage list */}
      {!collapsed && (
        <div className="px-3 pb-3 space-y-1.5">
          {/* Axis name + description editing */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1">
              <input
                value={axis.axis_name}
                onChange={e => onChange({ ...axis, axis_name: e.target.value })}
                disabled={disabled}
                className="input text-xs font-semibold w-full"
                placeholder={language === 'vi' ? 'Tên trục (VD: Tu Lực)' : 'Axis name (e.g. Cultivation Power)'}
              />
              <input
                value={axis.description}
                onChange={e => onChange({ ...axis, description: e.target.value })}
                disabled={disabled}
                className="input text-[10px] w-full mt-1"
                placeholder={language === 'vi' ? 'Mô tả trục này đo lường gì…' : 'What does this axis measure…'}
              />
            </div>
          </div>

          {/* Weight */}
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] text-[var(--text-disabled)] w-10 shrink-0">
              {language === 'vi' ? 'Trọng số' : 'Weight'}
            </span>
            <input
              type="range" min="0.1" max="2" step="0.1"
              value={axis.weight}
              onChange={e => onChange({ ...axis, weight: parseFloat(e.target.value) })}
              disabled={disabled}
              className="flex-1 accent-[var(--accent)]"
            />
            <span className="text-[9px] font-mono text-[var(--text-secondary)] w-6 text-right">{axis.weight.toFixed(1)}</span>
          </div>

          {/* Stages */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-1">
              <span className="text-[9px] font-semibold text-[var(--text-disabled)] uppercase tracking-wider">
                {language === 'vi' ? 'Cấp Bậc' : 'Stages'}
              </span>
              {!disabled && (
                <button
                  onClick={() => {
                    const slug = `stage_${axis.stages.length}`
                    const display = language === 'vi' ? `Cấp ${axis.stages.length + 1}` : `Tier ${axis.stages.length + 1}`
                    const newStage = {
                      name: display,  // display name
                      slug,           // internal key
                      order: axis.stages.length + 1,
                      stage_style: 'none',
                      sub_stages: [],
                      weight: 1.0,
                    }
                    onChange({ ...axis, stages: [...axis.stages, newStage] })
                  }}
                  className="text-[9px] text-[var(--accent)] hover:underline flex items-center gap-0.5"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                  {language === 'vi' ? 'Thêm cấp' : 'Add stage'}
                </button>
              )}
            </div>
            {axis.stages.map((stage, si) => (
              <StageRow
                key={stage.name || si}
                stage={stage}
                index={si}
                language={language}
                disabled={disabled}
                onChange={updatedStage => {
                  const stages = [...axis.stages]
                  stages[si] = updatedStage
                  onChange({ ...axis, stages })
                }}
                onRemove={() => {
                  const stages = axis.stages.filter((_, i) => i !== si)
                  onChange({ ...axis, stages })
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Preview panel (compact grid) ─────────────────────────────────────────────

function PreviewPanel({ data, language }) {
  if (!data || !data.axes || !data.axes.length) return null

  // Show ALL visible axes (not just primary) in multi-axis mode
  const visibleAxes = data.axes.filter(a => a.visible !== false)

  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-base)] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-[var(--text-disabled)] uppercase tracking-wider">
          {language === 'vi' ? 'Xem trước hiển thị' : 'Display Preview'}
        </p>
        <span className="text-[9px] text-[var(--text-disabled)]">
          {language === 'vi' ? 'Trong game' : 'In game'}
        </span>
      </div>

      {/* All axis bars */}
      <div className="space-y-2">
        {visibleAxes.map((axis, ai) => {
          const stagesWithSubs = axis.stages.filter(s => s.sub_stages?.length > 0)
          const stagesWithoutSubs = axis.stages.filter(s => !s.sub_stages?.length || s.sub_stages.length === 0)
          const totalBands = axis.stages.reduce((sum, s) => sum + (s.sub_stages?.length || 1), 0)
          const maxRaw = axis.normalization_max || 100

          return (
            <div key={axis.axis_id || ai} className="space-y-1">
              {/* Axis name + primary badge */}
              <div className="flex items-center gap-1.5">
                {axis.is_primary && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="var(--warning)" className="flex-shrink-0">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                )}
                <span className="text-[10px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  {axis.axis_name}
                </span>
              </div>

              {/* Stage chips */}
              {stagesWithoutSubs.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {stagesWithoutSubs.map((s, si) => (
                    <span
                      key={si}
                      className="text-[10px] px-2 py-0.5 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Sub-tiers per stage */}
              {stagesWithSubs.length > 0 && (
                <div className="space-y-1">
                  {stagesWithSubs.map((stage, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <span className="text-[9px] font-medium text-[var(--text-secondary)] w-20 shrink-0 truncate">
                        {stage.name}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {stage.sub_stages.map((sub, si2) => (
                          <span
                            key={si2}
                            className="text-[9px] px-1.5 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-disabled)]"
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {visibleAxes.length === 0 && (
        <p className="text-[10px] text-[var(--text-disabled)] italic">
          {language === 'vi' ? 'Chưa có trục nào hiển thị.' : 'No visible axes.'}
        </p>
      )}
    </div>
  )
}

// ── Empty axis factory ────────────────────────────────────────────────────────

function makeEmptyAxis(language, isPrimary = false) {
  return {
    axis_id: `axis_${Date.now()}`,
    axis_name: '',
    axis_type: 'cultivation',
    is_primary: isPrimary,
    description: '',
    stages: [],
    display_scale: 10,
    normalization_max: 100,
    visible: true,
    weight: 1.0,
  }
}

function makeDefaultStages(language, count = 5, withSubs = false) {
  const subs = withSubs ? getSubStages(language) : []
  const defaultCultivation = [
    'Hấp Khí', 'Trúc Cơ', 'Kết Đan', 'Nguyên Anh', 'Hóa Thần',
    'Luyện Hư', 'Hợp Thể', 'Đại Thừa',
  ]
  const defaultNamed = ['Novice', 'Apprentice', 'Journeyman', 'Expert', 'Master']
  const labels = withSubs ? defaultCultivation : (language !== 'en' ? defaultCultivation.slice(0, count) : defaultNamed.slice(0, count))
  return labels.slice(0, count).map((label, i) => ({
    name: label,
    slug: _slugify(label),
    order: i + 1,
    stage_style: withSubs ? 'early_mid_late' : 'none',
    sub_stages: withSubs ? subs.map((s, si) => ({ ...s, key: `${s.key}_${i}` })) : [],
    weight: 1.0,
  }))
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PowerSystemEditor({
  initialData,
  loreText = '',
  language = 'vi',
  locked = false,
  onSave,
  onChange,
}) {
  const [data, setData] = useState(null)
  const [activeAxis, setActiveAxis] = useState(0)  // which axis tab is active
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const lang = language || 'vi'

  // Guard: only call onChange when data has actually changed after mount.
  // Prevents the parent → powerSystemDraft → remount infinite loop.
  const initializedRef = useRef(false)

  // Initialize from initialData (from expand) or show empty editor
  useEffect(() => {
    initializedRef.current = false
    if (initialData && initialData.axes && initialData.axes.length > 0) {
      setData(normalizePowerSystem(cloneDeep(initialData), lang))
    } else {
      setData({
        power_system_name: lang === 'vi' ? 'Hệ Thống Cấp Bậc' : 'Power System',
        axes: [makeEmptyAxis(lang, true)],
      })
    }
  }, []) // Only on mount

  // Mark as initialized after first data set
  useEffect(() => {
    if (data !== null) {
      initializedRef.current = true
    }
  }, [data])

  // Notify parent of changes — only AFTER mount is complete to avoid triggering remount.
  useEffect(() => {
    if (initializedRef.current && data && onChange) {
      onChange(data)
    }
  }, [data])

  // Reset active tab when axes change (e.g., after AI generation)
  useEffect(() => {
    if (data && data.axes && activeAxis >= data.axes.length) {
      setActiveAxis(0)
    }
  }, [data, activeAxis])

  // ── AI Generation ─────────────────────────────────────────────────────────

  const handleGenerate = useCallback(async () => {
    if (!loreText.trim()) {
      setError(lang === 'vi' ? 'Cần có lore text để AI sinh hệ thống phù hợp.' : 'Lore text is needed for AI to generate.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { generatePowerSystem } = await import('../api')
      const result = await generatePowerSystem({ loreText, language: lang })
      if (result && result.axes && result.axes.length > 0) {
        setData(normalizePowerSystem(cloneDeep(result), lang))
        setSaved(false)
      } else {
        setError(lang === 'vi' ? 'AI trả về dữ liệu không hợp lệ.' : 'AI returned invalid data.')
      }
    } catch (e) {
      setError(lang === 'vi' ? 'Sinh thất bại. Thử lại.' : 'Generation failed. Try again.')
    } finally {
      setLoading(false)
    }
  }, [loreText, lang])

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    if (!data || !data.axes || data.axes.length === 0) return
    const unnamed = data.axes.filter(a => !a.axis_name.trim())
    if (unnamed.length > 0) {
      setError(lang === 'vi' ? 'Mỗi trục cần có tên.' : 'Each axis needs a name.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      await onSave(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(lang === 'vi' ? 'Lưu thất bại.' : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }, [data, onSave, lang])

  // ── Axis management ────────────────────────────────────────────────────────

  const updateAxis = useCallback((index, updated) => {
    setData(prev => {
      if (!prev) return prev
      const axes = [...prev.axes]
      if (updated.is_primary) {
        axes.forEach((a, i) => { if (i !== index) axes[i] = { ...a, is_primary: false } })
      }
      axes[index] = updated
      return { ...prev, axes }
    })
    setSaved(false)
  }, [])

  const addAxis = useCallback(() => {
    setData(prev => {
      if (!prev) return prev
      const newAxis = makeEmptyAxis(lang, false)
      const newAxes = [...prev.axes, newAxis]
      // Auto-focus the new tab
      setActiveAxis(newAxes.length - 1)
      return { ...prev, axes: newAxes }
    })
    setSaved(false)
  }, [lang])

  const removeAxis = useCallback((index) => {
    setData(prev => {
      if (!prev || prev.axes.length <= 1) return prev
      const axes = prev.axes.filter((_, i) => i !== index)
      if (!axes.some(a => a.is_primary)) {
        axes[0] = { ...axes[0], is_primary: true }
      }
      return { ...prev, axes }
    })
    setSaved(false)
  }, [])

  // ── i18n ───────────────────────────────────────────────────────────────────

  const t = (key) => {
    const vi = {
      'title': 'Hệ Thống Cấp Bậc',
      'generate': 'Sinh bằng AI',
      'generating': 'Đang sinh…',
      'save': 'Lưu',
      'saved': 'Đã lưu!',
      'saving': 'Đang lưu…',
      'addAxis': '+ Thêm Trục',
      'loreHint': 'Lore text sẽ được AI dùng để sinh hệ thống cấp bậc phù hợp.',
    }
    const en = {
      'title': 'Power System',
      'generate': 'Generate with AI',
      'generating': 'Generating…',
      'save': 'Save',
      'saved': 'Saved!',
      'saving': 'Saving…',
      'addAxis': '+ Add Axis',
      'loreHint': 'Lore text will be used by AI to generate a fitting power system.',
    }
    return (lang === 'vi' ? vi : en)[key] || key
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (!data) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-[var(--text-tertiary)] animate-pulse">
          {lang === 'vi' ? 'Đang tải…' : 'Loading…'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          <span className="text-sm font-semibold text-[var(--text-primary)]">{t('title')}</span>
          {locked && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-disabled)]">
              🔒 {lang === 'vi' ? 'Đã khóa' : 'Locked'}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading || locked}
            className="btn btn-secondary text-xs py-1.5 disabled:opacity-50 flex items-center gap-1"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="11" height="11" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                {t('generating')}
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                </svg>
                {t('generate')}
              </>
            )}
          </button>
          {!locked && (
            <button
              onClick={handleSave}
              disabled={saving}
              className={`btn text-xs py-1.5 ${saved ? 'btn-primary opacity-80' : 'btn-primary'}`}
            >
              {saving ? t('saving') : saved ? t('saved') : t('save')}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="text-xs text-[var(--error)] bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] p-2 rounded-lg">
          {error}
        </div>
      )}

      {/* System name */}
      <div>
        <label className="text-[10px] font-semibold text-[var(--text-disabled)] uppercase tracking-wider block mb-1">
          {lang === 'vi' ? 'Tên hệ thống' : 'System Name'}
        </label>
        <input
          value={data.power_system_name || ''}
          onChange={e => { setData(d => ({ ...d, power_system_name: e.target.value })); setSaved(false) }}
          className="input text-sm"
          placeholder={lang === 'vi' ? 'VD: Thiên Đạo Tu Luyện Hệ' : 'e.g. Heavenly Cultivation System'}
          disabled={locked}
        />
      </div>

      {/* Lore hint */}
      {loreText && loreText.length > 20 && (
        <div className="text-[10px] text-[var(--text-tertiary)] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-2 rounded-lg flex items-start gap-1.5">
          <span>💡</span>
          <span>{t('loreHint')}</span>
        </div>
      )}

      {/* Axis tabs + active editor */}
      {data.axes && data.axes.length > 0 && (
        <div className="space-y-3">
          {/* Tab bar */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {data.axes.map((axis, si) => (
              <button
                key={axis.axis_id || si}
                onClick={() => setActiveAxis(si)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                  activeAxis === si
                    ? 'bg-[var(--accent)] text-white shadow-sm'
                    : 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--text-primary)]'
                }`}
              >
                {/* Primary badge */}
                {axis.is_primary && (
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                  </svg>
                )}
                {axis.axis_name || (lang === 'vi' ? 'Trục không tên' : 'Unnamed')}
              </button>
            ))}

            {/* Add axis tab button */}
            {!locked && (
              <button
                onClick={addAxis}
                className="flex-shrink-0 w-7 h-7 rounded-xl border border-dashed border-[var(--border-subtle)] text-[var(--text-disabled)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all flex items-center justify-center"
                title={t('addAxis')}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
              </button>
            )}
          </div>

          {/* Active axis card */}
          {data.axes[activeAxis] && (
            <div>
              <AxisCard
                key={data.axes[activeAxis].axis_id || activeAxis}
                axis={data.axes[activeAxis]}
                index={activeAxis}
                allAxes={data.axes}
                language={lang}
                disabled={locked}
                onChange={updated => updateAxis(activeAxis, updated)}
                onRemove={() => {
                  if (data.axes.length > 1) {
                    removeAxis(activeAxis)
                    setActiveAxis(Math.max(0, activeAxis - 1))
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Fallback when no axes */}
      {(!data.axes || data.axes.length === 0) && (
        <p className="text-xs text-[var(--text-disabled)] italic text-center py-4">
          {lang === 'vi' ? 'Chưa có trục nào. Thêm trục để bắt đầu.' : 'No axes yet. Add one to get started.'}
        </p>
      )}

      {/* Preview */}
      <PreviewPanel data={data} language={lang} />
    </div>
  )
}
