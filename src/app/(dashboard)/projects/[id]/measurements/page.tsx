'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { motion, type Variants } from 'framer-motion'
import {
  getMeasurementItems,
  createMeasurementItem,
  deleteMeasurementItem,
  updateMeasurementItem,
  createMeasurementLine,
  updateMeasurementLine,
  deleteMeasurementLine,
  duplicateMeasurementLine,
} from '@/app/actions/measurements'
import { generateBOQFromMeasurements, getBOQItems } from '@/app/actions/boq'
import { getDrawings } from '@/app/actions/drawings'
import { getRateAnalyses } from '@/app/actions/rate-analysis'
import type { MeasurementItem, MeasurementType, BOQItem, Drawing, RateAnalysis } from '@/lib/types'
import { MEASUREMENT_UNITS, MEASUREMENT_TYPES } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { CardSkeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { SectionCard } from '@/components/ui/section-card'
import { MeasurementGrid } from '@/components/measurements/measurement-grid'
import { MeasurementToolbar } from '@/components/measurements/measurement-toolbar'
import { GenerateBOQDialog } from '@/components/measurements/generate-boq-dialog'
import { Ruler, Plus, Image, ArrowRight, BarChart3, GitBranch, FileText, Layers, Paperclip } from 'lucide-react'
import { AttachmentsPanel } from '@/components/attachments/attachments-panel'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'
import { getProject } from '@/app/actions/projects'
import { exportMeasurementsToExcel } from '@/lib/export/measurements-excel'
import { exportMeasurementsToPDF } from '@/lib/export/measurements-pdf'

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp: Variants = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }

const MEASUREMENT_TYPE_DEFAULT_UNIT: Record<MeasurementType, string> = {
  volume: 'm³',
  area: 'm²',
  length: 'm',
  count: 'nr',
  weight: 'kg',
  formula: 'm',
}

