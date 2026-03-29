import { useState, useEffect } from 'react'
import { fetchInventory, updateInventoryItem } from '../../api'
import Modal from '../UI/Modal'

const CATEGORY_ICONS = {
  weapon: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 17.5L3 6V3h3l11.5 11.5" /><path d="M13 19l6-6" /><path d="M16 16l4 4" /><path d="M19 21l2-2" /></svg>,
  armor: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
  consumable: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2v7.31" /><path d="M14 9.3V1.99" /><path d="M8.5 2h7" /><path d="M14 9.3a6.5 6.5 0 1 1-4 0" /></svg>,
  quest: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" /></svg>,
  tool: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" /></svg>,
  misc: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>,
}

const CATEGORY_COLORS = {
  weapon: 'text-rose-400',
  armor: 'text-blue-400',
  consumable: 'text-emerald-400',
  quest: 'text-amber-400',
  tool: 'text-purple-400',
  misc: 'text-[var(--text-tertiary)]',
}

export default function InventoryPanel({ open, onClose, campaignId, inventory = [], setInventory }) {
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && campaignId) {
      setLoading(true)
      fetchInventory(campaignId)
        .then(setInventory)
        .catch(() => {})
        .finally(() => setLoading(false))
    }
  }, [open, campaignId])

  const handleAction = async (name, action) => {
    await updateInventoryItem(campaignId, name, action)
    const updated = await fetchInventory(campaignId)
    setInventory(updated)
  }

  const carriedItems = inventory.filter((i) => i.status === 'carried')
  const expiredItems = inventory.filter((i) => i.status !== 'carried')

  const ItemRow = ({ item, isActive }) => {
    const Icon = CATEGORY_ICONS[item.category] || CATEGORY_ICONS.misc
    const colorClass = CATEGORY_COLORS[item.category] || CATEGORY_COLORS.misc
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--accent-muted)] transition-colors">
        <span className={colorClass}><Icon /></span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--text-primary)] truncate">{item.name}</p>
          <p className="text-xs text-[var(--text-tertiary)] truncate">{item.source || item.category}</p>
        </div>
        {isActive && (
          <div className="flex gap-1.5 flex-shrink-0">
            <button
              onClick={() => handleAction(item.name, 'use')}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[var(--warning-muted)] text-[var(--warning)] border border-[rgba(251,191,36,0.2)] hover:bg-[rgba(251,191,36,0.15)] transition-colors"
            >
              Use
            </button>
            <button
              onClick={() => handleAction(item.name, 'discard')}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[var(--error-muted)] text-[var(--error)] border border-[rgba(248,113,113,0.2)] hover:bg-[rgba(248,113,113,0.15)] transition-colors"
            >
              Drop
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Hành Trang" size="md">
      <div className="p-4 space-y-4">
        {loading && <p className="text-center text-[var(--text-tertiary)] text-sm py-8">{`Đang tải...`}</p>}

        {!loading && inventory.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[var(--text-tertiary)] text-sm">{`Chưa có vật phẩm nào.`}</p>
          </div>
        )}

        {carriedItems.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2 px-1">{`Đang Mang`}</p>
            <div className="space-y-1.5">
              {carriedItems.map((item) => (
                <ItemRow key={item.name} item={item} isActive />
              ))}
            </div>
          </div>
        )}

        {expiredItems.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-tertiary)] mb-2 px-1">{`Đã Dùng / Đã Mất`}</p>
            <div className="space-y-1.5">
              {expiredItems.map((item) => (
                <ItemRow key={item.name} item={item} isActive={false} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
