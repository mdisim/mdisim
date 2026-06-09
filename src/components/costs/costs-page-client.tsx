'use client'

import { useState } from 'react'
import { CostEntry, BOQItem } from '@/lib/types'
import { CostTable } from './cost-table'
import { CostForm } from './cost-form'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface CostsPageClientProps {
  costs: CostEntry[]
  boqItems: BOQItem[]
  projectId: string
}

export function CostsPageClient({ costs, boqItems, projectId }: CostsPageClientProps) {
  const [editCost, setEditCost] = useState<CostEntry | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Record Cost
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <CostTable costs={costs} onEdit={(cost) => setEditCost(cost)} />
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Cost Entry" size="lg">
        <CostForm
          projectId={projectId}
          boqItems={boqItems}
          onSuccess={() => setShowAdd(false)}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal
        isOpen={!!editCost}
        onClose={() => setEditCost(null)}
        title="Edit Cost Entry"
        size="lg"
      >
        {editCost && (
          <CostForm
            projectId={projectId}
            cost={editCost}
            boqItems={boqItems}
            onSuccess={() => setEditCost(null)}
            onCancel={() => setEditCost(null)}
          />
        )}
      </Modal>
    </div>
  )
}
