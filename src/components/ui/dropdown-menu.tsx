'use client'

import { cn } from '@/lib/utils'
import {
  createContext, useContext, useEffect, useRef, useState,
  ReactNode, MouseEvent as ReactMouseEvent, useId,
} from 'react'
import { createPortal } from 'react-dom'

interface Rect { top: number; left: number; right: number; bottom: number; width: number }

interface DropdownContextValue {
  open: boolean
  setOpen: (v: boolean) => void
  triggerRect: Rect | null
  setTriggerRect: (r: Rect | null) => void
  menuId: string
}

const DropdownContext = createContext<DropdownContextValue | null>(null)

export function DropdownMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [triggerRect, setTriggerRect] = useState<Rect | null>(null)
  const menuId = useId()
  return (
    <DropdownContext.Provider value={{ open, setOpen, triggerRect, setTriggerRect, menuId }}>
      <div className="relative inline-block">{children}</div>
    </DropdownContext.Provider>
  )
}

function useDropdown() {
  const ctx = useContext(DropdownContext)
  if (!ctx) throw new Error('DropdownMenu.* must be used within <DropdownMenu>')
  return ctx
}

export function DropdownMenuTrigger({ children, asChild }: { children: ReactNode; asChild?: boolean }) {
  const { open, setOpen, setTriggerRect, menuId } = useDropdown()
  const ref = useRef<HTMLButtonElement>(null)

  const toggle = () => {
    if (!open && ref.current) {
      const r = ref.current.getBoundingClientRect()
      setTriggerRect({ top: r.top, left: r.left, right: r.right, bottom: r.bottom, width: r.width })
    }
    setOpen(!open)
  }

  if (asChild) {
    return (
      <span onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-controls={menuId}>
        {children}
      </span>
    )
  }

  return (
    <button
      ref={ref}
      type="button"
      onClick={toggle}
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={menuId}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]"
    >
      {children}
    </button>
  )
}

export function DropdownMenuContent({
  children, align = 'start', className,
}: { children: ReactNode; align?: 'start' | 'end'; className?: string }) {
  const { open, setOpen, triggerRect, menuId } = useDropdown()
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, setOpen])

  if (!open || !triggerRect || typeof document === 'undefined') return null

  const style: React.CSSProperties = {
    position: 'fixed',
    top: triggerRect.bottom + 6,
    ...(align === 'start' ? { left: triggerRect.left } : { left: triggerRect.right, transform: 'translateX(-100%)' }),
  }

  return createPortal(
    <div
      ref={ref}
      id={menuId}
      role="menu"
      style={style}
      className={cn(
        'z-[var(--z-popover)] min-w-[180px] py-1 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[var(--shadow-dropdown)] animate-scale-in',
        className
      )}
    >
      {children}
    </div>,
    document.body
  )
}

export function DropdownMenuItem({
  children, onSelect, danger, icon, disabled,
}: { children: ReactNode; onSelect?: () => void; danger?: boolean; icon?: ReactNode; disabled?: boolean }) {
  const { setOpen } = useDropdown()
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e: ReactMouseEvent) => { e.stopPropagation(); onSelect?.(); setOpen(false) }}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-1.5 text-[13px] text-start transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
        danger
          ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger-tint)]'
          : 'text-[var(--color-text)] hover:bg-[var(--color-surface-hover)]'
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function DropdownMenuSeparator() {
  return <div className="my-1 h-px bg-[var(--color-border)]" />
}

export function DropdownMenuLabel({ children }: { children: ReactNode }) {
  return <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{children}</div>
}
