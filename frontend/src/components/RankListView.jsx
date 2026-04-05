/**
 * RankListView — compact list + expand to edit (no modal).
 * Axis rows: collapse to one line; primary / visibility / delete on hover.
 */

import { useState } from 'react'
import { VI_SUBS, EN_SUBS, getSubStages } from '../i18n'

const STAGE_STYLES = [
  { value: 'early_mid_late', vi: 'Sơ/Trung/Hậu', en: 'Early/Mid/Late' },
  { value: 'named_step',     vi: 'Cấp có tên',    en: 'Named tiers' },
  { value: 'numeric_step',   vi: 'Số (1, 2, 3…)', en: 'Numeric' },
  { value: 'none',           vi: 'Không chia nhỏ', en: 'No sub-tiers' },
]

function stageStyleLabel(v, lang) {
  const o = STAGE_STYLES.find(s => s.value === v) || STAGE_STYLES[3]
  return lang === 'vi' ? o.vi : o.en
}

function defaultSubs(lang) {
  return lang === 'vi' ? VI_SUBS : EN_SUBS
}

const VI = {
  systems:             'hệ thống',
  primary:             'Chính',
  addAxis:             'Thêm trục',
  addStage:            'Thêm cấp',
  axisName:            'Tên trục',
  axisNamePlaceholder: 'VD: Tu Lực, Tài Chính…',
  desc:                'Mô tả',
  descPlaceholder:     'Trục này đo lường gì…',
  stageName:           'Tên cấp',
  stageNamePlaceholder:'Hấp Khí, Trúc Cơ…',
  subStyle:            'Kiểu cấp con',
  visible:             'Hiển thị',
  weight:              'Trọng số',
  removeAxis:          'Xóa trục',
  removeStage:         'Xóa cấp',
  expandWorld:         'Cấp bậc sẽ được tạo khi bạn nhấn "Mở Rộng Thế Giới" ở bước 2.',
  noRanks:             'Chưa có cấp bậc nào',
  aiGenerated:         'Các hệ thống được AI tạo phù hợp với thế giới truyện.',
  powerSystem:         'Hệ Thống Cấp Bậc',
  stagesShort:         'cấp',
}
const EN = {
  systems:             'systems',
  primary:             'Primary',
  addAxis:             'Add axis',
  addStage:            'Add stage',
  axisName:            'Axis name',
  axisNamePlaceholder: 'e.g. Cultivation, Finance…',
  desc:                'Description',
  descPlaceholder:     'What does this axis measure…',
  stageName:           'Stage name',
  stageNamePlaceholder:'Foundation, Core Formation…',
  subStyle:            'Sub-tier style',
  visible:             'Visible',
  weight:              'Weight',
  removeAxis:          'Delete axis',
  removeStage:         'Delete stage',
  expandWorld:         'Ranks are generated when you expand the world in Step 2.',
  noRanks:             'No ranks yet',
  aiGenerated:         'Systems are AI-generated to fit your world.',
  powerSystem:         'Power System',
  stagesShort:         'stages',
}

function t(key, lang) {
  return (lang === 'vi' ? VI : EN)[key] || key
}

function SubPill({ sub, onRename, readOnly }) {
  const [editing, setEditing] = useState(false)
  const [val, setVal] = useState(sub.name)

  return (
    <span
      onClick={() => !readOnly && !editing && setEditing(true)}
      className={`inline-flex items-center px-1.5 py-0.5 rounded bg-[var(--warning-muted)] border border-[var(--border-default)] text-[var(--warning)] text-[10px] font-medium transition-colors ${readOnly ? '' : 'hover:border-[var(--warning)] cursor-pointer'}`}
    >
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onBlur={() => { setEditing(false); onRename(val) }}
          onKeyDown={e => { if (e.key === 'Enter') { setEditing(false); onRename(val) } }}
          className="w-16 text-[9px] px-1 py-0 bg-[var(--bg-overlay)] border border-[var(--warning)] rounded"
          onClick={e => e.stopPropagation()}
        />
      ) : (
        sub.name
      )}
    </span>
  )
}

