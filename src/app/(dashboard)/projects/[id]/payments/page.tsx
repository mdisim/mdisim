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
import { useToast } from '@/components/ui/toast'
import type { TranslationKeys } from '@/lib/i18n/translations'

const STATUS_ICON: Record<PaymentCertStatus, React.ComponentType<{ size?: number; className?: string }>> = {
  draft: Clock,
  submitted: Send,
  checked: FileCheck,
  approved: CheckCircle2,
  paid: CreditCard,
}

const STATUS_COLOR: Record<PaymentCertStatus, string> = {
  draft: 'text-slate-500 bg-slate-100 dark:bg-slate-700',
  submitted: 'text-blue-600 bg-blue-50 dark:bg-blue-900/30',
  checked: 'text-amber-600 bg-amber-50 dark:bg-amber-900/30',
  approved: 'text-green-600 bg-green-50 dark:bg-green-900/30',
  paid: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30',
}

const STATUS_ORDER: PaymentCertStatus[] = ['draft', 'submitted', 'checked', 'approved', 'paid']

function getStatusLabel(t: TranslationKeys, status: PaymentCertStatus): string {
  switch (status) {
    case 'draft': return t.payments.statusDraft
    case 'submitted': return t.payments.statusSubmitted
    case 'checked': return t.payments.statusChecked
    case 'approved': return t.payments.statusApproved
    case 'paid': return t.payments.statusPaid
  }
}

