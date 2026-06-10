'use client'

import { useState } from 'react'
import { Contractor } from '@/lib/types'
import { ContractorCard } from './contractor-card'
import { ContractorForm } from './contractor-form'
import { Modal } from '@/components/ui/modal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface ContractorsListProps {
  contractors: Contractor[]
}

export function ContractorsList({ contractors }: ContractorsListProps) {
  const router = useRouter()
  const [editContractor, setEditContractor] = useState<Contractor | null>(null)
  const [search, setSearch] = useState('')

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this contractor? This will also remove their payment records.')) return
    const supabase = createClient()
    await supabase.from('contractors').delete().eq('id', id)
    router.refresh()
  }

  const filtered = contractors.filter((c) => {
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.specialty?.toLowerCase().includes(q) ?? false) ||
      (c.company?.toLowerCase().includes(q) ?? false)
    )
  })

  return (
    <>
      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or specialty..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Search size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No contractors match your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((contractor) => (
            <ContractorCard
              key={contractor.id}
              contractor={contractor}
              onEdit={setEditContractor}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

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
