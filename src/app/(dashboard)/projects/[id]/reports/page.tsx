'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { motion, type Variants } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { SectionCard } from '@/components/ui/section-card'
import { PageHeader } from '@/components/ui/page-header'
import {
  FileBarChart,
  FileSpreadsheet,
  Ruler,
  DollarSign,
  Receipt,
  TrendingUp,
  FileText,
  Download,
  AlertCircle,
  X,
} from 'lucide-react'
import { getBOQItems } from '@/app/actions/boq'
import { getMeasurementItems } from '@/app/actions/measurements'
import { getPaymentCerts } from '@/app/actions/payments'
import { getDashboardSummaries } from '@/app/actions/dashboard'
import { getProject } from '@/app/actions/projects'
import { getAttachments } from '@/app/actions/attachments'
import { getSketches } from '@/app/actions/sketches'
import { exportBOQToPDF } from '@/lib/export/boq-pdf'
import { exportBOQToExcel } from '@/lib/export/boq-excel'
import { exportMeasurementsToPDF } from '@/lib/export/measurements-pdf'
import { exportMeasurementsToExcel } from '@/lib/export/measurements-excel'
import { exportCostReportToPDF } from '@/lib/export/cost-pdf'
import { exportCostReportToExcel } from '@/lib/export/cost-excel'
import { exportPaymentReportToPDF } from '@/lib/export/payment-pdf'
import { exportPaymentReportToExcel } from '@/lib/export/payment-excel'
import { exportEVMReportToPDF } from '@/lib/export/evm-pdf'
import { exportEVMReportToExcel } from '@/lib/export/evm-excel'
import { generateEvidenceReport } from '@/lib/export/evidence-report'
import { getProfile } from '@/app/actions/profile'
import { getRateAnalyses } from '@/app/actions/rate-analysis'
import { useI18n } from '@/lib/i18n'

const reportCards = [
  {
    key: 'boq',
    title: 'BOQ Report',
    description: 'Bill of Quantities with sections, rates, and totals',
    icon: FileSpreadsheet,
    amberAccent: false,
  },
  {
    key: 'measurements',
    title: 'Measurement Report',
    description: 'Measurement items with quantities and calculations',
    icon: Ruler,
    amberAccent: false,
  },
  {
    key: 'cost',
    title: 'Cost Report',
    description: 'Budget summary, cost breakdown, and variance analysis',
    icon: DollarSign,
    amberAccent: true,
  },
  {
    key: 'payment',
    title: 'Payment Report',
    description: 'Payment certificates with amounts and status',
    icon: Receipt,
    amberAccent: false,
  },
  {
    key: 'evm',
    title: 'EVM Report',
    description: 'Earned Value Management performance metrics',
    icon: TrendingUp,
    amberAccent: true,
  },
  {
    key: 'evidence',
    title: 'Quantity Backup Report',
    description: 'Engineering evidence report: sketches, drawings, measurements, QR code — per BOQ item',
    icon: FileBarChart,
    amberAccent: true,
  },
] as const

type ReportKey = (typeof reportCards)[number]['key']

const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const fadeUp: Variants = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] } } }

