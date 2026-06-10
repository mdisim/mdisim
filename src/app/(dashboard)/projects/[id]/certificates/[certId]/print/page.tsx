import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { PrintCertificateClient } from '@/components/certificates/print-certificate-client'

export default async function PrintCertificatePage({
  params,
}: {
  params: Promise<{ id: string; certId: string }>
}) {
  const { id, certId } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: cert }] = await Promise.all([
    supabase.from('projects').select('*').eq('id', id).single(),
    supabase.from('payment_certificates').select('*').eq('id', certId).single(),
  ])

  if (!project || !cert) notFound()

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', project.company_id)
    .single()

  return (
    <PrintCertificateClient
      project={project}
      certificate={cert}
      company={company}
    />
  )
}
