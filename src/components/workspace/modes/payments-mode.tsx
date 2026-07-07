'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useWorkspace } from '../workspace-context'
import { Receipt } from 'lucide-react'
import type { PaymentCert, PaymentCertStatus } from '@/lib/types'

const STATUS_META: Record<PaymentCertStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'var(--color-text-muted)' },
  submitted: { label: 'Submitted', color: 'var(--color-info)' },
  checked: { label: 'Checked', color: 'var(--color-tag-2)' },
  approved: { label: 'Approved', color: 'var(--color-brand)' },
  paid: { label: 'Paid', color: 'var(--color-success)' },
}

export function PaymentsMode() {
  const { data, fmt } = useWorkspace()
  const [activeId, setActiveId] = useState<string | null>(data.payments[0]?.id ?? null)
  const active = useMemo(
    () => data.payments.find(c => c.id === activeId) ?? data.payments[0] ?? null,
    [activeId, data.payments]
  )

  if (data.payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-6">
        <Receipt size={28} className="text-[var(--color-text-muted)]" />
        <p className="text-sm font-medium text-[var(--color-text)]">No payment certificates yet</p>
      </div>
    )
  }

  return (
    <div className="grid h-full" style={{ gridTemplateColumns: 'minmax(220px,280px) 1fr' }}>
      <div className="overflow-y-auto border-e border-[var(--color-border)]">
        {data.payments.map(cert => {
          const meta = STATUS_META[cert.status]
          return (
            <button
              key={cert.id}
              onClick={() => setActiveId(cert.id)}
              className={cn(
                'w-full text-start px-3 py-2.5 border-b border-[var(--color-border-light)] transition-colors',
                active?.id === cert.id ? 'bg-[var(--color-brand-tint)]' : 'hover:bg-[var(--color-surface-hover)]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[12.5px] font-medium text-[var(--color-text)]">Certificate {cert.cert_number}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-[var(--radius-xs)]" style={{ background: `${meta.color}1a`, color: meta.color }}>{meta.label}</span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <span className="text-[10px] text-[var(--color-text-muted)]">{cert.period_from} → {cert.period_to}</span>
                <span className="mono text-[12px] font-semibold text-[var(--color-text)]">{fmt(cert.net_payable)}</span>
              </div>
            </button>
          )
        })}
      </div>
      {active && <CertificateDetail cert={active} fmt={fmt} />}
    </div>
  )
}

function CertificateDetail({ cert, fmt }: { cert: PaymentCert; fmt: (n: number) => string }) {
  const meta = STATUS_META[cert.status]
  return (
    <div className="overflow-y-auto p-5">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h3 className="text-[15px] font-semibold text-[var(--color-text)]">Certificate No. {cert.cert_number}</h3>
          <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5">Period {cert.period_from} → {cert.period_to}</p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-1 rounded-[var(--radius-sm)] shrink-0" style={{ background: `${meta.color}1a`, color: meta.color }}>{meta.label}</span>
      </div>

      <table className="w-full text-[12.5px] border-collapse mb-6">
        <thead>
          <tr className="border-b border-[var(--color-border-strong)]">
            <th className="text-start px-2 py-1.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Description</th>
            <th className="text-end px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Contract</th>
            <th className="text-end px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">This period</th>
            <th className="text-end px-2 py-1.5 font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">Cumulative</th>
          </tr>
        </thead>
        <tbody>
          {(cert.lines ?? []).map(line => (
            <tr key={line.id} className="border-b border-[var(--color-border-light)]">
              <td className="px-2 py-1.5 text-[var(--color-text)]">{line.description}</td>
              <td className="px-2 py-1.5 text-end mono text-[var(--color-text-secondary)]">{fmt(line.contract_amount)}</td>
              <td className="px-2 py-1.5 text-end mono text-[var(--color-text-secondary)]">{fmt(line.current_amount)}</td>
              <td className="px-2 py-1.5 text-end mono font-medium text-[var(--color-text)]">{fmt(line.cumulative_amount)}</td>
            </tr>
          ))}
          {(!cert.lines || cert.lines.length === 0) && (
            <tr><td colSpan={4} className="px-2 py-4 text-center text-[var(--color-text-muted)] italic">No line items</td></tr>
          )}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 max-w-md ms-auto text-[12.5px]">
        <SummaryRow label="Gross this period" value={fmt(cert.current_gross)} />
        <SummaryRow label="Variations" value={fmt(cert.variations_amount)} />
        <SummaryRow label={`Retention (${cert.retention_pct}%)`} value={`− ${fmt(cert.current_retention)}`} muted />
        <SummaryRow label="Advance recovery" value={`− ${fmt(cert.current_advance_recovery)}`} muted />
        <SummaryRow label={`VAT (${cert.vat_pct}%)`} value={fmt(cert.vat_amount)} />
        <SummaryRow label="Net payable" value={fmt(cert.net_payable)} strong />
      </div>
    </div>
  )
}

function SummaryRow({ label, value, muted, strong }: { label: string; value: string; muted?: boolean; strong?: boolean }) {
  return (
    <>
      <div className={cn('text-[var(--color-text-secondary)]', strong && 'font-semibold text-[var(--color-text)]')}>{label}</div>
      <div className={cn('text-end mono', muted && 'text-[var(--color-danger)]', strong && 'font-bold text-[var(--color-brand)] text-[14px]')}>{value}</div>
    </>
  )
}
