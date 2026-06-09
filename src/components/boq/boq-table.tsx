'use client'

import { BOQItem } from '@/lib/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface BOQTableProps {
  items: BOQItem[]
  onEdit?: (item: BOQItem) => void
  projectId?: string
}

export function BOQTable({ items, onEdit, projectId }: BOQTableProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this BOQ item?')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('boq_items').delete().eq('id', id)
    router.refresh()
    setDeleting(null)
  }

  const total = items.reduce((sum, item) => sum + item.total_amount, 0)

  // Group by category
  const categories = Array.from(new Set(items.map((i) => i.category || 'Uncategorized')))

  return (
    <div>
      <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-right">Unit</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit Rate</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                No BOQ items yet. Add items to get started.
              </TableCell>
            </TableRow>
          ) : (
            items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-xs text-slate-500">{item.item_code}</TableCell>
                <TableCell>
                  <p className="font-medium text-slate-800">{item.description}</p>
                  {item.notes && <p className="text-xs text-slate-400">{item.notes}</p>}
                </TableCell>
                <TableCell>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {item.category || 'General'}
                  </span>
                </TableCell>
                <TableCell className="text-right text-slate-600">{item.unit}</TableCell>
                <TableCell className="text-right text-slate-600">{item.quantity.toLocaleString()}</TableCell>
                <TableCell className="text-right text-slate-600">{formatCurrency(item.unit_rate)}</TableCell>
                <TableCell className="text-right font-semibold text-slate-800">
                  {formatCurrency(item.total_amount)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit?.(item)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="p-1.5 rounded hover:bg-red-50 text-slate-500 hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      </div>

      {items.length > 0 && (
        <div className="flex justify-end px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-right">
            <p className="text-sm text-slate-500">Total BOQ Value</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(total)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
