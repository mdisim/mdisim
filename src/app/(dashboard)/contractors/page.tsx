import { createClient } from '@/lib/supabase/server'
import { NewContractorButton } from '@/components/contractors/new-contractor-button'
import { ContractorsList } from '@/components/contractors/contractors-list'
import { Users } from 'lucide-react'

export default async function ContractorsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: contractors } = await supabase
    .from('contractors')
    .select('*')
    .eq('user_id', user!.id)
    .order('name')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Contractors</h1>
          <p className="text-slate-500 text-sm mt-1">{contractors?.length ?? 0} contractor{contractors?.length !== 1 ? 's' : ''} registered</p>
        </div>
        <NewContractorButton />
      </div>

      {contractors && contractors.length > 0 ? (
        <ContractorsList contractors={contractors} />
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Users size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No contractors yet</p>
          <p className="text-sm mt-1">Add contractors to assign payments to them</p>
        </div>
      )}
    </div>
  )
}
