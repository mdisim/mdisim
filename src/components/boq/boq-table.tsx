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

  // Category subtotals
  const categoryTotals = categories.reduce((acc, cat) => {
    acc[cat] = items
      .filter((i) => (i.category || 'Uncategorized') === cat)
      .reduce((sum, i) => sum + i.total_amount, 0)
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <div className="overflow-x-auto [-webkit-overflow-scrolling:touch]">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50/80">
            <TableHead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm text-xs uppercase tracking-wider text-slate-500 font-medium">Code</TableHead>
            <TableHead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm text-xs uppercase tracking-wider text-slate-500 font-medium">Description</TableHead>
            <TableHead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm text-xs uppercase tracking-wider text-slate-500 font-medium hidden md:table-cell">Category</TableHead>
            <TableHead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm text-xs uppercase tracking-wider text-slate-500 font-medium text-right hidden sm:table-cell">Unit</TableHead>
            <TableHead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm text-xs uppercase tracking-wider text-slate-500 font-medium text-right">Qty</TableHead>
            <TableHead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm text-xs uppercase tracking-wider text-slate-500 font-medium text-right hidden sm:table-cell">Unit Rate</TableHead>
            <TableHead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm text-xs uppercase tracking-wider text-slate-500 font-medium text-right">Total</TableHead>
            <TableHead className="sticky top-0 bg-slate-50/80 backdrop-blur-sm text-xs uppercase tracking-wider text-slate-500 font-medium text-right w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-center text-slate-400 py-16">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                    <svg className="h-6 w-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <p className="text-sm font-medium text-slate-500">No BOQ items yet</p>
                  <p className="text-xs text-slate-400">Add items to get started.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            categories.map((cat) => {
              const catItems = items.filter((i) => (i.category || 'Uncategorized') === cat)
              return catItems.map((item, idx) => (
                <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono text-xs text-slate-400">{item.item_code}</TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-800 text-sm">{item.description}</p>
                    {item.notes && <p className="text-xs text-slate-400 mt-0.5">{item.notes}</p>}
                    {/* Show category inline on mobile */}
                    <span className="md:hidden text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">{item.category || 'General'}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      {item.category || 'General'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-slate-600 text-sm hidden sm:table-cell">{item.unit}</TableCell>
                  <TableCell className="text-right text-slate-600 text-sm tabular-nums">{item.quantity.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-slate-600 text-sm tabular-nums hidden sm:table-cell">{formatCurrency(item.unit_rate)}</TableCell>
                  <TableCell className="text-right font-semibold text-slate-800 text-sm tabular-nums">
                    {formatCurrency(item.total_amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => onEdit?.(item)}
                        className="p-1.5 rounded-md hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        className="p-1.5 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            })
          )}
        </TableBody>
      </Table>
      </div>

      {items.length > 0 && (
        <div className="border-t border-slate-200">
          {/* Category subtotals */}
          {categories.length > 1 && (
            <div className="px-4 py-2 space-y-1 bg-slate-50/50">
              {categories.map((cat) => (
                <div key={cat} className="flex justify-between text-sm">
                  <span className="text-slate-500 font-medium">{cat}</span>
                  <span className="text-slate-700 font-semibold tabular-nums">{formatCurrency(categoryTotals[cat])}</span>
                </div>
              ))}
            </div>
          )}
          {/* Grand total */}
          <div className="flex justify-between items-center px-4 py-3 bg-[#0F172A]">
            <span className="text-sm font-medium text-slate-300">Total BOQ Value</span>
            <span className="text-xl font-bold text-white tabular-nums">{formatCurrency(total)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
