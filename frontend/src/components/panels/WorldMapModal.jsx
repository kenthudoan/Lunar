/** Strip Vietnamese diacritics so slug matches backend _slugify normalization. */
function _stripDiacritics(text) {
  return String(text)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
}

/** Convert a display name to a backend-style slug. */
function _toSlug(text) {
  return _stripDiacritics(String(text)).toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
}

/** Resolve a realm/tier slug value to a display name using the power system config.
 *  Falls back to the hardcoded maps + original value if not found. */
function _resolvePowerValue(key, value, powerSystem, locale) {
  if (!value || !powerSystem || !powerSystem.axes) return null
  const v = String(value).trim()
  const norm = _toSlug(v)

  if (key === 'realm') {
    // Try: exact slug match, then axis_name slug match
    for (const axis of powerSystem.axes) {
      if (axis.axis_id === v || axis.axis_id === norm || _toSlug(axis.axis_id) === norm) {
        return axis.axis_name
      }
      // Also try axis_name slugified
      if (_toSlug(axis.axis_name) === norm) return axis.axis_name
    }
  }

  if (key === 'tier') {
    // Try: stage slug match in any axis
    for (const axis of powerSystem.axes) {
      for (const stage of axis.stages || []) {
        if (stage.slug === v || stage.slug === norm || _toSlug(stage.slug || '') === norm || _toSlug(stage.name || '') === norm) {
          const name = stage.name || v
          // If sub-tier context is needed, could include sub_stage here
          return name
        }
      }
    }
  }

  return null  // let caller use hardcoded maps + fallback
}

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import Modal from '../UI/Modal'
import { useI18n } from '../../i18n'
import { resolveEntityValue } from '../../i18n/index'

const ATTRIBUTE_LABELS = (t) => ({
  description: t('map.attr.description'),
  power_level: t('map.attr.power_level'),
  realm: t('entity.realm'),
  tier: t('entity.tier'),
  sub_tier: t('entity.subTier'),
  location_type: t('map.attr.location_type'),
  faction_type: t('map.attr.faction_type'),
  item_type: t('map.attr.item_type'),
  role: t('map.attr.role'),
  status: t('map.attr.status'),
  mood: t('map.attr.mood'),
  goal: t('map.attr.goal'),
  faction: t('map.attr.faction'),
  leader: t('map.attr.leader'),
  members: t('map.attr.members'),
  influence: t('map.attr.influence'),
  danger_level: t('map.attr.danger_level'),
  rarity: t('map.attr.rarity'),
  material: t('map.attr.material'),
  history: t('map.attr.history'),
  appearance: t('map.attr.appearance'),
  personality: t('map.attr.personality'),
  secret: t('map.attr.secret'),
})

const NODE_COLORS = {
  NPC: '#a78bfa',
  LOCATION: '#34d399',
  FACTION: '#fbbf24',
  ITEM: '#22d3ee',
  EVENT: '#fb7185',
}

const VALID_NODE_TYPES = new Set(['NPC', 'LOCATION', 'FACTION', 'ITEM', 'EVENT'])

const NODE_RADIUS = {
  NPC: 6, LOCATION: 8, FACTION: 7, ITEM: 5, EVENT: 5,
}

const TYPE_POSITIONS = {
  LOCATION: { x: 0, y: 0 },
  NPC: { x: 80, y: -60 },
  FACTION: { x: -80, y: -60 },
  ITEM: { x: 60, y: 80 },
  EVENT: { x: -60, y: 80 },
}

/** Keys usually rendered as a paragraph; others stay on one compact row. */
const MULTILINE_ATTR_KEYS = new Set([
  'description', 'history', 'appearance', 'personality', 'secret', 'goal', 'members', 'material',
])

function sortAttributeEntries(entries) {
  const rank = (k) => {
    if (k === 'description') return 0
    if (MULTILINE_ATTR_KEYS.has(k)) return 1
    return 2
  }
  return [...entries].sort((a, b) => {
    const ra = rank(a[0])
    const rb = rank(b[0])
    if (ra !== rb) return ra - rb
    return a[0].localeCompare(b[0])
  })
}

function isMultilineAttribute(key, val) {
  const s = String(val)
  return MULTILINE_ATTR_KEYS.has(key) || s.includes('\n') || s.length > 72
}

/** Resolve an attribute value — try power system config first, then hardcoded maps. */
function resolvedAttrValue(key, val, powerSystem, loc) {
  const fromPs = _resolvePowerValue(key, val, powerSystem, loc)
  if (fromPs) return fromPs
  return resolveEntityValue(key, String(val), loc)
}

/** Canvas 2D: draw label centered at x, word-wrapped to reduce overlap. */
function fillTextWrappedCenter(ctx, text, x, yTop, maxWidth, lineHeight) {
  const words = String(text).split(/\s+/).filter(Boolean)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  let y = yTop
  for (const ln of lines) {
    ctx.fillText(ln, x, y)
    y += lineHeight
  }
}

