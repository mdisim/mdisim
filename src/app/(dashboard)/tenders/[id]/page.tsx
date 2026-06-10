import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { TenderDetailClient } from './tender-detail-client'

export default async function TenderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: tender } = await supabase.from('tenders').select('*').eq('id', id).single()
  if (!tender) notFound()

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/tenders" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to Tenders
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">{tender.title}</h1>
        {tender.client_name && (
          <p className="text-slate-500 text-sm mt-1">{tender.client_name}</p>
        )}
      </div>
      <TenderDetailClient tender={tender} />
    </div>
  )
}
