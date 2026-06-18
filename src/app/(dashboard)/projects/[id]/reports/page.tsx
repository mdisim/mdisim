import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Plus, FileText, Clock, CheckCircle } from 'lucide-react'
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
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Site Daily Reports</h1>
            <p className="text-slate-500 text-sm mt-1">{project.name}</p>
          </div>
          <Link
            href={`/projects/${id}/reports/new`}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors shadow-sm"
          >
            <Plus size={16} />
            New Report
          </Link>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-md">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-blue-50 p-2 rounded-xl"><FileText size={20} className="text-blue-600" /></div>
            <div>
              <p className="text-3xl font-bold text-slate-900">{reports?.length ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">Total Reports</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-md">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-amber-50 p-2 rounded-xl"><Clock size={20} className="text-amber-600" /></div>
            <div>
              <p className="text-3xl font-bold text-amber-600">{submittedCount}</p>
              <p className="text-xs text-slate-400 mt-1">Awaiting Approval</p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center shadow-md">
          <div className="flex items-center justify-center gap-3">
            <div className="bg-green-50 p-2 rounded-xl"><CheckCircle size={20} className="text-green-600" /></div>
            <div>
              <p className="text-3xl font-bold text-green-600">{approvedCount}</p>
              <p className="text-xs text-slate-400 mt-1">Approved</p>
            </div>
          </div>
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
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Date</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Weather</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Work Status</th>
                  <th className="text-left text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Status</th>
                  <th className="text-right text-xs font-semibold text-slate-400 uppercase tracking-wider px-5 py-3">Action</th>
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
                        className="text-xs font-medium text-blue-600 hover:text-blue-700"
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