export default function WorldMapModal({ open, onClose, campaignId }) {
  const { t, locale } = useI18n()
  const labels = ATTRIBUTE_LABELS(t)
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [loading, setLoading] = useState(false)
  const [hoverNode, setHoverNode] = useState(null)
  const [hoverLink, setHoverLink] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchHighlightSet, setSearchHighlightSet] = useState(null)
  const [powerSystem, setPowerSystem] = useState(null)
  const graphRef = useRef()
  const containerRef = useRef()

  const loadGraph = async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      const { fetchWorldGraph, searchWorldGraph, fetchCampaignPowerSystem } = await import('../../api')
      const [graphDataResult, psResult] = await Promise.allSettled([
        fetchWorldGraph(campaignId),
        fetchCampaignPowerSystem(campaignId),
      ])
      const raw = graphDataResult.status === 'fulfilled' ? graphDataResult.value : { nodes: [], links: [] }
      const filtered = {
        nodes: raw.nodes.filter(n => VALID_NODE_TYPES.has(n.node_type)),
        links: raw.links.filter(l =>
          raw.nodes.some(n => n.id === l.source && VALID_NODE_TYPES.has(n.node_type)) &&
          raw.nodes.some(n => n.id === l.target && VALID_NODE_TYPES.has(n.node_type))
        ),
      }
      setGraphData(filtered)
      setPowerSystem(psResult.status === 'fulfilled' ? psResult.value : null)
    } catch {
      setGraphData({ nodes: [], links: [] })
      setPowerSystem(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) { loadGraph(); setSelectedNode(null); setSearchHighlightSet(null) }
  }, [open, campaignId])

  // Reload graph when new entities are discovered via SSE (entity extraction)
  useEffect(() => {
    if (!open) return
    const handler = () => loadGraph()
    window.addEventListener('worldmap:refresh', handler)
    return () => window.removeEventListener('worldmap:refresh', handler)
  }, [open, campaignId])

  useEffect(() => {
    if (!graphRef.current || graphData.nodes.length === 0) return
    const STRENGTH = 0.05
    const clusterForce = (alpha) => {
      graphData.nodes.forEach((node) => {
        const pos = TYPE_POSITIONS[node.node_type]
        if (!pos) return
        node.vx += (pos.x - (node.x || 0)) * STRENGTH * alpha
        node.vy += (pos.y - (node.y || 0)) * STRENGTH * alpha
      })
    }
    graphRef.current.d3Force('cluster', clusterForce)
    graphRef.current.d3ReheatSimulation()
  }, [graphData])

  const linkCountMap = useMemo(() => {
    const counts = {}
    graphData.links.forEach((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      counts[srcId] = (counts[srcId] || 0) + 1
      counts[tgtId] = (counts[tgtId] || 0) + 1
    })
    return counts
  }, [graphData.links])

  const highlightSet = useMemo(() => {
    if (!hoverNode) return null
    const neighbors = new Set([hoverNode.id])
    graphData.links.forEach((link) => {
      const srcId = typeof link.source === 'object' ? link.source.id : link.source
      const tgtId = typeof link.target === 'object' ? link.target.id : link.target
      if (srcId === hoverNode.id) neighbors.add(tgtId)
      if (tgtId === hoverNode.id) neighbors.add(srcId)
    })
    return neighbors
  }, [hoverNode, graphData.links])

  const nodeCanvasObject = useCallback((node, ctx, globalScale) => {
    const isHighlighted = !highlightSet || highlightSet.has(node.id)
    const radius = NODE_RADIUS[node.node_type] || 5
    const color = NODE_COLORS[node.node_type] || '#94a3b8'
    const nodeLinks = linkCountMap[node.id] || 0
    const isImportant = nodeLinks >= 3 || node.node_type === 'LOCATION'

    ctx.beginPath()
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI)
    ctx.fillStyle = isHighlighted ? color : color + '33'
    ctx.fill()
    if (isHighlighted && globalScale > 0.8) {
      ctx.strokeStyle = color + '66'
      ctx.lineWidth = 1.5
      ctx.stroke()
    }

    const showLabel = isImportant || globalScale > 1.2 || (hoverNode && hoverNode.id === node.id)
    if (showLabel) {
      const label = node.name
      const fontSize = Math.max((isImportant ? 12 : 10) / globalScale, 3)
      ctx.font = `${isImportant ? 'bold ' : ''}${fontSize}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      ctx.fillStyle = isHighlighted ? '#e2e8f0' : '#64748b'
      const wrapW = Math.min(200, Math.max(96, 520 / Math.max(globalScale, 0.35)))
      fillTextWrappedCenter(ctx, label, node.x, node.y + radius + 2, wrapW, fontSize * 1.2)
    }
  }, [hoverNode, highlightSet, linkCountMap])

  const linkColor = useCallback((link) => {
    if (!hoverNode) return 'rgba(148, 163, 184, 0.2)'
    const srcId = typeof link.source === 'object' ? link.source.id : link.source
    const tgtId = typeof link.target === 'object' ? link.target.id : link.target
    return (srcId === hoverNode.id || tgtId === hoverNode.id) ? 'rgba(148, 163, 184, 0.6)' : 'rgba(148, 163, 184, 0.05)'
  }, [hoverNode])

  const handleNodeClick = useCallback((node, event) => {
    setSelectedNode(node)
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) setTooltipPos({ x: event.clientX - rect.left, y: event.clientY - rect.top })
  }, [])

  const handleSearchInputChange = async (e) => {
    const q = e.target.value
    setSearchQuery(q)
    if (!q.trim() || !campaignId) { setSearchResults([]); setSearchHighlightSet(null); return }
    try {
      const { searchWorldGraph } = await import('../../api')
      const data = await searchWorldGraph(campaignId, q)
      setSearchResults(data.facts || [])
    } catch {}
  }

  return (
    <Modal open={open} onClose={onClose} title={t('panel.worldMap')} size="2xl">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-b border-[var(--border-subtle)]">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">{type}</span>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="px-6 py-2 border-b border-[var(--border-subtle)]">
        <input
          type="text"
          value={searchQuery}
          onChange={handleSearchInputChange}
          placeholder={t('map.search')}
          className="w-full input"
        />
        {searchResults.length > 0 && (
          <div className="mt-2 p-2 bg-[var(--bg-elevated)] rounded-lg max-h-32 overflow-y-auto scrollbar">
            <button onClick={() => { setSearchResults([]); setSearchHighlightSet(null) }} className="text-right w-full text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs mb-1">{t('map.searchClear')}</button>
            {searchResults.map((r, i) => <div key={i} className="text-[var(--text-secondary)] text-sm py-1 border-b border-[var(--border-subtle)] last:border-0">{r.fact}</div>)}
          </div>
        )}
      </div>

      {/* Graph */}
      <div ref={containerRef} className="flex-1 relative min-h-[400px]">
        {graphData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--text-tertiary)] text-sm">
              {loading ? t('map.loading') : t('map.empty')}
            </p>
          </div>
        ) : (
          <ForceGraph2D
            ref={graphRef}
            graphData={graphData}
            nodeCanvasObject={nodeCanvasObject}
            linkColor={linkColor}
            linkWidth={(link) => Math.max((link.strength || 0.5) * 2, 0.5)}
            onNodeHover={setHoverNode}
            onLinkHover={setHoverLink}
            onNodeClick={handleNodeClick}
            onBackgroundClick={() => setSelectedNode(null)}
            onEngineStop={() => graphRef.current?.zoomToFit(400, 50)}
            backgroundColor="transparent"
            width={containerRef.current?.clientWidth || 800}
            height={400}
            cooldownTicks={100}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.3}
          />
        )}

        {selectedNode && (
          <div
            className="absolute z-10 bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-lg p-3 w-max max-w-[min(22rem,calc(100%-1rem))] max-h-[min(48vh,22rem)] overflow-y-auto overscroll-contain shadow-lg pointer-events-auto scrollbar"
            style={{
              left: Math.min(
                tooltipPos.x + 10,
                Math.max(8, (containerRef.current?.clientWidth || 800) - 368),
              ),
              top: Math.min(
                tooltipPos.y - 10,
                Math.max(8, (containerRef.current?.clientHeight || 500) - 380),
              ),
            }}
          >
            <div className="flex items-start gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full shrink-0 mt-1" style={{ backgroundColor: NODE_COLORS[selectedNode.node_type] }} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span className="text-sm font-semibold text-[var(--text-primary)] leading-snug break-words">
                    {selectedNode.name}
                  </span>
                  <span className="badge badge-default text-[9px] px-1.5 py-0 leading-none shrink-0">
                    {selectedNode.node_type}
                  </span>
                </div>
                {selectedNode.attributes && (
                  <dl className="mt-2 space-y-0 border-t border-[var(--border-subtle)] pt-2">
                    {sortAttributeEntries(Object.entries(selectedNode.attributes)).map(([key, val]) => {
                      const long = isMultilineAttribute(key, val)
                      const label = labels[key] || key.replace(/_/g, ' ')
                      if (long) {
                        return (
                          <div key={key} className="pt-2 first:pt-0 border-t border-[var(--border-subtle)] first:border-t-0">
                            <dt className="text-[10px] uppercase tracking-wide text-[var(--text-tertiary)] leading-none mb-1">
                              {label}
                            </dt>
                            <dd className="text-xs text-[var(--text-secondary)] break-words whitespace-pre-wrap leading-snug">
                              {resolvedAttrValue(key, String(val), powerSystem, locale)}
                            </dd>
                          </div>
                        )
                      }
                      return (
                        <div
                          key={key}
                          className="flex items-baseline justify-between gap-3 text-xs leading-tight py-1 border-t border-[var(--border-subtle)] first:border-t-0 first:pt-0 pt-1"
                        >
                          <dt className="text-[var(--text-tertiary)] shrink-0">{label}</dt>
                          <dd className="text-[var(--text-secondary)] text-right min-w-0 break-words">{resolvedAttrValue(key, String(val), powerSystem, locale)}</dd>
                        </div>
                      )
                    })}
                  </dl>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