function StageRow({ stage, index, onChange, onRemove, lang, editable }) {
  const [editing, setEditing] = useState(false)
  const subs = stage.sub_stages || []
  const displayName = stage.name || (lang === 'vi' ? `Cấp ${index + 1}` : `Tier ${index + 1}`)
  const stageStyle = stage.stage_style || 'none'
  const showSubs = stageStyle === 'early_mid_late'

  const handleStyleChange = (v) => {
    const newSubs = v === 'early_mid_late'
      ? defaultSubs(lang).map((s, i) => ({ ...s, key: `${s.key}_${index}` }))
      : []
    onChange({ ...stage, stage_style: v, sub_stages: newSubs })
  }

  const ro = !editable

  return (
    <div className="flex items-start gap-2 px-3 py-2 hover:bg-[var(--bg-surface)]/80 transition-colors group/row border-b border-[var(--border-subtle)] last:border-b-0">

      <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-md bg-[var(--warning-muted)] border border-[var(--border-default)] flex items-center justify-center text-[var(--warning)] text-[10px] font-bold">
        {stage.order || index + 1}
      </span>

      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center gap-2 flex-wrap">
            {editing && !ro ? (
            <input
              autoFocus
              value={displayName}
              onChange={e => onChange({ ...stage, name: e.target.value })}
              onBlur={() => setEditing(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditing(false) }}
              className="flex-1 min-w-[120px] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2 py-1 text-xs font-semibold text-[var(--text-primary)] focus:border-[var(--border-focus)] focus:outline-none"
              placeholder={t('stageNamePlaceholder', lang)}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span
              onClick={() => !ro && setEditing(true)}
              className={`text-xs font-semibold text-[var(--text-primary)] flex-1 min-w-0 truncate ${ro ? '' : 'cursor-pointer hover:text-[var(--accent)]'}`}
            >
              {displayName}
            </span>
          )}

          <select
            value={stageStyle}
            onChange={e => handleStyleChange(e.target.value)}
            disabled={ro}
            className="text-[9px] py-1 px-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-secondary)] cursor-pointer max-w-[140px] disabled:opacity-60"
            title={t('subStyle', lang)}
            onClick={e => e.stopPropagation()}
          >
            {STAGE_STYLES.map(s => (
              <option key={s.value} value={s.value}>{stageStyleLabel(s.value, lang)}</option>
            ))}
          </select>

          {!ro && (
            <button
              type="button"
              onClick={onRemove}
              className="p-1 rounded text-[var(--text-disabled)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] transition-all opacity-0 group-hover/row:opacity-100"
              title={t('removeStage', lang)}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          )}
        </div>

        {showSubs && subs.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {subs.map((ss, si) => (
              <SubPill
                key={ss.key || si}
                sub={ss}
                readOnly={ro}
                onRename={newVal => {
                  const next = [...subs]
                  next[si] = { ...next[si], name: newVal }
                  onChange({ ...stage, sub_stages: next })
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AxisCard({ axis, index, onChange, onRemove, onAddStage, lang, editable }) {
  const [expanded, setExpanded] = useState(index === 0)
  const sorted = [...(axis.stages || [])].sort((a, b) => (a.order || 0) - (b.order || 0))
  const ro = !editable

  const firstLabel = sorted[0]
    ? (sorted[0].name || (lang === 'vi' ? `Cấp 1` : `Tier 1`))
    : ''
  const lastLabel = sorted.length
    ? (sorted[sorted.length - 1].name || (lang === 'vi' ? `Cấp ${sorted.length}` : `Tier ${sorted.length}`))
    : ''
  const preview = sorted.length >= 2
    ? `${firstLabel} → ${lastLabel}`
    : sorted.length === 1
      ? firstLabel
      : '—'

  const handleStageChange = (idx, updated) => {
    const target = sorted[idx]
    if (!target) return
    const stages = (axis.stages || []).map(s =>
      s.name === target.name && (s.order || 0) === (target.order || 0) ? updated : s,
    )
    onChange({ ...axis, stages })
  }

  const handleStageRemove = (idx) => {
    const target = sorted[idx]
    if (!target) return
    const stages = (axis.stages || []).filter(
      s => !(s.name === target.name && (s.order || 0) === (target.order || 0)),
    )
    onChange({ ...axis, stages })
  }

  const title = (axis.axis_name || '').trim() || t('axisNamePlaceholder', lang)

  return (
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--bg-elevated)] overflow-hidden group/axis">

      <div className="flex items-center gap-2 px-3 py-2.5 min-h-[44px]">
        <button
          type="button"
          className="flex-1 flex items-center gap-2 min-w-0 text-left"
          onClick={() => setExpanded(e => !e)}
        >
          {axis.is_primary && (
            <span className="flex-shrink-0 text-[var(--warning)]" title={t('primary', lang)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
            </span>
          )}
          <span className="font-semibold text-xs text-[var(--text-primary)] truncate">{title}</span>
          <span className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded-md bg-[var(--bg-surface)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">
            {sorted.length} {t('stagesShort', lang)}
          </span>
          <span className={`hidden sm:inline text-[9px] text-[var(--text-disabled)] truncate min-w-0 ${expanded ? 'opacity-40' : ''}`}>
            {preview}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`flex-shrink-0 text-[var(--text-disabled)] transition-transform ml-auto ${expanded ? 'rotate-180' : ''}`}
          >
            <path d="m6 9 6 6 6-6"/>
          </svg>
        </button>

        {!ro && (
          <div
            className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover/axis:opacity-100 transition-opacity duration-150"
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onChange({ ...axis, is_primary: !axis.is_primary })}
              className={`p-1.5 rounded-lg border text-[9px] font-semibold transition-all ${
                axis.is_primary
                  ? 'border-[var(--warning)] text-[var(--warning)] bg-[var(--warning-muted)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-disabled)] hover:border-[var(--warning)]'
              }`}
              title={t('primary', lang)}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="mx-auto">
                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
              </svg>
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...axis, visible: !axis.visible })}
              className={`p-1.5 rounded-lg border transition-all ${
                axis.visible !== false
                  ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent-muted)]'
                  : 'border-[var(--border-subtle)] text-[var(--text-disabled)]'
              }`}
              title={t('visible', lang)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {axis.visible !== false
                  ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                  : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><line x1="1" y1="1" x2="23" y2="23"/></>
                }
              </svg>
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="p-1.5 rounded-lg text-[var(--text-disabled)] hover:text-[var(--error)] hover:bg-[var(--error-muted)] transition-all"
              title={t('removeAxis', lang)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {expanded && (
        <div className="border-t border-[var(--border-subtle)] px-3 pb-3 pt-2 space-y-2">
          <div>
            <label className="text-[9px] text-[var(--text-disabled)] mb-0.5 block">{t('axisName', lang)}</label>
            <input
              value={axis.axis_name || ''}
              onChange={e => onChange({ ...axis, axis_name: e.target.value })}
              readOnly={ro}
              className="w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-2 text-xs font-semibold text-[var(--text-primary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--border-focus)] focus:outline-none read-only:opacity-80"
              placeholder={t('axisNamePlaceholder', lang)}
            />
          </div>
          <div>
            <label className="text-[9px] text-[var(--text-disabled)] mb-0.5 block">{t('desc', lang)}</label>
            <textarea
              value={axis.description || ''}
              onChange={e => onChange({ ...axis, description: e.target.value })}
              readOnly={ro}
              rows={3}
              className="w-full resize-y min-h-[72px] rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 py-2 text-[10px] leading-relaxed text-[var(--text-secondary)] placeholder:text-[var(--text-disabled)] focus:border-[var(--border-focus)] focus:outline-none read-only:opacity-80"
              placeholder={t('descPlaceholder', lang)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] text-[var(--text-disabled)] shrink-0">{t('weight', lang)}</span>
            <input
              type="range"
              min="0.1"
              max="2"
              step="0.1"
              disabled={ro}
              value={axis.weight || 1.0}
              onChange={e => onChange({ ...axis, weight: parseFloat(e.target.value) })}
              className="flex-1 accent-[var(--accent)] disabled:opacity-50"
            />
            <span className="text-[9px] font-mono text-[var(--text-secondary)] w-7 text-right shrink-0">
              {(axis.weight || 1.0).toFixed(1)}
            </span>
          </div>

          {sorted.length > 0 ? (
            <div className="rounded-xl border border-[var(--border-subtle)] overflow-hidden bg-[var(--bg-elevated)]">
              {sorted.map((stage, idx) => (
                <StageRow
                  key={stage.name || idx}
                  stage={stage}
                  index={idx}
                  lang={lang}
                  editable={editable}
                  onChange={updated => handleStageChange(idx, updated)}
                  onRemove={() => handleStageRemove(idx)}
                />
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-[var(--text-disabled)] italic py-1">
              {lang === 'vi' ? 'Chưa có cấp nào.' : 'No stages yet.'}
            </p>
          )}

          {editable && (
            <button
              type="button"
              onClick={onAddStage}
              className="flex items-center gap-1.5 text-[10px] text-[var(--accent)] hover:underline"
            >
              <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              {t('addStage', lang)}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function EmptyState({ lang }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-[var(--warning-muted)] border border-[var(--border-default)] flex items-center justify-center mb-3">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
        </svg>
      </div>
      <p className="text-sm font-bold text-[var(--text-secondary)] mb-1">{t('noRanks', lang)}</p>
      <p className="text-xs text-[var(--text-disabled)] leading-relaxed max-w-[220px]">{t('expandWorld', lang)}</p>
    </div>
  )
}

export default function RankListView({
  powerSystem,
  language = 'vi',
  onChange,
  editable = true,
}) {
  const lang = language || 'vi'

  const axes = powerSystem?.axes
    ? [...powerSystem.axes].sort((a, b) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    : []

  if (!axes.length) return <EmptyState lang={lang} />

  const updateAxis = (index, updated) => {
    if (!onChange) return
    const next = [...axes]
    if (updated.is_primary) next.forEach((a, i) => { if (i !== index) next[i] = { ...a, is_primary: false } })
    next[index] = updated
    onChange({ ...powerSystem, axes: next })
  }

  const removeAxis = (index) => {
    if (!onChange) return
    const next = axes.filter((_, i) => i !== index)
    if (next.length && !next.some(a => a.is_primary)) next[0] = { ...next[0], is_primary: true }
    onChange({ ...powerSystem, axes: next })
  }

  const addAxis = () => {
    if (!onChange) return
    const newAxis = {
      axis_id: `axis_${Date.now()}`,
      axis_name: '',
      axis_type: 'cultivation',
      is_primary: !axes.some(a => a.is_primary),
      description: '',
      stages: [],
      display_scale: 10,
      normalization_max: 100,
      visible: true,
      weight: 1.0,
    }
    onChange({ ...powerSystem, axes: [...axes, newAxis] })
  }

  const addStage = (axisIndex) => {
    const axis = axes[axisIndex]
    const newStage = {
      name: lang === 'vi' ? `Cấp ${(axis.stages?.length || 0) + 1}` : `Tier ${(axis.stages?.length || 0) + 1}`,
      order: (axis.stages?.length || 0) + 1,
      stage_style: 'early_mid_late',
      sub_stages: defaultSubs(lang).map((s, i) => ({ ...s, key: `${s.key}_${Date.now()}_${i}` })),
      weight: 1.0,
    }
    updateAxis(axisIndex, { ...axis, stages: [...(axis.stages || []), newStage] })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2 min-w-0">
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--warning)] animate-pulse flex-shrink-0"/>
          <span className="text-[11px] font-semibold text-[var(--text-secondary)] truncate">
            {powerSystem?.power_system_name || t('powerSystem', lang)}
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--warning-muted)] text-[var(--warning)] font-bold flex-shrink-0">
            {axes.length}
          </span>
          <span className="text-[10px] text-[var(--text-disabled)] flex-shrink-0">{t('systems', lang)}</span>
        </div>
        {editable && (
          <button
            type="button"
            onClick={addAxis}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-[var(--border-strong)] text-[10px] font-medium text-[var(--text-secondary)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all flex-shrink-0"
          >
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            {t('addAxis', lang)}
          </button>
        )}
      </div>

      {axes.map((axis, idx) => (
        <AxisCard
          key={axis.axis_id || idx}
          axis={axis}
          index={idx}
          lang={lang}
          editable={editable}
          onChange={updated => updateAxis(idx, updated)}
          onRemove={() => removeAxis(idx)}
          onAddStage={() => addStage(idx)}
        />
      ))}

      <p className="text-[10px] text-[var(--text-disabled)] px-1">{t('aiGenerated', lang)}</p>
    </div>
  )
}
