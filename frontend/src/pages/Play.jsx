import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { flushSync } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameStore } from '../store'
import { streamAction, fetchJournal, fetchHistory, fetchInventory as fetchInventoryApi, rewindLastAction } from '../api'
import { useI18n } from '../i18n'

import NarrativeBlock from '../components/canvas/NarrativeBlock'
import { buildChaptersFromMessages, sliceMessagesForChapter } from '../utils/chapters'

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
// Tooltip must NOT live inside <button>: browsers break absolute positioning there, so the
// label box can jump to the top-left of the viewport. Wrap with .tooltip-wrap instead.
function ToolButton({ icon: Icon, label, onClick, active = false, color = 'text-tertiary' }) {
  return (
    <div className="tooltip-wrap flex-shrink-0">
      <button
        type="button"
        onClick={onClick}
        aria-label={label}
        className={`
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
      </button>
      <span className="tooltip-content" role="tooltip">
        {label}
      </span>
    </div>
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
          const isOpening = ch.id === 'ch-opening'
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
              {isOpening ? t('play.chapter.opening') : i}
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
          {t('generic.play')} {t('play.chapter.live')}
        </button>
      )}
    </div>
  )
}

// ---- Helper: read campaign state directly from localStorage (synchronous) ----
function readCampaignFromStorage(campaignId) {
  try {
    const raw = localStorage.getItem('lunar_campaigns')
    if (!raw) return {}
    const all = JSON.parse(raw)
    return all[campaignId] || {}
  } catch { return {} }
}

// ---- Main Play Page ----
export default function Play() {
  const { campaignId } = useParams()
  const { t } = useI18n()
  const navigate = useNavigate()
  const {
    isStreaming, combatMode,
    setStreaming, setCombatMode,
    activeCampaignId, activeScenario: storeScenario,
    journal: storeJournal,
    inventory: storeInventory,
    addJournalEntry, setJournal,
    setInventory, addInventoryItem, updateInventoryItem: updateInventoryStore,
    clearSession,
    maxTokens, llmProvider, llmModel, temperature,
    setChapters: setChaptersInStore,
  } = useGameStore()

  // Read persisted state synchronously ONCE at mount (function initializer).
  // This avoids calling setState during render.
  const initialState = useMemo(() => readCampaignFromStorage(campaignId), [campaignId])
  const [messages, setMessages] = useState(initialState.messages || [])
  const [chapters, setChapters] = useState(initialState.chapters || [])
  const [journal, setJournalState] = useState(initialState.journal || [])
  const [inventory, setInventoryState] = useState(initialState.inventory || [])
  const [activeScenario, setActiveScenario] = useState(initialState.scenario || null)
  const [activeChapterId, setActiveChapterId] = useState(null)
  const [viewingChapterId, setViewingChapterId] = useState(null) // null = viewing active / live
  const [loadingError, setLoadingError] = useState(null)
  const hydratedRef = useRef(false)
  const persistRef = useRef(null)

  // ---- Persist to localStorage whenever state changes ----
  persistRef.current = () => {
    if (!campaignId) return
    try {
      const all = JSON.parse(localStorage.getItem('lunar_campaigns') || '{}')
      all[campaignId] = {
        ...(all[campaignId] || {}),
        scenario: activeScenario,
        messages,
        chapters,
        journal,
        inventory,
      }
      localStorage.setItem('lunar_campaigns', JSON.stringify(all))
    } catch {}
  }

  // Proxy journal/inventory mutations so they also persist
  const addJournalEntryLocal = (entry) => {
    setJournalState((prev) => {
      const next = [...prev, entry]
      if (persistRef.current) persistRef.current()
      return next
    })
  }
  const setJournalLocal = (entries) => {
    setJournalState(entries)
    if (persistRef.current) persistRef.current()
  }
  const addInventoryItemLocal = (item) => {
    setInventoryState((prev) => {
      const next = [...prev, item]
      if (persistRef.current) persistRef.current()
      return next
    })
  }
  const updateInventoryItemLocal = (name, status) => {
    setInventoryState((prev) => {
      const next = prev.map((i) => i.name === name ? { ...i, status } : i)
      if (persistRef.current) persistRef.current()
      return next
    })
  }
  const setInventoryLocal = (items) => {
    setInventoryState(items)
    if (persistRef.current) persistRef.current()
  }

  // displayChapters always from local state
  const displayChapters = chapters

  const readingChapterId = viewingChapterId ?? activeChapterId
    ?? displayChapters[displayChapters.length - 1]?.id ?? 'ch-opening'

  const displayMessages = useMemo(() => {
    if (!readingChapterId) return []
    return sliceMessagesForChapter(messages, displayChapters, readingChapterId)
  }, [messages, displayChapters, readingChapterId])

  const isViewingOldChapter = viewingChapterId !== null && viewingChapterId !== activeChapterId

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

  // Mobile bottom-drawer open state (rendered via portal — not inside header backdrop-blur)
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false)

  useEffect(() => {
    if (!mobileToolsOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e) => { if (e.key === 'Escape') setMobileToolsOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [mobileToolsOpen])

  // ---- Refs ----
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const userScrolledUp = useRef(false)
  const scrollRafRef = useRef(null)

  // =========================================================
  // CAMPAIGN LOAD — runs once on mount / campaignId change
  // =========================================================
  useEffect(() => {
    if (!campaignId) {
      setLoadingError('missing')
      return
    }
    hydratedRef.current = false

    // Fetch fresh data from backend (server is source of truth)
    fetchHistory(campaignId)
      .then(({ messages: history }) => {
        if (history && history.length > 0) {
          const built = buildChaptersFromMessages(history)
          setMessages(history)
          setChapters(built)
          setActiveChapterId(built[built.length - 1].id)
        } else {
          // No server history — start fresh (ch-opening only)
          const start = buildChaptersFromMessages([])
          setChapters(start)
          setActiveChapterId(start[start.length - 1].id)
        }
        hydratedRef.current = true
        // Persist to localStorage
        if (persistRef.current) persistRef.current()
      })
      .catch(() => setLoadingError('fetch_failed'))

    fetchInventoryApi(campaignId)
      .then((items) => { setInventoryState(items); setInventoryLocal(items) })
      .catch(() => {})

    fetchJournal(campaignId)
      .then((entries) => { setJournalState(entries); setJournalLocal(entries) })
      .catch(() => {})

    // Sync activeCampaignId into Zustand store so panel components can read it
    useGameStore.setState({ activeCampaignId: campaignId })
  }, [campaignId]) // eslint-disable-line react-hooks/exhaustive-deps

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
    if (!scrollRef.current || !bottomRef.current) return
    // Skip if user explicitly scrolled up (they want to read old content)
    if (userScrolledUp.current) return
    // Cancel any pending smooth animation from a previous tick
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current)
    scrollRafRef.current = requestAnimationFrame(() => {
      bottomRef.current?.scrollIntoView({ block: 'end', inline: 'nearest' })
    })
  }, [displayMessages])

  // Add user message → new chapter starts at this index in flat messages
  const handleAction = useCallback((action) => {
    const userMsg = { role: 'user', content: action }
    const fromIndex = messages.length
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)

    const chapterId = `ch-${fromIndex}-${Date.now()}`
    const prior = chapters.length > 0 ? chapters : buildChaptersFromMessages(messages)
    const next = [...prior, { id: chapterId, fromIndex }]
    setChapters(next)
    setActiveChapterId(chapterId)
    setViewingChapterId(null) // return to live
    userScrolledUp.current = false  // new action → always auto-scroll
    setStreaming(true)

    // Persist after adding new chapter
    setTimeout(() => { if (persistRef.current) persistRef.current() }, 0)

    // Streaming always targets the active chapter. If user was viewing an old chapter,
    // they just started a new one — viewingChapterId is already reset to null above.
    streamAction({
      campaignId,
      scenarioTone: activeScenario?.tone_instructions ?? '',
      language: activeScenario?.language ?? 'en',
      action,
      openingNarrative: activeScenario?.opening_narrative ?? '',
      maxTokens: maxTokens || 2000,
      provider: llmProvider,
      model: llmModel,
      temperature,
      onChunk: (chunk) => {
        flushSync(() => {
          setMessages((prev) => {
            const msgs = [...prev]
            const last = msgs[msgs.length - 1]
            if (last && last.role === 'assistant') {
              msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
            } else {
              msgs.push({ role: 'assistant', content: chunk })
            }
            return msgs
          })
        })
        // Persist after each chunk (outside flushSync to avoid blocking render)
        setTimeout(() => { if (persistRef.current) persistRef.current() }, 0)
      },
      onJournal: (entry) => {
        addJournalEntryLocal(entry)
      },
      onMode: (mode) => {
        const normalized = String(mode || '').trim().split('.').pop()?.trim().toUpperCase()
        setCombatMode(normalized === 'COMBAT')
      },
      onInventory: (item) => {
        if (item.action === 'add') addInventoryItemLocal(item)
        else if (item.action === 'use') updateInventoryItemLocal(item.name, 'used')
        else if (item.action === 'lose') updateInventoryItemLocal(item.name, 'lost')
      },
      onPlotAuto: (plot) => {
        const formatted = formatAutoPlotMessage(plot)
        flushSync(() => setMessages((prev) => [...prev, { role: 'assistant', content: formatted }]))
        setTimeout(() => { if (persistRef.current) persistRef.current() }, 0)
      },
      onTruncateClean: (cleanText) => {
        flushSync(() => {
          setMessages((prev) => {
            const msgs = [...prev]
            for (let i = msgs.length - 1; i >= 0; i--) {
              if (msgs[i].role === 'assistant') {
                msgs[i] = { ...msgs[i], content: cleanText }
                break
              }
            }
            return msgs
          })
        })
      },
      onDone: () => {
        setStreaming(false)
        // Persist final state
        setTimeout(() => { if (persistRef.current) persistRef.current() }, 0)
        setTimeout(() => setCombatMode(false), 3000)
      },
      onError: () => setStreaming(false),
    })
  }, [campaignId, activeScenario, maxTokens, llmProvider, llmModel, temperature, messages, chapters])

  const handleRewind = async () => {
    if (!campaignId || isStreaming || messages.length === 0) return
    if (!window.confirm(t('error.rewindConfirm'))) return
    try {
      await rewindLastAction(campaignId)
      // Remove last pair from local messages
      const msgs = [...messages]
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') msgs.pop()
      if (msgs.length > 0 && msgs[msgs.length - 1].role === 'user') msgs.pop()
      setMessages(msgs)
      const built = buildChaptersFromMessages(msgs)
      setChapters(built)
      setViewingChapterId(null)
      setActiveChapterId(built.length > 0 ? built[built.length - 1].id : null)
      setTimeout(() => { if (persistRef.current) persistRef.current() }, 0)
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

  // =========================================================
  // ERROR / FALLBACK STATE
  // =========================================================
  if (loadingError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[var(--bg-base)] gap-6 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[var(--error-muted)] border border-[rgba(248,113,113,0.2)] flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--error)]">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            {loadingError === 'missing' ? t('play.campaignMissing') : t('error.backendOffline')}
          </h2>
          <p className="text-sm text-[var(--text-secondary)] max-w-sm">
            {loadingError === 'missing'
              ? t('play.campaignMissingHint')
              : t('play.campaignFetchFailed')}
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="px-6 py-3 rounded-xl border border-[rgba(200,200,216,0.32)] bg-[rgba(200,200,216,0.15)] text-[var(--text-primary)] font-semibold text-sm hover:bg-[rgba(200,200,216,0.22)] transition-all"
        >
          {t('generic.backHome')}
        </button>
      </div>
    )
  }

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
              <span>ID: {campaignId?.slice(0, 6) || t('canvas.offline')}</span>
              {isViewingOldChapter && (
                <span className="badge badge-warning text-[8px] px-1.5 py-0.5">
                  {t('play.chapter.viewing', { n: displayChapters.findIndex((c) => c.id === viewingChapterId) + 1 })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Tools */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Mobile: floating tools button + bottom drawer */}
          <div className="sm:hidden flex-shrink-0">
            <button
              type="button"
              onClick={() => setMobileToolsOpen((v) => !v)}
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] transition-all duration-150"
              aria-label="Tools"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
          </div>

          {/* Desktop: tool pills */}
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
              icon={({ size }) => (
                <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 3h12l4 6-10 12L2 9l4-6z" />
                </svg>
              )}
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

      {/* ===== VIEWING OLD CHAPTER BANNER ===== */}
      {isViewingOldChapter && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[rgba(251,191,36,0.08)] border-b border-[rgba(251,191,36,0.2)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--warning)] flex-shrink-0">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-[11px] text-[var(--warning)] font-medium flex-1">
            {t('play.chapter.viewingOldHint')}
          </p>
          <button
            onClick={() => setViewingChapterId(null)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[var(--warning)] bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.25)] hover:bg-[rgba(251,191,36,0.18)] transition-all whitespace-nowrap"
          >
            {t('play.chapter.returnToCurrent')}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>
      )}

      {/* ===== CHAPTER BAR ===== */}
      <ChapterBar
        chapters={displayChapters}
        activeChapterId={activeChapterId}
        viewingChapterId={viewingChapterId}
        onSelect={handleChapterSelect}
      />

      {/* ===== MAIN: Narrative area ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---- Narrative Area ---- */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar px-4 md:px-8 py-8"
        >
          <div className="max-w-[var(--content-max-width)] mx-auto space-y-8">

            {/* Opening narrative */}
            {readingChapterId === 'ch-opening' && activeScenario?.opening_narrative && (
              <div className="card-raised p-6 md:p-8">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--warning)] opacity-60">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                  {t('play.opening.badge', { title: activeScenario.title }) || `Mở Đầu · ${activeScenario.title}`}
                </div>
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
        {/* Tool panels use Modal (fixed overlay). Do not reserve a desktop aside — fixed modals
            don't occupy flow space, so an empty w-80 column appeared on the right. */}
      </div>

      {/* ===== INPUT AREA ===== */}
      <div className="flex-none border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-xl z-10">
        <div className="max-w-[var(--content-max-width)] mx-auto">
          <ActionInputRedesigned onSubmit={handleAction} disabled={isStreaming} />
        </div>
      </div>

      {/* ===== Tool panels (Modal overlays — all breakpoints) ===== */}
      {PanelComponents && (
        <>
          {panelState.inventory && Inventory && (
            <Inventory open onClose={() => closePanel('inventory')} campaignId={campaignId} inventory={inventory} setInventory={setInventoryState} />
          )}
          {panelState.worldMap && WorldMap && <WorldMap open onClose={() => closePanel('worldMap')} campaignId={campaignId} />}
          {panelState.plotGen && PlotGen && <PlotGen open onClose={() => closePanel('plotGen')} campaignId={campaignId} language={activeScenario?.language ?? 'en'} />}
          {panelState.timeskip && Timeskip && <Timeskip open onClose={() => closePanel('timeskip')} campaignId={campaignId} onTimeskip={(data) => { if (data.summary) setMessages((prev) => [...prev, { role: 'assistant', content: `*Time passes...*\n\n${data.summary}` }]) }} />}
          {panelState.npc && Npc && <Npc open onClose={() => closePanel('npc')} campaignId={campaignId} />}
          {panelState.memory && Memory && <Memory open onClose={() => closePanel('memory')} campaignId={campaignId} />}
          {panelState.journal && Journal && <Journal open onClose={() => closePanel('journal')} entries={journal} onRefresh={() => { if (campaignId) fetchJournal(campaignId).then((entries) => setJournalState(entries)).catch(() => {}) }} />}
          {panelState.settings && Settings && <Settings open onClose={() => closePanel('settings')} />}
        </>
      )}

      {/* Mobile tools sheet: portal + high z-index so it is not trapped by header backdrop-filter */}
      {mobileToolsOpen && typeof document !== 'undefined' && createPortal(
        <div className="sm:hidden">
          <div
            role="presentation"
            className="fixed inset-0 z-[100] bg-black/55 backdrop-blur-[2px]"
            onClick={() => setMobileToolsOpen(false)}
          />
          <div
            className="fixed bottom-0 left-0 right-0 z-[110] flex max-h-[min(70dvh,28rem)] flex-col rounded-t-2xl border border-[var(--border-subtle)] border-b-0 bg-[var(--bg-surface)] shadow-[var(--shadow-xl)] animate-slide-up"
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-tools-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
              <p id="mobile-tools-title" className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-disabled)]">
                {t('panel.tools')}
              </p>
              <button
                type="button"
                onClick={() => setMobileToolsOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-tertiary)] hover:bg-[var(--accent-muted)] hover:text-[var(--text-primary)]"
                aria-label="Close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-1">
              {[
                { key: 'inventory', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>, label: t('panel.inventory'), color: 'text-[var(--info)]' },
                { key: 'worldMap', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" /><line x1="9" y1="3" x2="9" y2="18" /><line x1="15" y1="6" x2="15" y2="21" /></svg>, label: t('panel.worldMap'), color: 'text-[var(--success)]' },
                { key: 'plotGen', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>, label: t('panel.plotGenerator'), color: 'text-[var(--warning)]' },
                { key: 'timeskip', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>, label: t('panel.timeskip'), color: 'text-[var(--text-tertiary)]' },
                { key: 'npc', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.46 2.5 2.5 0 0 1-1.072-4.885A2.5 2.5 0 0 1 9.5 2m7.5 0a2.5 2.5 0 0 0-2.5-2.5A2.5 2.5 0 0 0 7 7.5v15a2.5 2.5 0 0 0 4.96-.46 2.5 2.5 0 0 0 1.072-4.885A2.5 2.5 0 0 0 14.5 5.5m2.5 0A2.5 2.5 0 0 1 19.5 7.5" /></svg>, label: t('panel.npcMinds'), color: 'text-[var(--text-tertiary)]' },
                { key: 'memory', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 12L2 9l4-6z" /></svg>, label: t('panel.memoryCrystals'), color: 'text-[var(--text-tertiary)]' },
                { key: 'journal', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>, label: t('panel.journal'), color: 'text-[var(--warning)]' },
                { key: 'settings', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>, label: t('panel.settings'), color: 'text-[var(--text-tertiary)]' },
              ].map(({ key, icon, label, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { togglePanel(key); setMobileToolsOpen(false) }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--accent-muted)] transition-colors ${panelState[key] ? color : 'text-[var(--text-secondary)]'}`}
                >
                  {icon}
                  <span className="text-sm font-medium">{label}</span>
                  {panelState[key] && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-current" />}
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body,
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
              title={t(a.hintKey)}
            >
              {t(a.labelKey)}
            </button>
          )
        })}
        <div className="flex-1" />
        <span className="text-[10px] text-[var(--text-disabled)] self-center pr-1 hidden sm:block">
          {t('action.continueKey')}
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
            {disabled ? t('action.placeholder.waiting') : t('action.placeholder.continue')}
          </button>
        ) : (
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={disabled ? t('action.placeholder.waiting') : t(`action.placeholder.${type.toLowerCase()}`)}
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
              : 'bg-[rgba(200,200,216,0.15)] border-[rgba(200,200,216,0.32)] text-[var(--text-primary)] hover:bg-[rgba(200,200,216,0.22)] hover:border-[rgba(200,200,216,0.48)] cursor-pointer'
            }
          `}
          title={t('generic.send')}
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
