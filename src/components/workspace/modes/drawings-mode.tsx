'use client'

import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { WorkspaceDrawingViewer } from '../workspace-drawing-viewer'
import { BimViewer } from '../bim-viewer'
import { DrawingPicker } from './drawing-picker'
import { Image as ImageIcon, Box, SplitSquareHorizontal, ChevronLeft } from 'lucide-react'

export function DrawingsMode({ projectId }: { projectId: string }) {
  const { data, selection, selectDrawing, viewMode, setViewMode } = useWorkspace()

  if (!selection.drawing) {
    return (
      <DrawingPicker
        drawings={data.drawings}
        projectId={projectId}
        eyebrow="Sheets"
        emptyTitle="No drawings uploaded yet"
        onSelect={selectDrawing}
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
