'use client'

import { CostEntry } from '@/lib/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge, getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CostTableProps {
  costs: CostEntry[]
  onEdit: (cost: CostEntry) => void
}

export function CostTable({ costs, onEdit }: CostTableProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this cost entry?')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('cost_entries').delete().eq('id', id)
    router.refresh()
    setDeleting(null)
  }

  const total = costs.reduce((sum, c) => sum + c.amount, 0)

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Invoice #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {costs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                No cost entries yet. Record your first cost.
              </TableCell>
            </TableRow>
          ) : (
            costs.map((cost) => (
              <TableRow key={cost.id}>
                <TableCell className="text-xs text-slate-500">{formatDate(cost.cost_date)}</TableCell>
                <TableCell>
                  <p className="font-medium text-slate-800">{cost.description}</p>
                  {cost.notes && <p className="text-xs text-slate-400">{cost.notes}</p>}
                </TableCell>
                <TableCell>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {cost.category}
                  </span>
                </TableCell>
                <TableCell className="text-sm text-slate-600">{cost.vendor || '-'}</TableCell>
                <TableCell className="font-mono text-xs text-slate-500">{cost.invoice_number || '-'}</TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(cost.status)}>
                    {formatStatusLabel(cost.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-slate-800">
                  {formatCurrency(cost.amount)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => onEdit(cost)}
                      className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(cost.id)}
                      disabled={deleting === cost.id}
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

      {costs.length > 0 && (
        <div className="flex justify-end px-4 py-3 border-t border-slate-200 bg-slate-50">
          <div className="text-right">
            <p className="text-sm text-slate-500">Total Costs</p>
            <p className="text-xl font-bold text-slate-900">{formatCurrency(total)}</p>
          </div>
        </div>
      )}
    </div>
  )
}
