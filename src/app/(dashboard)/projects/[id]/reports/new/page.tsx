'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, FileText } from 'lucide-react'
import { createReport } from '@/app/actions/reports'
import { use } from 'react'

export default function NewReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [error, setError] = useState<string | null>(null)

  const handleCreate = () => {
    setError(null)
    startTransition(async () => {
      const res = await createReport(id, date)
      if (res.error) {
        setError(res.error.includes('unique') ? `A report for ${date} already exists.` : res.error)
      } else {
        router.push(`/projects/${id}/reports/${res.id}`)
      }
    })
  }

  return (
    <div className="max-w-md space-y-6">
      <div>
        <Link href={`/projects/${id}/reports`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to Reports
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Daily Report</h1>
        <p className="text-slate-500 text-sm mt-1">Select the date for this site report</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-100">
          <FileText size={20} className="text-amber-500 shrink-0" />
          <p className="text-sm text-amber-800">
            Each project can only have one report per day. The report will be created as a <strong>Draft</strong> and can be submitted for approval when complete.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Report Date</label>
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <button
          onClick={handleCreate}
          disabled={isPending || !date}
          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors flex items-center justify-center gap-2"
        >
          {isPending && <Loader2 size={15} className="animate-spin" />}
          Create Report
        </button>
      </div>
    </div>
  )
}
