import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Plus, FileText } from 'lucide-react'
import { ReportStatusBadge, WeatherIcon, WorkStatusBadge } from '@/components/reports/report-status-badge'
import { SiteDailyReport } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default async function ReportsListPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: reports }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('site_daily_reports')
      .select('*')
      .eq('project_id', id)
      .order('report_date', { ascending: false }),
  ])

  if (!project) notFound()

  const draftCount = reports?.filter(r => r.status === 'draft').length ?? 0
  const submittedCount = reports?.filter(r => r.status === 'submitted').length ?? 0
  const approvedCount = reports?.filter(r => r.status === 'approved').length ?? 0

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/projects/${id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to {project.name}
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Site Daily Reports</h1>
            <p className="text-slate-500 text-sm mt-1">{project.name}</p>
          </div>
          <Link
            href={`/projects/${id}/reports/new`}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
          >
            <Plus size={16} />
            New Report
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-900">{reports?.length ?? 0}</p>
          <p className="text-xs text-slate-400 mt-1">Total Reports</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{submittedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Awaiting Approval</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{approvedCount}</p>
          <p className="text-xs text-slate-400 mt-1">Approved</p>
        </div>
      </div>

      {/* Reports list */}
      {!reports || reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <FileText size={48} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">No reports yet</p>
          <p className="text-sm mt-1">Create the first site daily report for this project</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left text-xs text-slate-500 px-5 py-3 font-medium">Date</th>
                  <th className="text-left text-xs text-slate-500 px-5 py-3 font-medium">Weather</th>
                  <th className="text-left text-xs text-slate-500 px-5 py-3 font-medium">Work Status</th>
                  <th className="text-left text-xs text-slate-500 px-5 py-3 font-medium">Status</th>
                  <th className="text-right text-xs text-slate-500 px-5 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(reports as SiteDailyReport[]).map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">
                        {new Date(report.report_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                        })}
                      </p>
                      <p className="text-xs text-slate-400">{formatDate(report.created_at)}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <WeatherIcon weather={report.weather} />
                        {report.temperature_high && (
                          <span className="text-xs text-slate-500">{report.temperature_high}° / {report.temperature_low}°</span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <WorkStatusBadge status={report.work_status} />
                    </td>
                    <td className="px-5 py-3">
                      <ReportStatusBadge status={report.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/projects/${id}/reports/${report.id}`}
                        className="text-xs font-medium text-amber-600 hover:text-amber-700"
                      >
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
