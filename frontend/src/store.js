import { create } from 'zustand'
import { getToken, login as apiLogin, register as apiRegister, logout as apiLogout, fetchMe } from './api'

// ---- localStorage key helpers ----
const CAMPAIGNS_KEY = 'lunar_campaigns'

function loadAllCampaigns() {
  try { return JSON.parse(localStorage.getItem(CAMPAIGNS_KEY) || '{}') } catch { return {} }
}

function saveAllCampaigns(data) {
  try { localStorage.setItem(CAMPAIGNS_KEY, JSON.stringify(data)) } catch {}
}

function persistCampaignState(campaignId, patch) {
  if (!campaignId) return
  const all = loadAllCampaigns()
  all[campaignId] = { ...(all[campaignId] || {}), ...patch }
  saveAllCampaigns(all)
}

function clearCampaignFromStorage(campaignId) {
  const all = loadAllCampaigns()
  delete all[campaignId]
  saveAllCampaigns(all)
}

export { persistCampaignState }

// ---- Auth initializer ----
function _initAuth() {
  const token = getToken()
  if (!token) return { user: null, token: null, isAuthenticated: false, isAdmin: false }
  // fetchMe will be called by the App on mount to validate token
  return { user: null, token, isAuthenticated: true, isAdmin: false }
}

