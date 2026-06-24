'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FolderKanban,
  Ruler,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileSpreadsheet,
  MapPin,
  Clock,
  ArrowUpRight,
  Users,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Activity,
  Percent,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { getProjects } from '@/app/actions/projects'
import { getBOQItems } from '@/app/actions/boq'
import { getMeasurementItems } from '@/app/actions/measurements'
import { getVariations, getContract, getCostEntries } from '@/app/actions/cost-control'
import { getPaymentCerts } from '@/app/actions/payments'
import { getTenders } from '@/app/actions/tenders'
import type { Project, BOQItem, MeasurementItem, Variation, Contract, CostEntry, PaymentCert, Tender } from '@/lib/types'

interface ProjectSummary {
  project: Project
  boqItems: BOQItem[]
  measurementItems: MeasurementItem[]
  variations: Variation[]
  contract: Contract | null
  costEntries: CostEntry[]
  paymentCerts: PaymentCert[]
  tenders: Tender[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [summaries, setSummaries] = useState<ProjectSummary[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const allProjects = await getProjects()
      setProjects(allProjects)

      const results = await Promise.all(
        allProjects.slice(0, 10).map(async (project) => {
          const [boqItems, measurementItems, variations, contract, costEntries, paymentCerts, tenders] = await Promise.all([
            getBOQItems(project.id).catch(() => [] as BOQItem[]),
            getMeasurementItems(project.id).catch(() => [] as MeasurementItem[]),
            getVariations(project.id).catch(() => [] as Variation[]),
            getContract(project.id).catch(() => null),
            getCostEntries(project.id).catch(() => [] as CostEntry[]),
            getPaymentCerts(project.id).catch(() => [] as PaymentCert[]),
            getTenders(project.id).catch(() => [] as Tender[]),
          ])
          return { project, boqItems, measurementItems, variations, contract, costEntries, paymentCerts, tenders }
        })
      )
      setSummaries(results)
      setLoading(false)
    }
    load()
  }, [])

  // Aggregate KPIs across all projects
  const totalProjects = projects.length
  const totalBOQValue = summaries.reduce((s, p) => s + p.boqItems.reduce((a, b) => a + (b.total_amount ?? 0), 0), 0)
  const totalContractValue = summaries.reduce((s, p) => s + (p.contract?.contract_value ?? 0), 0)
  const totalActualCost = summaries.reduce((s, p) => s + p.costEntries.filter(c => c.category === 'actual').reduce((a, b) => a + b.amount, 0), 0)
  const totalPaid = summaries.reduce((s, p) => s + p.paymentCerts.filter(c => c.status === 'paid').reduce((a, b) => a + b.net_payable, 0), 0)
  const pendingPayments = summaries.reduce((s, p) => s + p.paymentCerts.filter(c => c.status !== 'paid' && c.status !== 'draft').reduce((a, b) => a + b.net_payable, 0), 0)
  const pendingVariations = summaries.reduce((s, p) => s + p.variations.filter(v => v.status === 'pending' || v.status === 'submitted').reduce((a, b) => a + b.amount, 0), 0)
  const approvedVariations = summaries.reduce((s, p) => s + p.variations.filter(v => v.status === 'approved').reduce((a, b) => a + (b.approved_amount ?? b.amount), 0), 0)
  const activeTenders = summaries.reduce((s, p) => s + p.tenders.filter(t => t.status === 'issued').length, 0)
  const totalMeasurements = summaries.reduce((s, p) => s + p.measurementItems.length, 0)
  const totalMeasurementLines = summaries.reduce((s, p) => s + p.measurementItems.reduce((a, m) => a + (m.lines?.length ?? 0), 0), 0)
  const projectedProfit = totalContractValue + approvedVariations - totalActualCost

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtFull = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Executive Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Portfolio overview across {totalProjects} project{totalProjects !== 1 ? 's' : ''}
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {([
          { label: 'Projects', value: totalProjects, icon: FolderKanban, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-100 dark:bg-violet-900/30' },
          { label: 'Contract Value', value: fmtFull(totalContractValue), icon: DollarSign, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { label: 'BOQ Value', value: fmtFull(totalBOQValue), icon: FileSpreadsheet, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
          { label: 'Actual Cost', value: fmtFull(totalActualCost), icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
          { label: 'Projected Profit', value: fmtFull(projectedProfit), icon: projectedProfit >= 0 ? TrendingUp : TrendingDown, color: projectedProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400', bg: projectedProfit >= 0 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30' },
        ] as const).map(kpi => (
          <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={cn('p-2 rounded-lg', kpi.bg)}>
                <kpi.icon size={16} className={kpi.color} />
              </div>
            </div>
            <div className={cn('text-xl font-bold tabular-nums', kpi.color)}>
              {loading ? '...' : kpi.value}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {([
          { label: 'Total Paid', value: fmtFull(totalPaid), color: 'text-green-600' },
          { label: 'Pending Payments', value: fmtFull(pendingPayments), color: 'text-amber-600' },
          { label: 'Approved Variations', value: fmtFull(approvedVariations), color: 'text-blue-600' },
          { label: 'Pending Variations', value: fmtFull(pendingVariations), color: 'text-orange-600' },
          { label: 'Active Tenders', value: fmt(activeTenders), color: 'text-purple-600' },
          { label: 'Measurements', value: `${fmt(totalMeasurements)} items`, color: 'text-sky-600' },
        ] as const).map(kpi => (
          <div key={kpi.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 px-3 py-2.5">
            <div className={cn('text-sm font-bold tabular-nums', kpi.color)}>{loading ? '...' : kpi.value}</div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Project Cards */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">Projects</h2>
          {projects.length > 0 && (
            <button onClick={() => router.push('/projects')} className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
              View all <ArrowUpRight size={14} />
            </button>
          )}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-48 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 animate-pulse" />)}
          </div>
        ) : summaries.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
            <FolderKanban size={48} className="mx-auto text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-1">No projects yet</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Create your first project to get started.</p>
            <button onClick={() => router.push('/projects')} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
              New Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summaries.map(s => {
              const boqTotal = s.boqItems.reduce((a, b) => a + (b.total_amount ?? 0), 0)
              const contractVal = s.contract?.contract_value ?? 0
              const actual = s.costEntries.filter(c => c.category === 'actual').reduce((a, b) => a + b.amount, 0)
              const paid = s.paymentCerts.filter(c => c.status === 'paid').reduce((a, b) => a + b.net_payable, 0)
              const varApproved = s.variations.filter(v => v.status === 'approved').reduce((a, b) => a + (b.approved_amount ?? b.amount), 0)
              const progress = s.project.progress ?? 0

              return (
                <div
                  key={s.project.id}
                  onClick={() => router.push(`/projects/${s.project.id}/measurements`)}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 cursor-pointer hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-900 dark:text-white truncate">{s.project.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                        {s.project.client_name && <span>{s.project.client_name}</span>}
                        {s.project.location && <span className="flex items-center gap-0.5"><MapPin size={10} />{s.project.location}</span>}
                      </div>
                    </div>
                    <Badge>{s.project.currency}</Badge>
                  </div>

                  {/* Progress bar */}
                  {progress > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                        <span>Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${Math.min(100, progress)}%` }} />
                      </div>
                    </div>
                  )}

                  {/* Metrics grid */}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                    {contractVal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Contract</span>
                        <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{fmtFull(contractVal)}</span>
                      </div>
                    )}
                    {boqTotal > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">BOQ</span>
                        <span className="font-medium tabular-nums text-slate-700 dark:text-slate-200">{fmtFull(boqTotal)}</span>
                      </div>
                    )}
                    {actual > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Cost</span>
                        <span className="font-medium tabular-nums text-red-600 dark:text-red-400">{fmtFull(actual)}</span>
                      </div>
                    )}
                    {paid > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Paid</span>
                        <span className="font-medium tabular-nums text-green-600 dark:text-green-400">{fmtFull(paid)}</span>
                      </div>
                    )}
                    {varApproved > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Variations</span>
                        <span className="font-medium tabular-nums text-blue-600 dark:text-blue-400">{fmtFull(varApproved)}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom stats */}
                  <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] text-slate-400 dark:text-slate-500">
                    <span>{s.measurementItems.length} measurements</span>
                    <span>{s.boqItems.length} BOQ items</span>
                    <span>{s.paymentCerts.length} IPCs</span>
                    <span className="ml-auto flex items-center gap-0.5">
                      <Clock size={10} /> {formatDate(s.project.updated_at)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
