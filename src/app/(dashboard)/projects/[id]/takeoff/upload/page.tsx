import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { UploadForm } from '@/components/takeoff/upload-form'

export default async function UploadDrawingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: project } = await supabase.from('projects').select('id, name').eq('id', id).single()
  if (!project) notFound()

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <Link href={`/projects/${id}/takeoff`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to Takeoff
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">Upload Drawing</h1>
        <p className="text-slate-500 text-sm mt-1">Upload a PDF to begin measuring quantities</p>
      </div>
      <UploadForm projectId={id} />
    </div>
  )
}
