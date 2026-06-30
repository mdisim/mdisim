'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import type { Drawing, DrawingRevision, QuantityChange } from '@/lib/types'
import { getDrawings } from '@/app/actions/drawings'
import { getDrawingRevisionsForProject } from '@/app/actions/drawing-revisions'
import { getQuantityChanges, createQuantityChange } from '@/app/actions/drawing-revisions'
import { getBOQItems } from '@/app/actions/boq'
import { Badge } from '@/components/ui/badge'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import { StatCard } from '@/components/ui/stat-card'
import { EmptyState } from '@/components/ui/empty-state'
import { CardSkeleton } from '@/components/ui/skeleton'
import { motion, type Variants } from 'framer-motion'
import {
  GitCompare,
  Clock,
  Plus,
  Minus,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  FileText,
  Layers,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type RevisionWithDrawing = DrawingRevision & { drawingName: string }

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }

export default function RevisionsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [revisionMap, setRevisionMap] = useState<Record<string, DrawingRevision[]>>({})
  const [changes, setChanges] = useState<QuantityChange[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedDrawingId, setSelectedDrawingId] = useState<string>('')
  const [revA, setRevA] = useState<string>('')
  const [revB, setRevB] = useState<string>('')
  const [expandedTimeline, setExpandedTimeline] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [drawingList, qtyChanges] = await Promise.all([
        getDrawings(projectId),
        getQuantityChanges(projectId),
      ])
      setDrawings(drawingList)
      setChanges(qtyChanges)

      const allRevisions = await getDrawingRevisionsForProject(projectId)
      const revMap: Record<string, DrawingRevision[]> = {}
      for (const rev of allRevisions) {
        if (!revMap[rev.drawing_id]) revMap[rev.drawing_id] = []
        revMap[rev.drawing_id].push(rev)
      }
      setRevisionMap(revMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load revisions')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const allRevisions = useMemo(() => {
    const all: RevisionWithDrawing[] = []
    for (const [drawingId, revs] of Object.entries(revisionMap)) {
      const d = drawings.find(d => d.id === drawingId)
      if (!d) continue
      revs.forEach(r => all.push({ ...r, drawingName: d.name }))
    }
    return all.sort((a, b) => new Date(b.revision_date).getTime() - new Date(a.revision_date).getTime())
  }, [revisionMap, drawings])

  const drawingsWithRevisions = useMemo(() =>
    drawings.filter(d => (revisionMap[d.id]?.length ?? 0) > 0),
    [drawings, revisionMap]
  )

  const selectedRevisions = selectedDrawingId ? (revisionMap[selectedDrawingId] ?? []) : []

  const comparisonChanges = useMemo(() => {
    if (!revA || !revB) return []
    return changes.filter(c => c.from_revision_id === revA && c.to_revision_id === revB)
  }, [changes, revA, revB])

  const totalAdditions = useMemo(() => changes.filter(c => (c.new_qty - c.previous_qty) > 0).reduce((s, c) => s + (c.new_qty - c.previous_qty), 0), [changes])
  const totalRemovals = useMemo(() => changes.filter(c => (c.new_qty - c.previous_qty) < 0).reduce((s, c) => s + Math.abs(c.new_qty - c.previous_qty), 0), [changes])
  const totalModifications = changes.length
  const netChange = totalAdditions - totalRemovals

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
      current: 'success', draft: 'warning', superseded: 'default',
    }
    return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0a0b0f] dark:via-[#0f1117] dark:to-[#0a0b0f]">
        <div className="mx-auto max-w-7xl p-4 md:p-8 space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl premium-skeleton" />
            <div className="space-y-2">
              <div className="h-7 w-48 premium-skeleton" />
              <div className="h-4 w-64 premium-skeleton" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => <CardSkeleton key={i} />)}
          </div>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error && drawings.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0a0b0f] dark:via-[#0f1117] dark:to-[#0a0b0f] flex items-center justify-center p-8">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={28} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Unable to Load Revisions</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{error}</p>
          <button onClick={load} className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-amber-500 text-white text-sm font-semibold rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all">
            Retry
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-[#0a0b0f] dark:via-[#0f1117] dark:to-[#0a0b0f]">
      <motion.div
        className="mx-auto max-w-7xl space-y-6 p-4 md:p-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <PageHeader
          icon={GitCompare}
          title="Drawing Revisions"
          subtitle="Compare revisions, track quantity changes, revision history"
          gradient="from-amber-500 to-amber-600"
          className="mb-0"
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {([
            { label: 'Total Changes', value: totalModifications, icon: RefreshCw, gradient: 'from-blue-500 to-blue-600' },
            { label: 'Additions', value: totalAdditions, icon: Plus, gradient: 'from-green-500 to-emerald-600', decimals: 2 },
            { label: 'Removals', value: totalRemovals, icon: Minus, gradient: 'from-red-500 to-red-600', decimals: 2 },
            { label: 'Net Change', value: netChange, icon: netChange >= 0 ? TrendingUp : TrendingDown, gradient: netChange >= 0 ? 'from-emerald-500 to-emerald-600' : 'from-red-500 to-rose-600', decimals: 2 },
          ] as const).map(kpi => (
            <motion.div key={kpi.label} variants={fadeUp}>
              <StatCard
                label={kpi.label}
                value={kpi.value}
                icon={kpi.icon}
                gradient={kpi.gradient}
                decimals={'decimals' in kpi ? kpi.decimals : 0}
                glass
                compact
              />
            </motion.div>
          ))}
        </div>

        {/* Compare Section */}
        <motion.div variants={fadeUp}>
          <SectionCard title="Compare Revisions" icon={GitCompare} iconColor="text-purple-500" glass>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Drawing</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  value={selectedDrawingId}
                  onChange={e => { setSelectedDrawingId(e.target.value); setRevA(''); setRevB('') }}
                >
                  <option value="">Select drawing...</option>
                  {drawingsWithRevisions.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({revisionMap[d.id]?.length ?? 0} revisions)</option>
                  ))}
                </select>
              </div>
              <div className="min-w-[160px]">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Revision A (From)</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" value={revA} onChange={e => setRevA(e.target.value)} disabled={!selectedDrawingId}>
                  <option value="">Select...</option>
                  {selectedRevisions.map(r => (
                    <option key={r.id} value={r.id}>Rev {r.revision_number} — {r.revision_date}</option>
                  ))}
                </select>
              </div>
              <ArrowRight size={20} className="text-slate-400 mt-4" />
              <div className="min-w-[160px]">
                <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Revision B (To)</label>
                <select className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500" value={revB} onChange={e => setRevB(e.target.value)} disabled={!selectedDrawingId}>
                  <option value="">Select...</option>
                  {selectedRevisions.filter(r => r.id !== revA).map(r => (
                    <option key={r.id} value={r.id}>Rev {r.revision_number} — {r.revision_date}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Comparison results */}
            {revA && revB && (
              <div className="mt-4">
                {comparisonChanges.length === 0 ? (
                  <EmptyState
                    icon={CheckCircle2}
                    title="No changes recorded"
                    description="No quantity changes recorded between these revisions."
                    compact
                  />
                ) : (
                  <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden overflow-x-auto hover-lift">
                    <table className="w-full text-sm min-w-[600px]">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                          <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Description</th>
                          <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Unit</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Old Qty</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">New Qty</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Difference</th>
                          <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">% Change</th>
                          <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparisonChanges.map(c => {
                          const diff = c.new_qty - c.previous_qty
                          const pct = c.previous_qty !== 0 ? (diff / c.previous_qty) * 100 : 100
                          return (
                            <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                              <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{c.description}</td>
                              <td className="px-3 py-2 text-center text-slate-500">{c.unit}</td>
                              <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(c.previous_qty)}</td>
                              <td className="px-3 py-2 text-right tabular-nums font-medium text-slate-900 dark:text-white">{fmt(c.new_qty)}</td>
                              <td className={cn('px-3 py-2 text-right tabular-nums font-medium', diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-500')}>
                                {diff > 0 ? '+' : ''}{fmt(diff)}
                              </td>
                              <td className={cn('px-3 py-2 text-right tabular-nums', diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-500')}>
                                {diff > 0 ? '+' : ''}{pct.toFixed(1)}%
                              </td>
                              <td className="px-3 py-2 text-center">
                                <Badge variant={diff > 0 ? 'success' : diff < 0 ? 'danger' : 'warning'}>
                                  {c.change_type}
                                </Badge>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* Revision Timeline */}
        <motion.div variants={fadeUp}>
          <SectionCard title="Revision History Timeline" icon={Clock} iconColor="text-blue-500">
            {allRevisions.length === 0 ? (
              <EmptyState
                icon={Layers}
                title="No revisions yet"
                description="No drawing revisions recorded yet."
                compact
              />
            ) : (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
                <div className="space-y-4">
                  {allRevisions.map((rev, i) => {
                    const isExpanded = expandedTimeline.has(rev.id)
                    const relatedChanges = changes.filter(c => c.to_revision_id === rev.id || c.from_revision_id === rev.id)
                    return (
                      <motion.div
                        key={rev.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className="relative pl-10"
                      >
                        <div className={cn(
                          'absolute left-2.5 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800',
                          rev.status === 'current' ? 'bg-green-500' : rev.status === 'draft' ? 'bg-amber-500' : 'bg-slate-400',
                        )} style={{ top: '6px' }} />
                        <div
                          className="premium-card hover-lift rounded-lg p-3 cursor-pointer"
                          onClick={() => setExpandedTimeline(prev => {
                            const next = new Set(prev)
                            next.has(rev.id) ? next.delete(rev.id) : next.add(rev.id)
                            return next
                          })}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={14} className="text-slate-400" /> : <ChevronRight size={14} className="text-slate-400" />}
                            <span className="font-medium text-slate-900 dark:text-white text-sm">{rev.drawingName}</span>
                            <span className="text-xs font-mono text-slate-500">Rev {rev.revision_number}</span>
                            {statusBadge(rev.status)}
                            <span className="ml-auto text-xs text-slate-400">{rev.revision_date}</span>
                            {relatedChanges.length > 0 && (
                              <Badge variant="info">{relatedChanges.length} changes</Badge>
                            )}
                          </div>
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                              {rev.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-300 mb-2">{rev.description}</p>
                              )}
                              {relatedChanges.length > 0 && (
                                <div className="space-y-1">
                                  <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Quantity Changes</span>
                                  {relatedChanges.map(c => {
                                    const diff = c.new_qty - c.previous_qty
                                    return (
                                      <div key={c.id} className="flex items-center gap-2 text-xs py-1">
                                        {diff > 0 ? <Plus size={12} className="text-green-500" /> : diff < 0 ? <Minus size={12} className="text-red-500" /> : <RefreshCw size={12} className="text-amber-500" />}
                                        <span className="text-slate-600 dark:text-slate-300 flex-1">{c.description}</span>
                                        <span className="tabular-nums text-slate-500">{fmt(c.previous_qty)} → {fmt(c.new_qty)} {c.unit}</span>
                                        <span className={cn('tabular-nums font-medium', diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-500')}>
                                          ({diff > 0 ? '+' : ''}{fmt(diff)})
                                        </span>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>
            )}
          </SectionCard>
        </motion.div>

        {/* All Quantity Changes Table */}
        {changes.length > 0 && (
          <motion.div variants={fadeUp}>
            <SectionCard title="Quantity Change Report" icon={FileText} iconColor="text-amber-500">
              <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Description</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Unit</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Previous</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">New</th>
                      <th className="text-right px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Diff</th>
                      <th className="text-center px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Type</th>
                      <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {changes.map(c => {
                      const diff = c.new_qty - c.previous_qty
                      return (
                        <tr key={c.id} className="border-b border-slate-100 dark:border-slate-700">
                          <td className="px-3 py-2 text-slate-700 dark:text-slate-200">{c.description}</td>
                          <td className="px-3 py-2 text-center text-slate-500">{c.unit}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-slate-500">{fmt(c.previous_qty)}</td>
                          <td className="px-3 py-2 text-right tabular-nums font-medium">{fmt(c.new_qty)}</td>
                          <td className={cn('px-3 py-2 text-right tabular-nums font-medium', diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-slate-500')}>
                            {diff > 0 ? '+' : ''}{fmt(diff)}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <Badge variant={diff > 0 ? 'success' : diff < 0 ? 'danger' : 'warning'}>{c.change_type}</Badge>
                          </td>
                          <td className="px-3 py-2 text-xs text-slate-400">{c.created_at?.slice(0, 10)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}
