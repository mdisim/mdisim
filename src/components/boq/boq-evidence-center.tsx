'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { BOQItem, MeasurementItem, QuantityAttachment, MeasurementSketch, QuantityChange, QuantityApproval, Drawing } from '@/lib/types'
import { getMeasurementItem } from '@/app/actions/measurements'
import { getAttachments, getAttachmentUrl } from '@/app/actions/attachments'
import { getSketches } from '@/app/actions/sketches'
import { getDrawings } from '@/app/actions/drawings'
import { getDrawingRevisionsForProject, getQuantityChanges } from '@/app/actions/drawing-revisions'
import { getApprovals } from '@/app/actions/quantity-approvals'
import { AttachmentsPanel } from '@/components/attachments/attachments-panel'
import { SketchGallery } from '@/components/sketches/sketch-gallery'
import { RevisionTimeline, type RevisionWithDrawing } from '@/components/drawings/revision-timeline'
import {
  X, Ruler, Image, Paperclip, GitBranch, History,
  ChevronRight, ExternalLink, Loader2, FileText,
  Hash, Square, ArrowUpDown, Calculator, Layers, BarChart3,
  ClipboardCheck, Clock,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type Tab = 'measurements' | 'sketches' | 'attachments' | 'drawings' | 'revisions' | 'history'

const TABS: { id: Tab; label: string; icon: typeof Ruler }[] = [
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'sketches', label: 'Sketches', icon: Image },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
  { id: 'drawings', label: 'Drawings', icon: GitBranch },
  { id: 'revisions', label: 'Revisions', icon: Clock },
  { id: 'history', label: 'History', icon: History },
]

function MeasurementTypeIcon({ type }: { type: string }) {
  if (type === 'area') return <Square size={12} className="text-[var(--color-amber)]" />
  if (type === 'length') return <ArrowUpDown size={12} className="text-[var(--color-info-light)]" />
  if (type === 'count') return <Hash size={12} className="text-[var(--color-success-light)]" />
  if (type === 'volume') return <Layers size={12} className="text-[var(--color-amber)]" />
  if (type === 'formula') return <Calculator size={12} className="text-[var(--color-text-muted)]" />
  return <BarChart3 size={12} className="text-[var(--color-text-muted)]" />
}

interface BOQEvidenceCenterProps {
  isOpen: boolean
  onClose: () => void
  boqItem: BOQItem
  projectId: string
}

