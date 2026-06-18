import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { CostsPageClient } from '@/components/costs/costs-page-client'

export default async function CostsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: costEntries }, { data: boqItems }] = await Promise.all([
    supabase.from('projects').select('id, name, budget').eq('id', id).single(),
    supabase.from('cost_entries').select('*').eq('project_id', id).order('cost_date', { ascending: false }),
    supabase.from('boq_items').select('*').eq('project_id', id),
  ])

  if (!project) notFound()

  const total = costEntries?.reduce((s, c) => s + c.amount, 0) ?? 0
  const approved = costEntries?.filter(c => c.status === 'approved').reduce((s, c) => s + c.amount, 0) ?? 0
  const pending = costEntries?.filter(c => c.status === 'pending').reduce((s, c) => s + c.amount, 0) ?? 0

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cost Tracking</h1>
            <p className="text-slate-500 text-sm mt-1">{project.name}</p>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Total Costs</p>
          <p className="text-3xl font-bold text-slate-900 mt-1">${total.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Approved</p>
          <p className="text-3xl font-bold text-green-600 mt-1">${approved.toLocaleString()}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <p className="text-xs text-slate-400 uppercase tracking-wide">Pending Review</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">${pending.toLocaleString()}</p>
        </div>
      </div>

      <CostsPageClient
        costs={costEntries ?? []}
        boqItems={boqItems ?? []}
        projectId={id}
      />
    </div>
  )
}
