import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  MapPin,
  User,
  Calendar,
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  ClipboardList,
  Ruler,
  GitBranch,
  Award,
  GitMerge,
  Package,
  Layers,
  BarChart2,
  TrendingDown,
  FolderOpen,
  FileSignature,
  ShoppingCart,
  FileBarChart,
  ShieldAlert,
  AlertCircle,
  Users2,
  Mail,
  GitCompare,
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge'
import { ils } from '@/lib/server-currency'

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: boqItems }, { data: costEntries }, { data: payments }] =
    await Promise.all([
      supabase.from('projects').select('*').eq('id', id).single(),
      supabase.from('boq_items').select('*').eq('project_id', id),
      supabase.from('cost_entries').select('*').eq('project_id', id),
      supabase
        .from('contractor_payments')
        .select('*, contractor:contractors(name, company)')
        .eq('project_id', id),
    ])

  if (!project) notFound()

  const boqTotal = boqItems?.reduce((s, i) => s + i.total_amount, 0) ?? 0
  const costTotal = costEntries?.reduce((s, c) => s + c.amount, 0) ?? 0
  const paidPayments = payments?.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0) ?? 0
  const budgetUsed = project.budget > 0 ? (costTotal / project.budget) * 100 : 0

  const [
    { data: reportsCount },
    { data: drawingsCount },
    { data: latestReport },
    { data: projectPhases },
  ] = await Promise.all([
    supabase.from('site_daily_reports').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('drawing_files').select('id', { count: 'exact', head: true }).eq('project_id', id),
    supabase.from('site_daily_reports').select('report_date').eq('project_id', id).order('report_date', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('project_phases').select('progress_percent').eq('project_id', id),
  ])

  // Health score computation
  const budgetScore = (() => {
    if (project.budget <= 0) return 100
    const pct = costTotal / project.budget
    if (pct < 0.5) return 100
    if (pct < 0.7) return 80
    if (pct < 0.9) return 60
    return 30
  })()

  const scheduleScore = (() => {
    if (!project.end_date) return 70
    const days = Math.round((new Date(project.end_date).getTime() - Date.now()) / 86400000)
    if (days > 30) return 100
    if (days >= 10) return 70
    if (days >= 0) return 40
    return 20
  })()

  const activityScore = (() => {
    if (!latestReport?.report_date) return 20
    const days = Math.round((Date.now() - new Date(latestReport.report_date).getTime()) / 86400000)
    if (days <= 7) return 100
    if (days <= 30) return 60
    return 20
  })()

  const phaseScore = (() => {
    const arr = projectPhases ?? []
    if (arr.length === 0) return 50
    return arr.reduce((s, p) => s + p.progress_percent, 0) / arr.length
  })()

  const healthScore = Math.round(
    budgetScore * 0.4 + scheduleScore * 0.3 + activityScore * 0.2 + phaseScore * 0.1
  )
  const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#f59e0b' : '#ef4444'
  const healthLabel = healthScore >= 70 ? 'On Track' : healthScore >= 40 ? 'Needs Attention' : 'At Risk'

  const navLinks = [
    { href: `/projects/${id}/boq`, label: 'BOQ', icon: FileText, count: boqItems?.length ?? 0 },
    { href: `/projects/${id}/costs`, label: 'Cost Tracking', icon: TrendingUp, count: costEntries?.length ?? 0 },
    { href: `/projects/${id}/contractors`, label: 'Contractor Payments', icon: Users, count: payments?.length ?? 0 },
    { href: `/projects/${id}/reports`, label: 'Site Daily Reports', icon: ClipboardList, count: (reportsCount as unknown as { count: number } | null)?.count ?? 0 },
    { href: `/projects/${id}/takeoff`, label: 'Quantity Takeoff', icon: Ruler, count: (drawingsCount as unknown as { count: number } | null)?.count ?? 0 },
    { href: `/projects/${id}/phases`, label: 'Phases & Milestones', icon: GitBranch, count: 0 },
    { href: `/projects/${id}/certificates`, label: 'Payment Certificates', icon: Award, count: 0 },
    { href: `/projects/${id}/variations`, label: 'Variations', icon: GitMerge, count: 0 },
    { href: `/projects/${id}/materials`, label: 'Materials', icon: Package, count: 0 },
    { href: `/projects/${id}/concrete`, label: 'Concrete & Rebar', icon: Layers, count: 0 },
    { href: `/projects/${id}/gantt`, label: 'Gantt Chart', icon: BarChart2, count: 0 },
    { href: `/projects/${id}/cashflow`, label: 'Cash Flow', icon: TrendingDown, count: 0 },
    { href: `/projects/${id}/documents`, label: 'Documents', icon: FolderOpen, count: 0 },
    { href: `/projects/${id}/contracts`, label: 'Contracts', icon: FileSignature, count: 0 },
    { href: `/projects/${id}/procurement`, label: 'Procurement', icon: ShoppingCart, count: 0 },
    { href: `/projects/${id}/budget-report`, label: 'Budget Report', icon: FileBarChart, count: 0 },
    { href: `/projects/${id}/risks`, label: 'Risk Register', icon: ShieldAlert, count: 0 },
    { href: `/projects/${id}/issues`, label: 'Issues Register', icon: AlertCircle, count: 0 },
    { href: `/projects/${id}/meetings`, label: 'Meeting Minutes', icon: Users2, count: 0 },
    { href: `/projects/${id}/correspondence`, label: 'Correspondence', icon: Mail, count: 0 },
    { href: `/projects/${id}/boq-comparison`, label: 'BOQ Comparison', icon: GitCompare, count: 0 },
  ]

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div>
        <Link href="/projects" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to Projects
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.name}</h1>
            {project.description && (
              <p className="text-slate-500 text-sm mt-1 max-w-xl">{project.description}</p>
            )}
          </div>
          <StatusBadge status={project.status} />
        </div>
      </div>

      {/* Meta info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {project.client_name && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User size={15} className="text-slate-400" />
            <span>{project.client_name}</span>
          </div>
        )}
        {project.location && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin size={15} className="text-slate-400" />
            <span>{project.location}</span>
          </div>
        )}
        {project.start_date && (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar size={15} className="text-slate-400" />
            <span>{new Date(project.start_date).toLocaleDateString()}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <DollarSign size={15} className="text-slate-400" />
          <span>Budget: {ils(project.budget ?? 0)}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">BOQ Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{ils(boqTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">{boqItems?.length ?? 0} line items</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Costs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{ils(costTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">{costEntries?.length ?? 0} entries</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Paid to Contractors</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{ils(paidPayments)}</p>
          <p className="text-xs text-slate-400 mt-1">{payments?.length ?? 0} payments</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Budget Used</p>
          <p className={`text-2xl font-bold mt-1 ${budgetUsed > 90 ? 'text-red-600' : budgetUsed > 70 ? 'text-amber-600' : 'text-green-600'}`}>
            {budgetUsed.toFixed(1)}%
          </p>
          <div className="mt-2 h-1.5 bg-slate-100 rounded-full">
            <div
              className={`h-full rounded-full ${budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 70 ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(budgetUsed, 100)}%` }}
            />
          </div>
        </div>
        {/* Health Score */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Health Score</p>
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-lg"
            style={{
              background: `conic-gradient(${healthColor} ${healthScore * 3.6}deg, #e2e8f0 0deg)`,
            }}
          >
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center">
              <span className="text-base font-bold" style={{ color: healthColor }}>{healthScore}</span>
            </div>
          </div>
          <p className="text-xs font-semibold mt-2" style={{ color: healthColor }}>{healthLabel}</p>
        </div>
      </div>

      {/* Module navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {navLinks.map(({ href, label, icon: Icon, count }) => (
          <Link
            key={href}
            href={href}
            className="bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                  <Icon size={18} className="text-amber-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400">{count} record{count !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <ArrowLeft size={16} className="text-slate-300 rotate-180 group-hover:text-amber-500 transition-colors" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
