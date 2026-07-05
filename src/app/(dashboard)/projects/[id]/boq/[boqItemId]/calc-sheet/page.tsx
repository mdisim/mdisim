'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { BOQItem, MeasurementItem, MeasurementLine, MeasurementSketch, QuantityAttachment, QuantityApproval, Drawing, DrawingRevision } from '@/lib/types'
import { getBOQItem, updateBOQItem } from '@/app/actions/boq'
import { getMeasurementItem, createMeasurementItem } from '@/app/actions/measurements'
import { getSketches, createSketch } from '@/app/actions/sketches'
import { getAttachments } from '@/app/actions/attachments'
import { getLatestApproval } from '@/app/actions/quantity-approvals'
import { getDrawings } from '@/app/actions/drawings'
import { getDrawingRevisionsForProject } from '@/app/actions/drawing-revisions'
import { getProfile } from '@/app/actions/profile'
import { getProject } from '@/app/actions/projects'
import { PageHeader } from '@/components/ui/page-header'
import { SectionCard } from '@/components/ui/section-card'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { EmptyState } from '@/components/ui/empty-state'
import { MeasurementSheet } from '@/components/measurements/measurement-sheet'
import { CalcSheetSummary } from '@/components/calc-sheet/calc-sheet-summary'
import { SketchGallery } from '@/components/sketches/sketch-gallery'
import { AttachmentsPanel } from '@/components/attachments/attachments-panel'
import { Calculator, ArrowLeft, FileText, Download, Image as ImageIcon, Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { generateCalcSheetReport } from '@/lib/export/calc-sheet-pdf'
import { exportCalcSheetToExcel } from '@/lib/export/calc-sheet-excel'

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })

