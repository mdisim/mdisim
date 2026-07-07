'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
import {
  GitCompare, Clock, Plus, Minus, RefreshCw, ArrowRight, TrendingUp, TrendingDown,
  FileText, Layers, ChevronDown, ChevronRight,
} from 'lucide-react'
import type { DrawingRevision } from '@/lib/types'

type RevisionWithDrawing = DrawingRevision & { drawingName: string }

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof RefreshCw }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-6 h-6 rounded-[var(--radius-sm)] bg-[var(--color-brand-tint)] flex items-center justify-center text-[var(--color-brand)]">
          <Icon size={12} />
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">{label}</span>
      </div>
      <div className="text-lg font-bold tabular-nums text-[var(--color-text)]">{value}</div>
    </div>
  )
}

export function RevisionsMode() {
  const { data, fmt } = useWorkspace()
  const [selectedDrawingId, setSelectedDrawingId] = useState('')
  const [revA, setRevA] = useState('')
  const [revB, setRevB] = useState('')
  const [expandedTimeline, setExpandedTimeline] = useState<Set<string>>(new Set())

  const allRevisions = useMemo(() => {
    const all: RevisionWithDrawing[] = []
    for (const [drawingId, revs] of Object.entries(data.revisions)) {
      const d = data.drawings.find(d => d.id === drawingId)
      if (!d) continue
      revs.forEach(r => all.push({ ...r, drawingName: d.name }))
    }
    return all.sort((a, b) => new Date(b.revision_date).getTime() - new Date(a.revision_date).getTime())
  }, [data.revisions, data.drawings])

  const drawingsWithRevisions = useMemo(() =>
    data.drawings.filter(d => (data.revisions[d.id]?.length ?? 0) > 0),
    [data.drawings, data.revisions]
  )

  const selectedRevisions = selectedDrawingId ? (data.revisions[selectedDrawingId] ?? []) : []

  const comparisonChanges = useMemo(() => {
    if (!revA || !revB) return []
    return data.quantityChanges.filter(c => c.from_revision_id === revA && c.to_revision_id === revB)
  }, [data.quantityChanges, revA, revB])

  const totalAdditions = useMemo(() => data.quantityChanges.filter(c => (c.new_qty - c.previous_qty) > 0).reduce((s, c) => s + (c.new_qty - c.previous_qty), 0), [data.quantityChanges])
  const totalRemovals = useMemo(() => data.quantityChanges.filter(c => (c.new_qty - c.previous_qty) < 0).reduce((s, c) => s + Math.abs(c.new_qty - c.previous_qty), 0), [data.quantityChanges])
  const netChange = totalAdditions - totalRemovals

  const statusBadge = (status: string) => {
    const map: Record<string, 'success' | 'warning' | 'default'> = { current: 'success', draft: 'warning', superseded: 'default' }
    return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
  }

  if (allRevisions.length === 0 && data.quantityChanges.length === 0) {
    return (
      <EmptyState
        icon={GitCompare}
        title="No revisions recorded yet"
        description="Drawing revisions and the quantity changes between them show up here once a sheet has more than one revision on file."
      />
    )
  }

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total changes" value={String(data.quantityChanges.length)} icon={RefreshCw} />
        <Stat label="Additions" value={fmt(totalAdditions)} icon={Plus} />
        <Stat label="Removals" value={fmt(totalRemovals)} icon={Minus} />
        <Stat label="Net change" value={fmt(netChange)} icon={netChange >= 0 ? TrendingUp : TrendingDown} />
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitCompare size={15} className="text-[var(--color-brand)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Compare revisions</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">Drawing</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              value={selectedDrawingId}
              onChange={e => { setSelectedDrawingId(e.target.value); setRevA(''); setRevB('') }}
            >
              <option value="">Select a drawing…</option>
              {drawingsWithRevisions.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({data.revisions[d.id]?.length ?? 0} revisions)</option>
              ))}
            </select>
          </div>
          <div className="min-w-[160px]">
            <label className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">From</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              value={revA} onChange={e => setRevA(e.target.value)} disabled={!selectedDrawingId}
            >
              <option value="">Select…</option>
              {selectedRevisions.map(r => <option key={r.id} value={r.id}>Rev {r.revision_number} — {r.revision_date}</option>)}
            </select>
          </div>
          <ArrowRight size={16} className="text-[var(--color-brand)] mt-5 shrink-0" />
          <div className="min-w-[160px]">
            <label className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5 block">To</label>
            <select
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-ring)]"
              value={revB} onChange={e => setRevB(e.target.value)} disabled={!selectedDrawingId}
            >
              <option value="">Select…</option>
              {selectedRevisions.filter(r => r.id !== revA).map(r => <option key={r.id} value={r.id}>Rev {r.revision_number} — {r.revision_date}</option>)}
            </select>
          </div>
        </div>

        {revA && revB && (
          <div className="mt-4">
            {comparisonChanges.length === 0 ? (
              <EmptyState icon={FileText} title="No changes recorded" description="No quantity changes recorded between these revisions." compact />
            ) : (
              <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden overflow-x-auto">
                <table className="w-full text-[13px] border-collapse">
                  <thead>
                    <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border-strong)]">
                      <th className="text-start px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Description</th>
                      <th className="text-center px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Unit</th>
                      <th className="text-end px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Old qty</th>
                      <th className="text-end px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">New qty</th>
                      <th className="text-end px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Diff</th>
                      <th className="text-center px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonChanges.map(c => {
                      const diff = c.new_qty - c.previous_qty
                      return (
                        <tr key={c.id} className="border-b border-[var(--color-border-light)]">
                          <td className="px-3 py-2 text-[var(--color-text)]">{c.description}</td>
                          <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">{c.unit}</td>
                          <td className="px-3 py-2 text-end mono text-[var(--color-text-muted)]">{fmt(c.previous_qty)}</td>
                          <td className="px-3 py-2 text-end mono font-semibold text-[var(--color-text)]">{fmt(c.new_qty)}</td>
                          <td className={cn('px-3 py-2 text-end mono font-semibold', diff > 0 ? 'text-[var(--color-success)]' : diff < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]')}>
                            {diff > 0 ? '+' : ''}{fmt(diff)}
                          </td>
                          <td className="px-3 py-2 text-center"><Badge variant={diff > 0 ? 'success' : diff < 0 ? 'danger' : 'warning'}>{c.change_type}</Badge></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={15} className="text-[var(--color-brand)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Revision history timeline</span>
        </div>
        {allRevisions.length === 0 ? (
          <EmptyState icon={Layers} title="No revisions yet" description="No drawing revisions recorded yet." compact />
        ) : (
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-border)]" />
            <div className="space-y-3">
              {allRevisions.map(rev => {
                const isExpanded = expandedTimeline.has(rev.id)
                const relatedChanges = data.quantityChanges.filter(c => c.to_revision_id === rev.id || c.from_revision_id === rev.id)
                return (
                  <div key={rev.id} className="relative ps-10">
                    <div className={cn(
                      'absolute left-[10px] w-3 h-3 rounded-full border-2 border-[var(--color-surface-elevated)]',
                      rev.status === 'current' ? 'bg-[var(--color-success)]' : rev.status === 'draft' ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-text-muted)]',
                    )} style={{ top: '10px' }} />
                    <div
                      className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 cursor-pointer hover:border-[var(--color-brand)]/30 transition-colors"
                      onClick={() => setExpandedTimeline(prev => {
                        const next = new Set(prev)
                        next.has(rev.id) ? next.delete(rev.id) : next.add(rev.id)
                        return next
                      })}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {isExpanded ? <ChevronDown size={13} className="text-[var(--color-text-muted)] shrink-0" /> : <ChevronRight size={13} className="text-[var(--color-text-muted)] shrink-0" />}
                        <span className="font-semibold text-[var(--color-text)] text-[13px]">{rev.drawingName}</span>
                        <span className="text-[11px] font-mono text-[var(--color-text-muted)]">Rev {rev.revision_number}</span>
                        {statusBadge(rev.status)}
                        <span className="ms-auto text-[11px] font-mono text-[var(--color-text-muted)]">{rev.revision_date}</span>
                        {relatedChanges.length > 0 && <Badge variant="info">{relatedChanges.length} changes</Badge>}
                      </div>
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                          {rev.description && <p className="text-[13px] text-[var(--color-text-secondary)] mb-2">{rev.description}</p>}
                          {relatedChanges.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Quantity changes</span>
                              {relatedChanges.map(c => {
                                const diff = c.new_qty - c.previous_qty
                                return (
                                  <div key={c.id} className="flex items-center gap-2 text-[12px] py-1">
                                    {diff > 0 ? <Plus size={11} className="text-[var(--color-success)]" /> : diff < 0 ? <Minus size={11} className="text-[var(--color-danger)]" /> : <RefreshCw size={11} className="text-[var(--color-warning)]" />}
                                    <span className="text-[var(--color-text-secondary)] flex-1">{c.description}</span>
                                    <span className="mono text-[var(--color-text-muted)]">{fmt(c.previous_qty)} → {fmt(c.new_qty)} {c.unit}</span>
                                    <span className={cn('mono font-semibold', diff > 0 ? 'text-[var(--color-success)]' : diff < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]')}>
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
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {data.quantityChanges.length > 0 && (
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
          <div className="flex items-center gap-2 mb-4">
            <FileText size={15} className="text-[var(--color-brand)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">Quantity change report</span>
          </div>
          <div className="border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden overflow-x-auto">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[var(--color-surface)] border-b border-[var(--color-border-strong)]">
                  <th className="text-start px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Description</th>
                  <th className="text-center px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Unit</th>
                  <th className="text-end px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Previous</th>
                  <th className="text-end px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">New</th>
                  <th className="text-end px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Diff</th>
                  <th className="text-center px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Type</th>
                  <th className="text-start px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">Date</th>
                </tr>
              </thead>
              <tbody>
                {data.quantityChanges.map(c => {
                  const diff = c.new_qty - c.previous_qty
                  return (
                    <tr key={c.id} className="border-b border-[var(--color-border-light)]">
                      <td className="px-3 py-2 text-[var(--color-text)]">{c.description}</td>
                      <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">{c.unit}</td>
                      <td className="px-3 py-2 text-end mono text-[var(--color-text-muted)]">{fmt(c.previous_qty)}</td>
                      <td className="px-3 py-2 text-end mono font-semibold text-[var(--color-text)]">{fmt(c.new_qty)}</td>
                      <td className={cn('px-3 py-2 text-end mono font-semibold', diff > 0 ? 'text-[var(--color-success)]' : diff < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]')}>{diff > 0 ? '+' : ''}{fmt(diff)}</td>
                      <td className="px-3 py-2 text-center"><Badge variant={diff > 0 ? 'success' : diff < 0 ? 'danger' : 'warning'}>{c.change_type}</Badge></td>
                      <td className="px-3 py-2 text-[11px] font-mono text-[var(--color-text-muted)]">{c.created_at?.slice(0, 10)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