export default function MeasurementsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { t } = useI18n()

  const [items, setItems] = useState<MeasurementItem[]>([])
  const [boqItems, setBoqItems] = useState<BOQItem[]>([])
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [rateAnalyses, setRateAnalyses] = useState<RateAnalysis[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())
  const [sectionFilter, setSectionFilter] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'measurements' | 'traceability'>('measurements')
  const [typeFilter, setTypeFilter] = useState<MeasurementType | null>(null)
  const [linkFilter, setLinkFilter] = useState<'all' | 'linked-drawing' | 'linked-boq' | 'unlinked'>('all')
  const [showCreateItem, setShowCreateItem] = useState(false)
  const [showGenerateBOQ, setShowGenerateBOQ] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [creating, setCreating] = useState(false)
  const [attachmentsItemId, setAttachmentsItemId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [createForm, setCreateForm] = useState({
    item_code: '',
    description: '',
    unit: 'm',
    measurement_type: 'length' as MeasurementType,
    section: '',
    drawing_ref: '',
    location: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [data, boq, dwgs, rates] = await Promise.all([
        getMeasurementItems(projectId),
        getBOQItems(projectId),
        getDrawings(projectId),
        getRateAnalyses(projectId),
      ])
      setItems(data)
      setBoqItems(boq)
      setDrawings(dwgs)
      setRateAnalyses(rates)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load measurements')
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    load()
  }, [load])

  const handleCreateItem = async () => {
    if (!createForm.description.trim()) return
    setCreating(true)
    setError(null)
    const result = await createMeasurementItem({
      project_id: projectId,
      ...createForm,
    })
    if (result.error) {
      setError(result.error)
      setCreating(false)
      return
    }
    setShowCreateItem(false)
    setCreateForm({
      item_code: '',
      description: '',
      unit: 'm',
      measurement_type: 'length',
      section: '',
      drawing_ref: '',
      location: '',
    })
    setCreating(false)
    load()
  }

  const handleUpdateItem = useCallback(
    async (id: string, fields: Partial<MeasurementItem>) => {
      try {
        await updateMeasurementItem(id, fields)
      } catch { setError('Failed to update measurement item.') }
      load()
    },
    [load],
  )

  const handleDeleteItem = useCallback(
    async (id: string) => {
      setConfirmAction({
        message: 'Delete this measurement item and all its lines?',
        onConfirm: async () => {
          await deleteMeasurementItem(id)
          setSelectedItems((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          load()
        },
      })
    },
    [load],
  )

  const handleAddLine = useCallback(
    async (itemId: string, isDeduction?: boolean) => {
      await createMeasurementLine({
        item_id: itemId,
        nr: 1,
        is_deduction: isDeduction ?? false,
      })
      load()
    },
    [load],
  )

  const handleUpdateLine = useCallback(
    async (id: string, fields: Record<string, unknown>) => {
      await updateMeasurementLine(id, fields)
      load()
    },
    [load],
  )

  const handleDeleteLine = useCallback(
    async (id: string) => {
      await deleteMeasurementLine(id)
      load()
    },
    [load],
  )

  const handleDuplicateLine = useCallback(
    async (id: string) => {
      await duplicateMeasurementLine(id)
      load()
    },
    [load],
  )

  const handleGenerateBOQ = useCallback(
    async (_options: { linkLibrary: boolean; copyRates: boolean }) => {
      const ids = Array.from(selectedItems)
      if (ids.length === 0) {
        setError('Please select at least one measurement item to generate BOQ.')
        return
      }
      try {
        await generateBOQFromMeasurements(projectId, ids)
        setShowGenerateBOQ(false)
        setSelectedItems(new Set())
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to generate BOQ')
      }
    },
    [projectId, selectedItems],
  )

  const sections = useMemo(() => {
    const set = new Set<string>()
    for (const item of items) {
      if (item.section) set.add(item.section)
    }
    return Array.from(set).sort()
  }, [items])

  const filteredItems = useMemo(() => {
    let result = items
    if (sectionFilter) {
      result = result.filter((item) => item.section === sectionFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(
        (item) =>
          item.description.toLowerCase().includes(q) ||
          item.item_code?.toLowerCase().includes(q) ||
          item.location?.toLowerCase().includes(q) ||
          item.drawing_ref?.toLowerCase().includes(q),
      )
    }
    return result
  }, [items, sectionFilter, searchQuery])

  const lineCount = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.lines?.length ?? 0), 0)
  }, [items])

  const { totalAdditions, totalDeductions, netQuantity } = useMemo(() => {
    let additions = 0
    let deductions = 0
    for (const item of items) {
      for (const line of item.lines ?? []) {
        const qty = line.quantity ?? 0
        if (line.is_deduction) {
          deductions += qty
        } else {
          additions += qty
        }
      }
    }
    return {
      totalAdditions: additions,
      totalDeductions: deductions,
      netQuantity: additions - deductions,
    }
  }, [items])

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleSelectAll = useCallback(() => {
    setSelectedItems(new Set(filteredItems.map((i) => i.id)))
  }, [filteredItems])

  const handleMeasurementTypeChange = (type: MeasurementType) => {
    setCreateForm((prev) => ({
      ...prev,
      measurement_type: type,
      unit: MEASUREMENT_TYPE_DEFAULT_UNIT[type] ?? prev.unit,
    }))
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
            <Ruler size={16} className="text-[color:var(--color-amber)]" />
          </div>
          <h1 className="text-2xl font-bold text-[color:var(--color-text)]">{t.measurements.title}</h1>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[1, 2, 3, 4].map((i) => <CardSkeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error && !loading && items.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
            <Ruler size={16} className="text-[color:var(--color-amber)]" />
          </div>
          <h1 className="text-2xl font-bold text-[color:var(--color-text)]">{t.measurements.title}</h1>
        </div>
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <p className="text-sm text-[var(--color-danger)]">{error}</p>
          <button onClick={load} className="px-4 py-2 text-sm font-medium bg-[color:var(--color-amber)] text-[color:var(--color-on-amber)] rounded-xl hover:opacity-90">Retry</button>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="p-4 md:p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
            <Ruler size={16} className="text-[color:var(--color-amber)]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[color:var(--color-text)]">{t.measurements.title}</h1>
            <p className="text-sm text-[color:var(--color-text-secondary)]">{t.measurements.noMeasurements}</p>
          </div>
        </div>
        <EmptyState
          icon={Ruler}
          title="No measurement items yet"
          description="Add measurement items to start building your quantity calculation book."
          actionLabel="Add First Item"
          onAction={() => setShowCreateItem(true)}
        />
        <CreateItemModal
          isOpen={showCreateItem}
          onClose={() => setShowCreateItem(false)}
          form={createForm}
          setForm={setCreateForm}
          onMeasurementTypeChange={handleMeasurementTypeChange}
          onSubmit={handleCreateItem}
          creating={creating}
          error={error}
          sections={sections}
        />
      </div>
    )
  }

  return (
    <motion.div className="p-4 md:p-6 space-y-5" variants={stagger} initial="hidden" animate="show">
      {/* Page Header */}
      <motion.div variants={fadeUp} className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
              <Ruler size={16} className="text-[color:var(--color-amber)]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-text)]">{t.measurements.title}</h1>
          </div>
          <p className="text-sm text-[color:var(--color-text-secondary)] ms-10">{items.length} items · {lineCount} lines</p>
        </div>
      </motion.div>

      <motion.div variants={fadeUp}>
        <MeasurementToolbar
          itemCount={items.length}
          lineCount={lineCount}
          selectedCount={selectedItems.size}
          sections={sections}
          activeSection={sectionFilter}
          onSectionFilter={setSectionFilter}
          searchQuery={searchQuery}
          onSearch={setSearchQuery}
          onAddItem={() => setShowCreateItem(true)}
          onGenerateBOQ={() => setShowGenerateBOQ(true)}
          onExport={async () => {
            try {
              const project = await getProject(projectId)
              if (project) await exportMeasurementsToExcel(items, project.name)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to export Excel')
            }
          }}
          onExportPDF={async () => {
            try {
              const project = await getProject(projectId)
              if (project) exportMeasurementsToPDF(items, project.name)
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Failed to export PDF')
            }
          }}
          totalAdditions={totalAdditions}
          totalDeductions={totalDeductions}
          netQuantity={netQuantity}
        />
      </motion.div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Items', value: items.length, icon: Layers },
          { label: 'Lines', value: lineCount, icon: FileText },
          { label: 'Additions', value: totalAdditions.toFixed(2), icon: Plus },
          { label: 'Net Quantity', value: netQuantity.toFixed(2), icon: BarChart3 },
        ].map((stat) => (
          <motion.div key={stat.label} variants={fadeUp}>
            <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-widest text-[color:var(--color-text-secondary)]">{stat.label}</span>
                <div className="w-7 h-7 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
                  <stat.icon size={14} className="text-[color:var(--color-amber)]" />
                </div>
              </div>
              <div className="text-xl font-bold font-mono text-[color:var(--color-text)] tabular-nums">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tab bar */}
      <motion.div variants={fadeUp} className="flex gap-1 border-b border-[color:var(--color-border)]">
        <button onClick={() => setActiveTab('measurements')} className={cn(
          'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'measurements'
            ? 'border-[color:var(--color-amber)] text-[color:var(--color-amber)]'
            : 'border-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)]'
        )}>
          <Ruler size={14} />Measurements
        </button>
        <button onClick={() => setActiveTab('traceability')} className={cn(
          'flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors',
          activeTab === 'traceability'
            ? 'border-[color:var(--color-amber)] text-[color:var(--color-amber)]'
            : 'border-transparent text-[color:var(--color-text-secondary)] hover:text-[color:var(--color-text)]'
        )}>
          <GitBranch size={14} />Traceability Chain
        </button>
      </motion.div>

      {/* Traceability Chain View */}
      {activeTab === 'traceability' && (
        <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
          {filteredItems.map(item => {
            const linkedLines = (item.lines ?? []).filter(l => l.drawing_measurement_id || l.drawing_id)
            const linkedBOQ = boqItems.filter(b => b.mi_id === item.id)
            const linkedRates = rateAnalyses.filter(r => linkedBOQ.some(b => b.id === r.boq_item_id))
            const drawingName = item.drawing_ref ? drawings.find(d => d.drawing_number === item.drawing_ref)?.name : null
            return (
              <motion.div
                key={item.id}
                variants={fadeUp}
                className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl p-4 hover:border-[color:var(--color-amber)]/30 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[color:var(--color-amber)]/10">
                    <Ruler size={16} className="text-[color:var(--color-amber)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {item.item_code && <span className="font-mono text-xs text-[color:var(--color-text-secondary)]">{item.item_code}</span>}
                      <span className="font-medium text-[color:var(--color-text)]">{item.description}</span>
                      <Badge variant="default">{item.measurement_type}</Badge>
                    </div>
                    <div className="text-xs text-[color:var(--color-text-secondary)] mt-0.5">
                      {item.unit} · Net: {item.net_qty.toFixed(2)} · {(item.lines ?? []).length} lines
                      {item.location && <span> · {item.location}</span>}
                    </div>

                    {/* Chain visualization */}
                    <div className="mt-3 ps-4 border-s-2 border-[color:var(--color-border)] space-y-2">
                      {(linkedLines.length > 0 || item.drawing_ref) && (
                        <div className="flex items-center gap-2 text-xs">
                          <Image size={12} className="text-[color:var(--color-amber)]" />
                          <span className="text-[color:var(--color-amber)] font-medium">Drawing</span>
                          <ArrowRight size={10} className="text-[color:var(--color-border)]" />
                          <span className="text-[color:var(--color-text-secondary)]">
                            {drawingName || item.drawing_ref || `${linkedLines.length} linked measurements`}
                          </span>
                          {linkedLines.length > 0 && (
                            <Badge variant="info">{linkedLines.length} lines linked</Badge>
                          )}
                        </div>
                      )}

                      {linkedBOQ.length > 0 && linkedBOQ.map(boq => (
                        <div key={boq.id} className="flex items-center gap-2 text-xs">
                          <FileText size={12} className="text-[color:var(--color-amber)]" />
                          <span className="text-[color:var(--color-amber)] font-medium">BOQ</span>
                          <ArrowRight size={10} className="text-[color:var(--color-border)]" />
                          <span className="text-[color:var(--color-text-secondary)]">{boq.code ?? '-'} {boq.description}</span>
                          <span className="tabular-nums text-[color:var(--color-text-secondary)]">{boq.quantity.toFixed(2)} {boq.unit}</span>
                          {boq.total_amount != null && (
                            <span className="tabular-nums font-medium text-[color:var(--color-text)]">= {boq.total_amount.toFixed(2)}</span>
                          )}
                        </div>
                      ))}

                      {linkedRates.length > 0 && linkedRates.map(rate => (
                        <div key={rate.id} className="flex items-center gap-2 text-xs">
                          <BarChart3 size={12} className="text-[color:var(--color-amber)]" />
                          <span className="text-[color:var(--color-amber)] font-medium">Rate</span>
                          <ArrowRight size={10} className="text-[color:var(--color-border)]" />
                          <span className="text-[color:var(--color-text-secondary)]">{rate.description}</span>
                          <span className="tabular-nums text-[color:var(--color-text-secondary)]">{rate.unit_rate.toFixed(2)}/{rate.unit}</span>
                        </div>
                      ))}

                      {linkedLines.length === 0 && !item.drawing_ref && linkedBOQ.length === 0 && (
                        <div className="text-xs text-[color:var(--color-text-secondary)] italic">No links established</div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>
      )}

      {activeTab === 'measurements' && (
        <motion.div variants={fadeUp}>
          <div className="bg-[color:var(--color-surface-elevated)] border border-[color:var(--color-border)] rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[color:var(--color-border)]">
              <div className="w-7 h-7 rounded-lg bg-[color:var(--color-amber)]/10 flex items-center justify-center">
                <Ruler size={14} className="text-[color:var(--color-amber)]" />
              </div>
              <h3 className="font-semibold text-[color:var(--color-text)]">Measurement Items</h3>
            </div>
            <MeasurementGrid
              items={filteredItems}
              selectedItems={selectedItems}
              onToggleSelect={handleToggleSelect}
              onSelectAll={handleSelectAll}
              onAddItem={() => setShowCreateItem(true)}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onAddLine={handleAddLine}
              onUpdateLine={handleUpdateLine}
              onDeleteLine={handleDeleteLine}
              onDuplicateLine={handleDuplicateLine}
              onAttachments={(id) => setAttachmentsItemId(id)}
            />
          </div>
        </motion.div>
      )}

      {/* Footer */}
      <motion.div variants={fadeUp} className="flex items-center justify-between rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] px-5 py-3 text-sm text-[color:var(--color-text-secondary)]">
        <div className="flex items-center gap-4">
          <span>
            <strong className="text-[color:var(--color-text)]">{items.length}</strong> item
            {items.length !== 1 ? 's' : ''}
          </span>
          <span className="text-[color:var(--color-border)]">|</span>
          <span>
            <strong className="text-[color:var(--color-text)]">{lineCount}</strong> line
            {lineCount !== 1 ? 's' : ''}
          </span>
        </div>
        {selectedItems.size > 0 && (
          <span className="text-[color:var(--color-amber)] font-medium">
            {selectedItems.size} selected for BOQ
          </span>
        )}
      </motion.div>

      <CreateItemModal
        isOpen={showCreateItem}
        onClose={() => setShowCreateItem(false)}
        form={createForm}
        setForm={setCreateForm}
        onMeasurementTypeChange={handleMeasurementTypeChange}
        onSubmit={handleCreateItem}
        creating={creating}
        error={error}
        sections={sections}
      />

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-[color:var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>

      <GenerateBOQDialog
        isOpen={showGenerateBOQ}
        onClose={() => setShowGenerateBOQ(false)}
        selectedItems={items.filter((item) => selectedItems.has(item.id))}
        onGenerate={handleGenerateBOQ}
      />

      {/* Attachments drawer */}
      {attachmentsItemId && (() => {
        const mi = items.find((i) => i.id === attachmentsItemId)
        return mi ? (
          <>
            <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setAttachmentsItemId(null)} />
            <div className="fixed inset-y-0 end-0 z-50 w-full max-w-[420px] bg-[var(--color-surface-low)] border-s border-[var(--color-border)] flex flex-col shadow-2xl">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
                <div>
                  <p className="text-[10px] font-mono text-[var(--color-amber)] uppercase tracking-widest mb-0.5">Attachments</p>
                  <p className="text-sm font-semibold text-[var(--color-text)] line-clamp-1">{mi.description}</p>
                </div>
                <button onClick={() => setAttachmentsItemId(null)} className="p-1.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                  <Paperclip size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <AttachmentsPanel
                  projectId={projectId}
                  miId={mi.id}
                />
              </div>
            </div>
          </>
        ) : null
      })()}
    </motion.div>
  )
}

function CreateItemModal({
  isOpen,
  onClose,
  form,
  setForm,
  onMeasurementTypeChange,
  onSubmit,
  creating,
  error,
  sections,
}: {
  isOpen: boolean
  onClose: () => void
  form: {
    item_code: string
    description: string
    unit: string
    measurement_type: MeasurementType
    section: string
    drawing_ref: string
    location: string
  }
  setForm: React.Dispatch<React.SetStateAction<typeof form>>
  onMeasurementTypeChange: (type: MeasurementType) => void
  onSubmit: () => void
  creating: boolean
  error: string | null
  sections: string[]
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Measurement Item" size="md">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Item Code"
            value={form.item_code}
            onChange={(e) => setForm((prev) => ({ ...prev, item_code: e.target.value }))}
            placeholder="e.g. 01.01"
          />
          <div className="col-span-2">
            <Input
              label="Description"
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="e.g. Excavation for foundations"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Select
            label="Measurement Type"
            value={form.measurement_type}
            onChange={(e) =>
              onMeasurementTypeChange(e.target.value as MeasurementType)
            }
            options={MEASUREMENT_TYPES}
          />
          <Select
            label="Unit"
            value={form.unit}
            onChange={(e) => setForm((prev) => ({ ...prev, unit: e.target.value }))}
            options={MEASUREMENT_UNITS}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[color:var(--color-text)]">
              Section / Category
            </label>
            <input
              type="text"
              list="sections-list"
              value={form.section}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, section: e.target.value }))
              }
              placeholder="e.g. Substructure"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[color:var(--color-border)] bg-[color:var(--color-surface-elevated)] text-[color:var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-amber)]/30"
            />
            <datalist id="sections-list">
              {sections.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <Input
            label="Drawing Reference"
            value={form.drawing_ref}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, drawing_ref: e.target.value }))
            }
            placeholder="e.g. S-01"
          />
          <Input
            label="Location / Floor"
            value={form.location}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, location: e.target.value }))
            }
            placeholder="e.g. Ground Floor"
          />
        </div>

        {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            loading={creating}
            disabled={!form.description.trim()}
          >
            Add Item
          </Button>
        </div>
      </div>
    </Modal>
  )
}
