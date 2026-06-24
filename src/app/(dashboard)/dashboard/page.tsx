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
  Plus,
  Eye,
  FileText,
  Layers,
  Building2,
  Briefcase,
  ArrowRight,
  Sparkles,
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
  const profitMargin = totalContractValue > 0 ? ((projectedProfit / totalContractValue) * 100) : 0

  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  const fmtFull = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtCompact = (n: number) => {
    if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
    if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return fmtFull(n)
  }

  return (
    <div className="min-h-screen bg-[#0C1222]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Executive Dashboard
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Portfolio overview across {totalProjects} project{totalProjects !== 1 ? 's' : ''}
            </p>
          </div>
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/projects')}
              className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40 hover:brightness-110"
            >
              <Plus size={16} />
              New Project
            </button>
          </div>
        </div>

        {/* Primary KPI Cards */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
          {([
            {
              label: 'Active Projects',
              value: loading ? '...' : String(totalProjects),
              subtitle: `${summaries.filter(s => (s.project.progress ?? 0) > 0 && (s.project.progress ?? 0) < 100).length} in progress`,
              icon: FolderKanban,
              gradient: 'from-violet-600 to-indigo-600',
              iconBg: 'text-violet-200/20',
              trend: null,
            },
            {
              label: 'Contract Value',
              value: loading ? '...' : fmtCompact(totalContractValue),
              subtitle: 'Total portfolio',
              icon: Briefcase,
              gradient: 'from-blue-600 to-cyan-600',
              iconBg: 'text-blue-200/20',
              trend: null,
            },
            {
              label: 'BOQ Value',
              value: loading ? '...' : fmtCompact(totalBOQValue),
              subtitle: `${summaries.reduce((s, p) => s + p.boqItems.length, 0)} line items`,
              icon: FileSpreadsheet,
              gradient: 'from-emerald-600 to-teal-600',
              iconBg: 'text-emerald-200/20',
              trend: null,
            },
            {
              label: 'Actual Cost',
              value: loading ? '...' : fmtCompact(totalActualCost),
              subtitle: totalContractValue > 0 ? `${((totalActualCost / totalContractValue) * 100).toFixed(1)}% of contract` : 'No contract set',
              icon: TrendingDown,
              gradient: 'from-rose-600 to-pink-600',
              iconBg: 'text-rose-200/20',
              trend: null,
            },
            {
              label: 'Projected Profit',
              value: loading ? '...' : fmtCompact(projectedProfit),
              subtitle: totalContractValue > 0 ? `${profitMargin.toFixed(1)}% margin` : 'N/A',
              icon: projectedProfit >= 0 ? TrendingUp : TrendingDown,
              gradient: projectedProfit >= 0 ? 'from-green-600 to-emerald-600' : 'from-red-600 to-rose-600',
              iconBg: projectedProfit >= 0 ? 'text-green-200/20' : 'text-red-200/20',
              trend: projectedProfit >= 0 ? 'up' as const : 'down' as const,
            },
          ]).map(kpi => (
            <div
              key={kpi.label}
              className={cn(
                'relative overflow-hidden rounded-xl bg-gradient-to-br p-4 shadow-lg',
                kpi.gradient
              )}
            >
              {/* Background icon */}
              <kpi.icon
                size={80}
                className={cn('absolute -right-3 -top-3 rotate-12 opacity-[0.08]', kpi.iconBg)}
                strokeWidth={1}
              />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                  <div className="rounded-lg bg-white/15 p-1.5 backdrop-blur-sm">
                    <kpi.icon size={16} className="text-white" />
                  </div>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold tabular-nums text-white tracking-tight">
                    {kpi.value}
                  </span>
                  {kpi.trend === 'up' && <TrendingUp size={14} className="text-white/70" />}
                  {kpi.trend === 'down' && <TrendingDown size={14} className="text-white/70" />}
                </div>
                <div className="text-[11px] font-medium text-white/70 mt-0.5">{kpi.label}</div>
                <div className="text-[10px] text-white/50 mt-0.5">{kpi.subtitle}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Secondary KPI Strip */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-6">
          {([
            { label: 'Total Paid', value: fmtCompact(totalPaid), icon: CheckCircle2, color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
            { label: 'Pending Payments', value: fmtCompact(pendingPayments), icon: Clock, color: 'text-amber-400', dotColor: 'bg-amber-400' },
            { label: 'Approved VOs', value: fmtCompact(approvedVariations), icon: CheckCircle2, color: 'text-blue-400', dotColor: 'bg-blue-400' },
            { label: 'Pending VOs', value: fmtCompact(pendingVariations), icon: AlertTriangle, color: 'text-orange-400', dotColor: 'bg-orange-400' },
            { label: 'Active Tenders', value: fmt(activeTenders), icon: Receipt, color: 'text-purple-400', dotColor: 'bg-purple-400' },
            { label: 'Measurements', value: `${fmt(totalMeasurements)}`, icon: Ruler, color: 'text-sky-400', dotColor: 'bg-sky-400' },
          ] as const).map(kpi => (
            <div
              key={kpi.label}
              className="rounded-lg border border-slate-700/50 bg-slate-800/50 px-3.5 py-3 backdrop-blur-sm"
            >
              <div className="flex items-center gap-2">
                <div className={cn('h-1.5 w-1.5 rounded-full', kpi.dotColor)} />
                <span className={cn('text-sm font-bold tabular-nums', kpi.color)}>
                  {loading ? '...' : kpi.value}
                </span>
              </div>
              <div className="mt-1 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                {kpi.label}
              </div>
            </div>
          ))}
        </div>

        {/* Project Cards Section */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white">Projects</h2>
              <span className="rounded-full bg-slate-700/50 px-2.5 py-0.5 text-xs font-medium tabular-nums text-slate-400">
                {totalProjects}
              </span>
            </div>
            {projects.length > 0 && (
              <button
                onClick={() => router.push('/projects')}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
              >
                View all <ArrowUpRight size={12} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-xl border border-slate-700/50 bg-slate-800/50"
                />
              ))}
            </div>
          ) : summaries.length === 0 ? (
            /* Premium Empty State */
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/50 bg-gradient-to-br from-slate-800/80 to-slate-900/80 px-8 py-16 text-center backdrop-blur-sm">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-600/10 via-transparent to-transparent" />
              <div className="relative z-10">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 ring-1 ring-blue-500/20">
                  <Building2 size={36} className="text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white">Start Your First Project</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-400">
                  Create a project to begin managing BOQs, measurements, cost control, and payment certificates -- all in one place.
                </p>
                <div className="mt-8 flex items-center justify-center gap-3">
                  <button
                    onClick={() => router.push('/projects')}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:shadow-blue-500/40"
                  >
                    <Plus size={16} />
                    Create Project
                  </button>
                </div>
                <div className="mt-8 grid grid-cols-3 gap-6 border-t border-slate-700/50 pt-8">
                  {[
                    { icon: FileSpreadsheet, label: 'Bill of Quantities', desc: 'Structured BOQ management' },
                    { icon: Ruler, label: 'Measurements', desc: 'Accurate quantity tracking' },
                    { icon: BarChart3, label: 'Cost Control', desc: 'Budget & forecast analytics' },
                  ].map(f => (
                    <div key={f.label} className="text-center">
                      <f.icon size={20} className="mx-auto mb-2 text-slate-500" />
                      <div className="text-xs font-semibold text-slate-300">{f.label}</div>
                      <div className="mt-0.5 text-[10px] text-slate-500">{f.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summaries.map(s => {
                const boqTotal = s.boqItems.reduce((a, b) => a + (b.total_amount ?? 0), 0)
                const contractVal = s.contract?.contract_value ?? 0
                const actual = s.costEntries.filter(c => c.category === 'actual').reduce((a, b) => a + b.amount, 0)
                const paid = s.paymentCerts.filter(c => c.status === 'paid').reduce((a, b) => a + b.net_payable, 0)
                const varApproved = s.variations.filter(v => v.status === 'approved').reduce((a, b) => a + (b.approved_amount ?? b.amount), 0)
                const progress = s.project.progress ?? 0
                const statusColor = progress >= 100
                  ? 'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20'
                  : progress > 0
                    ? 'bg-blue-500/15 text-blue-400 ring-blue-500/20'
                    : 'bg-slate-500/15 text-slate-400 ring-slate-500/20'
                const statusLabel = progress >= 100 ? 'Complete' : progress > 0 ? 'In Progress' : 'Not Started'

                return (
                  <div
                    key={s.project.id}
                    className="group relative overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/50 backdrop-blur-sm transition-all hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/5"
                  >
                    {/* Card Header */}
                    <div className="border-b border-slate-700/30 p-4 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="truncate text-sm font-bold text-white">
                            {s.project.name}
                          </h3>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                            {s.project.client_name && (
                              <span className="flex items-center gap-1">
                                <Users size={10} className="text-slate-500" />
                                {s.project.client_name}
                              </span>
                            )}
                            {s.project.location && (
                              <span className="flex items-center gap-1">
                                <MapPin size={10} className="text-slate-500" />
                                {s.project.location}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className={cn(
                          'inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset',
                          statusColor
                        )}>
                          {statusLabel}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span>Progress</span>
                          <span className="font-semibold tabular-nums text-slate-300">{progress}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-700/50">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-500',
                              progress >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : progress > 50
                                  ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                                  : 'bg-gradient-to-r from-blue-600 to-blue-400'
                            )}
                            style={{ width: `${Math.min(100, Math.max(progress, 0))}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Metrics */}
                    <div className="p-4 pt-3">
                      <div className="space-y-1.5 text-xs">
                        {contractVal > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Contract</span>
                            <span className="font-semibold tabular-nums text-slate-200">{fmtFull(contractVal)}</span>
                          </div>
                        )}
                        {boqTotal > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">BOQ Total</span>
                            <span className="font-semibold tabular-nums text-slate-200">{fmtFull(boqTotal)}</span>
                          </div>
                        )}
                        {actual > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Actual Cost</span>
                            <span className="font-semibold tabular-nums text-rose-400">{fmtFull(actual)}</span>
                          </div>
                        )}
                        {paid > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Paid</span>
                            <span className="font-semibold tabular-nums text-emerald-400">{fmtFull(paid)}</span>
                          </div>
                        )}
                        {varApproved > 0 && (
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Approved VOs</span>
                            <span className="font-semibold tabular-nums text-blue-400">{fmtFull(varApproved)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Footer with stats + action buttons */}
                    <div className="border-t border-slate-700/30 px-4 py-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[10px] tabular-nums text-slate-500">
                          <span>{s.boqItems.length} BOQ</span>
                          <span>{s.measurementItems.length} Meas</span>
                          <span>{s.paymentCerts.length} IPC</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/projects/${s.project.id}/measurements`) }}
                            className="rounded-md px-2 py-1 text-[10px] font-semibold text-blue-400 transition-colors hover:bg-blue-500/10"
                            title="Open"
                          >
                            Open
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/projects/${s.project.id}/boq`) }}
                            className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-300"
                            title="BOQ"
                          >
                            BOQ
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/projects/${s.project.id}/drawings`) }}
                            className="rounded-md px-2 py-1 text-[10px] font-semibold text-slate-400 transition-colors hover:bg-slate-500/10 hover:text-slate-300"
                            title="Drawings"
                          >
                            Dwg
                          </button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-600">
                        <Clock size={9} />
                        <span>Updated {formatDate(s.project.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
