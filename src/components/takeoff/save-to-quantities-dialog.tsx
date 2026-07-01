'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DrawingMeasurement } from '@/lib/types'
import { MEASUREMENT_UNITS } from '@/lib/types'
import { createQuantityFromDrawing } from '@/app/actions/measurements'
import { createSketch } from '@/app/actions/sketches'
import { Ruler, Square, Hash, Check, X, Loader2, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

function toolLabel(tool: string): string {
  const labels: Record<string, string> = {
    line: 'Length', polyline: 'Polyline Length', area: 'Area',
    rectangle: 'Area', circle: 'Area', count: 'Count',
  }
  return labels[tool] ?? tool
}

function toolUnit(tool: string, scaleUnit?: string | null): string {
  if (tool === 'count') return 'nr'
  if (tool === 'area' || tool === 'rectangle' || tool === 'circle') return scaleUnit ? `${scaleUnit}²` : 'm²'
  return scaleUnit ?? 'm'
}

function ToolIcon({ tool }: { tool: string }) {
  if (tool === 'area' || tool === 'rectangle' || tool === 'circle') return <Square size={14} className="text-[var(--color-amber)]" />
  if (tool === 'count') return <Hash size={14} className="text-[var(--color-amber)]" />
  return <Ruler size={14} className="text-[var(--color-amber)]" />
}

interface SaveToQuantitiesDialogProps {
  dm: DrawingMeasurement | null
  canvasDataUrl: string | null
  projectId: string
  drawingId: string
  drawingName?: string
  drawingNumber?: string
  revisionNumber?: string
  pageNumber?: number
  scaleLabel?: string
  onSaved: () => void
  onClose: () => void
}

export function SaveToQuantitiesDialog({
  dm,
  canvasDataUrl,
  projectId,
  drawingId,
  drawingName,
  drawingNumber,
  revisionNumber,
  pageNumber,
  scaleLabel,
  onSaved,
  onClose,
}: SaveToQuantitiesDialogProps) {
  const [description, setDescription] = useState('')
  const [unit, setUnit] = useState('m')
  const [section, setSection] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!dm) return
    setDescription(toolLabel(dm.tool_type))
    setUnit(dm.unit ?? toolUnit(dm.tool_type))
    setSaved(false)
  }, [dm])

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })

  const handleSave = async () => {
    if (!dm || !description.trim()) return
    setSaving(true)
    try {
      // 1. Create measurement item + BOQ item via one-call action
      const result = await createQuantityFromDrawing({
        projectId,
        drawingMeasurementId: dm.id,
        description: description.trim(),
        unit,
        section: section.trim() || undefined,
      })

      if (result.error) throw new Error(result.error)

      // 2. Save sketch
      if (canvasDataUrl) {
        const drawingRef = [
          drawingName,
          drawingNumber ? `#${drawingNumber}` : null,
          revisionNumber ? `Rev ${revisionNumber}` : null,
        ].filter(Boolean).join(' ')

        await createSketch({
          projectId,
          drawingId,
          drawingMeasurementId: dm.id,
          miId: result.miId || undefined,
          imageDataUrl: canvasDataUrl,
          quantity: dm.quantity,
          unit: dm.unit ?? unit,
          pageNumber: pageNumber ?? dm.page_number,
          drawingName,
          drawingNumber,
          revisionNumber,
          drawingRef,
          scaleLabel,
          snapshotType: 'auto',
        })
      }

      setSaved(true)
      setTimeout(() => {
        onSaved()
        onClose()
      }, 800)
    } catch {
      // silent fail — measurement was already saved
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <AnimatePresence>
      {dm && (
        <motion.div
          initial={{ opacity: 0, x: 20, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: 20, scale: 0.97 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute bottom-20 end-4 z-30 w-80 rounded-2xl border border-[var(--color-amber)]/30 bg-[var(--color-surface-low)] shadow-2xl overflow-hidden"
        >
          {/* Amber top border */}
          <div className="h-px bg-gradient-to-r from-transparent via-[var(--color-amber)]/40 to-transparent" />

          <div className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ToolIcon tool={dm.tool_type} />
                <span className="text-xs font-semibold text-[var(--color-text)] uppercase tracking-wide">
                  {toolLabel(dm.tool_type)} Captured
                </span>
              </div>
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]">
                <X size={13} />
              </button>
            </div>

            {/* Quantity display */}
            <div className="flex items-baseline gap-2 px-3 py-2 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <span className="text-2xl font-bold font-mono text-[var(--color-amber)] tabular-nums">
                {fmt(dm.quantity)}
              </span>
              <span className="text-sm text-[var(--color-text-secondary)]">{dm.unit ?? unit}</span>
            </div>

            {/* Form fields */}
            <div className="space-y-2">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description (e.g. External Wall Length)"
                className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-amber)]/50"
                autoFocus
              />
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-8 px-2 pe-6 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none appearance-none"
                  >
                    {MEASUREMENT_UNITS.map(u => (
                      <option key={u.value} value={u.value}>{u.label}</option>
                    ))}
                  </select>
                  <ChevronDown size={11} className="absolute end-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                </div>
                <input
                  type="text"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="Section (optional)"
                  className="flex-1 h-8 px-2 text-xs rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 h-8 text-xs font-medium rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleSave}
                disabled={saving || saved || !description.trim()}
                className={cn(
                  'flex-1 h-8 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all',
                  saved
                    ? 'bg-[var(--color-success-light)] text-white'
                    : 'bg-[var(--color-amber)] text-[var(--color-on-amber)] hover:opacity-90 disabled:opacity-50',
                )}
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : saved ? <Check size={12} /> : null}
                {saved ? 'Saved!' : saving ? 'Saving…' : 'Save to BOQ'}
              </button>
            </div>

            {/* Drawing ref */}
            {(drawingName || drawingNumber) && (
              <p className="text-[10px] text-[var(--color-text-muted)] text-center">
                {[drawingName, drawingNumber ? `#${drawingNumber}` : null, revisionNumber ? `Rev ${revisionNumber}` : null].filter(Boolean).join(' · ')}
                {pageNumber ? ` · Pg ${pageNumber}` : ''}
              </p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
