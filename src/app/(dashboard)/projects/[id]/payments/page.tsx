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
  draft:     'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]',
  submitted: 'bg-[var(--color-info-bg)] text-[var(--color-info)]',
  checked:   'bg-[var(--color-warning-bg)] text-[var(--color-warning)]',
  approved:  'bg-[var(--color-amber)]/10 text-[var(--color-amber)]',
  paid:      'bg-[var(--color-success-bg)] text-[var(--color-success)]',
}

const STATUS_DOT: Record<PaymentCertStatus, string> = {
  draft:     'bg-[var(--color-text-muted)]',
  submitted: 'bg-[var(--color-info)]',
  checked:   'bg-[var(--color-warning)]',
  approved:  'bg-[var(--color-amber)]',
  paid:      'bg-[var(--color-success)]',
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

    const progressBars = certs.map(c => ({
      certNumber: c.cert_number,
      certified: c.gross_amount,
      paid: c.status === 'paid' ? c.net_payable : 0,
      status: c.status,
    }))

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
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)] tracking-tight">{t.payments.title}</h1>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">{t.payments.subtitle}</p>
        </div>
        <Button onClick={() => setShowCreate(true)}>
          <Plus size={16} /> {t.payments.newCertificate}
        </Button>
      </div>

      {/* Statistics Dashboard */}
      {!loading && certs.length > 0 && (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Certified */}
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <div className="absolute top-4 end-4 opacity-[0.06]">
                <ArrowUpRight size={48} className="text-[var(--color-text)]" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.payments.totalCertified}</p>
              <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">{fmt(stats.totalCertified)}</p>
              <div className="flex items-center gap-1.5 text-[var(--color-amber)] text-xs font-medium">
                <ArrowUpRight size={12} />
                <span>{certs.length} {t.payments.certificates}</span>
              </div>
            </div>

            {/* Pending Approval */}
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-amber)]/20 rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <div className="absolute top-4 end-4 opacity-[0.06]">
                <Clock size={48} className="text-[var(--color-amber)]" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.payments.retentionHeld}</p>
              <p className="text-2xl font-bold text-[var(--color-amber)] tabular-nums">{fmt(stats.totalRetention)}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{t.payments.certificates}: {stats.count}</p>
            </div>

            {/* Total Paid */}
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <div className="absolute top-4 end-4 opacity-[0.06]">
                <CheckCircle2 size={48} className="text-[var(--color-success)]" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.payments.totalPaid}</p>
              <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">{fmt(stats.totalPaid)}</p>
              <div className="w-full h-1 rounded-full bg-[var(--color-surface-hover)] overflow-hidden mt-2">
                <div
                  className="bg-[var(--color-success)] h-full rounded-full"
                  style={{ width: stats.totalCertified > 0 ? `${Math.min((stats.totalPaid / stats.totalCertified) * 100, 100)}%` : '0%' }}
                />
              </div>
            </div>

            {/* Certificates count */}
            <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5 space-y-2 relative overflow-hidden">
              <div className="absolute top-4 end-4 opacity-[0.06]">
                <Receipt size={48} className="text-[var(--color-text)]" />
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)]">{t.payments.certificates}</p>
              <p className="text-2xl font-bold text-[var(--color-text)] tabular-nums">{stats.count}</p>
              <p className="text-xs text-[var(--color-text-muted)]">{t.payments.totalCertified}</p>
            </div>
          </div>

          {/* Payment Timeline */}
          <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">{t.payments.paymentTimeline}</h3>
            <div className="flex items-center justify-between gap-1">
              {STATUS_ORDER.map((step, i) => {
                const count = stats.statusCounts[step]
                const StepIcon = STATUS_ICON[step]
                const isActive = count > 0
                return (
                  <div key={step} className="flex items-center flex-1">
                    <div className="flex flex-col items-center flex-1 gap-2">
                      <div className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center transition-all',
                        isActive
                          ? 'bg-[var(--color-amber)]/10 text-[var(--color-amber)] border border-[var(--color-amber)]/30'
                          : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                      )}>
                        <StepIcon size={16} />
                      </div>
                      <span className={cn(
                        'text-[10px] font-medium text-center',
                        isActive ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)]'
                      )}>
                        {getStatusLabel(t, step)}
                      </span>
                      <span className={cn(
                        'text-lg font-bold tabular-nums',
                        isActive ? 'text-[var(--color-amber)]' : 'text-[var(--color-text-muted)]'
                      )}>
                        {count}
                      </span>
                    </div>
                    {i < STATUS_ORDER.length - 1 && (
                      <ArrowRight size={14} className="text-[var(--color-text-muted)] shrink-0 mx-1 -mt-8" />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* IPC Table / Cards */}
      {loading ? (
        <TableSkeleton rows={6} columns={4} />
      ) : error && certs.length === 0 ? (
        <div className="bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 rounded-2xl p-6 text-center">
          <p className="text-[var(--color-danger)] font-medium mb-4">{error}</p>
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
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
          {/* Table header */}
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">{t.payments.title}</h3>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">{t.payments.subtitle}</p>
          </div>

          <div className="divide-y divide-[var(--color-border)]">
            {certs.map((cert, idx) => (
              <motion.div
                key={cert.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05, duration: 0.35 }}
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
        </div>
      )}

      {/* Create Modal */}
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
          <p className="text-xs text-[var(--color-text-muted)]">{t.payments.autoPopulateNote}</p>
          {error && <p className="text-sm text-[var(--color-danger)]">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setShowCreate(false)}>{t.payments.cancel}</Button>
            <Button onClick={handleCreate} disabled={!form.period_from || !form.period_to}>{t.payments.create}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!confirmAction} onClose={() => setConfirmAction(null)} title={t.payments.confirmTitle} size="sm">
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">{confirmAction?.message}</p>
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
    <div>
      {/* Row header */}
      <div
        className="flex items-center gap-3 px-6 py-4 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors group"
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle() } }}
      >
        {isExpanded
          ? <ChevronDown size={16} className="text-[var(--color-text-muted)] shrink-0" />
          : <ChevronRight size={16} className="text-[var(--color-text-muted)] shrink-0" />
        }

        {/* IPC number + period */}
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[var(--color-text)] text-sm">
            IPC #{cert.cert_number}
          </div>
          <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
            {cert.period_from} — {cert.period_to} · {lines.length} {t.payments.colDescription ?? 'items'}
          </div>
        </div>

        {/* Net payable */}
        <div className="text-end me-3 shrink-0">
          <div className="text-sm font-bold text-[var(--color-text)] tabular-nums font-mono">{fmt(cert.net_payable)}</div>
          <div className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{t.payments.netPayable}</div>
        </div>

        {/* Status badge */}
        <span className={cn(
          'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0',
          STATUS_COLOR[cert.status]
        )}>
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', STATUS_DOT[cert.status])} />
          <Icon size={11} />
          {statusLabel}
        </span>

        {/* Delete — visible on hover */}
        <button
          onClick={e => { e.stopPropagation(); onDelete() }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[var(--color-danger-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-danger)] transition-all"
          title={t.payments.deleteCertificate}
          aria-label={t.payments.deleteCertificate}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Expanded body */}
      {isExpanded && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
          {/* Status select */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
            <select
              value={cert.status}
              onChange={e => onStatusChange(e.target.value as PaymentCertStatus)}
              className="text-xs px-3 py-1.5 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-amber)]/40"
            >
              {(STATUS_ORDER as PaymentCertStatus[]).map(k => (
                <option key={k} value={k}>{getStatusLabel(t, k)}</option>
              ))}
            </select>
          </div>

          {/* Lines table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-hover)]">
                  <th className="text-start px-4 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] min-w-[180px]">{t.payments.colDescription}</th>
                  <th className="text-center px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] w-[50px]">{t.payments.colUnit}</th>
                  <th className="text-end px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] w-[70px]">{t.payments.colContractQty}</th>
                  <th className="text-end px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] w-[70px]">{t.payments.colRate}</th>
                  <th className="text-end px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] w-[70px]">{t.payments.colPreviousQty}</th>
                  <th className="text-end px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] w-[80px]">{t.payments.colCurrentQty}</th>
                  <th className="text-end px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] w-[70px]">{t.payments.colCumQty}</th>
                  <th className="text-end px-3 py-2.5 text-[10px] font-semibold uppercase tracking-widest text-[var(--color-text-muted)] w-[90px]">{t.payments.colCumAmount}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {lines.sort((a, b) => a.sort_order - b.sort_order).map(line => (
                  <tr key={line.id} className="hover:bg-[var(--color-surface-hover)] transition-colors">
                    <td className="px-4 py-2 text-[var(--color-text-secondary)] truncate max-w-[180px]">{line.description}</td>
                    <td className="px-3 py-2 text-center text-[var(--color-text-muted)]">{line.unit}</td>
                    <td className="px-3 py-2 text-end tabular-nums font-mono text-[var(--color-text-muted)]">{fmt(line.contract_qty)}</td>
                    <td className="px-3 py-2 text-end tabular-nums font-mono text-[var(--color-text-muted)]">{fmt(line.contract_rate)}</td>
                    <td className="px-3 py-2 text-end tabular-nums font-mono text-[var(--color-text-muted)]">{fmt(line.previous_qty)}</td>
                    <td className="px-3 py-1">
                      <input
                        type="number"
                        value={line.current_qty || ''}
                        onChange={e => onUpdateLine(line.id, parseFloat(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-xs text-end border border-[var(--color-border)] rounded-lg bg-[var(--color-surface-elevated)] text-[var(--color-text)] focus:ring-1 focus:ring-[var(--color-amber)]/40 outline-none"
                        step="any"
                      />
                    </td>
                    <td className="px-3 py-2 text-end tabular-nums font-mono font-medium text-[var(--color-text)]">{fmt(line.cumulative_qty)}</td>
                    <td className="px-3 py-2 text-end tabular-nums font-mono font-semibold text-[var(--color-text)]">{fmt(line.cumulative_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-surface-hover)]">
            <table className="w-full text-xs max-w-xs ms-auto">
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
                  <tr key={row.label} className={row.bold ? 'border-t border-[var(--color-border-strong)]' : ''}>
                    <td className={cn(
                      'py-1.5',
                      row.bold ? 'font-semibold text-[var(--color-text)]' : 'text-[var(--color-text-secondary)]'
                    )}>
                      {row.label}
                    </td>
                    <td className={cn(
                      'py-1.5 text-end tabular-nums font-mono',
                      row.highlight ? 'text-base font-bold text-[var(--color-amber)]' : row.bold ? 'font-bold text-[var(--color-text)]' : 'text-[var(--color-text)]',
                      !row.highlight && !row.bold && row.value < 0 && 'text-[var(--color-danger)]'
                    )}>
                      {fmt(row.value)}
                    </td>
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
