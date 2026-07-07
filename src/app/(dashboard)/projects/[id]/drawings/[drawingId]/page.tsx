import { redirect } from 'next/navigation'

export default async function DrawingDetailRedirect({ params }: { params: Promise<{ id: string; drawingId: string }> }) {
  const { id } = await params
  redirect(`/projects/${id}/workspace?mode=drawings`)
}
