import { INTERNAL_TAG_STRIP_REGEX, stripPowerControlTags } from './utils/mentionRegex'
import { mergeCampaignPatch } from './utils/campaignStorage'

const BASE = '/api'  // proxied to http://localhost:8000 via vite proxy
const TOKEN_KEY = 'lunar_token'

// ---- Auth helpers ----
export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || null
}

function authHeader(extra = {}) {
  const token = getToken()
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }
}

// Intercept fetch to detect expired/invalid tokens and redirect to login cleanly.
const _origFetch = window.fetch
window.fetch = async (...args) => {
  const r = await _origFetch(...args)
  if (r.status === 401 && typeof window !== 'undefined') {
    const url = args[0] && typeof args[0] === 'object' ? args[0].url : args[0]
    const isLoginPage = window.location.pathname === '/login'
    const isAuthEndpoint = url && String(url).includes('/auth/')
    if (!isLoginPage && !isAuthEndpoint) {
      localStorage.removeItem('lunar_token')
      window.location.href = '/login'
    }
  }
  return r
}

// ---- Auth API ----
export async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail || 'Đăng nhập thất bại.')
  }
  const data = await r.json()
  localStorage.setItem(TOKEN_KEY, data.access_token)
  return data
}

export async function register(email, username, password) {
  const r = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, username, password }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail || 'Đăng ký thất bại.')
  }
  const data = await r.json()
  localStorage.setItem(TOKEN_KEY, data.access_token)
  return data
}

export async function fetchMe() {
  const r = await fetch(`${BASE}/auth/me`, { headers: authHeader() })
  if (!r.ok) throw new Error('Unauthorized')
  return r.json()
}

export async function updateProfile(data) {
  const r = await fetch(`${BASE}/auth/me`, {
    method: 'PUT',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to update profile')
  }
  return r.json()
}

export async function changePassword(oldPassword, newPassword) {
  const r = await fetch(`${BASE}/auth/change-password`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to change password')
  }
  return r.json()
}

export async function deleteAccount() {
  const r = await fetch(`${BASE}/auth/account`, {
    method: 'DELETE',
    headers: authHeader(),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to delete account')
  }
  return r.json()
}

export async function fetchUserStats() {
  const r = await fetch(`${BASE}/auth/me/stats`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch user stats')
  return r.json()
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY)
}

// ---- Health ----
export async function checkNeo4j() {
  try {
    const r = await fetch(`${BASE}/health/neo4j`)
    if (!r.ok) return false
    return (await r.json()).status === 'ok'
  } catch {
    return false
  }
}

// ---- Power Systems (multi-axis) ----
export async function fetchPowerSystems() {
  const r = await fetch(`${BASE}/scenarios/power-systems`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch power systems')
  return r.json()
}

export async function fetchPowerSystemPresets() {
  const r = await fetch(`${BASE}/scenarios/power-system/presets`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch presets')
  return r.json()
}

export async function fetchPowerSystemPresetInfo(presetKey) {
  const r = await fetch(`${BASE}/scenarios/power-system/presets/${presetKey}`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch preset info')
  return r.json()
}

export async function generatePowerSystem({ loreText, language }) {
  const r = await fetch(`${BASE}/scenarios/power-system/generate`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ lore_text: loreText, language }),
  })
  if (!r.ok) throw new Error('Failed to generate power system')
  return r.json()
}

export async function savePowerSystemConfig(scenarioId, { powerSystemName, axes }) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/power-system/save`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ power_system_name: powerSystemName, axes }),
  })
  if (!r.ok) throw new Error('Failed to save power system')
  return r.json()
}

export async function getScenarioPowerSystem(scenarioId) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/power-system`, { headers: authHeader() })
  if (!r.ok) return null
  return r.json()
}

// ---- Scenarios ----
export async function fetchScenarios() {
  const r = await fetch(`${BASE}/scenarios/`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch scenarios')
  return r.json()
}

export async function getScenario(scenarioId) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch scenario')
  return r.json()
}

export async function createScenario(data) {
  const r = await fetch(`${BASE}/scenarios/`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to create scenario')
  return r.json()
}

export async function updateScenario(scenarioId, data) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}`, {
    method: 'PUT',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to update scenario')
  return r.json()
}

export async function expandScenario(data) {
  const r = await fetch(`${BASE}/scenarios/expand`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to expand scenario')
  return r.json()
}

export async function getStoryCards(scenarioId) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/story-cards`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch story cards')
  return r.json()
}

