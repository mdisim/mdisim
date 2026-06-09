'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ContractorForm } from './contractor-form'

export function NewContractorButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        Add Contractor
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Add Contractor" size="lg">
        <ContractorForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  )
}
