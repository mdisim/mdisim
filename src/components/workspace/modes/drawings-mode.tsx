'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { WorkspaceDrawingViewer } from '../workspace-drawing-viewer'
import { BimViewer } from '../bim-viewer'
import { DrawingPicker } from './drawing-picker'
import { DrawingIntelligence } from '@/components/drawings/drawing-intelligence'
import { Image as ImageIcon, Box, SplitSquareHorizontal, ChevronLeft, ChevronDown, ChevronRight, Brain } from 'lucide-react'

export function DrawingsMode({ projectId }: { projectId: string }) {
  const { data, selection, selectDrawing, viewMode, setViewMode } = useWorkspace()
  const [showIntelligence, setShowIntelligence] = useState(false)

  if (!selection.drawing) {
    return (
      <DrawingPicker
        drawings={data.drawings}
        projectId={projectId}
        eyebrow="Sheets"
        emptyTitle="No drawings uploaded yet"
        onSelect={selectDrawing}
        footer={data.drawings.length > 0 ? (
          <div>
            <button
              onClick={() => setShowIntelligence(v => !v)}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 w-full rounded-[var(--radius-lg)] border transition-all',
                showIntelligence
                  ? 'border-[var(--color-intel)]/40 bg-[var(--color-intel-tint)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface-elevated)] hover:border-[var(--color-intel)]/30'
              )}
            >
              {showIntelligence
                ? <ChevronDown size={15} className="text-[var(--color-intel)] shrink-0" />
                : <ChevronRight size={15} className="text-[var(--color-intel)] shrink-0" />
              }
              <Brain size={16} className="text-[var(--color-intel)] shrink-0" />
              <span className="text-[13px] font-semibold text-[var(--color-text)]">Drawing Intelligence</span>
              <span className="text-[12px] text-[var(--color-text-muted)] hidden sm:inline">— Quantity change detection &amp; auto-update suggestions</span>
            </button>
            {showIntelligence && (
              <div className="mt-2 rounded-[var(--radius-lg)] border border-[var(--color-intel)]/20 bg-[var(--color-surface-elevated)] overflow-hidden p-4">
                <DrawingIntelligence projectId={projectId} drawings={data.drawings} />
              </div>
            )}
          </div>
        ) : undefined}
      />
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)] shrink-0">
        <button onClick={() => selectDrawing(null)} className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors focus-ring rounded-[var(--radius-sm)]">
          <ChevronLeft size={13} /> All sheets
        </button>
        <div className="flex items-center bg-[var(--color-surface-sunken)] rounded-[var(--radius-md)] p-0.5">
          {[
            { mode: '2d' as const, icon: ImageIcon, label: '2D' },
            { mode: '3d' as const, icon: Box, label: '3D' },
            { mode: 'split' as const, icon: SplitSquareHorizontal, label: 'Split' },
          ].map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                'flex items-center gap-1 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-[var(--radius-sm)] transition-all',
                viewMode === mode ? 'bg-[var(--color-brand)] text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
              )}
            >
              <Icon size={10} />
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {viewMode === '2d' && <WorkspaceDrawingViewer />}
        {viewMode === '3d' && <BimViewer />}
        {viewMode === 'split' && (
          <div className="flex h-full">
            <div className="flex-1 overflow-hidden border-e border-[var(--color-border)]"><WorkspaceDrawingViewer /></div>
            <div className="flex-1 overflow-hidden"><BimViewer /></div>
          </div>
        )}
      </div>
    </div>
  )
}
