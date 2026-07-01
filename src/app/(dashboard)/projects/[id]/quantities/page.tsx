'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import type { Drawing, DrawingMeasurement, BOQItem } from '@/lib/types'
import { getDrawings, getDrawingMeasurements } from '@/app/actions/drawings'
import { getBOQItems } from '@/app/actions/boq'
import { Badge } from '@/components/ui/badge'
import { TableSkeleton } from '@/components/ui/skeleton'
import { useI18n } from '@/lib/i18n'
import {
  BarChart3,
  Ruler,
  Square,
  Hash,
  FileText,
  Layers,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
  Search,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type DrawingWithMeasurements = Drawing & { measurements: DrawingMeasurement[] }
type BOQAggregation = {
  boqItem: BOQItem
  byDrawing: { drawing: Drawing; measurements: DrawingMeasurement[]; total: number }[]
  grandTotal: number
}

export default function QuantitiesPage() {
  const { t } = useI18n()
  const { id: projectId } = useParams<{ id: string }>()
  const [drawingsData, setDrawingsData] = useState<DrawingWithMeasurements[]>([])
  const [boqItems, setBOQItems] = useState<BOQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'by-drawing' | 'by-boq' | 'compare'>('dashboard')
  const [expandedDrawings, setExpandedDrawings] = useState<Set<string>>(new Set())
  const [expandedBOQ, setExpandedBOQ] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [compareIds, setCompareIds] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [drawings, boq] = await Promise.all([
        getDrawings(projectId),
        getBOQItems(projectId),
      ])
      const withMeasurements = await Promise.all(
        drawings.map(async (d) => {
          try {
            const measurements = await getDrawingMeasurements(d.id)
            return { ...d, measurements }
          } catch (err) {
            setError(`${t.quantities.loadFailed}: "${d.name}"`)
            return { ...d, measurements: [] as import('@/lib/types').DrawingMeasurement[] }
          }
        })
      )
      setDrawingsData(withMeasurements.filter(d => d.measurements.length > 0))
      setBOQItems(boq)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.quantities.loadFailed)
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const allMeasurements = useMemo(() => drawingsData.flatMap(d => d.measurements), [drawingsData])
  const totalLinear = useMemo(() => allMeasurements.filter(m => m.tool_type === 'line' || m.tool_type === 'polyline').reduce((s, m) => s + m.quantity, 0), [allMeasurements])
  const totalArea = useMemo(() => allMeasurements.filter(m => m.tool_type === 'area' || m.tool_type === 'rectangle' || m.tool_type === 'circle').reduce((s, m) => s + m.quantity, 0), [allMeasurements])
  const totalCounts = useMemo(() => allMeasurements.filter(m => m.tool_type === 'count').reduce((s, m) => s + m.quantity, 0), [allMeasurements])

  const boqAggregations = useMemo<BOQAggregation[]>(() => {
    return boqItems.map(boq => {
      const byDrawing = drawingsData
        .map(d => {
          const ms = d.measurements.filter(m => m.label?.includes(boq.description) || m.label?.includes(boq.code ?? ''))
          return { drawing: d, measurements: ms, total: ms.reduce((s, m) => s + m.quantity, 0) }
        })
        .filter(x => x.measurements.length > 0)
      return { boqItem: boq, byDrawing, grandTotal: byDrawing.reduce((s, x) => s + x.total, 0) }
    }).filter(a => a.byDrawing.length > 0)
  }, [boqItems, drawingsData])

  const filteredDrawings = useMemo(() => {
    if (!search) return drawingsData
    const q = search.toLowerCase()
    return drawingsData.filter(d => d.name.toLowerCase().includes(q) || d.drawing_number?.toLowerCase().includes(q))
  }, [drawingsData, search])

  const compareDrawings = useMemo(() => drawingsData.filter(d => compareIds.includes(d.id)), [drawingsData, compareIds])

  if (loading) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <TableSkeleton rows={6} columns={4} />
      </div>
    )
  }

  if (error && !loading && drawingsData.length === 0) {
    return (
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-sm text-red-400">{error}</p>
          <button onClick={load} className="px-4 py-2 text-sm font-medium bg-[color:var(--color-amber)] text-[color:var(--color-on-amber)] rounded-xl hover:opacity-90">{t.quantities.retry}</button>
        </div>
      </div>
    )
  }

  const kpis = [
    { label: t.quantities.kpiDrawings, value: String(drawingsData.length), icon: FileText },
    { label: t.quantities.kpiMeasurements, value: String(allMeasurements.length), icon: Layers },
    { label: t.quantities.kpiLinearTotal, value: fmt(totalLinear), icon: Ruler },
    { label: t.quantities.kpiAreaTotal, value: fmt(totalArea), icon: Square },
    { label: t.quantities.kpiCountTotal, value: String(totalCounts), icon: Hash },
  ] as const

  const tabs = [
    { key: 'dashboard', label: t.quantities.tabDashboard },
    { key: 'by-drawing', label: t.quantities.tabByDrawing },
    { key: 'by-boq', label: t.quantities.tabByBoq },
    { key: 'compare', label: t.quantities.tabCompare },
  ] as const

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
          <BarChart3 size={16} className="text-[color:var(--color-amber)]" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-[color:var(--color-text)]">{t.quantities.title}</h2>
          <p className="text-sm text-[color:var(--color-text-secondary)]">{t.quantities.subtitle}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
          >
            <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-widest text-[color:var(--color-text-secondary)]">{kpi.label}</span>
                <div className="w-6 h-6 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
                  <kpi.icon size={12} className="text-[color:var(--color-amber)]" />
                </div>
              </div>
              <div className="text-lg font-bold tabular-nums font-mono text-[color:var(--color-text)]">{kpi.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[color:var(--color-border)]">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === tab.key
              ? 'border-[color:var(--color-amber)] text-[color:var(--color-amber)]'
              : 'border-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)]'
          )}>{tab.label}</button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
            <h3 className="text-sm font-semibold text-[color:var(--color-text)]">{t.quantities.drawingSummary}</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[color:var(--color-surface)] border-b border-[color:var(--color-border)]">
                  <th className="text-start px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colDrawing}</th>
                  <th className="text-start px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colNumber}</th>
                  <th className="text-start px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colType}</th>
                  <th className="text-end px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colMeasurements}</th>
                  <th className="text-end px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colLinear}</th>
                  <th className="text-end px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colArea}</th>
                  <th className="text-end px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colCounts}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]/50">
                {drawingsData.map((d, idx) => {
                  const linear = d.measurements.filter(m => m.tool_type === 'line' || m.tool_type === 'polyline').reduce((s, m) => s + m.quantity, 0)
                  const area = d.measurements.filter(m => m.tool_type === 'area' || m.tool_type === 'rectangle' || m.tool_type === 'circle').reduce((s, m) => s + m.quantity, 0)
                  const counts = d.measurements.filter(m => m.tool_type === 'count').reduce((s, m) => s + m.quantity, 0)
                  return (
                    <tr
                      key={d.id}
                      className={cn(
                        'hover:bg-[color:var(--color-amber)]/5 transition-colors',
                        idx % 2 === 1 && 'bg-[color:var(--color-surface)]/30'
                      )}
                    >
                      <td className="px-4 py-3 font-medium text-[color:var(--color-text)]">{d.name}</td>
                      <td className="px-4 py-3 font-mono text-xs text-[color:var(--color-text-secondary)]">{d.drawing_number ?? '-'}</td>
                      <td className="px-4 py-3"><Badge variant="default">{d.drawing_type}</Badge></td>
                      <td className="px-4 py-3 text-end tabular-nums font-mono font-medium text-[color:var(--color-text)]">{d.measurements.length}</td>
                      <td className="px-4 py-3 text-end tabular-nums font-mono text-[color:var(--color-text-secondary)]">{linear > 0 ? fmt(linear) : '-'}</td>
                      <td className="px-4 py-3 text-end tabular-nums font-mono text-[color:var(--color-text-secondary)]">{area > 0 ? fmt(area) : '-'}</td>
                      <td className="px-4 py-3 text-end tabular-nums font-mono text-[color:var(--color-text-secondary)]">{counts > 0 ? counts : '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="bg-[color:var(--color-amber)]/5 border-t-2 border-[color:var(--color-amber)]/30">
                  <td colSpan={3} className="px-4 py-3 font-bold text-[color:var(--color-amber)]">{t.quantities.projectTotal}</td>
                  <td className="px-4 py-3 text-end tabular-nums font-mono font-bold text-[color:var(--color-amber)]">{allMeasurements.length}</td>
                  <td className="px-4 py-3 text-end tabular-nums font-mono font-bold text-[color:var(--color-amber)]">{fmt(totalLinear)}</td>
                  <td className="px-4 py-3 text-end tabular-nums font-mono font-bold text-[color:var(--color-amber)]">{fmt(totalArea)}</td>
                  <td className="px-4 py-3 text-end tabular-nums font-mono font-bold text-[color:var(--color-amber)]">{totalCounts}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* By Drawing Tab */}
      {activeTab === 'by-drawing' && (
        <div>
          <div className="mb-3 relative">
            <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-[color:var(--color-text-secondary)]" />
            <input
              type="text"
              placeholder={t.quantities.searchDrawings}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full ps-9 pe-4 py-2 text-sm rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] placeholder:text-[color:var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-amber)]/30"
            />
          </div>
          <div className="space-y-2">
            {filteredDrawings.map((d, idx) => {
              const isExpanded = expandedDrawings.has(d.id)
              return (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                >
                  <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl overflow-hidden hover:border-[color:var(--color-amber)]/30 transition-colors">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[color:var(--color-amber)]/5 transition-colors"
                      onClick={() => setExpandedDrawings(prev => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n })}
                    >
                      {isExpanded
                        ? <ChevronDown size={16} className="text-[color:var(--color-amber)]" />
                        : <ChevronRight size={16} className="text-[color:var(--color-text-secondary)] rtl:rotate-180" />
                      }
                      <FileText size={16} className="text-[color:var(--color-amber)]" />
                      <span className="font-medium text-[color:var(--color-text)] text-sm flex-1">{d.name}</span>
                      {d.drawing_number && <span className="text-xs font-mono text-[color:var(--color-text-secondary)]">{d.drawing_number}</span>}
                      <Badge variant="info">{d.measurements.length} {t.quantities.measurementsCount}</Badge>
                    </div>
                    {isExpanded && (
                      <div className="border-t border-[color:var(--color-border)] overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="bg-[color:var(--color-surface)]">
                              <th className="text-start px-4 py-2 font-mono uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colLabel}</th>
                              <th className="text-center px-4 py-2 font-mono uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colTool}</th>
                              <th className="text-end px-4 py-2 font-mono uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colQuantity}</th>
                              <th className="text-center px-4 py-2 font-mono uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colUnit}</th>
                              <th className="text-center px-4 py-2 font-mono uppercase tracking-widest text-[color:var(--color-text-secondary)]">{t.quantities.colPage}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[color:var(--color-border)]/50">
                            {d.measurements.map((m, i) => (
                              <tr key={m.id} className="hover:bg-[color:var(--color-amber)]/5 transition-colors">
                                <td className="px-4 py-2 text-[color:var(--color-text)]">{m.label || `${t.quantities.measurementFallback} ${i + 1}`}</td>
                                <td className="px-4 py-2 text-center"><Badge variant="default">{m.tool_type}</Badge></td>
                                <td className="px-4 py-2 text-end tabular-nums font-mono font-medium text-[color:var(--color-text)]">{fmt(m.quantity)}</td>
                                <td className="px-4 py-2 text-center text-[color:var(--color-text-secondary)]">{m.unit ?? 'px'}</td>
                                <td className="px-4 py-2 text-center text-[color:var(--color-text-secondary)]">{m.page_number}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      )}

      {/* By BOQ Tab */}
      {activeTab === 'by-boq' && (
        <div className="space-y-2">
          {boqAggregations.length === 0 ? (
            <div className="text-center py-12 text-sm text-[color:var(--color-text-secondary)]">{t.quantities.noBoqLinked}</div>
          ) : (
            boqAggregations.map(agg => {
              const isExpanded = expandedBOQ.has(agg.boqItem.id)
              return (
                <div key={agg.boqItem.id} className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl overflow-hidden hover:border-[color:var(--color-amber)]/30 transition-colors">
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[color:var(--color-amber)]/5 transition-colors"
                    onClick={() => setExpandedBOQ(prev => { const n = new Set(prev); n.has(agg.boqItem.id) ? n.delete(agg.boqItem.id) : n.add(agg.boqItem.id); return n })}
                  >
                    {isExpanded
                      ? <ChevronDown size={16} className="text-[color:var(--color-amber)]" />
                      : <ChevronRight size={16} className="text-[color:var(--color-text-secondary)] rtl:rotate-180" />
                    }
                    <span className="font-mono text-xs text-[color:var(--color-text-secondary)]">{agg.boqItem.code ?? '-'}</span>
                    <span className="font-medium text-[color:var(--color-text)] text-sm flex-1">{agg.boqItem.description}</span>
                    <span className="text-xs text-[color:var(--color-text-secondary)]">{agg.boqItem.unit}</span>
                    <span className="text-sm font-bold tabular-nums font-mono text-[color:var(--color-amber)]">{fmt(agg.grandTotal)}</span>
                    <Badge variant="info">{agg.byDrawing.length} {t.quantities.drawingsCount}</Badge>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-[color:var(--color-border)] px-4 py-2 space-y-1">
                      {agg.byDrawing.map(bd => (
                        <div key={bd.drawing.id} className="flex items-center gap-2 text-xs py-1">
                          <FileText size={12} className="text-[color:var(--color-text-secondary)]" />
                          <span className="text-[color:var(--color-text-secondary)] flex-1">{bd.drawing.name}</span>
                          <span className="tabular-nums text-[color:var(--color-text-secondary)]">{bd.measurements.length} {t.quantities.measurementsCount}</span>
                          <span className="tabular-nums font-mono font-medium text-[color:var(--color-text)]">{fmt(bd.total)} {agg.boqItem.unit}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-xs py-1 pt-2 border-t border-[color:var(--color-border)]/50">
                        <span className="flex-1 font-semibold text-[color:var(--color-text)]">{t.quantities.totalFromDrawings}</span>
                        <span className="tabular-nums font-mono font-bold text-[color:var(--color-amber)]">{fmt(agg.grandTotal)} {agg.boqItem.unit}</span>
                      </div>
                      {agg.boqItem.quantity !== agg.grandTotal && (
                        <div className="flex items-center gap-2 text-xs py-1 text-[color:var(--color-amber)]">
                          <ArrowUpDown size={12} />
                          {t.quantities.boqQuantity}: {fmt(agg.boqItem.quantity)} ({t.quantities.difference}: {fmt((agg.grandTotal - agg.boqItem.quantity) || 0)})
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Compare Tab */}
      {activeTab === 'compare' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            {drawingsData.map(d => (
              <button
                key={d.id}
                onClick={() => setCompareIds(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id])}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors',
                  compareIds.includes(d.id)
                    ? 'border-[color:var(--color-amber)] bg-[color:var(--color-amber)]/10 text-[color:var(--color-amber)]'
                    : 'border-[color:var(--color-border)] text-[color:var(--color-text-secondary)] hover:border-[color:var(--color-amber)]/30'
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
          {compareDrawings.length >= 2 ? (
            <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[color:var(--color-surface)] border-b border-[color:var(--color-border)]">
                      <th className="text-start px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] sticky start-0 bg-[color:var(--color-surface)]">{t.quantities.colMetric}</th>
                      {compareDrawings.map(d => (
                        <th key={d.id} className="text-end px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-[color:var(--color-text-secondary)] min-w-[120px]">{d.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[color:var(--color-border)]/50">
                    {([
                      { key: 'Total Measurements', label: t.quantities.metricTotalMeasurements },
                      { key: 'Linear', label: t.quantities.metricLinear },
                      { key: 'Area', label: t.quantities.metricArea },
                      { key: 'Count', label: t.quantities.metricCount },
                    ] as const).map((metric, idx) => (
                      <tr key={metric.key} className={cn('hover:bg-[color:var(--color-amber)]/5 transition-colors', idx % 2 === 1 && 'bg-[color:var(--color-surface)]/30')}>
                        <td className="px-4 py-3 font-medium text-[color:var(--color-text)] sticky start-0 bg-[color:var(--color-surface-elevated)]">{metric.label}</td>
                        {compareDrawings.map(d => {
                          let val: number
                          if (metric.key === 'Total Measurements') val = d.measurements.length
                          else if (metric.key === 'Linear') val = d.measurements.filter(m => m.tool_type === 'line' || m.tool_type === 'polyline').reduce((s, m) => s + m.quantity, 0)
                          else if (metric.key === 'Area') val = d.measurements.filter(m => m.tool_type === 'area' || m.tool_type === 'rectangle' || m.tool_type === 'circle').reduce((s, m) => s + m.quantity, 0)
                          else val = d.measurements.filter(m => m.tool_type === 'count').reduce((s, m) => s + m.quantity, 0)
                          return (
                            <td key={d.id} className="px-4 py-3 text-end tabular-nums font-mono font-medium text-[color:var(--color-text)]">
                              {metric.key === 'Total Measurements' || metric.key === 'Count' ? val : fmt(val)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-sm text-[color:var(--color-text-secondary)]">{t.quantities.selectAtLeastTwo}</div>
          )}
        </div>
      )}
    </div>
  )
}
