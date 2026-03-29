import { useState, useEffect, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { useNavigate } from 'react-router-dom'
import { useGameStore } from '../store'
import { streamAction, fetchJournal, fetchHistory, fetchInventory as fetchInventoryApi, rewindLastAction } from '../api'
import { useI18n } from '../i18n'

// ---- Mention highlighter ----
function processChildren(children) {
  if (typeof children !== 'string') return children
  const parts = children.split(/(@[A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F]*(?:\s+[A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F]*)*)/g)
  if (parts.length === 1) return children
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-indigo-400 font-medium" title={part.slice(1)}>{part}</span>
      : part
  )
}

const mentionComponents = {
  p: ({ children }) => <p>{processChildren(children)}</p>,
  li: ({ children }) => <li>{processChildren(children)}</li>,
  em: ({ children }) => <em>{processChildren(children)}</em>,
  strong: ({ children }) => <strong>{processChildren(children)}</strong>,
}

// ---- Prose rendering ----
function NarrativeBlock({ content, isStreaming = false, combatMode = false }) {
  const cleaned = content
    .replace(/\[ITEM_ADD:[^\]]+\]/g, '')
    .replace(/\[ITEM_USE:[^\]]+\]/g, '')
    .replace(/\[ITEM_LOSE:[^\]]+\]/g, '')

  return (
    <div className="prose-lunar">
      <ReactMarkdown components={mentionComponents}>{cleaned}</ReactMarkdown>
      {isStreaming && (
        <span className={`inline-block w-1.5 h-4 ml-1 align-middle animate-pulse ${combatMode ? 'bg-[var(--combat-text)]' : 'bg-[var(--accent)] opacity-50'}`} />
      )}
    </div>
  )
}

// ---- User action bubble ----
function ActionBubble({ content, onClick }) {
  const typeMatch = content.match(/^\[(DO|SAY|CONTINUE|META)\]\s*/i)
  const actionType = typeMatch ? typeMatch[1] : null
  const body = typeMatch ? content.slice(typeMatch[0].length) : content

  const typeColors = {
    DO: 'bg-[var(--accent-muted)] border-[var(--border-default)]',
    SAY: 'bg-[var(--info-muted)] border-[rgba(96,165,250,0.2)]',
    CONTINUE: 'bg-[var(--success-muted)] border-[rgba(74,222,128,0.2)]',
    META: 'bg-[var(--warning-muted)] border-[rgba(251,191,36,0.2)]',
  }

  return (
    <div className="flex justify-end">
      <button
        onClick={onClick}
        className={`
          max-w-[min(560px,85%)] text-left
          px-5 py-3.5 rounded-2xl rounded-tr-sm
          border
          ${typeColors[actionType] || typeColors.DO}
          text-sm leading-relaxed font-light
          text-[var(--text-primary)]
          hover:opacity-80 transition-opacity
          cursor-pointer
          ${actionType === 'META' ? 'font-mono' : ''}
        `}
      >
        {actionType && (
          <span className="text-[10px] font-bold uppercase mr-2 tracking-widest opacity-70">
            {actionType}
          </span>
        )}
        <MentionText>{body}</MentionText>
      </button>
    </div>
  )
}

// ---- @mention text ----
function MentionText({ children }) {
  if (typeof children !== 'string') return children
  const parts = children.split(/(@[A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F]*(?:\s+[A-Z\u00C0-\u024F][A-Za-z\u00C0-\u024F]*)*)/g)
  if (parts.length === 1) return children
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="text-indigo-400 font-medium">{part}</span>
      : part
  )
}

// ---- Streaming skeleton ----
function NarratorSkeleton() {
  return (
    <div className="max-w-[min(640px,80%)]">
      <div className="flex items-center gap-2 mb-3 opacity-40">
        <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[var(--text-tertiary)]">
          Narrator
        </span>
      </div>
      <div className="space-y-2.5 pl-1">
        <div className="skeleton h-3 w-[90%] rounded-sm" />
        <div className="skeleton h-3 w-[75%] rounded-sm" />
        <div className="skeleton h-3 w-[55%] rounded-sm" />
      </div>
    </div>
  )
}

