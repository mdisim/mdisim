import {
  BarChart3,
  BookOpen,
  GraduationCap,
  Trophy,
  Clock,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'

const STATS = [
  { label: 'Courses Completed', value: '0', icon: BookOpen, color: 'bg-blue-100 text-blue-600' },
  { label: 'Practice Exercises', value: '0', icon: BarChart3, color: 'bg-emerald-100 text-emerald-600' },
  { label: 'Certificates Earned', value: '0', icon: GraduationCap, color: 'bg-violet-100 text-violet-600' },
  { label: 'Hours Studied', value: '0', icon: Clock, color: 'bg-amber-100 text-amber-600' },
]

export default async function ProgressPage() {
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
          <h1 className="text-2xl font-bold text-slate-900">My Progress</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track your learning journey and earn certificates
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon
          const [bgClass, textClass] = stat.color.split(' ')
          return (
            <div
              key={stat.label}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm"
            >
              <div className={`w-10 h-10 rounded-lg ${bgClass} flex items-center justify-center mb-3`}>
                <Icon size={18} className={textClass} />
              </div>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Certificates</h2>
            <p className="text-sm text-slate-500 mt-1">
              Complete course modules and pass assessments to earn certificates of completion
            </p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Coming soon
          </span>
        </div>
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg border border-slate-100">
          <Trophy size={20} className="text-slate-400" />
          <p className="text-sm text-slate-500">
            Complete your first course module to earn a certificate. Certificates can be downloaded
            as PDF and shared on your professional profile.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Learning Activity</h2>
            <p className="text-sm text-slate-500 mt-1">
              Your recent study sessions and exercise completions will appear here
            </p>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
            Coming soon
          </span>
        </div>
        <div className="text-center py-8">
          <BarChart3 size={32} className="text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-400">No activity yet. Start a course to begin tracking.</p>
        </div>
      </div>
    </div>
  )
}