export default function ReportsPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const { t } = useI18n()
  const [loading, setLoading] = useState<Record<string, 'pdf' | 'excel' | null>>({})
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate(reportKey: ReportKey, format: 'pdf' | 'excel') {
    setLoading((prev) => ({ ...prev, [reportKey]: format }))
    setError(null)

    try {
      switch (reportKey) {
        case 'boq': {
          const [project, items] = await Promise.all([
            getProject(projectId),
            getBOQItems(projectId),
          ])
          if (!project) throw new Error('Project not found')
          if (format === 'pdf') {
            exportBOQToPDF(items, project.name, project.currency, 17)
          } else {
            await exportBOQToExcel(items, project.name, project.currency, 17)
          }
          break
        }
        case 'measurements': {
          const [project, items] = await Promise.all([
            getProject(projectId),
            getMeasurementItems(projectId),
          ])
          if (!project) throw new Error('Project not found')
          if (format === 'pdf') {
            exportMeasurementsToPDF(items, project.name)
          } else {
            await exportMeasurementsToExcel(items, project.name)
          }
          break
        }
        case 'cost': {
          const [project, boqItems, dashResult] = await Promise.all([
            getProject(projectId),
            getBOQItems(projectId),
            getDashboardSummaries(),
          ])
          if (!project) throw new Error('Project not found')
          const summary = dashResult.summaries.find((s) => s.project.id === projectId)
          if (!summary) throw new Error('Dashboard summary not found for this project')
          if (format === 'pdf') {
            exportCostReportToPDF(project, boqItems, summary)
          } else {
            await exportCostReportToExcel(project, boqItems, summary)
          }
          break
        }
        case 'payment': {
          const [project, certs] = await Promise.all([
            getProject(projectId),
            getPaymentCerts(projectId),
          ])
          if (!project) throw new Error('Project not found')
          if (format === 'pdf') {
            exportPaymentReportToPDF(project, certs)
          } else {
            await exportPaymentReportToExcel(project, certs)
          }
          break
        }
        case 'evm': {
          const [project, dashResult] = await Promise.all([
            getProject(projectId),
            getDashboardSummaries(),
          ])
          if (!project) throw new Error('Project not found')
          const summary = dashResult.summaries.find((s) => s.project.id === projectId)
          if (!summary) throw new Error('Dashboard summary not found for this project')
          if (format === 'pdf') {
            exportEVMReportToPDF(project, summary)
          } else {
            await exportEVMReportToExcel(project, summary)
          }
          break
        }
        case 'evidence': {
          const [project, boqItems, allMeasurements, profileData, rateAnalyses] = await Promise.all([
            getProject(projectId),
            getBOQItems(projectId),
            getMeasurementItems(projectId),
            getProfile(),
            getRateAnalyses(projectId),
          ])
          if (!project) throw new Error('Project not found')
          if (boqItems.length === 0) throw new Error('No BOQ items found. Add BOQ items first.')

          const co = (profileData?.profile as Record<string, unknown> | null)?.companies as Record<string, unknown> | null
          const company = co ? {
            name: (co.name as string) ?? project.name,
            logo_url: (co.logo_url as string) ?? null,
            address: (co.address as string) ?? null,
            phone: (co.phone as string) ?? null,
            email: (co.email as string) ?? null,
            registration_number: (co.registration_number as string) ?? null,
          } : null

          // Generate evidence report for the first BOQ item with measurements
          // (In production this would be per-item; for now we generate for the highest-value item)
          const targetItem = boqItems.sort((a, b) => (b.total_amount ?? 0) - (a.total_amount ?? 0))[0]
          const linkedMeasurements = allMeasurements.filter(m => m.id === targetItem.mi_id)
          const rateAnalysis = rateAnalyses.find(r => r.boq_item_id === targetItem.id) ?? null

          generateEvidenceReport({
            boqItem: targetItem,
            projectName: project.name,
            measurements: linkedMeasurements,
            sourceDrawings: [],
            quantityChanges: [],
            rateAnalysis,
            costEntries: [],
            payments: { totalCertified: 0, contractAmount: targetItem.total_amount ?? 0 },
            drawingMeasurements: [],
            company,
            engineerName: (profileData?.profile as Record<string, unknown> | null)?.full_name as string ?? 'Engineer',
            currency: project.currency ?? 'USD',
          })
          break
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading((prev) => ({ ...prev, [reportKey]: null }))
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <motion.div
        className="mx-auto max-w-[1400px] space-y-6 p-5 md:p-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <PageHeader
          icon={FileBarChart}
          title={t.reports.title}
          subtitle="Generate and export project reports"
          gradient="from-amber-500 to-amber-600"
          className="mb-0"
        />

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/20 text-sm text-[var(--color-danger)]"
          >
            <AlertCircle size={15} className="shrink-0" />
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="hover:text-red-300 transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        )}

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reportCards.map((card) => {
            const Icon = card.icon
            const isLoadingPDF = loading[card.key] === 'pdf'
            const isLoadingExcel = loading[card.key] === 'excel'
            return (
              <motion.div key={card.key} variants={fadeUp}>
                <div className="group flex flex-col gap-4 p-5 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-amber)]/40 transition-all h-full">
                  {/* Card header */}
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${card.amberAccent ? 'bg-[var(--color-amber)] text-[var(--color-on-amber)]' : 'bg-[var(--color-surface)] border border-[var(--color-border)] text-[var(--color-text-muted)]'}`}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-[var(--color-text)]">{card.title}</h3>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5 leading-relaxed">{card.description}</p>
                    </div>
                  </div>

                  {/* Amber divider */}
                  {card.amberAccent && (
                    <div className="h-px bg-[var(--color-amber)]/20" />
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="primary"
                      size="sm"
                      loading={isLoadingPDF}
                      onClick={() => handleGenerate(card.key, 'pdf')}
                      className="flex-1"
                    >
                      <FileText size={13} className="me-1.5" />
                      {card.key === 'evidence' ? 'Generate Report' : 'PDF'}
                    </Button>
                    {card.key !== 'evidence' && (
                      <Button
                        variant="outline"
                        size="sm"
                        loading={isLoadingExcel}
                        onClick={() => handleGenerate(card.key, 'excel')}
                        className="flex-1"
                      >
                        <Download size={13} className="me-1.5" /> Excel
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}
