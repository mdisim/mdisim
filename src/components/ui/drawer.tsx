'use client'

import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect } from 'react'

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  side?: 'start' | 'end' | 'bottom'
  className?: string
  widthClassName?: string
}

/** Slide-in panel — used for mobile inspectors, filters, and secondary panels that don't warrant a full dialog. */
export function Drawer({ isOpen, onClose, title, children, side = 'end', className, widthClassName = 'w-[min(420px,100vw)]' }: DrawerProps) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const isBottom = side === 'bottom'
  const sidePos = side === 'start' ? 'inset-y-0 start-0' : side === 'end' ? 'inset-y-0 end-0' : 'inset-x-0 bottom-0'
  const enterAnim = side === 'start' ? 'animate-slide-in-left' : side === 'end' ? 'animate-slide-in-right' : 'animate-slide-in-down'

  return (
    <div className="fixed inset-0 z-[var(--z-drawer)]" role="dialog" aria-modal="true" aria-label={title ?? 'Panel'}>
      <div className="absolute inset-0 bg-[var(--color-surface-overlay)]" onClick={onClose} aria-hidden="true" />
      <div
        className={cn(
          'absolute flex flex-col bg-[var(--color-surface-elevated)] border-[var(--color-border)] shadow-[var(--shadow-xl)]',
          sidePos,
          enterAnim,
          isBottom ? 'max-h-[85vh] rounded-t-[var(--radius-2xl)] border-t' : cn(widthClassName, 'border-s'),
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] shrink-0">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">{title}</h2>
            <button onClick={onClose} aria-label="Close" title="Close (Esc)" className="p-1.5 rounded-[var(--radius-sm)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
              <X size={16} />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
