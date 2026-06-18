import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  FolderKanban,
  ArrowRight,
  Image,
  FileText,
  Wrench,
  Ruler,
  CreditCard,
  ClipboardList,
  ChevronRight,
  ExternalLink,
  Plus,
  BarChart3,
  ArrowUpRight,
  CircleDot,
} from 'lucide-react'
import { ils } from '@/lib/server-currency'
import { T } from '@/components/ui/translated-label'
import { StatusBadge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let companyName = 'ANGEL D.C.'
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('companies(name)')
      .eq('id', user.id)
      .single()
    if (profile && profile.companies && !Array.isArray(profile.companies)) {
      companyName = (profile.companies as { name: string }).name
    }
  }

  const projectIds = (await supabase.from('projects').select('id').eq('created_by', user!.id)).data?.map(p => p.id) ?? []

  const [
    { data: projects },
    { data: costEntries },
    { data: payments },
    { data: recentDrawings },
    { data: recentBoqItems },
    { data: recentReports },
    { data: rebarElements },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('created_by', user!.id).order('updated_at', { ascending: false }),
    supabase.from('cost_entries').select('amount, status, project_id').in('project_id', projectIds),
    supabase.from('contractor_payments').select('amount, status, project_id').in('project_id', projectIds),
    supabase.from('drawing_files').select('id, name, project_id, file_type, page_count, created_at, projects(name)').in('project_id', projectIds).order('created_at', { ascending: false }).limit(6),
    supabase.from('boq_items').select('id, description, total_amount, category, project_id, projects(name)').in('project_id', projectIds).order('created_at', { ascending: false }).limit(6),
    supabase.from('site_daily_reports').select('id, report_date, project_id, work_status, projects(name)').in('project_id', projectIds).order('report_date', { ascending: false }).limit(5),
    supabase.from('rebar_elements').select('id, element_mark, element_type, project_id, bars:rebar_bars(id, diameter_mm, total_weight_kg)').in('project_id', projectIds).order('created_at', { ascending: false }).limit(20),
  ])

  const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) ?? 0
  const totalSpent = costEntries?.reduce((sum, c) => sum + (c.amount || 0), 0) ?? 0
  const activeProjects = projects?.filter(p => p.status === 'active') ?? []
  const pendingPayments = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) ?? 0
  const completedPayments = payments?.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0) ?? 0

  const totalDrawings = recentDrawings?.length ?? 0
  const totalBoqValue = recentBoqItems?.reduce((s, b) => s + (b.total_amount || 0), 0) ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allBars = (rebarElements ?? []).flatMap((el: any) => el.bars ?? [])
  const totalSteelWeight = allBars.reduce((s: number, b: { total_weight_kg: number | null }) => s + (b.total_weight_kg ?? 0), 0)
  const totalBarCount = allBars.length

  const lastProject = projects?.[0] ?? null
  const lastDrawing = recentDrawings?.[0] ?? null

  const budgetPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  type ProjectRow = { name: string }
  type DrawingRow = { id: string; name: string; project_id: string; file_type: string; page_count: number; created_at: string; projects: ProjectRow | ProjectRow[] | null }
  type BoqRow = { id: string; description: string; total_amount: number; category: string; project_id: string; projects: ProjectRow | ProjectRow[] | null }
  type ReportRow = { id: string; report_date: string; project_id: string; work_status: string; projects: ProjectRow | ProjectRow[] | null }

  const pName = (p: ProjectRow | ProjectRow[] | null) => p && !Array.isArray(p) ? p.name : ''

  return (
    <div className="space-y-5 max-w-[1400px] mx-auto">
      {/* ── Row 1: Welcome + Continue Working ─────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Welcome + KPI strip */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">
                <T k="welcome_back" fallback="Welcome back" />, {companyName}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
            <Link
              href="/projects"
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              <Plus size={14} /> New Project
            </Link>
          </div>

          {/* KPI Row — 4 compact metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200/60 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <FolderKanban size={14} className="text-blue-600" />
                </div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Projects</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{projects?.length ?? 0}</p>
              <p className="text-[11px] text-green-600 font-medium mt-0.5">{activeProjects.length} active</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center">
                  <BarChart3 size={14} className="text-green-600" />
                </div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Budget</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{ils(totalBudget)}</p>
              <p className={`text-[11px] font-medium mt-0.5 ${budgetPct > 90 ? 'text-red-600' : budgetPct > 70 ? 'text-amber-600' : 'text-green-600'}`}>
                {budgetPct.toFixed(0)}% spent
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center">
                  <Wrench size={14} className="text-purple-600" />
                </div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Steel</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{totalSteelWeight > 0 ? `${(totalSteelWeight / 1000).toFixed(1)}t` : '—'}</p>
              <p className="text-[11px] text-slate-400 font-medium mt-0.5">{totalBarCount} bars</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200/60 p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <CreditCard size={14} className="text-amber-600" />
                </div>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Payments</span>
              </div>
              <p className="text-2xl font-bold text-slate-900 tabular-nums">{ils(pendingPayments)}</p>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">pending</p>
            </div>
          </div>
        </div>

        {/* Continue Working Card */}
        <div className="lg:w-[380px] bg-gradient-to-br from-slate-900 to-slate-800 rounded-xl p-5 text-white flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              <CircleDot size={14} className="text-green-400" />
              Continue Working
            </h2>
          </div>

          {lastProject ? (
            <Link
              href={`/projects/${lastProject.id}`}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors mb-2 group"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
                <FolderKanban size={16} className="text-blue-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{lastProject.name}</p>
                <p className="text-[11px] text-slate-400">{lastProject.client_name || 'Latest project'}</p>
              </div>
              <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 shrink-0" />
            </Link>
          ) : (
            <div className="p-3 rounded-lg bg-white/[0.06] mb-2 text-center">
              <p className="text-sm text-slate-400">No projects yet</p>
            </div>
          )}

          {lastDrawing ? (
            <Link
              href={`/projects/${(lastDrawing as DrawingRow).project_id}/takeoff`}
              className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors mb-3 group"
            >
              <div className="w-9 h-9 rounded-lg bg-purple-500/20 flex items-center justify-center shrink-0">
                <Image size={16} className="text-purple-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{(lastDrawing as DrawingRow).name}</p>
                <p className="text-[11px] text-slate-400">Last drawing</p>
              </div>
              <ChevronRight size={16} className="text-white/30 group-hover:text-white/60 shrink-0" />
            </Link>
          ) : null}

          {/* Quick actions row */}
          <div className="flex gap-2 mt-auto">
            {lastProject && (
              <>
                <Link href={`/projects/${lastProject.id}/takeoff`} className="flex-1 px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-center text-xs font-medium transition-colors">
                  Drawings
                </Link>
                <Link href={`/projects/${lastProject.id}/boq`} className="flex-1 px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-center text-xs font-medium transition-colors">
                  BOQ
                </Link>
                <Link href={`/projects/${lastProject.id}/rebar`} className="flex-1 px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.14] text-center text-xs font-medium transition-colors">
                  Rebar
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Row 2: Construction Modules — Prominent ──────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { href: lastProject ? `/projects/${lastProject.id}/takeoff` : '/projects', icon: Image, label: 'Drawings & Takeoff', metric: `${totalDrawings} files`, color: 'blue' as const },
          { href: lastProject ? `/projects/${lastProject.id}/boq` : '/projects', icon: FileText, label: 'Bill of Quantities', metric: ils(totalBoqValue), color: 'green' as const },
          { href: lastProject ? `/projects/${lastProject.id}/rebar` : '/projects', icon: Wrench, label: 'Rebar Schedule', metric: `${totalBarCount} bars · ${totalSteelWeight > 0 ? (totalSteelWeight / 1000).toFixed(1) + 't' : '—'}`, color: 'purple' as const },
          { href: lastProject ? `/projects/${lastProject.id}/contractors` : '/projects', icon: CreditCard, label: 'Payments', metric: ils(pendingPayments) + ' pending', color: 'amber' as const },
        ].map((mod) => {
          const bg = { blue: 'bg-blue-50', green: 'bg-green-50', purple: 'bg-purple-50', amber: 'bg-amber-50' }[mod.color]
          const iconClr = { blue: 'text-blue-600', green: 'text-green-600', purple: 'text-purple-600', amber: 'text-amber-600' }[mod.color]
          const border = { blue: 'hover:border-blue-300', green: 'hover:border-green-300', purple: 'hover:border-purple-300', amber: 'hover:border-amber-300' }[mod.color]
          return (
            <Link
              key={mod.label}
              href={mod.href}
              className={`group bg-white rounded-xl border border-slate-200/60 ${border} p-4 hover:shadow-md transition-all`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                  <mod.icon size={18} className={iconClr} />
                </div>
                <ArrowUpRight size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="text-sm font-semibold text-slate-800">{mod.label}</p>
              <p className="text-xs text-slate-400 mt-0.5 tabular-nums">{mod.metric}</p>
            </Link>
          )
        })}
      </div>

      {/* ── Row 3: Budget bar (compact) ──────────────────────────────── */}
      {totalBudget > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/60 px-5 py-3.5 flex items-center gap-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">Budget</span>
          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <span className="text-xs font-medium text-slate-600 tabular-nums shrink-0">
            {ils(totalSpent)} / {ils(totalBudget)}
          </span>
          <span className={`text-xs font-bold tabular-nums shrink-0 ${budgetPct > 90 ? 'text-red-600' : budgetPct > 70 ? 'text-amber-600' : 'text-blue-600'}`}>
            {budgetPct.toFixed(0)}%
          </span>
        </div>
      )}

      {/* ── Row 4: Main content grid ─────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Column 1: Recent Drawings (tall, prominent) */}
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Image size={15} className="text-blue-600" />
              Recent Drawings
            </h3>
            <span className="text-[11px] text-slate-400">{totalDrawings} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {(!recentDrawings || recentDrawings.length === 0) ? (
              <div className="px-4 py-10 text-center">
                <Image size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">Upload drawings to a project to get started</p>
              </div>
            ) : (
              (recentDrawings as DrawingRow[]).map((d) => (
                <Link
                  key={d.id}
                  href={`/projects/${d.project_id}/takeoff`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                    <Image size={14} className="text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-slate-700 truncate">{d.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{pName(d.projects)} · {d.page_count || 1} pg · {d.file_type?.toUpperCase() || 'PDF'}</p>
                  </div>
                  <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Active BOQs */}
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText size={15} className="text-green-600" />
              Active BOQ Items
            </h3>
            <span className="text-[11px] text-green-600 font-medium tabular-nums">{ils(totalBoqValue)}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {(!recentBoqItems || recentBoqItems.length === 0) ? (
              <div className="px-4 py-10 text-center">
                <FileText size={28} className="mx-auto text-slate-200 mb-2" />
                <p className="text-xs text-slate-400">No BOQ items yet</p>
              </div>
            ) : (
              (recentBoqItems as BoqRow[]).map((b) => (
                <Link
                  key={b.id}
                  href={`/projects/${b.project_id}/boq`}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-slate-700 truncate">{b.description}</p>
                    <p className="text-[11px] text-slate-400 truncate">{pName(b.projects)}{b.category ? ` · ${b.category}` : ''}</p>
                  </div>
                  <span className="text-xs font-semibold text-slate-600 tabular-nums shrink-0">{ils(b.total_amount)}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Column 3: Stacked — Rebar Status + Payments + Reports */}
        <div className="flex flex-col gap-4">
          {/* Rebar Extraction Status */}
          <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <Wrench size={15} className="text-purple-600" />
                Rebar Status
              </h3>
            </div>
            <div className="p-4">
              {totalBarCount === 0 ? (
                <p className="text-xs text-slate-400 text-center py-2">No rebar data extracted yet</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900 tabular-nums">{totalBarCount}</p>
                    <p className="text-[11px] text-slate-400">Bars</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900 tabular-nums">{totalSteelWeight > 0 ? `${(totalSteelWeight / 1000).toFixed(1)}t` : '—'}</p>
                    <p className="text-[11px] text-slate-400">Steel Weight</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-slate-900 tabular-nums">{(rebarElements ?? []).length}</p>
                    <p className="text-[11px] text-slate-400">Elements</p>
                  </div>
                  <div className="text-center">
                    {/* Unique diameters */}
                    <p className="text-xl font-bold text-slate-900 tabular-nums">
                      {new Set(allBars.map((b: { diameter_mm: number }) => b.diameter_mm)).size || '—'}
                    </p>
                    <p className="text-[11px] text-slate-400">Diameters</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard size={15} className="text-amber-600" />
                Payments
              </h3>
            </div>
            <div className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Pending</span>
                <span className="text-sm font-bold text-amber-600 tabular-nums">{ils(pendingPayments)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500">Completed</span>
                <span className="text-sm font-bold text-green-600 tabular-nums">{ils(completedPayments)}</span>
              </div>
              <div className="h-px bg-slate-100 my-1" />
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Total Paid</span>
                <span className="text-sm font-bold text-slate-900 tabular-nums">{ils(pendingPayments + completedPayments)}</span>
              </div>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <ClipboardList size={15} className="text-indigo-600" />
                Recent Reports
              </h3>
            </div>
            <div className="divide-y divide-slate-50">
              {(!recentReports || recentReports.length === 0) ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-slate-400">No reports yet</p>
                </div>
              ) : (
                (recentReports as ReportRow[]).slice(0, 3).map((r) => (
                  <Link
                    key={r.id}
                    href={`/projects/${r.project_id}/reports`}
                    className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-50/80 transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] text-slate-700">{new Date(r.report_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      <p className="text-[11px] text-slate-400 truncate">{pName(r.projects)}</p>
                    </div>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${
                      r.work_status === 'normal' ? 'bg-green-50 text-green-700' :
                      r.work_status === 'delayed' ? 'bg-red-50 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{r.work_status || 'draft'}</span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 5: Active Projects List ──────────────────────────────── */}
      {activeProjects.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800">Active Projects</h3>
            <Link href="/projects" className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  <th className="text-left px-5 py-2">Project</th>
                  <th className="text-left px-3 py-2">Client</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-right px-3 py-2">Budget</th>
                  <th className="text-right px-5 py-2">Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeProjects.slice(0, 6).map((project) => {
                  const spent = costEntries?.filter(c => c.project_id === project.id).reduce((s, c) => s + c.amount, 0) ?? 0
                  return (
                    <tr key={project.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/projects/${project.id}`} className="text-sm font-medium text-slate-800 hover:text-blue-600 transition-colors">
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-sm text-slate-500">{project.client_name || '—'}</td>
                      <td className="px-3 py-3"><StatusBadge status={project.status} /></td>
                      <td className="px-3 py-3 text-sm text-slate-600 text-right tabular-nums">{ils(project.budget || 0)}</td>
                      <td className="px-5 py-3 text-sm font-medium text-right tabular-nums">
                        <span className={spent > (project.budget || 0) && project.budget > 0 ? 'text-red-600' : 'text-slate-700'}>
                          {ils(spent)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-slate-50">
            {activeProjects.slice(0, 6).map((project) => {
              const spent = costEntries?.filter(c => c.project_id === project.id).reduce((s, c) => s + c.amount, 0) ?? 0
              return (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{project.name}</p>
                    <p className="text-[11px] text-slate-400">{project.client_name || 'No client'}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-semibold text-slate-700 tabular-nums">{ils(project.budget || 0)}</p>
                    <StatusBadge status={project.status} />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
