'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { getBOQItems, createBOQItem } from '@/app/actions/boq'
import { getMeasurementItems, linkDrawingMeasurementsToBOQ } from '@/app/actions/measurements'
import type { BOQItem, MeasurementItem } from '@/lib/types'
import {
  FileSpreadsheet,
  Link2,
  ChevronDown,
  ChevronRight,
  ArrowRight,
  Plus,
  X,
  Check,
  Ruler,
  LinkIcon,
  Unlink,
} from 'lucide-react'

interface LiveBOQPanelProps {
  projectId: string
  drawingId: string
  measurementCount: number
  linkMode?: boolean
  selectedMeasurementIds?: string[]
  onLinkToItem?: (boqItemId: string) => void
  onCreateAndLink?: (description: string, unit: string) => void
  activeBOQItemId?: string | null
  onBOQItemSelect?: (boqItemId: string | null, linkedDrawingMeasurementIds: string[]) => void
  highlightedBOQItemId?: string | null
  selectedDrawingMeasurementId?: string | null
}

export function LiveBOQPanel({
  projectId,
  drawingId,
  measurementCount,
  linkMode = false,
  selectedMeasurementIds = [],
  onLinkToItem,
  onCreateAndLink,
  activeBOQItemId,
  onBOQItemSelect,
  highlightedBOQItemId: highlightedBOQItemIdProp,
  selectedDrawingMeasurementId,
}: LiveBOQPanelProps) {
  const [boqItems, setBOQItems] = useState<BOQItem[]>([])
  const [measurementItems, setMeasurementItems] = useState<MeasurementItem[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [quickAddDesc, setQuickAddDesc] = useState('')
  const [quickAddUnit, setQuickAddUnit] = useState('m')
  const [quickAddLoading, setQuickAddLoading] = useState(false)
  const [linkingItemId, setLinkingItemId] = useState<string | null>(null)

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

  // Build maps for linking
  const linkedMeasurementCounts = boqItems.reduce<Record<string, number>>((acc, item) => {
    if (item.mi_id) {
      acc[item.id] = (acc[item.id] ?? 0) + 1
    }
    return acc
  }, {})

  // Map BOQ item ID → drawing measurement IDs (via measurement item lines)
  const boqToDrawingMeasurements = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const boqItem of boqItems) {
      if (!boqItem.mi_id) continue
      const mi = measurementItems.find(m => m.id === boqItem.mi_id)
      if (!mi?.lines) continue
      map[boqItem.id] = mi.lines
        .map(l => l.drawing_measurement_id)
        .filter((id): id is string => !!id)
    }
    return map
  }, [boqItems, measurementItems])

  // Reverse map: drawing_measurement_id → BOQ item ID
  const highlightedBOQItemId = useMemo(() => {
    if (highlightedBOQItemIdProp) return highlightedBOQItemIdProp
    if (!selectedDrawingMeasurementId) return null
    for (const [boqId, dmIds] of Object.entries(boqToDrawingMeasurements)) {
      if (dmIds.includes(selectedDrawingMeasurementId)) return boqId
    }
    return null
  }, [highlightedBOQItemIdProp, selectedDrawingMeasurementId, boqToDrawingMeasurements])

  const boqBySection = boqItems.reduce<Record<string, BOQItem[]>>((acc, item) => {
    const section = item.section || 'Unsectioned'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {})

  const linkedMiIds = new Set(boqItems.map(b => b.mi_id).filter(Boolean))
  const unlinkedMI = measurementItems.filter(mi => !linkedMiIds.has(mi.id))

  const grandTotal = boqItems.reduce((s, i) => s + (i.total_amount ?? 0), 0)

  const handleQuickAdd = async () => {
    if (!quickAddDesc.trim()) return
    setQuickAddLoading(true)

    if (onCreateAndLink) {
      onCreateAndLink(quickAddDesc.trim(), quickAddUnit)
    } else {
      const result = await createBOQItem({
        project_id: projectId,
        description: quickAddDesc.trim(),
        unit: quickAddUnit,
      })
      if (result.data && selectedMeasurementIds.length > 0) {
        await linkDrawingMeasurementsToBOQ(result.data.id, selectedMeasurementIds, projectId)
      }
    }

    setQuickAddDesc('')
    setQuickAddUnit('m')
    setShowQuickAdd(false)
    setQuickAddLoading(false)
    load()
  }

  const handleLinkClick = async (boqItemId: string) => {
    if (onLinkToItem) {
      setLinkingItemId(boqItemId)
      onLinkToItem(boqItemId)
      setTimeout(() => setLinkingItemId(null), 1000)
    }
  }

  const formatCurrency = (value: number) =>
    value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[var(--color-surface-elevated)] border-l border-[var(--color-border)] dark:border-[var(--color-border)]">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[var(--color-border)] dark:border-[var(--color-border)] flex items-center gap-2">
        <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
        <h3 className="text-sm font-semibold text-[var(--color-text)]">
          Live BOQ
        </h3>
        <span className="ml-auto text-[10px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
          {boqItems.length} items
        </span>
      </div>

      {/* Link Mode Banner */}
      {linkMode && (
        <div className="px-3 py-2 bg-[var(--color-amber)]/10 dark:bg-[var(--color-amber)]/10 border-b border-[var(--color-amber)]/20 dark:border-[var(--color-amber)]/20">
          <div className="flex items-center gap-2">
            <LinkIcon size={14} className="text-[var(--color-amber)] dark:text-[var(--color-amber)]" />
            <span className="text-xs font-semibold text-[var(--color-amber)] dark:text-[var(--color-amber)]">
              Select BOQ Item to Link
            </span>
          </div>
          <p className="text-[10px] text-[var(--color-amber)] dark:text-[var(--color-amber)] mt-0.5">
            {selectedMeasurementIds.length} measurement{selectedMeasurementIds.length !== 1 ? 's' : ''} selected
          </p>
        </div>
      )}

      {/* Quick Add Button / Form */}
      {linkMode && (
        <div className="border-b border-[var(--color-border)] dark:border-[var(--color-border)]">
          {!showQuickAdd ? (
            <button
              onClick={() => setShowQuickAdd(true)}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
            >
              <Plus size={14} />
              Quick Add BOQ Item
            </button>
          ) : (
            <div className="p-3 space-y-2 bg-[var(--color-surface)] dark:bg-[var(--color-surface)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-text)]">
                  New BOQ Item
                </span>
                <button
                  onClick={() => setShowQuickAdd(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] dark:hover:text-[var(--color-text-secondary)]"
                >
                  <X size={14} />
                </button>
              </div>
              <input
                type="text"
                placeholder="Description..."
                value={quickAddDesc}
                onChange={e => setQuickAddDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
                className="w-full px-2 py-1.5 text-xs border border-[var(--color-border)] dark:border-[var(--color-border)] rounded bg-white dark:bg-[var(--color-surface-hover)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                autoFocus
              />
              <div className="flex items-center gap-2">
                <select
                  value={quickAddUnit}
                  onChange={e => setQuickAddUnit(e.target.value)}
                  className="flex-1 px-2 py-1.5 text-xs border border-[var(--color-border)] dark:border-[var(--color-border)] rounded bg-white dark:bg-[var(--color-surface-hover)] text-[var(--color-text)] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="m">m</option>
                  <option value="m2">m²</option>
                  <option value="m3">m³</option>
                  <option value="nr">nr</option>
                  <option value="kg">kg</option>
                  <option value="ton">ton</option>
                  <option value="lm">lm</option>
                  <option value="ls">ls</option>
                </select>
                <button
                  onClick={handleQuickAdd}
                  disabled={!quickAddDesc.trim() || quickAddLoading}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded transition-colors',
                    quickAddDesc.trim() && !quickAddLoading
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                      : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] dark:bg-[var(--color-surface-hover)] dark:text-[var(--color-text-muted)] cursor-not-allowed'
                  )}
                >
                  {quickAddLoading ? (
                    <span className="animate-spin">...</span>
                  ) : (
                    <>
                      <Plus size={12} />
                      Create & Link
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] rounded animate-pulse" />
            ))}
          </div>
        ) : boqItems.length === 0 && measurementItems.length === 0 ? (
          <div className="px-3 py-8 text-center text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
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
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] border-b border-[var(--color-border)] dark:border-[var(--color-border)]"
                  >
                    {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                    <span className="truncate">{section}</span>
                    <span className="ml-auto font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      {sectionTotal > 0 ? formatCurrency(sectionTotal) : items.length + ' items'}
                    </span>
                  </button>

                  {!isCollapsed && items.map(item => {
                    const hasLinkedMeasurements = !!item.mi_id
                    const linkedCount = linkedMeasurementCounts[item.id] ?? (item.mi_id ? 1 : 0)
                    const isLinking = linkingItemId === item.id
                    const quantitySynced = item.original_quantity != null
                      ? Math.abs((item.quantity ?? 0) - (item.original_quantity ?? 0)) < 0.01
                      : true
                    const isActive = activeBOQItemId === item.id
                    const isHighlighted = highlightedBOQItemId === item.id

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'px-3 py-1.5 border-b border-[var(--color-border)] dark:border-[var(--color-border)]/50 transition-colors cursor-pointer',
                          linkMode
                            ? 'hover:bg-[var(--color-amber-cta)] dark:hover:bg-[var(--color-amber)]/10'
                            : 'hover:bg-[var(--color-surface-hover)]',
                          isLinking && 'bg-emerald-50 dark:bg-emerald-900/20',
                          isActive && 'bg-[var(--color-amber)]/10 dark:bg-[var(--color-amber)]/10 ring-1 ring-inset ring-blue-400 dark:ring-blue-500',
                          isHighlighted && !isActive && 'bg-[var(--color-amber)]/5 dark:bg-[var(--color-amber)]/10',
                        )}
                        onClick={linkMode ? () => handleLinkClick(item.id) : () => {
                          if (!onBOQItemSelect) return
                          const dmIds = boqToDrawingMeasurements[item.id] ?? []
                          if (isActive) {
                            onBOQItemSelect(null, [])
                          } else {
                            onBOQItemSelect(item.id, dmIds)
                          }
                        }}
                      >
                        <div className="flex items-start gap-2">
                          {item.code && (
                            <span className="text-[10px] font-mono text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] shrink-0 mt-0.5">
                              {item.code}
                            </span>
                          )}
                          <span className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-secondary)] flex-1 min-w-0 truncate">
                            {item.description}
                          </span>
                          {/* Link mode button */}
                          {linkMode && !isLinking && (
                            <button
                              onClick={e => {
                                e.stopPropagation()
                                handleLinkClick(item.id)
                              }}
                              className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-amber)] dark:text-[var(--color-amber)] bg-[var(--color-amber)]/10 dark:bg-[var(--color-amber)]/10 rounded hover:bg-[var(--color-amber-cta)] dark:hover:bg-[var(--color-amber)]/10 transition-colors"
                            >
                              <Link2 size={10} />
                              Link
                            </button>
                          )}
                          {isLinking && (
                            <span className="shrink-0 flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 rounded">
                              <Check size={10} />
                              Linked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
                          {/* Linked measurement count */}
                          {hasLinkedMeasurements && (
                            <span className="inline-flex items-center gap-0.5 text-[var(--color-amber)] dark:text-[var(--color-amber)]" title="Linked measurements">
                              <Ruler size={9} />
                              <span>{linkedCount}</span>
                            </span>
                          )}
                          {/* Quantity display */}
                          <span className="font-medium text-[var(--color-text-muted)] dark:text-[var(--color-text-secondary)]">
                            {item.quantity?.toFixed(2) ?? '0.00'} {item.unit}
                          </span>
                          {/* Sync indicator */}
                          {item.original_quantity != null && (
                            <span
                              className={cn(
                                'inline-flex items-center gap-0.5',
                                quantitySynced
                                  ? 'text-emerald-500 dark:text-emerald-400'
                                  : 'text-amber-500 dark:text-amber-400'
                              )}
                              title={quantitySynced ? 'Quantities synced' : 'Manual quantity differs from linked'}
                            >
                              {quantitySynced ? <Check size={9} /> : <Unlink size={9} />}
                              <span>{item.original_quantity?.toFixed(2)}</span>
                            </span>
                          )}
                          {item.unit_rate != null && item.unit_rate > 0 && (
                            <>
                              <span>@</span>
                              <span>{item.unit_rate.toFixed(2)}</span>
                              <ArrowRight size={8} />
                              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                                {formatCurrency(item.total_amount ?? 0)}
                              </span>
                            </>
                          )}
                          {hasLinkedMeasurements && !linkMode && (
                            <span title="Linked to measurement"><Link2 size={10} className="text-[var(--color-amber)]" /></span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )
            })}

            {/* Unlinked measurement items */}
            {unlinkedMI.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider border-b border-[var(--color-border)] dark:border-[var(--color-border)] bg-amber-50/50 dark:bg-amber-900/10">
                  Not in BOQ ({unlinkedMI.length})
                </div>
                {unlinkedMI.map(mi => (
                  <div
                    key={mi.id}
                    className="px-3 py-1.5 border-b border-[var(--color-border)] dark:border-[var(--color-border)]/50 hover:bg-[var(--color-surface-hover)]"
                  >
                    <div className="flex items-start gap-2">
                      {mi.item_code && (
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] shrink-0 mt-0.5">
                          {mi.item_code}
                        </span>
                      )}
                      <span className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-secondary)] flex-1 min-w-0 truncate">
                        {mi.description}
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] mt-0.5">
                      <span className="font-medium text-[var(--color-text-muted)] dark:text-[var(--color-text-secondary)]">
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

      {/* Grand Total Footer */}
      {boqItems.length > 0 && (
        <div className="border-t border-[var(--color-border)] dark:border-[var(--color-border)] px-3 py-2 text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] space-y-1">
          <div className="flex justify-between">
            <span>BOQ Items</span>
            <span className="font-medium text-[var(--color-text)]">{boqItems.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Linked</span>
            <span className="font-medium text-[var(--color-amber)] dark:text-[var(--color-amber)]">
              {boqItems.filter(i => i.mi_id).length}
            </span>
          </div>
          <div className="flex justify-between pt-1 border-t border-[var(--color-border)] dark:border-[var(--color-border)]">
            <span className="font-semibold text-[var(--color-text)]">Grand Total</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(grandTotal)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