// ---- Tool buttons ----
function ToolButton({ icon: Icon, label, onClick, active = false, color = 'text-tertiary' }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`
        tooltip-wrap
        flex items-center justify-center w-9 h-9 rounded-xl
        border border-[var(--border-subtle)]
        ${active
          ? `bg-[var(--accent-muted)] ${color}`
          : 'bg-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)]'
        }
        transition-all duration-150
      `}
    >
      <Icon size={16} />
      <span className="tooltip-content">{label}</span>
    </button>
  )
}

// ---- Chapter history indicator ----
function ChapterBar({ chapters, activeChapterId, viewingChapterId, onSelect }) {
  const { t } = useI18n()

  if (chapters.length <= 1) return null

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)]">
        {t('panel.journal')} · {chapters.length}
      </span>
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar">
        {chapters.map((ch, i) => {
          const isActive = ch.id === activeChapterId
          const isViewing = ch.id === viewingChapterId && !isActive
          return (
            <button
              key={ch.id}
              onClick={() => onSelect(ch.id)}
              className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-medium
                transition-all duration-150 whitespace-nowrap border flex-shrink-0
                ${isActive
                  ? 'bg-[var(--accent-muted)] border-[var(--border-strong)] text-[var(--text-primary)]'
                  : isViewing
                  ? 'bg-[var(--warning-muted)] border-[rgba(251,191,36,0.2)] text-[var(--warning)]'
                  : 'bg-transparent border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)]'
                }
              `}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[var(--success)]' : isViewing ? 'bg-[var(--warning)]' : 'bg-[var(--text-tertiary)]'}`} />
              {i + 1}
            </button>
          )
        })}
      </div>
      {viewingChapterId && viewingChapterId !== activeChapterId && (
        <button
          onClick={() => onSelect(activeChapterId)}
          className="ml-auto flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[var(--warning)] bg-[var(--warning-muted)] border border-[rgba(251,191,36,0.2)] hover:bg-[rgba(251,191,36,0.15)] transition-all whitespace-nowrap"
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg>
          {t('generic.play')} Live
        </button>
      )}
    </div>
  )
}

