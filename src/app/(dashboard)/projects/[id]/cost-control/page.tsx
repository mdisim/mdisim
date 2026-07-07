import { redirect } from 'next/navigation'

export default async function CostControlRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/projects/${id}/workspace?mode=cost-control`)
}
