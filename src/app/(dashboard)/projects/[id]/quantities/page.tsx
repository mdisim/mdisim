'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import type { Drawing, DrawingMeasurement, BOQItem } from '@/lib/types'
import { getDrawings, getDrawingMeasurements } from '@/app/actions/drawings'
import { getBOQItems } from '@/app/actions/boq'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
  const { id: projectId } = useParams<{ id: string }>()
  const [drawingsData, setDrawingsData] = useState<DrawingWithMeasurements[]>([])
  const [boqItems, setBOQItems] = useState<BOQItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'by-drawing' | 'by-boq' | 'compare'>('dashboard')
  const [expandedDrawings, setExpandedDrawings] = useState<Set<string>>(new Set())
  const [expandedBOQ, setExpandedBOQ] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [compareIds, setCompareIds] = useState<string[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    const [drawings, boq] = await Promise.all([
      getDrawings(projectId),
      getBOQItems(projectId),
    ])
    const withMeasurements = await Promise.all(
      drawings.map(async (d) => {
        const measurements = await getDrawingMeasurements(d.id)
        return { ...d, measurements }
      })
    )
    setDrawingsData(withMeasurements.filter(d => d.measurements.length > 0))
    setBOQItems(boq)
    setLoading(false)
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
        <div className="space-y-3">{[1, 2, 3].map(i => <div key={i} className="h-20 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse" />)}</div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/20">
          <BarChart3 size={22} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Quantity Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Aggregate and compare quantities across drawings</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {([
          { label: 'Drawings', value: String(drawingsData.length), icon: FileText, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Measurements', value: String(allMeasurements.length), icon: Layers, gradient: 'from-indigo-500 to-indigo-600' },
          { label: 'Linear Total', value: fmt(totalLinear), icon: Ruler, gradient: 'from-green-500 to-emerald-600' },
          { label: 'Area Total', value: fmt(totalArea), icon: Square, gradient: 'from-amber-500 to-amber-600' },
          { label: 'Count Total', value: String(totalCounts), icon: Hash, gradient: 'from-purple-500 to-purple-600' },
        ] as const).map(kpi => (
          <Card key={kpi.label} className="relative overflow-hidden">
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
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200 dark:border-slate-700">
        {(['dashboard', 'by-drawing', 'by-boq', 'compare'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={cn(
            'px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize',
            activeTab === tab ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700'
          )}>{tab.replace('-', ' ')}</button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Drawing Quantity Summary</h3>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Drawing</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Number</th>
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Measurements</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Linear</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Area</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Counts</th>
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
                    <td colSpan={3} className="px-3 py-2 font-bold text-slate-700 dark:text-slate-200">Project Total</td>
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
              placeholder="Search drawings..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-2">
            {filteredDrawings.map(d => {
              const isExpanded = expandedDrawings.has(d.id)
              return (
                <Card key={d.id}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/50"
                    onClick={() => setExpandedDrawings(prev => { const n = new Set(prev); n.has(d.id) ? n.delete(d.id) : n.add(d.id); return n })}
                  >
                    {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    <FileText size={16} className="text-blue-500" />
                    <span className="font-medium text-slate-900 dark:text-white text-sm flex-1">{d.name}</span>
                    {d.drawing_number && <span className="text-xs font-mono text-slate-400">{d.drawing_number}</span>}
                    <Badge variant="info">{d.measurements.length} measurements</Badge>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-700 overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900">
                            <th className="text-left px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Label</th>
                            <th className="text-center px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Tool</th>
                            <th className="text-right px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Quantity</th>
                            <th className="text-center px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Unit</th>
                            <th className="text-center px-3 py-1.5 font-semibold text-slate-600 dark:text-slate-300">Page</th>
                          </tr>
                        </thead>
                        <tbody>
                          {d.measurements.map((m, i) => (
                            <tr key={m.id} className="border-b border-slate-100 dark:border-slate-700">
                              <td className="px-3 py-1.5 text-slate-700 dark:text-slate-200">{m.label || `Measurement ${i + 1}`}</td>
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
              )
            })}
          </div>
        </div>
      )}

      {/* By BOQ Tab */}
      {activeTab === 'by-boq' && (
        <div className="space-y-2">
          {boqAggregations.length === 0 ? (
            <div className="text-center py-12 text-sm text-slate-400">No BOQ items linked to drawing measurements.</div>
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
                    <Badge variant="info">{agg.byDrawing.length} drawings</Badge>
                  </div>
                  {isExpanded && (
                    <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-2 space-y-1">
                      {agg.byDrawing.map(bd => (
                        <div key={bd.drawing.id} className="flex items-center gap-2 text-xs py-1">
                          <FileText size={12} className="text-slate-400" />
                          <span className="text-slate-600 dark:text-slate-300 flex-1">{bd.drawing.name}</span>
                          <span className="tabular-nums text-slate-500">{bd.measurements.length} measurements</span>
                          <span className="tabular-nums font-medium text-slate-900 dark:text-white">{fmt(bd.total)} {agg.boqItem.unit}</span>
                        </div>
                      ))}
                      <div className="flex items-center gap-2 text-xs py-1 pt-2 border-t border-slate-100 dark:border-slate-700">
                        <span className="flex-1 font-semibold text-slate-700 dark:text-slate-200">Total from drawings</span>
                        <span className="tabular-nums font-bold text-blue-600 dark:text-blue-400">{fmt(agg.grandTotal)} {agg.boqItem.unit}</span>
                      </div>
                      {agg.boqItem.quantity !== agg.grandTotal && (
                        <div className="flex items-center gap-2 text-xs py-1 text-amber-600 dark:text-amber-400">
                          <ArrowUpDown size={12} />
                          BOQ Quantity: {fmt(agg.boqItem.quantity)} (difference: {fmt(agg.grandTotal - agg.boqItem.quantity)})
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
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 sticky left-0 bg-slate-50 dark:bg-slate-900">Metric</th>
                      {compareDrawings.map(d => (
                        <th key={d.id} className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 min-w-[120px]">{d.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {['Total Measurements', 'Linear', 'Area', 'Count'].map(metric => (
                      <tr key={metric} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200 sticky left-0 bg-white dark:bg-slate-800">{metric}</td>
                        {compareDrawings.map(d => {
                          let val: number
                          if (metric === 'Total Measurements') val = d.measurements.length
                          else if (metric === 'Linear') val = d.measurements.filter(m => m.tool_type === 'line' || m.tool_type === 'polyline').reduce((s, m) => s + m.quantity, 0)
                          else if (metric === 'Area') val = d.measurements.filter(m => m.tool_type === 'area' || m.tool_type === 'rectangle' || m.tool_type === 'circle').reduce((s, m) => s + m.quantity, 0)
                          else val = d.measurements.filter(m => m.tool_type === 'count').reduce((s, m) => s + m.quantity, 0)
                          return (
                            <td key={d.id} className="px-3 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-white">
                              {metric === 'Total Measurements' || metric === 'Count' ? val : fmt(val)}
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
            <div className="text-center py-12 text-sm text-slate-400">Select at least 2 drawings to compare.</div>
          )}
        </div>
      )}
    </div>
  )
}
