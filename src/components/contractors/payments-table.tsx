'use client'

import { useState } from 'react'
import { ContractorPayment, Contractor } from '@/lib/types'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge, getStatusBadgeVariant, formatStatusLabel } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Pencil, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { PaymentForm } from './payment-form'

interface PaymentsTableProps {
  payments: ContractorPayment[]
  projectId: string
  contractors: Contractor[]
}

export function PaymentsTable({ payments, projectId, contractors }: PaymentsTableProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState<string | null>(null)
  const [editPayment, setEditPayment] = useState<ContractorPayment | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this payment record?')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('contractor_payments').delete().eq('id', id)
    router.refresh()
    setDeleting(null)
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button onClick={() => setShowAdd(true)}>
          <Plus size={16} />
          Record Payment
        </Button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Contractor</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-400 py-8">
                  No payment records yet.
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="text-xs text-slate-500">{formatDate(payment.payment_date)}</TableCell>
                  <TableCell>
                    <p className="font-medium text-slate-800">
                      {(payment.contractor as Contractor | undefined)?.name || 'Unknown'}
                    </p>
                    {(payment.contractor as Contractor | undefined)?.company && (
                      <p className="text-xs text-slate-400">{(payment.contractor as Contractor | undefined)?.company}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{payment.description || '-'}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {payment.payment_method?.replace('_', ' ') || '-'}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-slate-500">
                    {payment.reference_number || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(payment.status)}>
                      {formatStatusLabel(payment.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-slate-800">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditPayment(payment)}
                        className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-amber-600 transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(payment.id)}
                        disabled={deleting === payment.id}
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

        {payments.length > 0 && (
          <div className="flex justify-end px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-right">
              <p className="text-sm text-slate-500">Total Payments</p>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(payments.reduce((s, p) => s + p.amount, 0))}
              </p>
            </div>
          </div>
        )}
      </div>

      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Record Payment" size="lg">
        <PaymentForm
          projectId={projectId}
          contractors={contractors}
          onSuccess={() => setShowAdd(false)}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>

      <Modal isOpen={!!editPayment} onClose={() => setEditPayment(null)} title="Edit Payment" size="lg">
        {editPayment && (
          <PaymentForm
            projectId={projectId}
            payment={editPayment}
            contractors={contractors}
            onSuccess={() => setEditPayment(null)}
            onCancel={() => setEditPayment(null)}
          />
        )}
      </Modal>
    </div>
  )
}