export async function addStoryCard(scenarioId, data) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/story-cards`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to add story card')
  return r.json()
}

export async function updateStoryCard(scenarioId, cardId, data) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/story-cards/${cardId}`, {
    method: 'PUT',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to update story card')
  return r.json()
}

export async function deleteStoryCard(scenarioId, cardId) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/story-cards/${cardId}`, {
    method: 'DELETE',
    headers: authHeader(),
  })
  if (!r.ok) throw new Error('Failed to delete story card')
  return r.json()
}

export async function fetchCampaigns(scenarioId) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/campaigns`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch campaigns')
  return r.json()
}

export async function createCampaign(scenarioId, playerName = 'Player') {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/campaigns`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ player_name: playerName }),
  })
  if (!r.ok) throw new Error('Failed to create campaign')
  return r.json() // { campaign, scenario }
}

export async function deleteCampaign(scenarioId, campaignId) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: authHeader(),
  })
  if (!r.ok) throw new Error('Failed to delete campaign')
  return r.json()
}

export async function deleteScenario(scenarioId) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}`, {
    method: 'DELETE',
    headers: authHeader(),
  })
  if (!r.ok) throw new Error('Failed to delete scenario')
  return r.json()
}

export async function exportScenario(scenarioId, title) {
  const r = await fetch(`${BASE}/scenarios/${scenarioId}/export`)
  if (!r.ok) throw new Error('Failed to export scenario')
  const blob = await r.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title || scenarioId}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function importScenario(data) {
  const r = await fetch(`${BASE}/scenarios/import`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to import scenario')
  return r.json()
}

// ---- Game ----
export async function fetchHistory(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/history`, { headers: authHeader() })
  if (!r.ok) {
    const detail = r.status === 404 ? '404' : 'Failed to fetch history'
    throw new Error(detail)
  }
  return r.json()
}

/** Scenario snapshot for Play header / opening — survives reload when localStorage lost `scenario`. */
export async function fetchCampaignScenario(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/scenario`, { headers: authHeader() })
  if (!r.ok) return null
  return r.json()
}

