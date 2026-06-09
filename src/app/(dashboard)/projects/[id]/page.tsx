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
} from 'lucide-react'
import { StatusBadge } from '@/components/ui/badge'

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

  const navLinks = [
    { href: `/projects/${id}/boq`, label: 'BOQ', icon: FileText, count: boqItems?.length ?? 0 },
    { href: `/projects/${id}/costs`, label: 'Cost Tracking', icon: TrendingUp, count: costEntries?.length ?? 0 },
    { href: `/projects/${id}/contractors`, label: 'Contractor Payments', icon: Users, count: payments?.length ?? 0 },
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
          <span>Budget: ${project.budget?.toLocaleString()}</span>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">BOQ Total</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${boqTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{boqItems?.length ?? 0} line items</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Total Costs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${costTotal.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{costEntries?.length ?? 0} entries</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">Paid to Contractors</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">${paidPayments.toLocaleString()}</p>
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
