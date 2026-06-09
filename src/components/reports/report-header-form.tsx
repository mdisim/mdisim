'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { SiteDailyReport } from '@/lib/types'
import { updateReport, submitReport, approveReport } from '@/app/actions/reports'
import { Loader2, Save, Send, CheckCircle } from 'lucide-react'

const WEATHER_OPTIONS = [
  { value: 'sunny', label: '☀️ Sunny' },
  { value: 'partly_cloudy', label: '⛅ Partly Cloudy' },
  { value: 'cloudy', label: '☁️ Cloudy' },
  { value: 'rainy', label: '🌧️ Rainy' },
  { value: 'stormy', label: '⛈️ Stormy' },
  { value: 'foggy', label: '🌫️ Foggy' },
]

const WORK_STATUS_OPTIONS = [
  { value: 'normal', label: 'Normal' },
  { value: 'delayed', label: 'Delayed' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'holiday', label: 'Holiday / No Work' },
]

interface Props {
  report: SiteDailyReport
  projectId: string
}

export function ReportHeaderForm({ report, projectId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [form, setForm] = useState({
    weather: report.weather ?? '',
    temperature_high: report.temperature_high?.toString() ?? '',
    temperature_low: report.temperature_low?.toString() ?? '',
    work_status: report.work_status,
    delay_reason: report.delay_reason ?? '',
    general_notes: report.general_notes ?? '',
  })

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))
  const isReadonly = report.status === 'approved'

  const handleSave = () => {
    startTransition(async () => {
      const res = await updateReport(report.id, projectId, {
        weather: form.weather || null,
        temperature_high: form.temperature_high ? parseFloat(form.temperature_high) : null,
        temperature_low: form.temperature_low ? parseFloat(form.temperature_low) : null,
        work_status: form.work_status as SiteDailyReport['work_status'],
        delay_reason: form.delay_reason || null,
        general_notes: form.general_notes || null,
      })
      if (!res.error) { setSaved(true); setTimeout(() => setSaved(false), 2000) }
    })
  }

  const handleSubmit = () => {
    startTransition(async () => {
      await submitReport(report.id, projectId)
      router.refresh()
    })
  }

  const handleApprove = () => {
    startTransition(async () => {
      await approveReport(report.id, projectId)
      router.refresh()
    })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Site Conditions</h3>
        {!isReadonly && (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : saved ? <CheckCircle size={13} className="text-green-500" /> : <Save size={13} />}
              {saved ? 'Saved' : 'Save'}
            </button>
            {report.status === 'draft' && (
              <button
                onClick={handleSubmit}
                disabled={isPending}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50"
              >
                <Send size={13} /> Submit
              </button>
            )}
            {report.status === 'submitted' && (
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50"
              >
                <CheckCircle size={13} /> Approve
              </button>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Weather</label>
          <select
            value={form.weather}
            onChange={e => set('weather', e.target.value)}
            disabled={isReadonly}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50"
          >
            <option value="">— Select —</option>
            {WEATHER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">High Temp (°C)</label>
          <input type="number" value={form.temperature_high} onChange={e => set('temperature_high', e.target.value)}
            disabled={isReadonly} placeholder="e.g. 32"
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Low Temp (°C)</label>
          <input type="number" value={form.temperature_low} onChange={e => set('temperature_low', e.target.value)}
            disabled={isReadonly} placeholder="e.g. 18"
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50" />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Work Status</label>
          <select
            value={form.work_status}
            onChange={e => set('work_status', e.target.value)}
            disabled={isReadonly}
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50"
          >
            {WORK_STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      {form.work_status !== 'normal' && (
        <div>
          <label className="block text-xs text-slate-500 mb-1">Delay / Reason</label>
          <input type="text" value={form.delay_reason} onChange={e => set('delay_reason', e.target.value)}
            disabled={isReadonly} placeholder="Reason for delay or suspension..."
            className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50" />
        </div>
      )}

      <div>
        <label className="block text-xs text-slate-500 mb-1">General Notes</label>
        <textarea value={form.general_notes} onChange={e => set('general_notes', e.target.value)}
          disabled={isReadonly} rows={3} placeholder="General observations, instructions received, visitors on site..."
          className="w-full text-sm border border-slate-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:bg-slate-50 resize-none" />
      </div>
    </div>
  )
}
