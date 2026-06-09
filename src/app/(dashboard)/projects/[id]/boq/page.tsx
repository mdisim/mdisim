import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { BOQPageClient } from '@/components/boq/boq-page-client'

export default async function BOQPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: boqItems }] = await Promise.all([
    supabase.from('projects').select('id, name, budget').eq('id', id).single(),
    supabase.from('boq_items').select('*').eq('project_id', id).order('item_code'),
  ])

  if (!project) notFound()

  const total = boqItems?.reduce((s, i) => s + i.total_amount, 0) ?? 0

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to {project.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Bill of Quantities</h1>
            <p className="text-slate-500 text-sm mt-1">{project.name}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400 uppercase tracking-wide">BOQ Total</p>
            <p className="text-2xl font-bold text-slate-900">${total.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <BOQPageClient items={boqItems ?? []} projectId={id} />
    </div>
  )
}