export function BOQEvidenceCenter({ isOpen, onClose, boqItem, projectId }: BOQEvidenceCenterProps) {
  const [tab, setTab] = useState<Tab>('measurements')
  const [measurements, setMeasurements] = useState<MeasurementItem[]>([])
  const [sketches, setSketches] = useState<MeasurementSketch[]>([])
  const [attachments, setAttachments] = useState<QuantityAttachment[]>([])
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [revisions, setRevisions] = useState<RevisionWithDrawing[]>([])
  const [quantityChanges, setQuantityChanges] = useState<QuantityChange[]>([])
  const [approvals, setApprovals] = useState<QuantityApproval[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const load = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    try {
      const [mi, atts, sketches, allDrawings, allRevisions, changes, approvalLog] = await Promise.all([
        boqItem.mi_id ? getMeasurementItem(boqItem.mi_id) : Promise.resolve(null),
        getAttachments({ projectId, boqItemId: boqItem.id }),
        boqItem.mi_id ? getSketches({ projectId, miId: boqItem.mi_id }) : Promise.resolve([]),
        getDrawings(projectId),
        getDrawingRevisionsForProject(projectId),
        getQuantityChanges(projectId, { boqItemId: boqItem.id, miId: boqItem.mi_id ?? undefined }),
        getApprovals(boqItem.id),
      ])

      const linked = mi ? [mi] : []
      setMeasurements(linked)
      setAttachments(atts)
      setSketches(sketches)
      setDrawings(allDrawings)
      setApprovals(approvalLog)

      // Revisions of drawings referenced by this item's calculation lines
      const drawingIds = new Set(
        linked.flatMap((m) => (m.lines ?? []).map((l) => l.drawing_id).filter((id): id is string => !!id))
      )
      const relevantRevisions = allRevisions
        .filter((r) => drawingIds.has(r.drawing_id))
        .map((r) => ({ ...r, drawingName: allDrawings.find((d) => d.id === r.drawing_id)?.name ?? 'Drawing' }))
      setRevisions(relevantRevisions)
      setQuantityChanges(changes)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [isOpen, projectId, boqItem])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })
  const measurementLines = measurements.flatMap((m) => m.lines ?? [])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed inset-y-0 end-0 z-50 w-full max-w-[520px] bg-[var(--color-surface-low)] border-s border-[var(--color-border)] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-[var(--color-border)] shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono text-[var(--color-amber)] uppercase tracking-widest">Evidence Center</span>
                  {boqItem.code && (
                    <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{boqItem.code}</span>
                  )}
                </div>
                <h3 className="text-sm font-semibold text-[var(--color-text)] line-clamp-2">{boqItem.description}</h3>
                <div className="flex items-center gap-3 mt-1 text-[11px] text-[var(--color-text-muted)]">
                  <span>{boqItem.unit}</span>
                  <span>Qty: {fmt(boqItem.quantity)}</span>
                  {boqItem.unit_rate != null && boqItem.unit_rate > 0 && (
                    <span>Rate: {fmt(boqItem.unit_rate)}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => router.push(`/projects/${projectId}/boq/${boqItem.id}/calc-sheet`)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--color-amber)]/10 hover:bg-[var(--color-amber)]/20 text-[var(--color-amber)] text-[11px] font-medium transition-colors"
                  title="Open Quantity Calculation Sheet"
                >
                  <ClipboardCheck size={13} />
                  Calculation Sheet
                </button>
                <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--color-border)] px-1 shrink-0 overflow-x-auto">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-medium border-b-2 transition-colors whitespace-nowrap',
                    tab === t.id
                      ? 'border-[var(--color-amber)] text-[var(--color-amber)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                  )}
                >
                  <t.icon size={12} />
                  {t.label}
                  {t.id === 'attachments' && attachments.length > 0 && (
                    <span className="text-[9px] bg-[var(--color-amber)]/20 text-[var(--color-amber)] px-1 rounded-full">{attachments.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="animate-spin text-[var(--color-amber)]" />
                </div>
              ) : (
                <>
                  {/* Measurements tab */}
                  {tab === 'measurements' && (
                    <div className="space-y-3">
                      {measurements.length === 0 ? (
                        <div className="text-center py-8 text-xs text-[var(--color-text-muted)]">
                          <Ruler size={24} className="mx-auto mb-2 opacity-30" />
                          No measurement items linked to this BOQ item
                        </div>
                      ) : (
                        measurements.map((m) => (
                          <div key={m.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                            <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface-hover)]">
                              <MeasurementTypeIcon type={m.measurement_type ?? ''} />
                              <span className="text-xs font-medium text-[var(--color-text)] flex-1 truncate">{m.description}</span>
                              <span className="text-[10px] font-mono text-[var(--color-amber)]">{fmt(m.net_qty ?? 0)} {m.unit}</span>
                            </div>
                            {(m.lines ?? []).length > 0 && (
                              <div className="divide-y divide-[var(--color-border)]/50">
                                {(m.lines ?? []).map((l) => (
                                  <div key={l.id} className="px-3 py-1.5">
                                    <div className="flex items-center gap-2 text-[11px]">
                                      <span className="text-[var(--color-text-muted)] w-4 text-center">{l.line_number}</span>
                                      <span className="text-[var(--color-text-secondary)] flex-1 truncate">{l.description || '—'}</span>
                                      {l.nr != null && l.nr !== 1 && <span className="text-[var(--color-text-muted)]">×{l.nr}</span>}
                                      {l.length != null && <span className="font-mono text-[var(--color-text-muted)]">{l.length}</span>}
                                      {l.width != null && <span className="font-mono text-[var(--color-text-muted)]">×{l.width}</span>}
                                      {l.height != null && <span className="font-mono text-[var(--color-text-muted)]">×{l.height}</span>}
                                      <span className={cn('font-mono ms-auto', l.is_deduction ? 'text-[var(--color-danger-light)]' : 'text-[var(--color-text)]')}>
                                        {l.is_deduction ? '-' : ''}{fmt(l.quantity ?? 0)}
                                      </span>
                                    </div>
                                    {(l.floor_level || l.engineer_name || l.measured_date || l.location) && (
                                      <div className="flex flex-wrap gap-x-2 ps-6 mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                                        {l.location && <span>{l.location}</span>}
                                        {l.floor_level && <span>· {l.floor_level}</span>}
                                        {l.engineer_name && <span>· {l.engineer_name}</span>}
                                        {l.measured_date && <span>· {new Date(l.measured_date).toLocaleDateString('en-GB')}</span>}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between px-3 py-1.5 border-t border-[var(--color-border)]/50 bg-[var(--color-surface-hover)]/50">
                              <span className="text-[10px] text-[var(--color-text-muted)]">
                                + {fmt(m.additions_qty ?? 0)} − {fmt(m.deductions_qty ?? 0)}
                              </span>
                              <span className="text-[11px] font-semibold font-mono text-[var(--color-text)]">
                                Net: {fmt(m.net_qty ?? 0)} {m.unit}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* Sketches tab */}
                  {tab === 'sketches' && (
                    <SketchGallery
                      sketches={sketches}
                      onDeleted={(id) => setSketches((prev) => prev.filter((s) => s.id !== id))}
                    />
                  )}

                  {/* Attachments tab */}
                  {tab === 'attachments' && (
                    <AttachmentsPanel
                      projectId={projectId}
                      boqItemId={boqItem.id}
                      initialAttachments={attachments}
                      onCountChange={(c) => {
                        // update badge count (no-op here, we'll reload)
                      }}
                    />
                  )}

                  {/* Drawings tab */}
                  {tab === 'drawings' && (
                    <div className="space-y-3">
                      {measurementLines.length === 0 ? (
                        <div className="text-center py-8 text-xs text-[var(--color-text-muted)]">
                          <GitBranch size={24} className="mx-auto mb-2 opacity-30" />
                          No drawing references found. Measurements taken on drawings will appear here.
                        </div>
                      ) : (
                        measurementLines.map((l) => {
                          const drawing = drawings.find((d) => d.id === l.drawing_id)
                          const revision = revisions.find((r) => r.id === l.revision_id)
                          return (
                            <div key={l.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                              <div className="flex items-center gap-2 text-xs">
                                <GitBranch size={12} className="text-[var(--color-amber)]" />
                                <span className="font-medium text-[var(--color-text)]">{drawing?.name ?? 'No drawing linked'}</span>
                                {revision && <span className="font-mono text-[var(--color-text-muted)]">Rev {revision.revision_number}</span>}
                                <span className="ms-auto font-mono text-[var(--color-amber)]">{fmt(Math.abs(l.quantity))}</span>
                              </div>
                              <div className="mt-1 text-[10px] text-[var(--color-text-muted)] flex flex-wrap gap-x-2">
                                {l.page_number != null && <span>Pg {l.page_number}</span>}
                                {l.floor_level && <span>· {l.floor_level}</span>}
                                {l.location && <span>· {l.location}</span>}
                                {l.engineer_name && <span>· {l.engineer_name}</span>}
                                {l.measured_date && <span>· {new Date(l.measured_date).toLocaleDateString('en-GB')}</span>}
                              </div>
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}

                  {/* Revisions tab */}
                  {tab === 'revisions' && (
                    <RevisionTimeline
                      revisions={revisions}
                      changes={quantityChanges}
                      emptyDescription="No revisions recorded yet for the drawings behind this item's measurements."
                    />
                  )}

                  {/* History tab */}
                  {tab === 'history' && (
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <ClipboardCheck size={12} className="text-[var(--color-amber)]" />
                          <span className="font-medium text-[var(--color-text)]">Approval Trail</span>
                        </div>
                        {approvals.length === 0 ? (
                          <p className="text-[11px] text-[var(--color-text-muted)]">No approvals recorded yet.</p>
                        ) : (
                          <div className="space-y-2">
                            {approvals.map((a) => (
                              <div key={a.id} className="flex items-start gap-2 text-[11px] border-b border-[var(--color-border)]/50 last:border-0 pb-2 last:pb-0">
                                <span className={cn(
                                  'px-1.5 py-0.5 rounded text-[10px] font-medium uppercase shrink-0',
                                  a.status === 'approved' && 'bg-green-500/10 text-green-600',
                                  a.status === 'rejected' && 'bg-red-500/10 text-red-600',
                                  (a.status === 'pending' || a.status === 'draft') && 'bg-[var(--color-amber)]/10 text-[var(--color-amber)]',
                                )}>
                                  {a.status}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {a.approver_name && <span className="text-[var(--color-text)] font-medium">{a.approver_name}</span>}
                                    <span className="text-[var(--color-text-muted)]">{new Date(a.approved_at).toLocaleDateString('en-GB')}</span>
                                  </div>
                                  <div className="font-mono text-[var(--color-text-secondary)]">
                                    {fmt(a.calculated_quantity)} → {fmt(a.approved_quantity)} {a.unit}
                                  </div>
                                  {a.notes && <p className="text-[var(--color-text-muted)] mt-0.5">{a.notes}</p>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <History size={12} className="text-[var(--color-amber)]" />
                          <span className="font-medium text-[var(--color-text)]">Quantity History</span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--color-text-muted)] w-28">Original Quantity</span>
                            <span className="font-mono text-[var(--color-text)]">{fmt(boqItem.original_quantity ?? boqItem.quantity)}</span>
                            <span className="text-[var(--color-text-muted)]">{boqItem.unit}</span>
                          </div>
                          {boqItem.revised_quantity != null && (
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--color-text-muted)] w-28">Revised Quantity</span>
                              <span className="font-mono text-[var(--color-text)]">{fmt(boqItem.revised_quantity)}</span>
                              <span className="text-[var(--color-text-muted)]">{boqItem.unit}</span>
                            </div>
                          )}
                          {boqItem.quantity_difference != null && boqItem.quantity_difference !== 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--color-text-muted)] w-28">Difference</span>
                              <span className={cn('font-mono', boqItem.quantity_difference > 0 ? 'text-[var(--color-success-light)]' : 'text-[var(--color-danger-light)]')}>
                                {boqItem.quantity_difference > 0 ? '+' : ''}{fmt(boqItem.quantity_difference)}
                              </span>
                              <span className="text-[var(--color-text-muted)]">{boqItem.unit}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--color-text-muted)] w-28">Current Quantity</span>
                            <span className="font-mono font-semibold text-[var(--color-amber)]">{fmt(boqItem.quantity)}</span>
                            <span className="text-[var(--color-text-muted)]">{boqItem.unit}</span>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                        <div className="flex items-center gap-2 text-xs mb-2">
                          <History size={12} className="text-[var(--color-amber)]" />
                          <span className="font-medium text-[var(--color-text)]">Rate Breakdown</span>
                        </div>
                        <div className="space-y-1.5 text-[11px]">
                          {boqItem.material_rate != null && boqItem.material_rate > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--color-text-muted)] w-28">Material Rate</span>
                              <span className="font-mono">{fmt(boqItem.material_rate)}</span>
                            </div>
                          )}
                          {boqItem.labor_rate != null && boqItem.labor_rate > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--color-text-muted)] w-28">Labor Rate</span>
                              <span className="font-mono">{fmt(boqItem.labor_rate)}</span>
                            </div>
                          )}
                          {boqItem.equipment_rate != null && boqItem.equipment_rate > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-[var(--color-text-muted)] w-28">Equipment Rate</span>
                              <span className="font-mono">{fmt(boqItem.equipment_rate)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 border-t border-[var(--color-border)]/50 pt-1.5">
                            <span className="text-[var(--color-text-muted)] w-28">Unit Rate</span>
                            <span className="font-mono font-semibold text-[var(--color-amber)]">{fmt(boqItem.unit_rate ?? 0)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--color-text-muted)] w-28">Total Amount</span>
                            <span className="font-mono font-bold text-[var(--color-text)]">{fmt(boqItem.total_amount ?? 0)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
