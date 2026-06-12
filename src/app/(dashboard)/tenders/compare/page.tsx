import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, GitCompare } from 'lucide-react'
import { CompareClient } from './compare-client'

export default async function TenderComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>
}) {
  const { ids } = await searchParams

  if (!ids) notFound()

  const idList = ids.split(',').filter(Boolean).slice(0, 5)
  if (idList.length < 2) notFound()

  const supabase = await createClient()

  const { data: tenders } = await supabase
    .from('tenders')
    .select('*')
    .in('id', idList)

  if (!tenders || tenders.length < 2) notFound()

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link href="/tenders" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to Tenders
        </Link>
        <div className="flex items-center gap-2">
          <GitCompare size={24} className="text-amber-600" />
          <h1 className="text-2xl font-bold text-slate-900">Tender Comparison</h1>
        </div>
        <p className="text-slate-500 text-sm mt-1">
          Comparing {tenders.length} tender{tenders.length !== 1 ? 's' : ''} side by side
        </p>
      </div>

      <CompareClient tenders={tenders} />
    </div>
  )
}