export default function CalcSheetPage() {
  const { id: projectId, boqItemId } = useParams<{ id: string; boqItemId: string }>()
  const router = useRouter()

  const [boqItem, setBoqItem] = useState<BOQItem | null>(null)
  const [measurementItem, setMeasurementItem] = useState<MeasurementItem | null>(null)
  const [sketches, setSketches] = useState<MeasurementSketch[]>([])
  const [attachments, setAttachments] = useState<QuantityAttachment[]>([])
  const [latestApproval, setLatestApproval] = useState<QuantityApproval | null>(null)
  const [drawings, setDrawings] = useState<Drawing[]>([])
  const [revisions, setRevisions] = useState<DrawingRevision[]>([])
  const [profileName, setProfileName] = useState('')
  const [projectName, setProjectName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initializing, setInitializing] = useState(false)
  const [sketchLine, setSketchLine] = useState<MeasurementLine | null>(null)
  const [exporting, setExporting] = useState<'pdf' | 'excel' | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const item = await getBOQItem(boqItemId)
      if (!item) {
        setError('BOQ item not found')
        setLoading(false)
        return
      }
      setBoqItem(item)

      const [dwgs, revs, profileData, project] = await Promise.all([
        getDrawings(projectId),
        getDrawingRevisionsForProject(projectId),
        getProfile(),
        getProject(projectId),
      ])
      setDrawings(dwgs)
      setRevisions(revs)
      setProfileName((profileData?.profile as { full_name?: string | null } | null)?.full_name ?? '')
      setProjectName(project?.name ?? '')

      const [atts, approval] = await Promise.all([
        getAttachments({ projectId, boqItemId: item.id }),
        getLatestApproval(item.id),
      ])
      setAttachments(atts)
      setLatestApproval(approval)

      if (item.mi_id) {
        const [mi, sk] = await Promise.all([
          getMeasurementItem(item.mi_id),
          getSketches({ projectId, miId: item.mi_id }),
        ])
        setMeasurementItem(mi)
        setSketches(sk)
      } else {
        setMeasurementItem(null)
        setSketches([])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load calculation sheet')
    } finally {
      setLoading(false)
    }
  }, [projectId, boqItemId])

  useEffect(() => { load() }, [load])

  const handleInitialize = async () => {
    if (!boqItem) return
    setInitializing(true)
    const result = await createMeasurementItem({
      project_id: projectId,
      description: boqItem.description,
      unit: boqItem.unit,
      measurement_type: 'formula',
      section: boqItem.section ?? undefined,
    })
    if (result.data) {
      await updateBOQItem(boqItem.id, { mi_id: result.data.id })
      await load()
    } else if (result.error) {
      setError(result.error)
    }
    setInitializing(false)
  }

  const handleExportPDF = async () => {
    if (!boqItem || !measurementItem) return
    setExporting('pdf')
    try {
      await generateCalcSheetReport({
        boqItem,
        item: measurementItem,
        sketches,
        attachments,
        approval: latestApproval,
        drawingsById: Object.fromEntries(drawings.map((d) => [d.id, d])),
        revisionsById: Object.fromEntries(revisions.map((r) => [r.id, r])),
        projectName,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export PDF')
    } finally {
      setExporting(null)
    }
  }

  const handleExportExcel = async () => {
    if (!boqItem || !measurementItem) return
    setExporting('excel')
    try {
      await exportCalcSheetToExcel({
        boqItem,
        item: measurementItem,
        attachments,
        approval: latestApproval,
        drawingsById: Object.fromEntries(drawings.map((d) => [d.id, d])),
        revisionsById: Object.fromEntries(revisions.map((r) => [r.id, r])),
        projectName,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to export Excel')
    } finally {
      setExporting(null)
    }
  }

  const sketchesByLineId: Record<string, MeasurementSketch[]> = {}
  for (const s of sketches) {
    if (s.line_id) {
      sketchesByLineId[s.line_id] = sketchesByLineId[s.line_id] ? [...sketchesByLineId[s.line_id], s] : [s]
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--color-amber)]" size={28} />
      </div>
    )
  }

  if (error || !boqItem) {
    return (
      <div className="min-h-screen bg-[var(--background)] p-8">
        <EmptyState
          icon={Calculator}
          title="Couldn't load Quantity Calculation Sheet"
          description={error ?? 'Unknown error'}
          actionLabel="Back to BOQ"
          onAction={() => router.push(`/projects/${projectId}/boq`)}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <motion.div className="mx-auto max-w-[1400px] space-y-6 p-5 md:p-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <PageHeader
          icon={Calculator}
          title="Quantity Calculation Sheet"
          subtitle={boqItem.description}
          gradient="from-amber-500 to-amber-600"
          className="mb-0"
          actions={
            <>
              <Button variant="secondary" size="sm" onClick={() => router.push(`/projects/${projectId}/boq`)}>
                <ArrowLeft size={13} className="me-1.5" /> Back to BOQ
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={exporting === 'excel'}
                disabled={!measurementItem}
                onClick={handleExportExcel}
              >
                <Download size={13} className="me-1.5" /> Excel
              </Button>
              <Button
                variant="primary"
                size="sm"
                loading={exporting === 'pdf'}
                disabled={!measurementItem}
                onClick={handleExportPDF}
              >
                <FileText size={13} className="me-1.5" /> Export PDF
              </Button>
            </>
          }
        />

        {/* BOQ item information */}
        <SectionCard title="BOQ Item Information" icon={FileText}>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Item No.</div>
              <div className="text-sm font-semibold text-[var(--color-text)] font-mono">{boqItem.code || '—'}</div>
            </div>
            <div className="col-span-2 sm:col-span-2 lg:col-span-2">
              <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Description</div>
              <div className="text-sm font-semibold text-[var(--color-text)]">{boqItem.description}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Unit</div>
              <div className="text-sm font-semibold text-[var(--color-text)]">{boqItem.unit}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Total Quantity</div>
              <div className="text-sm font-semibold text-[var(--color-amber)] tabular-nums">{fmt(boqItem.quantity)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Unit Rate</div>
              <div className="text-sm font-semibold text-[var(--color-text)] tabular-nums">{fmt(boqItem.unit_rate ?? 0)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Total Amount</div>
              <div className="text-sm font-bold text-[var(--color-text)] tabular-nums">{fmt(boqItem.total_amount ?? 0)}</div>
            </div>
          </div>
        </SectionCard>

        {/* Calculation lines */}
        {!measurementItem ? (
          <SectionCard title="Calculation Lines" icon={Calculator}>
            <EmptyState
              icon={Calculator}
              title="No calculation lines yet"
              description="Initialize the calculation sheet to start adding dimension lines, formulas and source references for this BOQ item."
              actionLabel={initializing ? 'Initializing…' : 'Start Calculation Sheet'}
              onAction={initializing ? undefined : handleInitialize}
              compact
            />
          </SectionCard>
        ) : (
          <>
            <SectionCard title="Calculation Lines" icon={Calculator} noPadding>
              <MeasurementSheet
                item={measurementItem}
                onUpdate={load}
                extended
                drawings={drawings}
                revisions={revisions}
                sketchesByLineId={sketchesByLineId}
                onManageSketches={setSketchLine}
                defaultLineFields={{ engineer_name: profileName || undefined, measured_date: new Date().toISOString().slice(0, 10) }}
              />
            </SectionCard>

            <CalcSheetSummary
              projectId={projectId}
              boqItemId={boqItem.id}
              item={measurementItem}
              latestApproval={latestApproval}
              defaultApproverName={profileName}
              onApproved={load}
            />

            <SectionCard title="Sketches" icon={ImageIcon}>
              <SketchGallery
                sketches={sketches.filter((s) => !s.line_id)}
                compact
                onDeleted={(id) => setSketches((prev) => prev.filter((s) => s.id !== id))}
              />
            </SectionCard>

            <SectionCard title="Attachments" icon={Upload}>
              <AttachmentsPanel
                projectId={projectId}
                boqItemId={boqItem.id}
                miId={measurementItem.id}
                initialAttachments={attachments}
              />
            </SectionCard>
          </>
        )}
      </motion.div>

      {sketchLine && measurementItem && (
        <LineSketchModal
          projectId={projectId}
          line={sketchLine}
          measurementItem={measurementItem}
          sketches={sketchesByLineId[sketchLine.id] ?? []}
          onClose={() => setSketchLine(null)}
          onChange={load}
        />
      )}
    </div>
  )
}

function LineSketchModal({
  projectId,
  line,
  measurementItem,
  sketches,
  onClose,
  onChange,
}: {
  projectId: string
  line: MeasurementLine
  measurementItem: MeasurementItem
  sketches: MeasurementSketch[]
  onClose: () => void
  onChange: () => void
}) {
  const [uploading, setUploading] = useState(false)

  const handleFile = async (file: File | null) => {
    if (!file) return
    setUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
      await createSketch({
        projectId,
        miId: measurementItem.id,
        lineId: line.id,
        drawingId: line.drawing_id ?? undefined,
        imageDataUrl: dataUrl,
        quantity: line.quantity,
        unit: measurementItem.unit,
        formula: line.formula ?? undefined,
        pageNumber: line.page_number ?? undefined,
        snapshotType: 'manual',
      })
      onChange()
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Sketches — Line ${line.line_number}`} size="lg">
      <div className="space-y-4">
        <SketchGallery sketches={sketches} onDeleted={onChange} />
        <label className={cn(
          'flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border)] rounded-xl p-4 text-sm text-[var(--color-text-muted)] cursor-pointer hover:border-[var(--color-amber)]/50 transition-colors',
          uploading && 'opacity-50 pointer-events-none'
        )}>
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? 'Uploading…' : 'Upload a sketch / screenshot for this line'}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>
    </Modal>
  )
}
