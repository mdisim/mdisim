'use client'

import { useEffect, useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { getBOQItems } from '@/app/actions/boq'
import { getMeasurementItems } from '@/app/actions/measurements'
import type { BOQItem, MeasurementItem } from '@/lib/types'
import { FileSpreadsheet, Link2, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react'

interface LiveBOQPanelProps {
  projectId: string
  drawingId: string
  measurementCount: number
}

export function LiveBOQPanel({ projectId, measurementCount }: LiveBOQPanelProps) {
  const [boqItems, setBOQItems] = useState<BOQItem[]>([])
  const [measurementItems, setMeasurementItems] = useState<MeasurementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const [boq, mi] = await Promise.all([
      getBOQItems(projectId),
      getMeasurementItems(projectId),
    ])
    setBOQItems(boq)
    setMeasurementItems(mi)
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load, measurementCount])

  const boqBySection = boqItems.reduce<Record<string, BOQItem[]>>((acc, item) => {
    const section = item.section || 'Unsectioned'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {})

  const linkedMiIds = new Set(boqItems.map(b => b.mi_id).filter(Boolean))
  const unlinkedMI = measurementItems.filter(mi => !linkedMiIds.has(mi.id))

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700">
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
        <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          Live BOQ
        </h3>
        <span className="ml-auto text-[10px] text-slate-400 dark:text-slate-500">
          {boqItems.length} items
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
            ))}
          </div>
        ) : boqItems.length === 0 && measurementItems.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            <FileSpreadsheet size={24} className="mx-auto mb-2 opacity-50" />
            <p>No BOQ items yet.</p>
            <p className="text-xs mt-1">
              Take measurements, then generate BOQ from the Measurements page.
            </p>
          </div>
        ) : (
          <>
            {/* BOQ items by section */}
            {Object.entries(boqBySection).map(([section, items]) => {
              const isCollapsed = collapsed[section] ?? false
              const sectionTotal = items.reduce((s, i) => s + (i.total_amount ?? 0), 0)

              return (
                <div key={section}>
                  <button
                    onClick={() => setCollapsed(p => ({ ...p, [section]: !isCollapsed }))}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 border-b border-slate-100 dark:border-slate-700"
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    <span className="truncate">{section}</span>
                    <span className="ml-auto font-mono text-[10px]">
                      {sectionTotal > 0 ? sectionTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : items.length + ' items'}
                    </span>
                  </button>

                  {!isCollapsed && items.map(item => (
                    <div
                      key={item.id}
                      className="px-3 py-1.5 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750"
                    >
                      <div className="flex items-start gap-2">
                        {item.code && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                            {item.code}
                          </span>
                        )}
                        <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">
                          {item.description}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                        <span className="font-medium text-slate-600 dark:text-slate-300">
                          {item.quantity?.toFixed(2) ?? '0.00'} {item.unit}
                        </span>
                        {item.unit_rate != null && item.unit_rate > 0 && (
                          <>
                            <span>@</span>
                            <span>{item.unit_rate.toFixed(2)}</span>
                            <ArrowRight size={8} />
                            <span className="font-medium text-emerald-600 dark:text-emerald-400">
                              {(item.total_amount ?? 0).toFixed(2)}
                            </span>
                          </>
                        )}
                        {item.mi_id && (
                          <span title="Linked to measurement"><Link2 size={10} className="text-blue-400" /></span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            })}

            {/* Unlinked measurement items */}
            {unlinkedMI.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-900/10">
                  Not in BOQ ({unlinkedMI.length})
                </div>
                {unlinkedMI.map(mi => (
                  <div
                    key={mi.id}
                    className="px-3 py-1.5 border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-750"
                  >
                    <div className="flex items-start gap-2">
                      {mi.item_code && (
                        <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 shrink-0 mt-0.5">
                          {mi.item_code}
                        </span>
                      )}
                      <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 min-w-0 truncate">
                        {mi.description}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {mi.net_qty?.toFixed(2) ?? '0.00'} {mi.unit}
                      </span>
                      <span className="ml-2 text-amber-500">(not linked)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary footer */}
      {boqItems.length > 0 && (
        <div className="border-t border-slate-200 dark:border-slate-700 px-3 py-2 text-xs text-slate-500 dark:text-slate-400 space-y-0.5">
          <div className="flex justify-between">
            <span>BOQ Items</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{boqItems.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Total Amount</span>
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {boqItems.reduce((s, i) => s + (i.total_amount ?? 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
