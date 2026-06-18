import { createClient } from '@/lib/supabase/server'
import { TendersClient } from './tenders-client'
import { Gavel } from 'lucide-react'

export default async function TendersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let tenders: import('@/lib/types').Tender[] = []

  if (user) {
    const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user.id).single()
    if (profile?.company_id) {
      const { data } = await supabase
        .from('tenders')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
      tenders = data ?? []
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Gavel size={24} className="text-blue-600" />
            <h1 className="text-2xl font-bold text-slate-900">Tenders</h1>
          </div>
          <p className="text-slate-500 text-sm mt-1">{tenders.length} tender{tenders.length !== 1 ? 's' : ''} tracked</p>
        </div>
      </div>
      <TendersClient tenders={tenders} />
    </div>
  )
}
