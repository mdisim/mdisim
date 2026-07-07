import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface ChipProps {
  children: ReactNode
  color?: string
  className?: string
}

/** A small coloured pill for statuses, categories and resource types — the one place a raw hex/token pair is allowed inline, since the palette is data-driven (tag colors, semantic status). */
export function Chip({ children, color = 'var(--color-text-muted)', className }: ChipProps) {
  return (
    <span
      className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10.5px] font-semibold leading-none', className)}
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      {children}
    </span>
  )
}
