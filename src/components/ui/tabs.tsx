'use client'

import { cn } from '@/lib/utils'
import { createContext, useContext, useId, ReactNode, KeyboardEvent } from 'react'

interface TabsContextValue {
  value: string
  setValue: (v: string) => void
  name: string
}

const TabsContext = createContext<TabsContextValue | null>(null)

function useTabsContext() {
  const ctx = useContext(TabsContext)
  if (!ctx) throw new Error('Tabs.* must be used within <Tabs>')
  return ctx
}

interface TabsProps {
  value: string
  onValueChange: (v: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ value, onValueChange, children, className }: TabsProps) {
  const name = useId()
  return (
    <TabsContext.Provider value={{ value, setValue: onValueChange, name }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn('flex items-stretch gap-0.5 overflow-x-auto', className)}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  value: string
  children: ReactNode
  className?: string
  icon?: ReactNode
  hint?: string
}

export function TabsTrigger({ value, children, className, icon, hint }: TabsTriggerProps) {
  const { value: active, setValue } = useTabsContext()
  const selected = active === value

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const list = (e.currentTarget.parentElement?.children ?? []) as HTMLCollectionOf<HTMLButtonElement>
    const idx = Array.from(list).indexOf(e.currentTarget)
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = list[(idx + 1) % list.length]
      next?.focus()
      next?.click()
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault()
      const prev = list[(idx - 1 + list.length) % list.length]
      prev?.focus()
      prev?.click()
    }
  }

  return (
    <button
      role="tab"
      type="button"
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      title={hint}
      onClick={() => setValue(value)}
      onKeyDown={onKeyDown}
      className={cn(
        'relative flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium whitespace-nowrap transition-colors focus:outline-none',
        selected
          ? 'text-[var(--color-text)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
        className
      )}
    >
      {icon}
      {children}
      <span
        className={cn(
          'absolute inset-x-2 -bottom-px h-[2px] rounded-full transition-colors',
          selected ? 'bg-[var(--color-brand)]' : 'bg-transparent'
        )}
      />
    </button>
  )
}

export function TabsPanel({ value, children, className }: { value: string; children: ReactNode; className?: string }) {
  const { value: active } = useTabsContext()
  if (active !== value) return null
  return (
    <div role="tabpanel" className={className}>
      {children}
    </div>
  )
}
