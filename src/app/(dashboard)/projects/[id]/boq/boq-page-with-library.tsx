'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import BOQSpreadsheet from './boq-spreadsheet'
import { LibraryPanel } from '@/components/boq/library-panel'
import type { LibraryItem } from '@/components/boq/library-panel'

interface BOQItem {
  id: string
  project_id: string
  item_code: string | null
  description: string | null
  unit: string | null
  quantity: number | null
  unit_rate: number | null
  total_amount: number | null
  vat_percent: number | null
  vat_amount: number | null
  is_section_header: boolean | null
  sort_order: number | null
  category: string | null
  notes: string | null
}

interface Props {
  projectId: string
  projectName: string
  initialItems: BOQItem[]
  libraryItems: LibraryItem[]
}

const PANEL_VISIBLE_KEY = 'boq_library_panel_visible'
const DEFAULT_PANEL_WIDTH = 320

export default function BOQPageWithLibrary({ projectId, projectName, initialItems, libraryItems }: Props) {
  const [panelVisible, setPanelVisible] = useState(true)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const resizing = useRef(false)
  const startX = useRef(0)
  const startWidth = useRef(DEFAULT_PANEL_WIDTH)

  // Registered handler from BOQSpreadsheet
  const insertHandlerRef = useRef<((item: LibraryItem) => Promise<void>) | null>(null)

  const registerHandler = useCallback((handler: (item: LibraryItem) => Promise<void>) => {
    insertHandlerRef.current = handler
  }, [])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(PANEL_VISIBLE_KEY)
      if (stored !== null) setPanelVisible(stored === 'true')
    } catch { /* ignore */ }
  }, [])

  function togglePanel() {
    setPanelVisible(prev => {
      const next = !prev
      try { localStorage.setItem(PANEL_VISIBLE_KEY, String(next)) } catch { /* ignore */ }
      return next
    })
  }

  function handleResizeMouseDown(e: React.MouseEvent) {
    resizing.current = true
    startX.current = e.clientX
    startWidth.current = panelWidth
    e.preventDefault()
  }

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!resizing.current) return
      const delta = startX.current - e.clientX
      const newWidth = Math.max(220, Math.min(500, startWidth.current + delta))
      setPanelWidth(newWidth)
    }
    function onMouseUp() {
      resizing.current = false
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  async function handleInsertItem(item: LibraryItem) {
    if (insertHandlerRef.current) {
      await insertHandlerRef.current(item)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toggle button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={togglePanel}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          {panelVisible ? 'Hide Library' : 'Show Library'}
        </button>
      </div>

      {/* Split pane */}
      <div className="flex flex-1 min-h-0 gap-0 overflow-hidden">
        {/* BOQ Spreadsheet */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <BOQSpreadsheet
            initialItems={initialItems}
            projectId={projectId}
            projectName={projectName}
            onInsertFromLibrary={registerHandler}
          />
        </div>

        {panelVisible && (
          <>
            {/* Resize handle */}
            <div
              onMouseDown={handleResizeMouseDown}
              className="w-1 cursor-col-resize bg-slate-200 hover:bg-amber-400 transition-colors shrink-0 select-none"
            />

            {/* Library panel */}
            <div style={{ width: panelWidth }} className="shrink-0 min-h-0 overflow-hidden flex flex-col">
              <LibraryPanel
                projectId={projectId}
                items={libraryItems}
                onInsertItem={handleInsertItem}
              />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
