'use client'

import { Trash2, Link2 } from 'lucide-react'
import { TAKEOFF_TOOLS } from '@/lib/takeoff-tools'
import { BOQItem } from '@/lib/types'

export interface MeasurementEntry {
  id: string
  toolType: string
  label: string
  quantity: number | null
  unit: string
  color: string
  boqItemId: string | null
  pageNumber: number
  materialSpec: Record<string, number | string>
}

interface Props {
  measurements: MeasurementEntry[]
  selectedId: string | null
  boqItems: BOQItem[]
  savingId: string | null
  currentPage: number
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onLinkBOQ: (measurementId: string, boqItemId: string) => void
}

export function MeasurementsList({
  measurements,
  selectedId,
  boqItems,
  savingId,
  currentPage,
  onSelect,
  onDelete,
  onLinkBOQ,
}: Props) {
  const pageMeasurements = measurements.filter(m => m.pageNumber === currentPage)

  if (pageMeasurements.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-xs text-slate-500 mt-2">No measurements on this page</p>
        <p className="text-xs text-slate-600 mt-1">Select a tool and start measuring</p>
      </div>
    )
  }

  // Group by tool type
  const grouped = new Map<string, MeasurementEntry[]>()
  for (const m of pageMeasurements) {
    const key = m.toolType
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(m)
  }

  return (
    <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
      {Array.from(grouped.entries()).map(([toolType, items]) => {
        const cfg = TAKEOFF_TOOLS.find(t => t.type === toolType)
        const groupLabel = cfg?.label ?? toolType

        return (
          <div key={toolType}>
            <div className="px-3 py-1.5 bg-slate-800/50">
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: cfg?.color ?? '#94a3b8' }}>
                {groupLabel}
              </p>
            </div>
            {items.map(m => (
              <div
                key={m.id}
                onClick={() => onSelect(m.id)}
                className={`px-3 py-2 cursor-pointer transition-colors ${
                  m.id === selectedId ? 'bg-amber-500/10' : 'hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: m.color }} />
                    <span className="text-xs text-slate-300 truncate">{m.label || groupLabel}</span>
                    {savingId === m.id && (
                      <div className="w-3 h-3 border border-amber-400 border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); onDelete(m.id) }}
                    className="p-0.5 rounded hover:bg-red-900/50 text-slate-600 hover:text-red-400 transition-colors shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>

                {m.quantity !== null && (
                  <p className="text-sm font-bold text-white mt-0.5">
                    {m.quantity.toFixed(m.unit === 'nr' ? 0 : 3)} {m.unit}
                  </p>
                )}

                {/* BOQ link dropdown */}
                <div className="mt-1 flex items-center gap-1">
                  <Link2 size={10} className="text-slate-600 shrink-0" />
                  <select
                    value={m.boqItemId ?? ''}
                    onChange={e => { e.stopPropagation(); onLinkBOQ(m.id, e.target.value) }}
                    onClick={e => e.stopPropagation()}
                    className="flex-1 text-xs bg-slate-800 border border-slate-700 text-slate-400 rounded px-1.5 py-0.5 focus:outline-none focus:border-amber-500 min-w-0"
                  >
                    <option value="">— Link to BOQ item —</option>
                    {boqItems.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.item_code ? `${b.item_code} ` : ''}{(b.description ?? '').slice(0, 30)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )
      })}
    </div>
  )
}