export default function PaymentsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { t } = useI18n()
  const { toast } = useToast()
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
      setError(err instanceof Error ? err.message : t.payments.loadError)
      setCerts([])
    } finally {
      setLoading(false)
    }
  }, [projectId, t])

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
    if (r.error) {
      setError(r.error)
      toast({ title: t.payments.createError, description: r.error, variant: 'danger' })
      return
    }

    if (r.data) {
      try {
        await populateCertFromBOQ(r.data.id, projectId, previousCert?.id)
      } catch {
        setError(t.payments.createPopulateError)
        toast({ title: t.payments.createPopulateError, variant: 'warning' })
      }
    }

    toast({ title: t.payments.createSuccess, variant: 'success' })
    setShowCreate(false)
    setForm({ period_from: '', period_to: '', retention_pct: '10', vat_pct: '17', advance_recovery: '0', previous_advance_recovery: '0' })
    load()
  }

  const handleUpdateLine = async (lineId: string, currentQty: number) => {
    try {
      await updatePaymentLine(lineId, { current_qty: currentQty })
      toast({ title: t.payments.updateLineSuccess, variant: 'success' })
    } catch {
      setError(t.payments.updateLineError)
      toast({ title: t.payments.updateLineError, variant: 'danger' })
    }
    load()
  }

  const handleDelete = (certId: string) => {
    setConfirmAction({
      message: t.payments.confirmDeleteCert,
      onConfirm: async () => {
        try {
          await deletePaymentCert(certId)
          toast({ title: t.payments.deleteSuccess, variant: 'success' })
        } catch {
          toast({ title: t.payments.deleteError, variant: 'danger' })
        }
        load()
      },
    })
  }

  const handleStatusChange = async (certId: string, status: PaymentCertStatus) => {
    try {
      await updatePaymentCert(certId, { status })
      toast({
        title: t.payments.statusChangeSuccess.replace('{status}', getStatusLabel(t, status)),
        variant: status === 'submitted' || status === 'checked' ? 'warning' : 'success',
      })
    } catch {
      toast({ title: t.payments.statusChangeError, variant: 'danger' })
    }
    load()
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        icon={CreditCard}
        title={t.payments.title}
        subtitle={t.payments.subtitle}
        gradient="from-emerald-500 to-emerald-600"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={16} /> {t.payments.newCertificate}
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
                    { label: `IPC #${p.certNumber} (${t.payments.totalCertified})`, value: p.certified, color: '#6366f1' },
                    { label: `IPC #${p.certNumber} (${t.payments.totalPaid})`, value: p.paid, color: '#10b981' },
                  ])}
                  horizontal
                />
              </SectionCard>
            )}

            {/* Payment Timeline */}
            <SectionCard title={t.payments.paymentTimeline} icon={Clock} iconColor="text-blue-500">
              <div className="flex items-center justify-between gap-1">
                {STATUS_ORDER.map((step, i) => {
                  const count = stats.statusCounts[step]
                  const StepIcon = STATUS_ICON[step]
                  const isActive = count > 0
                  return (
                    <div key={step} className="flex items-center flex-1">
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
                          {getStatusLabel(t, step)}
                        </span>
                        <span className={cn(
                          'text-lg font-bold tabular-nums mt-0.5',
                          isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-300 dark:text-slate-600'
                        )}>
                          {count}
                        </span>
                      </div>
                      {i < STATUS_ORDER.length - 1 && (
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
          <Button onClick={() => load()}>{t.payments.retry}</Button>
        </div>
      ) : certs.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={t.payments.noPayments}
          description={t.payments.noPaymentsDesc}
          actionLabel={t.payments.createFirstCert}
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
              onDelete={() => handleDelete(cert.id)}
              onStatusChange={(s) => handleStatusChange(cert.id, s)}
              onUpdateLine={handleUpdateLine}
              fmt={fmt}
              t={t}
            />
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title={t.payments.newIpcTitle.replace('{number}', String(certs.length + 1))} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label={t.payments.periodFrom} type="date" value={form.period_from} onChange={e => setForm({ ...form, period_from: e.target.value })} />
            <Input label={t.payments.periodTo} type="date" value={form.period_to} onChange={e => setForm({ ...form, period_to: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t.payments.retentionPct} type="number" value={form.retention_pct} onChange={e => setForm({ ...form, retention_pct: e.target.value })} />
            <Input label={t.payments.vatPct} type="number" value={form.vat_pct} onChange={e => setForm({ ...form, vat_pct: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label={t.payments.advanceRecovery} type="number" value={form.advance_recovery} onChange={e => setForm({ ...form, advance_recovery: e.target.value })} />
            <Input label={t.payments.previousAdvanceRecovery} type="number" value={form.previous_advance_recovery} onChange={e => setForm({ ...form, previous_advance_recovery: e.target.value })} />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">{t.payments.autoPopulateNote}</p>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>{t.payments.cancel}</Button>
            <Button onClick={handleCreate} disabled={!form.period_from || !form.period_to}>{t.payments.create}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={t.payments.confirmTitle} size="sm">
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{confirmAction?.message}</p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmAction(null)}>{t.payments.cancel}</Button>
          <Button variant="danger" onClick={() => { confirmAction?.onConfirm(); setConfirmAction(null) }}>{t.payments.confirm}</Button>
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
  t,
}: {
  cert: PaymentCert
  isExpanded: boolean
  onToggle: () => void
  onDelete: () => void
  onStatusChange: (s: PaymentCertStatus) => void
  onUpdateLine: (lineId: string, currentQty: number) => void
  fmt: (n: number) => string
  t: TranslationKeys
}) {
  const lines = cert.lines ?? []
  const Icon = STATUS_ICON[cert.status]
  const statusLabel = getStatusLabel(t, cert.status)

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750" role="button" tabIndex={0} aria-expanded={isExpanded} onClick={onToggle} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}>
        {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 dark:text-white">IPC #{cert.cert_number}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {cert.period_from} to {cert.period_to} · {lines.length} items
          </div>
        </div>
        <div className="text-end me-2">
          <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">{fmt(cert.net_payable)}</div>
          <div className="text-[10px] text-slate-400">{t.payments.netPayable}</div>
        </div>
        <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', STATUS_COLOR[cert.status])}>
          <Icon size={12} /> {statusLabel}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-300 hover:text-red-500"
          title={t.payments.deleteCertificate}
          aria-label={t.payments.deleteCertificate}
        >
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
              {STATUS_ORDER.map(k => <option key={k} value={k}>{getStatusLabel(t, k)}</option>)}
            </select>
          </div>

          {/* Lines table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                  <th className="text-start px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 min-w-[180px]">{t.payments.colDescription}</th>
                  <th className="text-center px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[50px]">{t.payments.colUnit}</th>
                  <th className="text-end px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">{t.payments.colContractQty}</th>
                  <th className="text-end px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">{t.payments.colRate}</th>
                  <th className="text-end px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">{t.payments.colPreviousQty}</th>
                  <th className="text-end px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[80px]">{t.payments.colCurrentQty}</th>
                  <th className="text-end px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[70px]">{t.payments.colCumQty}</th>
                  <th className="text-end px-2 py-2 font-semibold text-slate-600 dark:text-slate-300 w-[90px]">{t.payments.colCumAmount}</th>
                </tr>
              </thead>
              <tbody>
                {lines.sort((a, b) => a.sort_order - b.sort_order).map(line => (
                  <tr key={line.id} className="border-b border-slate-100 dark:border-slate-700">
                    <td className="px-3 py-1.5 text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{line.description}</td>
                    <td className="px-2 py-1.5 text-center text-slate-500">{line.unit}</td>
                    <td className="px-2 py-1.5 text-end tabular-nums text-slate-500">{fmt(line.contract_qty)}</td>
                    <td className="px-2 py-1.5 text-end tabular-nums text-slate-500">{fmt(line.contract_rate)}</td>
                    <td className="px-2 py-1.5 text-end tabular-nums text-slate-500">{fmt(line.previous_qty)}</td>
                    <td className="px-2 py-0.5">
                      <input
                        type="number"
                        value={line.current_qty || ''}
                        onChange={e => onUpdateLine(line.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-1 py-0.5 text-xs text-end border border-slate-200 dark:border-slate-600 rounded bg-white dark:bg-slate-800 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                        step="any"
                      />
                    </td>
                    <td className="px-2 py-1.5 text-end tabular-nums font-medium text-slate-700 dark:text-slate-200">{fmt(line.cumulative_qty)}</td>
                    <td className="px-2 py-1.5 text-end tabular-nums font-medium text-slate-900 dark:text-white">{fmt(line.cumulative_amount)}</td>
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
                  { label: t.payments.summaryGrossAmount, value: cert.gross_amount },
                  { label: t.payments.summaryLessPreviousGross, value: -cert.previous_gross },
                  { label: t.payments.summaryCurrentGross, value: cert.current_gross, bold: true },
                  { label: t.payments.summaryLessRetention.replace('{pct}', String(cert.retention_pct)), value: -cert.current_retention },
                  { label: t.payments.summaryLessAdvanceRecovery, value: -cert.current_advance_recovery },
                  { label: t.payments.summaryAddVat.replace('{pct}', String(cert.vat_pct)), value: cert.vat_amount },
                  { label: t.payments.summaryNetPayable, value: cert.net_payable, bold: true, highlight: true },
                ].map(row => (
                  <tr key={row.label} className={row.bold ? 'border-t border-slate-200 dark:border-slate-600' : ''}>
                    <td className={cn('py-1', row.bold ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300')}>{row.label}</td>
                    <td className={cn('py-1 text-end tabular-nums', row.bold ? 'font-bold' : '',
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
