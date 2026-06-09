'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { ProjectForm } from './project-form'

export function NewProjectButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus size={16} />
        New Project
      </Button>
      <Modal isOpen={open} onClose={() => setOpen(false)} title="Create New Project" size="lg">
        <ProjectForm onSuccess={() => setOpen(false)} onCancel={() => setOpen(false)} />
      </Modal>
    </>
  )
}
