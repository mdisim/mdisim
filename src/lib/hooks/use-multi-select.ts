'use client'

import { useCallback, useState } from 'react'

/**
 * The one multi-select behavior used everywhere a grid has rows: click
 * selects one, Cmd/Ctrl+click toggles a row in or out, Shift+click extends
 * a contiguous range from the last-clicked row — the same three rules a
 * file manager or spreadsheet already trained everyone on.
 */
export function useMultiSelect<T extends string>(orderedIds: T[]) {
  const [selected, setSelected] = useState<Set<T>>(new Set())
  const [anchor, setAnchor] = useState<T | null>(null)

  const click = useCallback((id: T, e: { metaKey: boolean; ctrlKey: boolean; shiftKey: boolean }) => {
    if (e.shiftKey && anchor) {
      const from = orderedIds.indexOf(anchor)
      const to = orderedIds.indexOf(id)
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from < to ? [from, to] : [to, from]
        setSelected(new Set(orderedIds.slice(lo, hi + 1)))
        return
      }
    }
    if (e.metaKey || e.ctrlKey) {
      setSelected(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
      setAnchor(id)
      return
    }
    setSelected(new Set([id]))
    setAnchor(id)
  }, [anchor, orderedIds])

  const clear = useCallback(() => { setSelected(new Set()); setAnchor(null) }, [])
  const isSelected = useCallback((id: T) => selected.has(id), [selected])

  // Lets a plain click (which drives single-select elsewhere, not the bulk
  // set) still leave a breadcrumb so a later Shift+click has an anchor to
  // range from — otherwise "click A, shift-click C" has nothing to extend.
  const setAnchorOnly = useCallback((id: T) => setAnchor(id), [])

  return { selected, count: selected.size, click, clear, isSelected, setAnchorOnly }
}
