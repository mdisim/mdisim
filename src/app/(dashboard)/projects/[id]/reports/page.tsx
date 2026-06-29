'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
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
} from 'lucide-react'
import { getBOQItems } from '@/app/actions/boq'
import { getMeasurementItems } from '@/app/actions/measurements'
import { getPaymentCerts } from '@/app/actions/payments'
import { getDashboardSummaries } from '@/app/actions/dashboard'
import { getProject } from '@/app/actions/projects'
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

const reportCards = [
  {
    key: 'boq',
    title: 'BOQ Report',
    description: 'Bill of Quantities with sections, rates, and totals',
    icon: FileSpreadsheet,
    gradient: 'from-blue-500 to-blue-600',
  },
  {
    key: 'measurements',
    title: 'Measurement Report',
    description: 'Measurement items with quantities and calculations',
    icon: Ruler,
    gradient: 'from-emerald-500 to-emerald-600',
  },
  {
    key: 'cost',
    title: 'Cost Report',
    description: 'Budget summary, cost breakdown, and variance analysis',
    icon: DollarSign,
    gradient: 'from-amber-500 to-amber-600',
  },
  {
    key: 'payment',
    title: 'Payment Report',
    description: 'Payment certificates with amounts and status',
    icon: Receipt,
    gradient: 'from-purple-500 to-purple-600',
  },
  {
    key: 'evm',
    title: 'EVM Report',
    description: 'Earned Value Management performance metrics',
    icon: TrendingUp,
    gradient: 'from-rose-500 to-rose-600',
  },
] as const

type ReportKey = (typeof reportCards)[number]['key']

export default function ReportsPage() {
  const { id: projectId } = useParams<{ id: string }>()
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report')
    } finally {
      setLoading((prev) => ({ ...prev, [reportKey]: null }))
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20">
            <FileBarChart size={22} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reports</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Generate and export project reports
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
          <AlertCircle size={16} />
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            x
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reportCards.map((card) => (
          <div
            key={card.key}
            className="bg-white dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/60 p-6 hover:shadow-lg transition-all duration-200"
          >
            <div className="flex items-start gap-4 mb-4">
              <div
                className={`p-2.5 rounded-xl bg-gradient-to-br ${card.gradient} text-white shadow-lg`}
              >
                <card.icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-slate-900 dark:text-white">{card.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  {card.description}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                loading={loading[card.key] === 'pdf'}
                onClick={() => handleGenerate(card.key, 'pdf')}
              >
                <FileText size={14} className="mr-1.5" /> Generate PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                loading={loading[card.key] === 'excel'}
                onClick={() => handleGenerate(card.key, 'excel')}
              >
                <Download size={14} className="mr-1.5" /> Export Excel
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
