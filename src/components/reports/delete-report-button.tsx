'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { deleteReport } from '@/app/actions/reports'

export function DeleteReportButton({ reportId, projectId }: { reportId: string; projectId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    if (!confirm('Delete this report? This cannot be undone.')) return
    startTransition(async () => {
      await deleteReport(reportId, projectId)
      router.push(`/projects/${projectId}/reports`)
    })
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
    >
      {isPending ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
      Delete Report
    </button>
  )
}
