'use client'

import { useState } from 'react'
import { useWorkspace } from '../workspace-context'
import { FileBarChart, FileSpreadsheet, Receipt, Ruler, Download, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Project } from '@/lib/types'

interface ReportDef {
  key: string
  title: string
  description: string
  icon: typeof FileBarChart
  run: (fmt: 'pdf' | 'xlsx') => void | Promise<void>
  formats: ('pdf' | 'xlsx')[]
}

export function ReportsMode({ project }: { project: Project }) {
  const { data } = useWorkspace()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const runSafely = async (key: string, fn: () => void | Promise<void>) => {
    setBusy(key)
    setError(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }

  const reports: ReportDef[] = [
    {
      key: 'boq',
      title: 'BOQ Summary',
      description: `${data.boqItems.length} priced items across ${new Set(data.boqItems.map(i => i.section)).size} sections`,
      icon: FileSpreadsheet,
      formats: ['pdf', 'xlsx'],
      run: async (fmt) => {
        const { exportBOQToPDF } = await import('@/lib/export/boq-pdf')
        const { exportBOQToExcel } = await import('@/lib/export/boq-excel')
        const vatPct = data.contract?.vat_pct ?? 0
        if (fmt === 'pdf') exportBOQToPDF(data.boqItems, project.name, project.currency, vatPct)
        else await exportBOQToExcel(data.boqItems, project.name, project.currency, vatPct)
      },
    },
    {
      key: 'measurements',
      title: 'Measurement Book',
      description: `${data.measurementItems.length} dimension-sheet items`,
      icon: Ruler,
      formats: ['pdf', 'xlsx'],
      run: async (fmt) => {
        if (fmt === 'pdf') {
          const { exportMeasurementsToPDF } = await import('@/lib/export/measurements-pdf')
          exportMeasurementsToPDF(data.measurementItems, project.name)
        } else {
          const { exportMeasurementsToExcel } = await import('@/lib/export/measurements-excel')
          await exportMeasurementsToExcel(data.measurementItems, project.name)
        }
      },
    },
    {
      key: 'payments',
      title: 'Progress Payment Certificates',
      description: `${data.payments.length} certificates issued`,
      icon: Receipt,
      formats: ['pdf', 'xlsx'],
      run: async (fmt) => {
        if (fmt === 'pdf') {
          const { exportPaymentReportToPDF } = await import('@/lib/export/payment-pdf')
          exportPaymentReportToPDF(project, data.payments)
        } else {
          const { exportPaymentReportToExcel } = await import('@/lib/export/payment-excel')
          await exportPaymentReportToExcel(project, data.payments)
        }
      },
    },
  ]

  return (
    <div className="h-full overflow-y-auto p-6">
      {error && (
        <div className="mb-4 flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-danger-tint)] text-[var(--color-danger)] text-[12.5px]">
          <AlertCircle size={14} /> {error}
        </div>
      )}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
        {reports.map(r => (
          <div key={r.key} className="surface-elevated rounded-[var(--radius-xl)] border border-[var(--color-border)] p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-brand-tint)] flex items-center justify-center text-[var(--color-brand)] shrink-0">
                <r.icon size={16} />
              </div>
              <div className="min-w-0">
                <h4 className="text-[13px] font-semibold text-[var(--color-text)] truncate">{r.title}</h4>
                <p className="text-[11px] text-[var(--color-text-muted)] truncate">{r.description}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-auto">
              {r.formats.map(fmt => (
                <Button
                  key={fmt}
                  variant="secondary"
                  size="sm"
                  loading={busy === `${r.key}-${fmt}`}
                  onClick={() => runSafely(`${r.key}-${fmt}`, () => r.run(fmt))}
                  className="flex-1"
                >
                  <Download size={12} /> {fmt.toUpperCase()}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
