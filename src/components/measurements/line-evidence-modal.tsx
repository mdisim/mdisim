'use client'

import { useState } from 'react'
import type { MeasurementLine, MeasurementItem, MeasurementSketch, QuantityAttachment } from '@/lib/types'
import { createSketch } from '@/app/actions/sketches'
import { Modal } from '@/components/ui/modal'
import { SketchGallery } from '@/components/sketches/sketch-gallery'
import { AttachmentsPanel } from '@/components/attachments/attachments-panel'
import { Upload, Loader2, Image as ImageIcon, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LineEvidenceModalProps {
  projectId: string
  line: MeasurementLine
  measurementItem: MeasurementItem
  boqItemId?: string
  sketches: MeasurementSketch[]
  attachments: QuantityAttachment[]
  onClose: () => void
  onChange: () => void
}

export function LineEvidenceModal({
  projectId,
  line,
  measurementItem,
  boqItemId,
  sketches,
  attachments,
  onClose,
  onChange,
}: LineEvidenceModalProps) {
  const [uploadingSketch, setUploadingSketch] = useState(false)

  const handleSketchFile = async (file: File | null) => {
    if (!file) return
    setUploadingSketch(true)
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
      setUploadingSketch(false)
    }
  }

  return (
    <Modal isOpen onClose={onClose} title={`Evidence — Line ${line.line_number}`} size="lg">
      <div className="space-y-5">
        <div>
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <ImageIcon size={12} /> Sketches
          </div>
          <SketchGallery sketches={sketches} onDeleted={onChange} />
          <label className={cn(
            'mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-[var(--color-border)] rounded-xl p-3 text-sm text-[var(--color-text-muted)] cursor-pointer hover:border-[var(--color-amber)]/50 transition-colors',
            uploadingSketch && 'opacity-50 pointer-events-none'
          )}>
            {uploadingSketch ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploadingSketch ? 'Uploading…' : 'Upload a sketch / screenshot for this line'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleSketchFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <div className="flex items-center gap-1.5 mb-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">
            <Paperclip size={12} /> Attachments
          </div>
          <AttachmentsPanel
            projectId={projectId}
            miId={measurementItem.id}
            boqItemId={boqItemId}
            lineId={line.id}
            initialAttachments={attachments}
          />
        </div>
      </div>
    </Modal>
  )
}
