/** Merge a patch into lunar_campaigns[campaignId] without touching other keys. */
const KEY = 'lunar_campaigns'

export function mergeCampaignPatch(campaignId, patch) {
  if (!campaignId || !patch || typeof patch !== 'object') return
  try {
    const all = JSON.parse(localStorage.getItem(KEY) || '{}')
    all[campaignId] = { ...(all[campaignId] || {}), ...patch }
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {}
}
