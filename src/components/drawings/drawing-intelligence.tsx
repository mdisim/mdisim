'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import type { Drawing, DrawingRevision, QuantityChange, BOQItem } from '@/lib/types'
import { getDrawingRevisions, getQuantityChanges } from '@/app/actions/drawing-revisions'
import { getDrawingMeasurements } from '@/app/actions/drawings'
import { getBOQItems, updateBOQItem } from '@/app/actions/boq'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileText,
  ArrowRight,
  Zap,
  RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DrawingIntelligenceProps {
  projectId: string
  drawings: Drawing[]
}

interface Suggestion {
  id: string
  boqItem: BOQItem
  currentQty: number
  suggestedQty: number
  source: string
  status: 'pending' | 'applied' | 'dismissed'
}

export function DrawingIntelligence({ projectId, drawings }: DrawingIntelligenceProps) {
  const [changes, setChanges] = useState<QuantityChange[]>([])
  const [boqItems, setBOQItems] = useState<BOQItem[]>([])
  const [revisionMap, setRevisionMap] = useState<Record<string, DrawingRevision[]>>({})
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [qtyChanges, boq] = await Promise.all([
      getQuantityChanges(projectId),
      getBOQItems(projectId),
    ])
    setChanges(qtyChanges)
    setBOQItems(boq)

    const revMap: Record<string, DrawingRevision[]> = {}
    await Promise.all(
      drawings.map(async (d) => {
        const revs = await getDrawingRevisions(d.id)
        if (revs.length > 0) revMap[d.id] = revs
      })
    )
    setRevisionMap(revMap)

    const sugs: Suggestion[] = qtyChanges
      .filter(c => c.boq_item_id)
      .map(c => {
        const boqItem = boq.find(b => b.id === c.boq_item_id)
        if (!boqItem) return null
        return {
          id: c.id,
          boqItem,
          currentQty: boqItem.quantity,
          suggestedQty: c.new_qty,
          source: c.description,
          status: 'pending' as const,
        }
      })
      .filter(Boolean) as Suggestion[]
    setSuggestions(sugs)
    setLoading(false)
  }, [projectId, drawings])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const drawingsWithRevisions = drawings.filter(d => (revisionMap[d.id]?.length ?? 0) > 0)
  const totalChanges = changes.length
  const additions = changes.filter(c => c.new_qty > c.previous_qty)
  const removals = changes.filter(c => c.new_qty < c.previous_qty)
  const pendingSuggestions = suggestions.filter(s => s.status === 'pending')

  const costImpact = useMemo(() => {
    return changes.reduce((sum, c) => {
      const boq = boqItems.find(b => b.id === c.boq_item_id)
      if (!boq || !boq.unit_rate) return sum
      return sum + (c.new_qty - c.previous_qty) * boq.unit_rate
    }, 0)
  }, [changes, boqItems])

  const handleApply = async (sug: Suggestion) => {
    await updateBOQItem(sug.boqItem.id, { quantity: sug.suggestedQty })
    setSuggestions(prev => prev.map(s => s.id === sug.id ? { ...s, status: 'applied' } : s))
  }

  const handleDismiss = (id: string) => {
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status: 'dismissed' } : s))
  }

  if (loading) {
    return <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-16 bg-white dark:bg-slate-800 rounded-xl animate-pulse" />)}</div>
  }

  return (
    <div className="space-y-4">
      {/* Intelligence KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {([
          { label: 'Drawings Analyzed', value: String(drawingsWithRevisions.length), icon: FileText, gradient: 'from-blue-500 to-blue-600' },
          { label: 'Changes Detected', value: String(totalChanges), icon: RefreshCw, gradient: 'from-amber-500 to-amber-600' },
          { label: 'Additions', value: String(additions.length), icon: TrendingUp, gradient: 'from-green-500 to-emerald-600' },
          { label: 'Removals', value: String(removals.length), icon: TrendingDown, gradient: 'from-red-500 to-red-600' },
          { label: 'Cost Impact', value: fmt(costImpact), icon: Zap, gradient: costImpact >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-rose-600' },
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
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revision Impact Analysis */}
      {changes.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              Revision Impact Analysis
            </h3>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Item</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Old Qty</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">New Qty</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Change</th>
                    <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Cost Impact</th>
                    <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.slice(0, 20).map(c => {
                    const diff = c.new_qty - c.previous_qty
                    const boq = boqItems.find(b => b.id === c.boq_item_id)
                    const impact = boq?.unit_rate ? diff * boq.unit_rate : 0
                    return (
                      <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700">
                        <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{c.description}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(c.previous_qty)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(c.new_qty)}</td>
                        <td className={cn('px-3 py-2 text-right tabular-nums font-medium', diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-500')}>
                          {diff > 0 ? '+' : ''}{fmt(diff)}
                        </td>
                        <td className={cn('px-3 py-2 text-right tabular-nums', impact > 0 ? 'text-green-600' : impact < 0 ? 'text-red-600' : 'text-slate-500')}>
                          {impact !== 0 ? fmt(impact) : '-'}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant={diff > 0 ? 'success' : diff < 0 ? 'danger' : 'warning'}>{c.change_type}</Badge>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Auto Update Suggestions */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Brain size={16} className="text-purple-500" />
            Auto Quantity Update Suggestions
            {pendingSuggestions.length > 0 && (
              <Badge variant="warning">{pendingSuggestions.length} pending</Badge>
            )}
          </h3>

          {suggestions.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              <CheckCircle2 size={32} className="mx-auto mb-2 text-green-400" />
              No update suggestions. All quantities are up to date.
            </div>
          ) : (
            <div className="space-y-2">
              {suggestions.map(sug => {
                const diff = sug.suggestedQty - sug.currentQty
                return (
                  <div
                    key={sug.id}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                      sug.status === 'applied' ? 'border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10' :
                      sug.status === 'dismissed' ? 'border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/50 opacity-50' :
                      'border-blue-200 bg-blue-50/30 dark:border-blue-800 dark:bg-blue-900/10'
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white">{sug.boqItem.description}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {sug.boqItem.code && <span className="font-mono mr-2">{sug.boqItem.code}</span>}
                        {sug.source}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="tabular-nums text-slate-500">{fmt(sug.currentQty)}</span>
                      <ArrowRight size={14} className="text-slate-400" />
                      <span className={cn('tabular-nums font-medium', diff > 0 ? 'text-green-600' : 'text-red-600')}>{fmt(sug.suggestedQty)}</span>
                      <span className="text-xs text-slate-400">{sug.boqItem.unit}</span>
                    </div>
                    {sug.status === 'pending' ? (
                      <div className="flex items-center gap-1">
                        <Button size="sm" onClick={() => handleApply(sug)}>
                          <CheckCircle2 size={12} /> Apply
                        </Button>
                        <button
                          onClick={() => handleDismiss(sug.id)}
                          className="p-1.5 rounded text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <Badge variant={sug.status === 'applied' ? 'success' : 'default'}>
                        {sug.status}
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
