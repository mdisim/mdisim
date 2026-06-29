'use client'

import React, { useState, useCallback, useMemo } from 'react'
import {
  Ruler,
  Spline,
  Pentagon,
  Square,
  Circle,
  Hash,
  ChevronDown,
  ChevronRight,
  Trash2,
  Link2,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TakeoffMeasurement } from '@/lib/takeoff/renderer'

interface MeasurementListProps {
  measurements: TakeoffMeasurement[]
  activeMeasurementId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onLabelChange: (id: string, label: string) => void
  onLinkToBOQ?: (measurementIds: string[]) => void
  scale?: { px_per_unit: number; unit: string } | null
  selectedIds?: string[]
}

const TOOL_META: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string; unitType: 'length' | 'area' | 'count' }> = {
  line: { icon: Ruler, label: 'Lines', unitType: 'length' },
  polyline: { icon: Spline, label: 'Polylines', unitType: 'length' },
  area: { icon: Pentagon, label: 'Areas', unitType: 'area' },
  rectangle: { icon: Square, label: 'Rectangles', unitType: 'area' },
  circle: { icon: Circle, label: 'Circles', unitType: 'area' },
  count: { icon: Hash, label: 'Counts', unitType: 'count' },
}

function formatQty(m: TakeoffMeasurement): string {
  if (m.tool_type === 'count') return m.quantity.toString()
  return m.quantity % 1 === 0 ? m.quantity.toString() : m.quantity.toFixed(2)
}

function groupTotal(items: TakeoffMeasurement[]): number {
  return items.reduce((s, m) => s + m.quantity, 0)
}

