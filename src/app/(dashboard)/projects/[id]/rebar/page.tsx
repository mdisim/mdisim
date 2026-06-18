import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { RebarScheduleClient } from './rebar-schedule-client'

const TABS = [
  { label: 'Schedule', href: '' },
  { label: 'Fabrication', href: '/fabrication-all' },
  { label: 'Marked Drawing', href: '/marked-drawing' },
  { label: 'Procurement', href: '/procurement' },
  { label: 'BBS Package', href: '/bbs-package' },
] as const

export default async function RebarSchedulePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: project }, { data: elements }] = await Promise.all([
    supabase.from('projects').select('id, name').eq('id', id).single(),
    supabase
      .from('rebar_elements')
      .select('*, bars:rebar_bars(*)')
      .eq('project_id', id)
      .order('sort_order'),
  ])

  if (!project) notFound()

  const basePath = `/projects/${id}/rebar`

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-white">Rebar Schedule</h1>
            <p className="text-sm text-slate-400">{project.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${id}/rebar/extract`}
              className="px-3 py-1.5 text-sm rounded bg-blue-600 hover:bg-blue-500 text-white transition-colors font-medium"
            >
              ⚡ Extract from Drawing
            </Link>
            <a
              href={`/api/rebar/export?projectId=${id}`}
              className="px-3 py-1.5 text-sm rounded bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors hidden sm:inline-flex"
            >
              Export Excel
            </a>
          </div>
        </div>

        {/* Tab bar */}
        <div className="overflow-x-auto scrollbar-none -mx-4 sm:-mx-6 px-4 sm:px-6">
          <nav className="flex gap-1 min-w-max snap-x snap-mandatory" role="tablist">
            {TABS.map((tab) => {
              const isActive = tab.href === ''
              return (
                <Link
                  key={tab.label}
                  href={`${basePath}${tab.href}`}
                  role="tab"
                  aria-selected={isActive}
                  className={`snap-start px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-800 text-white border-b-2 border-blue-500'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      <RebarScheduleClient
        projectId={id}
        initialElements={elements ?? []}
      />
    </div>
  )
}
