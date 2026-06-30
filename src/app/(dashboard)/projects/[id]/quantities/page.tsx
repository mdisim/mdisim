'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import type { Drawing, DrawingMeasurement, BOQItem } from '@/lib/types'
import { getDrawings, getDrawingMeasurements } from '@/app/actions/drawings'
import { getBOQItems } from '@/app/actions/boq'
import { Card, CardContent } from '@/components/ui/card'
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
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <TableSkeleton rows={6} columns={4} />
      </div>
    )
  }

  if (error && !loading && drawingsData.length === 0) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={load} className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700">{t.quantities.retry}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/20">
          <BarChart3 size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{t.quantities.title}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.quantities.subtitle}</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {([
          { label: t.quantities.kpiDrawings, value: String(drawingsData.length), icon: FileText, gradient: 'from-blue-500 to-blue-600' },
          { label: t.quantities.kpiMeasurements, value: String(allMeasurements.length), icon: Layers, gradient: 'from-indigo-500 to-indigo-600' },
          { label: t.quantities.kpiLinearTotal, value: fmt(totalLinear), icon: Ruler, gradient: 'from-green-500 to-emerald-600' },
          { label: t.quantities.kpiAreaTotal, value: fmt(totalArea), icon: Square, gradient: 'from-amber-500 to-amber-600' },
          { label: t.quantities.kpiCountTotal, value: String(totalCounts), icon: Hash, gradient: 'from-purple-500 to-purple-600' },
        ] as const).map((kpi, idx) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: idx * 0.04 }}
          >
          <Card className="relative overflow-hidden">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn('p-1 rounded-md bg-gradient-to-br text-white', kpi.gradient)}>
                  <kpi.icon size={12} />
                </div>
                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</span>
              </div>
              <div className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{kpi.value}</div>
              <kpi.icon size={48} className="absolute -bottom-2 -right-2 text-slate-100 dark:text-slate-700/30" />
            </CardContent>
          </Card>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
        {([
          { key: 'dashboard', label: t.quantities.tabDashboard },
          { key: 'by-drawing', label: t.quantities.tabByDrawing },
          { key: 'by-boq', label: t.quantities.tabByBoq },
          { key: 'compare', label: t.quantities.tabCompare },
        ] as const).map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
            activeTab === tab.key ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'
          )}>{tab.label}</button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">{t.quantities.drawingSummary}</h3>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colDrawing}</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colNumber}</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colType}</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colMeasurements}</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colLinear}</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colArea}</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colCounts}</th>
                  </tr>
                </thead>
                <tbody>
                  {drawingsData.map(d => {
                    const linear = d.measurements.filter(m => m.tool_type === 'line' || m.tool_type === 'polyline').reduce((s, m) => s + m.quantity, 0)
                    const area = d.measurements.filter(m => m.tool_type === 'area' || m.tool_type === 'rectangle' || m.tool_type === 'circle').reduce((s, m) => s + m.quantity, 0)
                    const counts = d.measurements.filter(m => m.tool_type === 'count').reduce((s, m) => s + m.quantity, 0)
                    return (
                      <tr key={d.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{d.name}</td>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{d.drawing_number ?? '-'}</td>
                        <td className="px-3 py-2"><Badge variant="default">{d.drawing_type}</Badge></td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{d.measurements.length}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{linear > 0 ? fmt(linear) : '-'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{area > 0 ? fmt(area) : '-'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600 dark:text-slate-300">{counts > 0 ? counts : '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-600">
                    <td colSpan={3} className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">{t.quantities.projectTotal}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{allMeasurements.length}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{fmt(totalLinear)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{fmt(totalArea)}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-bold">{totalCounts}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* By Drawing Tab */}
      {activeTab === 'by-drawing' && (
        <div>
          <div className="mb-3 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t.quantities.searchDrawings}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <Card>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    onClick={() => setExpandedDrawings(prev => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n })}
                  >
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    <FileText size={16} className="text-blue-500" />
                    <span className="font-medium text-slate-900 dark:text-white text-sm flex-1">{d.name}</span>
                    {d.drawing_number && <span className="text-xs font-mono text-slate-400">{d.drawing_number}</span>}
                    <Badge variant="info">{d.measurements.length} {t.quantities.measurementsCount}</Badge>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900">
                            <th className="text-left px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colLabel}</th>
                            <th className="text-center px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colTool}</th>
                            <th className="text-right px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colQuantity}</th>
                            <th className="text-center px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colUnit}</th>
                            <th className="text-center px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">{t.quantities.colPage}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.measurements.map((m, i) => (
                            <tr key={m.id} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{m.label || `${t.quantities.measurementFallback} ${i + 1}`}</td>
                              <td className="px-3 py-1.5 text-center"><Badge variant="default">{m.tool_type}</Badge></td>
                              <td className="px-3 py-1.5 text-right tabular-nums font-medium">{fmt(m.quantity)}</td>
                              <td className="px-3 py-1.5 text-center text-slate-500">{m.unit ?? 'px'}</td>
                              <td className="px-3 py-1.5 text-center text-slate-500">{m.page_number}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card>
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
            <div className="text-center py-12 text-sm text-slate-400">{t.quantities.noBoqLinked}</div>
          ) : (
            boqAggregations.map(agg => {
              const isExpanded = expandedBOQ.has(agg.boqItem.id)
              return (
                <Card key={agg.boqItem.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    onClick={() => setExpandedBOQ(prev => { const n = new Set(prev); n.has(agg.boqItem.id) ? n.delete(agg.boqItem.id) : n.add(agg.boqItem.id); return n })}
                  >
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    <span className="font-mono text-xs text-slate-400">{agg.boqItem.code ?? '-'}</span>
                    <span className="font-medium text-slate-900 dark:text-white text-sm flex-1">{agg.boqItem.description}</span>
                    <span className="text-xs text-slate-500">{agg.boqItem.unit}</span>
                    <span className="text-sm font-bold tabular-nums text-blue-600 dark:text-blue-400">{fmt(agg.grandTotal)}</span>
                    <Badge variant="info">{agg.byDrawing.length} {t.quantities.drawingsCount}</Badge>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 space-y-1">
                      {agg.byDrawing.map(bd => (
                        <div key={bd.drawing.id} className="flex items-center gap-2 text-xs py-1">
                          <FileText size={12} className="text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-300 flex-1">{bd.drawing.name}</span>
                          <span className="tabular-nums text-slate-500">{bd.measurements.length} {t.quantities.measurementsCount}</span>
                          <span className="tabular-nums font-medium text-slate-900 dark:text-white">{fmt(bd.total)} {agg.boqItem.unit}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-xs py-1 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <span className="flex-1 font-semibold text-slate-700 dark:text-slate-200">{t.quantities.totalFromDrawings}</span>
                        <span className="tabular-nums font-bold text-blue-600 dark:text-blue-400">{fmt(agg.grandTotal)} {agg.boqItem.unit}</span>
                      </div>
                      {agg.boqItem.quantity !== agg.grandTotal && (
                        <div className="flex items-center gap-2 text-xs py-1 text-amber-600 dark:text-amber-400">
                          <ArrowUpDown size={12} />
                          {t.quantities.boqQuantity}: {fmt(agg.boqItem.quantity)} ({t.quantities.difference}: {fmt((agg.grandTotal - agg.boqItem.quantity) || 0)})
                        </div>
                      )}
                    </div>
                  )}
                </Card>
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
                  'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                  compareIds.includes(d.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                )}
              >
                {d.name}
              </button>
            ))}
          </div>
          {compareDrawings.length >= 2 ? (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900">{t.quantities.colMetric}</th>
                      {compareDrawings.map(d => (
                        <th key={d.id} className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 min-w-[120px]">{d.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([
                      { key: 'Total Measurements', label: t.quantities.metricTotalMeasurements },
                      { key: 'Linear', label: t.quantities.metricLinear },
                      { key: 'Area', label: t.quantities.metricArea },
                      { key: 'Count', label: t.quantities.metricCount },
                    ] as const).map(metric => (
                      <tr key={metric.key} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800">{metric.label}</td>
                        {compareDrawings.map(d => {
                          let val: number
                          if (metric.key === 'Total Measurements') val = d.measurements.length
                          else if (metric.key === 'Linear') val = d.measurements.filter(m => m.tool_type === 'line' || m.tool_type === 'polyline').reduce((s, m) => s + m.quantity, 0)
                          else if (metric.key === 'Area') val = d.measurements.filter(m => m.tool_type === 'area' || m.tool_type === 'rectangle' || m.tool_type === 'circle').reduce((s, m) => s + m.quantity, 0)
                          else val = d.measurements.filter(m => m.tool_type === 'count').reduce((s, m) => s + m.quantity, 0)
                          return (
                            <td key={d.id} className="px-3 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                              {metric.key === 'Total Measurements' || metric.key === 'Count' ? val : fmt(val)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ) : (
            <div className="text-center py-12 text-sm text-slate-400">{t.quantities.selectAtLeastTwo}</div>
          )}
        </div>
      )}
    </div>
  )
}
