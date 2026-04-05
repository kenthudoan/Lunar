import { useState, useEffect } from 'react'
import { X, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'

const FIELD_LABELS = {
  title: 'Tên thế giới',
  description: 'Mô tả',
  tone_instructions: 'Giọng văn',
  opening_narrative: 'Mở đầu',
  lore_text: 'Lore / Thế giới',
}

const FIELD_KEYS = Object.keys(FIELD_LABELS)

export default function LoreExpanderModal({ suggestions, currentForm, onApply, onClose }) {
  const [selected, setSelected] = useState({})
  const [expandedFields, setExpandedFields] = useState({})

  // Pre-select empty fields by default; pre-expand all selected
  useEffect(() => {
    if (!suggestions) return
    const initial = {}
    FIELD_KEYS.forEach(key => {
      const empty = !currentForm[key]?.trim()
      initial[key] = empty
    })
    setSelected(initial)
    // Start with all expanded
    const initExpanded = {}
    FIELD_KEYS.forEach(key => { initExpanded[key] = true })
    setExpandedFields(initExpanded)
  }, [suggestions, currentForm])

  if (!suggestions) return null

  const toggle = (key) => setSelected(prev => ({ ...prev, [key]: !prev[key] }))
  const toggleExpand = (key) => setExpandedFields(prev => ({ ...prev, [key]: !prev[key] }))

  const toggleAll = () => {
    const allSelected = FIELD_KEYS.every(k => selected[k])
    const next = {}
    FIELD_KEYS.forEach(k => { next[k] = !allSelected })
    setSelected(next)
  }

  const allSelected = FIELD_KEYS.every(k => selected[k])
  const noneSelected = FIELD_KEYS.every(k => !selected[k])

  const handleApply = () => {
    const merged = { ...currentForm }
    FIELD_KEYS.forEach(key => {
      if (selected[key]) {
        merged[key] = suggestions.suggestions[key]
      }
    })
    onApply(merged)
  }

  const hasAnyChange = FIELD_KEYS.some(key => {
    const cur = currentForm[key] || ''
    const sug = suggestions.suggestions[key] || ''
    return sug !== cur
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-[#1a1a2e] border border-indigo-500/30 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-indigo-500/20">
          <Sparkles className="w-5 h-5 text-indigo-400 flex-shrink-0" />
          <div>
            <h2 className="text-lg font-semibold text-indigo-100">AI gợi ý mở rộng</h2>
            {suggestions.detected_genre && (
              <p className="text-xs text-indigo-300/70 mt-0.5">
                Phát hiện thể loại: <span className="text-indigo-200">{suggestions.detected_genre}</span>
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 text-indigo-300 hover:text-indigo-100 hover:bg-indigo-500/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Based on hint */}
        {suggestions.based_on?.length > 0 && (
          <div className="px-6 py-2 border-b border-indigo-500/10 bg-indigo-900/20">
            <p className="text-xs text-indigo-300/80">
              Dựa trên: <span className="text-indigo-200">{suggestions.based_on.join(', ')}</span>
            </p>
          </div>
        )}

        {/* Column headers */}
        <div className="grid grid-cols-2 gap-px bg-indigo-500/10 border-b border-indigo-500/20">
          <div className="px-5 py-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-[#141425]">
            Hiện tại
          </div>
          <div className="px-5 py-2.5 text-xs font-semibold text-indigo-300 uppercase tracking-wider bg-[#0e0e20]">
            AI gợi ý
          </div>
        </div>

        {/* Fields */}
        <div className="flex-1 overflow-y-auto divide-y divide-indigo-500/10">
          {FIELD_KEYS.map(key => {
            const current = currentForm[key] || ''
            const suggestion = suggestions.suggestions[key] || ''
            const isSame = suggestion === current
            const isEmpty = !current.trim()
            const isSelected = selected[key]

            return (
              <div key={key} className={`${isSelected ? 'bg-indigo-950/30' : ''}`}>
                {/* Field label + checkbox */}
                <div className="flex items-center gap-3 px-5 py-3">
                  <input
                    type="checkbox"
                    id={`exp-${key}`}
                    checked={isSelected}
                    onChange={() => toggle(key)}
                    className="w-4 h-4 rounded border-indigo-500/50 bg-[#1a1a2e] text-indigo-400 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
                  />
                  <label
                    htmlFor={`exp-${key}`}
                    className="flex-1 text-sm font-medium text-indigo-100 cursor-pointer"
                  >
                    {FIELD_LABELS[key]}
                  </label>
                  <button
                    onClick={() => toggleExpand(key)}
                    className="p-1 text-indigo-400 hover:text-indigo-200 transition-colors"
                  >
                    {expandedFields[key]
                      ? <ChevronUp className="w-4 h-4" />
                      : <ChevronDown className="w-4 h-4" />
                    }
                  </button>
                </div>

                {/* Content comparison */}
                {expandedFields[key] && (
                  <div className="grid grid-cols-2 gap-px bg-indigo-500/10 px-5 pb-4">
                    {/* Current */}
                    <div className="bg-[#141425] rounded-lg p-3">
                      {isEmpty ? (
                        <p className="text-xs text-slate-500 italic">Trống</p>
                      ) : (
                        <p className="text-xs text-slate-400 leading-relaxed whitespace-pre-wrap">
                          {current.length > 300 ? current.slice(0, 300) + '…' : current}
                        </p>
                      )}
                    </div>

                    {/* Suggestion */}
                    <div className="bg-[#0e0e20] rounded-lg p-3">
                      {isSame ? (
                        <p className="text-xs text-slate-500 italic">Giữ nguyên</p>
                      ) : (
                        <p className="text-xs text-indigo-200/90 leading-relaxed whitespace-pre-wrap">
                          {suggestion.length > 300 ? suggestion.slice(0, 300) + '…' : suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-indigo-500/20 bg-[#0e0e20]">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="w-4 h-4 rounded border-indigo-500/50 bg-[#1a1a2e] text-indigo-400 focus:ring-indigo-500 focus:ring-offset-0"
            />
            <span className="text-sm text-slate-300">{noneSelected ? 'Chọn tất cả' : 'Bỏ chọn tất cả'}</span>
          </label>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 rounded-lg transition-colors"
            >
              Bỏ qua
            </button>
            <button
              onClick={handleApply}
              disabled={noneSelected || !hasAnyChange}
              className="px-5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-indigo-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Áp dụng đã chọn
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
