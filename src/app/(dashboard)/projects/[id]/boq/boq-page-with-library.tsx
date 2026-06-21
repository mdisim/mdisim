'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ChevronRight, ChevronLeft, X, BookOpen } from 'lucide-react'
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
  const [mobileLibraryOpen, setMobileLibraryOpen] = useState(false)
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
    <div className="flex flex-col h-full min-h-0">
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

        {/* Desktop library panel */}
        {panelVisible && (
          <>
            <div
              onMouseDown={handleResizeMouseDown}
              className="w-1.5 cursor-col-resize bg-slate-200 hover:bg-blue-400 transition-colors shrink-0 select-none hidden md:block"
            />
            <div style={{ width: panelWidth }} className="shrink-0 min-h-0 overflow-hidden flex-col hidden md:flex border-l border-slate-200">
              <LibraryPanel
                projectId={projectId}
                items={libraryItems}
                onInsertItem={handleInsertItem}
              />
            </div>
          </>
        )}
      </div>

      {/* Desktop toggle button - fixed position on the right edge */}
      <button
        onClick={togglePanel}
        className="hidden md:flex fixed right-0 top-1/2 -translate-y-1/2 z-30 bg-white border border-slate-200 border-r-0 rounded-l-lg px-1.5 py-3 shadow-md hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-colors"
        title={panelVisible ? 'Hide Library' : 'Show Library'}
      >
        {panelVisible ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Mobile library overlay */}
      {mobileLibraryOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileLibraryOpen(false)} />
          <div className="absolute inset-y-0 right-0 w-[85vw] max-w-[400px] bg-white shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="text-sm font-bold text-slate-800">BOQ Library</span>
              <button onClick={() => setMobileLibraryOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                <X size={18} />
              </button>
            </div>
            <div className="h-[calc(100%-52px)] overflow-hidden">
              <LibraryPanel
                projectId={projectId}
                items={libraryItems}
                onInsertItem={handleInsertItem}
              />
            </div>
          </div>
        </div>
      )}

      {/* Mobile FAB to open library */}
      <button
        onClick={() => setMobileLibraryOpen(true)}
        className="md:hidden fixed bottom-20 right-4 z-40 w-12 h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center"
      >
        <BookOpen size={20} />
      </button>
    </div>
  )
}
