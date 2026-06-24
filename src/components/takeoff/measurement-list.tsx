'use client'

import { useState } from 'react'
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
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TakeoffMeasurement } from '@/lib/takeoff/renderer'

interface MeasurementListProps {
  measurements: TakeoffMeasurement[]
  activeMeasurementId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onLabelChange: (id: string, label: string) => void
}

const TOOL_META: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string }> = {
  line: { icon: Ruler, label: 'Lines' },
  polyline: { icon: Spline, label: 'Polylines' },
  area: { icon: Pentagon, label: 'Areas' },
  rectangle: { icon: Square, label: 'Rectangles' },
  circle: { icon: Circle, label: 'Circles' },
  count: { icon: Hash, label: 'Counts' },
}

export function MeasurementList({
  measurements,
  activeMeasurementId,
  onSelect,
  onDelete,
  onLabelChange,
}: MeasurementListProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Group by tool type
  const groups = measurements.reduce<Record<string, TakeoffMeasurement[]>>((acc, m) => {
    const key = m.tool_type
    if (!acc[key]) acc[key] = []
    acc[key].push(m)
    return acc
  }, {})

  // Summary
  const totalCount = measurements.length
  const totalLengths = measurements
    .filter((m) => m.tool_type === 'line' || m.tool_type === 'polyline')
    .reduce((s, m) => s + m.quantity, 0)
  const totalAreas = measurements
    .filter((m) => m.tool_type === 'area' || m.tool_type === 'rectangle' || m.tool_type === 'circle')
    .reduce((s, m) => s + m.quantity, 0)

  const startEdit = (m: TakeoffMeasurement) => {
    setEditingId(m.id)
    setEditValue(m.label ?? '')
  }

  const commitEdit = (id: string) => {
    onLabelChange(id, editValue)
    setEditingId(null)
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Measurements
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {Object.entries(groups).map(([toolType, items]) => {
          const meta = TOOL_META[toolType] ?? { icon: Ruler, label: toolType }
          const Icon = meta.icon
          const isCollapsed = collapsed[toolType] ?? false

          return (
            <div key={toolType}>
              <button
                onClick={() => setCollapsed((p) => ({ ...p, [toolType]: !isCollapsed }))}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750"
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                <Icon size={14} />
                <span>{meta.label}</span>
                <span className="ml-auto text-slate-400">{items.length}</span>
              </button>

              {!isCollapsed &&
                items.map((m) => {
                  const active = m.id === activeMeasurementId
                  const qStr = m.quantity % 1 === 0 ? m.quantity.toString() : m.quantity.toFixed(2)

                  return (
                    <div
                      key={m.id}
                      onClick={() => onSelect(m.id)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm transition-colors',
                        active
                          ? 'bg-blue-50 dark:bg-blue-900/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-750',
                      )}
                    >
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
                          {m.label || `${meta.label.slice(0, -1)} ${items.indexOf(m) + 1}`}
                        </span>
                      )}

                      <span className="text-xs text-slate-400 whitespace-nowrap">
                        {qStr} {m.unit ?? 'px'}
                      </span>

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
          <div>Total: {totalCount} measurement{totalCount !== 1 ? 's' : ''}</div>
          {totalLengths > 0 && (
            <div>Lengths: {totalLengths.toFixed(2)}</div>
          )}
          {totalAreas > 0 && (
            <div>Areas: {totalAreas.toFixed(2)}</div>
          )}
        </div>
      )}
    </div>
  )
}
