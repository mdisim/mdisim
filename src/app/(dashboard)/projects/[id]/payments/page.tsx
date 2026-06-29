'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import type { PaymentCert, PaymentLine, PaymentCertStatus } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { TableSkeleton } from '@/components/ui/skeleton'
import { StatCard } from '@/components/ui/stat-card'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import { SimpleBarChart } from '@/components/ui/mini-chart'
import { EmptyState } from '@/components/ui/empty-state'
import {
  getPaymentCerts,
  createPaymentCert,
  updatePaymentCert,
  deletePaymentCert,
  updatePaymentLine,
  populateCertFromBOQ,
} from '@/app/actions/payments'
import { Card, CardContent } from '@/components/ui/card'
import {
  Plus,
  Trash2,
  Receipt,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  Send,
  FileCheck,
  CreditCard,
  Banknote,
  ArrowUpRight,
  Shield,
  Hash,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

const CERT_STATUS: Record<PaymentCertStatus, { label: string; color: string; icon: React.ComponentType<{ size?: number; className?: string }> }> = {
  draft: { label: 'Draft', color: 'text-slate-500 bg-slate-100 dark:bg-slate-700', icon: Clock },
  submitted: { label: 'Submitted', color: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30', icon: Send },
  checked: { label: 'Checked', color: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30', icon: FileCheck },
  approved: { label: 'Approved', color: 'text-green-600 bg-green-50 dark:bg-green-900/30', icon: CheckCircle2 },
  paid: { label: 'Paid', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30', icon: CreditCard },
}

const STATUS_FLOW: { key: PaymentCertStatus; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { key: 'draft', label: 'Draft', icon: Clock },
  { key: 'submitted', label: 'Submitted', icon: Send },
  { key: 'checked', label: 'Checked', icon: FileCheck },
  { key: 'approved', label: 'Approved', icon: CheckCircle2 },
  { key: 'paid', label: 'Paid', icon: CreditCard },
]

export default function PaymentsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { t } = useI18n()
  const [certs, setCerts] = useState<PaymentCert[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)

  const [form, setForm] = useState({
    period_from: '', period_to: '', retention_pct: '10', vat_pct: '17',
    advance_recovery: '0', previous_advance_recovery: '0',
  })

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getPaymentCerts(projectId)
      setCerts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load payment certificates')
      setCerts([])
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const stats = useMemo(() => {
    const totalCertified = certs.reduce((s, c) => s + c.gross_amount, 0)
    const totalPaid = certs.filter(c => c.status === 'paid').reduce((s, c) => s + c.net_payable, 0)
    const totalRetention = certs.reduce((s, c) => s + c.current_retention, 0)

    // Payment progress bars: certified vs paid per cert
    const progressBars = certs.map(c => ({
      certNumber: c.cert_number,
      certified: c.gross_amount,
      paid: c.status === 'paid' ? c.net_payable : 0,
      status: c.status,
    }))

    // Status counts for timeline
    const statusCounts: Record<PaymentCertStatus, number> = {
      draft: 0, submitted: 0, checked: 0, approved: 0, paid: 0,
    }
    certs.forEach(c => { statusCounts[c.status]++ })

    return { totalCertified, totalPaid, totalRetention, count: certs.length, progressBars, statusCounts }
  }, [certs])

  const handleCreate = async () => {
    if (!form.period_from || !form.period_to) return
    setError(null)
    const certNumber = certs.length + 1
    const previousCert = certs[certs.length - 1]

    const r = await createPaymentCert({
      project_id: projectId,
      cert_number: certNumber,
      period_from: form.period_from,
      period_to: form.period_to,
      retention_pct: parseFloat(form.retention_pct) || 10,
      vat_pct: parseFloat(form.vat_pct) || 17,
      advance_recovery: parseFloat(form.advance_recovery) || 0,
      previous_advance_recovery: parseFloat(form.previous_advance_recovery) || 0,
    })
    if (r.error) { setError(r.error); return }

    if (r.data) {
      try {
        await populateCertFromBOQ(r.data.id, projectId, previousCert?.id)
      } catch {
        setError('Certificate created but failed to populate lines from BOQ.')
      }
    }

    setShowCreate(false)
    setForm({ period_from: '', period_to: '', retention_pct: '10', vat_pct: '17', advance_recovery: '0', previous_advance_recovery: '0' })
    load()
  }

  const handleUpdateLine = async (lineId: string, currentQty: number) => {
    try {
      await updatePaymentLine(lineId, { current_qty: currentQty })
    } catch {
      setError('Failed to update line item.')
    }
    load()
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        icon={CreditCard}
        title={t.payments.title}
        subtitle="Interim Payment Certificates (IPC) & contractor payments"
        gradient="from-emerald-500 to-emerald-600"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> New Certificate
          </Button>
        }
      />

      {/* Statistics Dashboard */}
      {!loading && certs.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <StatCard
              icon={ArrowUpRight}
              label={t.payments.totalCertified}
              value={stats.totalCertified}
              decimals={2}
              gradient="from-indigo-500 to-indigo-600"
            />
            <StatCard
              icon={CreditCard}
              label={t.payments.totalPaid}
              value={stats.totalPaid}
              decimals={2}
              gradient="from-emerald-500 to-emerald-600"
            />
            <StatCard
              icon={Shield}
              label={t.payments.retentionHeld}
              value={stats.totalRetention}
              decimals={2}
              gradient="from-amber-500 to-amber-600"
            />
            <StatCard
              icon={Receipt}
              label={t.payments.certificates}
              value={stats.count}
              gradient="from-blue-500 to-blue-600"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Payment Progress */}
            {stats.progressBars.length > 0 && (
              <SectionCard title={t.payments.paymentProgress} icon={Banknote} iconColor="text-emerald-500">
                <SimpleBarChart
                  bars={stats.progressBars.flatMap(p => [
                    { label: `IPC #${p.certNumber} (Certified)`, value: p.certified, color: '#6366f1' },
                    { label: `IPC #${p.certNumber} (Paid)`, value: p.paid, color: '#10b981' },
                  ])}
                  horizontal
                />
              </SectionCard>
            )}

            {/* Payment Timeline */}
            <SectionCard title="Payment Timeline" icon={Clock} iconColor="text-blue-500">
              <div className="flex items-center justify-between gap-1">
                {STATUS_FLOW.map((step, i) => {
                  const count = stats.statusCounts[step.key]
                  const StepIcon = step.icon
                  const isActive = count > 0
                  return (
                    <div key={step.key} className="flex items-center flex-1">
                      <div className="flex flex-col items-center flex-1">
                        <div className={cn(
                          'w-10 h-10 rounded-xl flex items-center justify-center mb-2 transition-all',
                          isActive
                            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'
                        )}>
                          <StepIcon size={18} />
                        </div>
                        <span className={cn(
                          'text-xs font-medium',
                          isActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                        )}>
                          {step.label}
                        </span>
                        <span className={cn(
                          'text-lg font-bold tabular-nums mt-0.5',
                          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'
                        )}>
                          {count}
                        </span>
                      </div>
                      {i < STATUS_FLOW.length - 1 && (
                        <ArrowRight size={14} className="text-slate-300 dark:text-slate-600 shrink-0 mx-1 -mt-6" />
                      )}
                    </div>
                  )
                })}
              </div>
            </SectionCard>
          </div>
        </>
      )}

      {loading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : error && certs.length === 0 ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">{error}</p>
          <Button onClick={() => load()}>Retry</Button>
        </div>
      ) : certs.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No payment certificates yet"
          description="Create a certificate to start the payment workflow."
          actionLabel="Create IPC #1"
          onAction={() => setShowCreate(true)}
        />
      ) : (
        <div className="space-y-4">
          {certs.map((cert, idx) => (
            <motion.div
              key={cert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
            >
            <CertCard
              cert={cert}
              isExpanded={expandedId === cert.id}
              onToggle={() => setExpandedId(expandedId === cert.id ? null : cert.id)}
              onDelete={() => setConfirmAction({ message: 'Delete this certificate?', onConfirm: async () => { await deletePaymentCert(cert.id); load() } })}
              onStatusChange={async (s) => { await updatePaymentCert(cert.id, { status: s }); load() }}
              onUpdateLine={handleUpdateLine}
              fmt={fmt}
            />
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={`New IPC #${certs.length + 1}`} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Period From" type="date" value={form.period_from} onChange={e => setForm({ ...form, period_from: e.target.value })} />
            <Input label="Period To" type="date" value={form.period_to} onChange={e => setForm({ ...form, period_to: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Retention %" type="number" value={form.retention_pct} onChange={e => setForm({ ...form, retention_pct: e.target.value })} />
            <Input label="VAT %" type="number" value={form.vat_pct} onChange={e => setForm({ ...form, vat_pct: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Advance Recovery" type="number" value={form.advance_recovery} onChange={e => setForm({ ...form, advance_recovery: e.target.value })} />
            <Input label="Previous Advance Recovery" type="number" value={form.previous_advance_recovery} onChange={e => setForm({ ...form, previous_advance_recovery: e.target.value })} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">BOQ items will be auto-populated. Previous quantities carried forward from prior certificate.</p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!form.period_from || !form.period_to}>Create</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title="Confirm" size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>Confirm</Button>
        </div>
      </Modal>
    </div>
  )
}

function CertCard({
  cert,
  isExpanded,
  onToggle,
  onDelete,
  onStatusChange,
  onUpdateLine,
  fmt,
}: {
  cert: PaymentCert
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  onStatusChange: (s: PaymentCertStatus) => void
  onUpdateLine: (lineId: string, currentQty: number) => void
  fmt: (n: number) => string
}) {
  const lines = cert.lines ?? []
  const sm = CERT_STATUS[cert.status]
  const Icon = sm.icon

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750" role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}>
        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 dark:text-white">IPC #{cert.cert_number}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {cert.period_from} to {cert.period_to} · {lines.length} items
          </div>
        </div>
        <div className="text-right mr-2">
          <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{fmt(cert.net_payable)}</div>
          <div className="text-[10px] text-slate-400">net payable</div>
        </div>
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', sm.color)}>
          <Icon size={12} /> {sm.label}
        </span>
        <button onClick={e => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500">
          <Trash2 size={14} />
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-200 dark:border-slate-700">
          {/* Status bar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/50 dark:bg-slate-900/30">
            <select
              value={cert.status}
              onChange={e => onStatusChange(e.target.value as PaymentCertStatus)}
              className="text-xs px-2 py-1 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-white"
            >
              {Object.entries(CERT_STATUS).map(([k, m]) => <option key={k} value={k}>{m.label}</option>)}
            </select>
          </div>

          {/* Lines table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-left px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 min-w-[180px]">Description</th>
                  <th className="text-center px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[50px]">Unit</th>
                  <th className="text-right px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">Contract Qty</th>
                  <th className="text-right px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">Rate</th>
                  <th className="text-right px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">Previous Qty</th>
                  <th className="text-right px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[80px]">Current Qty</th>
                  <th className="text-right px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">Cum. Qty</th>
                  <th className="text-right px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[90px]">Cum. Amount</th>
                </tr>
              </thead>
              <tbody>
                {lines.sort((a, b) => a.sort_order - b.sort_order).map(line => (
                  <tr key={line.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{line.description}</td>
                    <td className="px-2 py-1.5 text-center text-slate-500">{line.unit}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-500">{fmt(line.contract_qty)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-500">{fmt(line.contract_rate)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums text-slate-500">{fmt(line.previous_qty)}</td>
                    <td className="px-2 py-0.5">
                      <input
                        type="number"
                        value={line.current_qty || ''}
                        onChange={e => onUpdateLine(line.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-1 py-0.5 text-xs text-right border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        step="any"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium text-slate-700 dark:text-slate-200">{fmt(line.cumulative_qty)}</td>
                    <td className="px-2 py-1.5 text-right tabular-nums font-medium text-slate-900 dark:text-white">{fmt(line.cumulative_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3">
            <table className="w-full text-xs">
              <tbody>
                {[
                  { label: 'Gross Amount (Cumulative)', value: cert.gross_amount },
                  { label: 'Less: Previous Gross', value: -cert.previous_gross },
                  { label: 'Current Gross', value: cert.current_gross, bold: true },
                  { label: `Less: Retention (${cert.retention_pct}%)`, value: -cert.current_retention },
                  { label: 'Less: Advance Recovery', value: -cert.current_advance_recovery },
                  { label: `Add: VAT (${cert.vat_pct}%)`, value: cert.vat_amount },
                  { label: 'Net Payable', value: cert.net_payable, bold: true, highlight: true },
                ].map(row => (
                  <tr key={row.label} className={row.bold ? 'border-t border-slate-200 dark:border-slate-600' : ''}>
                    <td className={cn('py-1', row.bold ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300')}>{row.label}</td>
                    <td className={cn('py-1 text-right tabular-nums', row.bold ? 'font-bold' : '',
                      row.highlight ? 'text-lg text-blue-600 dark:text-blue-400' : row.bold ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-200',
                      row.value < 0 && !row.highlight && 'text-red-600 dark:text-red-400'
                    )}>{fmt(row.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
