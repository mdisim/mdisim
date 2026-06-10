'use client'

import { useState } from 'react'
import { BOQItem } from '@/lib/types'
import { BOQTable } from './boq-table'
import { BOQItemForm } from './boq-item-form'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus, Download } from 'lucide-react'

interface BOQPageClientProps {
  items: BOQItem[]
  projectId: string
}

function exportToCSV(items: BOQItem[]) {
  const headers = ['Item Code', 'Description', 'Unit', 'Quantity', 'Unit Rate', 'Total Amount', 'Category', 'Notes']
  const rows = items.map((item) => [
    item.item_code,
    item.description,
    item.unit,
    item.quantity,
    item.unit_rate,
    item.total_amount,
    item.category ?? '',
    item.notes ?? '',
  ])
  const csvContent = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'boq-export.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function BOQPageClient({ items, projectId }: BOQPageClientProps) {
  const [editItem, setEditItem] = useState<BOQItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-4 gap-2">
        {items.length > 0 && (
          <button
            onClick={() => exportToCSV(items)}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download size={16} />
            Export CSV
          </button>
        )}
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Add BOQ Item
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <BOQTable
          items={items}
          onEdit={(item) => setEditItem(item)}
        />
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add BOQ Item" size="lg">
        <BOQItemForm
          projectId={projectId}
          onSuccess={() => setShowAdd(false)}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit BOQ Item"
        size="lg"
      >
        {editItem && (
          <BOQItemForm
            projectId={projectId}
            item={editItem}
            onSuccess={() => setEditItem(null)}
            onCancel={() => setEditItem(null)}
          />
        )}
      </Modal>
    </div>
  )
}
