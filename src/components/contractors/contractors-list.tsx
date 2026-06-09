'use client'

import { useState } from 'react'
import { Contractor } from '@/lib/types'
import { ContractorCard } from './contractor-card'
import { ContractorForm } from './contractor-form'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface ContractorsListProps {
  contractors: Contractor[]
}

export function ContractorsList({ contractors }: ContractorsListProps) {
  const router = useRouter()
  const [editContractor, setEditContractor] = useState<Contractor | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contractor? This will also remove their payment records.')) return
    const supabase = createClient()
    await supabase.from('contractors').delete().eq('id', id)
    router.refresh()
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {contractors.map((contractor) => (
          <ContractorCard
            key={contractor.id}
            contractor={contractor}
            onEdit={setEditContractor}
            onDelete={handleDelete}
          />
        ))}
      </div>

      <Modal
        isOpen={!!editContractor}
        onClose={() => setEditContractor(null)}
        title="Edit Contractor"
        size="lg"
      >
        {editContractor && (
          <ContractorForm
            contractor={editContractor}
            onSuccess={() => setEditContractor(null)}
            onCancel={() => setEditContractor(null)}
          />
        )}
      </Modal>
    </>
  )
}
