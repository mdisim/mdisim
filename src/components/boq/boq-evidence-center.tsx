'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { BOQItem, MeasurementItem, QuantityAttachment, MeasurementSketch, QuantityChange, DrawingMeasurement } from '@/lib/types'
import { getMeasurementItems } from '@/app/actions/measurements'
import { getAttachments, getAttachmentUrl } from '@/app/actions/attachments'
import { getSketches, getSketchImageUrl } from '@/app/actions/sketches'
import { getDrawingMeasurements } from '@/app/actions/drawings'
import { AttachmentsPanel } from '@/components/attachments/attachments-panel'
import {
  X, Ruler, Image, Paperclip, GitBranch, History,
  ChevronRight, ExternalLink, Loader2, FileText,
  Hash, Square, ArrowUpDown, Calculator, Layers, BarChart3,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

type Tab = 'measurements' | 'sketches' | 'attachments' | 'drawings' | 'history'

const TABS: { id: Tab; label: string; icon: typeof Ruler }[] = [
  { id: 'measurements', label: 'Measurements', icon: Ruler },
  { id: 'sketches', label: 'Sketches', icon: Image },
  { id: 'attachments', label: 'Attachments', icon: Paperclip },
  { id: 'drawings', label: 'Drawings', icon: GitBranch },
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
  const [drawingMeasurements, setDrawingMeasurements] = useState<DrawingMeasurement[]>([])
  const [loading, setLoading] = useState(false)
  const [sketchUrls, setSketchUrls] = useState<Record<string, string>>({})
  const router = useRouter()

  const load = useCallback(async () => {
    if (!isOpen) return
    setLoading(true)
    try {
      const [allMeasurements, atts, sketches] = await Promise.all([
        getMeasurementItems(projectId),
        getAttachments({ projectId, boqItemId: boqItem.id }),
        getSketches({ projectId }),
      ])

      // Filter measurements linked to this BOQ item via mi_id
      const linked = allMeasurements.filter(
        (m) => m.id === boqItem.mi_id
      )
      setMeasurements(linked)
      setAttachments(atts)
      setSketches(sketches.filter((s) => s.mi_id === boqItem.mi_id || !s.mi_id))
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [isOpen, projectId, boqItem])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    // Load sketch image URLs
    const load = async () => {
      const entries: Record<string, string> = {}
      for (const s of sketches) {
        if (s.file_path) {
          const url = await getSketchImageUrl(s.file_path)
          if (url) entries[s.id] = url
        }
      }
      setSketchUrls(entries)
    }
    if (sketches.length > 0) load()
  }, [sketches])

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

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
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] shrink-0">
                <X size={16} />
              </button>
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
                                  <div key={l.id} className="flex items-center gap-2 px-3 py-1.5 text-[11px]">
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
                    <div className="space-y-3">
                      {sketches.length === 0 ? (
                        <div className="text-center py-8 text-xs text-[var(--color-text-muted)]">
                          <Image size={24} className="mx-auto mb-2 opacity-30" />
                          No engineering sketches yet. Take a measurement on a drawing to auto-generate sketches.
                        </div>
                      ) : (
                        sketches.map((s) => (
                          <div key={s.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] overflow-hidden">
                            {sketchUrls[s.id] ? (
                              <img src={sketchUrls[s.id]} alt="Sketch" className="w-full max-h-48 object-contain bg-black/20" />
                            ) : (
                              <div className="h-32 flex items-center justify-center bg-black/10">
                                <Image size={24} className="opacity-20" />
                              </div>
                            )}
                            <div className="px-3 py-2 space-y-1">
                              <div className="flex items-center gap-3 text-[11px]">
                                {s.drawing_ref && <span className="font-mono text-[var(--color-amber)]">{s.drawing_ref}</span>}
                                {s.page_number != null && <span className="text-[var(--color-text-muted)]">Pg {s.page_number}</span>}
                                {s.scale_label && <span className="text-[var(--color-text-muted)]">Scale {s.scale_label}</span>}
                              </div>
                              {s.formula && (
                                <div className="font-mono text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-hover)] px-2 py-1 rounded">
                                  {s.formula}
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[var(--color-text-muted)]">{s.snapshot_type === 'auto' ? 'Auto-generated' : 'Manual'}</span>
                                {s.quantity != null && (
                                  <span className="font-mono font-semibold text-[var(--color-amber)]">
                                    {s.quantity.toLocaleString('en-US', { minimumFractionDigits: 3 })} {s.unit}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
                      {drawingMeasurements.length === 0 ? (
                        <div className="text-center py-8 text-xs text-[var(--color-text-muted)]">
                          <GitBranch size={24} className="mx-auto mb-2 opacity-30" />
                          No drawing references found. Measurements taken on drawings will appear here.
                        </div>
                      ) : (
                        drawingMeasurements.map((dm) => (
                          <div key={dm.id} className="p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                            <div className="flex items-center gap-2 text-xs">
                              <GitBranch size={12} className="text-[var(--color-amber)]" />
                              <span className="font-medium text-[var(--color-text)]">{dm.label || dm.tool_type}</span>
                              <span className="ms-auto font-mono text-[var(--color-amber)]">{dm.quantity} {dm.unit}</span>
                            </div>
                            <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
                              Page {dm.page_number} · {dm.tool_type}
                              {dm.notes && ` · ${dm.notes}`}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* History tab */}
                  {tab === 'history' && (
                    <div className="space-y-2">
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