export const MeasurementList = React.memo(function MeasurementList({
  measurements,
  activeMeasurementId,
  onSelect,
  onDelete,
  onLabelChange,
  onLinkToBOQ,
  scale,
  selectedIds: externalSelectedIds,
}: MeasurementListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; id: string } | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set())
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const selectedIds = externalSelectedIds ? new Set(externalSelectedIds) : internalSelectedIds
  const setSelectedIds = externalSelectedIds ? (() => {}) as typeof setInternalSelectedIds : setInternalSelectedIds

  const groups = useMemo(() => measurements.reduce<Record<string, TakeoffMeasurement[]>>((acc, m) => {
    const key = m.tool_type
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {}), [measurements])

  const totalCount = measurements.length
  const { totalLengths, totalAreas, totalCounts } = useMemo(() => {
    let lengths = 0, areas = 0, counts = 0
    for (const m of measurements) {
      if (m.tool_type === 'line' || m.tool_type === 'polyline') lengths += m.quantity
      else if (m.tool_type === 'area' || m.tool_type === 'rectangle' || m.tool_type === 'circle') areas += m.quantity
      else if (m.tool_type === 'count') counts += m.quantity
    }
    return { totalLengths: lengths, totalAreas: areas, totalCounts: counts }
  }, [measurements])

  const startEdit = (m: TakeoffMeasurement) => {
    setEditingId(m.id)
    setEditValue(m.label ?? '')
  }

  const commitEdit = (id: string) => {
    onLabelChange(id, editValue)
    setEditingId(null)
  }

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [setSelectedIds])

  const selectAll = useCallback(() => {
    if (selectedIds.size === measurements.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(measurements.map(m => m.id)))
    }
  }, [measurements, selectedIds.size])

  return (
    <div className="flex flex-col h-full">
      {/* Multi-select toggle (header is shown by parent) */}
      {measurements.length > 0 && !externalSelectedIds && (
        <div className="px-3 py-1 border-b border-slate-100 dark:border-slate-700/50 flex items-center justify-end">
          <button
            onClick={() => {
              setMultiSelectMode(v => !v)
              if (multiSelectMode) setSelectedIds(new Set())
            }}
            className={cn(
              'p-1 rounded text-xs transition-colors',
              multiSelectMode
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
            )}
            title="Multi-select mode"
          >
            <Check size={14} />
          </button>
        </div>
      )}

      {/* Multi-select toolbar */}
      {multiSelectMode && (
        <div className="px-3 py-1.5 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2 bg-blue-50/50 dark:bg-blue-900/10">
          <button
            onClick={selectAll}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {selectedIds.size === measurements.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-xs text-slate-400">
            {selectedIds.size} selected
          </span>
          {selectedIds.size > 0 && onLinkToBOQ && (
            <button
              onClick={() => {
                onLinkToBOQ(Array.from(selectedIds))
                setSelectedIds(new Set())
                setMultiSelectMode(false)
              }}
              className="ml-auto flex items-center gap-1 px-2 py-1 text-xs font-medium bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
            >
              <Link2 size={12} />
              Link to BOQ
            </button>
          )}
          {selectedIds.size > 0 && (
            <button
              onClick={() => {
                selectedIds.forEach(id => onDelete(id))
                setSelectedIds(new Set())
              }}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groups).map(([toolType, items]) => {
          const meta = TOOL_META[toolType] ?? { icon: Ruler, label: toolType, unitType: 'length' as const }
          const Icon = meta.icon
          const isCollapsed = collapsed[toolType] ?? false
          const total = groupTotal(items)
          const unitLabel = items[0]?.unit ?? 'px'

          return (
            <div key={toolType}>
              <button
                onClick={() => setCollapsed((p) => ({ ...p, [toolType]: !isCollapsed }))}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <Icon size={14} />
                <span>{meta.label}</span>
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-slate-400">{items.length}</span>
                  {!isCollapsed && meta.unitType !== 'count' && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Σ {total.toFixed(2)} {unitLabel}
                    </span>
                  )}
                  {!isCollapsed && meta.unitType === 'count' && (
                    <span className="text-[10px] font-mono text-slate-400">
                      Σ {total}
                    </span>
                  )}
                </span>
              </button>

              {!isCollapsed &&
                items.map((m, idx) => {
                  const active = m.id === activeMeasurementId
                  const selected = selectedIds.has(m.id)

                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        if (multiSelectMode) toggleSelect(m.id)
                        else onSelect(m.id)
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault()
                        setContextMenu({ x: e.clientX, y: e.clientY, id: m.id })
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors group',
                        active && !multiSelectMode
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : selected
                          ? 'bg-blue-50/80 dark:bg-blue-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-750',
                      )}
                    >
                      {multiSelectMode && (
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(m.id)}
                          onClick={e => e.stopPropagation()}
                          className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      )}

                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: m.color ?? '#3B82F6' }}
                      />

                      {editingId === m.id ? (
                        <input
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={() => commitEdit(m.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(m.id)
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          className="flex-1 min-w-0 bg-transparent border-b border-blue-400 text-sm outline-none text-slate-700 dark:text-slate-200"
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            startEdit(m)
                          }}
                          className="flex-1 min-w-0 truncate text-slate-700 dark:text-slate-200"
                        >
                          {m.label || `${meta.label.slice(0, -1)} ${idx + 1}`}
                        </span>
                      )}

                      <span className="text-xs text-slate-400 whitespace-nowrap tabular-nums">
                        {formatQty(m)} {m.unit ?? 'px'}
                      </span>

                      {!multiSelectMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onDelete(m.id)
                          }}
                          className="p-0.5 rounded text-slate-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                          style={{ opacity: active ? 1 : undefined }}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          )
        })}

        {measurements.length === 0 && (
          <div className="px-3 py-8 text-center text-sm text-slate-400">
            No measurements yet. Select a tool and click on the drawing.
          </div>
        )}
      </div>

      {/* Summary */}
      {measurements.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
          <div className="flex justify-between">
            <span>Total</span>
            <span className="font-medium">{totalCount} measurement{totalCount !== 1 ? 's' : ''}</span>
          </div>
          {totalLengths > 0 && (
            <div className="flex justify-between">
              <span>Lengths</span>
              <span className="font-medium tabular-nums">{totalLengths.toFixed(2)} {measurements.find(m => m.tool_type === 'line')?.unit ?? 'px'}</span>
            </div>
          )}
          {totalAreas > 0 && (
            <div className="flex justify-between">
              <span>Areas</span>
              <span className="font-medium tabular-nums">{totalAreas.toFixed(2)} {measurements.find(m => m.tool_type === 'area')?.unit ?? 'px²'}</span>
            </div>
          )}
          {totalCounts > 0 && (
            <div className="flex justify-between">
              <span>Counts</span>
              <span className="font-medium tabular-nums">{totalCounts} nr</span>
            </div>
          )}
        </div>
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} onContextMenu={(e) => { e.preventDefault(); setContextMenu(null) }} />
          <div
            className="fixed z-50 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {onLinkToBOQ && (
              <button
                onClick={() => {
                  onLinkToBOQ([contextMenu.id])
                  setContextMenu(null)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
              >
                <Link2 size={14} className="text-blue-500" />
                Link to BOQ
              </button>
            )}
            <button
              onClick={() => {
                const m = measurements.find(x => x.id === contextMenu.id)
                if (m) { setEditingId(m.id); setEditValue(m.label ?? '') }
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            >
              <Ruler size={14} className="text-slate-400" />
              Rename
            </button>
            <div className="h-px bg-slate-200 dark:bg-slate-700 my-1" />
            <button
              onClick={() => {
                onDelete(contextMenu.id)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  )
})
