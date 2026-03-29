import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import ForceGraph2D from 'react-force-graph-2d'
import Modal from '../UI/Modal'

const NODE_COLORS = {
  NPC: '#a78bfa',
  LOCATION: '#34d399',
  FACTION: '#fbbf24',
  ITEM: '#22d3ee',
  EVENT: '#fb7185',
}

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

export default function WorldMapModal({ open, onClose, campaignId }) {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] })
  const [loading, setLoading] = useState(false)
  const [hoverNode, setHoverNode] = useState(null)
  const [hoverLink, setHoverLink] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchHighlightSet, setSearchHighlightSet] = useState(null)
  const graphRef = useRef()
  const containerRef = useRef()

  const loadGraph = async () => {
    if (!campaignId) return
    setLoading(true)
    try {
      const { fetchWorldGraph, searchWorldGraph } = await import('../../api')
      const data = await fetchWorldGraph(campaignId)
      setGraphData(data)
    } catch {
      setGraphData({ nodes: [], links: [] })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) { loadGraph(); setSelectedNode(null); setSearchHighlightSet(null) }
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
      ctx.fillText(label, node.x, node.y + radius + 2)
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
    <Modal open={open} onClose={onClose} title="Bản Đồ Thế Giới" size="full">
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
          placeholder="Tìm kiếm sự kiện thế giới..."
          className="w-full input"
        />
        {searchResults.length > 0 && (
          <div className="mt-2 p-2 bg-[var(--bg-elevated)] rounded-lg max-h-32 overflow-y-auto scrollbar">
            <button onClick={() => { setSearchResults([]); setSearchHighlightSet(null) }} className="text-right w-full text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] text-xs mb-1">Xóa</button>
            {searchResults.map((r, i) => <div key={i} className="text-[var(--text-secondary)] text-sm py-1 border-b border-[var(--border-subtle)] last:border-0">{r.fact}</div>)}
          </div>
        )}
      </div>

      {/* Graph */}
      <div ref={containerRef} className="flex-1 relative min-h-[400px]">
        {graphData.nodes.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[var(--text-tertiary)] text-sm">
              {loading ? 'Đang lập bản đồ...' : 'Chưa có dữ liệu thế giới. Chơi để tạo bản đồ.'}
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
            className="absolute z-10 bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-xl p-4 min-w-[200px] max-w-[260px] shadow-[var(--shadow-xl)] pointer-events-none"
            style={{
              left: Math.min(tooltipPos.x + 10, (containerRef.current?.clientWidth || 800) - 280),
              top: Math.min(tooltipPos.y - 10, (containerRef.current?.clientHeight || 500) - 200),
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: NODE_COLORS[selectedNode.node_type] }} />
              <span className="text-sm font-semibold text-[var(--text-primary)]">{selectedNode.name}</span>
            </div>
            <span className="badge badge-default text-[10px] mb-3">{selectedNode.node_type}</span>
            {selectedNode.attributes && Object.entries(selectedNode.attributes).slice(0, 4).map(([key, val]) => (
              <div key={key} className="flex justify-between text-xs py-0.5">
                <span className="text-[var(--text-tertiary)]">{key.replace(/_/g, ' ')}</span>
                <span className="text-[var(--text-secondary)] ml-3 truncate max-w-[120px]">{String(val)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