// ---- Main Play Page ----
export default function GameCanvas() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const {
    messages, isStreaming, combatMode,
    appendMessage, appendToLastMessage,
    setStreaming, setCombatMode,
    activeCampaignId, activeScenario,
    journal, addJournalEntry, setJournal,
    inventory, setInventory, addInventoryItem, updateInventoryItem: updateInventoryStore,
    restoreSession, clearSession,
    maxTokens, llmProvider, llmModel, temperature,
    replaceLastAssistantMessage, popLastPair,
  } = useGameStore()

  // ---- Chapter state ----
  const [chapters, setChapters] = useState([])     // [{id, messages: []}]
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [viewingChapterId, setViewingChapterId] = useState(null) // null = viewing active

  // ---- Panel state ----
  const [panelState, setPanelState] = useState({
    inventory: false,
    worldMap: false,
    plotGen: false,
    timeskip: false,
    npc: false,
    memory: false,
    journal: false,
    settings: false,
  })

  const openPanel = (name) => setPanelState((s) => ({ ...s, [name]: true }))
  const closePanel = (name) => setPanelState((s) => ({ ...s, [name]: false }))
  const togglePanel = (name) => setPanelState((s) => ({ ...s, [name]: !s[name] }))

  // ---- Refs ----
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const userScrolledUp = useRef(false)
  const panelContainerRef = useRef(null)

  // ---- Restore session ----
  useEffect(() => {
    if (!activeCampaignId) restoreSession()
  }, [])

  // ---- Restore chat history from backend ----
  useEffect(() => {
    if (!activeCampaignId || messages.length > 0) return
    fetchHistory(activeCampaignId)
      .then(({ messages: history }) => {
        if (history && history.length > 0) {
          history.forEach((msg) => appendMessage(msg))
        }
      })
      .catch(() => {})
    fetchInventoryApi(activeCampaignId)
      .then((items) => setInventory(items))
      .catch(() => {})
    fetchJournal(activeCampaignId)
      .then((entries) => setJournal(entries))
      .catch(() => {})
  }, [activeCampaignId])

  // ---- Scroll tracking ----
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      userScrolledUp.current = scrollHeight - scrollTop - clientHeight > 120
    }
    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [])

  // ---- Auto-scroll ----
  useEffect(() => {
    if (!userScrolledUp.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  // ---- Chapter management ----
  const ensureActiveChapter = useCallback(() => {
    if (!activeChapterId) {
      const id = `ch-${Date.now()}`
      setChapters([{ id, messages: [] }])
      setActiveChapterId(id)
    }
  }, [activeChapterId])

  useEffect(() => {
    ensureActiveChapter()
  }, [])

  // Add user message → starts new chapter
  const handleAction = useCallback((action) => {
    const userMsg = { role: 'user', content: action }
    appendMessage(userMsg)

    // Start new chapter
    const chapterId = `ch-${Date.now()}`
    const newChapter = { id: chapterId, messages: [userMsg] }
    setChapters((prev) => [...prev, newChapter])
    setActiveChapterId(chapterId)
    setViewingChapterId(null) // return to live

    setStreaming(true)

    const isViewingHistory = viewingChapterId !== null
    const streamMessages = isViewingHistory
      ? chapters.flatMap((ch) => ch.messages)
      : messages

    streamAction({
      campaignId: activeCampaignId,
      scenarioTone: activeScenario?.tone_instructions ?? '',
      language: activeScenario?.language ?? 'en',
      action,
      openingNarrative: activeScenario?.opening_narrative ?? '',
      maxTokens: maxTokens || 2000,
      provider: llmProvider,
      model: llmModel,
      temperature,
      onChunk: appendToLastMessage,
      onJournal: addJournalEntry,
      onMode: (mode) => {
        const normalized = String(mode || '').trim().split('.').pop()?.trim().toUpperCase()
        setCombatMode(normalized === 'COMBAT')
      },
      onInventory: (item) => {
        if (item.action === 'add') addInventoryItem(item)
        else if (item.action === 'use') updateInventoryStore(item.name, 'used')
        else if (item.action === 'lose') updateInventoryStore(item.name, 'lost')
      },
      onPlotAuto: (plot) => {
        const formatted = formatAutoPlotMessage(plot)
        appendMessage({ role: 'assistant', content: formatted })
      },
      onTruncateClean: (cleanText) => {
        replaceLastAssistantMessage(cleanText)
      },
      onDone: () => {
        setStreaming(false)
        setTimeout(() => setCombatMode(false), 3000)
      },
      onError: () => setStreaming(false),
    })
  }, [activeCampaignId, activeScenario, maxTokens, llmProvider, llmModel, temperature, viewingChapterId, chapters, messages])

  const handleRewind = async () => {
    if (!activeCampaignId || isStreaming || messages.length === 0) return
    if (!window.confirm(t('error.rewindConfirm'))) return
    try {
      await rewindLastAction(activeCampaignId)
      popLastPair()
    } catch (err) {
      console.error('Rewind failed:', err)
    }
  }

  const handleChapterSelect = (chapterId) => {
    if (chapterId === activeChapterId) {
      setViewingChapterId(null)
    } else {
      setViewingChapterId(chapterId)
    }
  }

  const formatAutoPlotMessage = (plot) => {
    const kind = String(plot?.kind || '').toLowerCase()
    const data = plot?.data || {}
    if (kind === 'npc') {
      return [
        `### ${data.name || 'Unknown'} (Power ${data.power_level || 5}/10)`,
        data.appearance || '',
        data.goal ? `**Goal:** ${data.goal}` : '',
        data.secret ? `**Secret:** ${data.secret}` : '',
      ].filter(Boolean).join('\n\n')
    }
    if (kind === 'event') {
      const choices = Array.isArray(data.choices) ? data.choices.map((c, i) => `${i + 1}. ${c}`).join('\n') : ''
      return [
        `### ${data.title || 'Unexpected Event'}`,
        data.description || '',
        choices ? `**Choices:**\n${choices}` : '',
      ].filter(Boolean).join('\n\n')
    }
    return typeof data === 'string' ? data : (data.text || 'A new plot branch emerges.')
  }

  // ---- Compute what to display ----
  const displayMessages = viewingChapterId
    ? (chapters.find((ch) => ch.id === viewingChapterId)?.messages || [])
    : messages

  const isViewingHistory = viewingChapterId !== null

  // ---- Dynamic imports for panels (lazy) ----
  const [PanelComponents, setPanelComponents] = useState(null)

  useEffect(() => {
    Promise.all([
      import('../components/panels/InventoryPanel'),
      import('../components/panels/WorldMapModal'),
      import('../components/panels/PlotGeneratorPanel'),
      import('../components/panels/TimeskipModal'),
      import('../components/panels/NpcInspector'),
      import('../components/panels/MemoryInspector'),
      import('../components/panels/JournalPanel'),
      import('../components/panels/SettingsPanel'),
    ]).then(([Inventory, WorldMap, PlotGen, Timeskip, Npc, Memory, Journal, Settings]) => {
      setPanelComponents({ Inventory: Inventory.default, WorldMap: WorldMap.default, PlotGen: PlotGen.default, Timeskip: Timeskip.default, Npc: Npc.default, Memory: Memory.default, Journal: Journal.default, Settings: Settings.default })
    }).catch(() => {})
  }, [])

  const {
    Inventory, WorldMap, PlotGen, Timeskip, Npc, Memory, Journal, Settings
  } = PanelComponents || {}

  return (
    <div className={`
      flex flex-col h-screen bg-[var(--bg-base)]
      ${combatMode ? 'narrative-combat-glow' : ''}
    `}>
      {/* ===== TOP BAR ===== */}
      <header className="
        flex-none flex items-center justify-between
        px-4 py-3
        bg-[var(--bg-surface)]/90 backdrop-blur-xl
        border-b border-[var(--border-subtle)]
        z-20 gap-3
      ">
        {/* Left: Status + title */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${combatMode ? 'bg-[var(--error)] shadow-[0_0_8px_var(--error)] animate-pulse' : 'bg-[var(--success)] shadow-[0_0_6px_var(--success)]'}`} />
          <div className="min-w-0">
            <h1 className="text-sm font-semibold text-[var(--text-primary)] truncate">
              {activeScenario?.title ?? t('canvas.unknownWorld')}
            </h1>
            <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-tertiary)]">
              <span>ID: {activeCampaignId?.slice(0, 6) || t('canvas.offline')}</span>
              {isViewingHistory && (
                <span className="badge badge-warning text-[8px] px-1.5 py-0.5">
                  VIEWING CH.{chapters.findIndex((c) => c.id === viewingChapterId) + 1}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Tool pills */}
          <div className="hidden sm:flex items-center gap-1 bg-[var(--bg-elevated)] rounded-xl p-1 border border-[var(--border-subtle)]">
            {panelState.inventory && <span className="w-1.5 h-1.5 rounded-full bg-[var(--info)] mx-1" />}
            {panelState.worldMap && <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] mx-1" />}
            {panelState.plotGen && <span className="w-1.5 h-1.5 rounded-full bg-[var(--warning)] mx-1" />}

            <ToolButton
              icon={({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>}
              label={t('panel.inventory')}
              onClick={() => togglePanel('inventory')}
              active={panelState.inventory}
              color="text-[var(--info)]"
            />
            <ToolButton
              icon={({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>}
              label={t('panel.worldMap')}
              onClick={() => togglePanel('worldMap')}
              active={panelState.worldMap}
              color="text-[var(--success)]"
            />
            <ToolButton
              icon={({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>}
              label={t('panel.plotGenerator')}
              onClick={() => togglePanel('plotGen')}
              active={panelState.plotGen}
              color="text-[var(--warning)]"
            />
            <ToolButton
              icon={({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>}
              label={t('panel.timeskip')}
              onClick={() => togglePanel('timeskip')}
              color="text-[var(--text-tertiary)]"
            />
            <ToolButton
              icon={({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.072-4.885A2.5 2.5 0 0 1 9.5 2m7.5 0a2.5 2.5 0 0 0-2.5-2.5A2.5 2.5 0 0 0 7 7.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.072-4.885A2.5 2.5 0 0 0 14.5 5.5m2.5 0A2.5 2.5 0 0 1 19.5 7.5" /></svg>}
              label={t('panel.npcMinds')}
              onClick={() => togglePanel('npc')}
              color="text-[var(--text-tertiary)]"
            />
            <ToolButton
              icon={({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5H18l-3.7 2.7 1.4 4.3L12 12l-3.7 2.5 1.4-4.3L6 7.5h4.5z" /></svg>}
              label={t('panel.memoryCrystals')}
              onClick={() => togglePanel('memory')}
              color="text-[var(--text-tertiary)]"
            />
            <ToolButton
              icon={({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
              label={t('panel.journal')}
              onClick={() => togglePanel('journal')}
              color="text-[var(--warning)]"
            />
            <div className="w-px h-5 bg-[var(--border-subtle)] mx-0.5" />
            <ToolButton
              icon={({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>}
              label={t('panel.settings')}
              onClick={() => togglePanel('settings')}
              color="text-[var(--text-tertiary)]"
            />
          </div>

          {/* Rewind */}
          <button
            onClick={handleRewind}
            disabled={isStreaming || messages.length === 0}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--error)] hover:border-[rgba(248,113,113,0.2)] hover:bg-[var(--error-muted)] transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed"
            title={t('canvas.rewind')}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 .49-4.36" /></svg>
          </button>

          {/* Disconnect */}
          <button
            onClick={() => { clearSession(); navigate('/') }}
            className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--accent-muted)] transition-all duration-150"
            title={t('canvas.disconnect')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          </button>
        </div>
      </header>

      {/* ===== CHAPTER BAR ===== */}
      <ChapterBar
        chapters={chapters}
        activeChapterId={activeChapterId}
        viewingChapterId={viewingChapterId}
        onSelect={handleChapterSelect}
      />

      {/* ===== MAIN: Reading Area + Side Panel ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---- Narrative Area ---- */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar px-4 md:px-8 py-8"
        >
          <div className="max-w-[var(--content-max-width)] mx-auto space-y-8">

            {/* Opening narrative */}
            {displayMessages.length === 0 && activeScenario?.opening_narrative && (
              <div className="card-raised p-6 md:p-8">
                <NarrativeBlock content={activeScenario.opening_narrative} />
              </div>
            )}

            {/* Messages */}
            {displayMessages.map((msg, i) => {
              const isUser = msg.role === 'user'
              return isUser ? (
                <ActionBubble
                  key={i}
                  content={msg.content}
                  onClick={() => {/* TODO: edit action */}}
                />
              ) : (
                <div key={i} className="pl-1">
                  <div className="flex items-center gap-2 mb-3 opacity-40">
                    <span className={`w-1.5 h-1.5 rounded-full ${combatMode ? 'bg-[var(--error)]' : 'bg-[var(--text-tertiary)]'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${combatMode ? 'text-[var(--error)]' : 'text-[var(--text-tertiary)]'}`}>
                      {combatMode ? t('canvas.combat') : t('canvas.narrator')}
                    </span>
                  </div>
                  <NarrativeBlock
                    content={msg.content}
                    isStreaming={isStreaming && i === displayMessages.length - 1}
                    combatMode={combatMode}
                  />
                </div>
              )
            })}

            {/* Streaming skeleton */}
            {isStreaming && displayMessages.length > 0 && displayMessages[displayMessages.length - 1].role === 'user' && (
              <NarratorSkeleton />
            )}

            <div ref={bottomRef} className="h-4" />
          </div>
        </div>

        {/* ---- Right Tool Panel (desktop) ---- */}
        {panelState.inventory || panelState.worldMap || panelState.plotGen || panelState.timeskip || panelState.npc || panelState.memory || panelState.journal || panelState.settings ? (
          <aside className="hidden xl:block w-80 border-l border-[var(--border-subtle)] overflow-y-auto scrollbar bg-[var(--bg-surface)] flex-shrink-0">
            <div className="p-4 space-y-3">
              {panelState.inventory && Inventory && (
                <Inventory
                  open
                  onClose={() => closePanel('inventory')}
                  campaignId={activeCampaignId}
                  inventory={inventory}
                  setInventory={setInventory}
                />
              )}
              {panelState.worldMap && WorldMap && (
                <WorldMap open onClose={() => closePanel('worldMap')} campaignId={activeCampaignId} />
              )}
              {panelState.plotGen && PlotGen && (
                <PlotGen open onClose={() => closePanel('plotGen')} campaignId={activeCampaignId} language={activeScenario?.language ?? 'en'} />
              )}
              {panelState.timeskip && Timeskip && (
                <Timeskip open onClose={() => closePanel('timeskip')} campaignId={activeCampaignId} onTimeskip={(data) => {
                  if (data.summary) appendMessage({ role: 'assistant', content: `*Time passes...*\n\n${data.summary}` })
                }} />
              )}
              {panelState.npc && Npc && (
                <Npc open onClose={() => closePanel('npc')} campaignId={activeCampaignId} />
              )}
              {panelState.memory && Memory && (
                <Memory open onClose={() => closePanel('memory')} campaignId={activeCampaignId} />
              )}
              {panelState.journal && Journal && (
                <Journal open onClose={() => closePanel('journal')} entries={journal} onRefresh={() => {
                  if (activeCampaignId) {
                    fetchJournal(activeCampaignId).then((entries) => setJournal(entries)).catch(() => {})
                  }
                }} />
              )}
              {panelState.settings && Settings && (
                <Settings open onClose={() => closePanel('settings')} />
              )}
            </div>
          </aside>
        ) : null}
      </div>

      {/* ===== INPUT AREA ===== */}
      <div className="flex-none border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-xl z-10">
        <div className="max-w-[var(--content-max-width)] mx-auto">
          <ActionInputRedesigned onSubmit={handleAction} disabled={isStreaming} />
        </div>
      </div>

      {/* ===== MODALS (mobile panels) ===== */}
      {PanelComponents && (
        <>
          {panelState.inventory && Inventory && (
            <div className="xl:hidden">
              <Inventory open onClose={() => closePanel('inventory')} campaignId={activeCampaignId} inventory={inventory} setInventory={setInventory} />
            </div>
          )}
          {panelState.worldMap && WorldMap && <WorldMap open onClose={() => closePanel('worldMap')} campaignId={activeCampaignId} />}
          {panelState.plotGen && PlotGen && <PlotGen open onClose={() => closePanel('plotGen')} campaignId={activeCampaignId} language={activeScenario?.language ?? 'en'} />}
          {panelState.timeskip && Timeskip && <Timeskip open onClose={() => closePanel('timeskip')} campaignId={activeCampaignId} onTimeskip={(data) => { if (data.summary) appendMessage({ role: 'assistant', content: `*Time passes...*\n\n${data.summary}` }) }} />}
          {panelState.npc && Npc && <Npc open onClose={() => closePanel('npc')} campaignId={activeCampaignId} />}
          {panelState.memory && Memory && <Memory open onClose={() => closePanel('memory')} campaignId={activeCampaignId} />}
          {panelState.journal && Journal && <Journal open onClose={() => closePanel('journal')} entries={journal} onRefresh={() => { if (activeCampaignId) fetchJournal(activeCampaignId).then((entries) => setJournal(entries)).catch(() => {}) }} />}
          {panelState.settings && Settings && <Settings open onClose={() => closePanel('settings')} />}
        </>
      )}
    </div>
  )
}

// ---- Redesigned Action Input ----
function ActionInputRedesigned({ onSubmit, disabled }) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [type, setType] = useState('DO')
  const [mentionState, setMentionState] = useState(null)
  const [mentionResults, setMentionResults] = useState([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef(null)
  const dropdownRef = useRef(null)
  const campaignId = useGameStore((s) => s.activeCampaignId)

  const ACTION_TYPES = [
    { id: 'DO', labelKey: 'action.do', hintKey: 'action.doHint' },
    { id: 'SAY', labelKey: 'action.say', hintKey: 'action.sayHint' },
    { id: 'CONTINUE', labelKey: 'action.continue', hintKey: 'action.continueHint' },
    { id: 'META', labelKey: 'action.meta', hintKey: 'action.metaHint' },
  ]

  // Ctrl+Enter to continue
  useEffect(() => {
    const handleGlobalKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!text.trim() && !disabled) {
          e.preventDefault()
          onSubmit('[CONTINUE]')
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [text, disabled, onSubmit])

  const fetchCharacters = async (query) => {
    try {
      const res = await fetch(`/api/game/${campaignId}/characters?q=${encodeURIComponent(query)}`)
      if (!res.ok) return []
      return res.json()
    } catch {
      return []
    }
  }

  useEffect(() => {
    if (!mentionState || !campaignId) { setMentionResults([]); return }
    let cancelled = false
    const timer = setTimeout(async () => {
      const chars = await fetchCharacters(mentionState.query)
      if (!cancelled) { setMentionResults(chars); setMentionIndex(0) }
    }, 100)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [mentionState, campaignId])

  const closeMention = () => { setMentionState(null); setMentionResults([]); setMentionIndex(0) }

  const insertMention = (charName) => {
    if (!mentionState) return
    const before = text.slice(0, mentionState.startIndex)
    const after = text.slice(mentionState.startIndex + mentionState.query.length + 1)
    setText(`${before}@${charName}${after}`)
    closeMention()
    setTimeout(() => textareaRef.current?.focus(), 0)
  }

  const handleTextChange = (e) => {
    const value = e.target.value
    setText(value)
    const cursorPos = e.target.selectionStart
    const textBeforeCursor = value.slice(0, cursorPos)
    const atMatch = textBeforeCursor.match(/@([^\s@]*)$/)
    if (atMatch) setMentionState({ startIndex: cursorPos - atMatch[0].length, query: atMatch[1] })
    else closeMention()
  }

  const handleSubmit = (e) => {
    e?.preventDefault()
    if (mentionState && mentionResults.length > 0) return
    const trimmed = text.trim()
    if (!trimmed && type !== 'CONTINUE') return
    onSubmit(type === 'CONTINUE' ? '[CONTINUE]' : `[${type}] ${trimmed}`)
    setText('')
    closeMention()
  }

  const handleKeyDown = (e) => {
    if (mentionState && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((p) => Math.min(p + 1, mentionResults.length - 1)); return }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMentionIndex((p) => Math.max(p - 1, 0)); return }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(mentionResults[mentionIndex].name); return }
      if (e.key === 'Escape') { e.preventDefault(); closeMention(); return }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const t_action = (key) => {
    const locale = localStorage.getItem('lunar_language') || 'en'
    const vi = { 'action.do': 'Hành Động', 'action.say': 'Nói', 'action.continue': 'Tiếp Tục', 'action.meta': 'Hệ Thống', 'action.doHint': 'Thực hiện một hành động', 'action.sayHint': 'Nói hoặc giao tiếp', 'action.continueHint': 'Để câu chuyện tự diễn ra', 'action.metaHint': 'Hỏi người kể chuyện', 'action.placeholder.do': 'Mô tả hành động của bạn...', 'action.placeholder.say': 'Nhập lời thoại...', 'action.placeholder.meta': 'Nhập câu hỏi...', 'action.placeholder.waiting': 'Đang nhận tín hiệu...', 'action.placeholder.continue': 'Nhấn Enter để tiếp tục...', 'generic.send': 'Gửi' }
    const en = { 'action.do': 'Do', 'action.say': 'Say', 'action.continue': 'Continue', 'action.meta': 'Meta', 'action.doHint': 'Perform a physical action', 'action.sayHint': 'Speak or communicate', 'action.continueHint': 'Let the story flow', 'action.metaHint': 'Ask the narrator about world state', 'action.placeholder.do': 'Describe your action...', 'action.placeholder.say': 'Enter your dialogue...', 'action.placeholder.meta': 'Enter system command...', 'action.placeholder.waiting': 'Receiving transmission...', 'action.placeholder.continue': 'Press Enter to continue...', 'generic.send': 'Send' }
    const dict = locale === 'vi' ? vi : en
    return dict[key] || key
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3">
      {/* Action type pills */}
      <div className="flex gap-1.5 flex-wrap">
        {ACTION_TYPES.map((a) => {
          const isActive = type === a.id
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => { setType(a.id); if (a.id === 'CONTINUE') setText('') }}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-widest transition-all duration-150 border
                ${isActive
                  ? 'bg-[var(--accent-muted)] text-[var(--text-primary)] border-[var(--border-strong)]'
                  : 'bg-transparent text-[var(--text-tertiary)] border-transparent hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)]'
                }
              `}
              title={t_action(a.hintKey)}
            >
              {t_action(a.labelKey)}
            </button>
          )
        })}
        <div className="flex-1" />
        <span className="text-[10px] text-[var(--text-disabled)] self-center pr-1 hidden sm:block">
          {t_action('action.continueKey')}
        </span>
      </div>

      {/* Input row */}
      <div className="flex gap-3 items-end">
        {type === 'CONTINUE' ? (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={disabled}
            className="flex-1 text-left px-4 py-3 rounded-xl bg-[var(--accent-muted)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-all text-sm font-light cursor-pointer disabled:opacity-50"
          >
            {disabled ? t_action('action.placeholder.waiting') : t_action('action.placeholder.continue')}
          </button>
        ) : (
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={disabled ? t_action('action.placeholder.waiting') : t_action(`action.placeholder.${type.toLowerCase()}`)}
              rows={2}
              className={`
                w-full rounded-xl px-4 py-3 text-sm font-light leading-relaxed resize-none
                bg-[var(--accent-muted)] border border-[var(--border-default)]
                text-[var(--text-primary)] placeholder-[var(--text-disabled)]
                focus:outline-none focus:border-[var(--border-focus)] focus:bg-[var(--accent-glow)]
                transition-all
                ${type === 'META' ? 'font-mono' : ''}
              `}
            />
            {/* @ mention dropdown */}
            {mentionState && mentionResults.length > 0 && (
              <div ref={dropdownRef} className="absolute bottom-full left-0 mb-2 w-64 max-h-48 overflow-y-auto scrollbar bg-[var(--bg-overlay)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-lg)] z-50">
                {mentionResults.map((char, i) => (
                  <button
                    key={char.name}
                    type="button"
                    onClick={() => insertMention(char.name)}
                    className={`
                      w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors
                      ${i === mentionIndex ? 'bg-[var(--accent-muted)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--accent-muted)]'}
                    `}
                  >
                    <span className="text-indigo-400 text-xs font-mono">@</span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{char.name}</div>
                      {char.aliases?.length > 0 && <div className="text-xs text-[var(--text-tertiary)] truncate">aka {char.aliases.join(', ')}</div>}
                    </div>
                    <span className="ml-auto text-[10px] text-[var(--text-disabled)] uppercase">{char.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          type="submit"
          disabled={disabled || (type !== 'CONTINUE' && !text.trim())}
          className={`
            flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0
            border transition-all duration-150
            ${(disabled || (type !== 'CONTINUE' && !text.trim()))
              ? 'bg-[var(--accent-muted)] border-[var(--border-subtle)] text-[var(--text-disabled)] cursor-not-allowed'
              : 'bg-[var(--accent)] border-[var(--accent)] text-[var(--text-inverse)] hover:bg-[var(--accent-hover)] cursor-pointer'
            }
          `}
          title={t_action('generic.send')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </form>
  )
}
