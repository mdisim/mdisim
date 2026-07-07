'use client'

import { useEffect } from 'react'

export interface ShortcutBinding {
  key: string
  meta?: boolean
  shift?: boolean
  alt?: boolean
  handler: (e: KeyboardEvent) => void
  /** Skip when focus is inside an editable field (default true). */
  allowInInputs?: boolean
}

function isEditableTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}

/** Registers a set of keyboard shortcuts for the lifetime of the calling component. */
export function useKeyboardShortcuts(bindings: ShortcutBinding[], deps: unknown[] = []) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const b of bindings) {
        const metaOk = b.meta ? (e.metaKey || e.ctrlKey) : !(e.metaKey || e.ctrlKey)
        const shiftOk = b.shift ? e.shiftKey : !e.shiftKey
        const altOk = b.alt ? e.altKey : !e.altKey
        if (e.key.toLowerCase() !== b.key.toLowerCase() || !metaOk || !shiftOk || !altOk) continue
        if (isEditableTarget(e.target) && b.allowInInputs !== true) continue
        e.preventDefault()
        b.handler(e)
        return
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}
