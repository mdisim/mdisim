import { redirect } from 'next/navigation'

export default async function RevisionsRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/projects/${id}/workspace?mode=revisions`)
}
