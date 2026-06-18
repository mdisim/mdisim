import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  FolderKanban,
  ArrowRight,
  Image,
  FileText,
  Wrench,
  CreditCard,
  ClipboardList,
  ChevronRight,
  ExternalLink,
  Plus,
  BarChart3,
  ArrowUpRight,
  CircleDot,
  Upload,
  Download,
  Eye,
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
    { count: totalDrawingCount },
    { count: totalBoqCount },
  ] = await Promise.all([
    supabase.from('projects').select('*').eq('created_by', user!.id).order('updated_at', { ascending: false }),
    supabase.from('cost_entries').select('amount, status, project_id').in('project_id', projectIds),
    supabase.from('contractor_payments').select('amount, status, project_id').in('project_id', projectIds),
    supabase.from('drawing_files').select('id, name, project_id, file_type, page_count, created_at, projects(name)').in('project_id', projectIds).order('created_at', { ascending: false }).limit(5),
    supabase.from('boq_items').select('id, description, total_amount, category, project_id, projects(name)').in('project_id', projectIds).order('created_at', { ascending: false }).limit(5),
    supabase.from('site_daily_reports').select('id, report_date, project_id, work_status, projects(name)').in('project_id', projectIds).order('report_date', { ascending: false }).limit(4),
    supabase.from('rebar_elements').select('id, element_mark, element_type, project_id, bars:rebar_bars(id, diameter_mm, total_weight_kg)').in('project_id', projectIds).order('created_at', { ascending: false }).limit(30),
    supabase.from('drawing_files').select('id', { count: 'exact', head: true }).in('project_id', projectIds),
    supabase.from('boq_items').select('id', { count: 'exact', head: true }).in('project_id', projectIds),
  ])

  const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) ?? 0
  const totalSpent = costEntries?.reduce((sum, c) => sum + (c.amount || 0), 0) ?? 0
  const activeProjects = projects?.filter(p => p.status === 'active') ?? []
  const pendingPayments = payments?.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount, 0) ?? 0
  const completedPayments = payments?.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0) ?? 0
  const totalBoqValue = recentBoqItems?.reduce((s, b) => s + (b.total_amount || 0), 0) ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allBars = (rebarElements ?? []).flatMap((el: any) => el.bars ?? [])
  const totalSteelWeight = allBars.reduce((s: number, b: { total_weight_kg: number | null }) => s + (b.total_weight_kg ?? 0), 0)
  const totalBarCount = allBars.length
  const uniqueDiameters = new Set(allBars.map((b: { diameter_mm: number }) => b.diameter_mm)).size

  const lastProject = projects?.[0] ?? null
  const lastDrawing = recentDrawings?.[0] ?? null
  const budgetPct = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0

  type ProjectRow = { name: string }
  type DrawingRow = { id: string; name: string; project_id: string; file_type: string; page_count: number; created_at: string; projects: ProjectRow | ProjectRow[] | null }
  type BoqRow = { id: string; description: string; total_amount: number; category: string; project_id: string; projects: ProjectRow | ProjectRow[] | null }
  type ReportRow = { id: string; report_date: string; project_id: string; work_status: string; projects: ProjectRow | ProjectRow[] | null }
  const pName = (p: ProjectRow | ProjectRow[] | null) => p && !Array.isArray(p) ? p.name : ''

  return (
    <div className="space-y-10 max-w-[1400px] mx-auto">

      {/* ═══════════════════════════════════════════════════════════════
          ROW 1 — Welcome + KPIs + Continue Working
          ═══════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 min-w-0">
          {/* Welcome */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                <T k="welcome_back" fallback="Welcome back" />, {companyName}
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
            <Link
              href="/projects"
              className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm shadow-blue-600/20"
            >
              <Plus size={16} /> New Project
            </Link>
          </div>

          {/* KPIs — 4 large metric cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: FolderKanban, label: 'Projects', value: String(projects?.length ?? 0), sub: `${activeProjects.length} active`, subColor: 'text-green-600', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
              { icon: BarChart3, label: 'Total Budget', value: ils(totalBudget), sub: `${budgetPct.toFixed(0)}% spent`, subColor: budgetPct > 90 ? 'text-red-600' : budgetPct > 70 ? 'text-amber-600' : 'text-green-600', iconBg: 'bg-green-50', iconColor: 'text-green-600' },
              { icon: Wrench, label: 'Steel Weight', value: totalSteelWeight > 0 ? `${(totalSteelWeight / 1000).toFixed(1)}t` : '—', sub: `${totalBarCount} bars`, subColor: 'text-purple-600', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
              { icon: CreditCard, label: 'Pending', value: ils(pendingPayments), sub: 'awaiting payment', subColor: 'text-amber-600', iconBg: 'bg-amber-50', iconColor: 'text-amber-600' },
            ].map((kpi) => (
              <div key={kpi.label} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md hover:shadow-xl transition-shadow">
                <div className="flex items-center gap-2.5 mb-3">
                  <div className={`w-9 h-9 rounded-xl ${kpi.iconBg} flex items-center justify-center`}>
                    <kpi.icon size={17} className={kpi.iconColor} />
                  </div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</span>
                </div>
                <p className="text-4xl font-extrabold text-slate-900 tabular-nums leading-none">{kpi.value}</p>
                <p className={`text-xs font-medium mt-1.5 ${kpi.subColor}`}>{kpi.sub}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Continue Working — dark card */}
        <div className="xl:w-[400px] bg-gradient-to-br from-[#0F172A] to-slate-800 rounded-2xl p-6 text-white flex flex-col shadow-xl shadow-slate-900/10 hover:-translate-y-0.5 transition-transform">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold flex items-center gap-2.5">
              <CircleDot size={16} className="text-green-400" />
              Continue Working
            </h2>
            {lastProject && (
              <Link href="/projects" className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1">
                All <ArrowRight size={12} />
              </Link>
            )}
          </div>

          {lastProject ? (
            <Link
              href={`/projects/${lastProject.id}`}
              className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] transition-all mb-2.5 group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
                <FolderKanban size={18} className="text-blue-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{lastProject.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{lastProject.client_name || 'Latest project'}</p>
              </div>
              <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
            </Link>
          ) : (
            <div className="p-4 rounded-xl bg-white/[0.06] border border-white/[0.06] mb-2.5 text-center">
              <p className="text-sm text-slate-400">No projects yet</p>
              <Link href="/projects" className="text-xs text-blue-400 hover:text-blue-300 mt-1 inline-block">Create your first project →</Link>
            </div>
          )}

          {lastDrawing && (
            <Link
              href={`/projects/${(lastDrawing as DrawingRow).project_id}/takeoff`}
              className="flex items-center gap-3.5 p-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.06] transition-all mb-4 group"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
                <Image size={18} className="text-purple-300" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{(lastDrawing as DrawingRow).name}</p>
                <p className="text-xs text-slate-400 mt-0.5">Last opened drawing</p>
              </div>
              <ChevronRight size={16} className="text-white/20 group-hover:text-white/50 shrink-0 transition-colors" />
            </Link>
          )}

          {/* Quick actions */}
          <div className="flex gap-2.5 mt-auto pt-2">
            {lastProject ? (
              <>
                <Link href={`/projects/${lastProject.id}/takeoff`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold transition-colors border border-white/[0.06]">
                  <Image size={13} /> Drawings
                </Link>
                <Link href={`/projects/${lastProject.id}/boq`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold transition-colors border border-white/[0.06]">
                  <FileText size={13} /> BOQ
                </Link>
                <Link href={`/projects/${lastProject.id}/rebar`} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-xs font-semibold transition-colors border border-white/[0.06]">
                  <Wrench size={13} /> Rebar
                </Link>
              </>
            ) : (
              <Link href="/projects" className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold transition-colors">
                <Plus size={13} /> Create Project
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ROW 2 — Core Modules Feature Cards (large, prominent)
          ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-50/50 -mx-4 px-4 py-6 rounded-2xl">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Core Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Drawings & Takeoff */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-md hover:shadow-xl hover:border-blue-200 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                <Image size={28} className="text-blue-600" />
              </div>
              <Link href={lastProject ? `/projects/${lastProject.id}/takeoff` : '/projects'}>
                <ArrowUpRight size={18} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
              </Link>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Drawings & Takeoff</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">Upload drawings, measure quantities, and extract data from construction documents.</p>
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{totalDrawingCount ?? 0}</p>
                <p className="text-[11px] text-slate-400 font-medium">Drawings</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div>
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{recentDrawings?.reduce((s, d: DrawingRow) => s + (d.page_count || 1), 0) ?? 0}</p>
                <p className="text-[11px] text-slate-400 font-medium">Pages</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={lastProject ? `/projects/${lastProject.id}/takeoff/upload` : '/projects'} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors">
                <Upload size={12} /> Upload
              </Link>
              <Link href={lastProject ? `/projects/${lastProject.id}/takeoff` : '/projects'} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                <Eye size={12} /> View All
              </Link>
            </div>
          </div>

          {/* BOQ */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-md hover:shadow-xl hover:border-green-200 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-green-50 flex items-center justify-center group-hover:bg-green-100 transition-colors">
                <FileText size={28} className="text-green-600" />
              </div>
              <Link href={lastProject ? `/projects/${lastProject.id}/boq` : '/projects'}>
                <ArrowUpRight size={18} className="text-slate-300 group-hover:text-green-500 transition-colors" />
              </Link>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Bill of Quantities</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">Manage BOQ items, track quantities, rates, and total project values.</p>
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{totalBoqCount ?? 0}</p>
                <p className="text-[11px] text-slate-400 font-medium">Items</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div>
                <p className="text-3xl font-extrabold text-green-700 tabular-nums">{ils(totalBoqValue)}</p>
                <p className="text-[11px] text-slate-400 font-medium">Total Value</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={lastProject ? `/projects/${lastProject.id}/boq` : '/projects'} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-semibold rounded-lg transition-colors">
                <Plus size={12} /> Add Items
              </Link>
              <Link href={lastProject ? `/projects/${lastProject.id}/boq` : '/projects'} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                <Download size={12} /> Export
              </Link>
            </div>
          </div>

          {/* Rebar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-md hover:shadow-xl hover:border-purple-200 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                <Wrench size={28} className="text-purple-600" />
              </div>
              <Link href={lastProject ? `/projects/${lastProject.id}/rebar` : '/projects'}>
                <ArrowUpRight size={18} className="text-slate-300 group-hover:text-purple-500 transition-colors" />
              </Link>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Rebar Schedule</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">Extract rebar from drawings, generate bar bending schedules and procurement lists.</p>
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{totalBarCount}</p>
                <p className="text-[11px] text-slate-400 font-medium">Bars</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div>
                <p className="text-3xl font-extrabold text-purple-700 tabular-nums">{totalSteelWeight > 0 ? `${(totalSteelWeight / 1000).toFixed(1)}t` : '—'}</p>
                <p className="text-[11px] text-slate-400 font-medium">Weight</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div>
                <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{uniqueDiameters || '—'}</p>
                <p className="text-[11px] text-slate-400 font-medium">Sizes</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={lastProject ? `/projects/${lastProject.id}/rebar/extract` : '/projects'} className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-lg transition-colors">
                <Wrench size={12} /> Extract
              </Link>
              <Link href={lastProject ? `/projects/${lastProject.id}/rebar` : '/projects'} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg transition-colors">
                <Eye size={12} /> Schedule
              </Link>
            </div>
          </div>

          {/* Payments */}
          <div className="bg-white rounded-2xl border border-slate-200 p-7 shadow-md hover:shadow-xl hover:border-amber-200 hover:-translate-y-1 transition-all duration-300 group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-14 h-14 rounded-xl bg-amber-50 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <CreditCard size={28} className="text-amber-600" />
              </div>
              <Link href={lastProject ? `/projects/${lastProject.id}/contractors` : '/projects'}>
                <ArrowUpRight size={18} className="text-slate-300 group-hover:text-amber-500 transition-colors" />
              </Link>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Payments</h3>
            <p className="text-sm text-slate-500 mb-4 leading-relaxed">Track contractor payments, certificates, and financial progress across projects.</p>
            <div className="flex items-center gap-4 mb-4">
              <div>
                <p className="text-3xl font-extrabold text-amber-600 tabular-nums">{ils(pendingPayments)}</p>
                <p className="text-[11px] text-slate-400 font-medium">Pending</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div>
                <p className="text-3xl font-extrabold text-green-600 tabular-nums">{ils(completedPayments)}</p>
                <p className="text-[11px] text-slate-400 font-medium">Paid</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={lastProject ? `/projects/${lastProject.id}/contractors` : '/projects'} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-lg transition-colors">
                <CreditCard size={12} /> Manage
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ROW 3 — Budget Progress (compact inline)
          ═══════════════════════════════════════════════════════════════ */}
      {totalBudget > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5 shadow-md">
          <span className="text-sm font-bold text-slate-700 shrink-0">Overall Budget</span>
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${budgetPct > 90 ? 'bg-red-500' : budgetPct > 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${Math.min(budgetPct, 100)}%` }}
            />
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="text-sm font-medium text-slate-600 tabular-nums">{ils(totalSpent)} / {ils(totalBudget)}</span>
            <span className={`text-sm font-bold tabular-nums px-2 py-0.5 rounded-lg ${budgetPct > 90 ? 'bg-red-50 text-red-600' : budgetPct > 70 ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
              {budgetPct.toFixed(0)}%
            </span>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ROW 4 — Recent Activity Grid
          ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">

        {/* Recent Drawings */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
              <Image size={16} className="text-blue-600" />
              Recent Drawings
            </h3>
            <span className="text-xs text-slate-400 font-medium tabular-nums">{totalDrawingCount ?? 0} total</span>
          </div>
          <div className="divide-y divide-slate-50">
            {(!recentDrawings || recentDrawings.length === 0) ? (
              <div className="px-5 py-12 text-center">
                <Image size={32} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No drawings yet</p>
                <p className="text-xs text-slate-400 mt-1">Upload drawings to a project to begin</p>
              </div>
            ) : (
              (recentDrawings as DrawingRow[]).map((d) => (
                <Link key={d.id} href={`/projects/${d.project_id}/takeoff`} className="flex items-center gap-3.5 px-5 py-3 hover:bg-blue-50/40 transition-colors group">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
                    <Image size={15} className="text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{d.name}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{pName(d.projects)} · {d.page_count || 1} pages · {d.file_type?.toUpperCase() || 'PDF'}</p>
                  </div>
                  <ExternalLink size={13} className="text-slate-300 group-hover:text-blue-500 shrink-0 transition-colors" />
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Active BOQ Items */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
              <FileText size={16} className="text-green-600" />
              Recent BOQ
            </h3>
            <span className="text-xs text-green-600 font-bold tabular-nums">{ils(totalBoqValue)}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {(!recentBoqItems || recentBoqItems.length === 0) ? (
              <div className="px-5 py-12 text-center">
                <FileText size={32} className="mx-auto text-slate-200 mb-3" />
                <p className="text-sm text-slate-400 font-medium">No BOQ items yet</p>
                <p className="text-xs text-slate-400 mt-1">Add items in a project BOQ</p>
              </div>
            ) : (
              (recentBoqItems as BoqRow[]).map((b) => (
                <Link key={b.id} href={`/projects/${b.project_id}/boq`} className="flex items-center gap-3 px-5 py-3 hover:bg-green-50/40 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-700 truncate">{b.description}</p>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{pName(b.projects)}{b.category ? ` · ${b.category}` : ''}</p>
                  </div>
                  <span className="text-sm font-bold text-slate-700 tabular-nums shrink-0">{ils(b.total_amount)}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Stacked: Reports + Payment summary */}
        <div className="flex flex-col gap-4">
          {/* Recent Reports */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5">
                <ClipboardList size={16} className="text-indigo-600" />
                Recent Reports
              </h3>
            </div>
            <div className="divide-y divide-slate-50">
              {(!recentReports || recentReports.length === 0) ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-slate-400">No reports yet</p>
                </div>
              ) : (
                (recentReports as ReportRow[]).map((r) => (
                  <Link key={r.id} href={`/projects/${r.project_id}/reports`} className="flex items-center justify-between px-5 py-3 hover:bg-indigo-50/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700">{new Date(r.report_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{pName(r.projects)}</p>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                      r.work_status === 'normal' ? 'bg-green-50 text-green-700' :
                      r.work_status === 'delayed' ? 'bg-red-50 text-red-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{r.work_status || 'draft'}</span>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Payment Summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-md">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2.5 mb-4">
              <CreditCard size={16} className="text-amber-600" />
              Payment Summary
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Pending</span>
                <span className="text-base font-bold text-amber-600 tabular-nums">{ils(pendingPayments)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Completed</span>
                <span className="text-base font-bold text-green-600 tabular-nums">{ils(completedPayments)}</span>
              </div>
              <div className="h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-700">Total</span>
                <span className="text-base font-extrabold text-slate-900 tabular-nums">{ils(pendingPayments + completedPayments)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ROW 5 — Active Projects Table
          ═══════════════════════════════════════════════════════════════ */}
      {activeProjects.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h3 className="text-xl font-bold text-slate-800">Active Projects</h3>
            <Link href="/projects" className="text-sm text-blue-600 hover:text-blue-700 font-semibold flex items-center gap-1.5">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          {/* Desktop table */}
          <div className="hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Project</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Budget</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activeProjects.slice(0, 6).map((project) => {
                  const spent = costEntries?.filter(c => c.project_id === project.id).reduce((s, c) => s + c.amount, 0) ?? 0
                  return (
                    <tr key={project.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3.5">
                        <Link href={`/projects/${project.id}`} className="text-sm font-semibold text-slate-800 hover:text-blue-600 transition-colors">
                          {project.name}
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-500">{project.client_name || '—'}</td>
                      <td className="px-4 py-3.5"><StatusBadge status={project.status} /></td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 text-right tabular-nums">{ils(project.budget || 0)}</td>
                      <td className="px-6 py-3.5 text-sm font-semibold text-right tabular-nums">
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
                <Link key={project.id} href={`/projects/${project.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{project.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{project.client_name || 'No client'}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-bold text-slate-700 tabular-nums">{ils(project.budget || 0)}</p>
                    <div className="mt-1"><StatusBadge status={project.status} /></div>
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
