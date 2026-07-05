'use client'

import { useState } from 'react'
import type { MeasurementLine, MeasurementItem, MeasurementSketch } from '@/lib/types'
import { createSketch } from '@/app/actions/sketches'
import { Modal } from '@/components/ui/modal'
import { SketchGallery } from '@/components/sketches/sketch-gallery'
import { Upload, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LineSketchModalProps {
  projectId: string
  line: MeasurementLine
  measurementItem: MeasurementItem
  sketches: MeasurementSketch[]
  onClose: () => void
  onChange: () => void
}

export function LineSketchModal({
  projectId,
  line,
  measurementItem,
  sketches,
  onClose,
  onChange,
}: LineSketchModalProps) {
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
