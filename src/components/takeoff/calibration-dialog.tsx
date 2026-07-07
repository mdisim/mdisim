'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalibrationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (realLength: number, unit: string) => void
  pixelDistance: number
}

const UNITS = ['m', 'cm', 'mm', 'ft', 'in'] as const

export function CalibrationDialog({
  isOpen,
  onClose,
  onConfirm,
  pixelDistance,
}: CalibrationDialogProps) {
  const [realLength, setRealLength] = useState<string>('')
  const [unit, setUnit] = useState<string>('m')

  if (!isOpen) return null

  const handleConfirm = () => {
    const val = parseFloat(realLength)
    if (!val || val <= 0) return
    onConfirm(val, unit)
    setRealLength('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white dark:bg-[var(--color-surface-elevated)] rounded-xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-[var(--color-text-muted)] dark:text-[var(--color-text)]">
            Set Scale
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-[var(--color-surface-hover)] dark:hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] mb-1">
              Pixel distance measured
            </label>
            <input
              readOnly
              value={`${pixelDistance.toFixed(1)} px`}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] dark:border-[var(--color-border)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-hover)] text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-secondary)]"
            />
          </div>

          <div>
            <label className="block text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)] mb-1">
              Real-world distance
            </label>
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="e.g. 5.0"
                value={realLength}
                onChange={(e) => setRealLength(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                autoFocus
                className="flex-1 px-3 py-2 rounded-lg border border-[var(--color-border)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-hover)] text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-amber)]"
              />
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[var(--color-border)] dark:border-[var(--color-border)] bg-white dark:bg-[var(--color-surface-hover)] text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text)] outline-none focus:ring-2 focus:ring-[var(--color-amber)]"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <p className="text-sm text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
            The two points you marked represent{' '}
            <strong className="text-[var(--color-text)]">
              {realLength || '___'} {unit}
            </strong>{' '}
            in real life.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-[var(--color-border)] dark:border-[var(--color-border)] text-[var(--color-text-muted)] dark:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] dark:hover:bg-[var(--color-surface-hover)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!realLength || parseFloat(realLength) <= 0}
            className={cn(
              'px-4 py-2 text-sm rounded-lg font-medium transition-colors',
              realLength && parseFloat(realLength) > 0
                ? 'bg-[var(--color-brand)] text-white hover:bg-[var(--color-brand)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] cursor-not-allowed',
            )}
          >
            Set Scale
          </button>
        </div>
      </div>
    </div>
  )
}
