import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { DollarSign, CheckCircle, Clock } from 'lucide-react'
import { PaymentsTable } from '@/components/contractors/payments-table'

export default async function ProjectContractorsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: project }, { data: payments }, { data: contractors }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('contractor_payments')
      .select('*, contractor:contractors(id, name, company, specialty)')
      .eq('project_id', id)
      .order('payment_date', { ascending: false }),
    supabase.from('contractors').select('*').eq('user_id', user!.id),
  ])

  if (!project) notFound()

  const totalPaid = payments?.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0) ?? 0
  const totalPending = payments?.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0) ?? 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Contractor Payments</h1>
        <p className="text-slate-500 text-sm mt-1">{project.name}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl"><DollarSign size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Payments</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">${(totalPaid + totalPending).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-green-50 p-2 rounded-xl"><CheckCircle size={20} className="text-green-600" /></div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paid</p>
              <p className="text-3xl font-bold text-green-600 mt-1">${totalPaid.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-md">
          <div className="flex items-center gap-3">
            <div className="bg-amber-50 p-2 rounded-xl"><Clock size={20} className="text-amber-600" /></div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending</p>
              <p className="text-3xl font-bold text-amber-600 mt-1">${totalPending.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      <PaymentsTable
        payments={payments ?? []}
        projectId={id}
        contractors={contractors ?? []}
      />
    </div>
  )
}
