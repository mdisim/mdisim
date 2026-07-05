'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import type { DrawingRevision, QuantityChange } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Clock, Plus, Minus, RefreshCw, Layers, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export type RevisionWithDrawing = DrawingRevision & { drawingName: string }

function statusBadge(status: string) {
  const map: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    current: 'success', draft: 'warning', superseded: 'default',
  }
  return <Badge variant={map[status] ?? 'default'}>{status}</Badge>
}

function fmt(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

interface RevisionTimelineProps {
  revisions: RevisionWithDrawing[]
  changes: QuantityChange[]
  emptyDescription?: string
}

export function RevisionTimeline({ revisions, changes, emptyDescription }: RevisionTimelineProps) {
  const [expandedTimeline, setExpandedTimeline] = useState<Set<string>>(new Set())

  if (revisions.length === 0) {
    return (
      <EmptyState
        icon={Layers}
        title="No revisions yet"
        description={emptyDescription ?? 'No drawing revisions recorded yet.'}
        compact
      />
    )
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-[var(--color-border)]" />
      <div className="space-y-3">
        {revisions.map((rev, i) => {
          const isExpanded = expandedTimeline.has(rev.id)
          const relatedChanges = changes.filter((c) => c.to_revision_id === rev.id || c.from_revision_id === rev.id)
          return (
            <motion.div
              key={rev.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative ps-10"
            >
              <div className={cn(
                'absolute left-[10px] w-3 h-3 rounded-full border-2 border-[var(--color-surface)]',
                rev.status === 'current' ? 'bg-green-500' : rev.status === 'draft' ? 'bg-[var(--color-amber)]' : 'bg-[var(--color-text-muted)]',
              )} style={{ top: '10px' }} />

              <div
                className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-3 cursor-pointer hover:border-[var(--color-amber)]/30 transition-colors"
                onClick={() => setExpandedTimeline((prev) => {
                  const next = new Set(prev)
                  next.has(rev.id) ? next.delete(rev.id) : next.add(rev.id)
                  return next
                })}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  {isExpanded
                    ? <ChevronDown size={13} className="text-[var(--color-text-muted)] shrink-0" />
                    : <ChevronRight size={13} className="text-[var(--color-text-muted)] shrink-0" />
                  }
                  <span className="font-semibold text-[var(--color-text)] text-sm">{rev.drawingName}</span>
                  <span className="text-xs font-mono text-[var(--color-text-muted)]">Rev {rev.revision_number}</span>
                  {statusBadge(rev.status)}
                  <span className="ms-auto text-xs font-mono text-[var(--color-text-muted)]">{rev.revision_date}</span>
                  {relatedChanges.length > 0 && (
                    <Badge variant="info">{relatedChanges.length} changes</Badge>
                  )}
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                    {rev.description && (
                      <p className="text-sm text-[var(--color-text-secondary)] mb-2">{rev.description}</p>
                    )}
                    {relatedChanges.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Quantity Changes</span>
                        {relatedChanges.map((c) => {
                          const diff = c.new_qty - c.previous_qty
                          return (
                            <div key={c.id} className="flex items-center gap-2 text-xs py-1">
                              {diff > 0 ? <Plus size={11} className="text-green-500" /> : diff < 0 ? <Minus size={11} className="text-[var(--color-danger)]" /> : <RefreshCw size={11} className="text-[var(--color-amber)]" />}
                              <span className="text-[var(--color-text-secondary)] flex-1">{c.description}</span>
                              <span className="tabular-nums text-[var(--color-text-muted)]">{fmt(c.previous_qty)} → {fmt(c.new_qty)} {c.unit}</span>
                              <span className={cn('tabular-nums font-semibold', diff > 0 ? 'text-green-500' : diff < 0 ? 'text-[var(--color-danger)]' : 'text-[var(--color-text-muted)]')}>
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
  )
}
