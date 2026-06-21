import {
  Wrench,
  Columns3,
  HardHat,
  DollarSign,
  BookOpen,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

const CATEGORIES = [
  {
    title: 'Structural Engineering',
    description: 'Beam analysis, column design, load calculations, and structural systems',
    icon: Columns3,
    color: 'bg-blue-600',
    lessons: 12,
  },
  {
    title: 'Construction Materials',
    description: 'Concrete, steel, timber, masonry — properties, testing, and specifications',
    icon: Wrench,
    color: 'bg-emerald-600',
    lessons: 10,
  },
  {
    title: 'Construction Methods',
    description: 'Earthwork, formwork, scaffolding, and modern construction techniques',
    icon: HardHat,
    color: 'bg-amber-600',
    lessons: 8,
  },
  {
    title: 'Cost Engineering',
    description: 'Rate analysis, cost estimation, value engineering, and project economics',
    icon: DollarSign,
    color: 'bg-violet-600',
    lessons: 9,
  },
]

export default async function CoursesPage() {
  return (
    <div className="space-y-8 max-w-6xl">
      <div className="flex items-center gap-4">
        <Link
          href="/student"
          className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-50 transition-colors"
        >
          <ArrowLeft size={16} className="text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Civil Engineering Courses</h1>
          <p className="text-slate-500 text-sm mt-1">
            Structured lessons across core civil engineering disciplines
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon
          return (
            <div
              key={cat.title}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-11 h-11 rounded-lg ${cat.color} flex items-center justify-center`}>
                  <Icon size={20} className="text-white" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                  Coming soon
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1">{cat.title}</h3>
              <p className="text-sm text-slate-500 mb-4">{cat.description}</p>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <BookOpen size={14} />
                <span>{cat.lessons} lessons planned</span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200 p-6">
        <p className="text-sm text-slate-500">
          Course content is being developed by civil engineering professionals. Each module will
          include theory, worked examples, and practice exercises tailored to real-world projects.
        </p>
      </div>
    </div>
  )
}