export async function getPendingAction(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/pending-action`, { headers: authHeader() })
  if (!r.ok) {
    const detail = r.status === 404 ? '404' : 'Failed to check pending action'
    throw new Error(detail)
  }
  return r.json()
}

export async function fetchCharacters(campaignId, query = '') {
  const params = query ? `?q=${encodeURIComponent(query)}` : ''
  const r = await fetch(`${BASE}/game/${campaignId}/characters${params}`, { headers: authHeader() })
  if (!r.ok) return []
  return r.json()
}

export function streamAction({
  campaignId, scenarioTone, language, action, openingNarrative,
  protagonistName, narrativePov, writingStyle,
  maxTokens, provider, model, temperature,
  streamDeliverySpeed = 'instant',
  onChunk, onJournal, onMode, onCrystal, onPlotAuto, onInventory,
  onTruncateClean, onDone, onError,
  onPendingActionId, onRankAdvance, onChoices, onChoicesPending,
  onEntityRevealed,
}) {
  // Generate a pending ID so we can detect incomplete responses after reload
  const pendingId = `pending-${campaignId}-${Date.now()}`
  // Persist immediately (before fetch) so reload mid-stream always sees a marker — does not depend on Zustand activeCampaignId
  mergeCampaignPatch(campaignId, { pendingActionId: pendingId })
  onPendingActionId?.(pendingId)

  fetch(`${BASE}/game/action`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      campaign_id: campaignId,
      scenario_tone: scenarioTone || '',
      protagonist_name: protagonistName || '',
      narrative_pov: narrativePov || 'first_person',
      writing_style: writingStyle || 'chinh_thong',
      language: language || 'en',
      action,
      opening_narrative: openingNarrative || '',
      max_tokens: maxTokens || 2000,
      provider: provider || 'deepseek',
      model: model || 'deepseek-chat',
      temperature: temperature ?? 0.85,
      stream_delivery_speed: streamDeliverySpeed || 'instant',
    }),
  })
    .then(async (res) => {
      if (res.status === 409) {
        // Server says this campaign is already streaming a response.
        // The in-flight stream is still running — just show the streaming indicator.
        // When it completes the user will see the full response.
        onDone?.()
        return
      }
      if (!res.ok) throw new Error('Action request failed')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const handleData = (data) => {
        const control = data.trim()
        if (control === '[DONE]') { onDone?.(); return true }
        if (control.startsWith('[JOURNAL]')) { try { onJournal?.(JSON.parse(control.slice(9))) } catch {} return false }
        if (control.startsWith('[MODE]')) { onMode?.(control.slice(6)); return false }
        if (control.startsWith('[CRYSTAL]')) { try { onCrystal?.(JSON.parse(control.slice(9))) } catch {} return false }
        if (control.startsWith('[PLOT_AUTO]')) { try { onPlotAuto?.(JSON.parse(control.slice(11))) } catch {} return false }
        if (control.startsWith('[INVENTORY]')) { try { onInventory?.(JSON.parse(control.slice(11))) } catch {} return false }
        if (control.startsWith('[POWER]')) {
          try {
            const rest = control.slice(7).trim()
            if (rest.startsWith('{')) onPower?.(JSON.parse(rest))
          } catch { /* ignore */ }
          return false
        }
        if (control.startsWith('[TRUNCATE_CLEAN]')) { onTruncateClean?.(control.slice(16)); return false }
        if (control.startsWith('[RANK_ADVANCE]')) {
          try { onRankAdvance?.(JSON.parse(control.slice(13))) } catch {}
          return false
        }
        if (control === '[CHOICES_PENDING]') {
          onChoicesPending?.()
          return false
        }
        if (control.startsWith('[CHOICES]')) {
          try { onChoices?.(JSON.parse(control.slice(9))) } catch {}
          return false
        }
        if (control.startsWith('[ENTITY_REVEALED]')) {
          try { onEntityRevealed?.(JSON.parse(control.slice(16))) } catch {}
          return false
        }
        let cleaned = stripPowerControlTags(data)
        cleaned = cleaned.replace(INTERNAL_TAG_STRIP_REGEX, '')
        // Must not use trim() as the guard: LLM stream often sends spaces/newlines as
        // their own chunks; dropping them causes merged words (e.g. "mờ" + "ảo" → "mờảo").
        if (cleaned.length) onChunk?.(cleaned)
        return false
      }

      const handleEventBlock = (block) => {
        if (!block) return false
        const dataLines = []
        for (const rawLine of block.split('\n')) {
          const line = rawLine.replace(/\r$/, '')
          if (!line.startsWith('data:')) continue
          let payload = line.slice(5)
          if (payload.startsWith(' ')) payload = payload.slice(1)
          dataLines.push(payload)
        }
        if (dataLines.length === 0) return false
        return handleData(dataLines.join('\n'))
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let sepIndex = buffer.indexOf('\n\n')
        while (sepIndex !== -1) {
          if (handleEventBlock(buffer.slice(0, sepIndex))) return
          buffer = buffer.slice(sepIndex + 2)
          sepIndex = buffer.indexOf('\n\n')
        }
      }
      if (buffer && handleEventBlock(buffer)) return
      onDone?.()
    })
    .catch((err) => onError?.(err))
}

export async function rewindLastAction(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/rewind`, {
    method: 'POST',
    headers: authHeader(),
  })
  if (!r.ok) throw new Error('Failed to rewind')
  return r.json()
}

export async function fetchChoices(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/choices`, { headers: authHeader() })
  if (!r.ok) return null
  return r.json()
}

export async function fetchJournal(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/journal`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch journal')
  return r.json()
}

export async function fetchWorldGraph(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/world-graph`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch world graph')
  return r.json()
}

export async function searchWorldGraph(campaignId, query) {
  const r = await fetch(
    `${BASE}/game/${campaignId}/graph-search?q=${encodeURIComponent(query)}`,
    { headers: authHeader() }
  )
  if (!r.ok) throw new Error('Failed to search world graph')
  return r.json()
}

export async function fetchInventory(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/inventory`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch inventory')
  return r.json()
}

export async function updateInventoryItem(campaignId, name, action) {
  const r = await fetch(`${BASE}/game/${campaignId}/inventory`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, action }),
  })
  if (!r.ok) throw new Error('Failed to update inventory')
  return r.json()
}

