'use client'

import { cn } from '@/lib/utils'
import { ReactNode, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: ReactNode
  children: ReactNode
  side?: 'top' | 'bottom' | 'start' | 'end'
  className?: string
}

/** Lightweight hover tooltip. For simple cases prefer the native `title` attribute — reach for this when you need rich content or reliable positioning near panel edges. */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLSpanElement>(null)

  const show = () => {
    if (ref.current) setRect(ref.current.getBoundingClientRect())
    setVisible(true)
  }

  const positions: Record<string, React.CSSProperties> = rect ? {
    top: { top: rect.top - 8, left: rect.left + rect.width / 2, transform: 'translate(-50%, -100%)' },
    bottom: { top: rect.bottom + 8, left: rect.left + rect.width / 2, transform: 'translate(-50%, 0)' },
    start: { top: rect.top + rect.height / 2, left: rect.left - 8, transform: 'translate(-100%, -50%)' },
    end: { top: rect.top + rect.height / 2, left: rect.right + 8, transform: 'translate(0, -50%)' },
  } : {}

  return (
    <span
      ref={ref}
      className="inline-flex"
      onMouseEnter={show}
      onMouseLeave={() => setVisible(false)}
      onFocus={show}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && rect && typeof document !== 'undefined' && createPortal(
        <div
          role="tooltip"
          style={{ position: 'fixed', ...positions[side] }}
          className={cn(
            'z-[var(--z-tooltip)] px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium whitespace-nowrap pointer-events-none',
            'bg-[var(--color-text)] text-[var(--background)] shadow-[var(--shadow-md)] animate-fade-in',
            className
          )}
        >
          {content}
        </div>,
        document.body
      )}
    </span>
  )
}
