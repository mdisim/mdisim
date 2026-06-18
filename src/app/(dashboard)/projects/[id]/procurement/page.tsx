import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProcurementClient } from './procurement-client'

export default async function ProcurementPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: purchaseOrders }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('purchase_orders').select('*').eq('project_id', id).order('created_at', { ascending: false }),
  ])

  if (!project) notFound()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Procurement</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>
      <ProcurementClient purchaseOrders={purchaseOrders ?? []} projectId={id} />
    </div>
  )
}
