import { useEffect, useRef } from 'react'

// Generic modal with backdrop, close on Escape, close on backdrop click
export default function Modal({ open, onClose, title, icon: Icon, children, size = 'md', className = '' }) {
  const dialogRef = useRef(null)

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, onClose])

  // Focus trap
  useEffect(() => {
    if (open) {
      dialogRef.current?.focus()
    }
  }, [open])

  if (!open) return null

  const sizeClasses = {
    sm:  'max-w-sm',
    md:  'max-w-md',
    lg:  'max-w-lg',
    xl:  'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-[calc(100vw-2rem)]',
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`
          relative z-10
          w-full ${sizeClasses[size] || sizeClasses.md}
          bg-[var(--bg-surface)] border border-[var(--border-default)]
          rounded-2xl shadow-[var(--shadow-xl)]
          max-h-[90vh] flex flex-col
          animate-scale-in
          ${className}
        `}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)] flex-none">
            <div className="flex items-center gap-3">
              {Icon && <Icon size={16} className="text-[var(--text-secondary)]" />}
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="
                flex items-center justify-center w-7 h-7 rounded-lg
                text-[var(--text-tertiary)] hover:text-[var(--text-primary)]
                hover:bg-[var(--accent-muted)]
                transition-all duration-150
              "
              aria-label="Close"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}
