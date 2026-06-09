import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Trash2 } from 'lucide-react'
import { ReportStatusBadge, WeatherIcon } from '@/components/reports/report-status-badge'
import { ReportHeaderForm } from '@/components/reports/report-header-form'
import { WorkforceSection } from '@/components/reports/workforce-section'
import { EquipmentSection } from '@/components/reports/equipment-section'
import { ActivitiesSection } from '@/components/reports/activities-section'
import { IssuesSection } from '@/components/reports/issues-section'
import { DeleteReportButton } from '@/components/reports/delete-report-button'

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>
}) {
  const { id, reportId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: project },
    { data: report },
    { data: workforce },
    { data: equipment },
    { data: activities },
    { data: issues },
    { data: boqItems },
    { data: contractors },
  ] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase.from('site_daily_reports').select('*').eq('id', reportId).single(),
    supabase.from('sdr_workforce').select('*, contractor:contractors(name, company)').eq('report_id', reportId),
    supabase.from('sdr_equipment').select('*').eq('report_id', reportId),
    supabase.from('sdr_activities').select('*, boq_item:boq_items(item_code, description)').eq('report_id', reportId),
    supabase.from('sdr_issues').select('*').eq('report_id', reportId).order('created_at'),
    supabase.from('boq_items').select('*').eq('project_id', id).order('item_code'),
    supabase.from('contractors').select('*').eq('user_id', user!.id),
  ])

  if (!project || !report) notFound()

  const isReadonly = report.status === 'approved'
  const reportDateFormatted = new Date(report.report_date + 'T00:00:00').toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const totalWorkers = (workforce ?? []).reduce((s, w) => s + w.actual_count, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link href={`/projects/${id}/reports`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft size={15} /> Back to Reports
        </Link>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-slate-900">Site Daily Report</h1>
              <ReportStatusBadge status={report.status} />
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>{reportDateFormatted}</span>
              {report.weather && <><span>·</span><WeatherIcon weather={report.weather} /></>}
              {totalWorkers > 0 && <><span>·</span><span>{totalWorkers} workers on site</span></>}
            </div>
            <p className="text-slate-400 text-sm">{project.name}</p>
          </div>
          {!isReadonly && report.status === 'draft' && (
            <DeleteReportButton reportId={reportId} projectId={id} />
          )}
        </div>
      </div>

      {/* Quick summary bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Workers', value: totalWorkers },
          { label: 'Equipment Items', value: equipment?.length ?? 0 },
          { label: 'Activities', value: activities?.length ?? 0 },
          { label: 'Open Issues', value: (issues ?? []).filter(i => i.status === 'open').length },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-900">{s.value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Sections */}
      <ReportHeaderForm report={report} projectId={id} />

      <WorkforceSection
        reportId={reportId}
        projectId={id}
        workforce={workforce ?? []}
        contractors={contractors ?? []}
        readonly={isReadonly}
      />

      <EquipmentSection
        reportId={reportId}
        projectId={id}
        equipment={equipment ?? []}
        readonly={isReadonly}
      />

      <ActivitiesSection
        reportId={reportId}
        projectId={id}
        activities={activities ?? []}
        boqItems={boqItems ?? []}
        readonly={isReadonly}
      />

      <IssuesSection
        reportId={reportId}
        projectId={id}
        issues={issues ?? []}
        readonly={isReadonly}
      />
    </div>
  )
}