export async function addInventoryItem(campaignId, name, category = 'misc', source = 'player') {
  const r = await fetch(`${BASE}/game/${campaignId}/inventory/add`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ name, category, source }),
  })
  if (!r.ok) throw new Error('Failed to add inventory item')
  return r.json()
}

export async function fetchMemoryCrystals(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/memory-crystals`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch memory crystals')
  return r.json()
}

export async function crystallizeMemory(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/crystallize`, {
    method: 'POST',
    headers: authHeader(),
  })
  if (!r.ok) throw new Error('Failed to crystallize')
  return r.json()
}

export async function fetchNpcMinds(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/npc-minds`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch NPC minds')
  return r.json()
}

export async function fetchCampaignPowerSystem(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/power-system`, { headers: authHeader() })
  if (!r.ok) return null
  return r.json()
}

/** Update a character's progression on one axis. */
export async function updateCharacterProgression(campaignId, payload) {
  const r = await fetch(`${BASE}/game/${campaignId}/power-system/progressions`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  })
  if (!r.ok) throw new Error('Failed to update progression')
  return r.json()
}

// DEBUG: inspect raw NPC minds and power system data
export async function debugNpcMinds(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/npc-minds/debug`, { headers: authHeader() })
  if (!r.ok) throw new Error('debug failed')
  return r.json()
}

export async function debugPowerSystem(campaignId) {
  const r = await fetch(`${BASE}/game/${campaignId}/power-system/debug`, { headers: authHeader() })
  if (!r.ok) throw new Error('debug failed')
  return r.json()
}

export async function generateContent(campaignId, type, language = 'en') {
  const r = await fetch(`${BASE}/game/${campaignId}/generate`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ type, language }),
  })
  if (!r.ok) throw new Error('Generation failed')
  return r.json()
}

export async function injectPlotContent(campaignId, type, data, language = 'en') {
  const r = await fetch(`${BASE}/game/${campaignId}/inject-plot`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ type, data, language }),
  })
  if (!r.ok) throw new Error('Inject failed')
  return r.json()
}

export async function timeskip(campaignId, seconds) {
  const r = await fetch(`${BASE}/game/${campaignId}/timeskip`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ seconds }),
  })
  if (!r.ok) throw new Error('Timeskip failed')
  return r.json()
}

// ---- Settings ----
export async function fetchSettings() {
  const r = await fetch(`${BASE}/settings`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch settings')
  return r.json()
}

export async function updateSettings(data) {
  const r = await fetch(`${BASE}/settings`, {
    method: 'POST',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!r.ok) throw new Error('Failed to update settings')
  return r.json()
}

// ---- Admin ----
export async function fetchAdminStats() {
  const r = await fetch(`${BASE}/admin/stats`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch admin stats')
  return r.json()
}

export async function fetchAdminUsers() {
  const r = await fetch(`${BASE}/admin/users`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch users')
  return r.json()
}

export async function deleteAdminUser(userId) {
  const r = await fetch(`${BASE}/admin/users/${userId}`, {
    method: 'DELETE',
    headers: authHeader(),
  })
  if (!r.ok) throw new Error('Failed to delete user')
  return r.json()
}

export async function fetchAdminUser(userId) {
  const r = await fetch(`${BASE}/admin/users/${userId}`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch user detail')
  return r.json()
}

export async function updateAdminUser(userId, data) {
  const r = await fetch(`${BASE}/admin/users/${userId}`, {
    method: 'PATCH',
    headers: authHeader({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  })
  if (!r.ok) {
    const err = await r.json().catch(() => ({}))
    throw new Error(err.detail || 'Failed to update user')
  }
  return r.json()
}

export async function deleteAdminScenario(scenarioId) {
  const r = await fetch(`${BASE}/admin/scenarios/${scenarioId}`, {
    method: 'DELETE',
    headers: authHeader(),
  })
  if (!r.ok) throw new Error('Failed to delete scenario')
  return r.json()
}

export async function deleteAdminCampaign(campaignId) {
  const r = await fetch(`${BASE}/admin/campaigns/${campaignId}`, {
    method: 'DELETE',
    headers: authHeader(),
  })
  if (!r.ok) throw new Error('Failed to delete campaign')
  return r.json()
}

export async function fetchAdminScenarios() {
  const r = await fetch(`${BASE}/admin/scenarios`, { headers: authHeader() })
  if (!r.ok) throw new Error('Failed to fetch all scenarios')
  return r.json()
}