// ---- Store ----
export const useGameStore = create((set, get) => ({
  // Auth state
  ..._initAuth(),

  // Global settings (not scoped to a campaign)
  llmProvider: 'deepseek',
  llmModel: 'deepseek-chat',
  temperature: 0.85,
  maxTokens: 2000,

  // Auth actions
  login: async ({ email, password }) => {
    const data = await apiLogin(email, password)
    const user = data.user
    set({
      user,
      token: data.access_token,
      isAuthenticated: true,
      isAdmin: user.is_admin || false,
    })
    return data
  },

  register: async ({ email, username, password }) => {
    const data = await apiRegister(email, username, password)
    const user = data.user
    set({
      user,
      token: data.access_token,
      isAuthenticated: true,
      isAdmin: user.is_admin || false,
    })
    return data
  },

  logout: () => {
    apiLogout()
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isAdmin: false,
      scenarios: [],
      activeScenario: null,
      messages: [],
      chapters: [],
      journal: [],
      inventory: [],
    })
  },

  hydrateUser: async () => {
    const { token } = get()
    if (!token) return
    try {
      const user = await fetchMe()
      set({ user, isAdmin: user.is_admin || false })
    } catch {
      // Silently ignore — auth state (token) is still valid for navigation.
      // The error will surface as a 401 on the next API call, which is expected
      // if the backend is unreachable or the token is invalid.
    }
  },

  updateUser: (userData) => {
    const { user } = get()
    set({ user: { ...user, ...userData } })
  },

  // Scenario list (used on Home page)
  scenarios: [],
  setScenarios: (scenarios) => set({ scenarios }),

  // Active campaign / scenario — single source of truth is the URL route
  // These are kept so Play.jsx can read them without prop-drilling
  activeCampaignId: null,
  activeScenario: null,

  // Play state — always scoped to activeCampaignId
  messages: [],
  chapters: [],      // [{ id, fromIndex }]
  journal: [],
  inventory: [],
  isStreaming: false,
  combatMode: false,

  // ---- Settings ----
  updateSettings: (settings) => {
    try {
      const current = JSON.parse(localStorage.getItem('lunar_settings') || '{}')
      localStorage.setItem('lunar_settings', JSON.stringify({ ...current, ...settings }))
    } catch {}
    return set(settings)
  },

  restoreSettings: () => {
    try {
      const s = JSON.parse(localStorage.getItem('lunar_settings') || '{}')
      const restored = {}
      if (s.llmProvider) restored.llmProvider = s.llmProvider
      if (s.llmModel) restored.llmModel = s.llmModel
      if (s.temperature != null) restored.temperature = s.temperature
      if (s.maxTokens != null) restored.maxTokens = s.maxTokens
      if (Object.keys(restored).length > 0) set(restored)
    } catch {}
  },

  // ---- Campaign lifecycle ----
  // Called by Play.jsx on mount with the campaignId from the URL route.
  // Loads persisted state for that specific campaign into store.
  loadCampaign: (campaignId) => {
    if (!campaignId) return
    const all = loadAllCampaigns()
    const saved = all[campaignId] || {}
    const patch = {
      activeCampaignId: campaignId,
      activeScenario: saved.scenario || null,
      messages: saved.messages || [],
      chapters: saved.chapters || [],
      journal: saved.journal || [],
      inventory: saved.inventory || [],
      isStreaming: false,
      combatMode: false,
    }
    set(patch)
    return patch
  },

  // Persist the current campaign's state to localStorage.
  // Call this whenever play state changes.
  _persistCampaign: () => {
    const { activeCampaignId, messages, chapters, journal, inventory, activeScenario } = get()
    if (!activeCampaignId) return
    persistCampaignState(activeCampaignId, {
      scenario: activeScenario,
      messages,
      chapters,
      journal,
      inventory,
    })
  },

  setActiveScenario: (scenario) => {
    const { activeCampaignId } = get()
    if (activeCampaignId) {
      persistCampaignState(activeCampaignId, { scenario })
    }
    return set({ activeScenario: scenario })
  },

  setMessages: (messages) => {
    set({ messages })
    get()._persistCampaign()
  },

  appendMessage: (msg) => {
    set((s) => ({ messages: [...s.messages, msg] }))
    get()._persistCampaign()
  },

  appendToLastMessage: (chunk) => {
    set((s) => {
      const messages = [...s.messages]
      const last = messages[messages.length - 1]
      if (last && last.role === 'assistant') {
        messages[messages.length - 1] = { ...last, content: last.content + chunk }
      } else {
        messages.push({ role: 'assistant', content: chunk })
      }
      return { messages }
    })
    get()._persistCampaign()
  },

  replaceLastAssistantMessage: (content) => {
    set((s) => {
      const messages = [...s.messages]
      for (let i = messages.length - 1; i >= 0; i--) {
        if (messages[i].role === 'assistant') {
          messages[i] = { ...messages[i], content }
          break
        }
      }
      return { messages }
    })
    get()._persistCampaign()
  },

  popLastPair: () => {
    set((s) => {
      const messages = [...s.messages]
      if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') messages.pop()
      if (messages.length > 0 && messages[messages.length - 1].role === 'user') messages.pop()
      return { messages }
    })
    get()._persistCampaign()
  },

  clearMessages: () => {
    set({ messages: [] })
    get()._persistCampaign()
  },

  // Chapters are derived from messages but persisted for bookmarking old chapters
  setChapters: (chapters) => {
    set({ chapters })
    get()._persistCampaign()
  },

  addJournalEntry: (entry) => {
    set((s) => ({ journal: [...s.journal, entry] }))
    get()._persistCampaign()
  },

  setJournal: (journal) => {
    set({ journal })
    get()._persistCampaign()
  },

  setInventory: (inventory) => {
    set({ inventory })
    get()._persistCampaign()
  },

  addInventoryItem: (item) => {
    set((s) => ({ inventory: [...s.inventory, item] }))
    get()._persistCampaign()
  },

  updateInventoryItem: (name, status) => {
    set((s) => ({
      inventory: s.inventory.map((i) => i.name === name ? { ...i, status } : i),
    }))
    get()._persistCampaign()
  },

  setStreaming: (isStreaming) => set({ isStreaming }),
  setCombatMode: (combatMode) => set({ combatMode }),

  // Delete a campaign from localStorage (used when user resets)
  deleteCampaignLocal: (campaignId) => {
    clearCampaignFromStorage(campaignId)
  },

  // Clear the active play session (called on "Disconnect")
  clearSession: () => {
    const { activeCampaignId } = get()
    set({
      activeScenario: null,
      messages: [],
      chapters: [],
      journal: [],
      inventory: [],
      isStreaming: false,
      combatMode: false,
    })
    // Keep activeCampaignId so Play.jsx knows we're still on this route
    // (it will handle redirect via useEffect)
  },
}))
