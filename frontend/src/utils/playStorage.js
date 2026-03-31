/** Synchronous read of one campaign blob from lunar_campaigns (Play mount initializer). */
export function readCampaignFromStorage(campaignId) {
  try {
    const raw = localStorage.getItem('lunar_campaigns')
    if (!raw) return {}
    const all = JSON.parse(raw)
    return all[campaignId] || {}
  } catch {
    return {}
  }
}
