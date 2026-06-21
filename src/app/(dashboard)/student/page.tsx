import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  BookOpen,
  Calculator,
  ClipboardList,
  FileText,
  BarChart3,
  GraduationCap,
  Wrench,
  ArrowRight,
  Ruler,
  Layers,
} from 'lucide-react'

const COURSE_CARDS = [
  {
    title: 'Civil Engineering Fundamentals',
    description: 'Structural analysis, materials, and construction methods',
    icon: Wrench,
    color: 'bg-blue-600',
    href: '/student/courses',
    tag: 'Foundation',
  },
  {
    title: 'Quantity Surveying Basics',
    description: 'Cost estimation, measurement, and valuation principles',
    icon: Calculator,
    color: 'bg-emerald-600',
    href: '/student/courses',
    tag: 'QS Core',
  },
  {
    title: 'BOQ Training',
    description: 'Bills of Quantities — structure, pricing, and practice',
    icon: ClipboardList,
    color: 'bg-violet-600',
    href: '/student/boq-training',
    tag: 'Practical',
  },
  {
    title: 'Measurement Sheet Practice',
    description: 'Take-off sheets, dimension paper, and measurement methods',
    icon: Ruler,
    color: 'bg-amber-600',
    href: '/student/measurement',
    tag: 'Practical',
  },
  {
    title: 'Rebar Calculation Practice',
    description: 'Bar bending schedules, shape codes, and weight calculations',
    icon: Layers,
    color: 'bg-red-600',
    href: '/student/rebar-practice',
    tag: 'Rebar',
  },
  {
    title: 'Cost Estimation Lessons',
    description: 'Rate analysis, pricing, and project cost estimation',
    icon: BarChart3,
    color: 'bg-teal-600',
    href: '/student/courses',
    tag: 'Cost',
  },
  {
    title: 'Excel & PDF Training',
    description: 'Engineering spreadsheets, reports, and document management',
    icon: FileText,
    color: 'bg-orange-600',
    href: '/student/courses',
    tag: 'Tools',
  },
  {
    title: 'Engineering Calculators',
    description: 'Concrete, steel, area, and volume calculators',
    icon: Calculator,
    color: 'bg-cyan-600',
    href: '/calculators',
    tag: 'Tools',
  },
]

export default async function StudentDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user!.id)
    .single()

  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Student'

  return (
    <div className="space-y-8 max-w-6xl">
      {/* Welcome header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome back, {displayName}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Continue learning civil engineering and quantity surveying
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200">
          <GraduationCap size={18} className="text-emerald-600" />
          <span className="text-emerald-700 text-sm font-semibold">Student Account</span>
        </div>
      </div>

      {/* Progress overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <BookOpen size={18} className="text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">Courses Started</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <ClipboardList size={18} className="text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">Practice Exercises</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <GraduationCap size={18} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">0</p>
              <p className="text-xs text-slate-500">Certificates Earned</p>
            </div>
          </div>
        </div>
      </div>

      {/* Course grid */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Learning Modules</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {COURSE_CARDS.map((card) => {
            const Icon = card.icon
            return (
              <Link
                key={card.title}
                href={card.href}
                className="group bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`w-10 h-10 rounded-lg ${card.color} flex items-center justify-center`}>
                    <Icon size={18} className="text-white" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                    {card.tag}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-500 mb-3">{card.description}</p>
                <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                  Start learning <ArrowRight size={12} />
                </div>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Sample projects */}
      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sample Projects</h2>
            <p className="text-sm text-slate-500 mt-1">
              Practice with real-world project templates — villas, apartments, bridges, and more
            </p>
          </div>
          <span className="text-xs text-slate-400 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
            Coming soon
          </span>
        </div>
      </div>
    </div>
  )
}
