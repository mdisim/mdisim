'use client'

import { useState } from 'react'
import { BOQItem } from '@/lib/types'
import { BOQTable } from './boq-table'
import { BOQItemForm } from './boq-item-form'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface BOQPageClientProps {
  items: BOQItem[]
  projectId: string
}

export function BOQPageClient({ items, projectId }: BOQPageClientProps) {
  const [editItem, setEditItem] = useState<BOQItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-4">
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
