import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { flushSync } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import { useGameStore } from '../store'
import { streamAction, fetchJournal, fetchHistory, fetchCampaignScenario, fetchInventory as fetchInventoryApi, rewindLastAction, getPendingAction } from '../api'
import { mergeCampaignPatch } from '../utils/campaignStorage'
import { useI18n } from '../i18n'

import NarrativeBlock from '../components/canvas/NarrativeBlock'
import { buildChaptersFromMessages, sliceMessagesForChapter } from '../utils/chapters'
import { MENTION_SPLIT_REGEX } from '../utils/mentionRegex'

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
  const parts = children.split(MENTION_SPLIT_REGEX)
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
      <div className="flex items-center gap-2 mb-3 opacity-70">
        <span className="w-1 h-1 rounded-full bg-[var(--warning)]" />
        <span className="text-[10px] font-bold uppercase tracking-widest font-mono text-[var(--warning)]">
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

// ---- Chapter history: compact select + prev/next (scales to many chapters) ----
function ChapterBar({ chapters, activeChapterId, viewingChapterId, selectedChapterId, onSelect, isRecovering, playerTurnCount }) {
  const { t } = useI18n()

  if (chapters.length <= 1) return null

  const foundIdx = chapters.findIndex((c) => c.id === selectedChapterId)
  const safeIdx = foundIdx >= 0 ? foundIdx : chapters.length - 1
  const atLive = !viewingChapterId || viewingChapterId === activeChapterId

  const chapterOptionLabel = (ch, i) =>
    (ch.id === 'ch-opening' ? t('play.chapter.opening') : String(i))

  const goPrev = () => {
    if (safeIdx > 0) onSelect(chapters[safeIdx - 1].id)
  }
  const goNext = () => {
    // BUG FIX: never advance to next chapter while a recovery is in-flight.
    // The entire "go to next" navigation is blocked during recovery to prevent
    // the UI from jumping ahead before the recovering chapter is complete.
    if (isRecovering) return
    if (safeIdx < chapters.length - 1) onSelect(chapters[safeIdx + 1].id)
  }

  // Bar count = player turns only (exclude synthetic "opening" row) — avoids "Chương · 3"
  // when dropdown only shows Mở Đầu + lượt 1 + lượt 2.
  const barCount = playerTurnCount ?? Math.max(0, chapters.length - 1)

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]/50">
      <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] shrink-0 truncate max-w-[5.5rem] sm:max-w-none">
        {t('play.chapter.barLabel', { count: barCount })}
      </span>

      <div className="flex items-center gap-1 min-w-0 flex-1 sm:flex-initial sm:max-w-md">
        <button
          type="button"
          onClick={goPrev}
          disabled={safeIdx <= 0}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label={t('play.chapter.prev')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>

        <div className="relative min-w-0 flex-1">
          <select
            value={chapters[safeIdx]?.id ?? chapters[0].id}
            onChange={(e) => onSelect(e.target.value)}
            aria-label={t('play.chapter.jump')}
            className="w-full appearance-none rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-[var(--text-primary)] text-[11px] font-medium pl-3 pr-9 py-2 cursor-pointer hover:border-[var(--border-default)] focus:outline-none focus:ring-1 focus:ring-[var(--border-strong)]"
          >
            {chapters.map((ch, i) => {
              const isLive = ch.id === activeChapterId
              const isSelected = ch.id === chapters[safeIdx]?.id
              const viewingOld = viewingChapterId && viewingChapterId !== activeChapterId
              let suffix = ''
              if (isLive && atLive && isSelected) suffix = ` · ${t('play.chapter.live')}`
              else if (isLive && viewingOld) suffix = ` (${t('play.chapter.current')})`
              return (
                <option key={ch.id} value={ch.id}>
                  {chapterOptionLabel(ch, i)}{suffix}
                </option>
              )
            })}
          </select>
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
          </span>
        </div>

        <button
          type="button"
          onClick={goNext}
          disabled={safeIdx >= chapters.length - 1 || isRecovering}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] disabled:opacity-30 disabled:pointer-events-none transition-all"
          aria-label={t('play.chapter.next')}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
        </button>
      </div>
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
    maxTokens, llmProvider, llmModel, temperature, streamDeliverySpeed,
    setChapters: setChaptersInStore,
  } = useGameStore()

  // Read persisted state synchronously ONCE at mount (function initializer).
  // This avoids calling setState during render.
  const initialState = useMemo(() => readCampaignFromStorage(campaignId), [campaignId])

  // Compute the "last chapter id" from initialState so the FIRST render already shows
  // the correct chapter — not blank "ch-opening".  This avoids the flash where
  // activeChapterId is null before the useEffect runs.
  const initialChapterId = useMemo(() => {
    if (initialState.chapters?.length) {
      return initialState.chapters[initialState.chapters.length - 1].id
    }
    if (initialState.messages?.length) {
      return buildChaptersFromMessages(initialState.messages)[
        buildChaptersFromMessages(initialState.messages).length - 1
      ]?.id ?? null
    }
    return null
  }, []) // intentionally empty deps — compute once from initialState

  const [messages, setMessages] = useState(initialState.messages || [])
  const [chapters, setChapters] = useState(initialState.chapters || [])
  const [journal, setJournalState] = useState(initialState.journal || [])
  const [inventory, setInventoryState] = useState(initialState.inventory || [])
  const [activeScenario, setActiveScenario] = useState(initialState.scenario || null)
  const [activeChapterId, setActiveChapterId] = useState(initialChapterId)
  const [viewingChapterId, setViewingChapterId] = useState(null) // null = viewing active / live
  const [loadingError, setLoadingError] = useState(null)
  const hydratedRef = useRef(false)
  const persistRef = useRef(null)

  // ---- Persist to localStorage whenever state changes ----
  // Use refs instead of closure captures — avoid stale snapshots when callbacks
  // fire asynchronously (e.g., setTimeout, promise chains).
  const _messagesForPersist = useRef(messages)
  const _scenarioForPersist = useRef(activeScenario)
  const _journalForPersist = useRef(journal)
  const _inventoryForPersist = useRef(inventory)
  useEffect(() => { _messagesForPersist.current = messages }, [messages])
  useEffect(() => { _scenarioForPersist.current = activeScenario }, [activeScenario])
  useEffect(() => { _journalForPersist.current = journal }, [journal])
  useEffect(() => { _inventoryForPersist.current = inventory }, [inventory])

  // Guard: only persist to localStorage AFTER fetchHistory has run.
  // persistRef is initialized as null, and this ref tracks whether it's safe to persist.
  // Before fetchHistory completes, any persist would write stale/empty data and OVERWRITE
  // the correct data from the previous session (e.g. Chapter 1 complete).
  const persistedRef = useRef(false)

  persistRef.current = () => {
    if (!campaignId) return
    // CRITICAL: don't persist until fetchHistory has loaded the real server state.
    // Calling persist before fetchHistory returns (on first render) would write
    // _messagesForPersist.current = [] (the empty initial state) to localStorage,
    // wiping out the persisted Chapter 1 data from the previous session.
    if (!persistedRef.current) return
    try {
      const msgs = _messagesForPersist.current
      const scn = _scenarioForPersist.current
      const jrn = _journalForPersist.current
      const inv = _inventoryForPersist.current
      const all = JSON.parse(localStorage.getItem('lunar_campaigns') || '{}')
      const prev = all[campaignId] || {}
      all[campaignId] = {
        ...prev,
        scenario: scn != null ? scn : (prev.scenario ?? null),
        messages: msgs,
        chapters: buildChaptersFromMessages(msgs),
        journal: jrn,
        inventory: inv,
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

  // Always derive from messages. Persisted `chapters` used to use ids like ch-5-1739… which
  // do not match buildChaptersFromMessages (ch-0, ch-2, …) → after reload slice missed → blank canvas.
  const displayChapters = useMemo(() => buildChaptersFromMessages(messages), [messages])

  const readingChapterId = viewingChapterId ?? activeChapterId
    ?? displayChapters[displayChapters.length - 1]?.id ?? 'ch-opening'

  const displayMessages = useMemo(() => {
    if (!readingChapterId) return []
    return sliceMessagesForChapter(messages, displayChapters, readingChapterId)
  }, [messages, displayChapters, readingChapterId])

  /** Last message is user → narrator has not finished this turn; block another send. */
  const awaitingNarrator = useMemo(
    () => messages.length > 0 && messages[messages.length - 1].role === 'user',
    [messages],
  )

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

  // Stable ref: always holds the LATEST messages — avoids stale closure in callbacks.
  // handleAction is called from a promise chain (after fetchHistory), where the `messages`
  // captured in the useCallback closure would be [] (pre-fetch) instead of the real history.
  const messagesRef = useRef(messages)
  useEffect(() => { messagesRef.current = messages }, [messages])

  // Stable ref for the activeChapterId — used in stream callbacks where the closure
  // could be stale (captured before fetchHistory updated state).
  const activeChapterIdRef = useRef(activeChapterId)
  useEffect(() => { activeChapterIdRef.current = activeChapterId }, [activeChapterId])

  // Stable ref for activeScenario — used in streamAction config where closure could be stale
  const activeScenarioRef = useRef(activeScenario)
  useEffect(() => { activeScenarioRef.current = activeScenario }, [activeScenario])

  // ---- Recovery state: pending action from a crashed/interrupted session ----
  const [resumingPending, setResumingPending] = useState(null) // { action, actionId } or null
  /** True only while re-streaming after user taps "Tiếp tục" on the recovery banner. */
  const [recoveryMode, setRecoveryMode] = useState(false)
  /** Rank advance notification: { from, to, trigger, reason, narrative } */
  const [rankAdvanceNotif, setRankAdvanceNotif] = useState(null)
  const recoveringFromBannerRef = useRef(false)
  /** Prevents CONTINUE from racing with history fetch. */
  const historyLoadedRef = useRef(false)
  /** Separate ref for the auto-dismiss timer so we don't mutate React state. */
  const bannerTimerRef = useRef(null)
  /** The chapter ID that was pending when recovery was triggered — used to guard
   *  against advancing while recovery is still in-flight. */
  const recoveringChapterIdRef = useRef(null)

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

  // ---- Streaming handler ----
  // Backend delivers chunks according to streamDeliverySpeed setting (instant / typewriter, etc).
  // We append them directly to the last assistant message — no client-side animation needed.
  const _appendChunk = useCallback((chunk) => {
    setMessages((prev) => {
      const msgs = [...prev]
      const last = msgs[msgs.length - 1]
      if (last?.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + chunk }
      } else {
        msgs.push({ role: 'assistant', content: chunk })
      }
      return msgs
    })
  }, [])

  // =========================================================
  // CAMPAIGN LOAD — runs once on mount / campaignId change
  // =========================================================
  useEffect(() => {
    if (!campaignId) {
      setLoadingError('missing')
      return
    }
    hydratedRef.current = false
    historyLoadedRef.current = false
    // Reset persist guard on each campaign load — will be re-enabled after fetchHistory succeeds.
    persistedRef.current = false

    // Retry helper: attempt a fetch up to `retries` times with increasing delay.
    const withRetry = async (fn, retries = 2) => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const result = await fn()
          return result
        } catch (err) {
          if (attempt === retries) throw err
          await new Promise((r) => setTimeout(r, 300 * (attempt + 1)))
        }
      }
    }

    // Step 1: ALWAYS fetch history first (source of truth from server).
    // Retries on transient errors (network blips, slow startup).
    withRetry(() => fetchHistory(campaignId))
      .then((res) => {
        if (!res) {
          // Server returned 200 but empty body — treat as no history
          hydratedRef.current = true
          historyLoadedRef.current = true
          return null
        }
        const { messages: history } = res
        if (history && history.length > 0) {
          // BUG FIX: set activeChapterId to the LAST COMPLETE chapter.
          // Previously: always set to the last chapter in history, even if its
          // narrative is missing (pending recovery). This caused the UI to jump
          // ahead to a "phantom" chapter 3 while chapter 2 was still incomplete.
          // Now: only mark a chapter complete when it has a matching NARRATOR_RESPONSE.
          const completeChapterId = (() => {
            const built = buildChaptersFromMessages(history)
            // Walk backwards: first chapter whose response is complete
            // (has an assistant message immediately following its user message)
            for (let i = built.length - 1; i >= 1; i--) {
              const ch = built[i]
              const next = built[i + 1]
              const start = ch.fromIndex
              const end = next ? next.fromIndex : history.length
              const slice = history.slice(start, end)
              const hasResponse = slice.some((m) => m.role === 'assistant' && m.content?.length > 0)
              if (hasResponse) return ch.id
            }
            // No complete chapter found (all chapters have pending responses)
            // Fall back to the chapter BEFORE the last one, or opening
            if (built.length >= 2) return built[built.length - 2].id
            return built[0]?.id ?? 'ch-opening'
          })()
          // If the latest event is a user action with no assistant reply yet, the "live"
          // chapter must be THAT turn — not the last fully completed chapter. Otherwise
          // after reload "1 · Live" shows while chapter 1 is still pending and a phantom
          // chapter 2 exists in the list.
          let activeId = completeChapterId
          if (history[history.length - 1]?.role === 'user') {
            activeId = `ch-${history.length - 1}`
          }
          setMessages(history)
          setChapters(buildChaptersFromMessages(history))
          setActiveChapterId(activeId)
          // Drop any in-progress "browse old chapter" from before history arrived — avoids
          // double yellow banners (recovery + viewing old) and VIEWING badge vs live mismatch.
          setViewingChapterId(null)
        } else {
          const start = buildChaptersFromMessages([])
          setChapters(start)
          setActiveChapterId(start[start.length - 1].id)
          setViewingChapterId(null)
        }
        hydratedRef.current = true
        // Enable persist AFTER we have the real server state — prevents overwriting
        // the previous session's data with empty initial state on first render.
        persistedRef.current = true
        if (persistRef.current) persistRef.current()
        historyLoadedRef.current = true
        return history
      })
      .then((history) => {
        // Step 2: AFTER history is loaded, check pending status from backend.
        // Uses `history` from step 1's closure (avoids reading stale localStorage).
        return withRetry(() => getPendingAction(campaignId)).then((pendingRes) => ({ history, pendingRes }))
      })
      .then(({ history, pendingRes }) => {
        if (!historyLoadedRef.current) return // component may have unmounted
        const { pending, action, action_id, created_at, user_message_index: pendingUserIdx } = pendingRes
        // FIX: read hasCompleteResponse from the SERVER history that we just loaded,
        // not from localStorage (initialState). If persistRef overwrote localStorage
        // with [] on a previous render, localStorage would be empty and this check
        // would wrongly trigger recovery even when Chapter 1 is complete on the server.
        const serverMessages = history
        const hasCompleteResponse = (
          serverMessages &&
          serverMessages.length > 0 &&
          serverMessages[serverMessages.length - 1].role === 'assistant'
        )
        if (pending && action && !hasCompleteResponse) {
          setViewingChapterId(null)
          setResumingPending({ action, actionId: action_id, createdAt: created_at })
          // Pin "live" chapter to the server's pending turn (avoids phantom ch-2 when
          // history ordering or duplicate rows would misalign with completeChapterId).
          if (typeof pendingUserIdx === 'number' && pendingUserIdx >= 0) {
            setActiveChapterId(`ch-${pendingUserIdx}`)
          }
        } else {
          setResumingPending(null)
          mergeCampaignPatch(campaignId, { pendingActionId: null })
        }
      })
      .catch(() => {
        // Only set error if history was never loaded successfully
        if (!hydratedRef.current) {
          setLoadingError('fetch_failed')
        }
      })

    // Inventory + journal load in parallel (they don't affect canvas state)
    fetchInventoryApi(campaignId)
      .then((items) => { setInventoryState(items); setInventoryLocal(items) })
      .catch(() => {})

    fetchJournal(campaignId)
      .then((entries) => { setJournalState(entries); setJournalLocal(entries) })
      .catch(() => {})

    useGameStore.setState({ activeCampaignId: campaignId })

    fetchCampaignScenario(campaignId)
      .then((scenario) => {
        if (!scenario) return
        setActiveScenario((prev) => prev ?? scenario)
        useGameStore.setState((s) => ({ activeScenario: s.activeScenario ?? scenario }))
      })
      .catch(() => {})
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

  // Add user message → new chapter starts at this index in flat messages.
  // `isReplay` is true when re-streaming after clicking "Tiếp tục" on the recovery banner.
  //
  // VIGAN (stale closure fix):
  // Use messagesRef.current instead of the `messages` closure variable.
  // When handleAction is called from the promise chain AFTER fetchHistory,
  // the closure `messages` would be [] (the pre-fetch value), not the real history.
  // messagesRef.current is kept in sync via useEffect.
  //
  // After fetchHistory the canvas may already show a partial assistant response
  // (the server saved it before the previous stream crashed).  In that case we
  // do NOT call streamAction again — doing so would send the same action to the
  // server a second time, appending a DUPLICATE PLAYER_ACTION + response and
  // creating a phantom chapter.  Instead we just wait for the existing stream to
  // finish: setStreaming(true) shows the indicator, onChunk / onDone complete the
  // partial text in-place.
  //
  // How we detect "partial already saved": the last message is an assistant message
  // whose content is a PREFIX of what the server will stream back (partial vs complete).
  // Use a module-level symbol to mark actions that have already been sent to the
  // server in the current session (to avoid double-send on the replay path).
  // Set before each streamAction call; cleared in onDone / onError.
  const _sentActions = useRef(new Set())
  useEffect(() => { _sentActions.current.clear() }, [campaignId])

  // CRITICAL: always read from the LIVE ref, never the closure `messages`.
  // When hasPartialSaved is called from the promise chain (after fetchHistory),
  // the closure `messages` would be [] (pre-fetch value), not the real history.
  const hasPartialSaved = (action) => {
    const msgs = messagesRef.current
    if (!msgs?.length) return false
    const last = msgs[msgs.length - 1]
    if (last?.role !== 'assistant') return false
    // Partial: stored text is a prefix of the complete response.
    // The pending action text is NOT in the response — it was the user input.
    // Check: does the action text start with the partial content prefix?
    return last.content?.length > 0 && action?.startsWith(last.content.slice(0, 10))
  }

  const handleAction = useCallback((action, isReplay = false) => {
    // Always read from the live ref to avoid stale closure
    const currentMessages = messagesRef.current
    const shouldStream = !isReplay || !hasPartialSaved(action)

    // Never stack a second user turn before the narrator finishes the previous one.
    // Prevents "chapter 2" appearing while chapter 1 is still incomplete (recovery).
    if (!isReplay && currentMessages.length > 0) {
      const last = currentMessages[currentMessages.length - 1]
      if (last?.role === 'user') {
        return
      }
    }

    if (!isReplay) {
      const userMsg = { role: 'user', content: action }
      // Use currentMessages (ref) instead of closure `messages` — the closure
      // may be stale if handleAction is called from a promise chain (recovery).
      const newMessages = [...currentMessages, userMsg]
      const built = buildChaptersFromMessages(newMessages)
      setMessages(newMessages)
      setChapters(built)
      setActiveChapterId(built[built.length - 1]?.id ?? 'ch-opening')
      setViewingChapterId(null)
      userScrolledUp.current = false
    } else {
      // fetchHistory loaded the complete messages + set activeChapterId.
      // RecoveringChapterIdRef records which chapter needs completion — used
      // to prevent the UI from jumping ahead before recovery finishes.
      recoveringChapterIdRef.current = activeChapterIdRef.current
      // The SSE onChunk will finish the pending response.
      setViewingChapterId(null)
      userScrolledUp.current = false
      // When replaying: only append if the action is NOT already the last user message.
      // If it IS the last user message (user action already saved to localStorage before
      // the previous stream crashed), skip appending — the existing stream will complete
      // the response in-place and appending would create a DUPLICATE chapter.
      const lastMsg = currentMessages[currentMessages.length - 1]
      const alreadyLastUser = lastMsg?.role === 'user' && lastMsg.content === action
      if (!alreadyLastUser) {
        const userMsg = { role: 'user', content: action }
        const newMessages = [...currentMessages, userMsg]
        const built = buildChaptersFromMessages(newMessages)
        setMessages(newMessages)
        setChapters(built)
        setActiveChapterId(built[built.length - 1]?.id ?? 'ch-opening')
      }
    }

    if (shouldStream) {
      // Guard: if this exact action is already in-flight, drop the duplicate call.
      // This prevents double-streaming if the user clicks rapidly or if the recovery
      // button is clicked while the previous stream is still initializing.
      // Applies to BOTH isReplay (recovery replay) and normal sends.
      if (_sentActions.current.has(action)) return
      _sentActions.current.add(action)
      setStreaming(true)

      // Persist after adding new chapter
      setTimeout(() => { if (persistRef.current) persistRef.current() }, 0)

      // Streaming always targets the active chapter. If user was viewing an old chapter,
      // they just started a new one — viewingChapterId is already reset to null above.
      // Use refs for all closure variables used inside streamAction callbacks.
      // The callbacks (onChunk, onDone, etc.) can fire asynchronously and capture
      // stale values from the closure. Refs always hold the latest values.
      streamAction({
        campaignId,
        scenarioTone: activeScenarioRef.current?.tone_instructions ?? '',
        protagonistName: activeScenarioRef.current?.protagonist_name ?? '',
        narrativePov: activeScenarioRef.current?.narrative_pov ?? 'first_person',
        writingStyle: activeScenarioRef.current?.writing_style ?? 'chinh_thong',
        language: activeScenarioRef.current?.language ?? 'en',
        action,
        openingNarrative: activeScenarioRef.current?.opening_narrative ?? '',
        maxTokens: maxTokens || 2000,
        provider: llmProvider,
        model: llmModel,
        temperature,
        streamDeliverySpeed,
        onChunk: _appendChunk,
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
        onRankAdvance: (result) => {
          setRankAdvanceNotif(result)
          setTimeout(() => setRankAdvanceNotif(null), 8000)
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
          setTimeout(() => { if (persistRef.current) persistRef.current() }, 0)
          setTimeout(() => setCombatMode(false), 3000)
          mergeCampaignPatch(campaignId, { pendingActionId: null })
          useGameStore.getState().clearPendingActionId()
          setRecoveryMode(false)
          recoveringChapterIdRef.current = null
          _sentActions.current.delete(action)
          if (recoveringFromBannerRef.current) {
            recoveringFromBannerRef.current = false
            setResumingPending(null)
          }
        },
        onError: () => {
          setStreaming(false)
          mergeCampaignPatch(campaignId, { pendingActionId: null })
          useGameStore.getState().clearPendingActionId()
          setRecoveryMode(false)
          _sentActions.current.delete(action)
        },
        onPendingActionId: (id) => {
          useGameStore.getState().setPendingActionId(id)
        },
      })
    } else {
      // Partial response already saved by a previous interrupted stream.
      // Do NOT stream again — just enable the streaming indicator so the user
      // knows the session is still alive.  onChunk / onDone will fire as the
      // SSE connection (from the PREVIOUS isReplay stream) completes.
      // Persist to update any stale state.
      setStreaming(true)
      setTimeout(() => { if (persistRef.current) persistRef.current() }, 0)
    }
  }, [campaignId, activeScenario, maxTokens, llmProvider, llmModel, temperature, messages])

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

  // ---- Status banner: interpolated inline in JSX below ----

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
              {isViewingOldChapter && !resumingPending && (
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

      {/* ===== RECOVERY BANNER (viewing-old banner is suppressed while this is shown) ===== */}
      {/* ===== RECOVERY BANNER ===== */}
      {resumingPending && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[rgba(251,191,36,0.08)] border-b border-[rgba(251,191,36,0.2)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--warning)] flex-shrink-0">
            <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.5"/>
          </svg>
          <p className="text-[11px] text-[var(--warning)] font-medium flex-1">
            {!historyLoadedRef.current
              ? 'Đang tải phiên chơi…'
              : recoveryMode
                ? 'Đang tiếp tục phiên chơi…'
                : resumingPending.action
                  ? 'Phiên chơi bị gián đoạn — hành động trước chưa có phản hồi'
                  : 'Hành động vừa hoàn tất'}
          </p>
          {!recoveryMode && resumingPending.action && (
            <>
              <button
                className="flex-none px-3 py-1.5 rounded-lg bg-[var(--warning)] text-[var(--bg-base)] text-[11px] font-semibold hover:opacity-80 transition-opacity disabled:opacity-50"
                disabled={!historyLoadedRef.current}
                title={!historyLoadedRef.current ? 'Đang tải…' : 'Tiếp tục phiên chơi'}
                onClick={() => {
                  if (!historyLoadedRef.current) return
                  recoveringFromBannerRef.current = true
                  setRecoveryMode(true)
                  handleAction(resumingPending.action, true)
                  clearTimeout(bannerTimerRef.current)
                  bannerTimerRef.current = setTimeout(() => {
                    setResumingPending(null)
                    bannerTimerRef.current = null
                  }, 60000)
                }}
              >
                Tiếp tục
              </button>
              <button
                className="flex-none px-3 py-1.5 rounded-lg border border-[rgba(251,191,36,0.3)] text-[var(--warning)] text-[11px] font-medium hover:bg-[rgba(251,191,36,0.1)] transition-colors"
                onClick={() => {
                  clearTimeout(bannerTimerRef.current)
                  bannerTimerRef.current = null
                  setResumingPending(null)
                }}
              >
                Bỏ qua
              </button>
            </>
          )}
          {!recoveryMode && !resumingPending.action && (
            <button
              className="flex-none px-3 py-1.5 rounded-lg border border-[rgba(251,191,36,0.3)] text-[var(--warning)] text-[11px] font-medium hover:bg-[rgba(251,191,36,0.1)] transition-colors"
              onClick={() => setResumingPending(null)}
            >
              Đóng
            </button>
          )}
        </div>
      )}

      {/* ===== VIEWING OLD CHAPTER BANNER (hide while recovery is active — one banner only) ===== */}
      {isViewingOldChapter && !resumingPending && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--info-muted)] border-b border-[rgba(96,165,250,0.18)]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--info)] flex-shrink-0">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
          </svg>
          <p className="text-[11px] text-[var(--info)] opacity-80 flex-1 leading-none">
            {t('play.chapter.viewingOldHint')}
          </p>
          <button
            onClick={() => setViewingChapterId(null)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest text-[var(--info)] bg-[rgba(96,165,250,0.08)] border border-[rgba(96,165,250,0.2)] hover:bg-[rgba(96,165,250,0.14)] hover:border-[rgba(96,165,250,0.3)] transition-all whitespace-nowrap"
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
        selectedChapterId={readingChapterId}
        onSelect={handleChapterSelect}
        isRecovering={!!resumingPending}
        playerTurnCount={Math.max(0, displayChapters.length - 1)}
      />

      {/* ===== RANK ADVANCE NOTIFICATION ===== */}
      {rankAdvanceNotif && (
        <div className="flex items-start gap-3 px-4 py-3 bg-[rgba(251,191,36,0.06)] border-b border-[rgba(251,191,36,0.15)] animate-[slideDown_0.3s_ease-out]">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[rgba(251,191,36,0.12)] border border-[rgba(251,191,36,0.2)] flex items-center justify-center mt-0.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[var(--warning)]">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--warning)]">
                ⬆ {t ? t('rank.advance') : 'Đột Phá'}
              </span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                {rankAdvanceNotif.trigger}
              </span>
            </div>
            <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
              <span className="text-[var(--text-tertiary)] line-through mr-1">{rankAdvanceNotif.from_entity || rankAdvanceNotif.from}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="inline text-[var(--warning)] mx-1"><polyline points="9 18 15 12 9 6"/></svg>
              <span className="font-semibold text-[var(--warning)]">{rankAdvanceNotif.to_entity || rankAdvanceNotif.to}</span>
            </div>
            {rankAdvanceNotif.reason && (
              <p className="text-[11px] text-[var(--text-tertiary)] mt-1 italic">{rankAdvanceNotif.reason}</p>
            )}
          </div>
          <button
            onClick={() => setRankAdvanceNotif(null)}
            className="flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--accent-muted)] transition-all"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* ===== MAIN: Narrative area ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ---- Narrative Area ---- */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scrollbar px-5 sm:px-6 md:px-8 py-8"
        >
          <div className="max-w-[var(--content-max-width)] mx-auto space-y-8">

            {/* Opening narrative */}
            {readingChapterId === 'ch-opening' && activeScenario?.opening_narrative && (
              <div className="card-raised p-5 sm:p-6 md:p-8">
                <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--warning)] opacity-70">
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
                <div key={i} className="card-raised p-5 sm:p-6 md:p-8">
                  <div className="flex items-center gap-2 mb-3 opacity-70">
                    <span className={`w-1.5 h-1.5 rounded-full ${combatMode ? 'bg-[var(--error)]' : 'bg-[var(--warning)]'}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-widest font-mono ${combatMode ? 'text-[var(--error)]' : 'text-[var(--warning)]'}`}>
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
      {!isViewingOldChapter && (
        <div className="flex-none border-t border-[var(--border-subtle)] bg-[var(--bg-surface)]/95 backdrop-blur-xl z-10">
          <div className="max-w-[var(--content-max-width)] mx-auto px-5 sm:px-6 md:px-8">
            <ActionInputRedesigned
              onSubmit={handleAction}
              disabled={isStreaming}
              awaitingNarrator={awaitingNarrator}
              recoveryBlocking={!!resumingPending?.action}
            />
          </div>
        </div>
      )}

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
function ActionInputRedesigned({ onSubmit, disabled, awaitingNarrator = false, recoveryBlocking = false }) {
  const { t } = useI18n()
  const [text, setText] = useState('')
  const [type, setType] = useState('DO')
  const [mentionState, setMentionState] = useState(null)
  const [mentionResults, setMentionResults] = useState([])
  const [mentionIndex, setMentionIndex] = useState(0)
  const textareaRef = useRef(null)
  const dropdownRef = useRef(null)
  const campaignId = useGameStore((s) => s.activeCampaignId)

  const inputLocked = disabled || awaitingNarrator || recoveryBlocking

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
        if (!text.trim() && !inputLocked) {
          e.preventDefault()
          onSubmit('[CONTINUE]')
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [text, inputLocked, onSubmit])

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
    if (inputLocked) return
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

  const lockedPlaceholder = () => {
    if (recoveryBlocking) return t('action.placeholder.recoveryFirst')
    if (awaitingNarrator) return t('action.placeholder.awaitNarrator')
    return t('action.placeholder.waiting')
  }

  return (
    <form onSubmit={handleSubmit} className="py-4 space-y-3">
      {/* Action type pills */}
      <div className="flex gap-1.5 flex-wrap">
        {ACTION_TYPES.map((a) => {
          const isActive = type === a.id
          return (
            <button
              key={a.id}
              type="button"
              disabled={inputLocked}
              onClick={() => { if (inputLocked) return; setType(a.id); if (a.id === 'CONTINUE') setText('') }}
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
            disabled={inputLocked}
            className="flex-1 text-left px-4 py-3 rounded-xl bg-[var(--accent-muted)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] transition-all text-sm font-light cursor-pointer disabled:opacity-50"
          >
            {inputLocked ? lockedPlaceholder() : t('action.placeholder.continue')}
          </button>
        ) : (
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              disabled={inputLocked}
              placeholder={inputLocked ? lockedPlaceholder() : t(`action.placeholder.${type.toLowerCase()}`)}
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
          disabled={inputLocked || (type !== 'CONTINUE' && !text.trim())}
          className={`
            flex items-center justify-center w-12 h-12 rounded-xl flex-shrink-0
            border transition-all duration-150
            ${(inputLocked || (type !== 'CONTINUE' && !text.trim()))
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
