'use client'

import { cn } from '@/lib/utils'
import { useEffect, useRef, useState, useCallback, MouseEvent as ReactMouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'

export interface ContextMenuItem {
  label: string
  icon?: ReactNode
  shortcut?: string
  danger?: boolean
  disabled?: boolean
  onSelect: () => void
}

export type ContextMenuEntry = ContextMenuItem | 'separator'

interface Position { x: number; y: number }

/** Bind the returned `onContextMenu` to any element's right-click to drive a <ContextMenu>. */
export function useContextMenu() {
  const [position, setPosition] = useState<Position | null>(null)

  const open = useCallback((e: ReactMouseEvent) => {
    e.preventDefault()
    setPosition({ x: e.clientX, y: e.clientY })
  }, [])

  const close = useCallback(() => setPosition(null), [])

  return { position, onContextMenu: open, close }
}

export function ContextMenu({
  position, onClose, items,
}: { position: Position | null; onClose: () => void; items: ContextMenuEntry[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [adjusted, setAdjusted] = useState<Position | null>(null)

  useEffect(() => {
    if (!position) { setAdjusted(null); return }
    setAdjusted(position)
  }, [position])

  useEffect(() => {
    if (!position) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    document.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('scroll', onClose, true)
    }
  }, [position, onClose])

  useEffect(() => {
    if (!position || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = Math.min(position.x, window.innerWidth - rect.width - 8)
    const y = Math.min(position.y, window.innerHeight - rect.height - 8)
    setAdjusted({ x, y })
  }, [position])

  if (!position || !adjusted || typeof document === 'undefined') return null

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ position: 'fixed', top: adjusted.y, left: adjusted.x }}
      className="z-[var(--z-popover)] min-w-[200px] py-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-dropdown)] animate-scale-in"
    >
      {items.map((item, i) =>
        item === 'separator' ? (
          <div key={i} className="my-1 h-px bg-[var(--color-border)]" />
        ) : (
          <button
            key={item.label}
            type="button"
            role="menuitem"
            disabled={item.disabled}
            onClick={() => { item.onSelect(); onClose() }}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-start transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
              item.danger
                ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]'
                : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
            )}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.shortcut && <span className="text-[11px] font-mono text-[var(--color-text-muted)]">{item.shortcut}</span>}
          </button>
        )
      )}
    </div>,
    document.body
  )
}
