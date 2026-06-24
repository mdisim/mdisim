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
        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <FileSpreadsheet size={16} className="text-amber-500" />
          <span>
            <span className="font-semibold text-slate-900 dark:text-white">{selectedItems.length}</span> measurement
            item{selectedItems.length !== 1 ? 's' : ''} selected
          </span>
        </div>

        {/* Options */}
        <div className="space-y-3 bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={linkLibrary}
              onChange={(e) => setLinkLibrary(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Auto-link to library items</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Match codes against the pricing library</div>
            </div>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={copyRates}
              onChange={(e) => setCopyRates(e.target.checked)}
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Copy rates from library</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">Pre-fill unit rates for matched items</div>
            </div>
          </label>
        </div>

        {/* Preview table */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">Code</th>
                <th className="px-3 py-2 border-r border-slate-200 dark:border-slate-700">Description</th>
                <th className="px-3 py-2 border-r border-slate-200 text-right">Qty</th>
                <th className="px-3 py-2 text-center">Unit</th>
              </tr>
            </thead>
            <tbody>
              {selectedItems.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 dark:border-slate-700 text-xs">
                  <td className="px-3 py-2 border-r border-slate-200 font-medium text-slate-700 dark:text-slate-200">
                    {item.item_code || '—'}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-200 text-slate-600 dark:text-slate-300 max-w-[250px] truncate">
                    {item.description}
                  </td>
                  <td className="px-3 py-2 border-r border-slate-200 text-right tabular-nums font-medium">
                    {formatQty(item.net_qty)}
                  </td>
                  <td className="px-3 py-2 text-center text-slate-500">{item.unit}</td>
                </tr>
              ))}
              {selectedItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-xs text-slate-400 dark:text-slate-500">
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
