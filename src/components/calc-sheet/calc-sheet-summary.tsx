'use client'

import { useState } from 'react'
import type { MeasurementItem, QuantityApproval } from '@/lib/types'
import { createApproval } from '@/app/actions/quantity-approvals'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CalcSheetSummaryProps {
  projectId: string
  boqItemId: string
  item: MeasurementItem
  latestApproval: QuantityApproval | null
  defaultApproverName?: string
  onApproved: () => void
}

const STATUS_STYLES: Record<string, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  approved: { label: 'Approved', className: 'text-green-700 bg-green-50 border-green-200', icon: CheckCircle2 },
  pending: { label: 'Pending', className: 'text-amber-700 bg-amber-50 border-amber-200', icon: Clock },
  draft: { label: 'Draft', className: 'text-[var(--color-text-muted)] bg-[var(--color-surface)] border-[var(--color-border)]', icon: Clock },
  rejected: { label: 'Rejected', className: 'text-red-700 bg-red-50 border-red-200', icon: AlertTriangle },
}

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

export function CalcSheetSummary({
  projectId,
  boqItemId,
  item,
  latestApproval,
  defaultApproverName,
  onApproved,
}: CalcSheetSummaryProps) {
  const [showApprove, setShowApprove] = useState(false)
  const [approving, setApproving] = useState(false)
  const [form, setForm] = useState({
    approved_quantity: String(item.net_qty),
    approver_name: defaultApproverName ?? '',
    notes: '',
    status: 'approved' as 'approved' | 'pending' | 'rejected',
  })

  const subtotal = item.additions_qty ?? 0
  const deductions = item.deductions_qty ?? 0
  const net = item.net_qty ?? 0
  const approvedQty = latestApproval?.approved_quantity ?? net
  const status = STATUS_STYLES[latestApproval?.status ?? 'pending']
  const StatusIcon = status.icon

  const handleOpenApprove = () => {
    setForm({
      approved_quantity: String(net),
      approver_name: defaultApproverName ?? '',
      notes: '',
      status: 'approved',
    })
    setShowApprove(true)
  }

  const handleSubmitApproval = async () => {
    const approvedQuantity = parseFloat(form.approved_quantity)
    if (!isFinite(approvedQuantity)) return
    setApproving(true)
    await createApproval({
      project_id: projectId,
      boq_item_id: boqItemId,
      mi_id: item.id,
      calculated_quantity: net,
      approved_quantity: approvedQuantity,
      unit: item.unit,
      status: form.status,
      approver_name: form.approver_name || undefined,
      notes: form.notes || undefined,
    })
    setApproving(false)
    setShowApprove(false)
    onApproved()
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div>
          <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Subtotal</div>
          <div className="text-lg font-semibold text-[var(--color-text)] tabular-nums">{fmt(subtotal)} {item.unit}</div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Deductions</div>
          <div className="text-lg font-semibold text-red-600 tabular-nums">−{fmt(deductions)} {item.unit}</div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Net Quantity</div>
          <div className="text-lg font-bold text-[var(--color-text)] tabular-nums">{fmt(net)} {item.unit}</div>
        </div>
        <div>
          <div className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wide">Approved Quantity</div>
          <div className="text-lg font-bold text-[var(--color-amber)] tabular-nums">{fmt(approvedQty)} {item.unit}</div>
        </div>
        <div className="flex flex-col justify-between">
          <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs font-medium w-fit', status.className)}>
            <StatusIcon size={13} />
            {status.label}
          </div>
          <Button size="sm" variant="outline" onClick={handleOpenApprove} className="mt-2 w-fit">
            Approve Quantity
          </Button>
        </div>
      </div>

      {latestApproval && (
        <div className="mt-4 pt-3 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex flex-wrap gap-x-6 gap-y-1">
          {latestApproval.approver_name && <span>Approved by: <span className="text-[var(--color-text)]">{latestApproval.approver_name}</span></span>}
          <span>On: <span className="text-[var(--color-text)]">{new Date(latestApproval.approved_at).toLocaleDateString('en-GB')}</span></span>
          {latestApproval.notes && <span>Notes: <span className="text-[var(--color-text)]">{latestApproval.notes}</span></span>}
        </div>
      )}

      <Modal isOpen={showApprove} onClose={() => setShowApprove(false)} title="Approve Quantity" size="sm">
        <div className="space-y-3">
          <Input
            label={`Approved Quantity (${item.unit})`}
            type="number"
            step="any"
            value={form.approved_quantity}
            onChange={(e) => setForm((f) => ({ ...f, approved_quantity: e.target.value }))}
          />
          <Input
            label="Approver Name"
            value={form.approver_name}
            onChange={(e) => setForm((f) => ({ ...f, approver_name: e.target.value }))}
          />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-[var(--color-text-secondary)]">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as typeof form.status }))}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)] focus:outline-none focus:border-[var(--color-amber)]"
            >
              <option value="approved">Approved</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <Input
            label="Notes"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setShowApprove(false)}>Cancel</Button>
            <Button loading={approving} onClick={handleSubmitApproval}>Save Approval</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
