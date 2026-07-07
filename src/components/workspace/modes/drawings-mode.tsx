'use client'

import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { WorkspaceDrawingViewer } from '../workspace-drawing-viewer'
import { BimViewer } from '../bim-viewer'
import { Image as ImageIcon, Box, SplitSquareHorizontal, FileImage } from 'lucide-react'

export function DrawingsMode() {
  const { data, selection, selectDrawing, viewMode, setViewMode } = useWorkspace()

  if (!selection.drawing) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--color-text-muted)] mb-3">Sheets</p>
        {data.drawings.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center py-16">
            <FileImage size={28} className="text-[var(--color-text-muted)]" />
            <p className="text-sm text-[var(--color-text)]">No drawings uploaded yet</p>
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            {data.drawings.map(d => (
              <button
                key={d.id}
                onClick={() => selectDrawing(d)}
                className="text-start surface-elevated rounded-[var(--radius-lg)] border border-[var(--color-border)] p-3 hover:border-[var(--color-border-strong)] transition-colors"
              >
                <div className="w-full aspect-[4/3] rounded-[var(--radius-md)] bg-[var(--color-surface-sunken)] flex items-center justify-center mb-2 text-[var(--color-text-muted)]">
                  <FileImage size={22} />
                </div>
                <div className="text-[12px] font-medium text-[var(--color-text)] truncate">{d.name}</div>
                <div className="text-[10px] text-[var(--color-text-muted)] mt-0.5 font-mono uppercase">Rev {d.revision_number ?? '—'} · {d.file_type}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)] shrink-0">
        <button onClick={() => selectDrawing(null)} className="text-[11px] text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          ← All sheets
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
