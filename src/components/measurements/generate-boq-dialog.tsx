'use client'

import { cn } from '@/lib/utils'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import type { MeasurementItem } from '@/lib/types'
import { FileSpreadsheet } from 'lucide-react'
import { useState } from 'react'

interface GenerateBOQDialogProps {
  isOpen: boolean
  onClose: () => void
  selectedItems: MeasurementItem[]
  onGenerate: (options: { linkLibrary: boolean; copyRates: boolean }) => Promise<void>
}

function formatQty(n: number): string {
  if (n === 0) return '0.00'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export function GenerateBOQDialog({
  isOpen,
  onClose,
  selectedItems,
  onGenerate,
}: GenerateBOQDialogProps) {
  const [linkLibrary, setLinkLibrary] = useState(true)
  const [copyRates, setCopyRates] = useState(true)
  const [loading, setLoading] = useState(false)

  const handleGenerate = async () => {
    setLoading(true)
    try {
      await onGenerate({ linkLibrary, copyRates })
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Generate BOQ Items" size="lg">
      <div className="space-y-5">
        {/* Count */}
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)]">
          <FileSpreadsheet size={16} className="text-amber-500" />
          <span>
            <span className="font-semibold text-[var(--color-text)] dark:text-white">{selectedItems.length}</span> measurement
            item{selectedItems.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Options */}
        <div className="space-y-3 bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface)] rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={linkLibrary}
              onChange={(e) => setLinkLibrary(e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-info)] focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-[var(--color-text-secondary)] dark:text-[var(--color-text)]">Auto-link to library items</div>
              <div className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">Match codes against the pricing library</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={copyRates}
              onChange={(e) => setCopyRates(e.target.checked)}
              className="rounded border-[var(--color-border)] text-[var(--color-info)] focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-[var(--color-text-secondary)] dark:text-[var(--color-text)]">Copy rates from library</div>
              <div className="text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">Pre-fill unit rates for matched items</div>
            </div>
          </label>
        </div>

        {/* Preview table */}
        <div className="border border-[var(--color-border)] dark:border-[var(--color-border)] rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--color-surface-elevated)] dark:bg-[var(--color-surface-elevated)] text-xs font-semibold text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] uppercase tracking-wider">
                <th className="px-3 py-2 border-r border-[var(--color-border)] dark:border-[var(--color-border)]">Code</th>
                <th className="px-3 py-2 border-r border-[var(--color-border)] dark:border-[var(--color-border)]">Description</th>
                <th className="px-3 py-2 border-r border-[var(--color-border)] text-end">Qty</th>
                <th className="px-3 py-2 text-center">Unit</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item) => (
                <tr key={item.id} className="border-t border-[var(--color-border)] dark:border-[var(--color-border)] text-xs">
                  <td className="px-3 py-2 border-r border-[var(--color-border)] font-medium text-[var(--color-text-secondary)] dark:text-[var(--color-text)]">
                    {item.item_code || '—'}
                  </td>
                  <td className="px-3 py-2 border-r border-[var(--color-border)] text-[var(--color-text-secondary)] dark:text-[var(--color-text-secondary)] max-w-[250px] truncate">
                    {item.description}
                  </td>
                  <td className="px-3 py-2 border-r border-[var(--color-border)] text-end tabular-nums font-medium">
                    {formatQty(item.net_qty)}
                  </td>
                  <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">{item.unit}</td>
                </tr>
              ))}
              {selectedItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs text-[var(--color-text-muted)] dark:text-[var(--color-text-muted)]">
                    No items selected
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="accent"
            size="sm"
            onClick={handleGenerate}
            loading={loading}
            disabled={selectedItems.length === 0}
          >
            <FileSpreadsheet size={15} />
            Generate BOQ Items
          </Button>
        </div>
      </div>
    </Modal>
  )
}
